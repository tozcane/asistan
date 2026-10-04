import type { Task } from '../types';
import { formatDuration } from './time';

export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );
}

export function getNotificationStatus(): {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  isIOS: boolean;
  isStandalone: boolean;
} {
  const ios = isIOS();
  const standalone = isStandalone();
  const supported = typeof window !== 'undefined' && 'Notification' in window;
  const permission = supported ? Notification.permission : 'unsupported';

  return {
    supported,
    permission,
    isIOS: ios,
    isStandalone: standalone,
  };
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('Bu tarayıcı bildirimleri desteklemiyor.');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  try {
    const result = await new Promise<NotificationPermission>((resolve) => {
      const p = Notification.requestPermission(resolve);
      if (p && typeof p.then === 'function') {
        p.then(resolve);
      }
    });
    return result;
  } catch (err) {
    console.error('Bildirim izni istenirken hata:', err);
    return Notification.permission;
  }
}

export async function sendBrowserNotification(title: string, options?: NotificationOptions) {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const notificationOptions: NotificationOptions & { vibrate?: number[] } = {
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    ...options,
  };

  // 1. Try Service Worker showNotification (Standard on iOS PWA & Android)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, notificationOptions);

        if ('vibrate' in navigator) {
          try {
            navigator.vibrate([200, 100, 200]);
          } catch {
            // ignore
          }
        }
        return;
      }
    } catch (swErr) {
      console.warn('Service worker notification failed, trying fallback:', swErr);
    }
  }

  // 2. Fallback to desktop window.Notification constructor
  try {
    new Notification(title, notificationOptions);
  } catch (err) {
    console.error('Bildirim gönderilemedi:', err);
  }
}

export function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
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

export async function testNotification(): Promise<boolean> {
  playNotificationChime();
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([200, 100, 200]);
    } catch {
      // ignore
    }
  }

  let perm: NotificationPermission = 'default';
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'default') {
      perm = await requestNotificationPermission();
    } else {
      perm = Notification.permission;
    }
  }

  if (perm === 'granted') {
    await sendBrowserNotification('🔔 Bildirimler Aktif!', {
      body: 'Harika! Telefon ve tabletinizde bildirimler başarıyla çalışıyor 🎉',
      tag: 'test-notification',
    });
    return true;
  }
  return false;
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

export function sendTaskStartNotification(task: Task) {
  playNotificationChime();
  const durationText = task.durationMinutes ? ` (${formatDuration(task.durationMinutes)})` : '';
  sendBrowserNotification(`⏰ Görev Zamanı: ${task.title}`, {
    body: `${task.startTime}${durationText} - Görevin başlama zamanı geldi!`,
    tag: `task-${task.id}`,
  });
}
