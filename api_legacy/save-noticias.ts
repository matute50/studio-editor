import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { content } = req.body;
    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'Falta el campo "content"' });
    }

    const targetPath = path.resolve(process.cwd(), 'noticias.txt');
    fs.writeFileSync(targetPath, content, 'utf-8');

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("Error en save-noticias:", err);
    return res.status(500).json({ error: err.message || 'Unknown Server Error' });
  }
}
