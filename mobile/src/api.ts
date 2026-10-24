import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_SERVER_URL = 'http://192.168.1.2:8000';
const STORAGE_KEY_SERVER_URL = 'aether_server_url';

export async function getServerUrl(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY_SERVER_URL);
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/$/, '');
    }
  } catch (e) {
    console.log('Error reading server URL from storage:', e);
  }
  return DEFAULT_SERVER_URL;
}

export async function setServerUrl(url: string): Promise<void> {
  const clean = url.trim().replace(/\/$/, '');
  await AsyncStorage.setItem(STORAGE_KEY_SERVER_URL, clean);
}

export async function checkServerHealth(url?: string): Promise<boolean> {
  try {
    const base = url || (await getServerUrl());
    const res = await fetch(`${base}/api/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchBriefing() {
  const base = await getServerUrl();
  const res = await fetch(`${base}/api/briefing`);
  if (!res.ok) throw new Error('Failed to fetch briefing');
  return res.json();
}

export async function fetchTasks() {
  const base = await getServerUrl();
  const res = await fetch(`${base}/api/tasks`);
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
}

export async function createTask(title: string, priority: string = 'medium', reminder_time?: string) {
  const base = await getServerUrl();
  const res = await fetch(`${base}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, priority, reminder_time })
  });
  if (!res.ok) throw new Error('Failed to create task');
  return res.json();
}

export async function toggleTask(taskId: number) {
  const base = await getServerUrl();
  const res = await fetch(`${base}/api/tasks/${taskId}/toggle`, { method: 'PUT' });
  if (!res.ok) throw new Error('Failed to toggle task');
  return res.json();
}

export async function deleteTask(taskId: number) {
  const base = await getServerUrl();
  const res = await fetch(`${base}/api/tasks/${taskId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete task');
  return res.json();
}

export async function sendPromptToAether(input_text: string, language: string = 'auto') {
  const base = await getServerUrl();
  const res = await fetch(`${base}/api/action/quick-capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input_text,
      language,
      client_time: new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' }),
      timezone: 'Asia/Kolkata'
    })
  });
  if (!res.ok) throw new Error('Failed to send prompt');
  return res.json();
}

export async function fetchChatHistory() {
  const base = await getServerUrl();
  const res = await fetch(`${base}/api/chat/history`);
  if (!res.ok) throw new Error('Failed to fetch chat history');
  return res.json();
}

export async function fetchDueReminders() {
  const base = await getServerUrl();
  const res = await fetch(`${base}/api/reminders/due`);
  if (!res.ok) return [];
  return res.json();
}

export async function acknowledgeReminder(taskId: number) {
  const base = await getServerUrl();
  await fetch(`${base}/api/reminders/${taskId}/ack`, { method: 'POST' });
}
