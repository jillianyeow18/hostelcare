import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { sessionMiddleware } from "@/components/session/session-tracking-middleware";

export const SessionExpiryWarning = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    const checkSession = async () => {
      // Use middleware to validate session
      const isValid = await sessionMiddleware.validateSession();

      if (!isValid) {
        setShowWarning(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.expires_at) {
        const expiresAt = session.expires_at * 1000;
        const now = Date.now();
        const timeRemaining = expiresAt - now;

        // Show warning 5 minutes before expiry
        if (timeRemaining < 5 * 60 * 1000 && timeRemaining > 0) {
          setShowWarning(true);
          setTimeLeft(Math.floor(timeRemaining / 1000));

          // Log idle warning via middleware
          await sessionMiddleware.logActivity({
            activityType: "idle_warning",
            metadata: {
              time_remaining_seconds: Math.floor(timeRemaining / 1000),
            },
          });
        } else {
          setShowWarning(false);
        }
      }
    };

    // Check immediately
    checkSession();

    // Check every 30 seconds
    const interval = setInterval(checkSession, 30000);

    // Countdown timer when warning is shown
    let countdownInterval: NodeJS.Timeout;
    if (showWarning) {
      countdownInterval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      clearInterval(interval);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [showWarning, timeLeft]);

  const handleRefresh = async () => {
    try {
      const { error } = await supabase.auth.refreshSession();
      if (error) throw error;

      // Log session refresh via middleware
      await sessionMiddleware.logActivity({
        activityType: "session_refresh",
        metadata: {
          manual_refresh: true,
        },
      });

      setShowWarning(false);
      toast({
        title: "Session extended",
        description: "Your session has been refreshed successfully.",
      });
    } catch (error) {
      console.error("Error refreshing session:", error);
      toast({
        title: "Refresh failed",
        description: "Unable to extend your session. Please log in again.",
        variant: "destructive",
      });
    }
  };

  if (!showWarning) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <Alert className="fixed bottom-4 right-4 w-96 bg-yellow-50 border-yellow-400 shadow-lg z-50 dark:bg-yellow-900/20 dark:border-yellow-600">
      <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      <AlertDescription className="flex items-center justify-between ml-2">
        <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
          Session expires in {minutes}:{seconds.toString().padStart(2, "0")}
        </span>
        <Button
          size="sm"
          onClick={handleRefresh}
          className="ml-4 bg-yellow-600 hover:bg-yellow-700"
        >
          Extend
        </Button>
      </AlertDescription>
    </Alert>
  );
};
