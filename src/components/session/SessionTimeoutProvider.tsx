import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIdleTimeout } from "@/hooks/use-idle-timeout";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SessionTimeoutContextType {
  resetTimeout: () => void;
}

const SessionTimeoutContext = createContext<
  SessionTimeoutContextType | undefined
>(undefined);

export const useSessionTimeout = () => {
  const context = useContext(SessionTimeoutContext);
  if (!context) {
    throw new Error(
      "useSessionTimeout must be used within SessionTimeoutProvider"
    );
  }
  return context;
};

interface SessionTimeoutProviderProps {
  children: React.ReactNode;
  timeout?: number; // milliseconds
  warningTime?: number; // milliseconds before timeout to show warning
}

export const SessionTimeoutProvider = ({
  children,
  timeout = 15 * 60 * 1000, // 15 minutes default
  warningTime = 2 * 60 * 1000, // 2 minutes warning
}: SessionTimeoutProviderProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showWarning, setShowWarning] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      if (!session) {
        setShowWarning(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setShowWarning(false);
      toast({
        title: "Session expired",
        description: "You have been logged out due to inactivity.",
        variant: "destructive",
      });
      navigate("/auth");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleExtendSession = () => {
    setShowWarning(false);
    toast({
      title: "Session extended",
      description: "Your session has been extended.",
    });
  };

  // Main idle timeout - shows warning
  const { resetTimer: resetMainTimer } = useIdleTimeout({
    onIdle: () => {
      if (isAuthenticated) {
        setShowWarning(true);
      }
    },
    idleTime: timeout - warningTime,
  });

  // Warning timeout - logs out user
  useEffect(() => {
    if (!showWarning) return;

    const warningTimeout = setTimeout(() => {
      handleLogout();
    }, warningTime);

    return () => clearTimeout(warningTimeout);
  }, [showWarning, warningTime]);

  const resetTimeout = () => {
    resetMainTimer();
    setShowWarning(false);
  };

  return (
    <SessionTimeoutContext.Provider value={{ resetTimeout }}>
      {children}

      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Session About to Expire</AlertDialogTitle>
            <AlertDialogDescription>
              Your session is about to expire due to inactivity. You will be
              automatically logged out in {Math.floor(warningTime / 1000 / 60)}{" "}
              minutes unless you choose to continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleLogout}>
              Log Out Now
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleExtendSession}>
              Continue Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SessionTimeoutContext.Provider>
  );
};
