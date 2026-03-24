import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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
const CDN_URL = 'https://media.saladillovivo.com.ar';

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
// CÁLCULO DE DURACIÓN
// ─────────────────────────────────────────────────

/**
 * Calcula la duración del slide basándose en la cantidad de palabras del resumen.
 * Usa la misma fórmula que calculateAutoDuration en SlideGenerator.tsx.
 */
function calcDuration(text: string): number {
    if (!text) return 15;
    const words = text.trim().split(/\s+/).length;
    // Fórmula: words/200 * 60 + 5 (lectora a ~200 ppm, + buffer)
    return Math.max(12.0, Math.round((words / 200) * 60) + 5.0);
}

// ─────────────────────────────────────────────────
// GENERADOR DE HTML STANDALONE
// (Port server-side de SlideGenerator.tsx:generateStandaloneHtml)
// ─────────────────────────────────────────────────

interface ImageData {
    url: string;
    fS: number; // Ken Burns scale
    fX: number; // Ken Burns translateX %
    fY: number; // Ken Burns translateY %
}

/**
 * Genera el HTML del slide completamente autónomo con GSAP.
 * Idéntico al que produce el editor manual, pero sin depender del estado del browser.
 */
function generateSlideHtml(
    title: string,
    body: string,
    duration: number,
    images: string[]
): string {
    const rawTitle = (title || 'SALADILLO VIVO').toUpperCase();
    const tickerBody = (body || '').toUpperCase().substring(0, 500);

    // Dividir título en dos líneas (respeta pipe | o balancea palabras)
    const titleParts = rawTitle.split('|').map((s: string) => s.trim());
    let line1: string;
    let line2: string;

    if (titleParts.length >= 2) {
        line1 = titleParts[0];
        line2 = titleParts.slice(1).join(' ');
    } else {
        const words = rawTitle.split(' ');
        const mid = Math.ceil(words.length / 2);
        line1 = words.slice(0, mid).join(' ');
        line2 = words.slice(mid).join(' ');
    }

    // Datos de imagen con Ken Burns neutro (sin crop personalizado en modo automático)
    const imageData: ImageData[] = (images.length > 0 ? images : [''])
        .filter(Boolean)
        .map((url: string) => ({
            url,
            fS: 1.06,  // Zoom sutil (6%) para dar sensación de movimiento
            fX: 0,
            fY: 0
        }));

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Saladillo Vivo Master Slide (Visual Only)</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;900&display=swap');
        :root { --brand-blue: #003399; }
        * { margin: 0; padding: 0; box-sizing: border-box; overflow: hidden; }
        body { background: #000; font-family: 'Inter', sans-serif; width: 100vw; height: 100vh; color: #fff; }
        .master-container { width: 100vw; height: 100vh; position: relative; background: #000; }
        .img-container { position: absolute; inset: 0; opacity: 0; z-index: 10; background: #000; }
        .bg-image { width: 100%; height: 100%; object-fit: cover; transform-origin: center; }
        .overlay { position: absolute; inset: 0; background: radial-gradient(circle, rgba(0,0,0,0) 30%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0.6) 100%); z-index: 100; pointer-events: none; }
        .progress-bar { position: absolute; width: 0%; height: 1.2vh; background: var(--brand-blue); z-index: 200; box-shadow: 0 0 15px rgba(0,51,153,0.5); }
        .progress-top { top: 0; right: 0; }
        .progress-bottom { bottom: 9.16%; left: 0; }
        .logo-area { position: absolute; top: 3.61%; left: 0; height: 8.33%; z-index: 150; display: inline-flex; align-items: center; padding-left: 2.5%; padding-right: calc(2rem - 25px); background: linear-gradient(to right, var(--brand-blue) 0%, transparent 100%); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border-radius: 0 2rem 2rem 0; box-shadow: 10px 0 30px rgba(0,0,0,0.3); }
        .logo-img { height: 75%; filter: drop-shadow(0 0 15px rgba(0,0,0,1)); }
        .logo-bottom-progress { position: absolute; bottom: 0; left: 0; height: 0.6vh; background: #ff0000; width: 0%; filter: blur(2px); box-shadow: 0 0 10px rgba(255,0,0,0.8); z-index: 160; }
        .title-area { position: absolute; bottom: 14.52%; right: 0; width: fit-content; max-width: 85%; height: 20%; z-index: 150; display: flex; flex-direction: column; justify-content: center; align-items: flex-end; padding-right: calc(3.5% + 10px); padding-left: 2.5rem; overflow: visible; }
        .title-bg { position: absolute; inset: 0; z-index: 1; background: linear-gradient(to left, var(--brand-blue) 0%, transparent 100%); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border-radius: 2.5rem 0 0 2.5rem; box-shadow: -10px 0 30px rgba(0,0,0,0.5); }
        .title-text { position: relative; z-index: 180; font-size: 9.4vh; font-weight: 900; font-style: italic; text-transform: uppercase; line-height: 0.92; text-align: right; letter-spacing: -0.02em; color: #fff; filter: drop-shadow(0 10px 25px rgba(0,0,0,1)); text-shadow: 0 0 15px rgba(0,0,0,1), 0 0 10px rgba(0,0,0,1); display: flex; flex-direction: column; white-space: nowrap; padding-right: 37px; margin-right: -27px; transform: translateX(2px); }
        .title-bottom-progress, .title-top-progress { position: absolute; right: 0; height: 0.6vh; background: #ff0000; width: 0%; filter: blur(2px); box-shadow: 0 0 10px rgba(255,0,0,0.8); z-index: 160; }
        .title-bottom-progress { bottom: 0; }
        .title-top-progress { top: 0; }
        .title-red-rect { position: absolute; top: 0; height: 100%; background: #ff0000; z-index: 5; filter: blur(35px); }
        .ticker-bar { position: absolute; bottom: 0; left: 0; width: 100%; height: 9.16%; background: rgba(0,0,0,0.95); z-index: 200; display: flex; align-items: center; }
        .ticker-label { width: 17.81%; height: 100%; background: var(--brand-blue); color: white; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 3.4vh; z-index: 210; }
        .ticker-scroll { flex: 1; height: 100%; position: relative; overflow: hidden; display: flex; align-items: center; }
        .ticker-text { white-space: nowrap; font-size: 4.8vh; font-weight: 900; color: white; position: absolute; left: 0; top: 50%; transform: translateY(-50%); }
        .fade-screen { position: absolute; inset: 0; background: #000; z-index: 1000; opacity: 0; pointer-events: none; }
        @keyframes red-rect-ping-pong-1 { 0%, 100% { left: calc(100% - 43px); } 50% { left: 0%; } }
        @keyframes red-rect-ping-pong-2 { 0%, 100% { left: calc(100% - 65px); } 50% { left: 0%; } }
    </style>
</head>
<body>
    <div class="master-container">
        <div class="progress-bar progress-top" id="progTop"></div>
        <div class="progress-bar progress-bottom" id="progBottom"></div>

        <div id="imagesWrapper">
            ${imageData.map((img: ImageData, i: number) => `
                <div class="img-container" id="img_${i}">
                    <img src="${img.url}" class="bg-image" id="bg_${i}" crossorigin="anonymous">
                </div>
            `).join('')}
        </div>

        <div class="overlay"></div>

        <div class="logo-area" id="logoArea" style="position:absolute;left:0;width:25%;overflow:hidden;border-radius:0 2.5rem 2.5rem 0;">
            <div style="position:absolute;inset:0;border-radius:0 2.5rem 2.5rem 0;overflow:hidden;z-index:150;">
                <div style="position:absolute;inset:0;background:linear-gradient(to right,var(--brand-blue) 0%,transparent 100%);backdrop-filter:blur(8px);"></div>
                <div class="title-red-rect" style="background:#6699ff;width:43px;animation:red-rect-ping-pong-1 4.5s ease-in-out infinite 0.1s;"></div>
                <div class="title-red-rect" style="background:#000;width:43px;animation:red-rect-ping-pong-1 5.1s ease-in-out infinite 0.2s;"></div>
                <div class="title-red-rect" style="background:#f00;width:43px;animation:red-rect-ping-pong-1 3.9s ease-in-out infinite;"></div>
                <div class="title-red-rect" style="background:#fff;width:43px;animation:red-rect-ping-pong-1 4.7s ease-in-out infinite 0.3s;"></div>
                <div class="title-red-rect" style="background:#6699ff;width:65px;animation:red-rect-ping-pong-2 6.2s ease-in-out infinite 0.4s;"></div>
                <div class="title-red-rect" style="background:#000;width:65px;animation:red-rect-ping-pong-2 5.8s ease-in-out infinite 0.6s;"></div>
                <div class="title-red-rect" style="background:#f00;width:65px;animation:red-rect-ping-pong-2 5.4s ease-in-out infinite 0.5s;"></div>
                <div class="title-red-rect" style="background:#fff;width:65px;animation:red-rect-ping-pong-2 6.8s ease-in-out infinite 0.7s;"></div>
            </div>
            <div style="position:relative;z-index:151;display:flex;align-items:center;height:100%;padding-right:calc(2rem - 25px);">
                <div class="logo-bottom-progress" id="logoTopProg" style="top:0;bottom:auto;"></div>
                <img src="https://pub-5b294f92f42e4cbda687d0122e15bc72.r2.dev/logos/NOTICIAS.png" class="logo-img">
                <div class="logo-bottom-progress" id="logoBottomProg"></div>
            </div>
        </div>

        <div class="title-area" id="titleArea">
            <div style="position:absolute;inset:0;border-radius:2.5rem 0 0 2.5rem;overflow:hidden;z-index:1;">
                <div class="title-bg"></div>
                <div class="title-red-rect" style="background:#6699ff;width:43px;animation:red-rect-ping-pong-1 4.5s ease-in-out infinite 0.1s;"></div>
                <div class="title-red-rect" style="background:#000;width:43px;animation:red-rect-ping-pong-1 5.1s ease-in-out infinite 0.2s;"></div>
                <div class="title-red-rect" style="background:#f00;width:43px;animation:red-rect-ping-pong-1 3.9s ease-in-out infinite;"></div>
                <div class="title-red-rect" style="background:#fff;width:43px;animation:red-rect-ping-pong-1 4.7s ease-in-out infinite 0.3s;"></div>
                <div class="title-red-rect" style="background:#6699ff;width:65px;animation:red-rect-ping-pong-2 6.2s ease-in-out infinite 0.4s;"></div>
                <div class="title-red-rect" style="background:#000;width:65px;animation:red-rect-ping-pong-2 5.8s ease-in-out infinite 0.6s;"></div>
                <div class="title-red-rect" style="background:#f00;width:65px;animation:red-rect-ping-pong-2 5.4s ease-in-out infinite 0.5s;"></div>
                <div class="title-red-rect" style="background:#fff;width:65px;animation:red-rect-ping-pong-2 6.8s ease-in-out infinite 0.7s;"></div>
            </div>
            <div class="title-top-progress" id="titleTopProg" style="width:calc(100% - 2.5rem);background:linear-gradient(to left,#f00 0%,rgba(255,0,0,0.1) 100%);"></div>
            <div class="title-text" id="titleText">
                <span>${line1}</span>
                <span>${line2}</span>
            </div>
            <div class="title-bottom-progress" id="titleBottomProg" style="width:calc(100% - 2.5rem);background:linear-gradient(to left,#f00 0%,rgba(255,0,0,0.1) 100%);"></div>
        </div>

        <div class="ticker-bar">
            <div class="ticker-label">ÚLTIMA NOTICIA</div>
            <div class="ticker-scroll">
                <div class="ticker-text" id="tickerTextScroll">${tickerBody}</div>
            </div>
        </div>

        <div class="fade-screen" id="fade"></div>
    </div>

    <script>
        const DURATION = ${duration};
        const IMAGE_DATA = ${JSON.stringify(imageData)};

        window.addEventListener('load', () => {
            window.parent.postMessage({ type: 'SET_SLIDE_DURATION', durationSeconds: DURATION }, '*');
            startVisuals();
        });

        function emitirFinDeSlide() {
            window.parent.postMessage({ type: 'SLIDE_ENDED' }, '*');
        }

        function adjustTitleFontSize() {
            const titleText = document.getElementById('titleText');
            if (!titleText) return;
            const maxWidth = window.innerWidth * 0.65;
            let currentFontSize = parseFloat(window.getComputedStyle(titleText).fontSize);
            const spans = titleText.querySelectorAll('span');
            let maxSpanWidth = 0;
            spans.forEach(s => { maxSpanWidth = Math.max(maxSpanWidth, s.offsetWidth); });
            if (maxSpanWidth > maxWidth) {
                titleText.style.fontSize = (currentFontSize * (maxWidth / maxSpanWidth)) + 'px';
            }
        }

        function startVisuals() {
            adjustTitleFontSize();
            const imagesCount = IMAGE_DATA.length;
            const timePerImage = DURATION / imagesCount;
            const fadeDur = Math.min(1.0, timePerImage);
            const ticker = document.getElementById('tickerTextScroll');
            const tl = gsap.timeline({ onComplete: emitirFinDeSlide });

            tl.fromTo('.progress-bar', { width: '0%' }, { width: '100%', duration: DURATION, ease: 'none' }, 0);
            tl.fromTo('#titleBottomProg, #titleTopProg', { clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)', duration: DURATION, ease: 'none' }, 0);
            tl.fromTo('#logoBottomProg', { width: '0%' }, { width: '100%', duration: DURATION, ease: 'none' }, 0);
            tl.fromTo('#tickerTextScroll', { x: '100vw' }, { x: -(ticker.offsetWidth + 100), duration: DURATION, ease: 'none' }, 0);
            tl.fromTo('#titleArea', { opacity: 0, x: 100 }, { opacity: 1, x: 0, duration: 0.8, ease: 'power2.out' }, 1.5);
            tl.fromTo('#titleText span', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.2, ease: 'back.out(1.7)' }, 1.8);

            IMAGE_DATA.forEach((img, i) => {
                const startTime = i * timePerImage;
                tl.set('#img_' + i, { zIndex: 20 }, startTime);
                if (i === 0) {
                    tl.set('#img_' + i, { opacity: 1 }, startTime);
                } else {
                    tl.set('#img_' + i, { opacity: 0 }, startTime);
                    tl.to('#img_' + i, { opacity: 1, duration: 1.0, ease: 'power1.in' }, startTime);
                }
                tl.fromTo('#bg_' + i,
                    { scale: 1, x: '0%', y: '0%' },
                    { scale: img.fS, x: img.fX + '%', y: img.fY + '%', duration: timePerImage + 1.0, ease: 'none' },
                    startTime
                );
                if (i > 0) {
                    tl.set('#img_' + (i - 1), { opacity: 0, zIndex: 10 }, startTime + 1.0);
                }
            });

            tl.to('#fade', { opacity: 1, duration: 1.0 }, DURATION - 1.0);
        }
    </script>
</body>
</html>`;
}

// ─────────────────────────────────────────────────
// SUBIDA DEL HTML A R2
// ─────────────────────────────────────────────────

async function uploadSlideToR2(htmlContent: string, articleId: number): Promise<string> {
    const fileName = `slide_${articleId}_${Date.now()}.html`;
    const key = `slides/${fileName}`;
    const encoder = new TextEncoder();

    await r2.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: encoder.encode(htmlContent),
        ContentType: 'text/html',
        CacheControl: 'no-cache, no-store, must-revalidate'
    }));

    return `${CDN_URL}/${key}`;
}

// ─────────────────────────────────────────────────
// HANDLER PRINCIPAL
// ─────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log('[Slide Gen] Iniciando generación automática de slides...');

    const generated: { id: number; title: string; url_slide: string; duration: number }[] = [];
    const errors: string[] = [];

    try {
        const specificIds: number[] = req.body?.ids || [];

        let query;
        if (specificIds.length > 0) {
            query = supabase
                .from('articles')
                .select('id, title, text, super_resumen, image_url, images_urls, audio_url, animation_duration')
                .in('id', specificIds);
        } else {
            // Todos los artículos con audio pero sin slide (condición natural de la Fase 5)
            query = supabase
                .from('articles')
                .select('id, title, text, super_resumen, image_url, images_urls, audio_url, animation_duration')
                .is('url_slide', null)
                .not('audio_url', 'is', null)  // Debe tener audio para calcular duración sincronizada
                .order('created_at', { ascending: false })
                .limit(15);
        }

        const { data: articles, error: fetchErr } = await query;

        if (fetchErr) {
            return res.status(500).json({ success: false, error: fetchErr.message });
        }
        if (!articles || articles.length === 0) {
            return res.status(200).json({
                success: true,
                count: 0,
                message: 'No hay artículos con audio pendientes de slide.'
            });
        }

        console.log(`[Slide Gen] ${articles.length} artículo(s) para generar.`);

        for (const article of articles) {
            if (!article.title) {
                console.warn(`[Slide Gen] Artículo ${article.id} sin título, omitiendo.`);
                continue;
            }

            try {
                // Reunir imágenes disponibles (imagen principal + galería)
                const images: string[] = Array.from(new Set([
                    article.image_url,
                    ...(Array.isArray(article.images_urls) ? article.images_urls : [])
                ])).filter(Boolean) as string[];

                if (images.length === 0) {
                    const msg = `[Slide Gen] ⚠️ Artículo ${article.id} sin imágenes, slide con fondo negro.`;
                    console.warn(msg);
                    // Continuar de todas formas con fondo negro
                }

                // Duración: usar animation_duration si ya está guardado, sino calcular
                const duration = article.animation_duration
                    ? Number(article.animation_duration)
                    : calcDuration(article.super_resumen || article.text || '');

                // Texto del ticker: usar super_resumen si existe, sino text
                const tickerText = article.super_resumen || article.text || article.title;

                // Generar HTML del slide
                const htmlContent = generateSlideHtml(
                    article.title,
                    tickerText,
                    duration,
                    images
                );

                // Subir a R2
                const slideUrl = await uploadSlideToR2(htmlContent, article.id);

                // Actualizar artículo en Supabase
                const { error: updateErr } = await supabase
                    .from('articles')
                    .update({
                        url_slide: slideUrl,
                        animation_duration: duration
                    })
                    .eq('id', article.id);

                if (updateErr) {
                    const msg = `[Slide Gen] ❌ Error guardando url_slide para ${article.id}: ${updateErr.message}`;
                    console.error(msg);
                    errors.push(msg);
                    continue;
                }

                generated.push({
                    id: article.id,
                    title: (article.title || '').substring(0, 60),
                    url_slide: slideUrl,
                    duration
                });

                console.log(`[Slide Gen] ✅ "${article.title.substring(0, 50)}" → ${duration}s — ${slideUrl}`);

                // Pequeña pausa entre uploads para R2
                await new Promise(r => setTimeout(r, 300));

            } catch (err: any) {
                const msg = `[Slide Gen] ❌ Error en artículo ${article.id}: ${err.message}`;
                console.error(msg);
                errors.push(msg);
            }
        }

    } catch (err: any) {
        console.error('[Slide Gen] Error crítico:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }

    const result = {
        success: true,
        generated: generated.length,
        articles: generated,
        errors: errors.length > 0 ? errors : undefined
    };

    console.log('[Slide Gen] Finalizado:', result);
    return res.status(200).json(result);
}
