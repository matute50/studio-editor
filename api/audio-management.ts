import type { VercelRequest, VercelResponse } from '@vercel/node';
import { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

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

  try {
    // 1. LIST AUDIOS (GET sin fileName)
    if (req.method === 'GET' && !req.query.fileName) {
       const listed = await r2Client.send(new ListObjectsV2Command({ Bucket: R2_BUCKET_NAME, Prefix: targetPrefix }));
       const audios = (listed.Contents || [])
           .map(item => item.Key?.replace(targetPrefix, ''))
           .filter(key => key && (key.endsWith('.mp3') || key.endsWith('.wav')));
       return res.status(200).json({ audios });
    }

    // 2. CHECK AUDIO EXISTS (GET con fileName)
    if (req.method === 'GET' && req.query.fileName) {
        const fileName = req.query.fileName;
        try {
          await r2Client.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: `${targetPrefix}${fileName}` }));
          return res.status(200).json({ exists: true });
        } catch (err: any) {
          if (err.name === 'NotFound') return res.status(200).json({ exists: false });
          throw err;
        }
    }

    // 3. SAVE AUDIO (POST)
    if (req.method === 'POST') {
        const { fileName, audioBase64 } = req.body;
        if (!fileName || !audioBase64) return res.status(400).json({ error: 'Faltan campos requeridos' });
        const buffer = Buffer.from(audioBase64, 'base64');
        await r2Client.send(new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: `${targetPrefix}${fileName}`,
            Body: buffer,
            ContentType: fileName.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg'
        }));
        return res.status(200).json({ success: true });
    }

    // 4. DELETE AUDIO (DELETE)
    if (req.method === 'DELETE') {
        const { fileName } = req.query;
        if (!fileName) return res.status(400).json({ error: 'Falta fileName' });
        await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: `${targetPrefix}${fileName}` }));
        return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err: any) {
    console.error("Audio Management Error:", err);
    return res.status(500).json({ error: err.message || 'Unknown Server Error' });
  }
}
