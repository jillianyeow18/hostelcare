import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import TicketDetailsDialog from "./TicketDetailsDialog";
import { useState } from "react";

interface TicketListProps {
  tickets: any[];
  onUpdate: () => void;
  role: "student" | "staff";
}

const TicketList = ({ tickets, onUpdate, role }: TicketListProps) => {
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const handleTicketClick = (ticket: any) => {
    setSelectedTicket(ticket);
    setShowDetailsDialog(true);
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
            className="shadow-md hover:shadow-lg transition-all cursor-pointer"
            onClick={() => handleTicketClick(ticket)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-semibold text-lg mb-1">
                        {ticket.title}
                      </h4>
                      {role === "staff" && ticket.profiles && (
                        <p className="text-sm text-muted-foreground">
                          By {ticket.profiles.full_name} •{" "}
                          {ticket.profiles.desasiswa}{" "}
                          {ticket.profiles.room_number}
                        </p>
                      )}
                    </div>
                    <Badge className={getStatusColor(ticket.status)}>
                      {ticket.status.replace("_", " ")}
                    </Badge>
                  </div>

                  <p className="text-muted-foreground line-clamp-2">
                    {ticket.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-sm">
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

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="capitalize">
                      {ticket.category}
                    </Badge>
                  </div>
                </div>

                <Button variant="outline" size="sm">
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <TicketDetailsDialog
        ticket={selectedTicket}
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        onUpdate={onUpdate}
      />
    </>
  );
};

export default TicketList;
