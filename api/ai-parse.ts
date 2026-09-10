declare const process: any;

export interface ParsedAITask {
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  durationMinutes: number;
  color: string;
  icon?: string;
}

function getTurkeyDateInfo(): { dateStr: string; dayName: string } {
  const now = new Date();
  const dateParts = new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
  }).formatToParts(now);

  const y = dateParts.find(p => p.type === 'year')!.value;
  const m = dateParts.find(p => p.type === 'month')!.value;
  const d = dateParts.find(p => p.type === 'day')!.value;
  const weekday = dateParts.find(p => p.type === 'weekday')!.value;

  return {
    dateStr: `${y}-${m}-${d}`,
    dayName: weekday,
  };
}

// Fallback rule-based parser in case LLM is unreachable
function localTurkishFallback(text: string, referenceDateStr: string): ParsedAITask[] {
  let cleaned = text.trim();
  const lower = cleaned.toLowerCase();

  const [y, m, d] = referenceDateStr.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d);

  if (lower.includes('öbür gün') || lower.includes('öbürsü gün')) {
    targetDate.setDate(targetDate.getDate() + 2);
    cleaned = cleaned.replace(/öbür\s*gün/gi, '').replace(/öbürsü\s*gün/gi, '');
  } else if (lower.includes('yarın') || lower.includes('yarin')) {
    targetDate.setDate(targetDate.getDate() + 1);
    cleaned = cleaned.replace(/yarın|yarin/gi, '');
  } else if (lower.includes('bugün') || lower.includes('bugun')) {
    cleaned = cleaned.replace(/bugün|bugun/gi, '');
  }

  let time = '10:00';
  let isAfternoon = false;
  let isEvening = false;
  let isMorning = false;

  if (/\bsabah\b/i.test(cleaned)) { isMorning = true; cleaned = cleaned.replace(/\bsabah\b/gi, ''); }
  if (/\b(?:öğlen|öğle|öğleden\s*sonra)\b/i.test(cleaned)) { isAfternoon = true; cleaned = cleaned.replace(/\b(?:öğlen|öğle|öğleden\s*sonra)\b/gi, ''); }
  if (/\b(?:akşam|gece)\b/i.test(cleaned)) { isEvening = true; cleaned = cleaned.replace(/\b(?:akşam|gece)\b/gi, ''); }

  const timeRegex = /(?:saat\s*)?(\d{1,2})(?:[:.](\d{2}))?(?:\s*['’]?(?:da|de|ta|te|ye|ya|e|a))?/i;
  const tMatch = cleaned.match(timeRegex);

  if (tMatch && tMatch[1]) {
    let h = parseInt(tMatch[1], 10);
    const min = tMatch[2] ? parseInt(tMatch[2], 10) : 0;
    if (isEvening && h < 12) h += 12;
    else if (isAfternoon && h < 12) h += 12;
    else if (!isMorning && h >= 1 && h <= 6) h += 12;

    if (h >= 0 && h < 24) {
      time = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      cleaned = cleaned.replace(tMatch[0], '');
    }
  }

  cleaned = cleaned
    .replace(/\b(?:saat|günü|gün|için|diye|olarak|adında|adıyla|ekle|kur|planla|yaz)\b/gi, '')
    .replace(/^[,\s.:;?!'’]+|[,\s.:;?!'’]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!cleaned) cleaned = 'Yeni Görev';
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

  const outY = targetDate.getFullYear();
  const outM = String(targetDate.getMonth() + 1).padStart(2, '0');
  const outD = String(targetDate.getDate()).padStart(2, '0');

  return [
    {
      title: cleaned,
      date: `${outY}-${outM}-${outD}`,
      time,
      durationMinutes: 60,
      color: '#0A84FF',
      icon: 'sparkles',
    },
  ];
}

export async function parseNaturalLanguageWithAI(
  userText: string,
  clientRefDate?: string
): Promise<{ tasks: ParsedAITask[]; source: 'gemini' | 'fallback'; summary: string }> {
  const { dateStr: todayDateStr, dayName: todayDayName } = getTurkeyDateInfo();
  const referenceDate = clientRefDate || todayDateStr;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const fallbackTasks = localTurkishFallback(userText, referenceDate);
    return {
      tasks: fallbackTasks,
      source: 'fallback',
      summary: fallbackTasks.map(t => `${t.title} (${t.date} ${t.time})`).join(', '),
    };
  }

  const systemInstruction = `Sen Asistan/Structured uygulamasının Türkçe doğal dil anlama motorusun.
Kullanıcı seninle günlük samimi dilde, sesli asistan (Siri) ile konuşur gibi konuşacak ("Dostum yarın öğleden sonra 3'te Tahirle kahve içeriz, akşam da 7'de eve geçip ders çalışmam lazım" vb.).
Görevin bu konuşmadan tüm görevleri, planları ve buluşmaları tespit edip saf JSON array olarak çıkarmaktır.

Referans Bugünün Tarihi: ${referenceDate} (${todayDayName}).

Çıktı Formatı:
JSON array olmalı:
[
  {
    "title": "Görev Başlığı (kısa, şık, Türkçe, konuşma dolgularından arındırılmış)",
    "date": "YYYY-MM-DD",
    "time": "HH:mm",
    "durationMinutes": 60,
    "color": "#0A84FF" | "#FF9F0A" | "#30D158" | "#FF453A",
    "icon": "coffee" | "dumbbell" | "book-open" | "briefcase" | "shopping-cart" | "utensils" | "sparkles" | "sun" | "moon" | "heart"
  }
]

Önemli Kurallar:
1. Tarih çözümleme: "bugün", "yarın", "öbür gün", "pazartesi", "haftaya cuma", "18 eylül" gibi ifadeleri referans tarihe (${referenceDate}) göre kesin "YYYY-MM-DD" formatına çevir.
2. Saat çözümleme: 24 saatlik format "HH:mm" olmalı ("öğleden sonra 3" -> "15:00", "akşam 8" -> "20:00", "sabah 9 buçuk" -> "09:30"). Eğer saat hiç geçmiyorsa ve gün içi ima ediliyorsa (sabah: 09:00, öğlen: 14:00, akşam: 19:00, gece: 21:30, belirsiz: 10:00) ata.
3. Birden fazla görev varsa ("sonra", "ardından", "ve", "bir de", "ayrıca" gibi bağlaçlarla bağlananlar) her birini ayrı bir obje olarak diziye ekle.
4. Renk seçimi:
   - "#0A84FF" (Mavi): İş, ders, toplantı, resmi işler, odaklanma
   - "#30D158" (Yeşil): Spor, yürüyüş, sağlık, antrenman, doğa
   - "#FF9F0A" (Turuncu): Kahve, sosyalleşme, eğlence, mola, podcast
   - "#FF453A" (Kırmızı): Kritik randevu, doktor, acil işler
5. Sadece ve sadece geçerli JSON array döndür.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          parts: [{ text: userText }],
        },
      ],
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn('Gemini API returned error status:', response.status);
      const fallbackTasks = localTurkishFallback(userText, referenceDate);
      return {
        tasks: fallbackTasks,
        source: 'fallback',
        summary: fallbackTasks.map(t => `${t.title} (${t.date} ${t.time})`).join(', '),
      };
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    
    let parsedJson: any;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\[\s*\{.*\}\s*\]/s);
      if (match) {
        parsedJson = JSON.parse(match[0]);
      } else {
        throw new Error('Could not parse JSON from model output');
      }
    }

    const taskArray: any[] = Array.isArray(parsedJson)
      ? parsedJson
      : Array.isArray(parsedJson.tasks)
      ? parsedJson.tasks
      : [parsedJson];

    const validTasks: ParsedAITask[] = taskArray
      .filter(t => t && typeof t.title === 'string' && t.title.trim().length > 0)
      .map(t => ({
        title: String(t.title).trim(),
        date: /^\d{4}-\d{2}-\d{2}$/.test(t.date) ? t.date : referenceDate,
        time: /^\d{2}:\d{2}$/.test(t.time) ? t.time : '10:00',
        durationMinutes: typeof t.durationMinutes === 'number' && t.durationMinutes > 0 ? t.durationMinutes : 60,
        color: typeof t.color === 'string' && t.color.startsWith('#') ? t.color : '#0A84FF',
        icon: typeof t.icon === 'string' ? t.icon : 'sparkles',
      }));

    if (validTasks.length === 0) {
      const fallbackTasks = localTurkishFallback(userText, referenceDate);
      return {
        tasks: fallbackTasks,
        source: 'fallback',
        summary: fallbackTasks.map(t => `${t.title} (${t.date} ${t.time})`).join(', '),
      };
    }

    const summary = validTasks.map(t => `"${t.title}" (${t.date} ${t.time})`).join(', ');

    return {
      tasks: validTasks,
      source: 'gemini',
      summary,
    };
  } catch (err) {
    console.error('Gemini error, using fallback:', err);
    const fallbackTasks = localTurkishFallback(userText, referenceDate);
    return {
      tasks: fallbackTasks,
      source: 'fallback',
      summary: fallbackTasks.map(t => `${t.title} (${t.date} ${t.time})`).join(', '),
    };
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const text = (req.method === 'POST' ? req.body?.text : req.query?.text) || '';
  const refDate = (req.method === 'POST' ? req.body?.referenceDate : req.query?.date) || '';

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Metin (text) parametresi gerekli' });
  }

  try {
    const result = await parseNaturalLanguageWithAI(text.trim(), refDate);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('AI Parse API handler error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}
