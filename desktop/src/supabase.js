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
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;

  if (session?.access_token) {
    return {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };
  }

  if (options.requireAuth) {
    throw new Error('Authentication required: No active Supabase session');
  }
  return { 'Content-Type': 'application/json' };
}

/**
 * Central API fetch wrapper for Aether backend requests.
 * Always attaches the current Supabase access token when a session exists.
 * Removes the legacy X-User-Email identity header; email is not authentication.
 */
export async function apiFetch(input, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.delete('X-User-Email');

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (session?.access_token) {
      headers.set('Authorization', `Bearer ${session.access_token}`);
    }
  } catch (err) {
    console.warn('[apiFetch] Unable to retrieve Supabase session:', err);
  }

  return fetch(input, { ...options, headers });
}

export async function getAuthToken() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}
