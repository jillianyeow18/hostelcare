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

interface EditComplaintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  ticketId: string | null;
}

const EditComplaintDialog = ({
  open,
  onOpenChange,
  onSuccess,
  ticketId,
}: EditComplaintDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [damageType, setDamageType] = useState("");
  const [specificItemOrLocation, setSpecificItemOrLocation] = useState("");
  const [individualRoom, setIndividualRoom] = useState(
    profile?.room_number || ""
  );
  const [publicBlock, setPublicBlock] = useState("");
  const [publicFloor, setPublicFloor] = useState("");
  const [urgency, setUrgency] = useState("medium");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<any[]>([]);

  // Load user profile and complaint details
  useEffect(() => {
    const loadData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("desasiswa, room_number")
          .eq("id", user.id)
          .single();
        if (profileData) setProfile(profileData);
      }

      if (ticketId) {
        const { data: ticketData, error } = await supabase
          .from("tickets")
          .select("*")
          .eq("id", ticketId)
          .single();

        if (error) {
          toast({
            title: "Error loading complaint",
            description: error.message,
            variant: "destructive",
          });
          return;
        }
        if (ticketData) {
          setTitle(ticketData.title || "");
          setDescription(ticketData.description || "");
          setCategory(ticketData.category || "");
          setDamageType(ticketData.damage_type || "");
          setSpecificItemOrLocation(ticketData.specific_item_or_location || "");
          setIndividualRoom(
            ticketData.individual_room || profile?.room_number || ""
          );
          setPublicBlock(ticketData.public_block || "");
          setPublicFloor(ticketData.public_floor || "");
          setUrgency(ticketData.urgency || "medium");
        }

        // Load existing photos (attachments)
        const { data: attachments } = await supabase
          .from("attachments")
          .select("id, file_url, file_name")
          .eq("ticket_id", ticketId);
        if (attachments) setExistingPhotos(attachments);
      }
    };

    // Reset local photo state on dialog open
    setPhotos([]);
    if (open && ticketId) {
      loadData();
    }
  }, [open, ticketId]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // Calculate remaining slots: max 5 total photos (existing + new)
      const maxNewPhotos = 5 - existingPhotos.length;
      if (maxNewPhotos <= 0) {
        toast({
          title: "Photo Limit Reached",
          description: "You cannot upload more than 5 photos in total.",
          variant: "destructive",
        });
        return;
      }
      const newPhotos = Array.from(e.target.files).slice(
        0,
        maxNewPhotos - photos.length
      );
      setPhotos([...photos, ...newPhotos]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = async (id: string) => {
    const { error } = await supabase.from("attachments").delete().eq("id", id);
    if (!error) {
      setExistingPhotos(existingPhotos.filter((photo) => photo.id !== id));
      toast({
        title: "Photo Removed",
        description: "Existing photo deleted successfully.",
      });
    } else {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setValidationErrors([]);

    const errors: string[] = [];

    // Enhanced validation
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
      errors.push("Specific Item or Location is required.");

    if (errors.length > 0) {
      setValidationErrors(errors);
      toast({
        title: "Validation Error",
        description: errors.join(" "),
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      // Sanitize all text inputs
      const updateData = {
        title: sanitizeInput.limitedText(title, 200),
        description: sanitizeInput.limitedText(description, 2000),
        category,
        damage_type: damageType,
        specific_item_or_location: sanitizeInput.limitedText(
          specificItemOrLocation,
          200
        ),
        individual_room: damageType === "Individual" ? individualRoom : null,
        public_block:
          damageType === "Public" && publicBlock
            ? sanitizeInput.text(
                publicBlock.trim().replace(/\s+/g, "").toUpperCase()
              )
            : null,
        public_floor: damageType === "Public" ? publicFloor : null,
        urgency,
      };

      const { data: updated, error: updateError } = await supabase
        .from("tickets")
        .update(updateData)
        .eq("id", ticketId)
        .select();

      console.log("Updating ticket:", ticketId, updateData);

      if (updateError) {
        toast({
          title: "Update Failed",
          description: updateError.message,
          variant: "destructive",
        });
        return;
      }

      // Upload new photos if any
      if (photos.length > 0) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        for (const photo of photos) {
          const fileName = `${ticketId}/${Date.now()}-${photo.name}`;
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
            ticket_id: ticketId,
            file_url: publicUrl,
            file_name: photo.name,
            file_type: photo.type,
            uploaded_by: user?.id,
          });
        }
      }

      toast({
        title: "Complaint updated",
        description: "Your complaint has been successfully updated.",
      });

      // Log session activity for complaint update
      await sessionMiddleware.logActivity({
        activityType: "complaint_updated",
        metadata: {
          ticket_id: ticketId,
          category,
          urgency,
        },
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Unexpected Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalPhotos = existingPhotos.length + photos.length;
  const maxPhotos = 5;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto select-none">
        <DialogHeader>
          <DialogTitle>Edit Maintenance Complaint</DialogTitle>
          <DialogDescription>
            Update your complaint details below. Status cannot be edited.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
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
              <Label>Desasiswa</Label>
              <Input
                value={profile?.desasiswa || ""}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Room Number</Label>
              <Input
                value={profile?.room_number || ""}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          {/* DAMAGE TYPE SELECTION */}
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
                <Label>Room Number (auto)</Label>
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
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
            />
          </div>

          {/* Existing Photos */}
          {existingPhotos.length > 0 && (
            <div className="space-y-2">
              <Label>Existing Photos (Click to remove)</Label>
              <div className="flex flex-wrap gap-2">
                {existingPhotos.map((photo) => (
                  <div key={photo.id} className="relative">
                    <img
                      src={photo.file_url}
                      alt={photo.file_name}
                      className="h-20 w-20 object-cover rounded border"
                    />
                    <button
                      type="button"
                      onClick={() => removeExistingPhoto(photo.id)}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Photos */}
          <div className="space-y-2">
            <Label>
              Upload New Photos (optional, {maxPhotos - totalPhotos} remaining)
            </Label>
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
              {totalPhotos < maxPhotos && (
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
              {loading ? "Updating..." : "Update Complaint"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditComplaintDialog;
