import { neon } from '@neondatabase/serverless';
import { parseNaturalLanguageWithAI } from './ai-parse.js';

declare const process: any;

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
    return res.status(400).json({ 
      error: 'Metin parametresi gerekli. Örn: ?room=tahir&text=Yarın saat 14:00 Toplantı' 
    });
  }

  try {
    // Parse conversational text with Gemini AI
    const parseResult = await parseNaturalLanguageWithAI(text);
    const parsedTasks = parseResult.tasks;

    if (!parsedTasks || parsedTasks.length === 0) {
      return res.status(200).json({
        success: false,
        message: 'Üzgünüm, söylediğiniz cümleden herhangi bir görev veya saat çıkaramadım.',
      });
    }

    const rows = await sql`
      SELECT tasks FROM asistan_rooms WHERE room_name = ${room} LIMIT 1
    `;

    let currentTasks: any[] = [];
    if (rows.length > 0 && Array.isArray(rows[0].tasks)) {
      currentTasks = rows[0].tasks;
    }

    const newTasks = parsedTasks.map((pt, idx) => ({
      id: 'siri_' + Date.now() + '_' + idx,
      title: pt.title,
      startTime: pt.time,
      durationMinutes: pt.durationMinutes,
      date: pt.date,
      color: pt.color || '#0A84FF',
      icon: pt.icon || 'sparkles',
      completed: false,
    }));

    currentTasks.push(...newTasks);

    await sql`
      INSERT INTO asistan_rooms (room_name, tasks, updated_at)
      VALUES (${room}, ${JSON.stringify(currentTasks)}, NOW())
      ON CONFLICT (room_name)
      DO UPDATE SET tasks = EXCLUDED.tasks, updated_at = NOW()
    `;

    // Friendly Siri response message
    let speakableMessage = '';
    if (newTasks.length === 1) {
      const t = newTasks[0];
      speakableMessage = `✓ "${t.title}" ${t.date} saat ${t.startTime} için Asistan'a eklendi.`;
    } else {
      const titles = newTasks.map(t => `${t.startTime}'te ${t.title}`).join(', ');
      speakableMessage = `✓ ${newTasks.length} görev Asistan'a eklendi: ${titles}.`;
    }

    return res.status(200).json({
      success: true,
      message: speakableMessage,
      tasks: newTasks,
      source: parseResult.source,
    });
  } catch (error: any) {
    console.error('Siri API Error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}
