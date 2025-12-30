import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
}

/**
 * Hook to manage authentication state and listen for auth changes
 * Handles token refresh, session expiry, and multi-tab logout synchronization
 */
export const useAuthState = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    // Check initial auth state
    const checkInitialAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setAuthState({
          user,
          loading: false,
          isAuthenticated: !!user,
        });
      } catch (error) {
        console.error("Error checking auth:", error);
        setAuthState({
          user: null,
          loading: false,
          isAuthenticated: false,
        });
      }
    };

    checkInitialAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth event:", event);

      switch (event) {
        case "SIGNED_IN":
          setAuthState({
            user: session?.user || null,
            loading: false,
            isAuthenticated: true,
          });
          break;

        case "SIGNED_OUT":
          setAuthState({
            user: null,
            loading: false,
            isAuthenticated: false,
          });
          // Only navigate if not already on auth page
          if (
            window.location.pathname !== "/auth" &&
            window.location.pathname !== "/"
          ) {
            navigate("/auth");
            toast({
              title: "Signed out",
              description: "You have been logged out.",
            });
          }
          break;

        case "TOKEN_REFRESHED":
          console.log("Token refreshed successfully");
          setAuthState({
            user: session?.user || null,
            loading: false,
            isAuthenticated: !!session?.user,
          });
          break;

        case "USER_UPDATED":
          setAuthState({
            user: session?.user || null,
            loading: false,
            isAuthenticated: !!session?.user,
          });
          break;

        default:
          break;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, toast]);

  return authState;
};
