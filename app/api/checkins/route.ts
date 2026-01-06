import { NextResponse } from 'next/server'
import { requireAuth, AuthenticatedRequest } from '@/src/lib/auth'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseServiceKey)
}

export const GET = requireAuth()(async (req: AuthenticatedRequest) => {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const userId = req.userId!
    const userRole = req.userRole

    let query = supabaseAdmin
      .from('attendance_checkins')
      .select('*')
      .order('checked_in_at', { ascending: false })

    // If not admin, only show own checkins
    if (userRole !== 'admin') {
      query = query.eq('user_id', userId)
    }

    const { data: checkins, error } = await query

    if (error) {
      console.error('Error fetching checkins:', error)
      return NextResponse.json({ error: 'Failed to fetch checkins' }, { status: 500 })
    }

    // For admin, enrich with user data
    if (userRole === 'admin' && checkins && checkins.length > 0) {
      const userIds = [...new Set(checkins.map(c => c.user_id))]
      const { data: users } = await supabaseAdmin
        .from('attendance_users')
        .select('user_id, full_name, email, role')
        .in('user_id', userIds)

      const userMap = new Map(users?.map(u => [u.user_id, u]) || [])
      const enrichedCheckins = checkins.map(c => ({
        ...c,
        user: userMap.get(c.user_id) || null
      }))
      return NextResponse.json({ checkins: enrichedCheckins })
    }

    return NextResponse.json({ checkins })
  } catch (error) {
    console.error('Error in GET /api/checkins:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

