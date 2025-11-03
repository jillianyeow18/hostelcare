import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CriticalAlertBannerProps {
  category: string;
}

const CriticalAlertBanner = ({ category }: CriticalAlertBannerProps) => {
  const [criticalTicket, setCriticalTicket] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    loadCriticalTicket();
    const channel = supabase
      .channel(`critical-tickets-${category}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
          filter: `category=eq.${category}`,
        },
        () => {
          loadCriticalTicket();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [category]);

  const loadCriticalTicket = async () => {
    try {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("category", category)
        .eq("urgency", "high")
        .in("status", ["pending", "in_progress"])
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (error) {
        if (error.code !== "PGRST116") { // Not found error
          console.error("Error loading critical ticket:", error);
        }
        setCriticalTicket(null);
        return;
      }

      setCriticalTicket(data);
      setDismissed(false);
    } catch (error) {
      console.error("Error loading critical ticket:", error);
      setCriticalTicket(null);
    }
  };

  if (!criticalTicket || dismissed) return null;

  return (
    <div className="bg-destructive/90 text-destructive-foreground px-6 py-3 border-b border-destructive">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="font-semibold">
              🚨 Ticket requires attention: {criticalTicket.title} – Critical Escalation
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive-foreground hover:bg-destructive-foreground/10"
            onClick={() => window.open(`/staff/tickets/${criticalTicket.id}`, "_blank")}
          >
            View details
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive-foreground hover:bg-destructive-foreground/10"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CriticalAlertBanner;
