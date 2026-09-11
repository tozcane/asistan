import type { Task } from '../types';

const ROOM_STORAGE_KEY = 'asistan_sync_room';
const API_BASE = window.location.hostname === 'localhost' ? 'https://asistan-app.vercel.app' : '';

export function getStoredRoom(): string {
  const saved = localStorage.getItem(ROOM_STORAGE_KEY);
  if (saved && saved.trim()) return saved.trim().toLowerCase();
  // Varsayılan ortak oda: tahir (tüm cihazlar - iPad, telefon, PC - tek hesapta anında senkronize olur)
  return 'tahir';
}

export function saveStoredRoom(room: string) {
  localStorage.setItem(ROOM_STORAGE_KEY, room.trim().toLowerCase());
}

export function clearStoredRoom() {
  localStorage.removeItem(ROOM_STORAGE_KEY);
}

export async function fetchRoomTasks(room: string): Promise<{ exists: boolean; tasks: Task[] | null; updatedAt?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/sync?room=${encodeURIComponent(room.trim().toLowerCase())}`);
    if (!res.ok) throw new Error('Sunucu hatası');
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Veri çekme hatası:', error);
    throw error;
  }
}

export async function pushRoomTasks(room: string, tasks: Task[]): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        room: room.trim().toLowerCase(),
        tasks,
      }),
    });
    return res.ok;
  } catch (error) {
    console.error('Veri gönderme hatası:', error);
    return false;
  }
}
