-- ============================================================================
-- OPTIMIZED SESSION TRACKING SYSTEM
-- ============================================================================
-- This migration creates a hybrid session tracking system that:
-- 1. Tracks session summaries (login/logout times) in user_sessions
-- 2. Logs only important activities in session_activities
-- 3. Auto-captures IP addresses from request headers
-- 4. Auto-cleans old data to prevent bloat
-- ============================================================================

-- ============================================================================
-- TABLE 1: USER_SESSIONS (Session Summary)
-- ============================================================================
-- Tracks high-level session information: when users log in/out

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Session timestamps
  login_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  logout_time TIMESTAMPTZ,
  last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Session metadata
  ip_address INET,
  user_agent TEXT,
  device_info JSONB DEFAULT '{}'::jsonb,
  
  -- Auto-calculated session duration
  session_duration INTERVAL GENERATED ALWAYS AS (
    COALESCE(logout_time, last_activity) - login_time
  ) STORED,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_login_time ON user_sessions(login_time DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(user_id) WHERE logout_time IS NULL;

-- ============================================================================
-- TABLE 2: SESSION_ACTIVITIES (Important Events Only)
-- ============================================================================
-- Logs only important activities like complaints, profile changes

-- Drop existing table if it exists (we're restructuring it)
DROP TABLE IF EXISTS session_activities CASCADE;

CREATE TABLE session_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Activity details
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'login',
    'logout',
    'complaint_submitted',
    'complaint_updated',
    'complaint_deleted',
    'ticket_viewed',
    'comment_added',
    'profile_updated',
    'role_changed',
    'password_changed',
    'idle_warning',
    'session_refresh',
    'page_view' -- Kept for compatibility, but rarely used
  )),
  
  page_path TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- IP tracking
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_session_activities_user_id ON session_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_session_activities_created_at ON session_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_activities_activity_type ON session_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_session_activities_session_id ON session_activities(session_id);
CREATE INDEX IF NOT EXISTS idx_session_activities_metadata ON session_activities USING gin(metadata);

-- ============================================================================
-- FUNCTION: Auto-link activity to current session
-- ============================================================================
CREATE OR REPLACE FUNCTION link_activity_to_session()
RETURNS TRIGGER AS $$
BEGIN
  -- Find the user's active session and link this activity to it
  SELECT id INTO NEW.session_id
  FROM user_sessions
  WHERE user_id = NEW.user_id
    AND logout_time IS NULL
  ORDER BY login_time DESC
  LIMIT 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-link activities to sessions
DROP TRIGGER IF EXISTS trg_link_activity_to_session ON session_activities;
CREATE TRIGGER trg_link_activity_to_session
  BEFORE INSERT ON session_activities
  FOR EACH ROW
  EXECUTE FUNCTION link_activity_to_session();

-- ============================================================================
-- FUNCTION: Update last_activity timestamp
-- ============================================================================
-- Called for non-important activities to update timestamp without logging

