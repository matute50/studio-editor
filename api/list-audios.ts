import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const targetDir = path.resolve(process.cwd(), 'audios_Ara');
    if (!fs.existsSync(targetDir)) {
      // Si la carpeta no existe en Vercel, devolver array vacío sin fallar
      return res.status(200).json({ audios: [] });
    }
    const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.mp3') || f.endsWith('.wav'));
    return res.status(200).json({ audios: files });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Unknown Server Error' });
  }
}
