import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Send, Ticket, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface DiscussionPanelProps {
  channelId: string;
  channelName: string;
  currentUserId: string;
}

const DiscussionPanel = ({ channelId, channelName, currentUserId }: DiscussionPanelProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    const cleanup = setupRealtimeSubscription();
    return cleanup;
  }, [channelId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("discussion_messages")
        .select(`
          *,
          profiles:author_id (
            full_name,
            role
          ),
          tickets (
            title
          )
        `)
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading messages",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`discussion-${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "discussion_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          // Fetch the complete message with profile data
          const { data } = await supabase
            .from("discussion_messages")
            .select(`
              *,
              profiles:author_id (
                full_name,
                role
              ),
              tickets (
                title
              )
            `)
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => [...prev, data]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || loading) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("discussion_messages").insert({
        channel_id: channelId,
        author_id: currentUserId,
        content: newMessage.trim(),
        type: "user",
      });

      if (error) throw error;
      setNewMessage("");
    } catch (error: any) {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderMessageContent = (content: string) => {
    // Parse markdown-style bold text
    const parts = content.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const isEscalation = (content: string) => {
    return content.includes("🚨") || content.includes("Critical Escalation");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Channel Header */}
      <div className="border-b p-4 bg-card">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          # {channelName}
        </h2>
        <p className="text-sm text-muted-foreground">
          Team discussion and ticket coordination
        </p>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isSystem = message.type === "system";
              const isEscalationMsg = isSystem && isEscalation(message.content);

              if (isSystem) {
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "rounded-lg border-l-4 p-4 my-3",
                      isEscalationMsg
                        ? "bg-destructive/10 border-destructive"
                        : "bg-primary/10 border-primary"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className={cn(
                          "text-xs",
                          isEscalationMsg ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
                        )}>
                          {isEscalationMsg ? <AlertTriangle className="h-4 w-4" /> : "HC"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="font-semibold text-sm">
                            HostelCare
                          </span>
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            APP
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(message.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        <div className={cn(
                          "text-sm whitespace-pre-wrap",
                          isEscalationMsg ? "text-destructive-foreground" : ""
                        )}>
                          {renderMessageContent(message.content)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={message.id} className="flex gap-3">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {message.profiles?.full_name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-semibold text-sm">
                        {message.profiles?.full_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(message.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <div className="text-sm">
                      <p className="text-foreground whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="border-t p-4 bg-card">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            placeholder={`Message #${channelName}...`}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" disabled={loading || !newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default DiscussionPanel;
