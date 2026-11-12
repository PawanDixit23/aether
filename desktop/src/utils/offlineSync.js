const OFFLINE_QUEUE_KEY = 'aether_offline_queue';

export function enqueueOfflineAction(action) {
  try {
    const existing = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    existing.push({ ...action, queuedAt: Date.now() });
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(existing.slice(-50)));
    return true;
  } catch {
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
      const res = await fetch(item.url, {
        method: item.method || 'POST',
        headers: item.headers || { 'Content-Type': 'application/json' },
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

