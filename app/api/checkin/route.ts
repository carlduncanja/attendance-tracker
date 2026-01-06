import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Please sign in to check in' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid session, please sign in again' }, { status: 401 })
    }

    const body = await req.json()
    const { token: sessionToken } = body

    if (!sessionToken) {
      return NextResponse.json({ error: 'Missing session token' }, { status: 400 })
    }

    // Validate the session token
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('attendance_sessions')
      .select('*')
      .eq('token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ 
        error: 'QR code has expired. Please scan the current QR code.' 
      }, { status: 400 })
    }

    // Ensure user exists in attendance_users
    const { data: existingUser, error: userCheckError } = await supabaseAdmin
      .from('attendance_users')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (userCheckError && userCheckError.code === 'PGRST116') {
      // User doesn't exist, create them
      const { error: createError } = await supabaseAdmin
        .from('attendance_users')
        .insert({
          user_id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email!,
          role: 'attendee'
        })

      if (createError) {
        console.error('Error creating user:', createError)
        return NextResponse.json({ error: 'Failed to create user record' }, { status: 500 })
      }
    }

    // Check if user already checked in today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    const { data: existingCheckin } = await supabaseAdmin
      .from('attendance_checkins')
      .select('*')
      .eq('user_id', user.id)
      .gte('checked_in_at', todayISO)
      .limit(1)
      .single()

    if (existingCheckin) {
      return NextResponse.json({ 
        success: true,
        message: 'You have already checked in today',
        alreadyCheckedIn: true
      })
    }

    // Record the check-in
    const { data: checkin, error: checkinError } = await supabaseAdmin
      .from('attendance_checkins')
      .insert({
        user_id: user.id,
        session_id: session.id
      })
      .select()
      .single()

    if (checkinError) {
      console.error('Error recording check-in:', checkinError)
      return NextResponse.json({ error: 'Failed to record check-in' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      checkin,
      message: 'Successfully checked in!'
    })
  } catch (error) {
    console.error('Error in POST /api/checkin:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

