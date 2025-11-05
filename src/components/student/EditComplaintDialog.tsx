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

interface EditComplaintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  ticketId: string | null; // The ID of the complaint to edit
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
  const [location, setLocation] = useState("");
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
          setLocation(ticketData.location || "");
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

    if (open && ticketId) {
      loadData();
    }
  }, [open, ticketId]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newPhotos = Array.from(e.target.files).slice(0, 5 - photos.length);
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
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setValidationErrors([]);

    const errors: string[] = [];
    if (!title.trim()) errors.push("Title is required.");
    if (!category.trim()) errors.push("Category is required.");
    if (!location.trim()) errors.push("Specific location is required.");
    if (!description.trim()) errors.push("Description is required.");

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
      const updateData = {
        title,
        description,
        category,
        location,
        urgency,
      };

        const { data: updated, error: updateError } = await supabase
        .from("tickets")
        .update(updateData)
        .eq("id", ticketId)
        .select();

        console.log("Updated rows:", updated);
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
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
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
              <Input value={profile?.desasiswa || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Room Number</Label>
              <Input value={profile?.room_number || ""} disabled />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Specific Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="urgency">Urgency</Label>
            <Select value={urgency} onValueChange={setUrgency}>
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
            />
          </div>

          {/* Existing Photos */}
          {existingPhotos.length > 0 && (
            <div className="space-y-2">
              <Label>Existing Photos</Label>
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
            <Label>Upload New Photos (optional)</Label>
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
              {loading ? "Updating..." : "Update Complaint"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditComplaintDialog;