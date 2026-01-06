import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

let supabaseAdminInstance: SupabaseClient | null = null

const getSupabaseAdmin = () => {
  if (!supabaseAdminInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }
    
    supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }
  return supabaseAdminInstance
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabaseAdmin() as any)[prop]
  }
})

export interface AuthenticatedRequest extends NextRequest {
  userId?: string
  userRole?: 'admin' | 'attendee'
}

type AllowedRole = 'admin' | 'attendee'

export function requireAuth(allowedRoles?: AllowedRole[]) {
  return function (handler: (req: AuthenticatedRequest) => Promise<Response>) {
    return async function (req: NextRequest): Promise<Response> {
      try {
        // Get the authorization header
        const authHeader = req.headers.get('authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          })
        }

        const token = authHeader.substring(7)

        // Verify the token with Supabase
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

        if (error || !user) {
          return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          })
        }

        // Get the user's role from attendance_users table
        const { data: attendanceUser, error: roleError } = await supabaseAdmin
          .from('attendance_users')
          .select('role')
          .eq('user_id', user.id)
          .single()

        const userRole = attendanceUser?.role || 'attendee'

        // Check if user has required role
        if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
          return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          })
        }

        // Add user info to request
        const authenticatedReq = req as AuthenticatedRequest
        authenticatedReq.userId = user.id
        authenticatedReq.userRole = userRole

        return handler(authenticatedReq)
      } catch (error) {
        console.error('Auth error:', error)
        return new Response(JSON.stringify({ error: 'Authentication failed' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }
  }
}

