import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

// ─────────────────────────────────────────────────
// Supabase
// ─────────────────────────────────────────────────
const SUPABASE_URL = 'https://otwvfihzaznyjvjtkvvd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90d3ZmaWh6YXpueWp2anRrdnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxMDQ3OTAsImV4cCI6MjA2MDY4MDc5MH0.YbKdivZM6gJCdXAf51Xctn8IpKhQCrMch89NoHwP0Z4';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─────────────────────────────────────────────────
// Cloudflare R2
// ─────────────────────────────────────────────────
const R2_ACCOUNT_ID = '3f11be5ae3d34a83cf63343662eec80e';
const R2_ACCESS_KEY_ID = '6e5e3dce4038a338abfb5fe96c5cb8a9';
const R2_SECRET_ACCESS_KEY = 'c6873a1c2d0dd7b55bca1a51ecf42c5e4ab5c21563df79ad37c33295b86c2b70';
const R2_BUCKET_NAME = 'saladillovivo-media';
const R2_PUBLIC_BASE = 'https://pub-5b294f92f42e4cbda687d0122e15bc72.r2.dev';

const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true
});

// ─────────────────────────────────────────────────
// Google Cloud TTS — configuración
// ─────────────────────────────────────────────────
// Misma configuración que googleTTS.ts (Chirp3-HD / es-US / Aoede)
const TTS_VOICE_ID = 'es-US-Chirp3-HD-Aoede';
const TTS_LANGUAGE = 'es-US';
const TTS_SPEAKING_RATE = 1.05;
const AUDIO_PREFIX = 'audios_Ara/';

function getGoogleTTSKey(): string {
    const key = process.env.GOOGLE_TTS_API_KEY || process.env.VITE_GOOGLE_TTS_API_KEY || '';
    if (!key) throw new Error('GOOGLE_TTS_API_KEY no configurada en el entorno.');
    return key.trim();
}

// ─────────────────────────────────────────────────
// Preparación del texto para TTS
// ─────────────────────────────────────────────────

function sanitizeVoseo(text: string): string {
    return text
        .replace(/\btienes\b/gi, 'tenés')
        .replace(/\bquieres\b/gi, 'querés')
        .replace(/\bpuedes\b/gi, 'podés')
        .replace(/\bsabes\b/gi, 'sabés')
        .replace(/\btú\b/gi, 'vos')
        .replace(/\btienes\b/gi, 'tenés')
        .replace(/\bSaladillo\b/g, 'Saladillo');
}

function prepareSSML(text: string): string {
    const trimmed = text.trim();
    if (trimmed.startsWith('<speak')) return trimmed;
    const escaped = trimmed
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    return `<speak xml:lang='es-AR'><prosody rate='${TTS_SPEAKING_RATE}' pitch='0.0st'>${escaped}</prosody></speak>`;
}

/**
 * Genera el nombre de archivo determinista usando SHA-256 del contenido.
 * Idéntico a la lógica en googleTTS.ts para compatibilidad con la caché existente.
 */
function buildCacheFileName(ssmlText: string): string {
    const hash = crypto.createHash('sha256').update(`${TTS_VOICE_ID}_${ssmlText}`).digest('hex');
    return `tts_cache_${hash}.mp3`;
}

// ─────────────────────────────────────────────────
// Llamada a la API de Google Cloud TTS
// ─────────────────────────────────────────────────

/**
 * Genera el audio para el texto dado.
 * Devuelve el buffer del MP3 en base64.
 */
