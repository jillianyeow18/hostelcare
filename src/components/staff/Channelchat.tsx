import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, ArrowLeft, Users, ExternalLink, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import StaffSidebar from "@/components/staff/StaffSidebar";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string | null;
  type: "user" | "bot" | "announcement";
  ticket_id: string | null;
  sender?: {
    full_name: string;
    email: string;
  };
  ticket?: {
    id: string;
    title: string;
    status: string;
    urgency: string;
    assigned_to: string | null;
    assignee?: {
      full_name: string;
    };
  };
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

const ChannelChat = () => {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<ChannelMember[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAuth();
    if (channelId) {
      loadChannelData();
      loadMessages();
      loadMembers();

      // Set up real-time subscription for new messages
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
            loadMessages();
          }
        )
        .subscribe();

      return () => {
        messagesSubscription.unsubscribe();
      };
    }
  }, [channelId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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

  const loadChannelData = async () => {
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
  };

  const loadMessages = async () => {
    try {
      setLoading(true);

      // Get all messages
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

      // Get unique sender IDs
      const senderIds = Array.from(
        new Set(messagesData.map((m) => m.sender_id).filter(Boolean))
      );

      // Get unique ticket IDs
      const ticketIds = Array.from(
        new Set(messagesData.map((m) => m.ticket_id).filter(Boolean))
      );

      // Fetch sender profiles
      let sendersMap: Record<string, { full_name: string; email: string }> = {};
      if (senderIds.length > 0) {
        const { data: sendersData } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", senderIds);

        sendersData?.forEach((sender) => {
          sendersMap[sender.id] = {
            full_name: sender.full_name,
            email: sender.email,
          };
        });
      }

      // Fetch ticket data
      let ticketsMap: Record<string, any> = {};
      if (ticketIds.length > 0) {
        const { data: ticketsData } = await supabase
          .from("tickets")
          .select(`
            id,
            title,
            status,
            urgency,
            assigned_to,
            assignee:profiles!tickets_assigned_to_fkey(full_name)
          `)
          .in("id", ticketIds);

        ticketsData?.forEach((ticket) => {
          ticketsMap[ticket.id] = ticket;
        });
      }

      // Combine messages with sender and ticket data
      const messagesWithData = messagesData.map((msg) => ({
        ...msg,
        sender: msg.sender_id ? sendersMap[msg.sender_id] : undefined,
        ticket: msg.ticket_id ? ticketsMap[msg.ticket_id] : undefined,
      }));

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
  };

  const loadMembers = async () => {
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
      }
    } catch (error: any) {
      console.error("Error loading members:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const { error } = await supabase.from("messages").insert({
        channel_id: channelId,
        content: newMessage.trim(),
        sender_id: profile.id,
        type: "user",
      });

      if (error) throw error;

      setNewMessage("");
    } catch (error: any) {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
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

  const renderTicketCard = (message: Message) => {
    if (!message.ticket) return null;

    const ticket = message.ticket;
    
    // Determine border color based on urgency/status
    let borderColor = "border-l-purple-500";
    if (ticket.status === "resolved") {
      borderColor = "border-l-green-500";
    } else if (ticket.urgency === "urgent" || ticket.urgency === "critical") {
      borderColor = "border-l-red-500";
    }

    return (
      <div
        className={`mt-2 p-3 bg-white border-l-4 ${borderColor} rounded-md border border-gray-200 hover:shadow-md transition-shadow cursor-pointer`}
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/staff`);
        }}
      >
        {/* First line: HC-2: Water Leakage */}
        <div className="mb-2">
          <span className="text-sm font-medium text-gray-900">
            HC-{ticket.id.slice(0, 1)}: {ticket.title}
          </span>
        </div>

        {/* Second line: Status: X  Assignee: Y  Priority: Z */}
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <div>
            <span className="font-normal">Status:</span>{" "}
            <span className="font-medium capitalize">
              {ticket.status === "in_progress" ? "In Progress" : ticket.status}
            </span>
          </div>
          <div>
            <span className="font-normal">Assignee:</span>{" "}
            <span className="font-medium">
              {ticket.assignee ? ticket.assignee.full_name : "Unassigned"}
            </span>
          </div>
          <div>
            <span className="font-normal">Priority:</span>{" "}
            <span className="font-medium capitalize">{ticket.urgency}</span>
          </div>
        </div>
      </div>
    );
  };

  // Format message content with mentions and emphasis
  const formatMessageContent = (content: string) => {
    // Replace @mentions with styled spans (blue like Discord)
    let formatted = content.replace(
      /@(\w+)/g,
      '<span class="text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">@$1</span>'
    );

    // Replace status words with colored badges
    // Pending - Grey
    formatted = formatted.replace(
      /\b(pending)\b/gi,
      '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800">$1</span>'
    );

    // Assigned
    formatted = formatted.replace(
      /\b(assigned)\b/gi,
      '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800">$1</span>'
    );

    // In Progress / in_progress
    formatted = formatted.replace(
      /\b(in_progress|In Progress)\b/gi,
      '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-800">In Progress</span>'
    );

    // Resolved
    formatted = formatted.replace(
      /\b(resolved)\b/gi,
      '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">$1</span>'
    );

    // Escalated
    formatted = formatted.replace(
      /\b(escalated)\b/gi,
      '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800">$1</span>'
    );

    // Action words (transitioned) - orange with bold
    formatted = formatted.replace(
      /\b(transitioned)\b/gi,
      '<span class="font-bold text-orange-600">$1</span>'
    );

    return formatted;
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      pending: { label: "Pending", className: "bg-[#E50085] text-white" },
      assigned: { label: "Assigned", className: "bg-[#7323A8] text-white" },
      in_progress: { label: "In Progress", className: "bg-[#FF5E5B] text-white" },
      resolved: { label: "Resolved", className: "bg-[#FFAC93] text-[#32004F]" },
    };
    const config = configs[status] || configs.pending;
    return (
      <Badge className={`${config.className} text-xs`}>{config.label}</Badge>
    );
  };

  const getUrgencyBadge = (urgency: string) => {
    const configs: Record<string, string> = {
      urgent: "bg-red-500 text-white",
      high: "bg-orange-500 text-white",
      medium: "bg-yellow-500 text-white",
      low: "bg-green-500 text-white",
    };
    return (
      <Badge className={`${configs[urgency] || configs.medium} text-xs`}>
        {urgency}
      </Badge>
    );
  };



  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 w-full">
        <StaffSidebar
          profile={profile}
          staffCategory={profile?.staff_category}
        />

        <SidebarInset className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <div className="border-b bg-white px-4 sm:px-6 lg:px-8 py-3 sm:py-4 shadow-sm shrink-0">
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
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#32004F] to-[#7323A8] bg-clip-text text-transparent">
                    #{channel?.name || "Channel"}
                  </h1>
                  <Badge
                    variant="secondary"
                    className="capitalize bg-[#FFAC93] text-[#32004F] hover:bg-[#FFAC93]/80"
                  >
                    {channel?.staff_category}
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mt-1 flex items-center gap-2">
                  <Users className="h-3 w-3" />
                  {members.length} members
                </p>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto bg-gradient-to-br from-purple-50/30 via-pink-50/30 to-orange-50/30">
            <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-1">
              {loading ? (
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
                messages.map((message) => {
                  const isBot = message.type === "bot" || message.type === "announcement";

                  return (
                    <div
                      key={message.id}
                      className="flex gap-3 hover:bg-white/50 -mx-4 px-4 py-2 rounded transition-colors"
                    >
                      <Avatar className="h-10 w-10 shrink-0 mt-1">
                        <AvatarFallback
                          className={
                            isBot
                              ? "bg-[#7323A8] text-white"
                              : "bg-gradient-to-br from-purple-500 to-pink-500 text-white font-semibold"
                          }
                        >
                          {isBot ? (
                            <Bell className="h-5 w-5" />
                          ) : (
                            message.sender?.full_name?.charAt(0)?.toUpperCase() ||
                            "?"
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900">
                            {isBot
                              ? "HostelCare"
                              : message.sender?.full_name || "Unknown"}
                          </span>
                          {isBot && (
                            <span className="text-xs text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">
                              BOT
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(message.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        <div
                          className="text-sm text-gray-800 whitespace-pre-wrap break-words"
                          dangerouslySetInnerHTML={{
                            __html: formatMessageContent(message.content),
                          }}
                        />
                        {renderTicketCard(message)}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Message Input */}
          <div className="border-t bg-white p-4 sm:p-6 shrink-0">
            <div className="max-w-5xl mx-auto w-full">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`Message #${channel?.name || 'channel'}`}
                  className="flex-1 border-purple-200 focus:border-[#7323A8] focus:ring-[#7323A8]"
                  disabled={sending}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="bg-gradient-to-r from-[#7323A8] to-[#E50085] hover:from-[#32004F] hover:to-[#7323A8] shrink-0"
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