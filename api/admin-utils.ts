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
  const { action } = req.query;

  try {
    // 1. ABRIR CARPETA (POST)
    if (action === 'abrir-carpeta') {
      return res.status(200).json({ success: true, message: "Apertura local no soportada en entorno cloud." });
    }

    // 2. VESTUARIO PATHS (GET)
    if (action === 'vestuario-paths') {
      const loc = req.query.location?.toString() ?? 'estudio';
      const targetPrefix = loc === 'estudio' ? 'vestuario_de_hoy_estudio/' : 'vestuario_de_hoy_exteriores/';
      const paths: string[] = [];
      for (let i = 1; i <= 30; i++) {
          paths.push(`https://media.saladillovivo.com.ar/${targetPrefix}${String(i).padStart(2, '0')}.png`);
      }
      return res.status(200).json({ paths });
    }

    // 3. LIST BACKGROUNDS (GET)
    if (action === 'list-backgrounds') {
      const { folder } = req.query;
      if (!folder) return res.status(400).json({ error: 'Folder parameter is required' });

      const listed = await r2Client.send(new ListObjectsV2Command({ Bucket: R2_BUCKET_NAME, Prefix: `${folder}/` }));
      const backgrounds = (listed.Contents || [])
        .filter(item => item.Key && !item.Key.endsWith('/'))
        .map(item => ({
          key: item.Key,
          url: `https://media.saladillovivo.com.ar/${item.Key}`,
          name: item.Key?.split('/').pop()
        }));
      return res.status(200).json({ backgrounds });
    }

    // 4. SAVE NOTICIAS (POST)
    if (action === 'save-noticias') {
      return res.status(200).json({ success: true, message: "Guardado local de noticias.txt no soportado en cloud (Usar Supabase)." });
    }

    // 5. CAMBIAR VESTUARIO (POST)
    if (action === 'cambiar-vestuario') {
        return res.status(200).json({ success: true, message: "Acción diaria de vestuario deshabilitada.", image: "N/A" });
    }

    return res.status(400).json({ error: 'Acción no reconocida o método incorrecto' });
  } catch (err: any) {
    console.error(`Admin Utils Error (${action}):`, err);
    return res.status(500).json({ error: err.message || 'Unknown Server Error' });
  }
}
