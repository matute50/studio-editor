import type { VercelRequest, VercelResponse } from '@vercel/node';
import { S3Client, ListObjectsV2Command, CopyObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";

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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { location } = req.body as { location: 'estudio' | 'exteriores' };
    const sourcePrefix = location === 'estudio' ? 'vestuario_estudio/' : 'vestuario_exteriores/';
    const targetPrefix = location === 'estudio' ? 'vestuario_de_hoy_estudio/' : 'vestuario_de_hoy_exteriores/';
    
    // 1. Elegir una foto al azar de sourcePrefix
    const listCmd = new ListObjectsV2Command({ Bucket: R2_BUCKET_NAME, Prefix: sourcePrefix });
    const listed = await r2Client.send(listCmd);
    const imagenes = (listed.Contents || []).filter(item => item.Key && !item.Key.endsWith('/'));
    if (imagenes.length === 0) throw new Error('No hay imágenes en la carpeta fuente en R2');
    
    const elegida = imagenes[Math.floor(Math.random() * imagenes.length)].Key!;
    
    // 2. Limpiar targetPrefix
    const listTarget = await r2Client.send(new ListObjectsV2Command({ Bucket: R2_BUCKET_NAME, Prefix: targetPrefix }));
    if (listTarget.Contents && listTarget.Contents.length > 0) {
       await r2Client.send(new DeleteObjectsCommand({
         Bucket: R2_BUCKET_NAME,
         Delete: { Objects: listTarget.Contents.map(i => ({ Key: i.Key! })) }
       }));
    }
    
    // 3. Copiar la elegida al REFERENCE_IMAGE.PNG
    await r2Client.send(new CopyObjectCommand({
        Bucket: R2_BUCKET_NAME,
        CopySource: `${R2_BUCKET_NAME}/${elegida}`,
        Key: `${targetPrefix}REFERENCE_IMAGE.PNG`
    }));
    
    // 4. Hacer 30 copias (simulando rotación, todo sobre R2)
    for (let i = 1; i <= 30; i++) {
        const cCmd = new CopyObjectCommand({
            Bucket: R2_BUCKET_NAME,
            CopySource: `${R2_BUCKET_NAME}/${elegida}`,
            Key: `${targetPrefix}${String(i).padStart(2, '0')}.png`
        });
        await r2Client.send(cCmd);
    }
    
    console.log(`[Vestuario API Serverless] Rotación completada con éxito`);
    return res.status(200).json({ success: true, message: "Vestuario actualizado en R2", image: elegida });
  } catch (err: any) {
    console.error("Camera Change Error Error:", err);
    return res.status(500).json({ error: err.message || 'Unknown Server Error' });
  }
}
