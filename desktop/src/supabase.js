import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://dwyiledlboolxywizkbm.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_GzA-KyYiHEu53vqO6FtMMg_AbwDnkph';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Returns authorization headers with current Supabase Bearer JWT token (AETH-SEC-01 & AETH-SEC-08)
 */
export async function getAuthHeaders() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.access_token) {
      return {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };
    }
  } catch (err) {
    console.warn('[getAuthHeaders error]', err);
  }
  return { 'Content-Type': 'application/json' };
}

export async function getAuthToken() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}
