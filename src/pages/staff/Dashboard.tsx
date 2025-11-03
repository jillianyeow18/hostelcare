import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AlertCircle, Clock, CheckCircle2, Ticket, Filter, Building2, TrendingUp, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TicketList from "@/components/shared/TicketList";
import StaffSidebar from "@/components/staff/StaffSidebar";
import { differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredTickets, setFilteredTickets] = useState<any[]>([]);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [desasiswaFilter, setDesasiswaFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");

  useEffect(() => {
    checkAuth();
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tickets, searchQuery, statusFilter, desasiswaFilter, categoryFilter, urgencyFilter]);

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
      // Get current user's profile to check staff_category
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("staff_category")
        .eq("id", user.id)
        .single();

      let query = supabase
        .from("tickets")
        .select(`
          *,
          profiles:created_by (
            full_name,
            email,
            room_number,
            desasiswa
          )
        `);

      // Filter by staff category if set
      if (userProfile?.staff_category) {
        query = query.eq("category", userProfile.staff_category);
      }

      const { data: ticketsData, error } = await query.order("created_at", { ascending: false });

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

  const applyFilters = () => {
    let filtered = [...tickets];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (t) =>
          t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    // Desasiswa filter
    if (desasiswaFilter !== "all") {
      filtered = filtered.filter((t) => t.profiles?.desasiswa === desasiswaFilter);
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((t) => t.category === categoryFilter);
    }

    // Urgency filter
    if (urgencyFilter !== "all") {
      filtered = filtered.filter((t) => t.urgency === urgencyFilter);
    }

    setFilteredTickets(filtered);
  };

  const stats = {
    pending: tickets.filter((t) => t.status === "pending").length,
    in_progress: tickets.filter((t) => ["assigned", "in_progress"].includes(t.status)).length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
    total: tickets.length,
    unresolved_over_3_days: tickets.filter((t) => 
      t.status !== "resolved" && 
      differenceInDays(new Date(), new Date(t.created_at)) > 3
    ).length,
  };

  // Get unique desasiswa values
  const desasiswaList = Array.from(
    new Set(tickets.map((t) => t.profiles?.desasiswa).filter(Boolean))
  ).sort();

  // Get top 3 dorms with most unresolved complaints
  const desasiswaStats = desasiswaList.map((desasiswa) => {
    const desasiswaTickets = tickets.filter((t) => t.profiles?.desasiswa === desasiswa);
    const unresolved = desasiswaTickets.filter((t) => t.status !== "resolved").length;
    return { desasiswa, unresolved, total: desasiswaTickets.length };
  });
  const topDesasiswa = desasiswaStats.sort((a, b) => b.unresolved - a.unresolved).slice(0, 3);

  // Calculate average resolution time
  const resolvedTickets = tickets.filter((t) => t.status === "resolved" && t.resolved_at);
  const avgResolutionTime = resolvedTickets.length > 0
    ? resolvedTickets.reduce((acc, t) => {
        const days = differenceInDays(new Date(t.resolved_at), new Date(t.created_at));
        return acc + days;
      }, 0) / resolvedTickets.length
    : 0;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <StaffSidebar profile={profile} staffCategory={profile?.staff_category} />
      
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-6 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Welcome, {profile?.full_name}</h2>
            <p className="text-muted-foreground">
              {profile?.staff_category 
                ? `${profile.staff_category.charAt(0).toUpperCase() + profile.staff_category.slice(1)} Team Management`
                : "All Teams Management"}
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
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

            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-500">{stats.unresolved_over_3_days}</div>
                <p className="text-xs text-muted-foreground mt-1">Unresolved &gt;3 days</p>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Top 3 Dorms - Unresolved Complaints
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {topDesasiswa.length > 0 ? (
                  topDesasiswa.map((item, idx) => (
                    <div key={item.desasiswa} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-semibold">{item.desasiswa}</p>
                          <p className="text-sm text-muted-foreground">{item.total} total tickets</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-destructive">{item.unresolved}</p>
                        <p className="text-xs text-muted-foreground">unresolved</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">No data available</p>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">Avg. Resolution Time</p>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-3xl font-bold">{avgResolutionTime.toFixed(1)} days</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">Resolution Rate</p>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-3xl font-bold">
                    {stats.total > 0 ? ((stats.resolved / stats.total) * 100).toFixed(0) : 0}%
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">Active Hostels</p>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-3xl font-bold">{desasiswaList.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters Section */}
          <Card className="mb-6 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter Tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <Input
                    placeholder="Search tickets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Desasiswa</label>
                  <Select value={desasiswaFilter} onValueChange={setDesasiswaFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Hostels</SelectItem>
                      {desasiswaList.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="plumbing">Plumbing</SelectItem>
                      <SelectItem value="electrical">Electrical</SelectItem>
                      <SelectItem value="furniture">Furniture</SelectItem>
                      <SelectItem value="cleaning">Cleaning</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Urgency</label>
                  <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Urgency</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredTickets.length} of {tickets.length} tickets
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setDesasiswaFilter("all");
                    setCategoryFilter("all");
                    setUrgencyFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="mb-6">
            <h3 className="text-2xl font-semibold">
              {statusFilter !== "all" || desasiswaFilter !== "all" || categoryFilter !== "all" || urgencyFilter !== "all"
                ? "Filtered Tickets"
                : "All Tickets"}
            </h3>
          </div>

          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Loading tickets...</p>
              </CardContent>
            </Card>
          ) : filteredTickets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No tickets match your filters</p>
              </CardContent>
            </Card>
          ) : (
            <TicketList tickets={filteredTickets} onUpdate={loadData} role="staff" />
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
