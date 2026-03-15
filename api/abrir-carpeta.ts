import type { VercelRequest, VercelResponse } from '@vercel/node';

const R2_ACCOUNT_ID = '3f11be5ae3d34a83cf63343662eec80e';
const R2_BUCKET_NAME = 'saladillovivo-media';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { location } = req.body as { location: 'estudio' | 'exteriores' };
    const prefix = location === 'estudio' ? 'vestuario_estudio%2F' : 'vestuario_exteriores%2F';
    const url = `https://dash.cloudflare.com/${R2_ACCOUNT_ID}/r2/default/buckets/${R2_BUCKET_NAME}/objects?prefix=${prefix}`;
    
    // In Vercel, we can't open a browser on the server side, so we return the URL for the frontend to open
    return res.status(200).json({ success: true, redirectUrl: url });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Unknown Server Error' });
  }
}
