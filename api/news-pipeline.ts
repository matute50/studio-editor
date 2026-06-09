import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import sharp from 'sharp';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { pipeline } from 'stream/promises';
import ffmpeg from 'fluent-ffmpeg';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN GLOBAL
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://otwvfihzaznyjvjtkvvd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90d3ZmaWh6YXpueWp2anRrdnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxMDQ3OTAsImV4cCI6MjA2MDY4MDc5MH0.YbKdivZM6gJCdXAf51Xctn8IpKhQCrMch89NoHwP0Z4';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const R2_ACCOUNT_ID = '3f11be5ae3d34a83cf63343662eec80e';
const R2_ACCESS_KEY_ID = '6e5e3dce4038a338abfb5fe96c5cb8a9';
const R2_SECRET_ACCESS_KEY = 'c6873a1c2d0dd7b55bca1a51ecf42c5e4ab5c21563df79ad37c33295b86c2b70';
const R2_BUCKET_NAME = 'saladillovivo-media';
const R2_PUBLIC_BASE = 'https://pub-5b294f92f42e4cbda687d0122e15bc72.r2.dev';
const CDN_URL = 'https://media.saladillovivo.com.ar';

const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    forcePathStyle: true
});

const CORTINA_URL = 'https://pub-5b294f92f42e4cbda687d0122e15bc72.r2.dev/audios/news-intro.mp3';


// ─────────────────────────────────────────────────────────────────────────────
// UTILIDADES COMPARTIDAS
// ─────────────────────────────────────────────────────────────────────────────

function extractTag(xml: string, tag: string): string {
    const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    if (!match) return '';
    return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
}

