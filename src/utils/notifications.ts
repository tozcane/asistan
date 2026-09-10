import type { Task } from '../types';
import { formatDuration } from './time';

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Bu tarayıcı masaüstü bildirimlerini desteklemiyor.');
    return 'denied';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  return await Notification.requestPermission();
}

export function sendBrowserNotification(title: string, options?: NotificationOptions) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  try {
    new Notification(title, {
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      ...options,
    });
  } catch (err) {
    console.error('Bildirim gönderilirken hata:', err);
  }
}

export function sendMorningSummaryNotification(tasks: Task[]) {
  const scheduled = tasks.filter((t) => !t.inInbox && t.startTime);
  const count = scheduled.length;

  if (count === 0) {
    sendBrowserNotification('Structured - Günaydın! ☀️', {
      body: 'Bugün için henüz bir görev planlanmadı. Gününüzü planlamak için dokunun.',
    });
    return;
  }

  const firstTask = scheduled[0];
  const totalMinutes = scheduled.reduce((acc, t) => acc + (t.durationMinutes || 0), 0);

  sendBrowserNotification('Structured - Günaydın! ☀️', {
    body: `Bugün seni ${count} görev bekliyor (${formatDuration(totalMinutes)}). İlk görev: ${firstTask.startTime} - ${firstTask.title}`,
  });
}
