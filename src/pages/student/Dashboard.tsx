import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Plus,
  LogOut,
  Ticket,
  Clock,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  UserPen,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SubmitComplaintDialog from "@/components/student/SubmitComplaintDialog";
import TicketList from "@/components/shared/TicketList";
import EditProfileDialog from "@/components/shared/EditProfileDialog";
import logo from "@/assets/hostelcare-logo.png";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showEditProfileDialog, setShowEditProfileDialog] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  useEffect(() => {
    checkAuth();
    loadData();
  }, []);

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

    if (profileData?.role !== "student") {
      navigate("/staff");
      return;
    }

    setProfile(profileData);
  };

  const loadData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
    open: tickets.filter((t) =>
      ["pending", "assigned", "in_progress"].includes(t.status)
    ).length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
    total: tickets.length,
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
        "Once submitted, complaints cannot be edited to maintain record integrity. However, you can add comments or additional information through the ticket details page. If you need to make significant changes, please contact the maintenance office.",
    },
    {
      question: "How will I know when my issue is resolved?",
      answer:
        "You'll receive notifications when your ticket status changes. Once marked as resolved, you'll be notified and can view the resolution details in your ticket history.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 select-none">
      {/* Header */}
      <header className="border-b bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-10">
              <img src={logo} alt="HostelCare" className="h-12 sm:h-15" />
              <div>
                <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-[#32004F] to-[#7323A8] bg-clip-text text-transparent">
                  HostelCare
                </h1>
                <p className="text-xs sm:text-sm text-gray-600">
                  Student Portal
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="outline"
                onClick={() => setShowEditProfileDialog(true)}
                className="border-[#7323A8] text-[#7323A8] hover:bg-[#7323A8] hover:text-white transition-colors"
                size="sm"
              >
                <UserPen className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Edit Profile</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="border-[#7323A8] text-[#7323A8] hover:bg-[#7323A8] hover:text-white transition-colors"
                size="sm"
              >
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8 select-none">
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#32004F] to-[#7323A8] bg-clip-text text-transparent mb-2">
            Welcome back, {profile?.full_name}!
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            {profile?.desasiswa && `${profile.desasiswa} • `}
            {profile?.room_number && `Room ${profile.room_number}`}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-all hover:scale-105">
            <CardContent className="p-6 flex items-start gap-8 select-none">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-[#E50085]/10 to-[#E50085]/20 rounded-lg">
                  <Clock className="h-6 w-6 text-[#E50085]" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-[#32004F]">
                  {stats.open}
                </p>
                <p className="text-sm text-gray-600">Open Tickets</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-all hover:scale-105">
            <CardContent className="p-6 flex items-start gap-8 select-none">
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

          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-all hover:scale-105">
            <CardContent className="p-6 flex items-start gap-8 select-none">
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
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* My Tickets Section - Takes 2 columns */}
          <div className="lg:col-span-2 select-none">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold text-[#32004F]">
                My Tickets
              </h3>
              <Button
                onClick={() => setShowSubmitDialog(true)}
                className="bg-gradient-to-r from-[#7323A8] to-[#E50085] hover:from-[#32004F] hover:to-[#7323A8] text-white transition-all"
              >
                <Plus className="h-4 w-4 mr-2" />
                Submit Complaint
              </Button>
            </div>

            {loading ? (
              <Card className="bg-white border-0 shadow-sm">
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600">Loading your tickets...</p>
                </CardContent>
              </Card>
            ) : tickets.length === 0 ? (
              <Card className="bg-white border-0 shadow-sm">
                <CardContent className="py-12 text-center">
                  <div className="p-4 bg-gradient-to-br from-[#7323A8]/10 to-[#E50085]/10 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <Ticket className="h-10 w-10 text-[#7323A8]" />
                  </div>
                  <CardTitle className="mb-2 text-[#32004F]">
                    No tickets yet
                  </CardTitle>
                  <CardDescription className="mb-4 text-gray-600">
                    Submit your first maintenance complaint to get started
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
                tickets={tickets}
                onUpdate={loadData}
                role="student"
              />
            )}
          </div>

          {/* FAQ Section - Takes 1 column */}
          <div>
            <Card className="bg-white border-0 shadow-sm select-none mt-[50px]">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-lg font-semibold text-[#32004F] flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-[#7323A8]" />
                  Frequently Asked Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4 max-h-[600px] overflow-y-auto overflow-x-hidden">
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
                          className={`h-5 w-5 text-[#7323A8] flex-shrink-0 transition-transform ${
                            expandedFAQ === index ? "rotate-180" : ""
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
        onSuccess={loadData}
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