function extractItemLink(itemXml: string): string {
    const m = itemXml.match(/<link>\s*(https?:[^<]+)\s*<\/link>/i);
    if (m) return m[1].trim();
    const g = itemXml.match(/<guid[^>]*isPermaLink=["']true["'][^>]*>\s*(https?:[^<]+)\s*<\/guid>/i);
    if (g) return g[1].trim();
    return '';
}

function htmlToCleanText(html: string): string {
    if (!html) return '';
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&#8211;/g, '–')
        .replace(/&#8212;/g, '—')
        .replace(/&#8220;/g, '“')
        .replace(/&#8221;/g, '”')
        .replace(/&#8216;/g, '‘')
        .replace(/&#8217;/g, '’')
        .replace(/&#124;/g, '|')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractImagesFromHtml(html: string): string[] {
    const found = new Set<string>();
    const imgRegex = /<img[^>]+src=["']([^"'>\s]+)["']/gi;
    let m;
    while ((m = imgRegex.exec(html)) !== null) {
        if (m[1] && !m[1].includes('avatar') && !m[1].includes('logo') && !m[1].includes('s.w.org') && !m[1].includes('pixel')) {
            found.add(m[1]);
        }
    }
    return Array.from(found);
}

function extractMediaImage(itemXml: string): string {
    // Buscar media:content url="..." o enclosure url="..."
    const m = itemXml.match(/<(?:media:content|enclosure)[^>]+url=["']([^"'>\s]+)["']/i);
    return m ? m[1].trim() : '';
}

// ─────────────────────────────────────────────────────────────────────────────
// FASE 1: SCRAPING (RSS-FIRST)
// ─────────────────────────────────────────────────────────────────────────────

const FEEDS = [
    { name: 'Ahora Saladillo', url: 'https://ahorasaladillo-diariodigital.com.ar/feed/' },
    { name: 'ABC Saladillo', url: 'https://www.abcsaladillo.com.ar/feed/' },
    { name: 'Info Saladillo', url: 'https://infosaladillo.com.ar/feed/' }
];

async function fetchWithUA(url: string, timeout = 10000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (e) {
        clearTimeout(id);
        throw e;
    }
}

async function runScraping() {
    console.log('[Pipeline] F1: Scraping RSS...');
    const results: any[] = [];
    let stats = { count: 0, skipped: 0, errors: 0 };

    for (const feed of FEEDS) {
        try {
            console.log(`[RSS] Fetching feed: ${feed.name}...`);
            const xmlRes = await fetchWithUA(feed.url, feed.name.includes('Ahora') ? 20000 : 10000);
            if (!xmlRes.ok) throw new Error(`HTTP ${xmlRes.status}`);
            const xml = await xmlRes.text();
            console.log(`[RSS] Feed ${feed.name}: received ${xml.length} bytes`);

            const itemRegex = /<item[\s>][\s\S]*?<\/item>/gi;
            const items = xml.match(itemRegex) || [];
            console.log(`[RSS] Feed ${feed.name}: found ${items.length} items`);

            for (const itemXml of items) {
                const title = htmlToCleanText(extractTag(itemXml, 'title'));
                const link = extractItemLink(itemXml);
                if (!title || !link) continue;

                const { data: existing } = await supabase.from('articles_crudos').select('id').eq('source_url', link).single();
                if (existing) { stats.skipped++; continue; }

                const description = extractTag(itemXml, 'description');
                const content = extractTag(itemXml, 'content:encoded') || description;
                const text = htmlToCleanText(content);

                if (!text || text.length < 50) { stats.skipped++; continue; }

                let mediaImg = extractMediaImage(itemXml);
                let htmlImages = extractImagesFromHtml(content);
                
                // Fallback: Si no hay imágenes en el RSS, intentamos scrapear la página
                if (!mediaImg && htmlImages.length === 0) {
                    try {
                        console.log(`[RSS] No images for ${title}. Scraping page: ${link}...`);
                        const pageRes = await fetchWithUA(link, 10000);
                        if (pageRes.ok) {
                            const html = await pageRes.text();
                            const pageImages = extractImagesFromHtml(html);
                            // Filtramos logos o iconos sospechosos (links cortos o con palabras clave)
                            htmlImages = pageImages.filter(img => !img.includes('logo') && !img.includes('icon') && img.length > 30);
                        }
                    } catch (e) {
                        console.error(`[Scraper] Error scraping page ${link}:`, e);
                    }
                }

                const allImages = Array.from(new Set([mediaImg, ...htmlImages].filter(Boolean)));
                
                results.push({
                    title: title.substring(0, 255),
                    text: text.substring(0, 5000),
                    source_url: link,
                    source_name: feed.name,
                    image_url: allImages[0] || '',
                    images_url: allImages.slice(0, 10),
                    status: 'nuevo'
                });
            }
        } catch (e: any) { stats.errors++; console.error(`Error feed ${feed.name}:`, e.message); }
    }

    if (results.length > 0) {
        const { error } = await supabase.from('articles_crudos').upsert(results, { onConflict: 'source_url' });
        if (error) { stats.errors++; console.error('Error upsert:', error.message); }
        else stats.count = results.length;
    }
    return stats;
}

// ─────────────────────────────────────────────────────────────────────────────
// FASE 2: TRANSFORMACIÓN
// ─────────────────────────────────────────────────────────────────────────────

async function runTransformation(ids?: number[]) {
    console.log('[Pipeline] F2: Transformación...');
    const query = supabase.from('articles_crudos').select('*').eq('status', 'nuevo');
    if (ids && ids.length > 0) query.in('id', ids);
    
    // sharp resizing puede tomar 1-2s por foto, procesar 4 a la vez
    const { data: raws, error } = await query.limit(4);
    if (error || !raws) return { count: 0, error: error?.message };

    let processed = 0;
    let errorMsg: string | undefined;

    for (const raw of raws) {
        const cleanTitle = htmlToCleanText(raw.title);
        const slug = cleanTitle.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').substring(0, 80);
        const finalSlug = `${slug}-${Date.now().toString().slice(-4)}`;

        // Evitar duplicados: verificar si ya existe un artículo con título idéntico
        const { data: existing } = await supabase.from('articles').select('id').eq('title', cleanTitle).maybeSingle();
        if (existing) {
            console.log(`[F2] Skipping duplicate: ${cleanTitle.substring(0, 40)}`);
            await supabase.from('articles_crudos').update({ status: 'procesado' }).eq('id', raw.id);
            continue;
        }

        // Subir imágenes a 1080p y aplicar filtros profesionales (Brillo, Contraste, Saturación)
        const processImageForVideo = async (url: string, index: number) => {
            if (!url) return url;
            try {
                const res = await fetch(url);
                if (!res.ok) return url;
                const arrayBuffer = await res.arrayBuffer();
                
                // Brillo +5%, Saturación +10%
                // Contraste +5%: linear(1.05, -(128 * 0.05)) -> linear(1.05, -6.4)
                const processedBuffer = await sharp(Buffer.from(arrayBuffer))
                    .resize(1920, 1080, { fit: 'cover', withoutEnlargement: false })
                    .modulate({ brightness: 1.05, saturation: 1.1 })
                    .linear(1.05, -6.4)
                    .jpeg({ quality: 90 })
                    .toBuffer();

                const fileName = `hd_${raw.id}_${Date.now()}_${index}.jpg`;
                await r2.send(new PutObjectCommand({ 
                    Bucket: R2_BUCKET_NAME, 
                    Key: `articles_hd/${fileName}`, 
                    Body: processedBuffer, 
                    ContentType: 'image/jpeg' 
                }));
                return `${CDN_URL}/articles_hd/${fileName}`;
            } catch (e: any) {
                console.error(`[F2] Error enhancing image:`, url, e.message);
                return url; // fallback a la original si falla el procesamiento
            }
        };

        const hdImageUrl = raw.image_url ? await processImageForVideo(raw.image_url, 0) : '';
        const hdImagesUrls = raw.images_url && raw.images_url.length > 0 
            ? await Promise.all(raw.images_url.map((img: string, i: number) => processImageForVideo(img, i + 1))) 
            : [];

        const { error: insErr } = await supabase.from('articles').insert([{
            title: cleanTitle,
            text: raw.text,
            image_url: hdImageUrl,
            images_urls: hdImagesUrls,
            published_at: new Date().toISOString(),
            slug: finalSlug,
            status: 'draft'
        }]);

        if (insErr) {
            console.error(`[F2] Error inserting article from raw ${raw.id}:`, insErr.message);
            if (!errorMsg) errorMsg = insErr.message;
        } else {
            await supabase.from('articles_crudos').update({ status: 'procesado' }).eq('id', raw.id);
            processed++;
        }
    }
    return { count: processed, error: errorMsg };
}

// ─────────────────────────────────────────────────────────────────────────────
// FASE 3: RESUMEN IA
// ─────────────────────────────────────────────────────────────────────────────

async function runResumen(baseUrl: string, ids?: number[]) {
    console.log('[Pipeline] F3: IA (Resumen Ara + Texto Slide/Audio)...');
    const query = supabase.from('articles').select('id, title, text').is('super_resumen', null);
    if (ids && ids.length > 0) query.in('id', ids);
    
    const { data: articles, error } = await query.order('created_at', { ascending: false }).limit(2);
    if (error || !articles) return { count: 0, error: error?.message };

    let processed = 0;
    for (const art of articles) {
        try {
            console.log(`[F3] Procesando artículo ${art.id}...`);

            // PRODUCTO 2: REDACCIÓN PROFESIONAL (Base para Slide y Audio)
            const promptProf = `Reescribe de forma profesional esta noticia para ser leída por un locutor de TV. Mantén la formalidad periodística.\n\nNOTICIA:\n${art.title}\n${art.text.substring(0, 3000)}`;
            const resProf = await fetch(`${baseUrl}/api/ai-proxy?provider=gemini`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: promptProf })
            }).then(r => r.json());

            let professionalBody = resProf?.text || art.text;

            // PRODUCTO 1: SÚPER RESUMEN ESTILO ARA (Basado en la redacción profesional)
            const REGLA_DE_ORO = `ROL: SENIOR NEWS EDITOR (ESTABILIDAD ANTIBALBUCEO). REGLAS: 1. SHEÍSMO (SSH): LL/Y -> SSH. 2. ORTOGRAFÍA LIMPIA: NO DOBLES LETRAS (VISITÁNOS), NO "H" PARA ASPIRAR (ESTAS), -CIÓN ESTÁNDAR. 3. VOSEO AGUDO: FORZAR TILDES. 4. MAYÚSCULAS: TODO EN MAYÚSCULAS. 5. CTA OBLIGATORIO: LA 4TA ORACIÓN TERMINA CON AUTORIDAD.`;
            const promptAra = `ACTUÁ COMO UN EDITOR DE NOTICIAS SENIOR DE SALADILLO VIVO. GENERA UN SÚPER RESUMEN "ESTILO ARA" BASADO EN ESTE TEXTO:\n\n${professionalBody.substring(0, 3000)}\n\nSEGUÍ ESTAS REGLAS DE ORO:\n\n${REGLA_DE_ORO}\n\nREGLAS OBLIGATORIAS:\n1. EXACTAMENTE 4 ORACIONES EN MAYÚSCULAS.\n2. MÉTRICA POR ORACIÓN: \n   - ORACIÓN 1: 18 A 21 PALABRAS. EMPIEZA CON ANCLA PROFESIONAL (COMO VOS SABÉS / TE CUENTO / FIJATE).\n   - ORACIONES 2 Y 3: 15 A 18 PALABRAS CADA UNA. TONO AUTORITARIO.\n   - ORACIÓN 4: 15 A 18 PALABRAS. TERMINA CON CTA (VISITÁ NUESTRA WEB / ENTRÁ A NUESTRO SITIO / ENTERÁTE DE TODO).\n3. PROHIBIDO: "VISTE", "CHE", "PIBE", "HOY", "AYER", "MAÑANA".\n4. FONÉTICA: LL/Y -> SSH. MANTENÉ ORTOGRAFÍA LIMPIA Y MAYÚSCULAS.`;
            
            const resAra = await fetch(`${baseUrl}/api/ai-proxy?provider=gemini`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: promptAra, system: REGLA_DE_ORO, temperature: 0.3 })
            }).then(r => r.json());

            let superResumenAra = resAra?.text ? resAra.text.replace(/\[.*?\]/gi, '').trim().toUpperCase() : 'Error al generar Ara.';

            // PRODUCTO 2 FINAL: OPTIMIZACIÓN DE GUION (Para el Audio del Slide)
            const systemOpt = "Eres un experto guionista de radio y locución periodística TV Rioplatense. Tu tarea es adaptar el texto para ser leído en voz alta. DEBES MANTENER LA FORMALIDAD PERIODÍSTICA.";
            const promptOpt = `Ajusta la puntuación y redacción de este texto para una lectura periodística fluida en Google TTS (Argentina).\nMantenlo estrictamente formal, serio y neutro.\nTEXTO PARA OPTIMIZAR: "${professionalBody.substring(0, 1500)}"`;

            const resOpt = await fetch(`${baseUrl}/api/ai-proxy?provider=gemini`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: promptOpt, system: systemOpt, temperature: 0.3 })
            }).then(r => r.json());

            let slideVoiceText = resOpt?.text ? resOpt.text.trim() : professionalBody;

            // ACTUALIZACIÓN EN DB: Ambos productos por separado
            await supabase.from('articles').update({
                super_resumen: superResumenAra,
                body_voice_tuning: slideVoiceText
            }).eq('id', art.id);

            processed++;
        } catch (e:any) { console.error(`[F3] Error resumen IA ${art.id}:`, e.message); }
    }
    return { count: processed };
}

