import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Ticket, LogOut, UserPen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import EditProfileDialog from "@/components/shared/EditProfileDialog";
import logo from "@/assets/hostelcare-logo.png";

interface StaffSidebarProps {
  profile: any;
  staffCategory?: string;
}

const StaffSidebar = ({ profile, staffCategory }: StaffSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showEditProfileDialog, setShowEditProfileDialog] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-3 px-2 py-2">
            <img src={logo} alt="HostelCare" className="h-8 w-8 shrink-0" />
            <div className="flex flex-col gap-0.5 group-data-[collapsible=icon]:hidden">
              <h1 className="font-bold text-foreground text-sm">HostelCare</h1>
              <p className="text-xs text-muted-foreground">Staff Portal</p>
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 mx-2 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:bg-transparent">
            <div className="flex items-center gap-2 mb-1 group-data-[collapsible=icon]:mb-0 group-data-[collapsible=icon]:justify-center">
              <div className="h-8 w-8 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                {profile?.full_name?.charAt(0) || "S"}
              </div>
              <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-medium truncate">
                  {profile?.full_name}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {profile?.role}
                </p>
              </div>
            </div>
            {staffCategory && (
              <p className="text-xs text-muted-foreground mt-2 capitalize group-data-[collapsible=icon]:hidden">
                Team: {staffCategory}
              </p>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Main</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/staff")}
                  isActive={isActive("/staff")}
                  tooltip="All Tickets"
                >
                  <Ticket className="h-4 w-4" />
                  <span>All Tickets</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setShowEditProfileDialog(true)}
                tooltip="Edit Profile"
              >
                <UserPen className="h-4 w-4" />
                <span>Edit Profile</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} tooltip="Logout">
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <EditProfileDialog
        open={showEditProfileDialog}
        onOpenChange={setShowEditProfileDialog}
        onUpdate={() => window.location.reload()}
      />
    </>
  );
};

export default StaffSidebar;
