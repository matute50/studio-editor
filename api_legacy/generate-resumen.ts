import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────
// Supabase client
// ─────────────────────────────────────────────────
const SUPABASE_URL = 'https://otwvfihzaznyjvjtkvvd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90d3ZmaWh6YXpueWp2anRrdnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxMDQ3OTAsImV4cCI6MjA2MDY4MDc5MH0.YbKdivZM6gJCdXAf51Xctn8IpKhQCrMch89NoHwP0Z4';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─────────────────────────────────────────────────
// Gemini: rotación de claves + modelos
// ─────────────────────────────────────────────────
const GEMINI_MODELS = [
    { model: 'gemini-2.0-flash', v: 'v1beta' },
    { model: 'gemini-1.5-flash', v: 'v1beta' },
    { model: 'gemini-2.5-flash-preview', v: 'v1beta' },
    { model: 'gemini-1.5-pro', v: 'v1beta' },
];

function getGeminiKeys(): string[] {
    const keys: string[] = [];
    for (let i = 1; i <= 14; i++) {
        const k = i === 1
            ? process.env.GEMINI_API_KEY
            : process.env[`GEMINI_API_KEY_${i}`];
        if (k && k.length > 10) keys.push(k.trim());
    }
    return [...new Set(keys)];
}

/**
 * Llama a Gemini con rotación automática de claves y modelos.
 * Si una clave o modelo falla, prueba el siguiente.
 */
async function callGemini(system: string, prompt: string): Promise<string> {
    const keys = getGeminiKeys();
    if (keys.length === 0) throw new Error('No hay claves Gemini configuradas en el entorno.');

    let lastError = '';

    for (const key of keys) {
        for (const { model, v } of GEMINI_MODELS) {
            try {
                const url = `https://generativelanguage.googleapis.com/${v}/models/${model}:generateContent?key=${key}`;
                const body = {
                    contents: [{ parts: [{ text: prompt }] }],
                    systemInstruction: { parts: [{ text: system }] },
                    generationConfig: { temperature: 0.3, maxOutputTokens: 512 }
                };

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                const raw = await response.json();

                if (response.ok && raw.candidates?.[0]?.content?.parts?.[0]?.text) {
                    return raw.candidates[0].content.parts[0].text.trim();
                }

                const errMsg = raw.error?.message || JSON.stringify(raw).substring(0, 100);
                console.warn(`[Gemini] Falló ${model} con key ...${key.slice(-4)}: ${errMsg}`);
                lastError = errMsg;

            } catch (e: any) {
                lastError = e.message;
            }
        }
    }

    throw new Error(`Gemini: todas las claves y modelos fallaron. Último error: ${lastError}`);
}

// ─────────────────────────────────────────────────
// PROMPT ESTILO ARA
// ─────────────────────────────────────────────────

const SYSTEM_ARA = `
ERES UN SENIOR NEWS EDITOR DE SALADILLO VIVO. TU ÚNICA FUNCIÓN ES GENERAR GUIONES PARA ARA, UNA PRESENTADORA DE NOTICIAS ARGENTINA DE BUENOS AIRES.

REGLAS DE ORO (ESTILO ARA):
1. VOSEO RIOPLATENSE PROFESIONAL: Usá "vos, tenés, sabés". PROHIBIDO "tú", "usted" o neutro.
2. VOZ ACTIVA OBLIGATORIA.
3. TONO FORMAL Y AUTORITARIO. PROHIBIDO "viste", "che", "pibe".
4. SHEÍSMO: LL y Y → SSH (ej: "SSHO", "SSHUVIA").
5. TODO EN MAYÚSCULAS.
6. EXACTAMENTE 4 ORACIONES:
   - Oración 1: Entre 18 y 21 palabras. Empieza con Ancla (TE CUENTO, FIJATE, COMO VOS SABÉS).
   - Oraciones 2 y 3: Entre 15 y 18 palabras cada una. Tono directo.
   - Oración 4: Entre 15 y 18 palabras. Termina con CTA: VISITÁ NUESTRA WEB / ENTRÁ A NUESTRO SITIO / ENTERÁTE DE TODO.
7. PROHIBIDO: "HOY", "AYER", "MAÑANA" (atemporalidad).
8. ANTIBALBUCEO: Sin dobles letras (VISITÁNOS no VISITÁANOS).
`.trim();

function buildPrompt(title: string, text: string): string {
    const textoTruncado = text.substring(0, 1500);
    return `GENERÁ UN SÚPER RESUMEN ESTILO ARA PARA ESTA NOTICIA.\n\nTÍTULO: ${title}\n\nCUERPO:\n${textoTruncado}\n\nREGLA ESTRICTA: DEVOLVÉ ÚNICAMENTE LAS 4 ORACIONES, UNA POR LÍNEA, SIN NUMERACIÓN, SIN COMILLAS, SIN PREFIJOS. TODO EN MAYÚSCULAS.`;
}

