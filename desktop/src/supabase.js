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
// Share only identical in-flight, authenticated GET requests within this browser/WebView.
// This prevents duplicate dashboard effects from issuing the same database read concurrently.
// There is deliberately no completed-response cache: writes are visible to the next GET.
const inFlightApiGets = new Map();

function responseFromSnapshot(snapshot) {
  const noBodyStatus = [204, 205, 304].includes(snapshot.status);
  return new Response(
    noBodyStatus ? null : snapshot.body.slice(0),
    {
      status: snapshot.status,
      statusText: snapshot.statusText,
      headers: snapshot.headers,
    }
  );
}

export async function apiFetch(input, options = {}) {
  const headers = new Headers(options.headers || (input instanceof Request ? input.headers : undefined));
  headers.delete('X-User-Email');

  let accessToken = null;
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    accessToken = session?.access_token || null;
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }
  } catch (err) {
    console.warn('[apiFetch] Unable to retrieve Supabase session:', err);
  }

  const method = String(options.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const requestUrl = String(input instanceof Request ? input.url : input);
  const isApiRequest = /(?:^|\/)api\//i.test(requestUrl);
  const isStreamingOrLarge = \/(?:tts|audio|stream|download|export)(?:[/?]|$)/i.test(requestUrl);
  const canDeduplicate = method === 'GET'
    && isApiRequest
    && !isStreamingOrLarge
    && !options.signal
    && !headers.has('Range')
    && options.cache !== 'no-store';

  if (!canDeduplicate) {
    return fetch(input, { ...options, headers });
  }

  const headerKey = Array.from(headers.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `${name}:${value}`)
    .join('\n');
  const requestKey = `${requestUrl}\n${method}\n${headerKey}`;

  let pendingSnapshot = inFlightApiGets.get(requestKey);
  if (!pendingSnapshot) {
    pendingSnapshot = fetch(input, { ...options, headers }).then(async response => ({
      status: response.status,
      statusText: response.statusText,
      headers: Array.from(response.headers.entries()),
      body: await response.arrayBuffer(),
    }));
    inFlightApiGets.set(requestKey, pendingSnapshot);
  }

  try {
    return responseFromSnapshot(await pendingSnapshot);
  } finally {
    if (inFlightApiGets.get(requestKey) === pendingSnapshot) {
      inFlightApiGets.delete(requestKey);
    }
  }
}

export async function getAuthToken() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}
