import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client for the frontend (Sub-users interacting with the app)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'exptracker', // Updated schema name
  },
})

// Secure client for backend API routes (Master user creating accounts)
export const getServiceSupabase = () => {
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    db: {
      schema: 'exptracker', // Updated schema name
    },
  })
}