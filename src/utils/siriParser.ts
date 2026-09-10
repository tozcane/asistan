export interface ParsedSchedule {
  title: string;
  date: string;
  time: string;
  durationMinutes: number;
}

export function parseTurkishVoiceInput(rawText: string, defaultDateStr?: string): ParsedSchedule {
  let text = rawText.trim();
  const lower = text.toLowerCase();
  
  const now = new Date();
  let targetDate = new Date();
  if (defaultDateStr) {
    const [y, m, d] = defaultDateStr.split('-').map(Number);
    targetDate = new Date(y, m - 1, d);
  }

  let dateFound = false;

  // 1. DATE PARSING
  if (lower.includes('öbür gün') || lower.includes('öbürsü gün')) {
    targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    text = text.replace(/öbür\s*gün/gi, '').replace(/öbürsü\s*gün/gi, '');
    dateFound = true;
  } else if (lower.includes('yarın') || lower.includes('yarin')) {
    targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 1);
    text = text.replace(/yarın|yarin/gi, '');
    dateFound = true;
  } else if (lower.includes('bugün') || lower.includes('bugun')) {
    targetDate = new Date();
    text = text.replace(/bugün|bugun/gi, '');
    dateFound = true;
  } else {
    // Check month dates first: e.g. "18 eylül", "18 eylülde"
    const monthsMap: Record<string, number> = {
      'ocak': 0, 'şubat': 1, 'subat': 1, 'mart': 2, 'nisan': 3, 'mayıs': 4, 'mayis': 4,
      'haziran': 5, 'temmuz': 6, 'ağustos': 7, 'agustos': 7, 'eylül': 8, 'eylul': 8,
      'ekim': 9, 'kasım': 10, 'kasim': 10, 'aralık': 11, 'aralik': 11
    };

    for (const [monthName, mIdx] of Object.entries(monthsMap)) {
      const mRegex = new RegExp(`(\\d{1,2})\\s*${monthName}(?:['’]?(?:te|ta|de|da|e|a))?`, 'i');
      const mMatch = text.match(mRegex);
      if (mMatch) {
        const dayNum = parseInt(mMatch[1], 10);
        targetDate = new Date();
        targetDate.setMonth(mIdx);
        targetDate.setDate(dayNum);
        text = text.replace(mMatch[0], '');
        dateFound = true;
        break;
      }
    }

    if (!dateFound) {
      // Weekday names
      const daysMap: Record<string, number> = {
        'pazartesi': 1, 'salı': 2, 'sali': 2, 'çarşamba': 3, 'carsamba': 3,
        'perşembe': 4, 'persembe': 4, 'cuma': 5, 'cumartesi': 6, 'pazar': 0
      };

      for (const [dayName, dayIdx] of Object.entries(daysMap)) {
        const dRegex = new RegExp(`${dayName}(?:\\s+günü)?(?:['’]?(?:ye|ya|e|a|de|da))?`, 'i');
        const dMatch = text.match(dRegex);
        if (dMatch) {
          const currentDay = now.getDay();
          let diff = dayIdx - currentDay;
          if (diff <= 0) diff += 7; // Next occurrence
          targetDate = new Date();
          targetDate.setDate(now.getDate() + diff);
          text = text.replace(dMatch[0], '');
          dateFound = true;
          break;
        }
      }
    }
  }

  // 2. TIME PARSING
  let time = '10:00';
  let isAfternoon = false;
  let isEvening = false;
  let isMorning = false;

  if (/\bsabah\b/i.test(text)) { isMorning = true; text = text.replace(/\bsabah\b/gi, ''); }
  if (/\b(?:öğlen|öğle|öğleden\s*sonra)\b/i.test(text)) { isAfternoon = true; text = text.replace(/\b(?:öğlen|öğle|öğleden\s*sonra)\b/gi, ''); }
  if (/\bakşam\b/i.test(text)) { isEvening = true; text = text.replace(/\bakşam\b/gi, ''); }
  if (/\bgece\b/i.test(text)) { isEvening = true; text = text.replace(/\bgece\b/gi, ''); }

  // Match: saat 15:30, 15:30'da, saat 3'te, saat 15
  const timeRegex = /(?:saat\s*)?(\d{1,2})(?:[:.](\d{2}))?(?:\s*['’]?(?:da|de|ta|te|ye|ya|e|a))?/i;
  const tMatch = text.match(timeRegex);

  if (tMatch && tMatch[1]) {
    let h = parseInt(tMatch[1], 10);
    const m = tMatch[2] ? parseInt(tMatch[2], 10) : 0;

    if (isEvening && h < 12) h += 12;
    else if (isAfternoon && h < 12) h += 12;
    else if (!isMorning && h >= 1 && h <= 6) h += 12; // e.g. saat 3 -> 15:00

    if (h >= 0 && h < 24) {
      time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      text = text.replace(tMatch[0], '');
    }
  }

  // 3. TITLE CLEANUP
  text = text
    .replace(/\b(?:saat|günü|gün|için|diye|olarak|adında|adıyla|ekle|kur|planla|yaz)\b/gi, '')
    .replace(/^[,\s.:;?!'’]+|[,\s.:;?!'’]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!text) text = 'Yeni Görev';

  // Capitalize first letter
  text = text.charAt(0).toUpperCase() + text.slice(1);

  const y = targetDate.getFullYear();
  const m = String(targetDate.getMonth() + 1).padStart(2, '0');
  const d = String(targetDate.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;

  return {
    title: text,
    date: dateStr,
    time,
    durationMinutes: 60,
  };
}
