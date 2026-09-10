import { parseTurkishVoiceInput } from '../utils/siriParser';

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
  source: 'gemini' | 'fallback';
  summary?: string;
}

export async function parseConversationalText(
  text: string,
  referenceDate?: string
): Promise<AIParsingResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { success: false, tasks: [], source: 'fallback' };
  }

  try {
    const res = await fetch('/api/ai-parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed, referenceDate }),
    });

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
    console.warn('AI API call failed, using client-side fallback:', error);
  }

  // Client-side instant fallback if offline or API error
  const fallbackSingle = parseTurkishVoiceInput(trimmed, referenceDate);
  return {
    success: true,
    tasks: [
      {
        title: fallbackSingle.title,
        date: fallbackSingle.date,
        time: fallbackSingle.time,
        durationMinutes: fallbackSingle.durationMinutes,
        color: '#0A84FF',
        icon: 'sparkles',
      },
    ],
    source: 'fallback',
    summary: `${fallbackSingle.title} (${fallbackSingle.date} ${fallbackSingle.time})`,
  };
}
