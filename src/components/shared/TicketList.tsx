import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, AlertCircle, Eye, Pencil } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import TicketDetailsDialog from "./TicketDetailsDialog";
import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import EditComplaintDialog from "../student/EditComplaintDialog";

interface TicketListProps {
  tickets: any[];
  onUpdate: () => void;
  role: "student" | "staff";
}

const TicketList = ({ tickets, onUpdate, role }: TicketListProps) => {
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  // ✅ Load current user's ID when component mounts
  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      console.log("Current user:", data?.user);
      setCurrentUserId(data?.user?.id || null);
    };
    fetchUser();
  }, []);

  const handleTicketClick = (ticket: any) => {
    setSelectedTicket(ticket);
    setShowDetailsDialog(true);
  };

  const handleEditClick = (ticket: any, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent card click from opening details
    setSelectedTicket(ticket);
    setShowEditDialog(true);
  };

  const handleStatusChange = async (
    ticketId: string,
    newStatus: string,
    e: Event
  ) => {
    e.stopPropagation();
    setUpdatingStatus(ticketId);

    try {
      // ✅ Check if already assigned
      const { data: existingTicket, error: fetchError } = await supabase
        .from("tickets")
        .select("status, assigned_to")
        .eq("id", ticketId)
        .single();

      if (fetchError) throw fetchError;

      if (
        existingTicket?.status === "assigned" &&
        existingTicket?.assigned_to &&
        newStatus === "assigned" &&
        existingTicket.assigned_to !== currentUserId
      ) {
        toast({
          title: "Ticket already assigned",
          description: "Another staff member has already taken this ticket.",
          variant: "destructive",
        });
        setUpdatingStatus(null);
        return;
      }

      const updateData: any = { status: newStatus };

      if (newStatus === "assigned") {
        updateData.assigned_to = currentUserId;
      }

      if (newStatus === "resolved") {
        updateData.resolved_at = new Date().toISOString();
        updateData.is_escalated = false;
      }

      if (existingTicket?.status === "assigned" && newStatus === "pending") {
        updateData.assigned_to = null;
      }

      if (newStatus === "assigned") {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.id) updateData.assigned_to = userData.user.id;
      }

      if (newStatus === "resolved") {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("tickets")
        .update(updateData)
        .eq("id", ticketId);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `Ticket status changed to ${newStatus.replace("_", " ")}`,
      });

      onUpdate();
    } catch (error: any) {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-destructive/10 text-destructive hover:bg-destructive/20";
      case "assigned":
        return "bg-primary/10 text-primary hover:bg-primary/20";
      case "in_progress":
        return "bg-secondary/10 text-secondary hover:bg-secondary/20";
      case "resolved":
        return "bg-accent/10 text-accent hover:bg-accent/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "urgent":
        return "text-destructive";
      case "high":
        return "text-secondary";
      case "medium":
        return "text-primary";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <>
      <div className="space-y-4">
        {tickets.map((ticket) => (
          <Card
            key={ticket.id}
            className="shadow-md hover:shadow-lg transition-all cursor-pointer relative"
            onClick={() => handleTicketClick(ticket)}
          >
            <CardContent className="p-4 sm:p-6 flex flex-col h-full">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4 flex-grow">
                <div className="flex-1 space-y-2 sm:space-y-3 w-full">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-base sm:text-lg mb-1 break-words">
                        {ticket.title}
                      </h4>
                      {role === "staff" && ticket.profiles && (
                        <p className="text-xs sm:text-sm text-muted-foreground break-words">
                          By {ticket.profiles.full_name} •{" "}
                          {ticket.profiles.desasiswa}{" "}
                          {ticket.profiles.room_number}
                        </p>
                      )}
                    </div>
 
                    {role === "staff" ? (
                      <Select
                        value={ticket.status}
                        onValueChange={(value) =>
                          handleStatusChange(ticket.id, value, event as any)
                        }
                        disabled={
                          updatingStatus === ticket.id ||
                          (ticket.status === "assigned" && ticket.assigned_to !== currentUserId) ||
                          ticket.status === "resolved"
                        }
                      >
                        <SelectTrigger
                          className="w-full sm:w-[140px]"
                          onClick={(e) => e.stopPropagation()}
                        >
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
                      <Badge  className={`${getStatusColor(ticket.status)} px-3 py-1 text-sm`}>
                        {ticket.status.replace("_", " ")}
                      </Badge>
                    )}
                    
                  <Button
                  variant="outline"
                  size="sm"
                  className="border-[#7323A8] text-[#7323A8] hover:bg-[#7323A8] hover:text-white transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTicketClick(ticket);
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" /> View Details
                </Button>

                  </div>

                  <p className="text-sm sm:text-base text-muted-foreground line-clamp-2">
                    {ticket.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{ticket.location}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        {formatDistanceToNow(new Date(ticket.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <div
                      className={`flex items-center gap-1 ${getUrgencyColor(
                        ticket.urgency
                      )}`}
                    >
                      <AlertCircle className="h-4 w-4" />
                      <span className="capitalize">{ticket.urgency}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    {/* Left side: Category */}
                    <Badge variant="outline" className="capitalize">
                      {ticket.category}
                    </Badge>

                    {/* Right side: Escalated */}
                    {role === "staff"  && ticket.is_escalated && (
                      <div className="inline-block px-3 py-1 bg-[#DC2626] text-white text-sm font-semibold rounded-full border border-[#DC2626] shadow-sm">
                        Escalated
                      </div>
                    )}
                    {/* Edit Complaint button — visible only for student + pending */}
                    {role === "student" && ticket.status === "pending" && (
                      <div className="inline-block py-1 pl-[1vw] ">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-[#7323A8] text-[#7323A8] hover:bg-[#7323A8] hover:text-white transition-colors"
                          onClick={(e) => handleEditClick(ticket, e)}
                        >
                          <Pencil className="mr-2 h-4 w-4" /> Edit Complaint
                        </Button>
                      </div>
                    )}
                  </div>

                </div>
              </div>

            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ticket Details Dialog */}
      <TicketDetailsDialog
        ticket={selectedTicket}
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        onUpdate={onUpdate}
      />

      {/* Edit Complaint Dialog */}
      <EditComplaintDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={onUpdate}
        ticketId={selectedTicket?.id ?? null}
      />
    </>
  );
};

export default TicketList;