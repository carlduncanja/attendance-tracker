import { NextResponse } from 'next/server'
import { requireAuth, AuthenticatedRequest } from '@/src/lib/auth'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseServiceKey)
}

export const GET = requireAuth(['admin'])(async (req: AuthenticatedRequest) => {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    // Get total users
    const { count: totalUsers } = await supabaseAdmin
      .from('attendance_users')
      .select('*', { count: 'exact', head: true })

    // Get total checkins
    const { count: totalCheckins } = await supabaseAdmin
      .from('attendance_checkins')
      .select('*', { count: 'exact', head: true })

    // Get checkins today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    const { count: checkinsToday } = await supabaseAdmin
      .from('attendance_checkins')
      .select('*', { count: 'exact', head: true })
      .gte('checked_in_at', todayISO)

    // Get unique checkins today
    const { data: uniqueCheckinsData } = await supabaseAdmin
      .from('attendance_checkins')
      .select('user_id')
      .gte('checked_in_at', todayISO)

    const uniqueCheckinsToday = new Set(uniqueCheckinsData?.map(c => c.user_id)).size

    return NextResponse.json({
      stats: {
        total_users: totalUsers || 0,
        total_checkins: totalCheckins || 0,
        checkins_today: checkinsToday || 0,
        unique_checkins_today: uniqueCheckinsToday
      }
    })
  } catch (error) {
    console.error('Error in GET /api/stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

