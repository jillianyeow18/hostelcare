import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, AlertCircle, Clock, CheckCircle2, Ticket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TicketList from "@/components/shared/TicketList";
import logo from "@/assets/hostelcare-logo.png";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    loadData();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileData?.role === "student") {
      navigate("/student");
      return;
    }

    setProfile(profileData);
  };

  const loadData = async () => {
    try {
      const { data: ticketsData, error } = await supabase
        .from("tickets")
        .select(`
          *,
          profiles:created_by (
            full_name,
            email,
            room_number,
            desasiswa
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTickets(ticketsData || []);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const stats = {
    pending: tickets.filter((t) => t.status === "pending").length,
    in_progress: tickets.filter((t) => ["assigned", "in_progress"].includes(t.status)).length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
    total: tickets.length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="HostelCare" className="h-10" />
            <div>
              <h1 className="text-xl font-bold text-foreground">HostelCare</h1>
              <p className="text-sm text-muted-foreground">Staff Portal</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome, {profile?.full_name}</h2>
          <p className="text-muted-foreground">Staff Management Console</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <AlertCircle className="h-4 w-4 text-destructive" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{stats.pending}</div>
              <p className="text-xs text-muted-foreground mt-1">Needs attention</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                <Clock className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats.in_progress}</div>
              <p className="text-xs text-muted-foreground mt-1">Being worked on</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Resolved</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-secondary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-secondary">{stats.resolved}</div>
              <p className="text-xs text-muted-foreground mt-1">Completed</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
                <Ticket className="h-4 w-4 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">All tickets</p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <h3 className="text-2xl font-semibold">All Tickets</h3>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Loading tickets...</p>
            </CardContent>
          </Card>
        ) : (
          <TicketList tickets={tickets} onUpdate={loadData} role="staff" />
        )}
      </main>
    </div>
  );
};

export default Dashboard;
