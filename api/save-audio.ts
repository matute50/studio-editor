import type { VercelRequest, VercelResponse } from '@vercel/node';
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

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
  const targetPrefix = 'audios_Ara/';

  if (req.method === 'GET') {
    const fileName = req.query.fileName;
    if (!fileName || Array.isArray(fileName)) {
      return res.status(400).json({ error: 'Falta fileName válido' });
    }
    
    try {
      await r2Client.send(new HeadObjectCommand({ 
        Bucket: R2_BUCKET_NAME, 
        Key: `${targetPrefix}${fileName}` 
      }));
      return res.status(200).json({ exists: true });
    } catch (err: any) {
      if (err.name === 'NotFound') {
        return res.status(200).json({ exists: false });
      }
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { fileName, audioBase64 } = req.body;
      if (!fileName || !audioBase64) {
        return res.status(400).json({ error: 'Faltan campos requeridos en el body' });
      }
      
      const buffer = Buffer.from(audioBase64, 'base64');
      
      await r2Client.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: `${targetPrefix}${fileName}`,
        Body: buffer,
        ContentType: fileName.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg'
      }));
      
      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error("Error al subir audio a R2:", err);
      return res.status(500).json({ error: err.message || 'Unknown Server Error' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
