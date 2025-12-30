import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SessionActivity {
  user_id: string;
  activity_type:
    | "login"
    | "logout"
    | "page_view"
    | "interaction"
    | "idle_warning"
    | "session_refresh";
  page_path?: string;
  timestamp: string;
  user_agent?: string;
  ip_address?: string;
}

/**
 * Component to track user session activities for security audit logging
 * This helps monitor suspicious activities and user behavior patterns
 */
export const SessionTracker = () => {
  const lastActivityRef = useRef<Date>(new Date());
  const activityIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Track page views
    const trackPageView = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      logActivity({
        user_id: user.id,
        activity_type: "page_view",
        page_path: window.location.pathname,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
      });
    };

    trackPageView();

    // Track user interactions (clicks, keypresses)
    const trackInteraction = () => {
      lastActivityRef.current = new Date();
    };

    const events = ["click", "keypress", "mousemove", "scroll"];
    events.forEach((event) => {
      window.addEventListener(event, trackInteraction, { passive: true });
    });

    // Periodic activity check (every 5 minutes)
    activityIntervalRef.current = setInterval(async () => {
      const timeSinceLastActivity =
        Date.now() - lastActivityRef.current.getTime();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && timeSinceLastActivity < 5 * 60 * 1000) {
        logActivity({
          user_id: user.id,
          activity_type: "interaction",
          page_path: window.location.pathname,
          timestamp: new Date().toISOString(),
        });
      }
    }, 5 * 60 * 1000);

    // Track session end on page unload
    const handleBeforeUnload = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // Use sendBeacon for reliable logging on page unload
        const data = JSON.stringify({
          user_id: user.id,
          activity_type: "logout",
          timestamp: new Date().toISOString(),
        });

        // Note: In production, this should send to your backend logging endpoint
        console.log("Session activity:", data);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, trackInteraction);
      });
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (activityIntervalRef.current) {
        clearInterval(activityIntervalRef.current);
      }
    };
  }, []);

  // Log activity to Supabase database
  const logActivity = async (activity: SessionActivity) => {
    try {
      // Log to Supabase session_activities table
      const { error } = await supabase.from("session_activities").insert({
        user_id: activity.user_id,
        activity_type: activity.activity_type,
        page_path: activity.page_path,
        user_agent: activity.user_agent,
        created_at: activity.timestamp,
      });

      if (error) {
        console.error("Error logging activity to database:", error);
      }

      // Also log to console for debugging
      console.log("Session Activity:", activity);

      // Optional: Store recent activities in localStorage for debugging
      const recentActivities = JSON.parse(
        localStorage.getItem("session_activities") || "[]"
      );
      recentActivities.push(activity);

      // Keep only last 50 activities
      if (recentActivities.length > 50) {
        recentActivities.shift();
      }

      localStorage.setItem(
        "session_activities",
        JSON.stringify(recentActivities)
      );
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  };

  return null; // This is a tracking component with no UI
};
