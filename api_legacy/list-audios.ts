import type { VercelRequest, VercelResponse } from '@vercel/node';
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = '3f11be5ae3d34a83cf63343662eec80e';
const R2_ACCESS_KEY_ID = '6e5e3dce4038a338abfb5fe96c5cb8a9';
const R2_SECRET_ACCESS_KEY = 'c6873a1c2d0dd7b55bca1a51ecf42c5e4ab5c21563df79ad37c33295b86c2b70';
const R2_BUCKET_NAME = 'saladillovivo-media';

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const listCmd = new ListObjectsV2Command({ Bucket: R2_BUCKET_NAME, Prefix: 'audios_Ara/' });
    const listed = await r2Client.send(listCmd);
    
    // Filtramos los objetos que sean mp3 o wav y que no sean la carpeta principal
    const audios = (listed.Contents || [])
        .map(item => item.Key?.replace('audios_Ara/', ''))
        .filter(key => key && (key.endsWith('.mp3') || key.endsWith('.wav')));
    
    return res.status(200).json({ audios });
  } catch (err: any) {
    console.error("Error al listar audios en R2:", err);
    return res.status(500).json({ error: err.message || 'Unknown Server Error' });
  }
}