// ─────────────────────────────────────────────────────────────────────────────
// FASE 4: AUDIO TTS
// ─────────────────────────────────────────────────────────────────────────────

async function runAudio(ids?: number[]) {
    console.log('[Pipeline] F4: Audio TTS con Cortina Mix...');
    const query = supabase.from('articles').select('id, body_voice_tuning').is('audio_url', null).not('body_voice_tuning', 'is', null);
    if (ids && ids.length > 0) query.in('id', ids);

    const { data: articles, error } = await query.limit(2); // Reducimos a 2 por el tiempo de mezcla
    if (error || !articles) return { count: 0, error: error?.message };

    const ttsKey = (process.env.GOOGLE_TTS_API_KEY || process.env.VITE_GOOGLE_TTS_API_KEY || '').trim();
    if (!ttsKey) return { count: 0, error: 'Google TTS Key missing' };

    let processed = 0;

    for (const art of articles) {
        const tmpDir = os.tmpdir();
        const ttsFile = path.join(tmpDir, `tts_${art.id}_${Date.now()}.mp3`);
        const musicFile = path.join(tmpDir, `music_${art.id}.mp3`);
        const outputFile = path.join(tmpDir, `mixed_${art.id}.mp3`);

        try {
            // 1) Generar TTS HD
            console.log(`[F4] Generando TTS para noticia ${art.id}...`);
            const ssml = `<speak xml:lang='es-AR'><prosody rate='1.05' pitch='0.0st'>${art.body_voice_tuning}</prosody></speak>`;
            const ttsRes = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${ttsKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input: { ssml },
                    voice: { languageCode: 'es-US', name: 'es-US-Chirp3-HD-Aoede' },
                    audioConfig: { audioEncoding: 'MP3' }
                })
            });

            const ttsData = await ttsRes.json();
            if (ttsData.error) throw new Error(ttsData.error.message);
            fs.writeFileSync(ttsFile, Buffer.from(ttsData.audioContent, 'base64'));

            // 2) Descargar Cortina
            console.log(`[F4] Descargando cortina...`);
            const musRes = await fetch(CORTINA_URL);
            if (!musRes.ok) throw new Error("Fallo al descargar cortina musical");
            await pipeline(musRes.body as any, fs.createWriteStream(musicFile));

            // 3) MEZCLA CON FFMPEG
            // 1s intro música, locución con música de fondo (ducking), 2s música final con fade out.
            console.log(`[F4] Mezclando audio con FFmpeg...`);
            
            // Obtener duración de la voz para el timing
            const voiceDuration: number = await new Promise((resolve, reject) => {
                ffmpeg.ffprobe(ttsFile, (err, metadata) => {
                    if (err) reject(err);
                    else resolve(metadata.format.duration || 10);
                });
            });

            const totalDuration = 1 + voiceDuration + 2;

            await new Promise((resolve, reject) => {
                ffmpeg()
                    .input(musicFile)
                    .inputOptions(['-stream_loop -1']) // Repetir música si es corta
                    .input(ttsFile)
                    // Filtro complejo:
                    // 1. Música (0) -> bajar volumen al 15% entre t=1 y t=1+voz
                    // 2. Mezclar música procesada con voz (1) retrasada 1 segundo
                    // 3. Aplicar fade out de 0.5s al final de la duración total
                    .complexFilter([
                        `[0:a]volume=0.4,volume=enable='between(t,1,${1 + voiceDuration})':volume=0.15,afade=t=out:st=${totalDuration - 0.5}:d=0.5[bg]`,
                        `[1:a]adelay=1000|1000[voice]`,
                        `[bg][voice]amix=inputs=2:duration=longest[out]`
                    ])
                    .map('[out]')
                    .duration(totalDuration)
                    .audioCodec('libmp3lame')
                    .toFormat('mp3')
                    .on('end', resolve)
                    .on('error', reject)
                    .save(outputFile);
            });

            // 4) Subir a R2
            const mixedBuffer = fs.readFileSync(outputFile);
            const fileName = `ara_mix_${art.id}_${Date.now()}.mp3`;
            await r2.send(new PutObjectCommand({
                Bucket: R2_BUCKET_NAME, Key: `audios_Ara/${fileName}`, Body: mixedBuffer, ContentType: 'audio/mpeg'
            }));

            const audioUrl = `${R2_PUBLIC_BASE}/audios_Ara/${fileName}`;
            await supabase.from('articles').update({ audio_url: audioUrl, audio_status: 'ready' }).eq('id', art.id);

            processed++;
            console.log(`[F4] Noticia ${art.id} completada.`);

        } catch (e: any) {
            console.error(`Error en F4 ${art.id}:`, e.message);
        } finally {
            // Limpieza de archivos temporales
            [ttsFile, musicFile, outputFile].forEach(f => { if(fs.existsSync(f)) fs.unlinkSync(f); });
        }
    }
    return { count: processed };
}

