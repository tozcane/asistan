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
    sendBrowserNotification('Asistan - Günaydın! ☀️', {
      body: 'Bugün için henüz bir görev planlanmadı. Gününüzü planlamak için dokunun.',
    });
    return;
  }

  const firstTask = scheduled[0];
  const totalMinutes = scheduled.reduce((acc, t) => acc + (t.durationMinutes || 0), 0);

  sendBrowserNotification('Asistan - Günaydın! ☀️', {
    body: `Bugün seni ${count} görev bekliyor (${formatDuration(totalMinutes)}). İlk görev: ${firstTask.startTime} - ${firstTask.title}`,
  });
}
export function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // First tone (pleasant mid-high)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.25, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.28);

    // Second tone (harmonic bell chime)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.14); // A5
    gain2.gain.setValueAtTime(0, now + 0.14);
    gain2.gain.linearRampToValueAtTime(0.3, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.55);
  } catch {
    // ignore audio block until gesture
  }
}

export function sendTaskStartNotification(task: Task) {
  playNotificationChime();
  const durationText = task.durationMinutes ? ` (${formatDuration(task.durationMinutes)})` : '';
  sendBrowserNotification(`⏰ Görev Zamanı: ${task.title}`, {
    body: `${task.startTime}${durationText} - Görevin başlama zamanı geldi!`,
    tag: `task-${task.id}`,
  });
}
