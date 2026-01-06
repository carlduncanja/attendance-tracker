import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

export const getSupabaseClient = () => {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables')
    }
    
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
  }
  return supabaseInstance
}

// For backward compatibility - lazy getter
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabaseClient() as any)[prop]
  }
})

// Handle auth errors - returns true if error was handled (session invalid)
export function handleAuthError(error: any): boolean {
  if (error?.message?.includes('refresh_token') || 
      error?.message?.includes('Invalid Refresh Token') ||
      error?.code === 'PGRST301') {
    console.log('Auth error detected, clearing session')
    supabase.auth.signOut()
    return true
  }
  return false
}

