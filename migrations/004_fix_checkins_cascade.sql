-- ============================================================================
-- AI Academy Attendance - Fix Check-ins Cascade Delete
-- This migration changes the foreign key constraint on attendance_checkins
-- to prevent cascading deletes when sessions are removed
-- ============================================================================

-- First, drop the existing foreign key constraint
ALTER TABLE attendance_checkins 
DROP CONSTRAINT IF EXISTS attendance_checkins_session_id_fkey;

-- Make session_id nullable (so we can use SET NULL)
ALTER TABLE attendance_checkins 
ALTER COLUMN session_id DROP NOT NULL;

-- Re-add the foreign key with ON DELETE SET NULL instead of CASCADE
ALTER TABLE attendance_checkins 
ADD CONSTRAINT attendance_checkins_session_id_fkey 
FOREIGN KEY (session_id) 
REFERENCES attendance_sessions(id) 
ON DELETE SET NULL;

-- This ensures that when a session is deleted, the check-in record remains
-- but its session_id is set to NULL

