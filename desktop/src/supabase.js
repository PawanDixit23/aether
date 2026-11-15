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
 * Returns authorization headers with current Supabase Bearer JWT token (AETH-P0-01)
 * Throws or returns typed headers; rejects silent unauthenticated mutations when requireAuth is true.
 */
export async function getAuthHeaders(options = {}) {
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
  if (options.requireAuth) {
    throw new Error('Authentication required: No active session');
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
