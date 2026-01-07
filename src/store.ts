import { create } from "zustand"
import type { User, AttendanceUser, AttendanceSession, AttendanceCheckin } from "./types"
import { supabase, handleAuthError } from "@/lib/supabase"

interface StoreState {
  user?: User
  attendanceUser?: AttendanceUser | null
  auth: {
    isLoading: boolean
    isAuthenticated: boolean
  }
  currentSession?: AttendanceSession | null
  checkins: AttendanceCheckin[]
  
  // Role simulation for admins
  simulatedRole: 'admin' | 'attendee' | null
  
  // Actions
  initializeAuth: () => Promise<void>
  loadAttendanceUser: (userId: string) => Promise<void>
  signInWithGoogle: (redirectTo?: string) => Promise<void>
  signOut: () => Promise<void>
  createOrUpdateUser: (userData: { full_name: string; email: string }) => Promise<void>
  generateQRSession: () => Promise<AttendanceSession | null>
  validateAndCheckin: (token: string) => Promise<{ success: boolean; error?: string; alreadyCheckedIn?: boolean }>
  loadCheckins: () => Promise<void>
  setSimulatedRole: (role: 'admin' | 'attendee' | null) => void
  getEffectiveRole: () => 'admin' | 'attendee'
}

let authListenerRegistered = false
let authInitializing = false

export const useStore = create<StoreState>((set, get) => {
  // Register auth state change listener only once
  if (!authListenerRegistered && typeof window !== 'undefined') {
    authListenerRegistered = true
    
    supabase.auth.onAuthStateChange((event, session) => {
      try {
        if (event === 'SIGNED_IN' && session?.user) {
          const currentState = get()
          
          if (!currentState.user || currentState.user.id !== session.user.id) {
            const user: User = {
              id: session.user.id,
              name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
              email: session.user.email!,
              avatarUrl: session.user.user_metadata?.avatar_url,
              provider: session.user.app_metadata?.provider,
              createdAt: session.user.created_at,
              lastSignInAt: session.user.last_sign_in_at
            }
            
            set({
              user,
              auth: { isLoading: false, isAuthenticated: true }
            })

            // Load attendance user data
            get().loadAttendanceUser(session.user.id)
          }
        } else if (event === 'SIGNED_OUT') {
          set({
            user: undefined,
            attendanceUser: undefined,
            checkins: [],
            auth: { isLoading: false, isAuthenticated: false }
          })
        }
      } catch (error) {
        console.error('Auth state change error:', error)
        if (error instanceof Error && error.message.includes('refresh token')) {
          supabase.auth.signOut()
          set({
            user: undefined,
            attendanceUser: undefined,
            checkins: [],
            auth: { isLoading: false, isAuthenticated: false }
          })
        }
      }
    })
  }

  return {
    user: undefined,
    attendanceUser: undefined,
    auth: {
      isLoading: true,
      isAuthenticated: false,
    },
    currentSession: undefined,
    checkins: [],
    simulatedRole: null,
    
    initializeAuth: async () => {
      const currentState = get()
      
      if (currentState.user && currentState.auth.isAuthenticated) {
        return
      }
      
      if (authInitializing) {
        return
      }
      
      authInitializing = true
      set({ auth: { isLoading: true, isAuthenticated: false } })

      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          if (error.message?.includes('refresh token') || error.message?.includes('Invalid Refresh Token')) {
            await supabase.auth.signOut()
            set({
              user: undefined,
              attendanceUser: undefined,
              auth: { isLoading: false, isAuthenticated: false }
            })
            return
          }
          throw error
        }

        if (session?.user) {
          const user: User = {
            id: session.user.id,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            email: session.user.email!,
            avatarUrl: session.user.user_metadata?.avatar_url,
            provider: session.user.app_metadata?.provider,
            createdAt: session.user.created_at,
            lastSignInAt: session.user.last_sign_in_at
          }

          set({
            user,
            auth: { isLoading: false, isAuthenticated: true }
          })

          await get().loadAttendanceUser(session.user.id)
        } else {
          set({
            user: undefined,
            attendanceUser: undefined,
            auth: { isLoading: false, isAuthenticated: false }
          })
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        set({ 
          auth: { isLoading: false, isAuthenticated: false }
        })
      } finally {
        authInitializing = false
      }
    },

    loadAttendanceUser: async (userId: string) => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          set({ attendanceUser: null })
          return
        }

        const response = await fetch('/api/users/me', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (!response.ok) {
          set({ attendanceUser: null })
          return
        }

        const { user } = await response.json()
        set({ attendanceUser: user })
      } catch (error) {
        console.error('Error loading attendance user:', error)
        set({ attendanceUser: null })
      }
    },

    signInWithGoogle: async (redirectTo?: string) => {
      set({ auth: { isLoading: true, isAuthenticated: false } })

      try {
        // Store the intended redirect destination for after auth completes
        if (redirectTo && typeof window !== 'undefined') {
          sessionStorage.setItem('auth_redirect', redirectTo)
        }
        
        // Use the auth callback route to properly handle the OAuth response
        const callbackUrl = `https://attendance.intellibus.academy/auth/callback${redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : ''}`
        
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: callbackUrl,
          }
        })
      } catch (error) {
        console.error('Google sign-in error:', error)
        set({ auth: { isLoading: false, isAuthenticated: false } })
        throw error
      }
    },

    signOut: async () => {
      try {
        await supabase.auth.signOut()
      } catch (error) {
        console.error('Sign out error:', error)
      }
      
      set({
        user: undefined,
        attendanceUser: undefined,
        checkins: [],
        auth: { isLoading: false, isAuthenticated: false }
      })
    },

    createOrUpdateUser: async (userData) => {
      try {
        const { user } = get()
        if (!user) throw new Error('No authenticated user')

        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          throw new Error('No access token available')
        }

        const response = await fetch('/api/users/me', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userData),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create/update user')
        }

        const { user: updatedUser } = await response.json()
        set({ attendanceUser: updatedUser })
      } catch (error) {
        console.error('Error creating/updating user:', error)
        throw error
      }
    },

    generateQRSession: async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          throw new Error('No access token available')
        }

        const response = await fetch('/api/qr-session', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to generate QR session')
        }

        const { session: qrSession } = await response.json()
        set({ currentSession: qrSession })
        return qrSession
      } catch (error) {
        console.error('Error generating QR session:', error)
        return null
      }
    },

    validateAndCheckin: async (token: string) => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          return { success: false, error: 'Please sign in first' }
        }

        const response = await fetch('/api/checkin', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        })

        const data = await response.json()

        if (!response.ok) {
          return { success: false, error: data.error || 'Check-in failed' }
        }

        return { success: true }
      } catch (error) {
        console.error('Error during check-in:', error)
        return { success: false, error: 'An error occurred during check-in' }
      }
    },

    loadCheckins: async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          return
        }

        const response = await fetch('/api/checkins', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (!response.ok) {
          console.error('Error loading checkins')
          return
        }

        const { checkins } = await response.json()
        set({ checkins })
      } catch (error) {
        console.error('Error loading checkins:', error)
      }
    },

    setSimulatedRole: (role) => {
      set({ simulatedRole: role })
    },

    getEffectiveRole: () => {
      const { attendanceUser, simulatedRole } = get()
      // Only admins can simulate roles
      if (attendanceUser?.role === 'admin' && simulatedRole) {
        return simulatedRole
      }
      return attendanceUser?.role || 'attendee'
    },
  }
})

