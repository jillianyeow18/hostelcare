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
      // Validate contact number: must start with +60 and contain digits only
      const phoneRegex = /^\+60\d{7,14}$/;
      if (contactNumber && !phoneRegex.test(contactNumber)) {
        toast({
          title: "Invalid phone number",
          description:
            "Contact number must start with +60 and contain digits only (e.g. +60123456789).",
          variant: "destructive",
        });
        setSaving(false);
        return;
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

      // Build update object based on role
      const updateData: any = {
        full_name: fullName.trim(),
        contact_number: contactNumber.trim(),
      };

      if (role === "student") {
        updateData.student_id = studentId.trim() || null;
        updateData.room_number = roomNumber.trim() || null;
        updateData.desasiswa = desasiswa || null;
        updateData.staff_category = null;
      } else {
        updateData.staff_category = staffCategory || null;
        updateData.student_id = null;
        updateData.room_number = null;
        updateData.desasiswa = null;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
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
                <Select value={staffCategory} onValueChange={setStaffCategory}>
                  <SelectTrigger id="staff-category">
                    <SelectValue placeholder="Select your team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plumbing">Plumbing</SelectItem>
                    <SelectItem value="electrical">Electrical</SelectItem>
                    <SelectItem value="furniture">Furniture</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
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
