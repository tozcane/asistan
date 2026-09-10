export interface ParsedSchedule {
  title: string;
  date: string;
  time: string;
  durationMinutes: number;
  color?: string;
  icon?: string;
}

function getTurkeyDate(): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date());

  const y = parseInt(parts.find(p => p.type === 'year')!.value, 10);
  const m = parseInt(parts.find(p => p.type === 'month')!.value, 10);
  const d = parseInt(parts.find(p => p.type === 'day')!.value, 10);

  return new Date(y, m - 1, d);
}

export function parseSingleTurkishVoiceInput(rawText: string, defaultDateStr?: string): ParsedSchedule {
  let text = rawText.trim();
  const lower = text.toLowerCase();
  
  const now = getTurkeyDate();
  let targetDate = getTurkeyDate();

  if (defaultDateStr) {
    const [y, m, d] = defaultDateStr.split('-').map(Number);
    targetDate = new Date(y, m - 1, d);
  }

  let dateFound = false;

  // 1. DATE PARSING
  if (lower.includes('öbür gün') || lower.includes('öbürsü gün')) {
    targetDate = getTurkeyDate();
    targetDate.setDate(targetDate.getDate() + 2);
    text = text.replace(/öbür\s*gün/gi, '').replace(/öbürsü\s*gün/gi, '');
    dateFound = true;
  } else if (lower.includes('yarın') || lower.includes('yarin')) {
    targetDate = getTurkeyDate();
    targetDate.setDate(targetDate.getDate() + 1);
    text = text.replace(/yarın|yarin/gi, '');
    dateFound = true;
  } else if (lower.includes('bugün') || lower.includes('bugun')) {
    targetDate = getTurkeyDate();
    text = text.replace(/bugün|bugun/gi, '');
    dateFound = true;
  } else {
    // Check specific month date: "18 eylül", "18 eylülde"
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
        targetDate = getTurkeyDate();
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
          targetDate = getTurkeyDate();
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

  const timeRegex = /(?:saat\s*)?(\d{1,2})(?:[:.](\d{2}))?(?:\s*['’]?(?:da|de|ta|te|ye|ya|e|a))?/i;
  const tMatch = text.match(timeRegex);

  if (tMatch && tMatch[1]) {
    let h = parseInt(tMatch[1], 10);
    const m = tMatch[2] ? parseInt(tMatch[2], 10) : 0;

    if (isEvening && h < 12) h += 12;
    else if (isAfternoon && h < 12) h += 12;
    else if (!isMorning && h >= 1 && h <= 6) h += 12; // 3 -> 15:00

    if (h >= 0 && h < 24) {
      time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      text = text.replace(tMatch[0], '');
    }
  }

  // 3. SMART COLOR & ICON DETECTOR
  let color = '#0A84FF';
  let icon = 'sparkles';
  if (/kahve|çay|sohbet|buluş/i.test(text)) {
    color = '#FF9F0A';
    icon = 'coffee';
  } else if (/spor|koşu|antrenman|gym|fitness|yürüyüş|yüzme/i.test(text)) {
    color = '#30D158';
    icon = 'dumbbell';
  } else if (/yemek|kahvaltı|restoran|döner|pizza/i.test(text)) {
    color = '#FF9F0A';
    icon = 'utensils';
  } else if (/ders|kitap|çalış|ödev|kod|proje|toplantı|sunum|sınav/i.test(text)) {
    color = '#0A84FF';
    icon = 'book-open';
  } else if (/doktor|hastane|diş|randevu|ilaç|sağlık/i.test(text)) {
    color = '#FF453A';
    icon = 'heart';
  } else if (/market|bakkal|alışveriş|avm/i.test(text)) {
    color = '#0A84FF';
    icon = 'shopping-cart';
  }

  // 4. TITLE CLEANUP
  text = text
    .replace(/\b(?:saat|günü|gün|için|diye|olarak|adında|adıyla|ekle|kur|planla|yaz)\b/gi, '')
    .replace(/^[,\s.:;?!'’]+|[,\s.:;?!'’]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!text) text = 'Yeni Görev';

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
    color,
    icon,
  };
}

export function parseMultipleTurkishVoiceInputs(rawText: string, defaultDateStr?: string): ParsedSchedule[] {
  const trimmed = rawText.trim();
  if (!trimmed) return [];

  // Split by casual Turkish connectors without breaking "öğleden sonra"
  const connectorRegex = /(?:,\s*)?(?:\b(?<!öğleden\s*)sonra\b|\bardından\b|\bdaha\s+sonra\b|\bbir\s+de\b|\bayrıca\b)/i;
  const segments = trimmed.split(connectorRegex).map(s => s.trim()).filter(s => s.length > 2);

  if (segments.length <= 1) {
    return [parseSingleTurkishVoiceInput(trimmed, defaultDateStr)];
  }

  const results: ParsedSchedule[] = [];
  let inheritedDate = defaultDateStr;

  for (const seg of segments) {
    const parsed = parseSingleTurkishVoiceInput(seg, inheritedDate);
    inheritedDate = parsed.date; // subsequent tasks inherit the date if not mentioned
    results.push(parsed);
  }

  return results;
}

export const parseTurkishVoiceInput = parseSingleTurkishVoiceInput;
