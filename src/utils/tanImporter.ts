import type { Task } from '../types';

export interface TanEventRaw {
  id?: string;
  date?: string;
  event?: string;
  eventName?: string;
  title?: string;
  start?: number | string | null;
  end?: number | string | null;
  venue?: string;
  unit?: string;
  notes?: string;
  createdBy?: string;
  isExam?: boolean;
}

export function numberToTime(val: number | string | null | undefined): string | undefined {
  if (val === null || val === undefined || val === '') return undefined;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^([01]?\d|2[0-3]):[0-5]\d$/.test(trimmed)) {
      return trimmed.length === 4 ? `0${trimmed}` : trimmed;
    }
    const n = parseFloat(trimmed);
    if (!isNaN(n) && n >= 0 && n < 1) {
      val = n;
    } else {
      return undefined;
    }
  }
  if (typeof val === 'number') {
    const totalMinutes = Math.round(val * 1440);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return undefined;
}

export function calculateDuration(
  startStr?: string,
  endStr?: string,
  startNum?: number | string | null,
  endNum?: number | string | null
): number {
  if (
    typeof startNum === 'number' &&
    typeof endNum === 'number' &&
    endNum > startNum
  ) {
    return Math.max(15, Math.round((endNum - startNum) * 1440));
  }
  if (startStr && endStr) {
    const [sh, sm] = startStr.split(':').map(Number);
    const [eh, em] = endStr.split(':').map(Number);
    const diff = eh * 60 + em - (sh * 60 + sm);
    if (diff > 0) return diff;
  }
  return 60; // 60 dk varsayılan süre
}

export function pickColorForEvent(eventText: string, venue?: string, isExam?: boolean): string {
  const norm = (eventText + ' ' + (venue || '')).toLocaleUpperCase('tr-TR');
  if (isExam || /SINAV|DENEME|YKS|LGS|QUIZ|TOEFL|URFODU|KAZANIM/.test(norm)) {
    return '#FF9F0A'; // Turuncu (Sınav)
  }
  if (/KONFERANS|TIYATRO|GÖSTERI|TÖREN|PANEL|SEMINER/.test(norm)) {
    return '#0A84FF'; // Mavi (Konferans / Kültür)
  }
  if (/SPOR|SAHA|TURNUVA|FUTBOL|VOLEYBOL|BASKETBOL|ZUMBA/.test(norm)) {
    return '#30D158'; // Yeşil (Spor)
  }
  return '#FF453A'; // Kırmızı (Özel Etkinlik)
}

export function normalizeDate(dateStr: string): string | null {
  const trimmed = dateStr.trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  // DD.MM.YYYY
  const dotMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotMatch) {
    const [, d, m, y] = dotMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // DD/MM/YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, d, m, y] = slashMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}

export function parseTanEvents(rawText: string): Task[] {
  const trimmed = rawText.trim();
  if (!trimmed) return [];

  const tasks: Task[] = [];

  // 1. Try parsing JSON
  try {
    const parsed = JSON.parse(trimmed);
    let eventList: TanEventRaw[] = [];

    if (Array.isArray(parsed)) {
      eventList = parsed;
    } else if (parsed && Array.isArray(parsed.events)) {
      eventList = parsed.events;
    } else if (parsed && Array.isArray(parsed.records)) {
      eventList = parsed.records;
    }

    if (eventList.length > 0) {
      for (const e of eventList) {
        const title = (e.event || e.eventName || e.title || '').trim();
        if (!title) continue;

        const date = e.date ? normalizeDate(e.date) : null;
        if (!date) continue;

        const startTime = numberToTime(e.start) || '09:00';
        const endTime = numberToTime(e.end);
        const durationMinutes = calculateDuration(startTime, endTime, e.start, e.end);

        const notesParts: string[] = [];
        if (e.venue) notesParts.push(`📍 Yer: ${e.venue}`);
        if (e.unit) notesParts.push(`🎓 Kademe: ${e.unit}`);
        if (e.createdBy) notesParts.push(`👤 Sorumlu: ${e.createdBy}`);
        if (e.notes) notesParts.push(`📝 Not: ${e.notes}`);

        tasks.push({
          id: e.id || `tan-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          title,
          notes: notesParts.join('\n'),
          date,
          startTime,
          durationMinutes,
          color: pickColorForEvent(title, e.venue, e.isExam),
          completed: false,
        });
      }
      if (tasks.length > 0) {
        return tasks;
      }
    }
  } catch {
    // Not valid JSON, continue with line-by-line parsing
  }

  // 2. Line by line parsing (TSV / Tab-separated / Excel text)
  const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const parts = line.split('\t').map((p) => p.trim());
    if (parts.length >= 2) {
      // Find date part
      let foundDate: string | null = null;
      let foundTime: string | null = null;
      let textParts: string[] = [];

      for (const part of parts) {
        const d = normalizeDate(part);
        if (d && !foundDate) {
          foundDate = d;
          continue;
        }
        if (/^([01]?\d|2[0-3]):[0-5]\d$/.test(part) && !foundTime) {
          foundTime = part.length === 4 ? `0${part}` : part;
          continue;
        }
        textParts.push(part);
      }

      if (foundDate && textParts.length > 0) {
        const title = textParts[0];
        const extra = textParts.slice(1).join(' · ');
        tasks.push({
          id: `tan-txt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          title,
          notes: extra || undefined,
          date: foundDate,
          startTime: foundTime || '09:00',
          durationMinutes: 60,
          color: pickColorForEvent(title),
          completed: false,
        });
      }
    }
  }

  return tasks;
}
