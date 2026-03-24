import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const loc = req.query.location?.toString() ?? 'estudio';
    const targetPrefix = loc === 'estudio' ? 'vestuario_de_hoy_estudio/' : 'vestuario_de_hoy_exteriores/';
    const paths: string[] = [];
    for (let i = 1; i <= 30; i++) {
        paths.push(`https://media.saladillovivo.com.ar/${targetPrefix}${String(i).padStart(2, '0')}.png`);
    }
    return res.status(200).json({ paths });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Unknown Server Error' });
  }
}
