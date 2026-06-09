
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// CREDENCIALES DE CLOUDFLARE R2
const R2_ACCOUNT_ID = '3f11be5ae3d34a83cf63343662eec80e';
const R2_ACCESS_KEY_ID = '6e5e3dce4038a338abfb5fe96c5cb8a9';
const R2_SECRET_ACCESS_KEY = 'c6873a1c2d0dd7b55bca1a51ecf42c5e4ab5c21563df79ad37c33295b86c2b70';
const R2_BUCKET_NAME = 'saladillovivo-media';

// URL ESTRICTA DE CDN ( media.saladillovivo.com.ar )
const CDN_URL = 'https://media.saladillovivo.com.ar';
const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const r2Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true
});

const handleR2Error = (error: any) => {
  console.error("Error R2 Crítico:", error);
  if (error.name === 'TypeError' || error.message?.toLowerCase().includes('failed to fetch')) {
    return new Error("ERROR DE RED O CORS: Verifica que la política CORS del bucket en Cloudflare permita el método DELETE.");
  }
  return new Error(error.message || "Error al conectar con Cloudflare R2.");
};

export const uploadHtmlToR2 = async (htmlString: string, fileName: string): Promise<string> => {
  try {
    const key = `slides/${fileName}`;
    const encoder = new TextEncoder();
    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: encoder.encode(htmlString),
      ContentType: 'text/html',
      CacheControl: 'no-cache, no-store, must-revalidate'
    }));
    return `${CDN_URL}/${key}`;
  } catch (error: any) { throw handleR2Error(error); }
};

/**
 * Elimina un archivo del bucket R2
 */
export const deleteFileFromR2 = async (url: string): Promise<void> => {
  if (!url) return;
  try {
    const urlObj = new URL(url);
    // Extraer la ruta sin la barra inicial (ej: "slides/archivo.html")
    let key = urlObj.pathname;
    if (key.startsWith('/')) {
      key = key.substring(1);
    }

    console.log(`[R2] Intentando borrar objeto: ${key} del bucket ${R2_BUCKET_NAME}`);

    await r2Client.send(new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    }));

    console.log(`[R2] Objeto borrado con éxito: ${key}`);
  } catch (error: any) {
    // Si el error es 404 (NoSuchKey), ya no existe, por lo que el objetivo se cumplió
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      console.warn("[R2] El archivo ya no existía en el bucket.");
      return;
    }
    throw handleR2Error(error);
  }
};

/**
 * Sube una imagen procesada al bucket bajo la carpeta imagenes_noticias
 */
export const uploadImageToR2 = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const fileExt = file.name.split('.').pop();
    const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${Date.now()}_${cleanName}.${fileExt}`;
    const key = `imagenes_noticias/${fileName}`;

    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: new Uint8Array(arrayBuffer),
      ContentType: file.type || 'image/jpeg',
    }));
    return `${CDN_URL}/${key}`;
  } catch (error: any) { throw handleR2Error(error); }
};

export const uploadBannerToR2 = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const fileExt = file.name.split('.').pop();
    const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `banner_${Date.now()}_${cleanName}.${fileExt}`;
    const key = `banners/${fileName}`;

    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: new Uint8Array(arrayBuffer),
      ContentType: file.type || 'image/jpeg',
    }));
    return `${CDN_URL}/${key}`;
  } catch (error: any) { throw handleR2Error(error); }
};

export const uploadBackgroundToR2 = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const fileExt = file.name.split('.').pop();
    const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `custom_bg_${Date.now()}_${cleanName}.${fileExt}`;
    const key = `backgrounds/${fileName}`;

    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: new Uint8Array(arrayBuffer),
      ContentType: file.type || 'image/jpeg',
    }));
    return `${CDN_URL}/${key}`;
  } catch (error: any) { throw handleR2Error(error); }
};

export const uploadThumbnailToR2 = async (blob: Blob, fileName: string): Promise<string> => {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const key = `miniaturas/${fileName}`;
    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: new Uint8Array(arrayBuffer),
      ContentType: 'image/jpeg',
    }));
    return `${CDN_URL}/${key}`;
  } catch (error: any) { throw handleR2Error(error); }
};

export const uploadAudioToR2 = async (blob: Blob, fileName: string, folder: string = 'audios'): Promise<string> => {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const key = `${folder}/${fileName}`;
    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: new Uint8Array(arrayBuffer),
      ContentType: 'audio/mpeg',
      // Agregar cache-control para evitar versiones viejas
      CacheControl: 'no-cache, no-store, must-revalidate'
    }));
    return `${CDN_URL}/${key}`;
  } catch (error: any) { throw handleR2Error(error); }
};

export const uploadSlideManifestToR2 = async (jsonString: string, fileName: string): Promise<string> => {
  try {
    const key = `slides/${fileName}`;
    const encoder = new TextEncoder();
    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: encoder.encode(jsonString),
      ContentType: 'application/json',
      CacheControl: 'no-cache, no-store, must-revalidate'
    }));
    return `${CDN_URL}/${key}`;
  } catch (error: any) { throw handleR2Error(error); }
};
