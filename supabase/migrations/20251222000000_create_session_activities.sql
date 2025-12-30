-- Create session_activities table for audit logging (optional)
-- This table tracks user session activities for security monitoring

CREATE TABLE IF NOT EXISTS session_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'login', 
    'logout', 
    'page_view', 
    'interaction', 
    'idle_warning', 
    'session_refresh', 
    'token_refresh',
    'complaint_submitted',
    'complaint_updated',
    'complaint_viewed',
    'profile_updated',
    'comment_added'
  )),
  page_path TEXT,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_session_activities_user_id ON session_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_session_activities_created_at ON session_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_activities_activity_type ON session_activities(activity_type);

-- Enable Row Level Security
ALTER TABLE session_activities ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own activity logs
CREATE POLICY "Users can view own session activities"
  ON session_activities
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Staff/admin can view all activities (for security monitoring)
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

-- Policy: System can insert activities
CREATE POLICY "Allow insert session activities"
  ON session_activities
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to clean up old session activities (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_session_activities()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM session_activities
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Comment on table
COMMENT ON TABLE session_activities IS 'Tracks user session activities for security audit logging';
