import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { sessionMiddleware } from "@/components/session/session-tracking-middleware";
import { ImagePlus, X } from "lucide-react";
import { sanitizeInput } from "@/lib/sanitize";
import { validators } from "@/lib/validation";

interface SubmitComplaintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const SubmitComplaintDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: SubmitComplaintDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [damageType, setDamageType] = useState("");
  const [specificItemOrLocation, setSpecificItemOrLocation] = useState("");
  const [urgency, setUrgency] = useState("medium");
  const [photos, setPhotos] = useState<File[]>([]);
  const [individualRoom, setIndividualRoom] = useState(
    profile?.room_number || ""
  );
  const [publicBlock, setPublicBlock] = useState("");
  const [publicFloor, setPublicFloor] = useState("");

  // Load user profile data
  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("desasiswa, room_number")
          .eq("id", user.id)
          .single();

        if (data) {
          setProfile(data);
        }
      }
    };
    if (open) {
      loadProfile();
    }
  }, [open]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, 5 - photos.length);

      // Validate each file
      const validFiles: File[] = [];
      const fileErrors: string[] = [];

      files.forEach((file) => {
        const validation = validators.file.validate(file, 5);
        if (validation.valid) {
          validFiles.push(file);
        } else {
          fileErrors.push(`${file.name}: ${validation.error}`);
        }
      });

      if (fileErrors.length > 0) {
        toast({
          title: "Invalid files",
          description: fileErrors.join("\n"),
          variant: "destructive",
        });
      }

      setPhotos([...photos, ...validFiles]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const errors: string[] = [];

    // Enhanced validation with detailed error messages
    const titleValidation = validators.textLength(title, 3, 200, "Title");
    if (!titleValidation.valid) errors.push(titleValidation.error!);

    const descValidation = validators.textLength(
      description,
      10,
      2000,
      "Description"
    );
    if (!descValidation.valid) errors.push(descValidation.error!);

    const categoryValidation = validators.category(category);
    if (!categoryValidation.valid) errors.push(categoryValidation.error!);

    const urgencyValidation = validators.urgency(urgency);
    if (!urgencyValidation.valid) errors.push(urgencyValidation.error!);

    if (!damageType.trim()) errors.push("Damage Type is required.");
    if (!specificItemOrLocation.trim())
      errors.push("Please select a specific item/location.");
    if (!profile?.desasiswa) errors.push("Your desasiswa is not set.");
    if (!profile?.room_number) errors.push("Your room number is not set.");

    if (damageType === "Public") {
      if (!publicBlock.trim())
        errors.push("Block is required for public damage.");
      if (!publicFloor.trim())
        errors.push("Floor is required for public damage.");
    }

    if (photos.length > 5) errors.push("You can upload up to 5 photos only.");

    if (errors.length > 0) {
      toast({
        title: "Validation error",
        description: errors.join(" "),
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const block =
        damageType === "Public" && publicBlock
          ? sanitizeInput.text(
              publicBlock.trim().replace(/\s+/g, "").toUpperCase()
            )
          : null;
      const floor =
        damageType === "Public" ? sanitizeInput.text(publicFloor) : null;

      // Sanitize all text inputs before submission
      const sanitizedTitle = sanitizeInput.limitedText(title, 200);
      const sanitizedDescription = sanitizeInput.limitedText(description, 2000);
      const sanitizedLocation = sanitizeInput.limitedText(
        specificItemOrLocation,
        200
      );

      const { data: ticket, error: ticketError } = await supabase
        .from("tickets")
        .insert({
          title: sanitizedTitle,
          description: sanitizedDescription,
          category,
          urgency,
          status: "pending",
          created_by: user.id,
          desasiswa: profile?.desasiswa,
          damage_type: damageType,
          specific_item_or_location: sanitizedLocation,
          individual_room: individualRoom,
          public_block: block,
          public_floor: floor,
        } as any)
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Upload photos
      if (photos.length > 0 && ticket) {
        for (const photo of photos) {
          const fileName = `${ticket.id}/${Date.now()}-${photo.name}`;
          const { error: uploadError } = await supabase.storage
            .from("ticket-attachments")
            .upload(fileName, photo);

          if (uploadError) continue;

          const {
            data: { publicUrl },
          } = supabase.storage
            .from("ticket-attachments")
            .getPublicUrl(fileName);

          await supabase.from("attachments").insert({
            ticket_id: ticket.id,
            file_url: publicUrl,
            file_name: photo.name,
            file_type: photo.type,
            uploaded_by: user.id,
          });
        }
      }

      toast({
        title: "Complaint submitted",
        description: "Your maintenance request has been received.",
      });

      // Log session activity for complaint submission
      await sessionMiddleware.logActivity({
        activityType: "complaint_submitted",
        metadata: {
          ticket_id: ticket.id,
          category,
          urgency,
          damage_type: damageType,
        },
      });

      // Reset form
      setTitle("");
      setDescription("");
      setCategory("");
      setDamageType("");
      setSpecificItemOrLocation("");
      setUrgency("medium");
      setPhotos([]);
      setIndividualRoom("");
      setPublicBlock("");
      setPublicFloor("");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Submission failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto select-none">
        <DialogHeader>
          <DialogTitle>Submit Maintenance Complaint</DialogTitle>
          <DialogDescription>
            Describe the issue and we'll get it fixed as soon as possible.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Brief description of the issue"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plumbing">Plumbing</SelectItem>
                <SelectItem value="electrical">Electrical</SelectItem>
                <SelectItem value="cleaning">Cleaning</SelectItem>
                <SelectItem value="furniture">Furniture</SelectItem>
                <SelectItem value="internet">Internet</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="desasiswa">Desasiswa</Label>
              <Input
                id="desasiswa"
                value={profile?.desasiswa || ""}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="room_number">Room Number</Label>
              <Input
                id="room_number"
                value={profile?.room_number || ""}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Type of Damage</Label>
            <Select
              value={damageType}
              onValueChange={(val) => {
                setDamageType(val);
                setSpecificItemOrLocation("");
                if (val === "Individual") {
                  setPublicBlock("");
                  setPublicFloor("");
                  setIndividualRoom(profile?.room_number || "");
                } else if (val === "Public") {
                  setIndividualRoom("");
                }
              }}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Individual">Individual</SelectItem>
                <SelectItem value="Public">Public</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conditional Fields */}
          {damageType === "Individual" && (
            <div className="space-y-4">
              {/* Room Number (auto-filled) */}
              <div className="space-y-2">
                <Label>Room Number</Label>
                <Input
                  value={profile?.room_number || ""}
                  disabled
                  className="bg-muted"
                />
              </div>

              {/* Specific Item */}
              <div className="space-y-2">
                <Label>Specific Item</Label>
                <Select
                  value={specificItemOrLocation}
                  onValueChange={setSpecificItemOrLocation}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bed">Bed</SelectItem>
                    <SelectItem value="Ceiling Light">Ceiling Light</SelectItem>
                    <SelectItem value="Chair">Chair</SelectItem>
                    <SelectItem value="Door">Door</SelectItem>
                    <SelectItem value="Fan">Fan</SelectItem>
                    <SelectItem value="Study Table">Study Table</SelectItem>
                    <SelectItem value="Table Lamp">Table Lamp</SelectItem>
                    <SelectItem value="Wardrobe">Wardrobe</SelectItem>
                    <SelectItem value="Window">Window</SelectItem>
                    <SelectItem value="Others">Others</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          {damageType === "Public" && (
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Block</Label>
                  <Input
                    placeholder="example: H13"
                    value={publicBlock}
                    onChange={(e) => setPublicBlock(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Floor</Label>
                  <Select
                    value={publicFloor}
                    onValueChange={setPublicFloor}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select floor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Whole Block">Whole Block</SelectItem>
                      <SelectItem value="Ground">Ground</SelectItem>
                      {Array.from({ length: 20 }, (_, i) => (
                        <SelectItem key={i + 1} value={`${i + 1}`}>
                          {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Specific Location</Label>
                <Select
                  value={specificItemOrLocation}
                  onValueChange={setSpecificItemOrLocation}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bathroom or Toilet">
                      Bathroom or Toilet
                    </SelectItem>
                    <SelectItem value="Corridor">Corridor</SelectItem>
                    <SelectItem value="Laundry Room">Laundry Room</SelectItem>
                    <SelectItem value="Pantry">Pantry</SelectItem>
                    <SelectItem value="Study Area">Study Area</SelectItem>
                    <SelectItem value="Surau">Surau</SelectItem>
                    <SelectItem value="Whole Block">Whole Block</SelectItem>
                    <SelectItem value="Whole Floor">Whole Floor</SelectItem>
                    <SelectItem value="Others">Others</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="urgency">Urgency</Label>
            <Select value={urgency} onValueChange={setUrgency} required>
              <SelectTrigger id="urgency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              placeholder="Provide detailed information about the issue"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Photos (optional, up to 5)</Label>
            <div className="flex flex-wrap gap-2">
              {photos.map((photo, index) => (
                <div key={index} className="relative">
                  <img
                    src={URL.createObjectURL(photo)}
                    alt={`Preview ${index + 1}`}
                    className="h-20 w-20 object-cover rounded border"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <label className="h-20 w-20 border-2 border-dashed rounded flex items-center justify-center cursor-pointer hover:bg-muted transition-colors">
                  <ImagePlus className="h-6 w-6 text-muted-foreground" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Submitting..." : "Submit Complaint"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SubmitComplaintDialog;