CREATE OR REPLACE FUNCTION update_last_activity(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE user_sessions
  SET last_activity = NOW()
  WHERE user_id = p_user_id
    AND logout_time IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_last_activity IS 'Updates last_activity timestamp for active sessions without creating activity records';

-- ============================================================================
-- FUNCTION: Update last_activity when important activity logged
-- ============================================================================
CREATE OR REPLACE FUNCTION update_session_on_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the last_activity timestamp in user_sessions
  UPDATE user_sessions
  SET last_activity = NEW.created_at
  WHERE user_id = NEW.user_id
    AND logout_time IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trg_update_session_on_activity ON session_activities;
CREATE TRIGGER trg_update_session_on_activity
  AFTER INSERT ON session_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_session_on_activity();

-- ============================================================================
-- FUNCTION: Capture IP Address from Supabase Request Headers
-- ============================================================================
-- Automatically captures client IP from x-forwarded-for header

CREATE OR REPLACE FUNCTION capture_client_ip()
RETURNS TRIGGER AS $$
DECLARE
  request_headers json;
  forwarded_for text;
BEGIN
  BEGIN
    -- Try to get request headers from Supabase
    request_headers := current_setting('request.headers', true)::json;
    
    -- Extract x-forwarded-for header (Supabase passes client IP here)
    forwarded_for := request_headers->>'x-forwarded-for';
    
    IF forwarded_for IS NOT NULL AND forwarded_for != '' THEN
      -- Take first IP if multiple are present (client IP)
      NEW.ip_address := inet(split_part(forwarded_for, ',', 1));
      RAISE LOG 'Captured IP address: %', NEW.ip_address;
    ELSE
      -- Try x-real-ip as fallback
      forwarded_for := request_headers->>'x-real-ip';
      IF forwarded_for IS NOT NULL AND forwarded_for != '' THEN
        NEW.ip_address := inet(forwarded_for);
        RAISE LOG 'Captured IP address from x-real-ip: %', NEW.ip_address;
      END IF;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- If headers not available or IP invalid, just leave it NULL
      RAISE LOG 'Could not capture IP address: %', SQLERRM;
      NEW.ip_address := NULL;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply IP capture to user_sessions
DROP TRIGGER IF EXISTS trg_capture_ip_user_sessions ON user_sessions;
CREATE TRIGGER trg_capture_ip_user_sessions
  BEFORE INSERT ON user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION capture_client_ip();

-- Apply IP capture to session_activities
DROP TRIGGER IF EXISTS trg_capture_ip_session_activities ON session_activities;
CREATE TRIGGER trg_capture_ip_session_activities
  BEFORE INSERT ON session_activities
  FOR EACH ROW
  EXECUTE FUNCTION capture_client_ip();

-- ============================================================================
-- FUNCTION: Cleanup old session data
-- ============================================================================
-- Removes old data to prevent database bloat

CREATE OR REPLACE FUNCTION cleanup_session_data()
RETURNS TABLE(
  deleted_page_views bigint,
  deleted_old_activities bigint,
  deleted_old_sessions bigint
) AS $$
DECLARE
  v_deleted_page_views bigint;
  v_deleted_activities bigint;
  v_deleted_sessions bigint;
BEGIN
  -- Delete page_view activities older than 7 days
  DELETE FROM session_activities 
  WHERE activity_type = 'page_view' 
    AND created_at < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS v_deleted_page_views = ROW_COUNT;
  
  -- Delete other activities older than 2 years (keep audit trail)
  DELETE FROM session_activities 
  WHERE activity_type != 'page_view'
    AND created_at < NOW() - INTERVAL '2 years';
  GET DIAGNOSTICS v_deleted_activities = ROW_COUNT;
  
  -- Delete sessions older than 2 years
  DELETE FROM user_sessions
  WHERE login_time < NOW() - INTERVAL '2 years';
  GET DIAGNOSTICS v_deleted_sessions = ROW_COUNT;
  
  -- Return counts
  RETURN QUERY SELECT v_deleted_page_views, v_deleted_activities, v_deleted_sessions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_session_data IS 'Cleans up old session data: page_views (7 days), activities (2 years), sessions (2 years)';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on both tables
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_activities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Staff can view all sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON user_sessions;

DROP POLICY IF EXISTS "Users can view own session activities" ON session_activities;
DROP POLICY IF EXISTS "Staff can view all session activities" ON session_activities;
DROP POLICY IF EXISTS "Allow insert session activities" ON session_activities;

-- USER_SESSIONS Policies
CREATE POLICY "Users can view own sessions"
  ON user_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all sessions"
  ON user_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('staff', 'admin')
    )
  );

CREATE POLICY "Users can insert own sessions"
  ON user_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON user_sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- SESSION_ACTIVITIES Policies
CREATE POLICY "Users can view own session activities"
  ON session_activities
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all session activities"
  ON session_activities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('staff', 'admin')
    )
  );

CREATE POLICY "Allow insert session activities"
  ON session_activities
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- HELPFUL VIEWS
-- ============================================================================

-- View: Active sessions with duration
CREATE OR REPLACE VIEW active_sessions AS
SELECT 
  us.id,
  us.user_id,
  p.full_name,
  p.email,
  us.login_time,
  us.last_activity,
  us.ip_address,
  us.user_agent,
  EXTRACT(EPOCH FROM (NOW() - us.login_time))/60 as session_duration_minutes,
  EXTRACT(EPOCH FROM (NOW() - us.last_activity))/60 as idle_minutes
FROM user_sessions us
LEFT JOIN profiles p ON p.id = us.user_id
WHERE us.logout_time IS NULL
ORDER BY us.login_time DESC;

COMMENT ON VIEW active_sessions IS 'Shows all currently active sessions with duration and idle time';

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE user_sessions IS 'Tracks user session lifecycle: login, logout, and activity timestamps';
COMMENT ON TABLE session_activities IS 'Logs important user activities for audit trail and security monitoring';

COMMENT ON COLUMN user_sessions.session_duration IS 'Auto-calculated duration between login and logout (or last_activity if still active)';
COMMENT ON COLUMN user_sessions.device_info IS 'JSONB containing device metadata: platform, language, screen size, timezone';
COMMENT ON COLUMN session_activities.metadata IS 'JSONB containing activity-specific data like complaint_id, ticket_id, etc.';

-- ============================================================================
-- TESTING QUERIES (Run these to verify the setup)
-- ============================================================================

/*
-- Test 1: Check if IP capture works
SELECT * FROM user_sessions ORDER BY login_time DESC LIMIT 5;

-- Test 2: View active sessions
SELECT * FROM active_sessions;

-- Test 3: Check session activities
SELECT 
  activity_type,
  COUNT(*) as count,
  MAX(created_at) as latest
FROM session_activities
GROUP BY activity_type
ORDER BY count DESC;

-- Test 4: Run cleanup (dry run - see what would be deleted)
SELECT * FROM cleanup_session_data();

-- Test 5: Check if session is linked to activities
SELECT 
  sa.activity_type,
  sa.created_at,
  us.login_time,
  us.logout_time
FROM session_activities sa
LEFT JOIN user_sessions us ON us.id = sa.session_id
ORDER BY sa.created_at DESC
LIMIT 10;
*/
