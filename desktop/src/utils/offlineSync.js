/**
 * Aether Offline-First Synchronization Subsystem (AETH-REL-04)
 * Generates unique client_mutation_id UUIDs for idempotency and prevents duplicate mutations.
 */

const OFFLINE_QUEUE_KEY = 'aether_offline_queue';

function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'mut_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
}

export function enqueueOfflineAction(action) {
  try {
    const existing = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    const mutationId = action.clientMutationId || generateUUID();
    const headers = {
      ...(action.headers || {}),
      'Content-Type': 'application/json',
      'X-Client-Mutation-Id': mutationId,
    };

    existing.push({
      ...action,
      clientMutationId: mutationId,
      headers,
      queuedAt: Date.now(),
      lastModifiedAt: new Date().toISOString(),
    });

    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(existing.slice(-100)));
    return true;
  } catch (e) {
    console.warn('[enqueueOfflineAction error]', e);
    return false;
  }
}

export async function flushOfflineQueue() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 0;
  let queue = [];
  try {
    queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
  } catch {
    return 0;
  }
  if (!Array.isArray(queue) || queue.length === 0) return 0;

  const remaining = [];
  let syncedCount = 0;
  for (const item of queue) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(item.headers || {}),
        'X-Client-Mutation-Id': item.clientMutationId || generateUUID(),
      };

      const res = await fetch(item.url, {
        method: item.method || 'POST',
        headers,
        body: item.body ? JSON.stringify(item.body) : undefined,
      });

      if (res.ok || res.status < 500) {
        syncedCount += 1;
      } else {
        remaining.push(item);
      }
    } catch {
      remaining.push(item);
    }
  }

  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
  } catch {}
  return syncedCount;
}
