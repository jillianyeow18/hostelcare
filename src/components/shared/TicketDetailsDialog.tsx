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
import { MessageSquare, Send, User, Star, ThumbsUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [userRole, setUserRole] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [localStatus, setLocalStatus] = useState(ticket?.status);
  
  // Rating and feedback states
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [existingFeedback, setExistingFeedback] = useState<any>(null);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  useEffect(() => {
    if (open && ticket) {
      loadComments();
      loadUserRole();
      setLocalStatus(ticket?.status);
    }
  }, [open, ticket]);

  // Load feedback when ticket is resolved and userRole is determined
  useEffect(() => {
    if (open && ticket && ticket.status === "resolved" && userRole) {
      loadFeedback();
    }
  }, [open, ticket, ticket?.status, userRole]);

  const loadUserRole = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    setUserRole(profile?.role || null);
  };

  const loadFeedback = async () => {
    setLoadingFeedback(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("ticket_feedback")
        .select("*, profiles(full_name, role)")
        .eq("ticket_id", ticket.id);

      // For students, only load their own feedback
      // For staff, load any feedback for this ticket
      if (userRole === "student") {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query.maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      setExistingFeedback(data);
    } catch (error: any) {
      console.error("Error loading feedback:", error);
      toast({
        title: "Error loading feedback",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingFeedback(false);
    }
  };

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
        const userIds = [
          ...new Set(
            commentsData.map((c) => (c as any).created_by).filter(Boolean)
          ),
        ];
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
            profilesData?.find((p) => p.id === (comment as any).created_by) ||
            null,
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

  const handleSubmitFeedback = async () => {
    if (rating === 0) {
      toast({
        title: "Rating required",
        description: "Please select a rating before submitting.",
        variant: "destructive",
      });
      return;
    }

    setSubmittingFeedback(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("ticket_feedback").insert({
        ticket_id: ticket.id,
        user_id: user.id,
        rating: rating,
        feedback: feedback.trim() || null,
      });

      if (error) throw error;

      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback!",
      });

      // Reload feedback to show the submitted one
      await loadFeedback();
      
      // Reset form
      setRating(0);
      setFeedback("");
      
      onUpdate();
    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Failed to submit feedback",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmittingFeedback(false);
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

  const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(true);
    setLocalStatus(newStatus);
    try {
      const updateData: any = {
        status: newStatus,
      };

      // If status is being set to resolved, add resolved_at timestamp
      if (newStatus === "resolved") {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("tickets")
        .update(updateData)
        .eq("id", ticket.id);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `Ticket status changed to ${newStatus.replace("_", " ")}`,
      });

      onUpdate(); // Refresh the ticket data
      
      // If changed to resolved, load feedback section
      if (newStatus === "resolved") {
        loadFeedback();
      }
    } catch (error: any) {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const renderStars = (isInteractive: boolean = true, displayRating?: number) => {
    const ratingToUse = displayRating !== undefined ? displayRating : rating;
    
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!isInteractive}
            onClick={() => isInteractive && setRating(star)}
            onMouseEnter={() => isInteractive && setHoveredRating(star)}
            onMouseLeave={() => isInteractive && setHoveredRating(0)}
            className={`transition-all ${
              isInteractive ? "cursor-pointer hover:scale-110" : "cursor-default"
            }`}
          >
            <Star
              className={`h-8 w-8 ${
                star <= (isInteractive ? (hoveredRating || ratingToUse) : ratingToUse)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const renderFeedbackSection = () => {
    // Only show for resolved tickets
    if (ticket?.status !== "resolved") return null;

    // Don't show anything if user role not loaded yet
    if (!userRole) return null;

    // For staff: only show if feedback exists (read-only view)
    if (userRole === "staff") {
      if (!existingFeedback && !loadingFeedback) return null;
      
      return (
        <div className="border-t pt-6">
          <div className="flex items-center gap-2 mb-4">
            <ThumbsUp className="h-5 w-5 text-[#7323A8]" />
            <h3 className="font-semibold text-[#32004F]">Student Feedback</h3>
          </div>

          {loadingFeedback ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading feedback...</p>
            </div>
          ) : existingFeedback ? (
            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-6 border-2 border-green-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Rating</p>
                  {renderStars(false, existingFeedback.rating)}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-1">
                    Submitted by: {existingFeedback.profiles?.full_name || "Unknown"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(existingFeedback.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
              
              {existingFeedback.feedback && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Feedback</p>
                  <p className="text-gray-700 whitespace-pre-wrap bg-white p-4 rounded-md">
                    {existingFeedback.feedback}
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      );
    }

    // For students: show form or their submitted feedback
    if (userRole === "student") {
      return (
        <div className="border-t pt-6">
          <div className="flex items-center gap-2 mb-4">
            <ThumbsUp className="h-5 w-5 text-[#7323A8]" />
            <h3 className="font-semibold text-[#32004F]">Resolution Feedback</h3>
          </div>

          {loadingFeedback ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading feedback...</p>
            </div>
          ) : existingFeedback ? (
            // Display existing feedback (read-only)
            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-6 border-2 border-green-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Your Rating</p>
                  {renderStars(false, existingFeedback.rating)}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    Submitted{" "}
                    {formatDistanceToNow(new Date(existingFeedback.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
              
              {existingFeedback.feedback && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Your Feedback</p>
                  <p className="text-gray-700 whitespace-pre-wrap bg-white p-4 rounded-md">
                    {existingFeedback.feedback}
                  </p>
                </div>
              )}
              
              <div className="mt-4 flex items-center gap-2 text-green-600">
                <ThumbsUp className="h-4 w-4" />
                <span className="text-sm font-medium">Thank you for your feedback!</span>
              </div>
            </div>
          ) : (
            // Feedback submission form (one-time only)
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border-2 border-purple-200">
              <p className="text-gray-700 mb-4">
                This ticket has been resolved. Please rate your experience and provide feedback to help us improve our service.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#32004F] mb-2">
                    How satisfied are you with the resolution? *
                  </label>
                  {renderStars(true)}
                  {rating > 0 && (
                    <p className="text-sm text-gray-600 mt-2">
                      {rating === 1 && "Very Dissatisfied"}
                      {rating === 2 && "Dissatisfied"}
                      {rating === 3 && "Neutral"}
                      {rating === 4 && "Satisfied"}
                      {rating === 5 && "Very Satisfied"}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="feedback-text"
                    className="block text-sm font-medium text-[#32004F] mb-2"
                  >
                    Additional Comments (Optional)
                  </label>
                  <Textarea
                    id="feedback-text"
                    placeholder="Share your experience, suggestions, or any additional thoughts..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={4}
                    className="border-purple-200 focus:border-[#7323A8] focus:ring-[#7323A8]"
                  />
                </div>

                <Button
                  onClick={handleSubmitFeedback}
                  disabled={submittingFeedback || rating === 0}
                  className="bg-gradient-to-r from-[#7323A8] to-[#E50085] hover:from-[#32004F] hover:to-[#7323A8] text-white w-full"
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  {submittingFeedback ? "Submitting..." : "Submit Feedback"}
                </Button>
              </div>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  if (!ticket) {
}

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
              <p className="text-sm text-gray-600 mb-2">Status</p>
              {userRole === "staff" ? (
                <Select
                  value={localStatus}
                  onValueChange={handleStatusChange}
                  disabled={updatingStatus}
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending"disabled={ticket.status === "in_progress" ||ticket.status === "resolved" } > Pending </SelectItem>
                    <SelectItem value="assigned" disabled={ ticket.status === "in_progress" || ticket.status === "resolved"  } > Assigned </SelectItem>
                    <SelectItem value="in_progress" disabled={ ticket.status === "resolved" || ticket.status === "pending" }>In Progress </SelectItem>
                    <SelectItem value="resolved" disabled={ ticket.status === "pending" || ticket.status === "assigned" }>Resolved</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="mt-1">{getStatusBadge(ticket?.status)}</div>
              )}
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
            <div>
              <p className="text-sm text-gray-600">Attachment</p>
                {ticket?.attachments?.length > 0 ? (
                  <img
                    src={ticket.attachments[0].file_url}
                    alt={ticket.attachments[0].file_name}
                    className="max-w-full h-auto mt-2 rounded shadow"
                  />
                ) : (
                  <p className="text-gray-400">No attachment</p>
                )}

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

          {/* Rating and Feedback Section - Only shown when resolved */}
          {renderFeedbackSection()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TicketDetailsDialog;