import { supabase } from "@/integrations/supabase/client";

// Define which activities are "important" and should be logged to database
const IMPORTANT_ACTIVITIES = [
  "login",
  "logout",
  "complaint_submitted",
  "complaint_updated",
  "complaint_deleted",
  "ticket_viewed",
  "comment_added",
  "profile_updated",
  "role_changed",
  "password_changed",
  "idle_warning",
  "session_refresh",
] as const;

type ImportantActivity = (typeof IMPORTANT_ACTIVITIES)[number];
type ActivityType = ImportantActivity | "page_view" | "interaction";

interface LogActivityParams {
  activityType: ActivityType;
  pagePath?: string;
  metadata?: Record<string, any>;
}

interface SessionSummary {
  session_id: string;
  login_time: Date;
  last_activity: Date;
  duration_minutes: number;
}

/**
 * Session Tracking Middleware
 *
 * Provides centralized session management with smart logging:
 * - Important activities (complaints, profile changes) → logged to database
 * - Regular activities (page views) → only update last_activity timestamp
 *
 * This reduces database writes while maintaining comprehensive audit trails.
 */
export const sessionMiddleware = {
  /**
   * Log user activity with smart routing
   * Important activities go to database, others just update timestamp
   */
  logActivity: async ({
    activityType,
    pagePath,
    metadata,
  }: LogActivityParams): Promise<void> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.warn("⚠️ Cannot log activity: No authenticated user");
        return;
      }

      const isImportant = IMPORTANT_ACTIVITIES.includes(
        activityType as ImportantActivity
      );

      if (isImportant) {
        // Log important activities to database with full details
        const { error } = await supabase.from("session_activities").insert({
          user_id: user.id,
          activity_type: activityType,
          page_path: pagePath || window.location.pathname,
          metadata: metadata || {},
        });

        if (error) {
          console.error("❌ Error logging activity to database:", error);
          return;
        }

        console.log(`✅ Important activity logged: ${activityType}`, {
          user_id: user.id,
          page: pagePath || window.location.pathname,
          metadata,
        });
      } else {
        // For less important activities, just update last_activity timestamp
        const { error } = await supabase.rpc("update_last_activity", {
          p_user_id: user.id,
        });

        if (error) {
          console.error("❌ Error updating last activity:", error);
          return;
        }

        console.log(`⚡ Activity tracked (no DB write): ${activityType}`);
      }

      // Also store in localStorage for debugging (last 50 activities)
      const recentActivities = JSON.parse(
        localStorage.getItem("session_activities") || "[]"
      );
      recentActivities.push({
        activityType,
        pagePath: pagePath || window.location.pathname,
        timestamp: new Date().toISOString(),
        metadata,
        logged_to_db: isImportant,
      });

      if (recentActivities.length > 50) {
        recentActivities.shift();
      }

      localStorage.setItem(
        "session_activities",
        JSON.stringify(recentActivities)
      );
    } catch (error) {
      console.error("❌ Failed to log session activity:", error);
    }
  },

  /**
   * Create a new session entry when user logs in
   */
  createSession: async (): Promise<string | null> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.warn("⚠️ Cannot create session: No authenticated user");
        return null;
      }

      const { data, error } = await supabase
        .from("user_sessions")
        .insert({
          user_id: user.id,
          login_time: new Date().toISOString(),
          last_activity: new Date().toISOString(),
          user_agent: navigator.userAgent,
          device_info: {
            platform: navigator.platform,
            language: navigator.language,
            screen: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        })
        .select("id")
        .single();

      if (error) {
        console.error("❌ Error creating session:", error);
        return null;
      }

      console.log("✅ Session created:", data.id);

      // Also log the login activity
      await sessionMiddleware.logActivity({
        activityType: "login",
        metadata: { session_id: data.id },
      });

      return data.id;
    } catch (error) {
      console.error("❌ Failed to create session:", error);
      return null;
    }
  },

  /**
   * End the current session when user logs out
   */
  endSession: async (): Promise<void> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Update user_sessions table with logout time
      const { error } = await supabase
        .from("user_sessions")
        .update({
          logout_time: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .is("logout_time", null); // Only update active sessions

      if (error) {
        console.error("❌ Error ending session:", error);
        return;
      }

      console.log("✅ Session ended");

      // Log the logout activity
      await sessionMiddleware.logActivity({
        activityType: "logout",
      });
    } catch (error) {
      console.error("❌ Failed to end session:", error);
    }
  },

  /**
   * Get current session summary
   */
  getSessionSummary: async (): Promise<SessionSummary | null> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_sessions")
        .select("id, login_time, last_activity")
        .eq("user_id", user.id)
        .is("logout_time", null)
        .order("login_time", { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        console.warn("⚠️ No active session found");
        return null;
      }

      const loginTime = new Date(data.login_time);
      const lastActivity = new Date(data.last_activity);
      const durationMs = lastActivity.getTime() - loginTime.getTime();
      const durationMinutes = Math.floor(durationMs / 60000);

      return {
        session_id: data.id,
        login_time: loginTime,
        last_activity: lastActivity,
        duration_minutes: durationMinutes,
      };
    } catch (error) {
      console.error("❌ Failed to get session summary:", error);
      return null;
    }
  },

  /**
   * Validate if current session is still valid
   */
  validateSession: async (): Promise<boolean> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.warn("⚠️ No active session found");
        return false;
      }

      const expiresAt = session.expires_at! * 1000;
      const now = Date.now();

      const isValid = now < expiresAt;

      if (!isValid) {
        console.warn("⚠️ Session has expired");
      }

      return isValid;
    } catch (error) {
      console.error("❌ Session validation failed:", error);
      return false;
    }
  },

  /**
   * Refresh session if expiring soon (within 10 minutes)
   */
  refreshSessionIfNeeded: async (): Promise<boolean> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return false;

      const expiresAt = session.expires_at! * 1000;
      const now = Date.now();
      const timeRemaining = expiresAt - now;

      // Refresh if less than 10 minutes remaining
      if (timeRemaining < 10 * 60 * 1000 && timeRemaining > 0) {
        const { error } = await supabase.auth.refreshSession();

        if (error) {
          console.error("❌ Session refresh failed:", error);
          return false;
        }

        console.log("✅ Session refreshed automatically");

        await sessionMiddleware.logActivity({
          activityType: "session_refresh",
          metadata: {
            auto_refresh: true,
            time_remaining_seconds: Math.floor(timeRemaining / 1000),
          },
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error("❌ Session refresh check failed:", error);
      return false;
    }
  },
};

/**
 * Export type for use in components
 */
export type { ActivityType, LogActivityParams, SessionSummary };
