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
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data?.user?.id || null);
    };
    fetchUser();
  }, []);

  const capitalizeFirstLetter = (string: string) => {
    if (!string) return "";
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const handleTicketClick = (ticket: any) => {
    setSelectedTicket(ticket);
    setShowDetailsDialog(true);
  };

  const handleEditClick = (ticket: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTicket(ticket);
    setShowEditDialog(true);
  };

  const handleStatusChange = async (ticketId: string, newStatus: string, groupTickets?: any[]) => {
    setUpdatingStatus(ticketId);

    try {
      // Include the representative + group tickets
      const ticketsToUpdate = groupTickets ? [ticketId, ...groupTickets.map(t => t.id)] : [ticketId];

      // Fetch all tickets to check assignment constraints
      const { data: existingTickets, error: fetchError } = await supabase
        .from("tickets")
        .select("id, status, assigned_to")
        .in("id", ticketsToUpdate);

      if (fetchError) throw fetchError;

      // Validate assignments for staff
      for (let t of existingTickets) {
        if (
          t.status === "assigned" &&
          t.assigned_to &&
          newStatus === "assigned" &&
          t.assigned_to !== currentUserId
        ) {
          toast({
            title: "Ticket already assigned",
            description: "Another staff member has already taken this ticket.",
            variant: "destructive",
          });
          setUpdatingStatus(null);
          return;
        }
      }

      // Prepare update data
      const updateData: any = { status: newStatus };
      if (newStatus === "assigned") updateData.assigned_to = currentUserId;
      if (newStatus === "resolved") {
        updateData.resolved_at = new Date().toISOString();
        updateData.is_escalated = false;
      }
      if (newStatus === "pending") updateData.assigned_to = null;

      // Update all related tickets
      const { error: updateError } = await supabase
        .from("tickets")
        .update(updateData)
        .in("id", ticketsToUpdate);

      if (updateError) throw updateError;

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

  // --- GROUPING LOGIC FOR PUBLIC TICKETS ---
  const groupPublicTickets = (tickets: any[]) => {
    if (role !== "staff") return tickets.map((t) => ({ type: "ticket", ticket: t }));

    const map = new Map<string, any>();
    const result: any[] = [];

    tickets.forEach((ticket) => {
      if (ticket.damage_type?.toLowerCase() !== "public") {
        result.push({ type: "ticket", ticket });
        return;
      }

      const key = [
        ticket.profiles?.desasiswa || "",
        ticket.specific_item_or_location || "",
        ticket.public_block || "",
        ticket.public_floor || "",
      ].join("||");

      if (!map.has(key)) {
        map.set(key, { representative: ticket, tickets: [ticket] });
      } else {
        map.get(key).tickets.push(ticket);
      }
    });

    map.forEach((group) => {
      if (group.tickets.length > 1) {
        result.push({ type: "group", representative: group.representative, tickets: group.tickets });
      } else {
        result.push({ type: "ticket", ticket: group.tickets[0] });
      }
    });

    return result;
  };

  const displayedTickets = groupPublicTickets(tickets);

  return (
    <>
      <div className="space-y-4">
        {displayedTickets.map((item, idx) => {
          const isGroup = item.type === "group";
          const ticket = isGroup ? item.representative : item.ticket;
          const group = isGroup ? item.tickets : null;
          const groupKey = isGroup ? `group-${ticket.id}-${idx}` : null;
          const expanded = groupKey ? expandedGroups[groupKey] || false : false;

          return (
            <Card key={ticket.id} className="shadow-md hover:shadow-lg transition-all cursor-pointer relative">
              <CardContent className="select-none p-4 sm:p-6 flex flex-col h-full">
                {/* Ticket Info */}
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4 flex-grow">
                  <div className="flex-1 space-y-2 sm:space-y-3 w-full">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-base sm:text-lg mb-1 break-words">
                          {ticket.title}
                        </h4>
                        {role === "staff" && ticket.profiles && (
                          <p className="text-xs sm:text-sm text-muted-foreground break-words">
                            By {ticket.profiles.full_name} • {ticket.profiles.desasiswa}{" "}
                            {ticket.profiles.room_number}
                          </p>
                        )}
                      </div>

                      {role === "staff" ? (
                        <Select
                          value={ticket.status}
                          onValueChange={(value) => handleStatusChange(ticket.id, value, isGroup ? group : undefined)}
                          disabled={
                            updatingStatus === ticket.id ||
                            (ticket.status === "assigned" && ticket.assigned_to !== currentUserId) ||
                            ticket.status === "resolved"
                          }
                        >
                          <SelectTrigger className="w-full sm:w-[140px] h-8" onClick={(e) => e.stopPropagation()}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending" disabled={ticket.status === "in_progress" || ticket.status === "resolved"}>Pending</SelectItem>
                            <SelectItem value="assigned" disabled={ticket.status === "in_progress" || ticket.status === "resolved"}>Assigned</SelectItem>
                            <SelectItem value="in_progress" disabled={ticket.status === "resolved" || ticket.status === "pending"}>In Progress</SelectItem>
                            <SelectItem value="resolved" disabled={ticket.status === "pending" || ticket.status === "assigned"}>Resolved</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className={`${getStatusColor(ticket.status)} px-3 py-1 text-sm`}>
                          {capitalizeFirstLetter(ticket.status.replace("_", " "))}
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

                    {/* Ticket description */}
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm sm:text-base text-muted-foreground line-clamp-2">
                          {ticket.description}
                        </p>
                      </div>

                      {role === "staff" && ticket.assigned_to && (
                        <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-md text-sm line-clamp-1">
                          Incharged Staff: {ticket.staff.full_name}
                        </div>
                      )}
                    </div>

                    {/* Ticket meta */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{ticket.specific_item_or_location}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          {ticket.created_at ? formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true }) : "Unknown time"}
                        </span>
                      </div>
                      {ticket.status !== "resolved" && (
                        <div className={`flex items-center gap-1 ${getUrgencyColor(ticket.urgency)}`}>
                          <AlertCircle className="h-4 w-4" />
                          <span className="capitalize">{ticket.urgency}</span>
                        </div>
                      )}
                    </div>
					
					 <div className="flex items-center justify-between">
                    {/* Left side: Category */}
                    <Badge variant="outline" className="capitalize">
                      {ticket.category}
                    </Badge>

                    {/* Right side: Escalated */}
                    {role === "staff" && ticket.is_escalated && (
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
				  
                    {/* Group info */}
                    {isGroup && group && group.length > 1 && (
                      <div className="mt-2 flex justify-between items-center text-xs sm:text-sm text-muted-foreground">
                        <span>{group.length - 1} more same case ticket{group.length - 1 > 1 ? "s" : ""}</span>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() =>
                            setExpandedGroups((prev) => ({
                              ...prev,
                              [groupKey!]: !prev[groupKey!],
                            }))
                          }
                        >
                          {expanded ? "▲" : "▼"}
                        </Button>
                      </div>
                    )}

                    {/* Expanded group tickets */}
                    {expanded && group && (
                      <div className="mt-2 space-y-2">
                        {group
                          .filter((t: any) => t.id !== ticket.id) // Exclude the representative
                          .map((t: any) => (
                            <Card key={`expanded-${t.id}`} className="shadow-sm border border-gray-200 p-2 bg-gray-50">
                              <CardContent className="p-2">
                                <div className="flex flex-col space-y-1">
                                  <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-4">
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-semibold text-base sm:text-lg mb-1 break-words">
                                        {ticket.title}
                                      </h4>
                                      {role === "staff" && ticket.profiles && (
                                        <p className="text-xs sm:text-sm text-muted-foreground break-words">
                                          By {ticket.profiles.full_name} • {ticket.profiles.desasiswa}{" "}
                                          {ticket.profiles.room_number}
                                        </p>
                                      )}
                                    </div>
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


                                  {/* Description */}
                                  <span className="text-xs text-muted-foreground">{t.description}</span>

                                  {/* Location, Time, Urgency */}
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <MapPin className="h-4 w-4" />
                                    <span>{t.specific_item_or_location}</span>

                                    <Clock className="h-4 w-4" />
                                    <span>
                                      {t.created_at
                                        ? formatDistanceToNow(new Date(t.created_at), { addSuffix: true })
                                        : "Unknown time"}
                                    </span>

                                    {t.status !== "resolved" && (
                                      <div className="flex items-center gap-1 text-destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <span className="capitalize">{t.urgency}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <TicketDetailsDialog
        ticket={selectedTicket}
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        onUpdate={onUpdate}
      />

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
