import { supabase } from "@/integrations/supabase/client";

type ActivityType =
  | "login"
  | "logout"
  | "page_view"
  | "interaction"
  | "idle_warning"
  | "session_refresh"
  | "token_refresh"
  | "complaint_submitted"
  | "complaint_updated"
  | "complaint_viewed"
  | "profile_updated"
  | "comment_added";

interface LogActivityParams {
  activityType: ActivityType;
  pagePath?: string;
  metadata?: Record<string, any>;
}

/**
 * Utility function to log user activities to session_activities table
 * Usage: await logSessionActivity({ activityType: "complaint_submitted", pagePath: "/student" })
 */
export const logSessionActivity = async ({
  activityType,
  pagePath,
  metadata,
}: LogActivityParams): Promise<void> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.warn("Cannot log activity: No authenticated user");
      return;
    }

    const { error } = await supabase.from("session_activities").insert({
      user_id: user.id,
      activity_type: activityType,
      page_path: pagePath || window.location.pathname,
      user_agent: navigator.userAgent,
    });

    if (error) {
      console.error("Error logging session activity:", error);
      return;
    }

    // Log to console for debugging
    console.log(`✅ Session Activity Logged: ${activityType}`, {
      user_id: user.id,
      page: pagePath || window.location.pathname,
      metadata,
    });

    // Also store in localStorage for debugging
    const recentActivities = JSON.parse(
      localStorage.getItem("session_activities") || "[]"
    );
    recentActivities.push({
      activityType,
      pagePath: pagePath || window.location.pathname,
      timestamp: new Date().toISOString(),
      metadata,
    });

    // Keep only last 50 activities
    if (recentActivities.length > 50) {
      recentActivities.shift();
    }

    localStorage.setItem(
      "session_activities",
      JSON.stringify(recentActivities)
    );
  } catch (error) {
    console.error("Failed to log session activity:", error);
  }
};

/**
 * Hook to use session activity logging in React components
 */
export const useSessionActivity = () => {
  return { logActivity: logSessionActivity };
};
