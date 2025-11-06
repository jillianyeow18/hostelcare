import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, ArrowLeft, Users, Ticket, Clock, User, Eye, Filter, ChevronDown, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import StaffSidebar from "@/components/staff/StaffSidebar";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { formatDistanceToNow } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// --- INTERFACES ---
interface SenderData {
  full_name: string;
  email: string;
}

interface TicketData {
  id: string;
  title: string;
  status: string;
  urgency: string;
  assigned_to: string | null;
  assignee?: {
    full_name: string;
  };
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string | null;
  type: "user" | "bot" | "announcement";
  ticket_id: string | null;
  sender?: SenderData;
  ticket?: TicketData;
}

interface Channel {
  id: string;
  name: string;
  staff_category: string;
}

interface ChannelMember {
  id: string;
  full_name: string;
  email: string;
}

interface TicketGroup {
  ticketId: string;
  ticket: TicketData;
  activities: Message[];
  lastActivity: string;
  isEscalated: boolean;
  isExpanded: boolean;
}

// --- CONSTANTS ---
const TICKETS_PER_PAGE = 10;
const ACTIVITIES_PREVIEW_COUNT = 2;

// --- HELPER FUNCTIONS ---
const fetchSingleMessageData = async (message: Omit<Message, 'sender' | 'ticket'>): Promise<Message> => {
    let enrichedMessage: Message = message as Message;

    if (message.sender_id) {
        const { data: senderData } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", message.sender_id)
            .single();
        if (senderData) {
            enrichedMessage.sender = senderData as SenderData;
        }
    }

    if (message.ticket_id) {
        const { data: ticketData } = await supabase
            .from("tickets")
            .select(`
                id,
                title,
                status,
                urgency,
                assigned_to,
                assignee:profiles!tickets_assigned_to_fkey(full_name)
            `)
            .eq("id", message.ticket_id)
            .single();
        if (ticketData) {
            enrichedMessage.ticket = ticketData as TicketData;
        }
    }

    return enrichedMessage;
};

const isTicketEscalated = (activities: Message[]) => {
  return activities.some(activity => 
    activity.content.toLowerCase().includes('escalation') || 
    activity.content.includes('🚨') ||
    activity.content.toLowerCase().includes('urgent')
  );
};