async function synthesizeSpeech(text: string): Promise<{ audioBase64: string; fileName: string }> {
    const sanitized = sanitizeVoseo(text);
    const ssml = prepareSSML(sanitized);
    const fileName = buildCacheFileName(ssml);
    const apiKey = getGoogleTTSKey();

    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
    const body = {
        input: { ssml },
        voice: {
            languageCode: TTS_LANGUAGE,
            name: TTS_VOICE_ID
        },
        audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: TTS_SPEAKING_RATE
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`Google TTS Error (${response.status}): ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    if (!data.audioContent) throw new Error('Google TTS no devolvió audioContent.');

    return { audioBase64: data.audioContent, fileName };
}

// ─────────────────────────────────────────────────
// Subida a Cloudflare R2
// ─────────────────────────────────────────────────

async function uploadToR2(fileName: string, audioBase64: string): Promise<string> {
    const buffer = Buffer.from(audioBase64, 'base64');
    const key = `${AUDIO_PREFIX}${fileName}`;

    await r2.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: 'audio/mpeg',
        // Cache público de 1 año
        CacheControl: 'public, max-age=31536000, immutable'
    }));

    // URL pública del archivo
    return `${R2_PUBLIC_BASE}/${key}`;
}

/**
 * Verifica si el audio ya existe en R2 (evita regenerar si ya está cacheado).
 */
async function audioExistsInR2(fileName: string): Promise<string | null> {
    const publicUrl = `${R2_PUBLIC_BASE}/${AUDIO_PREFIX}${fileName}`;
    try {
        const resp = await fetch(publicUrl, { method: 'HEAD' });
        return resp.ok ? publicUrl : null;
    } catch {
        return null;
    }
}

// ─────────────────────────────────────────────────
// HANDLER PRINCIPAL
// ─────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log('[Audio TTS] Iniciando generación de audio automática...');

    const generated: { id: number; title: string; audio_url: string; cached: boolean }[] = [];
    const errors: string[] = [];

    try {
        // Determinar artículos a procesar
        // POST { ids: number[] } → artículos específicos
        // GET → todos los que tienen super_resumen pero no tienen audio_url
        const specificIds: number[] = req.body?.ids || [];

        let query;
        if (specificIds.length > 0) {
            query = supabase
                .from('articles')
                .select('id, title, super_resumen, audio_url')
                .in('id', specificIds)
                .not('super_resumen', 'is', null);
        } else {
            query = supabase
                .from('articles')
                .select('id, title, super_resumen, audio_url')
                .is('audio_url', null)
                .not('super_resumen', 'is', null)
                .order('created_at', { ascending: false })
                .limit(10); // Limite de 10 por llamada (Google TTS tiene rate limit)
        }

        const { data: articles, error: fetchErr } = await query;

        if (fetchErr) {
            return res.status(500).json({ success: false, error: fetchErr.message });
        }
        if (!articles || articles.length === 0) {
            return res.status(200).json({
                success: true,
                count: 0,
                message: 'No hay artículos con super_resumen pendientes de audio.'
            });
        }

        console.log(`[Audio TTS] ${articles.length} artículo(s) para procesar.`);

        for (const article of articles) {
            const resumen = article.super_resumen?.trim();
            if (!resumen || resumen.length < 30) {
                console.warn(`[Audio TTS] Artículo ${article.id} sin super_resumen válido, omitiendo.`);
                continue;
            }

            try {
                console.log(`[Audio TTS] Procesando: "${article.title?.substring(0, 50)}"`);

                // 1. Determinar el nombre del archivo determinista ANTES de llamar a la API
                const sanitized = sanitizeVoseo(resumen);
                const ssml = prepareSSML(sanitized);
                const fileName = buildCacheFileName(ssml);

                // 2. Verificar caché en R2 (evita recargos innecesarios a la API de Google)
                const cachedUrl = await audioExistsInR2(fileName);

                let audioUrl: string;
                let wasCached = false;

                if (cachedUrl) {
                    console.log(`[Audio TTS] ✅ Cache HIT para artículo ${article.id}: ${fileName}`);
                    audioUrl = cachedUrl;
                    wasCached = true;
                } else {
                    // 3. Sintetizar audio con Google Cloud TTS
                    const { audioBase64 } = await synthesizeSpeech(resumen);

                    // 4. Subir a R2
                    audioUrl = await uploadToR2(fileName, audioBase64);
                    console.log(`[Audio TTS] 🎵 Audio generado y subido: ${audioUrl}`);
                }

                // 5. Actualizar el artículo en Supabase
                const { error: updateErr } = await supabase
                    .from('articles')
                    .update({
                        audio_url: audioUrl,
                        audio_status: 'ready',
                        audio_char_count: resumen.length
                    })
                    .eq('id', article.id);

                if (updateErr) {
                    const msg = `[Audio TTS] ❌ Error guardando audio_url para ${article.id}: ${updateErr.message}`;
                    console.error(msg);
                    errors.push(msg);
                    continue;
                }

                generated.push({
                    id: article.id,
                    title: (article.title || '').substring(0, 60),
                    audio_url: audioUrl,
                    cached: wasCached
                });

                // Pausa entre requests para respetar el rate limit de Google TTS
                if (!wasCached) {
                    await new Promise(r => setTimeout(r, 1000));
                }

            } catch (err: any) {
                const msg = `[Audio TTS] ❌ Error en artículo ${article.id}: ${err.message}`;
                console.error(msg);
                errors.push(msg);
            }
        }

    } catch (err: any) {
        console.error('[Audio TTS] Error crítico:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }

    const result = {
        success: true,
        generated: generated.length,
        cached: generated.filter(g => g.cached).length,
        new_audio: generated.filter(g => !g.cached).length,
        articles: generated,
        errors: errors.length > 0 ? errors : undefined
    };

    console.log('[Audio TTS] Finalizado:', result);
    return res.status(200).json(result);
}
