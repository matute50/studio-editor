import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * CRON PIPELINE — Punto de entrada para el cron de Vercel.
 * Encadena las 5 fases de producción automáticamente:
 *   Fase 1: Scraping    → articles_crudos
 *   Fase 2: Transform   → articles (slug, meta, SEO)
 *   Fase 3: Resumen IA  → articles.super_resumen (Gemini Ara)
 *   Fase 4: Audio TTS   → articles.audio_url (Google TTS → R2)
 *   Fase 5: Slide HTML  → articles.url_slide (GSAP → R2)
 *
 * SEGURIDAD: Solo acepta llamadas con el header CRON_SECRET o desde el cron de Vercel.
 */

const CRON_SECRET = process.env.CRON_SECRET || 'sv-cron-2024';
const BASE_URL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://studio.saladillovivo.com.ar';

interface PhaseResult {
    ok: boolean;
    data?: any;
    error?: string;
    durationMs: number;
}

async function callPhase(path: string, label: string): Promise<PhaseResult> {
    const start = Date.now();
    try {
        const response = await fetch(`${BASE_URL}${path}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-cron-secret': CRON_SECRET
            },
            // Timeout de 55s por fase (Vercel limita funciones a 60s en plan hobbyist)
            signal: AbortSignal.timeout(55000)
        });

        const data = await response.json();
        const durationMs = Date.now() - start;

        if (!response.ok) {
            console.error(`[Cron] ❌ ${label} falló (HTTP ${response.status}):`, data);
            return { ok: false, error: data?.error || `HTTP ${response.status}`, durationMs };
        }

        console.log(`[Cron] ✅ ${label} completado en ${durationMs}ms:`, JSON.stringify(data).substring(0, 120));
        return { ok: true, data, durationMs };

    } catch (err: any) {
        const durationMs = Date.now() - start;
        console.error(`[Cron] ❌ ${label} excepción:`, err.message);
        return { ok: false, error: err.message, durationMs };
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Verificar autorización
    const secret = req.headers['x-cron-secret'] || req.query.secret;
    if (secret !== CRON_SECRET) {
        console.warn('[Cron] Acceso no autorizado.');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const pipelineStart = Date.now();
    console.log(`[Cron] 🚀 Pipeline automático iniciado — ${new Date().toISOString()}`);

    // Ejecutar fases en secuencia (cada una depende de la anterior)
    const phase1 = await callPhase('/api/scrape-news',          '🔍 Fase 1 — Scraping');
    const phase2 = await callPhase('/api/transform-articles',   '⚙️ Fase 2 — Transform');
    const phase3 = await callPhase('/api/generate-resumen',     '🧠 Fase 3 — Resumen IA');
    const phase4 = await callPhase('/api/generate-audio',       '🎙️ Fase 4 — Audio TTS');
    const phase5 = await callPhase('/api/generate-slide',       '🎬 Fase 5 — Slides');

    const totalMs = Date.now() - pipelineStart;
    const allOk = [phase1, phase2, phase3, phase4, phase5].every(p => p.ok);

    const report = {
        success: true,
        timestamp: new Date().toISOString(),
        totalMs,
        allOk,
        phases: {
            scraping:    { ok: phase1.ok, durationMs: phase1.durationMs, data: phase1.data, error: phase1.error },
            transform:   { ok: phase2.ok, durationMs: phase2.durationMs, data: phase2.data, error: phase2.error },
            resumen:     { ok: phase3.ok, durationMs: phase3.durationMs, data: phase3.data, error: phase3.error },
            audio:       { ok: phase4.ok, durationMs: phase4.durationMs, data: phase4.data, error: phase4.error },
            slides:      { ok: phase5.ok, durationMs: phase5.durationMs, data: phase5.data, error: phase5.error },
        }
    };

    console.log(`[Cron] 🏁 Pipeline finalizado — ${allOk ? '✅ TODO OK' : '⚠️ CON ERRORES'} — ${totalMs}ms`);

    return res.status(200).json(report);
}
