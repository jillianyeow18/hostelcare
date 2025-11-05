import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  MapPin,
  AlertCircle,
  Calendar,
  Image as ImageIcon,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";

interface TicketDetailDialogProps {
  ticket: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  role: "student" | "staff";
}

const TicketDetailDialog = ({
  ticket,
  open,
  onOpenChange,
  onUpdate,
  role,
}: TicketDetailDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(ticket.status);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadComments();
      loadAttachments();
      getCurrentUser();
    }
  }, [open, ticket.id]);

  const getCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const loadComments = async () => {
    const { data: commentsData, error: commentsError } = await supabase
      .from("comments")
      .select("*")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });

    if (commentsError) {
      console.error("Error loading comments:", commentsError);
      setComments([]);
      return;
    }

    const arr = commentsData || [];
    if (arr.length === 0) {
      setComments([]);
      return;
    }

    const userIds = [
      ...new Set(arr.map((c) => (c as any).created_by).filter(Boolean)),
    ];

    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("id", userIds);

    if (profilesError) {
      console.error("Error loading profiles:", profilesError);
    }

    const merged = arr.map((comment) => ({
      ...comment,
      profiles:
        profilesData?.find((p) => p.id === (comment as any).created_by) || null,
    }));

    setComments(merged);
  };

  const loadAttachments = async () => {
    const { data } = await supabase
      .from("attachments")
      .select("*")
      .eq("ticket_id", ticket.id);

    setAttachments(data || []);
  };

  const handleStatusUpdate = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("tickets")
        .update({
          status,
          resolved_at: status === "resolved" ? new Date().toISOString() : null,
        })
        .eq("id", ticket.id);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: "Ticket status has been updated successfully.",
      });

      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("comments").insert({
        ticket_id: ticket.id,
        content: comment,
        is_internal: role === "staff",
        created_by: user.id,
      });

      if (error) throw error;

      setComment("");
      loadComments();

      toast({
        title: "Comment added",
        description: "Your comment has been posted.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to add comment",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignToSelf = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("tickets")
        .update({
          assigned_to: user.id,
          status: ticket.status === "pending" ? "assigned" : ticket.status,
        })
        .eq("id", ticket.id);

      if (error) throw error;

      toast({
        title: "Ticket assigned",
        description: "You have been assigned to this ticket.",
      });

      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Assignment failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-destructive/10 text-destructive";
      case "assigned":
        return "bg-primary/10 text-primary";
      case "in_progress":
        return "bg-secondary/10 text-secondary";
      case "resolved":
        return "bg-accent/10 text-accent";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">
                {ticket.title}
              </DialogTitle>
              <DialogDescription>
                Ticket #{ticket.id.slice(0, 8)}
              </DialogDescription>
            </div>
            <Badge className={getStatusColor(ticket.status)}>
              {ticket.status.replace("_", " ")}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Ticket Info */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(ticket.created_at), "PPP")}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{ticket.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                <span className="capitalize">{ticket.urgency} priority</span>
              </div>
            </div>

            <div>
              <Badge variant="outline" className="capitalize">
                {ticket.category}
              </Badge>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="font-semibold mb-2">Description</h4>
            <p className="text-muted-foreground">{ticket.description}</p>
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Attachments
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative group"
                  >
                    <img
                      src={attachment.file_url}
                      alt={attachment.file_name}
                      className="w-full h-32 object-cover rounded border hover:opacity-80 transition-opacity"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Staff Actions */}
          {role === "staff" && (
            <div className="space-y-3 pt-4 border-t">
              <h4 className="font-semibold">Staff Actions</h4>

              {/* Assign to Self */}
              {!ticket.assigned_to || ticket.assigned_to !== currentUserId ? (
                <Button
                  onClick={handleAssignToSelf}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  Assign to Me
                </Button>
              ) : (
                <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-sm text-center">
                  ✓ Assigned to you
                </div>
              )}

              {/* Status Update */}
              <div className="flex gap-3">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleStatusUpdate}
                  disabled={loading || status === ticket.status}
                >
                  Update Status
                </Button>
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comments & Updates
            </h4>

            {comments.length > 0 && (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">
                        {comment.profiles?.full_name}
                        {comment.profiles?.role !== "student" && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Staff
                          </Badge>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.created_at), "PPp")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {comment.content}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {role === "staff" && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a comment or update..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />
                <Button
                  onClick={handleAddComment}
                  disabled={loading || !comment.trim()}
                  size="sm"
                >
                  Post Comment
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TicketDetailDialog;
