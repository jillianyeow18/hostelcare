import { useState, useEffect } from "react";
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
} from "@/components/ui/sidebar";
import { Ticket, LogOut, UserPen, Hash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import EditProfileDialog from "@/components/shared/EditProfileDialog";
import logo from "@/assets/hostelcare-logo.png";
import { Badge } from "@/components/ui/badge";

interface Channel {
  id: string;
  name: string;
  staff_category: string;
}

interface StaffSidebarProps {
  profile: any;
  staffCategory?: string;
}

const StaffSidebar = ({ profile, staffCategory }: StaffSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showEditProfileDialog, setShowEditProfileDialog] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [notificationsCount, setNotificationsCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id && staffCategory) {
      loadChannels();
    }
  }, [profile?.id, staffCategory]);

  useEffect(() => {
    if (profile?.id) {
      subscribeNotifications();
    }

    return () => {
      supabase.removeAllChannels();
    };
  }, [profile?.id]);

  const loadChannels = async () => {
    try {
      setLoading(true);
      const { data: channelData, error } = await supabase
        .from("channels")
        .select("id, name, staff_category")
        .eq("staff_category", staffCategory)
        .order("name", { ascending: true });

      if (error) throw error;
      setChannels(channelData || []);
      setLoading(false);

      // Load initial notifications counts
      const counts: Record<string, number> = {};
      for (const channel of channelData || []) {
        const { count } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", profile.id)
          .eq("channel_id", channel.id)
          .eq("seen", false);

        counts[channel.id] = count || 0;
      }
      setNotificationsCount(counts);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const subscribeNotifications = () => {
    supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const notif = payload.new;
          setNotificationsCount((prev) => ({
            ...prev,
            [notif.channel_id]: (prev[notif.channel_id] || 0) + 1,
          }));
        }
      )
      .subscribe();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const isActive = (path: string) => location.pathname === path;

  const handleChannelClick = async (channelId: string) => {
    navigate(`/staff/channel/${channelId}`);

    // Mark notifications as seen for this channel
    await supabase
      .from("notifications")
      .update({ seen: true })
      .eq("user_id", profile.id)
      .eq("channel_id", channelId);

    setNotificationsCount((prev) => ({
      ...prev,
      [channelId]: 0,
    }));
  };

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
                <p className="text-sm font-medium truncate">{profile?.full_name}</p>
                <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
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

          {staffCategory && (
            <SidebarGroup>
              <SidebarGroupLabel>Channels</SidebarGroupLabel>
              <SidebarMenu>
                {loading ? (
                  <div className="px-2 py-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                    Loading channels...
                  </div>
                ) : channels.length === 0 ? (
                  <div className="px-2 py-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                    No channels available
                  </div>
                ) : (
                  channels.map((channel) => (
                    <SidebarMenuItem key={channel.id}>
                      <SidebarMenuButton
                        onClick={() => handleChannelClick(channel.id)}
                        isActive={location.pathname.includes(`/channel/${channel.id}`)}
                        tooltip={`#${channel.name}`}
                      >
                        <Hash className="h-4 w-4" />
                        <span className="flex-1">{channel.name}</span>
                        {notificationsCount[channel.id] > 0 && (
                          <Badge
                            variant="default"
                            className="ml-auto bg-red-500 hover:bg-red-600 text-white group-data-[collapsible=icon]:hidden"
                          >
                            {notificationsCount[channel.id] > 99 ? "99+" : notificationsCount[channel.id]}
                          </Badge>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))
                )}
              </SidebarMenu>
            </SidebarGroup>
          )}
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
