import { neon } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return res.status(500).json({ error: 'Database URL not configured' });
  }

  const sql = neon(databaseUrl);

  try {
    if (req.method === 'GET') {
      const room = ((req.query?.room as string) || '').trim().toLowerCase();
      if (!room) {
        return res.status(400).json({ error: 'Oda ismi gerekli' });
      }

      const rows = await sql`
        SELECT room_name, tasks, updated_at
        FROM asistan_rooms
        WHERE room_name = ${room}
        LIMIT 1
      `;

      if (rows.length === 0) {
        return res.status(200).json({ exists: false, tasks: null });
      }

      return res.status(200).json({
        exists: true,
        tasks: rows[0].tasks,
        updatedAt: rows[0].updated_at,
      });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const room = (body?.room || '').trim().toLowerCase();
      const tasks = body?.tasks;

      if (!room) {
        return res.status(400).json({ error: 'Oda ismi gerekli' });
      }
      if (!Array.isArray(tasks)) {
        return res.status(400).json({ error: 'Geçersiz görev listesi' });
      }

      await sql`
        INSERT INTO asistan_rooms (room_name, tasks, updated_at)
        VALUES (${room}, ${JSON.stringify(tasks)}, NOW())
        ON CONFLICT (room_name)
        DO UPDATE SET tasks = EXCLUDED.tasks, updated_at = NOW()
      `;

      return res.status(200).json({ success: true, room });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Sync error:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}
