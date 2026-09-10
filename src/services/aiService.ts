import { parseMultipleTurkishVoiceInputs } from '../utils/siriParser';

export interface ParsedAITask {
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  durationMinutes: number;
  color: string;
  icon?: string;
}

export interface AIParsingResult {
  success: boolean;
  tasks: ParsedAITask[];
  source: 'gemini' | 'offline' | 'fallback';
  summary?: string;
}

export async function parseConversationalText(
  text: string,
  referenceDate?: string
): Promise<AIParsingResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { success: false, tasks: [], source: 'offline' };
  }

  // 1. If device is completely offline, immediately parse on-device without waiting for network!
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const offlineTasks = parseMultipleTurkishVoiceInputs(trimmed, referenceDate);
    return {
      success: true,
      tasks: offlineTasks.map(t => ({
        title: t.title,
        date: t.date,
        time: t.time,
        durationMinutes: t.durationMinutes,
        color: t.color || '#0A84FF',
        icon: t.icon || 'sparkles',
      })),
      source: 'offline',
      summary: offlineTasks.map(t => `${t.title} (${t.date} ${t.time})`).join(', '),
    };
  }

  // 2. Try online Gemini AI parse
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout before falling back to on-device

    const res = await fetch('/api/ai-parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed, referenceDate }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.tasks) && data.tasks.length > 0) {
        return {
          success: true,
          tasks: data.tasks,
          source: data.source || 'gemini',
          summary: data.summary,
        };
      }
    }
  } catch (error) {
    console.warn('Online AI parse failed or timed out, switching to instant on-device parser:', error);
  }

  // 3. Fallback on-device multi-task parser
  const offlineTasks = parseMultipleTurkishVoiceInputs(trimmed, referenceDate);
  return {
    success: true,
    tasks: offlineTasks.map(t => ({
      title: t.title,
      date: t.date,
      time: t.time,
      durationMinutes: t.durationMinutes,
      color: t.color || '#0A84FF',
      icon: t.icon || 'sparkles',
    })),
    source: 'offline',
    summary: offlineTasks.map(t => `${t.title} (${t.date} ${t.time})`).join(', '),
  };
}
