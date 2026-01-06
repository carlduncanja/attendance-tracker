export interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string
  provider?: string
  createdAt?: string
  lastSignInAt?: string
}

export interface AttendanceUser {
  user_id: string
  full_name: string
  email: string
  role: 'admin' | 'attendee'
  created_at: string
  updated_at: string
}

export interface AttendanceSession {
  id: string
  token: string
  created_by: string
  expires_at: string
  created_at: string
}

export interface AttendanceCheckin {
  id: string
  user_id: string
  session_id: string
  checked_in_at: string
  user?: AttendanceUser
}

export interface AttendanceStats {
  total_users: number
  total_checkins: number
  checkins_today: number
  unique_checkins_today: number
}

