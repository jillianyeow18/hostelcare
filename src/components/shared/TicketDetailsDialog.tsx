import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface TicketDetailsDialogProps {
  ticket: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const TicketDetailsDialog = ({
  ticket,
  open,
  onOpenChange,
  onUpdate,
}: TicketDetailsDialogProps) => {
  const { toast } = useToast();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && ticket) {
      loadComments();
    }
  }, [open, ticket]);

  const loadComments = async () => {
    setLoading(true);
    try {
      // First get comments
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select("*")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true });

      if (commentsError) throw commentsError;

      // Then get profile info for each comment creator
      if (commentsData && commentsData.length > 0) {
        const userIds = [...new Set(commentsData.map((c) => c.created_by))];
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, role")
          .in("id", userIds);

        if (profilesError) {
          console.error("Error loading profiles:", profilesError);
        }

        // Merge profile data with comments
        const commentsWithProfiles = commentsData.map((comment) => ({
          ...comment,
          profiles:
            profilesData?.find((p) => p.id === comment.created_by) || null,
        }));

        setComments(commentsWithProfiles);
      } else {
        setComments([]);
      }
    } catch (error: any) {
      console.error("Error loading comments:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      toast({
        title: "Error loading comments",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("comments").insert({
        ticket_id: ticket.id,
        content: newComment.trim(),
        created_by: user.id,
      });

      if (error) throw error;

      toast({
        title: "Comment added",
        description: "Your comment has been posted successfully.",
      });

      setNewComment("");
      loadComments();
      onUpdate();
    } catch (error: any) {
      console.error("Error adding comment:", error);
      toast({
        title: "Failed to add comment",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: {
        label: "Pending",
        className: "bg-[#E50085] hover:bg-[#E50085]/90",
      },
      assigned: {
        label: "Assigned",
        className: "bg-[#7323A8] hover:bg-[#7323A8]/90",
      },
      in_progress: {
        label: "In Progress",
        className: "bg-[#FF5E5B] hover:bg-[#FF5E5B]/90",
      },
      resolved: {
        label: "Resolved",
        className: "bg-[#FFAC93] text-[#32004F] hover:bg-[#FFAC93]/80",
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getUrgencyBadge = (urgency: string) => {
    const urgencyConfig: Record<string, { className: string }> = {
      urgent: { className: "bg-red-500 hover:bg-red-600" },
      high: { className: "bg-orange-500 hover:bg-orange-600" },
      medium: { className: "bg-yellow-500 hover:bg-yellow-600" },
      low: { className: "bg-green-500 hover:bg-green-600" },
    };

    const config = urgencyConfig[urgency] || urgencyConfig.medium;
    return <Badge className={config.className}>{urgency}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-[#32004F]">
            {ticket?.title}
          </DialogTitle>
          <DialogDescription>
            Ticket #{ticket?.id?.slice(0, 8)} • {ticket?.category}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Ticket Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <div className="mt-1">{getStatusBadge(ticket?.status)}</div>
            </div>
            <div>
              <p className="text-sm text-gray-600">Urgency</p>
              <div className="mt-1">{getUrgencyBadge(ticket?.urgency)}</div>
            </div>
            <div>
              <p className="text-sm text-gray-600">Location</p>
              <p className="font-medium text-[#32004F]">{ticket?.location}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Created</p>
              <p className="font-medium text-[#32004F]">
                {ticket?.created_at &&
                  formatDistanceToNow(new Date(ticket.created_at), {
                    addSuffix: true,
                  })}
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="font-semibold text-[#32004F] mb-2">Description</h3>
            <p className="text-gray-700 whitespace-pre-wrap">
              {ticket?.description}
            </p>
          </div>

          {/* Comments Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-[#7323A8]" />
              <h3 className="font-semibold text-[#32004F]">
                Comments & Updates
              </h3>
              <span className="text-sm text-gray-500">({comments.length})</span>
            </div>

            {/* Comments List */}
            <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto">
              {loading ? (
                <p className="text-gray-500 text-center py-4">
                  Loading comments...
                </p>
              ) : comments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`p-4 rounded-lg ${
                      comment.profiles?.role === "staff"
                        ? "bg-gradient-to-br from-purple-50 to-pink-50 border-l-4 border-[#7323A8]"
                        : "bg-gray-50 border-l-4 border-gray-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-white rounded-full">
                        <User className="h-4 w-4 text-[#7323A8]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-[#32004F]">
                            {comment.profiles?.full_name || "Unknown User"}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              comment.profiles?.role === "staff"
                                ? "bg-[#7323A8] text-white border-[#7323A8]"
                                : "bg-gray-200 text-gray-700"
                            }
                          >
                            {comment.profiles?.role === "staff"
                              ? "Staff"
                              : "Student"}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(comment.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment */}
            <div className="space-y-3">
              <Textarea
                placeholder="Add a comment or update..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                className="border-purple-200 focus:border-[#7323A8] focus:ring-[#7323A8]"
              />
              <Button
                onClick={handleSubmitComment}
                disabled={submitting || !newComment.trim()}
                className="bg-gradient-to-r from-[#7323A8] to-[#E50085] hover:from-[#32004F] hover:to-[#7323A8] text-white w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {submitting ? "Posting..." : "Post Comment"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TicketDetailsDialog;
