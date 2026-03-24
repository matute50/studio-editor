import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

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

const APP_URL = 'https://saladillovivo-editor.vercel.app'; // URL para llamadas internas via HTTP

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
        if (m[1] && !m[1].includes('avatar') && !m[1].includes('logo') && !m[1].includes('s.w.org')) {
            found.add(m[1]);
        }
    }
    return Array.from(found);
}

// ─────────────────────────────────────────────────────────────────────────────
// FASE 1: SCRAPING (RSS-FIRST)
// ─────────────────────────────────────────────────────────────────────────────

const FEEDS = [
    { name: 'Ahora Saladillo', url: 'https://ahorasaladillo-diariodigital.com.ar/feed/' },
    { name: 'ABC Saladillo', url: 'https://www.abcsaladillo.com.ar/feed/' },
    { name: 'Info Saladillo', url: 'https://infosaladillo.com.ar/feed/' }
];

async function runScraping() {
    console.log('[Pipeline] F1: Scraping RSS...');
    const results: any[] = [];
    let stats = { count: 0, skipped: 0, errors: 0 };

    for (const feed of FEEDS) {
        try {
            const xmlRes = await fetch(feed.url);
            if (!xmlRes.ok) throw new Error(`HTTP ${xmlRes.status}`);
            const xml = await xmlRes.text();

            const itemRegex = /<item[\s>][\s\S]*?<\/item>/gi;
            const items = xml.match(itemRegex) || [];

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

                const images = extractImagesFromHtml(content);
                
                results.push({
                    title: title.substring(0, 255),
                    text: text.substring(0, 5000),
                    source_url: link,
                    source_name: feed.name,
                    image_url: images[0] || '',
                    images_url: images.slice(0, 10),
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
    
    const { data: raws, error } = await query;
    if (error || !raws) return { count: 0, error: error?.message };

    let processed = 0;
    for (const raw of raws) {
        const slug = raw.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').substring(0, 80);
        
        const { error: insErr } = await supabase.from('articles').insert([{
            title: raw.title,
            text: raw.text,
            image_url: raw.image_url,
            images_urls: raw.images_url,
            published_at: new Date().toISOString(),
            author: 'Saladillo Vivo',
            source_url: raw.source_url,
            slug: `${slug}-${Date.now().toString().slice(-4)}`,
            category: 'Local',
            status: 'draft'
        }]);

        if (!insErr) {
            await supabase.from('articles_crudos').update({ status: 'procesado' }).eq('id', raw.id);
            processed++;
        }
    }
    return { count: processed };
}

// ─────────────────────────────────────────────────────────────────────────────
// FASE 3: RESUMEN IA
// ─────────────────────────────────────────────────────────────────────────────

async function runResumen(ids?: number[]) {
    console.log('[Pipeline] F3: Resumen IA...');
    const query = supabase.from('articles').select('id, title, text').is('super_resumen', null);
    if (ids && ids.length > 0) query.in('id', ids);
    
    const { data: articles, error } = await query.order('created_at', { ascending: false }).limit(5);
    if (error || !articles) return { count: 0, error: error?.message };

    let processed = 0;
    for (const art of articles) {
        try {
            const prompt = `Sos Ara, presentadora de noticias. Resumí esto en 4 oraciones cortas e impactantes. Usá voseo rioplatense profesional. Noticia: ${art.title}. ${art.text.substring(0, 2000)}`;
            const aiRes = await fetch(`${APP_URL}/api/ai-proxy?provider=gemini`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    system: "Sos Ara, la IA de Saladillo Vivo."
                })
            });

            const data = await aiRes.json();
            if (data?.text) {
                await supabase.from('articles').update({ super_resumen: data.text }).eq('id', art.id);
                processed++;
            }
        } catch (e:any) { console.error(`Error resumen ${art.id}:`, e.message); }
    }
    return { count: processed };
}

// ─────────────────────────────────────────────────────────────────────────────
// FASE 4: AUDIO TTS
// ─────────────────────────────────────────────────────────────────────────────

async function runAudio(ids?: number[]) {
    console.log('[Pipeline] F4: Audio TTS...');
    const query = supabase.from('articles').select('id, super_resumen').is('audio_url', null).not('super_resumen', 'is', null);
    if (ids && ids.length > 0) query.in('id', ids);

    const { data: articles, error } = await query.limit(5);
    if (error || !articles) return { count: 0, error: error?.message };

    let processed = 0;
    const ttsKey = process.env.GOOGLE_TTS_API_KEY;

    for (const art of articles) {
        try {
            const ssml = `<speak xml:lang='es-US'><prosody rate='1.05'>${art.super_resumen}</prosody></speak>`;
            const ttsRes = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${ttsKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input: { ssml },
                    voice: { languageCode: 'es-US', name: 'es-US-Chirp3-HD-Aoede' },
                    audioConfig: { audioEncoding: 'MP3' }
                })
            });

            const data = await ttsRes.json();
            if (data.audioContent) {
                const fileName = `tts_cache_${crypto.createHash('sha256').update(ssml).digest('hex')}.mp3`;
                await r2.send(new PutObjectCommand({
                    Bucket: R2_BUCKET_NAME, Key: `audios_Ara/${fileName}`, Body: Buffer.from(data.audioContent, 'base64'), ContentType: 'audio/mpeg'
                }));
                const audioUrl = `${R2_PUBLIC_BASE}/audios_Ara/${fileName}`;
                await supabase.from('articles').update({ audio_url: audioUrl, audio_status: 'ready' }).eq('id', art.id);
                processed++;
            }
        } catch (e:any) { console.error(`Error audio ${art.id}:`, e.message); }
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
    for (const art of articles) {
        try {
            const words = (art.super_resumen || '').split(/\s+/).length;
            const duration = Math.max(12, Math.round((words / 200) * 60) + 5);
            
            const html = `<!DOCTYPE html><html><body style="background:black;color:white;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;font-family:sans-serif;padding:5%;text-align:center;">
                <h1 style="font-size:8vw;margin-bottom:2vh;">${art.title}</h1>
                <p style="font-size:4vw;line-height:1.2;">${art.super_resumen}</p>
                <script>setTimeout(() => window.parent.postMessage({type:'SLIDE_ENDED'}, '*'), ${duration * 1000});</script>
            </body></html>`;

            const fileName = `slide_${art.id}_${Date.now()}.html`;
            await r2.send(new PutObjectCommand({
                Bucket: R2_BUCKET_NAME, Key: `slides/${fileName}`, Body: Buffer.from(html), ContentType: 'text/html'
            }));
            const slideUrl = `${CDN_URL}/slides/${fileName}`;

            await supabase.from('articles').update({ url_slide: slideUrl, animation_duration: duration }).eq('id', art.id);
            processed++;
        } catch (e:any) { console.error(`Error slide ${art.id}:`, e.message); }
    }
    return { count: processed };
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const action = (req.query.action || req.body?.action || 'full').toString();
    const ids = req.body?.ids || [];

    try {
        if (action === 'scrape') return res.status(200).json(await runScraping());
        if (action === 'transform') return res.status(200).json(await runTransformation(ids));
        if (action === 'resumen') return res.status(200).json(await runResumen(ids));
        if (action === 'audio') return res.status(200).json(await runAudio(ids));
        if (action === 'slide') return res.status(200).json(await runSlide(ids));
        
        if (action === 'full') {
            const scrape = await runScraping();
            const transform = await runTransformation();
            const resumen = await runResumen();
            const audio = await runAudio();
            const slide = await runSlide();
            return res.status(200).json({ success: true, steps: { scrape, transform, resumen, audio, slide } });
        }

        return res.status(400).json({ error: 'Invalid action' });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
}
