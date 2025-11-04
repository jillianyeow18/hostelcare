import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  Ticket,
  Filter,
  Building2,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TicketList from "@/components/shared/TicketList";
import StaffSidebar from "@/components/staff/StaffSidebar";
import { differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  const [urgencyFilter, setUrgencyFilter] = useState("all");

  useEffect(() => {
    checkAuth();
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tickets, searchQuery, statusFilter, desasiswaFilter, urgencyFilter]);

  const checkAuth = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("staff_category")
        .eq("id", user.id)
        .single();

      let query = supabase.from("tickets").select(`
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

      const { data: ticketsData, error } = await query.order("created_at", {
        ascending: false,
      });

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
          t.profiles?.full_name
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    // Desasiswa filter
    if (desasiswaFilter !== "all") {
      filtered = filtered.filter(
        (t) => t.profiles?.desasiswa === desasiswaFilter
      );
    }

    // Urgency filter
    if (urgencyFilter !== "all") {
      filtered = filtered.filter((t) => t.urgency === urgencyFilter);
    }

    setFilteredTickets(filtered);
  };

  const stats = {
    pending: tickets.filter((t) => t.status === "pending").length,
    in_progress: tickets.filter((t) =>
      ["assigned", "in_progress"].includes(t.status)
    ).length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
    total: tickets.length,
    unresolved_over_3_days: tickets.filter(
      (t) =>
        t.status !== "resolved" &&
        differenceInDays(new Date(), new Date(t.created_at)) > 3
    ).length,
  };

  // Get unique desasiswa values
  const desasiswaList = Array.from(
    new Set(tickets.map((t) => t.profiles?.desasiswa).filter(Boolean))
  ).sort();

  // Get all dorms with unresolved complaints
  const desasiswaStats = desasiswaList.map((desasiswa) => {
    const desasiswaTickets = tickets.filter(
      (t) => t.profiles?.desasiswa === desasiswa
    );
    const unresolved = desasiswaTickets.filter(
      (t) => t.status !== "resolved"
    ).length;
    return { desasiswa, unresolved, total: desasiswaTickets.length };
  });
  const allDesasiswa = desasiswaStats.sort(
    (a, b) => b.unresolved - a.unresolved
  );

  // Calculate average resolution time
  const resolvedTickets = tickets.filter(
    (t) => t.status === "resolved" && t.resolved_at
  );
  const avgResolutionTime =
    resolvedTickets.length > 0
      ? resolvedTickets.reduce((acc, t) => {
          const days = differenceInDays(
            new Date(t.resolved_at),
            new Date(t.created_at)
          );
          return acc + days;
        }, 0) / resolvedTickets.length
      : 0;

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <StaffSidebar profile={profile} staffCategory={profile?.staff_category} />

      <main className="flex-1 overflow-y-auto">
        {/* Top Bar */}
        <div className="border-b bg-white px-8 py-4 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#32004F] to-[#7323A8] bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Welcome back, {profile?.full_name}
            </p>
          </div>
        </div>

        <div className="p-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-all hover:scale-105">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-[#7323A8]/10 to-[#7323A8]/20 rounded-lg">
                    <Ticket className="h-6 w-6 text-[#7323A8]" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-bold text-[#32004F]">
                    {stats.total}
                  </p>
                  <p className="text-sm text-gray-600">Total Tickets</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-all hover:scale-105">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-[#E50085]/10 to-[#E50085]/20 rounded-lg">
                    <Clock className="h-6 w-6 text-[#E50085]" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-bold text-[#32004F]">
                    {stats.pending}
                  </p>
                  <p className="text-sm text-gray-600">Pending</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-all hover:scale-105">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-[#FF5E5B]/10 to-[#FF5E5B]/20 rounded-lg">
                    <AlertCircle className="h-6 w-6 text-[#FF5E5B]" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-bold text-[#32004F]">
                    {stats.in_progress}
                  </p>
                  <p className="text-sm text-gray-600">In Progress</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-all hover:scale-105">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-[#FFAC93]/30 to-[#FFAC93]/50 rounded-lg">
                    <CheckCircle2 className="h-6 w-6 text-[#32004F]" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-bold text-[#32004F]">
                    {stats.resolved}
                  </p>
                  <p className="text-sm text-gray-600">Resolved</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Performance Metrics - Large Card */}
            <Card className="lg:col-span-2 bg-white border-0 shadow-sm">
              <CardHeader className="border-b pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-[#32004F]">
                    Tickets Overview
                  </CardTitle>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32 border-purple-200 focus:border-[#7323A8] focus:ring-[#7323A8]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center space-y-4 w-full">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-gradient-to-br from-[#E50085]/10 to-[#E50085]/20 rounded-lg">
                        <p className="text-2xl font-bold text-[#E50085]">
                          {stats.pending}
                        </p>
                        <p className="text-xs text-gray-700 mt-1">Pending</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-[#FF5E5B]/10 to-[#FF5E5B]/20 rounded-lg">
                        <p className="text-2xl font-bold text-[#FF5E5B]">
                          {stats.in_progress}
                        </p>
                        <p className="text-xs text-gray-700 mt-1">
                          In Progress
                        </p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-[#FFAC93]/30 to-[#FFAC93]/50 rounded-lg">
                        <p className="text-2xl font-bold text-[#32004F]">
                          {stats.resolved}
                        </p>
                        <p className="text-xs text-gray-700 mt-1">Resolved</p>
                      </div>
                    </div>
                    <div className="mt-6 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">Resolution Rate</span>
                        <span className="font-semibold text-[#32004F]">
                          {stats.total > 0
                            ? ((stats.resolved / stats.total) * 100).toFixed(0)
                            : 0}
                          %
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-[#7323A8] via-[#E50085] to-[#FF5E5B] h-2 rounded-full transition-all"
                          style={{
                            width: `${
                              stats.total > 0
                                ? (stats.resolved / stats.total) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right Side Card - This Month */}
            <Card className="bg-gradient-to-br from-[#32004F] via-[#7323A8] to-[#E50085] border-0 shadow-sm text-white">
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div>
                    <p className="text-purple-200 text-sm">
                      Tickets this month
                    </p>
                    <p className="text-5xl font-bold mt-2">{stats.total}</p>
                  </div>
                  <div className="h-24 flex items-end justify-between gap-1">
                    {[40, 60, 45, 80, 70, 65, 75].map((height, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-white/20 rounded-t transition-all hover:bg-white/40 cursor-pointer"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-sm text-purple-200">
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                    <span>Sun</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Hostel Stats */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-lg font-semibold text-[#32004F] flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-[#7323A8]" />
                  Hostels By Tickets
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {allDesasiswa.slice(0, 5).map((item, idx) => (
                    <div
                      key={item.desasiswa}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-purple-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7323A8]/10 to-[#7323A8]/20 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-[#7323A8]" />
                        </div>
                        <div>
                          <p className="font-medium text-[#32004F]">
                            {item.desasiswa}
                          </p>
                          <p className="text-xs text-gray-600">
                            {item.total} total
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          item.unresolved > 5 ? "destructive" : "secondary"
                        }
                        className={
                          item.unresolved > 5
                            ? "bg-[#E50085] hover:bg-[#E50085]/90"
                            : "bg-[#FFAC93] text-[#32004F] hover:bg-[#FFAC93]/80"
                        }
                      >
                        {item.unresolved} pending
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-lg font-semibold text-[#32004F] flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[#7323A8]" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50">
                    <div>
                      <p className="text-sm text-gray-700">
                        Avg. Resolution Time
                      </p>
                      <p className="text-2xl font-bold text-[#32004F] mt-1">
                        {avgResolutionTime.toFixed(1)} days
                      </p>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-[#7323A8]/10 to-[#7323A8]/20 rounded-lg">
                      <Clock className="h-6 w-6 text-[#7323A8]" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-br from-orange-50 to-pink-50">
                    <div>
                      <p className="text-sm text-gray-700">Overdue Tickets</p>
                      <p className="text-2xl font-bold text-[#32004F] mt-1">
                        {stats.unresolved_over_3_days}
                      </p>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-[#FF5E5B]/10 to-[#FF5E5B]/20 rounded-lg">
                      <AlertTriangle className="h-6 w-6 text-[#FF5E5B]" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-br from-purple-50 to-orange-50">
                    <div>
                      <p className="text-sm text-gray-700">Active Hostels</p>
                      <p className="text-2xl font-bold text-[#32004F] mt-1">
                        {desasiswaList.length}
                      </p>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-[#E50085]/10 to-[#E50085]/20 rounded-lg">
                      <Building2 className="h-6 w-6 text-[#E50085]" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="bg-white border-0 shadow-sm mb-6">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-lg font-semibold text-[#32004F] flex items-center gap-2">
                <Filter className="h-5 w-5 text-[#7323A8]" />
                Filter Tickets
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Select
                  value={desasiswaFilter}
                  onValueChange={setDesasiswaFilter}
                >
                  <SelectTrigger className="border-purple-200 focus:border-[#7323A8] focus:ring-[#7323A8]">
                    <SelectValue placeholder="All Hostels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">🏠 All Hostels</SelectItem>
                    <SelectItem value="Aman Damai">Aman Damai</SelectItem>
                    <SelectItem value="Fajar Harapan">Fajar Harapan</SelectItem>
                    <SelectItem value="Bakti Permai">Bakti Permai</SelectItem>
                    <SelectItem value="Cahaya Gemilang">
                      Cahaya Gemilang
                    </SelectItem>
                    <SelectItem value="Indah Kembara">Indah Kembara</SelectItem>
                    <SelectItem value="Restu">Restu</SelectItem>
                    <SelectItem value="Saujana">Saujana</SelectItem>
                    <SelectItem value="Tekun">Tekun</SelectItem>
                    <SelectItem value="International House">
                      International House
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="border-purple-200 focus:border-[#7323A8] focus:ring-[#7323A8]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                  <SelectTrigger className="border-purple-200 focus:border-[#7323A8] focus:ring-[#7323A8]">
                    <SelectValue placeholder="All Urgency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Urgency</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  className="border-[#7323A8] text-[#7323A8] hover:bg-[#7323A8] hover:text-white transition-colors"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setDesasiswaFilter("all");
                    setUrgencyFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
              <p className="text-sm text-gray-600 mt-4">
                Showing {filteredTickets.length} of {tickets.length} tickets
              </p>
            </CardContent>
          </Card>

          {/* Tickets List */}
          {loading ? (
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">Loading tickets...</p>
              </CardContent>
            </Card>
          ) : filteredTickets.length === 0 ? (
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">No tickets match your filters</p>
              </CardContent>
            </Card>
          ) : (
            <TicketList
              tickets={filteredTickets}
              onUpdate={loadData}
              role="staff"
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
