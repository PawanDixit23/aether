import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://gofwnhuxtuidqaqwwkdu.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvZnduaHV4dHVpZHFhcXd3a2R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwODg5NTksImV4cCI6MjEwMzY2NDk1OX0.g2GYlazi8yNO01JGuFRJmFKXtmF--yP8YpeKthPjUec';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
