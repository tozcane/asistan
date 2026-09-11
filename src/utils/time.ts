import type { Task, TimelineSlot } from '../types';

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function minutesToTimeStr(totalMinutes: number): string {
  const normMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normMinutes / 60);
  const mins = normMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const startMin = parseTimeToMinutes(startTime);
  return minutesToTimeStr(startMin + durationMinutes);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} dk`;
  }
  const hours = Math.floor(minutes / 60);
  const remMins = minutes % 60;
  if (remMins === 0) {
    return `${hours} saat`;
  }
  return `${hours} sa ${remMins} dk`;
}

export function getTodayDateString(): string {
  const now = new Date();
  return formatDateString(now);
}

export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTurkishDateLabel(dateStr: string): { title: string; subtitle: string; shortTitle: string; shortSubtitle: string } {
  const [year, month, day] = dateStr.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const shortDayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cts'];
  const monthNames = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];
  const shortMonthNames = [
    'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
    'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'
  ];

  const dayName = dayNames[targetDate.getDay()];
  const shortDayName = shortDayNames[targetDate.getDay()];
  const monthName = monthNames[targetDate.getMonth()];
  const shortMonthName = shortMonthNames[targetDate.getMonth()];
  const subtitle = `${day} ${monthName} ${dayName}`;
  const shortSubtitle = `${day} ${shortMonthName} ${shortDayName}`;

  if (diffDays === 0) {
    return { title: 'Bugün', subtitle, shortTitle: 'Bugün', shortSubtitle };
  } else if (diffDays === 1) {
    return { title: 'Yarın', subtitle, shortTitle: 'Yarın', shortSubtitle };
  } else if (diffDays === -1) {
    return { title: 'Dün', subtitle, shortTitle: 'Dün', shortSubtitle };
  } else {
    return { title: dayName, subtitle, shortTitle: shortDayName, shortSubtitle };
  }
}

/**
 * Builds the Structured visual timeline.
 * Sorts tasks by startTime, finds gaps between them, and creates "Free time" slots.
 */
export function buildTimeline(tasks: Task[]): TimelineSlot[] {
  // Filter out inbox tasks and tasks without valid startTime
  const scheduledTasks = tasks.filter((t) => !t.inInbox && t.startTime);

  if (scheduledTasks.length === 0) {
    return [];
  }

  // Sort tasks by start time
  const sorted = [...scheduledTasks].sort((a, b) => {
    return parseTimeToMinutes(a.startTime!) - parseTimeToMinutes(b.startTime!);
  });

  const slots: TimelineSlot[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const curStartMin = parseTimeToMinutes(current.startTime!);
    const curEndMin = curStartMin + (current.durationMinutes || 30);

    // If there was a previous task, check if there's a free gap between them
    if (i > 0) {
      const prev = sorted[i - 1];
      const prevStartMin = parseTimeToMinutes(prev.startTime!);
      const prevEndMin = prevStartMin + (prev.durationMinutes || 30);

      // Free time gap of at least 5 minutes
      if (curStartMin > prevEndMin + 4) {
        const gapMinutes = curStartMin - prevEndMin;
        slots.push({
          type: 'free',
          startTime: minutesToTimeStr(prevEndMin),
          endTime: minutesToTimeStr(curStartMin),
          durationMinutes: gapMinutes,
          startMinutes: prevEndMin,
          endMinutes: curStartMin,
        });
      }
    }

    slots.push({
      type: 'task',
      task: current,
      startMinutes: curStartMin,
      endMinutes: curEndMin,
    });
  }

  return slots;
}
