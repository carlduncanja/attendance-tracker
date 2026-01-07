-- ============================================================================
-- AI Academy Attendance - Name Change Logs Table
-- Run this to add name change tracking
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Name Change Logs Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_name_change_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  previous_name TEXT,
  new_name TEXT NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- Index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_attendance_name_change_logs_user_id ON attendance_name_change_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_name_change_logs_changed_at ON attendance_name_change_logs(changed_at);

-- Enable RLS
ALTER TABLE attendance_name_change_logs ENABLE ROW LEVEL SECURITY;

-- Users can see their own name change history
CREATE POLICY "Users can read own name change logs" ON attendance_name_change_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can read all name change logs
CREATE POLICY "Admins can read all name change logs" ON attendance_name_change_logs
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM attendance_users WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Allow inserts via service role (API will handle this)
CREATE POLICY "Service role can insert name change logs" ON attendance_name_change_logs
  FOR INSERT WITH CHECK (true);

-- Grant permissions
GRANT ALL ON attendance_name_change_logs TO authenticated;


