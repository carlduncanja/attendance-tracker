-- ============================================================================
-- AI Academy Attendance Tracking System - Database Schema
-- ============================================================================
-- Run this file to set up the entire database from scratch
-- ============================================================================

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS & TYPES
-- ============================================================================

-- Create enum type for user roles
CREATE TYPE attendance_role AS ENUM ('admin', 'attendee');

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Attendance Users Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role attendance_role DEFAULT 'attendee' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE attendance_users IS 'User profiles for the AI Academy attendance system';
COMMENT ON COLUMN attendance_users.role IS 'User role in the system (admin or attendee)';

-- ----------------------------------------------------------------------------
-- Attendance Sessions Table (QR Code Sessions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE attendance_sessions IS 'QR code session tokens that regenerate every 30 seconds';
COMMENT ON COLUMN attendance_sessions.token IS 'Unique token encoded in the QR code';
COMMENT ON COLUMN attendance_sessions.expires_at IS 'Token expiration time (30 seconds from creation)';

-- ----------------------------------------------------------------------------
-- Attendance Check-ins Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE attendance_checkins IS 'Records of user check-ins via QR code scanning';
COMMENT ON COLUMN attendance_checkins.session_id IS 'The QR session that was used for check-in';

-- ----------------------------------------------------------------------------
-- AI Chat Logs Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_ai_chat_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID DEFAULT uuid_generate_v4(),
  message_type TEXT NOT NULL CHECK (message_type IN ('user', 'assistant')),
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

COMMENT ON TABLE attendance_ai_chat_logs IS 'AI assistant conversation logs for admin users';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Attendance Users Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_users_user_id ON attendance_users(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_users_role ON attendance_users(role);
CREATE INDEX IF NOT EXISTS idx_attendance_users_email ON attendance_users(email);

-- Attendance Sessions Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_token ON attendance_sessions(token);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_created_by ON attendance_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_expires_at ON attendance_sessions(expires_at);

-- Attendance Check-ins Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_checkins_user_id ON attendance_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_checkins_session_id ON attendance_checkins(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_checkins_checked_in_at ON attendance_checkins(checked_in_at);

-- AI Chat Logs Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_ai_chat_logs_user_id ON attendance_ai_chat_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_ai_chat_logs_session_id ON attendance_ai_chat_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_ai_chat_logs_timestamp ON attendance_ai_chat_logs(timestamp);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE attendance_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_ai_chat_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Attendance Users Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read own profile" ON attendance_users;
CREATE POLICY "Users can read own profile"
  ON attendance_users
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all profiles" ON attendance_users;
CREATE POLICY "Admins can read all profiles"
  ON attendance_users
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM attendance_users 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

DROP POLICY IF EXISTS "Users can insert own profile" ON attendance_users;
CREATE POLICY "Users can insert own profile"
  ON attendance_users
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON attendance_users;
CREATE POLICY "Users can update own profile"
  ON attendance_users
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update all profiles" ON attendance_users;
CREATE POLICY "Admins can update all profiles"
  ON attendance_users
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM attendance_users 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- ----------------------------------------------------------------------------
-- Attendance Sessions Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can create sessions" ON attendance_sessions;
CREATE POLICY "Admins can create sessions"
  ON attendance_sessions
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM attendance_users 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

DROP POLICY IF EXISTS "Anyone can read valid sessions" ON attendance_sessions;
CREATE POLICY "Anyone can read valid sessions"
  ON attendance_sessions
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can delete sessions" ON attendance_sessions;
CREATE POLICY "Admins can delete sessions"
  ON attendance_sessions
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM attendance_users 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- ----------------------------------------------------------------------------
-- Attendance Check-ins Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert own checkins" ON attendance_checkins;
CREATE POLICY "Users can insert own checkins"
  ON attendance_checkins
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own checkins" ON attendance_checkins;
CREATE POLICY "Users can read own checkins"
  ON attendance_checkins
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all checkins" ON attendance_checkins;
CREATE POLICY "Admins can read all checkins"
  ON attendance_checkins
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM attendance_users 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- ----------------------------------------------------------------------------
-- AI Chat Logs Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage own chat logs" ON attendance_ai_chat_logs;
CREATE POLICY "Admins can manage own chat logs"
  ON attendance_ai_chat_logs
  FOR ALL
  USING (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM attendance_users 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update attendance_users updated_at timestamp
CREATE OR REPLACE FUNCTION update_attendance_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate a secure random token
CREATE OR REPLACE FUNCTION generate_session_token()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..32 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM attendance_sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Attendance Users updated_at Trigger
DROP TRIGGER IF EXISTS update_attendance_users_updated_at ON attendance_users;
CREATE TRIGGER update_attendance_users_updated_at
  BEFORE UPDATE ON attendance_users
  FOR EACH ROW
  EXECUTE FUNCTION update_attendance_users_updated_at();

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant necessary permissions
GRANT ALL ON attendance_users TO authenticated;
GRANT ALL ON attendance_sessions TO authenticated;
GRANT ALL ON attendance_checkins TO authenticated;
GRANT ALL ON attendance_ai_chat_logs TO authenticated;

-- ============================================================================
-- VIEWS (Optional - for admin statistics)
-- ============================================================================

-- View for attendance statistics
CREATE OR REPLACE VIEW attendance_stats AS
SELECT 
  (SELECT COUNT(*) FROM attendance_users) as total_users,
  (SELECT COUNT(*) FROM attendance_checkins) as total_checkins,
  (SELECT COUNT(*) FROM attendance_checkins WHERE checked_in_at::date = CURRENT_DATE) as checkins_today,
  (SELECT COUNT(DISTINCT user_id) FROM attendance_checkins WHERE checked_in_at::date = CURRENT_DATE) as unique_checkins_today;

-- Grant read access to the stats view for admins
GRANT SELECT ON attendance_stats TO authenticated;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

