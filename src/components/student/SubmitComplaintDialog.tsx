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
import { ImagePlus, X } from "lucide-react";

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
  const [damageType, setDamageType] = useState(""); // Individual | Public
  const [specificSelection, setSpecificSelection] = useState("");
  const [urgency, setUrgency] = useState("medium");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);

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
      const newPhotos = Array.from(e.target.files).slice(0, 5 - photos.length);
      setPhotos([...photos, ...newPhotos]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Client-side validation before attempting submission
    const errors: string[] = [];
    const allowedUrgency = ["low", "medium", "high", "urgent"];

    if (!title || !title.trim()) errors.push("Title is required.");
    if (!category || !category.trim()) errors.push("Category is required.");
    if (!damageType.trim()) errors.push("Damage Type is required.");
    if (!specificSelection.trim())
      errors.push("Please select a specific item/location.");
    if (!description || !description.trim())
      errors.push("Description is required.");
    if (!urgency || !allowedUrgency.includes(urgency))
      errors.push("Please select a valid urgency level.");

    // Ensure profile has desasiswa and room number (these are shown as disabled inputs)
    if (!profile?.desasiswa)
      errors.push("Your desasiswa is not set in your profile.");
    if (!profile?.room_number)
      errors.push("Your room number is not set in your profile.");

    // Photos limit (should already be enforced, but double-check)
    if (photos.length > 5) errors.push("You can upload up to 5 photos only.");

    if (errors.length > 0) {
      setValidationErrors(errors);
      setLoading(false);
      // show first error in a toast and list others in console for debugging
      toast({
        title: "Validation error",
        description: errors.join(" "),
        variant: "destructive",
      });
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error("User not authenticated");
        toast({
          title: "Authentication Error",
          description: "You must be logged in to submit a complaint.",
          variant: "destructive",
        });
        return;
      }

      console.log("Submitting ticket with data:", {
        title,
        description,
        category,
        urgency,
        status: "pending",
        created_by: user.id,
        desasiswa: profile?.desasiswa,
        damage_type: damageType,
        specific_item_or_location: specificSelection,
      });

      // Create ticket with explicit status
      const { data: ticket, error: ticketError } = await supabase
        .from("tickets")
        .insert({
          title,
          description,
          category,
          urgency,
          status: "pending",
          created_by: user.id,
          desasiswa: profile?.desasiswa,
          damage_type: "Individual",
          specific_item_or_location: specificSelection,
        } as any)
        .select()
        .single();

      if (ticketError) {
        console.error("Ticket creation error:", ticketError);
        console.error("Error details:", JSON.stringify(ticketError, null, 2));
        toast({
          title: "Database Error",
          description: `Failed to create ticket: ${ticketError.message}. Code: ${ticketError.code}`,
          variant: "destructive",
        });
        return;
      }

      console.log("Ticket created successfully:", ticket);

      // Upload photos if any
      if (photos.length > 0 && ticket) {
        console.log(`Uploading ${photos.length} photos...`);
        for (const photo of photos) {
          const fileName = `${ticket.id}/${Date.now()}-${photo.name}`;
          console.log(`Uploading photo: ${fileName}`);

          const { error: uploadError } = await supabase.storage
            .from("ticket-attachments")
            .upload(fileName, photo);

          if (uploadError) {
            console.error("Upload error:", uploadError);
            console.error(
              "Upload error details:",
              JSON.stringify(uploadError, null, 2)
            );
            // Continue even if upload fails
            continue;
          }

          const {
            data: { publicUrl },
          } = supabase.storage
            .from("ticket-attachments")
            .getPublicUrl(fileName);

          console.log(`Photo uploaded, public URL: ${publicUrl}`);

          const { error: attachmentError } = await supabase
            .from("attachments")
            .insert({
              ticket_id: ticket.id,
              file_url: publicUrl,
              file_name: photo.name,
              file_type: photo.type,
              uploaded_by: user.id,
            });

          if (attachmentError) {
            console.error("Attachment insert error:", attachmentError);
            console.error(
              "Attachment error details:",
              JSON.stringify(attachmentError, null, 2)
            );
          }
        }
      }

      toast({
        title: "Complaint submitted",
        description: "Your maintenance request has been received.",
      });

      // Reset form
      setTitle("");
      setDescription("");
      setCategory("");
      setDamageType("");
      setSpecificSelection("");
      setUrgency("medium");
      setPhotos([]);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Full error:", error);
      console.error("Error stack:", error.stack);
      toast({
        title: "Submission failed",
        description:
          error.message ||
          "An error occurred while submitting your complaint. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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

          {/* DAMAGE TYPE */}
          <div className="space-y-2">
            <Label>Type of Damage</Label>
            <Select
              value={damageType}
              onValueChange={(val) => {
                setDamageType(val);
                setSpecificSelection(""); // reset selection
              }}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="public">Public</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* INDIVIDUAL ITEM SELECTION */}
          {damageType === "individual" && (
            <div className="space-y-2">
              <Label>Specific Item</Label>
              <Select
                value={specificSelection}
                onValueChange={setSpecificSelection}
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
          )}

          {/* PUBLIC LOCATION SELECTION */}
          {damageType === "public" && (
            <div className="space-y-2">
              <Label>Specific Location</Label>
              <Select
                value={specificSelection}
                onValueChange={setSpecificSelection}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bathroom or Toilet">Bathroom or Toilet</SelectItem>
                  <SelectItem value="Corridor">Corridor</SelectItem>
                  <SelectItem value="Laundry Room">Laundry Room</SelectItem>
                  <SelectItem value="Pantry">Pantry</SelectItem>
                  <SelectItem value="Study Area">Study Area</SelectItem>
                  <SelectItem value="Surau">Surau</SelectItem>
                  <SelectItem value="Others">Others</SelectItem>
                </SelectContent>
              </Select>
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