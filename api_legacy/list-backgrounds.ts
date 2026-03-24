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
    const { folder } = req.query;
    if (!folder) {
      return res.status(400).json({ error: 'Folder parameter is required' });
    }

    const listCmd = new ListObjectsV2Command({ 
      Bucket: R2_BUCKET_NAME, 
      Prefix: `${folder}/` 
    });

    const listed = await r2Client.send(listCmd);
    const backgrounds = (listed.Contents || [])
      .filter(item => item.Key && !item.Key.endsWith('/'))
      .map(item => ({
        key: item.Key,
        url: `https://media.saladillovivo.com.ar/${item.Key}`,
        name: item.Key?.split('/').pop()
      }));

    return res.status(200).json({ backgrounds });
  } catch (err: any) {
    console.error("List Backgrounds Error:", err);
    return res.status(500).json({ error: err.message || 'Unknown Server Error' });
  }
}
