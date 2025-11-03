import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Ticket, MessageSquare, Hash, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/hostelcare-logo.png";

interface StaffSidebarProps {
  profile: any;
  staffCategory?: string;
}

const StaffSidebar = ({ profile, staffCategory }: StaffSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const categories = [
    { id: "electrical", name: "Electrical", icon: Hash },
    { id: "plumbing", name: "Plumbing", icon: Hash },
    { id: "cleaning", name: "Cleaning", icon: Hash },
    { id: "hvac", name: "HVAC", icon: Hash },
    { id: "carpentry", name: "Carpentry", icon: Hash },
    { id: "painting", name: "Painting", icon: Hash },
    { id: "general", name: "General", icon: Hash },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="w-64 bg-card border-r flex flex-col h-screen sticky top-0">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3 mb-4">
          <img src={logo} alt="HostelCare" className="h-8" />
          <div>
            <h1 className="font-bold text-foreground">HostelCare</h1>
            <p className="text-xs text-muted-foreground">Staff Portal</p>
          </div>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
              {profile?.full_name?.charAt(0) || "S"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.full_name}</p>
              <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
            </div>
          </div>
          {staffCategory && (
            <p className="text-xs text-muted-foreground mt-2 capitalize">
              Team: {staffCategory}
            </p>
          )}
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Main Navigation */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
              Main
            </h3>
            <Button
              variant={isActive("/staff") ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => navigate("/staff")}
            >
              <Ticket className="h-4 w-4 mr-2" />
              All Tickets
            </Button>
          </div>

          {/* Category Channels */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
              Team Channels
            </h3>
            <div className="space-y-1">
              {categories
                .filter(cat => !staffCategory || cat.id === staffCategory)
                .map((category) => (
                  <Button
                    key={category.id}
                    variant={
                      isActive(`/staff/discussions/${category.id}`)
                        ? "secondary"
                        : "ghost"
                    }
                    className={cn(
                      "w-full justify-start",
                      staffCategory === category.id && "font-medium"
                    )}
                    onClick={() => navigate(`/staff/discussions/${category.id}`)}
                  >
                    <category.icon className="h-4 w-4 mr-2" />
                    {category.name}
                  </Button>
                ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
};

export default StaffSidebar;
