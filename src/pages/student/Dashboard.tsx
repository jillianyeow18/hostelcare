import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Plus,
  LogOut,
  Ticket,
  HelpCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  UserPen,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SubmitComplaintDialog from "@/components/student/SubmitComplaintDialog";
import TicketList from "@/components/shared/TicketList";
import EditProfileDialog from "@/components/shared/EditProfileDialog";
import logo from "@/assets/hostelcare-logo.png";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Sector,
} from "recharts";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

// ------------------ Interfaces ------------------

interface Ticket {
  id: string;
  title: string;
  description: string;
  category: string;
  damage_type: string;
  specific_item_or_location: string;
  urgency: string;
  desasiswa?: string;
  status?: string;
  created_at: string;
  updated_at?: string;
}

interface Profile {
  id: string;
  full_name: string;
  desasiswa: string;
  room_number?: string;
  role: string;
}

// ------------------ Component ------------------

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showEditProfileDialog, setShowEditProfileDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("mine");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<string>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [desaTickets, setDesaTickets] = useState<Ticket[]>([]);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const ActiveShape = (props: any) => {
    const RADIAN = Math.PI / 180;
    const {
      cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle,
      fill, percent,
    } = props;

    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;

    return (
      <g>
        <path d={`M${cx},${cy}L${sx},${sy}`} fill="none" />
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 5}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
      </g>
    );
  };

  // ------------------ Auth ------------------

  useEffect(() => {
    checkAuth();
  }, []);

  // ADDED typeFilter TO DEPENDENCY ARRAY
  useEffect(() => {
    if (profile) {
      loadTickets();
      loadDesaTickets();
      loadFilteredTickets();
    }
  }, [profile, categoryFilter, statusFilter, sortOrder, searchQuery, typeFilter]);

  // ADDED typeFilter TO DEPENDENCY ARRAY
  useEffect(() => {
    filterTickets();
  }, [tickets, categoryFilter, statusFilter, searchQuery, sortOrder, typeFilter]);

  const filterTickets = () => {
    let result = [...tickets];

    // NEW TYPE FILTER LOGIC
    if (typeFilter !== "all") {
      result = result.filter((t) => t.damage_type === typeFilter);
    }

    if (categoryFilter !== "all") {
      result = result.filter((t) => t.category === categoryFilter);
    }
    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }
    if (searchQuery.trim()) {
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    result.sort((a, b) =>
      sortOrder === "asc"
        ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setFilteredTickets(result);
  };

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

  const faqs = [
    {
      question: "How long does it take to resolve an issue?",
      answer:
        "Resolution time varies by urgency and complexity. Urgent issues are typically addressed within 24 hours, high priority within 2-3 days, medium priority within 5-7 days, and low priority within 10-14 days. You'll receive updates throughout the process.",
    },
    {
      question: "Can I submit multiple complaints at once?",
      answer:
        "Yes, you can submit as many complaints as needed. Each issue should be submitted as a separate ticket so our maintenance team can track and resolve them individually.",
    },
    {
      question: "What information should I include in my complaint?",
      answer:
        "Please provide a clear title, detailed description of the issue, select the appropriate category and urgency level, and attach photos if possible. The more information you provide, the faster we can resolve your issue.",
    },
    {
      question: "Can I edit my complaint after submission?",
      answer:
        "You can still edit your complaint as long as its status is Pending. Once the status changes to Assigned, In Progress, or Resolved, editing is locked to maintain the integrity of the maintenance record. You can use the 'Edit Complaint' button on the ticket card to make changes.",
    },
  ];
  // ------------------ Filters ------------------
  const resetFilters = () => {
    setTypeFilter("all");
    setCategoryFilter("all");
    setStatusFilter("all");
    setSortOrder("desc");
    setSearchQuery("");
    loadFilteredTickets(); // reload after resetting
  };

  const loadFilteredTickets = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Start base query
      let query = supabase.from("tickets").select("*").eq("created_by", user.id);

      // Apply filters dynamically
      // NEW TYPE FILTER APPLICATION
      if (typeFilter !== "all") {
        query = query.eq("damage_type", typeFilter);
      }

      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      // Apply search (title or description)
      if (searchQuery.trim() !== "") {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      // Sorting (ascending or descending by created_at)
      query = query.order("created_at", { ascending: sortOrder === "asc" });

      const { data, error } = await query;

      if (error) throw error;
      setFilteredTickets((data ?? []) as Ticket[]);
    } catch (error: any) {
      toast({
        title: "Error loading filtered tickets",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ------------------ Load Tickets ------------------

  const loadTickets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("tickets")
        .select(`
           *,
           attachments:attachments (
             id,
             file_url,
             file_name
           )
         `)
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTickets((data ?? []) as Ticket[]);
    } catch (error: any) {
      toast({
        title: "Error loading tickets",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDesaTickets = async () => {
    if (!profile?.desasiswa) return;

    try {
      const { data, error } = await supabase
        .from("tickets")
        .select(`
           *,
           attachments:attachments (
             id,
             file_url,
             file_name
           )
         `)
        .eq("desasiswa", profile.desasiswa)
        .order("created_at", { ascending: false });

      if (error) console.error(error);
      console.log(data); // each ticket now has `attachments` array



      if (error) throw error;
      setDesaTickets((data ?? []) as Ticket[]);
    } catch (error: any) {
      console.error("Error loading desa tickets:", error);
    }
  };

  // ------------------ Logout ------------------

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  // ------------------ Stats ------------------

  const getStats = (data: Ticket[]) => ({
    pending: data.filter((t) => t.status === "pending").length,
    in_progress: data.filter((t) => t.status === "in_progress").length,
    resolved: data.filter((t) => t.status === "resolved").length,
    total: data.length,
  });

  const stats = activeTab === "mine" ? getStats(tickets) : getStats(desaTickets);

  const capitalizeFirstLetter = (string: string) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const categoryCounts = (activeTab === "mine" ? tickets : desaTickets).reduce(
    (acc: Record<string, number>, t) => {
      acc[t.category] = (acc[t.category] || 0) + 1;
      return acc;
    },
    {}
  );

  const pieData = Object.keys(categoryCounts).map((key) => ({
    name: capitalizeFirstLetter(key),
    value: categoryCounts[key],
  }));

  const COLORS = ["#7323A8", "#E50085", "#FF5E5B", "#FFAC93", "#32004F"];

  // ------------------ Render ------------------

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 select-none">
      {/* Header */}
      <header className="border-b bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img src={logo} alt="HostelCare" className="h-12" />
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-[#32004F] to-[#7323A8] bg-clip-text text-transparent">
                HostelCare
              </h1>
              <p className="text-sm text-gray-600">Student Portal</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowEditProfileDialog(true)}
              className="border-[#7323A8] text-[#7323A8]"
              size="sm"
            >
              <UserPen className="h-4 w-4 mr-1" /> Edit Profile
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="border-[#7323A8] text-[#7323A8]"
              size="sm"
            >
              <LogOut className="h-4 w-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold text-[#32004F] mb-2">
          Welcome back, {profile?.full_name}!
        </h2>
        <p className="text-gray-600 mb-6">
          {profile?.desasiswa && `${profile.desasiswa} • `}
          {profile?.room_number && `Room ${profile.room_number}`}
        </p>

        {/* Tabs */}
        <Tabs defaultValue="mine" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white mb-6">
            <TabsTrigger value="mine">My Complaint</TabsTrigger>
            <TabsTrigger value="desa">{profile?.desasiswa} Complaints</TabsTrigger>
          </TabsList>

          {/* Overview & Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Overview */}
            <Card className="lg:col-span-2 bg-white border-0 shadow-sm">
              <CardHeader className="border-b pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-semibold text-[#32004F]">
                    Complaints Overview
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center justify-center">
                  <div className="text-center space-y-4 w-full">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="p-4 bg-[#C00070]/10 rounded-lg">
                        <p className="text-2xl font-bold text-[#E50085]">
                          {stats.total}
                        </p>
                          <p className="text-sm text-gray-700">Total Complaints</p>

                      </div>
                      <div className="p-4 bg-[#F155B2]/10 rounded-lg">
                        <p className="text-2xl font-bold text-[#E50085]">
                          {stats.pending}
                        </p>
                        <p className="text-sm text-gray-700 mt-1">Pending</p>
                      </div>
                      <div className="p-4 bg-[#FF5E5B]/10 rounded-lg">
                        <p className="text-2xl font-bold text-[#FF5E5B]">
                          {stats.in_progress}
                        </p>
                        <p className="text-sm text-gray-700 mt-1">
                          In Progress
                        </p>
                      </div>
                      <div className="p-4 bg-[#FFAC93]/30 rounded-lg">
                        <p className="text-2xl font-bold text-[#32004F]">
                          {stats.resolved}
                        </p>
                        <p className="text-sm text-gray-700 mt-1">Resolved</p>
                      </div>
                    </div>
                    <div className="mt-6 space-y-3">
                      <div className="flex items-center justify-between text-sm mt-8">
                        <span className="text-gray-700 font-bold">Resolution Rate</span>
                        <span className="font-semibold text-[#32004F]">
                          {stats.total > 0
                            ? ((stats.resolved / stats.total) * 100).toFixed(
                              0
                            )
                            : 0}
                          %
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-[#7323A8] via-[#E50085] to-[#FF5E5B] h-3 rounded-full transition-all"
                          style={{
                            width: `${stats.total > 0
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

            {/* Pie Chart */}
            <Card className="bg-gradient-to-br from-[#32004F] via-[#7323A8] to-[#E50085] border-0 shadow-sm text-white">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-white h-2 mb-2">
                  Category Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="bg-purple-50 h-60">
                {pieData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                    No data
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={1}
                        outerRadius={70}
                        label={({ percent, cx, cy, midAngle, innerRadius, outerRadius, fill }) => {
                          const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                          const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                          const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

                          return (
                            <text
                              x={x}
                              y={y}
                              fill="white"
                              textAnchor={x > cx ? 'start' : 'end'}
                              dominantBaseline="central"
                              fontSize="13px"
                              fontWeight="bold"
                            >
                              {`${(percent * 100).toFixed(0)}%`}
                            </text>
                          );
                        }}
                        labelLine={false}
                        isAnimationActive
                        activeIndex={activeIndex}
                        activeShape={(props) => <ActiveShape {...props} />}
                        onMouseEnter={(_, index) => setActiveIndex(index)}
                        onMouseLeave={() => setActiveIndex(-1)}
                      >
                        {pieData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                            cursor="pointer"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [`${value} tickets`, name]}
                      />
                      <Legend
                        layout="vertical"
                        verticalAlign="middle"
                        align="right"
                        formatter={(value) => (
                          <span style={{ color: 'black', fontSize: '14px' }}>
                            {value}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </Tabs>
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* My Tickets Section - Takes 2 columns */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold text-[#32004F]">My Complaints</h3>
              <Button
                onClick={() => setShowSubmitDialog(true)}
                className="bg-gradient-to-r from-[#7323A8] to-[#E50085] hover:from-[#32004F] hover:to-[#7323A8] text-white transition-all"
              >
                <Plus className="h-4 w-4 mr-2" />
                Submit Complaint
              </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">

              {/* NEW Type Filter (Damage Type) - Placed before Category Filter */}
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value)} >
                <SelectTrigger className="w-full sm:w-[130px] border-purple-200 focus:border-[#7323A8] focus:ring-[#7323A8]">
                  <SelectValue placeholder="All Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Individual">Individual</SelectItem>
                  <SelectItem value="Public">Public</SelectItem>
                </SelectContent>
              </Select>

              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value)} >
                <SelectTrigger className="w-full sm:w-[160px] border-purple-200 focus:border-[#7323A8] focus:ring-[#7323A8]">
                  <SelectValue placeholder="All Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Catgeories</SelectItem>
                  <SelectItem value="plumbing">Plumbing</SelectItem>
                  <SelectItem value="electrical">Electrical</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="facilities">Facilities</SelectItem>
                  <SelectItem value="others">Others</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[130px] border-purple-200 focus:border-[#7323A8] focus:ring-[#7323A8]">
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

              {/* Search */}
              <input
                type="text"
                placeholder="Search title or description..."
                onChange={(e) => setSearchQuery(e.target.value)}
                value={searchQuery}
                className="flex-grow border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#7323A8]"
              />

              {/* Sort Button */}
              <Button
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
                variant="outline"
                className="w-full sm:w-[100px] items-center border-[#7323A8] text-[#7323A8]"
              >
                {sortOrder === "asc" ? (
                  <>
                    <ArrowUp className="h-4 w-4 mr-1" /> Oldest
                  </>
                ) : (
                  <>
                    <ArrowDown className="h-4 w-4 mr-1" /> Newest
                  </>
                )}
              </Button>

              {/* Reset Button */}
              <Button
                onClick={resetFilters}
                variant="outline"
                className="border-gray-300 text-gray-600 hover:bg-gray-100"
              >
                Clear Filters
              </Button>
            </div>

            {/* Ticket List Rendering */}
            {loading ? (
              <Card className="bg-white border-0 shadow-sm">
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600">Loading your tickets...</p>
                </CardContent>
              </Card>
            ) : filteredTickets.length === 0 ? (
              <Card className="bg-white border-0 shadow-sm">
                <CardContent className="py-12 text-center">
                  <div className="p-4 bg-gradient-to-br from-[#7323A8]/10 to-[#E50085]/10 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <Ticket className="h-10 w-10 text-[#7323A8]" />
                  </div>
                  <CardTitle className="mb-2 text-[#32004F]">
                    No Complaint found
                  </CardTitle>
                  <CardDescription className="mb-4 text-gray-600">
                    Try adjusting filters or submit a new complaint.
                  </CardDescription>
                  <Button
                    onClick={() => setShowSubmitDialog(true)}
                    className="bg-gradient-to-r from-[#7323A8] to-[#E50085] hover:from-[#32004F] hover:to-[#7323A8] text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Submit Complaint
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <TicketList
                tickets={filteredTickets}
                onUpdate={loadFilteredTickets}
                role="student"
              />
            )}
          </div>

          {/* FAQ Section - Takes 1 column */}
          <div>
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-lg font-semibold text-[#32004F] flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-[#7323A8]" />
                  Frequently Asked Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {faqs.map((faq, index) => (
                    <div
                      key={index}
                      className="border-b border-gray-100 last:border-0 pb-4 last:pb-0"
                    >
                      <button
                        onClick={() =>
                          setExpandedFAQ(expandedFAQ === index ? null : index)
                        }
                        className="w-full text-left flex items-start justify-between gap-2 group"
                      >
                        <span className="font-medium text-[#32004F] group-hover:text-[#7323A8] transition-colors">
                          {faq.question}
                        </span>
                        <ChevronDown
                          className={`h-5 w-5 text-[#7323A8] flex-shrink-0 transition-transform ${expandedFAQ === index ? "rotate-180" : ""
                            }`}
                        />
                      </button>
                      {expandedFAQ === index && (
                        <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                          {faq.answer}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <SubmitComplaintDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        onSuccess={loadTickets}
      />

      <EditProfileDialog
        open={showEditProfileDialog}
        onOpenChange={setShowEditProfileDialog}
        onUpdate={checkAuth}
      />
    </div>
  );
};

export default Dashboard;