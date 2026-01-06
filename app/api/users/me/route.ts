import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { data: attendanceUser, error } = await supabaseAdmin
      .from('attendance_users')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user:', error)
      return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
    }

    return NextResponse.json({ user: attendanceUser || null })
  } catch (error) {
    console.error('Error in GET /api/users/me:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await req.json()
    const { full_name, email } = body

    if (!full_name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('attendance_users')
      .select('*')
      .eq('user_id', user.id)
      .single()

    let attendanceUser
    let error

    // Get request metadata for logging
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    if (existingUser) {
      // Log name change if name is different
      if (existingUser.full_name !== full_name) {
        await supabaseAdmin
          .from('attendance_name_change_logs')
          .insert({
            user_id: user.id,
            previous_name: existingUser.full_name,
            new_name: full_name,
            ip_address: ipAddress,
            user_agent: userAgent
          })
      }

      // Update existing user - preserve role
      const result = await supabaseAdmin
        .from('attendance_users')
        .update({
          full_name,
          email,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single()
      
      attendanceUser = result.data
      error = result.error
    } else {
      // Log initial name set
      await supabaseAdmin
        .from('attendance_name_change_logs')
        .insert({
          user_id: user.id,
          previous_name: null,
          new_name: full_name,
          ip_address: ipAddress,
          user_agent: userAgent
        })

      // Create new user with default role
      const result = await supabaseAdmin
        .from('attendance_users')
        .insert({
          user_id: user.id,
          full_name,
          email,
          role: 'attendee'
        })
        .select()
        .single()
      
      attendanceUser = result.data
      error = result.error
    }

    if (error) {
      console.error('Error saving user:', error)
      return NextResponse.json({ error: 'Failed to save user' }, { status: 500 })
    }

    return NextResponse.json({ user: attendanceUser })
  } catch (error) {
    console.error('Error in POST /api/users/me:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

