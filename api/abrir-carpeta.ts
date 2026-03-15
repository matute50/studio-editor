import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // En Vercel no podemos abrir carpetas locales del usuario. 
    // Esta función está interceptada en el vite.config.ts para desarrollo local.
    // Si se invoca en Vercel, retornamos éxito para evitar errores en consola, 
    // pero no podemos ejecutar un 'start ""' remoto.
    return res.status(200).json({ success: true, message: "Apertura local no soportada en entorno cloud." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Unknown Server Error' });
  }
}
