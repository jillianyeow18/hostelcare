import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { sanitizeInput } from "@/lib/sanitize";
import { validators } from "@/lib/validation";
import { User } from "lucide-react";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const EditProfileDialog = ({
  open,
  onOpenChange,
  onUpdate,
}: EditProfileDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Profile state
  const [userId, setUserId] = useState<string>("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"student" | "staff">("student");
  const [contactNumber, setContactNumber] = useState("");

  // Student-specific fields
  const [studentId, setStudentId] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [desasiswa, setDesasiswa] = useState("");

  // Staff-specific fields
  const [staffCategory, setStaffCategory] = useState("");

  useEffect(() => {
    if (open) {
      loadProfile();
    }
  }, [open]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      setUserId(user.id);
      setEmail(user.email || "");

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (profile) {
        setFullName(profile.full_name || "");
        setRole((profile.role as "student" | "staff") || "student");
        setContactNumber(profile.contact_number || "");
        setStudentId(profile.student_id || "");
        setRoomNumber(profile.room_number || "");
        setDesasiswa(profile.desasiswa || "");
        setStaffCategory(profile.staff_category || "");
      }
    } catch (error: any) {
      toast({
        title: "Error loading profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Enhanced validation
      const nameValidation = validators.textLength(
        fullName,
        2,
        100,
        "Full name"
      );
      if (!nameValidation.valid) {
        toast({
          title: "Validation error",
          description: nameValidation.error,
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      // Validate contact number
      if (contactNumber) {
        const phoneValidation = validators.phone(contactNumber);
        if (!phoneValidation.valid) {
          toast({
            title: "Invalid phone number",
            description: phoneValidation.error,
            variant: "destructive",
          });
          setSaving(false);
          return;
        }
      }

      // Validate student ID if provided
      if (role === "student" && studentId) {
        const idValidation = validators.studentId(studentId);
        if (!idValidation.valid) {
          toast({
            title: "Invalid student ID",
            description: idValidation.error,
            variant: "destructive",
          });
          setSaving(false);
          return;
        }
      }

      // Validate room number if provided
      if (role === "student" && roomNumber) {
        const roomValidation = validators.roomNumber(roomNumber);
        if (!roomValidation.valid) {
          toast({
            title: "Invalid room number",
            description: roomValidation.error,
            variant: "destructive",
          });
          setSaving(false);
          return;
        }
      }

      // Validate required fields
      if (!fullName.trim()) {
        toast({
          title: "Validation error",
          description: "Full name is required.",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      if (!contactNumber.trim()) {
        toast({
          title: "Validation error",
          description: "Contact number is required.",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      // Build update object based on role with sanitized data
      const updateData: any = {
        full_name: sanitizeInput.limitedText(fullName, 100),
        contact_number: contactNumber.trim(),
      };

      if (role === "student") {
        updateData.student_id = studentId.trim() || null;
        updateData.room_number = roomNumber.trim() || null;
        updateData.desasiswa = desasiswa || null;
      }
      // Staff category is not editable, so we don't include it in updates

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });

      // Log session activity for profile update
      await sessionMiddleware.logActivity({
        activityType: "profile_updated",
      });

      onOpenChange(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-[#7323A8]" />
            Edit Profile
          </DialogTitle>
          <DialogDescription>
            Update your profile information. Changes will be saved to your
            account.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-gray-500">
            Loading profile...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full-name">Full Name *</Label>
              <Input
                id="full-name"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-gray-500">
                Email cannot be changed. Contact admin if needed.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={role === "student" ? "Student" : "Staff"}
                disabled
                className="bg-muted cursor-not-allowed capitalize"
              />
              <p className="text-xs text-gray-500">
                Role cannot be changed. Contact admin if needed.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact">Contact Number *</Label>
              <Input
                id="contact"
                type="tel"
                inputMode="tel"
                pattern="^\+60[0-9]{7,14}$"
                placeholder="+60123456789"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                required
              />
            </div>

            {role === "student" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="student-id">Student ID</Label>
                  <Input
                    id="student-id"
                    placeholder="A12345678"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="desasiswa">Desasiswa</Label>
                    <Select value={desasiswa} onValueChange={setDesasiswa}>
                      <SelectTrigger id="desasiswa">
                        <SelectValue placeholder="Select hostel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Aman Damai">Aman Damai</SelectItem>
                        <SelectItem value="Fajar Harapan">
                          Fajar Harapan
                        </SelectItem>
                        <SelectItem value="Bakti Permai">
                          Bakti Permai
                        </SelectItem>
                        <SelectItem value="Cahaya Gemilang">
                          Cahaya Gemilang
                        </SelectItem>
                        <SelectItem value="Indah Kembara">
                          Indah Kembara
                        </SelectItem>
                        <SelectItem value="Restu">Restu</SelectItem>
                        <SelectItem value="Saujana">Saujana</SelectItem>
                        <SelectItem value="Tekun">Tekun</SelectItem>
                        <SelectItem value="International House">
                          International House
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="room">Room Number</Label>
                    <Input
                      id="room"
                      placeholder="201"
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {role === "staff" && (
              <div className="space-y-2">
                <Label htmlFor="staff-category">Team Category</Label>
                <Input
                  id="staff-category"
                  value={
                    staffCategory
                      ? staffCategory.charAt(0).toUpperCase() +
                        staffCategory.slice(1)
                      : "Not assigned"
                  }
                  disabled
                  className="bg-muted cursor-not-allowed capitalize"
                />
                <p className="text-xs text-gray-500">
                  Team category cannot be changed. Contact admin if needed.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || loading}
                className="flex-1 bg-gradient-to-r from-[#7323A8] to-[#E50085] hover:from-[#32004F] hover:to-[#7323A8]"
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileDialog;
