import { neon } from '@neondatabase/serverless';

declare const process: any;

function parseTurkishVoice(text: string): { title: string; time: string; duration: number } {
  let title = text.trim();
  let time = '10:00';
  let duration = 60;

  // Regex to match "saat 14:30", "14:30'da", "saat 15'te", "saat 3'te"
  const timeRegex = /(?:saat\s*)?(\d{1,2})(?::(\d{2}))?(?:\s*(?:'|’)?(?:da|de|ta|te|da|de))?/i;
  const match = title.match(timeRegex);

  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    
    // If hour < 7, likely afternoon (e.g., saat 3 -> 15:00)
    if (hours < 7 && !title.toLowerCase().includes('sabah')) {
      hours += 12;
    }

    const padH = String(hours).padStart(2, '0');
    const padM = String(minutes).padStart(2, '0');
    time = `${padH}:${padM}`;

    // Clean up title
    title = title.replace(match[0], '').replace(/saat/gi, '').trim();
  }

  if (!title) title = 'Yeni Görev';

  return { title, time, duration };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return res.status(500).json({ error: 'Database URL not configured' });
  }

  const sql = neon(databaseUrl);

  const room = (req.query?.room || req.body?.room || 'tahir').trim().toLowerCase();
  const text = (req.query?.text || req.body?.text || '').trim();

  if (!text) {
    return res.status(400).json({ error: 'Metin (text) parametresi gerekli. Örn: ?room=tahir&text=Saat 14:00 Toplantı' });
  }

  const parsed = parseTurkishVoice(text);
  const today = new Date().toISOString().split('T')[0];

  const newTask = {
    id: 'siri_' + Date.now(),
    title: parsed.title,
    startTime: parsed.time,
    durationMinutes: parsed.duration,
    date: today,
    color: '#0A84FF',
    icon: 'sparkles',
    completed: false,
  };

  try {
    const rows = await sql`
      SELECT tasks FROM asistan_rooms WHERE room_name = ${room} LIMIT 1
    `;

    let currentTasks: any[] = [];
    if (rows.length > 0 && Array.isArray(rows[0].tasks)) {
      currentTasks = rows[0].tasks;
    }

    currentTasks.push(newTask);

    await sql`
      INSERT INTO asistan_rooms (room_name, tasks, updated_at)
      VALUES (${room}, ${JSON.stringify(currentTasks)}, NOW())
      ON CONFLICT (room_name)
      DO UPDATE SET tasks = EXCLUDED.tasks, updated_at = NOW()
    `;

    return res.status(200).json({
      success: true,
      message: `"${parsed.title}" görevi saat ${parsed.time}'a eklendi!`,
      task: newTask,
    });
  } catch (error: any) {
    console.error('Siri API Error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}