// ─────────────────────────────────────────────────
// VALIDADOR DE RESUMEN
// ─────────────────────────────────────────────────

function validateResumen(resumen: string): { valid: boolean; issues: string[] } {
    const lines = resumen.split('\n').map(l => l.trim()).filter(Boolean);
    const issues: string[] = [];

    if (lines.length !== 4) {
        issues.push(`Debe tener exactamente 4 oraciones, tiene ${lines.length}`);
    }

    lines.forEach((line, i) => {
        const wordCount = line.split(/\s+/).filter(w => w.length > 0).length;
        const minW = i === 0 ? 18 : 15;
        const maxW = i === 0 ? 21 : 18;
        if (wordCount < minW || wordCount > maxW) {
            issues.push(`Oración ${i + 1}: ${wordCount} palabras (esperado ${minW}-${maxW})`);
        }
    });

    const lastLine = lines[lines.length - 1] || '';
    if (!/VISITÁ|ENTRÁ|ENTERÁTE/i.test(lastLine)) {
        issues.push('La última oración no tiene CTA obligatorio');
    }

    return { valid: issues.length === 0, issues };
}

// ─────────────────────────────────────────────────
// HANDLER PRINCIPAL
// ─────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log('[Super Resumen] Iniciando generación...');

    const errors: string[] = [];
    const generated: { id: number; title: string; valid: boolean }[] = [];

    try {
        // Determinar artículos a procesar
        // POST { ids: number[] } → procesar específicos
        // GET → todos los que no tienen super_resumen
        const specificIds: number[] = req.body?.ids || [];
        let query = supabase
            .from('articles')
            .select('id, title, text, super_resumen')
            .order('created_at', { ascending: false })
            .limit(20); // Procesar de a 20 para evitar timeouts

        if (specificIds.length > 0) {
            query = supabase
                .from('articles')
                .select('id, title, text, super_resumen')
                .in('id', specificIds);
        } else {
            // Solo artículos sin super_resumen
            query = supabase
                .from('articles')
                .select('id, title, text, super_resumen')
                .is('super_resumen', null)
                .order('created_at', { ascending: false })
                .limit(20);
        }

        const { data: articles, error: fetchErr } = await query;

        if (fetchErr) {
            return res.status(500).json({ success: false, error: fetchErr.message });
        }
        if (!articles || articles.length === 0) {
            return res.status(200).json({ success: true, count: 0, message: 'No hay artículos pendientes de resumen.' });
        }

        console.log(`[Super Resumen] ${articles.length} artículo(s) a procesar.`);

        // Procesar cada artículo secuencialmente (evitar rate limit)
        for (const article of articles) {
            if (!article.title || !article.text || article.text.length < 50) {
                console.warn(`[Super Resumen] Artículo ${article.id} sin contenido suficiente, omitiendo.`);
                continue;
            }

            try {
                const prompt = buildPrompt(article.title, article.text);
                let resumen = await callGemini(SYSTEM_ARA, prompt);

                // Limpiar artefactos de markdown
                resumen = resumen
                    .replace(/```[\s\S]*?```/g, '')
                    .replace(/\[.*?\]/g, '')
                    .replace(/\*\*/g, '')
                    .trim()
                    .toUpperCase();

                const { valid, issues } = validateResumen(resumen);

                if (!valid) {
                    console.warn(`[Super Resumen] Artículo ${article.id} — resumen con problemas:`, issues);
                }

                // Guardar en la base de datos
                const { error: updateErr } = await supabase
                    .from('articles')
                    .update({ super_resumen: resumen })
                    .eq('id', article.id);

                if (updateErr) {
                    const msg = `[Super Resumen] ❌ Error guardando ${article.id}: ${updateErr.message}`;
                    console.error(msg);
                    errors.push(msg);
                    continue;
                }

                generated.push({ id: article.id, title: article.title.substring(0, 60), valid });
                console.log(`[Super Resumen] ✅ ${article.id}: "${article.title.substring(0, 50)}" (válido: ${valid})`);

                // Pequeña pausa entre llamadas para respetar rate limits
                await new Promise(r => setTimeout(r, 800));

            } catch (err: any) {
                const msg = `[Super Resumen] ❌ Error en artículo ${article.id}: ${err.message}`;
                console.error(msg);
                errors.push(msg);
            }
        }

    } catch (err: any) {
        console.error('[Super Resumen] Error crítico:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }

    const result = {
        success: true,
        generated: generated.length,
        invalid: generated.filter(g => !g.valid).length,
        articles: generated,
        errors: errors.length > 0 ? errors : undefined
    };

    console.log('[Super Resumen] Finalizado:', result);
    return res.status(200).json(result);
}
