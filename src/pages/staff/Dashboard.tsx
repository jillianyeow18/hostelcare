import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from "date-fns";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { differenceInDays } from "date-fns";
import Navbar from "@/components/ui/navbar";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profile, setProfile] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredTickets, setFilteredTickets] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [desasiswaFilter, setDesasiswaFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"none" | "asc" | "desc">("none");

  const [activeTab, setActiveTab] = useState("All Tickets");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ticketsPerPage = 5;

  // heatmap
  const [activeMonth, setActiveMonth] = useState(new Date()); // default: current month


  useEffect(() => {
    checkAuth();
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab !== "All Tickets") {
      setSearchQuery("");
      setStatusFilter("all");
      setDesasiswaFilter("all");
      setUrgencyFilter("all");
      setSortOrder("none");
    }
  }, [activeTab]);

  useEffect(() => {
    applyFilters();
  }, [tickets, searchQuery, statusFilter, desasiswaFilter, urgencyFilter, sortOrder]);


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
    setCurrentUserId(user.id);
  };

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("staff_category")
        .eq("id", user.id)
        .single();

      let query = supabase
        .from("tickets")
        .select(`*,
          profiles:created_by (
            full_name,
            email,
            room_number,
            desasiswa
          ),
          staff:assigned_to (
            full_name,
            email
          ),
          attachments:attachments (
            id,
            file_url,
            file_name
          )
        `);
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
      if (statusFilter === "escalated") {
        filtered = filtered.filter((t) => t.is_escalated === true);
      } else if (statusFilter === "in progress") {
        filtered = filtered.filter((t) => t.status === 'in_progress');
      }
      else {
        filtered = filtered.filter((t) => t.status === statusFilter);
      }
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

    // Sort by created time
    if (sortOrder === "asc") {
      filtered.sort((a, b) => new Date(a.resolved_at).getTime() - new Date(b.resolved_at).getTime());
    } else if (sortOrder === "desc") {
      filtered.sort((a, b) => new Date(b.resolved_at).getTime() - new Date(a.resolved_at).getTime());
    }

    setFilteredTickets(filtered);
  };

  // Stats
  const stats = {
    pending: tickets.filter((t) => t.status === "pending").length,
    in_progress: tickets.filter((t) =>
      ["assigned", "in_progress"].includes(t.status)
    ).length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
    total: tickets.length,
    escalated: tickets.filter((t) => t.is_escalated).length,
  };


  // Desasiswa Stats
  const desasiswaList = Array.from(
    new Set(tickets.map((t) => t.profiles?.desasiswa).filter(Boolean))
  ).sort();

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

  // Avg resolution time
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

  // Sort tickets (latest first)
  const sortedTickets = [...filteredTickets].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return dateB - dateA; // Sort from latest → oldest
  });


  // Apply tab filtering
  const filteredByTab = sortedTickets.filter((ticket) => {
    const tab = activeTab.toLowerCase();
    switch (tab) {
      case "all tickets":
        return true;
      case "my tickets":
        return (
          ticket.assigned_to === currentUserId &&
          ["assigned", "in_progress"].includes(ticket.status)
        );
      case "resolved":
        return (
          ticket.assigned_to === currentUserId && ticket.status === "resolved"
        );
      default:
        return true;
    }
  });

  // Pagination
  const indexOfLastTicket = currentPage * ticketsPerPage;
  const indexOfFirstTicket = indexOfLastTicket - ticketsPerPage;
  const displayedTickets = filteredByTab.slice(
    indexOfFirstTicket,
    indexOfLastTicket
  );

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Count tickets per weekday
  // const ticketCountsPerDay = weekdays.map((_, index) => {
  //   return tickets.filter((t) => new Date(t.created_at).getDay() === index).length;
  // });

  // // Convert counts to percentages for bar heights
  // const maxCount = Math.max(...ticketCountsPerDay, 1); // avoid division by zero
  // const heights = ticketCountsPerDay.map((count) => (count / maxCount) * 100);

  //const currentMonth = new Date(); // Or a selected month
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(activeMonth),
    end: endOfMonth(activeMonth),
  });

  // Count tickets per day
  const ticketCountsPerDay = daysInMonth.map(day => {
    return tickets.filter(ticket => {
      const ticketDate = new Date(ticket.created_at);
      return (
        ticketDate.getFullYear() === day.getFullYear() &&
        ticketDate.getMonth() === day.getMonth() &&
        ticketDate.getDate() === day.getDate()
      );
    }).length;
  });

  // Find the max count for color scaling
  const maxCount = Math.max(...ticketCountsPerDay, 1); // avoid division by 0

  // Map counts to intensity 0.2 → 1.0
  const intensities = ticketCountsPerDay.map(count => 0.2 + 0.8 * (count / maxCount));


  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 w-full">
        <StaffSidebar
          profile={profile}
          staffCategory={profile?.staff_category}
        />

        <SidebarInset className="flex-1 overflow-y-auto">
          {/* Top Bar */}
          <div className="border-b bg-white px-4 sm:px-6 lg:px-8 py-3 sm:py-4 shadow-sm flex items-center gap-2">
            <SidebarTrigger />
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#32004F] to-[#7323A8] bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Welcome back, {profile?.full_name}
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
            {/* Stats cards omitted for brevity, same as your original code */}
            <div className="border grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <Card className="select-none bg-white border-0 shadow-sm hover:shadow-md transition-all hover:scale-105">
                <CardContent className="p-6 flex items-start gap-8">
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

              <Card className="select-none bg-white border-0 shadow-sm hover:shadow-md transition-all hover:scale-105">
                <CardContent className="p-6 flex items-start gap-8">
                  <div className="flex items-center">
                    <div className="p-3 bg-gradient-to-br from-[#E50085]/10 to-[#E50085]/20 rounded-lg">
                      <Clock className="h-6 w-6 text-[#E50085]" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-3xl font-bold text-[#32004F] pl-1">
                      {stats.pending}
                    </p>
                    <p className="text-sm text-gray-600 pl-1">Pending</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="select-none bg-white border-0 shadow-sm hover:shadow-md transition-all hover:scale-105">
                <CardContent className="p-6 flex items-start gap-8">
                  <div className="flex items-center ">
                    <div className="p-3 bg-gradient-to-br from-[#FF5E5B]/10 to-[#FF5E5B]/20 rounded-lg">
                      <AlertCircle className="h-6 w-6 text-[#FF5E5B]" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-3xl font-bold text-[#32004F] pl-1">
                      {stats.in_progress}
                    </p>
                    <p className="text-sm text-gray-600 pl-2">In Progress</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="select-none bg-white border-0 shadow-sm hover:shadow-md transition-all hover:scale-105">
                <CardContent className="p-6 flex items-start gap-8">
                  <div className="flex items-center ">
                    <div className="p-3 bg-gradient-to-br from-[#FFAC93]/30 to-[#FFAC93]/50 rounded-lg">
                      <CheckCircle2 className="h-6 w-6 text-[#32004F]" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-3xl font-bold text-[#32004F] pl-1">
                      {stats.resolved}
                    </p>
                    <p className="text-sm text-gray-600 pl-2">Resolved</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="select-none grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <Card className="bg-white border shadow-sm">
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
                          {item.unresolved} unresolved
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="bg-white border shadow-sm">
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
                          {stats.escalated}
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

              {/* Right Side Card - This Month */}
              <Card className="bg-gradient-to-br from-[#4B1A6C] via-[#8C3AB8] to-[#F04EA0] border-0 shadow-sm text-white">
                <CardContent className="p-10 ml-5 ">
                  <div className="space-y-6">
                    <div>
                      <p className="text-purple-200 text-lg">
                        Tickets this month
                      </p>
                      <p className="text-5xl font-bold mt-2">{stats.total}</p>
                    </div>
                    {/* Weekday Labels */}
                    <div className="grid grid-cols-7 gap-1 text-sm text-purple-200 mb-1">
                      {weekdays.map((day) => (
                        <span key={day} >
                          {day}
                        </span>
                      ))}
                    </div>

                    {/* Heatmap */}
                    <div className="grid grid-cols-7 gap-1 p-1">
                      {daysInMonth.map((day, index) => (
                        <div
                          key={index}
                          className="w-6 h-6 rounded-sm cursor-pointer"
                          style={{
                            backgroundColor: `rgba(255, 230, 150, ${intensities[index]})`,
                          }}
                          title={`${format(day, "MMM d")}: ${ticketCountsPerDay[index]} tickets`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-center mb-4 gap-8">
                      <button
                        onClick={() =>
                          setActiveMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                        }
                        className="text-1xl font-bold text-white hover:text-purple-500"
                      >
                        &lt; 
                      </button>

                      {/* Month label */}
                      <span className="text-xl font-semibold">{format(activeMonth, "MMMM yyyy")}</span>

                      {/* Next month */}
                      <button
                        onClick={() =>
                          setActiveMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                        }
                        className="text-1xl font-bold text-white hover:text-purple-500"
                      >
                        &gt; 
                      </button>
                    </div>




                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="select-none bg-white border-0 shadow-sm mb-6">
              {/* Navbar */}
              <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
              <CardContent className="p-4 sm:p-6">
                <div className="flex gap-3 w-full">
                  {/* Desasiswa Select */}
                  <div className="flex-1">
                    <Select value={desasiswaFilter} onValueChange={setDesasiswaFilter}>
                      <SelectTrigger className="w-full border-purple-200 focus:border-[#7323A8] focus:ring-[#7323A8]">
                        <SelectValue placeholder="All Hostels" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">🏠 All Hostels</SelectItem>
                        <SelectItem value="Aman Damai">Aman Damai</SelectItem>
                        <SelectItem value="Fajar Harapan">Fajar Harapan</SelectItem>
                        <SelectItem value="Bakti Permai">Bakti Permai</SelectItem>
                        <SelectItem value="Cahaya Gemilang">Cahaya Gemilang</SelectItem>
                        <SelectItem value="Indah Kembara">Indah Kembara</SelectItem>
                        <SelectItem value="Restu">Restu</SelectItem>
                        <SelectItem value="Saujana">Saujana</SelectItem>
                        <SelectItem value="Tekun">Tekun</SelectItem>
                        <SelectItem value="International House">International House</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {activeTab !== "Resolved" && (
                    <div className="flex-1">
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full border-purple-200 focus:border-[#7323A8] focus:ring-[#7323A8]">
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeTab === "All Tickets" && (
                            <>
                              <SelectItem value="all">All Status</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="escalated">Escalated</SelectItem>
                              <SelectItem value="assigned">Assigned</SelectItem>
                              <SelectItem value="in progress">In Progress</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                            </>
                          )}
                          {activeTab === "My Tickets" && (
                            <>
                              <SelectItem value="all">All Status</SelectItem>
                              <SelectItem value="escalated">Escalated</SelectItem>
                              <SelectItem value="assigned">Assigned</SelectItem>
                              <SelectItem value="in progress">In Progress</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}


                  {/* Urgency Select */}
                  <div className="flex-1">
                    <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                      <SelectTrigger className="w-full border-purple-200 focus:border-[#7323A8] focus:ring-[#7323A8]">
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
                  </div>

                  {/* Sort Div */}
                  {activeTab == "Resolved" && (
                    <div
                      className="flex-1 flex items-center justify-center gap-2 cursor-pointer border border-gray-300 rounded-md px-3 py-2"
                      onClick={() => {
                        setSortOrder((prev) =>
                          prev === "none" ? "asc" : prev === "asc" ? "desc" : "none"
                        );
                      }}
                    >
                      <span className="text-sm font-medium text-gray-700">Resolved Time</span>
                      {sortOrder === "asc" && <ArrowUp className="h-4 w-4 text-purple-500" />}
                      {sortOrder === "desc" && <ArrowDown className="h-4 w-4 text-purple-500" />}
                      {sortOrder === "none" && <ArrowUpDown className="h-4 w-4 text-gray-400" />}
                    </div>
                  )}

                  {/* Clear Filters Button */}
                  <div className="flex-1">
                    <Button
                      variant="outline"
                      className="w-full border-[#7323A8] text-[#7323A8] hover:bg-[#7323A8] hover:text-white transition-colors"
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("all");
                        setDesasiswaFilter("all");
                        setUrgencyFilter("all");
                        setSortOrder("none");
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tickets list */}
            {loading ? (
              <Card className="bg-white border-0 shadow-sm">
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500">Loading tickets...</p>
                </CardContent>
              </Card>
            ) : displayedTickets.length === 0 ? (
              <Card className="bg-white border-0 shadow-sm">
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500">No tickets to display</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <TicketList
                  tickets={displayedTickets}
                  onUpdate={loadData}
                  role="staff"
                />

                {/* Pagination Controls */}
                <div className="flex justify-between items-center mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="border-[#7323A8] text-[#7323A8] hover:bg-[#7323A8] hover:text-white transition-colors"
                  >
                    Previous
                  </Button>

                  <span className="text-sm font-medium text-gray-600">
                    Page {currentPage} of {Math.ceil(filteredByTab.length / ticketsPerPage)}
                  </span>

                  <Button
                    variant="outline"
                    onClick={() =>
                      setCurrentPage((prev) =>
                        prev < Math.ceil(filteredByTab.length / ticketsPerPage)
                          ? prev + 1
                          : prev
                      )
                    }
                    disabled={currentPage === Math.ceil(filteredByTab.length / ticketsPerPage)}
                    className="border-[#7323A8] text-[#7323A8] hover:bg-[#7323A8] hover:text-white transition-colors"
                  >
                    Next
                  </Button>
                </div>
              </>
            )}

          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