// ─────────────────────────────────────────────────────────────────────────────
// FASE 5: SLIDES HTML
// ─────────────────────────────────────────────────────────────────────────────

async function runSlide(ids?: number[]) {
    console.log('[Pipeline] F5: Slides...');
    const query = supabase.from('articles').select('*').is('url_slide', null).not('audio_url', 'is', null);
    if (ids && ids.length > 0) query.in('id', ids);

    const { data: articles, error } = await query.limit(5);
    if (error || !articles) return { count: 0, error: error?.message };

    let processed = 0;
    let errorMsg: string | undefined;

    for (const art of articles) {
        try {
            const words = (art.body_voice_tuning || '').split(/\s+/).length;
            const duration = Math.max(12, Math.round((words / 200) * 60) + 5);
            const cleanTitle = art.title.toUpperCase().replace(/["“”«»¨]/g, '');
            
            const html = `<!DOCTYPE html><html><body style="background:black;color:white;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;font-family:sans-serif;padding:5%;text-align:center;">
                ${art.audio_url ? `<audio id="slide_audio" preload="auto" crossorigin="anonymous"><source src="${art.audio_url}" type="audio/mpeg"></audio>` : ''}
                <h1 style="font-size:8vw;margin-bottom:2vh;">${cleanTitle}</h1>
                <p style="font-size:4vw;line-height:1.2;">${art.body_voice_tuning}</p>
                <script>
                    function startAudio() {
                        const audio = document.getElementById('slide_audio');
                        if (audio && audio.paused) {
                            audio.play().then(() => {
                                document.body.removeEventListener('click', startAudio);
                                document.body.removeEventListener('touchstart', startAudio);
                            }).catch(() => {});
                        }
                    }

                    window.addEventListener('load', () => {
                        const urlParams = new URLSearchParams(window.location.search);
                        const audio = document.getElementById('slide_audio');
                        const playRequested = window.self === window.top || urlParams.get('playAudio') === 'true';

                        if (audio) {
                            audio.onloadedmetadata = () => {
                                window.parent.postMessage({ type: 'SET_SLIDE_DURATION', durationSeconds: audio.duration || ${duration} }, '*');
                            };
                            if (playRequested) {
                                audio.play().catch(e => {
                                    console.log('Autoplay bloqueado. Esperando interacción...');
                                    document.body.addEventListener('click', startAudio);
                                    document.body.addEventListener('touchstart', startAudio);
                                });
                            }
                        } else {
                            window.parent.postMessage({ type: 'SET_SLIDE_DURATION', durationSeconds: ${duration} }, '*');
                        }
                    });
                </script>
            </body></html>`;

            const fileName = `slide_${art.id}_${Date.now()}.html`;
            await r2.send(new PutObjectCommand({
                Bucket: R2_BUCKET_NAME, Key: `slides/${fileName}`, Body: Buffer.from(html), ContentType: 'text/html'
            }));
            const slideUrl = `${CDN_URL}/slides/${fileName}`;

            const { error: updErr } = await supabase.from('articles').update({ url_slide: slideUrl, animation_duration: duration }).eq('id', art.id);
            if (updErr) throw updErr;
            processed++;
        } catch (e:any) { 
            console.error(`Error slide ${art.id}:`, e.message); 
            if (!errorMsg) errorMsg = e.message;
        }
    }
    return { count: processed, error: errorMsg };
}

// ─────────────────────────────────────────────────────────────────────────────
// FASE 0: LIMPIEZA AUTOMÁTICA (> 3 DÍAS / 72H)
// ─────────────────────────────────────────────────────────────────────────────

async function runCleanup() {
    console.log('[Pipeline] F0: Cleanup > 3 days (72h)...');
    const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    
    // Cleanup de crudos
    const { count: countCrudos, error: errCrudos } = await supabase.from('articles_crudos')
        .delete({ count: 'exact' })
        .lt('created_at', threeDaysAgo);

    // Cleanup de publicados
    const { count: countArticles, error: errArticles } = await supabase.from('articles')
        .delete({ count: 'exact' })
        .lt('created_at', threeDaysAgo);

    if (errCrudos) console.error('[F0] Error eliminando crudos:', errCrudos.message);
    if (errArticles) console.error('[F0] Error eliminando articles:', errArticles.message);

    return { 
        crudos_eliminados: countCrudos || 0, 
        noticias_eliminadas: countArticles || 0 
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const action = (req.query.action || req.body?.action || 'full').toString();
    const secret = req.query.secret || req.body?.secret;
    const ids = req.body?.ids || [];
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const currentUrl = `${protocol}://${host}`;

    // Validación de seguridad básica
    if (secret !== 'sv-cron-2024' && process.env.NODE_ENV === 'production') {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        if (action === 'truncate') {
            const { error } = await supabase.from('articles_crudos').delete().not('id', 'is', null);
            return res.status(200).json({ success: !error, error: error?.message });
        }
        if (action === 'scrape') return res.status(200).json(await runScraping());
        if (action === 'transform') return res.status(200).json(await runTransformation(ids));
        if (action === 'resumen') return res.status(200).json(await runResumen(currentUrl, ids));
        if (action === 'audio') return res.status(200).json(await runAudio(ids));
        if (action === 'slide') return res.status(200).json(await runSlide(ids));
        if (action === 'cleanup') return res.status(200).json(await runCleanup());
        
        if (action === 'full') {
            const cleanup = await runCleanup();
            const scrape = await runScraping();
            const transform = await runTransformation();
            const resumen = await runResumen(currentUrl);
            const audio = await runAudio();
            const slide = await runSlide();
            
            return res.status(200).json({ 
                success: true, 
                cleanup,
                scrape,
                transform,
                resumen,
                audio,
                slide
            });
        }

        return res.status(400).json({ error: 'Unknown action' });
    } catch (e: any) {
        console.error('[Pipeline] Fatal error:', e.message);
        return res.status(500).json({ error: e.message });
    }
}
