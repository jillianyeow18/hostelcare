import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, LogOut, Ticket, Clock, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SubmitComplaintDialog from "@/components/SubmitComplaintDialog";
import TicketList from "@/components/TicketList";
import logo from "@/assets/hostelcare-logo.png";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

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

    if (profileData?.role !== "student") {
      navigate("/staff");
      return;
    }

    setProfile(profileData);
  };

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ticketsData, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("created_by", user.id)
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
    open: tickets.filter((t) => ["pending", "assigned", "in_progress"].includes(t.status)).length,
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
              <p className="text-sm text-muted-foreground">Student Portal</p>
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
          <h2 className="text-3xl font-bold mb-2">Welcome back, {profile?.full_name}!</h2>
          <p className="text-muted-foreground">
            {profile?.desasiswa && `${profile.desasiswa} • `}
            {profile?.room_number && `Room ${profile.room_number}`}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats.open}</div>
              <p className="text-xs text-muted-foreground mt-1">Pending resolution</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Resolved</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-secondary">{stats.resolved}</div>
              <p className="text-xs text-muted-foreground mt-1">Completed issues</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
                <Ticket className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-semibold">My Tickets</h3>
          <Button onClick={() => setShowSubmitDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Submit Complaint
          </Button>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Loading your tickets...</p>
            </CardContent>
          </Card>
        ) : tickets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <CardTitle className="mb-2">No tickets yet</CardTitle>
              <CardDescription className="mb-4">
                Submit your first maintenance complaint to get started
              </CardDescription>
              <Button onClick={() => setShowSubmitDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Submit Complaint
              </Button>
            </CardContent>
          </Card>
        ) : (
          <TicketList tickets={tickets} onUpdate={loadData} role="student" />
        )}
      </main>

      <SubmitComplaintDialog 
        open={showSubmitDialog} 
        onOpenChange={setShowSubmitDialog}
        onSuccess={loadData}
      />
    </div>
  );
};

export default StudentDashboard;
