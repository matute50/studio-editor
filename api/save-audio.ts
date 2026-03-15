import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const targetDir = path.resolve(process.cwd(), 'audios_Ara');

  if (req.method === 'GET') {
    const fileName = req.query.fileName;
    if (!fileName || Array.isArray(fileName)) {
      return res.status(400).json({ error: 'Falta fileName válido' });
    }
    const fileExists = fs.existsSync(path.join(targetDir, fileName));
    return res.status(200).json({ exists: fileExists });
  }

  if (req.method === 'POST') {
    try {
      const { fileName, audioBase64 } = req.body;
      if (!fileName || !audioBase64) {
        return res.status(400).json({ error: 'Faltan campos requeridos en el body' });
      }
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const buffer = Buffer.from(audioBase64, 'base64');
      fs.writeFileSync(path.join(targetDir, fileName), buffer);
      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error("Error en save-audio:", err);
      return res.status(500).json({ error: err.message || 'Unknown Server Error' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
