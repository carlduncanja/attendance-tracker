-- ============================================================================
-- AI Academy Attendance - Recreate Tables
-- Run this to drop and recreate all attendance tables
-- ============================================================================

-- Drop existing view first
DROP VIEW IF EXISTS attendance_stats;

-- Drop existing tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS attendance_ai_chat_logs;
DROP TABLE IF EXISTS attendance_checkins;
DROP TABLE IF EXISTS attendance_sessions;
DROP TABLE IF EXISTS attendance_users;

-- Drop the enum type
DO $$ BEGIN
  DROP TYPE IF EXISTS attendance_role;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum type for user roles
DO $$ BEGIN
  CREATE TYPE attendance_role AS ENUM ('admin', 'attendee');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- Attendance Users Table
-- ----------------------------------------------------------------------------
CREATE TABLE attendance_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role attendance_role DEFAULT 'attendee' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Attendance Sessions Table (QR Code Sessions)
-- ----------------------------------------------------------------------------
CREATE TABLE attendance_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Attendance Check-ins Table
-- ----------------------------------------------------------------------------
CREATE TABLE attendance_checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- AI Chat Logs Table
-- ----------------------------------------------------------------------------
CREATE TABLE attendance_ai_chat_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID DEFAULT uuid_generate_v4(),
  message_type TEXT NOT NULL CHECK (message_type IN ('user', 'assistant')),
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_attendance_users_role ON attendance_users(role);
CREATE INDEX idx_attendance_users_email ON attendance_users(email);
CREATE INDEX idx_attendance_sessions_token ON attendance_sessions(token);
CREATE INDEX idx_attendance_sessions_expires_at ON attendance_sessions(expires_at);
CREATE INDEX idx_attendance_checkins_user_id ON attendance_checkins(user_id);
CREATE INDEX idx_attendance_checkins_checked_in_at ON attendance_checkins(checked_in_at);
CREATE INDEX idx_attendance_ai_chat_logs_user_id ON attendance_ai_chat_logs(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE attendance_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_ai_chat_logs ENABLE ROW LEVEL SECURITY;

-- Attendance Users Policies
CREATE POLICY "Users can read own profile" ON attendance_users
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all profiles" ON attendance_users
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM attendance_users WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Users can insert own profile" ON attendance_users
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON attendance_users
  FOR UPDATE USING (auth.uid() = user_id);

-- Attendance Sessions Policies
CREATE POLICY "Admins can create sessions" ON attendance_sessions
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM attendance_users WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Anyone can read sessions" ON attendance_sessions
  FOR SELECT USING (true);

-- Attendance Check-ins Policies
CREATE POLICY "Users can insert own checkins" ON attendance_checkins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own checkins" ON attendance_checkins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all checkins" ON attendance_checkins
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM attendance_users WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- AI Chat Logs Policies
CREATE POLICY "Admins can manage own chat logs" ON attendance_ai_chat_logs
  FOR ALL USING (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM attendance_users WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_attendance_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_attendance_users_updated_at
  BEFORE UPDATE ON attendance_users
  FOR EACH ROW
  EXECUTE FUNCTION update_attendance_users_updated_at();

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT ALL ON attendance_users TO authenticated;
GRANT ALL ON attendance_sessions TO authenticated;
GRANT ALL ON attendance_checkins TO authenticated;
GRANT ALL ON attendance_ai_chat_logs TO authenticated;

-- ============================================================================
-- VIEW
-- ============================================================================
CREATE VIEW attendance_stats AS
SELECT 
  (SELECT COUNT(*) FROM attendance_users) as total_users,
  (SELECT COUNT(*) FROM attendance_checkins) as total_checkins,
  (SELECT COUNT(*) FROM attendance_checkins WHERE checked_in_at::date = CURRENT_DATE) as checkins_today,
  (SELECT COUNT(DISTINCT user_id) FROM attendance_checkins WHERE checked_in_at::date = CURRENT_DATE) as unique_checkins_today;

GRANT SELECT ON attendance_stats TO authenticated;