const ChannelChat = () => {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // --- STATE ---
  const [profile, setProfile] = useState<any>(null);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<ChannelMember[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  // Ticket filtering & pagination
  const [ticketFilter, setTicketFilter] = useState<"all" | "escalated" | "active" | "resolved">("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedTickets, setExpandedTickets] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // --- AUTH & DATA LOADING ---
  const checkAuth = useCallback(async () => {
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
  }, [navigate]);

  const loadChannelData = useCallback(async () => {
    if (!channelId) return;
    try {
      const { data, error } = await supabase
        .from("channels")
        .select("id, name, staff_category")
        .eq("id", channelId)
        .single();

      if (error) throw error;
      setChannel(data);
    } catch (error: any) {
      toast({
        title: "Error loading channel",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [channelId, toast]);

  const loadMembers = useCallback(async () => {
    if (!channelId) return;
    try {
      const { data: memberLinks, error: memberError } = await supabase
        .from("channel_members")
        .select("user_id")
        .eq("channel_id", channelId);

      if (memberError) throw memberError;

      const userIds = memberLinks?.map((m) => m.user_id) || [];

      if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        if (profileError) throw profileError;
        setMembers(profiles || []);
      } else {
        setMembers([]);
      }
    } catch (error: any) {
      console.error("Error loading members:", error);
    }
  }, [channelId]);

  const loadMessages = useCallback(async () => {
    if (!channelId) return;

    try {
      setLoading(true);

      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;

      if (!messagesData || messagesData.length === 0) {
        setMessages([]);
        setLoading(false);
        return;
      }

      const messagePromises = messagesData.map(msg => fetchSingleMessageData(msg as Omit<Message, 'sender' | 'ticket'>));
      const messagesWithData = await Promise.all(messagePromises);

      setMessages(messagesWithData);
    } catch (error: any) {
      toast({
        title: "Error loading messages",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [channelId, toast]);

  // --- EFFECTS ---
  useEffect(() => {
    checkAuth();
    if (channelId) {
      loadChannelData();
      loadMessages();
      loadMembers();

      const messagesSubscription = supabase
        .channel(`channel-${channelId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `channel_id=eq.${channelId}`,
          },
          (payload) => {
            const newMessageRaw = payload.new as Omit<Message, 'sender' | 'ticket'>;

            if (newMessageRaw.sender_id === profile?.id) {
                return;
            }

            fetchSingleMessageData(newMessageRaw)
              .then(enrichedMessage => {
                setMessages((prevMessages) => [...prevMessages, enrichedMessage]);
                
                // Show toast for escalated tickets
                if (enrichedMessage.ticket_id && isTicketEscalated([enrichedMessage])) {
                  toast({
                    title: "🚨 Escalated Ticket Alert",
                    description: `Ticket requires immediate attention!`,
                    variant: "destructive",
                  });
                }
              })
              .catch(err => {
                console.error("Error enriching new message:", err);
              });
          }
        )
        .subscribe();

      return () => {
        messagesSubscription.unsubscribe();
      };
    }
  }, [channelId, checkAuth, loadMessages, loadMembers, loadChannelData, profile?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- MESSAGE SENDING ---
  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    const contentToSend = newMessage.trim();
    setSending(true);
    setNewMessage("");

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      content: contentToSend,
      created_at: new Date().toISOString(),
      sender_id: profile.id,
      type: "user",
      ticket_id: null,
      sender: { full_name: profile.full_name, email: profile.email },
      ticket: undefined,
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    scrollToBottom();

    try {
      const { error, data } = await supabase.from("messages").insert({
        channel_id: channelId,
        content: contentToSend,
        sender_id: profile.id,
        type: "user",
      }).select().single();

      if (error) throw error;

      const realMessage = data as Message;
      const enrichedRealMessage: Message = {
        ...realMessage,
        sender: optimisticMessage.sender,
      };

      setMessages((prev) => 
        prev.map((msg) => (msg.id === tempId ? enrichedRealMessage : msg))
      );

    } catch (error: any) {
      toast({
        title: "Error sending message",
        description: `Failed to send. ${error.message}`,
        variant: "destructive",
      });
      setMessages((prev) => prev.filter(msg => msg.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // --- TICKET PROCESSING WITH MEMOIZATION ---
  const ticketActivityGroups = useMemo(() => {
    const ticketMap = new Map<string, TicketGroup>();
    
    messages.forEach((message) => {
      if (message.ticket_id && (message.type === "bot" || message.type === "announcement")) {
        if (!ticketMap.has(message.ticket_id)) {
          ticketMap.set(message.ticket_id, {
            ticketId: message.ticket_id,
            ticket: message.ticket!,
            activities: [],
            lastActivity: message.created_at,
            isEscalated: false,
            isExpanded: expandedTickets.has(message.ticket_id),
          });
        }
        const group = ticketMap.get(message.ticket_id)!;
        group.activities.push(message);
        if (new Date(message.created_at) > new Date(group.lastActivity)) {
          group.lastActivity = message.created_at;
        }
      }
    });

    // Calculate escalation status
    ticketMap.forEach((group) => {
      group.isEscalated = isTicketEscalated(group.activities);
    });

    return Array.from(ticketMap.values()).sort((a, b) => {
      // Escalated tickets first
      if (a.isEscalated && !b.isEscalated) return -1;
      if (!a.isEscalated && b.isEscalated) return 1;
      // Then by last activity
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
    });
  }, [messages, expandedTickets]);

  // --- FILTERED & PAGINATED TICKETS ---
  const filteredTickets = useMemo(() => {
    let filtered = ticketActivityGroups;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(group =>
        group.ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.ticket.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (ticketFilter === "escalated") {
      filtered = filtered.filter(g => g.isEscalated);
    } else if (ticketFilter === "active") {
      filtered = filtered.filter(g => 
        g.ticket.status !== "resolved" && g.ticket.status !== "closed"
      );
    } else if (ticketFilter === "resolved") {
      filtered = filtered.filter(g => 
        g.ticket.status === "resolved" || g.ticket.status === "closed"
      );
    }

    // Urgency filter
    if (urgencyFilter !== "all") {
      filtered = filtered.filter(g => g.ticket.urgency === urgencyFilter);
    }

    return filtered;
  }, [ticketActivityGroups, ticketFilter, urgencyFilter, searchQuery]);

  const paginatedTickets = useMemo(() => {
    const startIndex = (currentPage - 1) * TICKETS_PER_PAGE;
    const endIndex = startIndex + TICKETS_PER_PAGE;
    return filteredTickets.slice(startIndex, endIndex);
  }, [filteredTickets, currentPage]);

  const totalPages = Math.ceil(filteredTickets.length / TICKETS_PER_PAGE);

  const regularMessages = useMemo(() => {
    return messages.filter(
      (message) => !message.ticket_id || message.type === "user"
    );
  }, [messages]);

  // --- TICKET STATS ---
  const ticketStats = useMemo(() => {
    const stats = {
      total: ticketActivityGroups.length,
      escalated: ticketActivityGroups.filter(g => g.isEscalated).length,
      active: ticketActivityGroups.filter(g => 
        g.ticket.status !== "resolved" && g.ticket.status !== "closed"
      ).length,
      resolved: ticketActivityGroups.filter(g => 
        g.ticket.status === "resolved" || g.ticket.status === "closed"
      ).length,
    };
    return stats;
  }, [ticketActivityGroups]);

  // --- TOGGLE TICKET EXPANSION ---
  const toggleTicketExpansion = (ticketId: string) => {
    setExpandedTickets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ticketId)) {
        newSet.delete(ticketId);
      } else {
        newSet.add(ticketId);
      }
      return newSet;
    });
  };

  // --- UI HELPERS ---
  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      pending: { label: "Pending", className: "bg-gray-100 text-gray-800" },
      assigned: { label: "Assigned", className: "bg-purple-100 text-purple-800" },
      in_progress: { label: "In Progress", className: "bg-orange-100 text-orange-800" },
      resolved: { label: "Resolved", className: "bg-green-100 text-green-800" },
      closed: { label: "Closed", className: "bg-gray-100 text-gray-600" },
    };
    const config = configs[status] || configs.pending;
    return (
      <Badge variant="secondary" className={`${config.className} text-xs`}>
        {config.label}
      </Badge>
    );
  };

  const getUrgencyBadge = (urgency: string) => {
    const configs: Record<string, string> = {
      urgent: "bg-red-100 text-red-800",
      high: "bg-orange-100 text-orange-800",
      medium: "bg-yellow-100 text-yellow-800",
      low: "bg-green-100 text-green-800",
    };
    return (
      <Badge variant="secondary" className={`${configs[urgency] || configs.medium} text-xs`}>
        {urgency}
      </Badge>
    );
  };

  const formatActivityContent = (content: string) => {
    return content.replace(
      /@(\w+)/g,
      '<span class="text-blue-600 font-medium">@$1</span>'
    );
  };

  // --- RENDER TICKET GROUP (COLLAPSIBLE) ---
  const renderTicketActivityGroup = (group: TicketGroup) => {
    const { ticket, activities, isEscalated } = group;
    const latestActivity = activities[activities.length - 1];
    const isExpanded = expandedTickets.has(group.ticketId);

    if (!ticket) return null;

    const activitiesToShow = isExpanded ? activities : activities.slice(-ACTIVITIES_PREVIEW_COUNT);

    return (
      <Collapsible
        key={group.ticketId}
        open={isExpanded}
        onOpenChange={() => toggleTicketExpansion(group.ticketId)}
      >
        <div 
          className={`rounded-lg p-4 mb-3 shadow-sm transition-all duration-200 ${
            isEscalated 
              ? 'bg-red-50 border-2 border-red-500' 
              : 'bg-white border border-gray-200'
          } hover:shadow-md`}
        >
          {/* Compact Header */}
          <div className="flex gap-3">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className={`${
                isEscalated 
                  ? 'bg-red-100 text-red-700' 
                  : 'bg-blue-100 text-blue-600'
              }`}>
                <Ticket className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              {/* Escalation Banner (Collapsed State) */}
              {isEscalated && !isExpanded && (
                <div className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold mb-2 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  ESCALATED
                </div>
              )}

              {/* Ticket Info */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-sm mb-1 truncate ${
                    isEscalated ? 'text-red-700' : 'text-gray-900'
                  }`}>
                    Ticket #{ticket.id.substring(0, 8)} - {ticket.title}
                  </h3>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {getStatusBadge(ticket.status)}
                    {getUrgencyBadge(ticket.urgency)}
                  </div>
                </div>
                
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="shrink-0 h-8 w-8 p-0">
                    <ChevronDown className={`h-4 w-4 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`} />
                  </Button>
                </CollapsibleTrigger>
              </div>

              {/* Preview (Collapsed) */}
              {!isExpanded && (
                <div className="mt-2 text-xs text-gray-600 flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>{formatDistanceToNow(new Date(latestActivity.created_at), { addSuffix: true })}</span>
                  <span className="text-gray-400">•</span>
                  <span>{activities.length} updates</span>
                </div>
              )}
            </div>
          </div>

          {/* Expanded Content */}
          <CollapsibleContent>
            <div className="mt-3 pl-12 space-y-2">

              {/* Assignee */}
              <div className="flex items-center gap-2 text-xs text-gray-600 pb-2 border-b">
                <User className="h-3 w-3" />
                <span>Assigned to:</span>
                <span className="font-semibold">
                  {ticket.assignee ? ticket.assignee.full_name : "Unassigned"}
                </span>
              </div>

              {/* Activities */}
              <div className="space-y-2">
                {activitiesToShow.map((activity: Message) => {
                  const isEscalationMsg = activity.content.toLowerCase().includes('escalation') || 
                                         activity.content.includes('🚨');
                  
                  return (
                    <div 
                      key={activity.id} 
                      className={`text-xs rounded p-2 ${
                        isEscalationMsg 
                          ? 'bg-red-100 border-l-2 border-red-600 font-semibold text-red-900' 
                          : 'bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div 
                          className="flex-1"
                          dangerouslySetInnerHTML={{
                            __html: formatActivityContent(activity.content),
                          }}
                        />
                        <span className="text-gray-500 shrink-0 text-[10px]">
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  };

  const renderRegularMessage = (message: Message) => {
    const isBot = message.type === "bot" || message.type === "announcement";
    const senderName = isBot ? "HostelCare" : message.sender?.full_name || "Unknown";
    const senderInitials = isBot ? "HC" : message.sender?.full_name?.charAt(0)?.toUpperCase() || "?";

    return (
      <div
        key={message.id}
        className="flex gap-3 hover:bg-white/50 -mx-4 px-4 py-3 rounded-lg transition-colors"
      >
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback
            className={
              isBot
                ? "bg-blue-100 text-blue-600"
                : "bg-gradient-to-br from-purple-500 to-pink-500 text-white font-medium"
            }
          >
            {senderInitials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-sm font-semibold text-gray-900">
              {senderName}
            </span>
            {isBot && (
              <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                BOT
              </span>
            )}
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(message.created_at), {
                addSuffix: true,
              })}
            </span>
          </div>
          <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>
      </div>
    );
  };

  // --- JSX RETURN ---
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-gray-50 w-full">
        <StaffSidebar
          profile={profile}
          staffCategory={profile?.staff_category}
        />

        <SidebarInset className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <div className="border-b bg-white px-6 py-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/staff")}
                  className="shrink-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-gray-900">
                      #{channel?.name || "Channel"}
                    </h1>
                    <Badge
                      variant="secondary"
                      className="capitalize bg-blue-100 text-blue-800"
                    >
                      {channel?.staff_category}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {members.length} members
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Ticket Stats & Filters */}
          {ticketActivityGroups.length > 0 && (
            <div className="border-b bg-white px-6 py-3">
              {/* Stats Row */}
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-2 text-sm">
                  <Ticket className="h-4 w-4 text-gray-500" />
                  <span className="font-semibold">{ticketStats.total}</span>
                  <span className="text-gray-600">Total</span>
                </div>
                {ticketStats.escalated > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="font-semibold text-red-600">{ticketStats.escalated}</span>
                    <span className="text-gray-600">Escalated</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="font-semibold">{ticketStats.active}</span>
                  <span className="text-gray-600">Active</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-semibold">{ticketStats.resolved}</span>
                  <span className="text-gray-600">Resolved</span>
                </div>
              </div>

              {/* Filters Row */}
              <div className="flex items-center gap-3 flex-wrap">
                <Input
                  placeholder="Search tickets..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="max-w-xs h-9 text-sm"
                />
                
                <Select value={ticketFilter} onValueChange={(value: any) => {
                  setTicketFilter(value);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-[140px] h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tickets</SelectItem>
                    <SelectItem value="escalated">Escalated</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={urgencyFilter} onValueChange={(value) => {
                  setUrgencyFilter(value);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-[130px] h-9 text-sm">
                    <SelectValue placeholder="Urgency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Urgency</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>

                <div className="ml-auto text-xs text-gray-600">
                  Showing {paginatedTickets.length} of {filteredTickets.length}
                </div>
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto p-6">
              {loading && messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-2">No messages yet</p>
                  <p className="text-sm text-gray-400">
                    Be the first to send a message in this channel
                  </p>
                </div>
              ) : (
                <>
                  {/* Ticket Activity Groups (Paginated) */}
                  {paginatedTickets.map(renderTicketActivityGroup)}
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 my-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-gray-600">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                  
                  {/* Regular Messages */}
                  <div className="space-y-1 mt-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 px-4">Discussion</h3>
                    {regularMessages.map(renderRegularMessage)}
                  </div>
                </>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Message Input */}
          <div className="border-t bg-white p-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-3">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`Message #${channel?.name || 'channel'}`}
                  className="flex-1"
                  disabled={sending}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="bg-blue-600 hover:bg-blue-700 shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default ChannelChat;