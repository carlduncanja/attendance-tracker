import { NextResponse } from 'next/server'
import { requireAuth, AuthenticatedRequest } from '@/src/lib/auth'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Force dynamic
export const dynamic = 'force-dynamic'

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseServiceKey)
}

function generateToken(): string {
  return crypto.randomBytes(24).toString('base64url')
}

export const POST = requireAuth(['admin'])(async (req: AuthenticatedRequest) => {
  try {
    const userId = req.userId!
    const supabaseAdmin = getSupabaseAdmin()

    // Generate a new token that expires in 185 seconds (3 minutes + 5 second buffer)
    const token = generateToken()
    const expiresAt = new Date(Date.now() + 185 * 1000).toISOString()

    // Insert the new session
    const { data: session, error } = await supabaseAdmin
      .from('attendance_sessions')
      .insert({
        token,
        created_by: userId,
        expires_at: expiresAt
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating session:', error)
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    // NOTE: Do NOT delete old sessions here - it cascades and deletes check-ins!
    // Sessions are kept for historical reference of check-ins

    return NextResponse.json({ session })
  } catch (error) {
    console.error('Error in POST /api/qr-session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const GET = requireAuth(['admin'])(async (req: AuthenticatedRequest) => {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    // Get the most recent valid session
    const { data: session, error } = await supabaseAdmin
      .from('attendance_sessions')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching session:', error)
      return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
    }

    return NextResponse.json({ session: session || null })
  } catch (error) {
    console.error('Error in GET /api/qr-session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

