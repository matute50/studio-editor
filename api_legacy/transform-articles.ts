import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────
// Supabase client (server-side)
// ─────────────────────────────────────────────────
const SUPABASE_URL = 'https://otwvfihzaznyjvjtkvvd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90d3ZmaWh6YXpueWp2anRrdnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxMDQ3OTAsImV4cCI6MjA2MDY4MDc5MH0.YbKdivZM6gJCdXAf51Xctn8IpKhQCrMch89NoHwP0Z4';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─────────────────────────────────────────────────
// UTILIDADES DE TRANSFORMACIÓN
// ─────────────────────────────────────────────────

/**
 * Genera un slug SEO-friendly desde un título.
 * Ej: "Saladillo: Nuevo Hospital en 2026" → "saladillo-nuevo-hospital-en-2026"
 */
function generateSlug(title: string): string {
    return title
        .normalize('NFD')                         // Descomponer acentos
        .replace(/[\u0300-\u036f]/g, '')          // Eliminar marcas diacríticas
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')             // Solo alfanumérico y espacios
        .trim()
        .replace(/\s+/g, '-')                     // Espacios → guiones
        .replace(/-+/g, '-')                      // Múltiples guiones → uno
        .substring(0, 100);                        // Máximo 100 caracteres
}

/**
 * Asegura que el slug sea único consultando la base de datos.
 * Si ya existe, agrega un sufijo numérico.
 */
async function ensureUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let attempt = 0;

    while (true) {
        const { data } = await supabase
            .from('articles')
            .select('id')
            .eq('slug', slug)
            .single();

        if (!data) return slug; // Slug libre → usarlo

        attempt++;
        slug = `${baseSlug}-${attempt}`;
        if (attempt > 20) {
            // Fallback con timestamp si hay demasiados conflictos
            return `${baseSlug}-${Date.now()}`;
        }
    }
}

/**
 * Genera una descripción corta (excerpt) desde el texto completo.
 * Toma las primeras 2-3 oraciones, máximo 160 caracteres.
 */
function generateDescription(text: string): string {
    if (!text) return '';

    // Tomar las primeras oraciones
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    let description = '';

    for (const sentence of sentences) {
        const candidate = (description + sentence.trim() + '. ').trim();
        if (candidate.length <= 160) {
            description = candidate;
        } else {
            break;
        }
    }

    if (!description && text.length > 0) {
        // Fallback: truncar el texto directamente
        description = text.substring(0, 157).trim() + '...';
    }

    return description.trim();
}

/**
 * Genera meta_title y meta_description para SEO.
 */
function generateMeta(title: string, description: string, sourceName: string) {
    const metaTitle = title.length > 60
        ? title.substring(0, 57).trim() + '...'
        : `${title} | Saladillo Vivo`;

    const metaDescription = description.length > 155
        ? description.substring(0, 152).trim() + '...'
        : description || `Leé la noticia completa en Saladillo Vivo. Fuente: ${sourceName}.`;

    return { metaTitle, metaDescription };
}

/**
 * Genera palabras clave para SEO desde el título y texto.
 */
function generateKeywords(title: string, sourceName: string): string {
    const baseKw = ['saladillo', 'noticias saladillo', 'saladillo vivo'];
    const titleWords = title
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 4 && !['desde', 'hasta', 'sobre', 'entre', 'donde', 'como', 'para'].includes(w));

    const unique = Array.from(new Set([...baseKw, ...titleWords.slice(0, 5)]));
    return unique.join(', ');
}

// ─────────────────────────────────────────────────
// TRANSFORM: article_crudo → article
// ─────────────────────────────────────────────────

interface ArticleCrudo {
    id: string;
    title: string;
    text: string;
    image_url: string;
    images_url: string[];
    source_url: string;
    source_name?: string;
    status: string;
    created_at: string;
}

interface ArticleTransformed {
    title: string;
    text: string;
    description: string;
    image_url: string;
    images_urls: string[] | null;
    slug: string;
    meta_title: string;
    meta_description: string;
    meta_keywords: string;
    status: 'published';
    is_published: boolean;
    published_at: string;
    featureStatus: null;
    audio_url: null;
    url_slide: null;
    super_resumen: null;
}

async function transformCrudo(crudo: ArticleCrudo): Promise<ArticleTransformed> {
    const title = (crudo.title || '').trim();
    const text = (crudo.text || '').trim();
    const sourceName = crudo.source_name || 'Saladillo Vivo';

    const description = generateDescription(text);
    const baseSlug = generateSlug(title);
    const slug = await ensureUniqueSlug(baseSlug);
    const { metaTitle, metaDescription } = generateMeta(title, description, sourceName);
    const keywords = generateKeywords(title, sourceName);

    // Normalizar imágenes: images_url (array de text) → images_urls (jsonb)
    const imagesArray = Array.isArray(crudo.images_url)
        ? crudo.images_url.filter(Boolean)
        : [];

    return {
        title,
        text,
        description,
        image_url: crudo.image_url || imagesArray[0] || '',
        images_urls: imagesArray.length > 0 ? imagesArray : null,
        slug,
        meta_title: metaTitle,
        meta_description: metaDescription,
        meta_keywords: keywords,
        status: 'published',
        is_published: true,
        published_at: crudo.created_at || new Date().toISOString(),
        featureStatus: null,
        audio_url: null,
        url_slide: null,
        super_resumen: null
    };
}

// ─────────────────────────────────────────────────
// HANDLER PRINCIPAL
// ─────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Aceptar GET y POST
    // GET → transforma todos los 'nuevo'
    // POST con body { ids: string[] } → transforma solo los IDs indicados
    console.log('[Transform] Iniciando transformación de artículos crudos...');

    const errors: string[] = [];
    const transformed: string[] = [];
    const skipped: string[] = [];

    try {
        // 1. Determinar qué artículos transformar
        let query = supabase
            .from('articles_crudos')
            .select('*')
            .eq('status', 'nuevo')
            .order('created_at', { ascending: true });

        // Si vienen IDs específicos en el body (POST)
        const specificIds: string[] = req.body?.ids || [];
        if (specificIds.length > 0) {
            query = supabase
                .from('articles_crudos')
                .select('*')
                .in('id', specificIds);
        }

        const { data: crudos, error: fetchError } = await query;

        if (fetchError) {
            console.error('[Transform] Error al leer articles_crudos:', fetchError.message);
            return res.status(500).json({ success: false, error: fetchError.message });
        }

        if (!crudos || crudos.length === 0) {
            console.log('[Transform] No hay artículos para transformar.');
            return res.status(200).json({ success: true, count: 0, message: 'No hay artículos nuevos.' });
        }

        console.log(`[Transform] ${crudos.length} artículo(s) para transformar.`);

        // 2. Procesar cada crudo
        for (const crudo of crudos as ArticleCrudo[]) {
            // Validar campos mínimos
            if (!crudo.title || crudo.title.trim().length < 5) {
                console.warn(`[Transform] Artículo ${crudo.id} sin título válido, omitiendo.`);
                skipped.push(crudo.id);
                continue;
            }
            if (!crudo.text || crudo.text.trim().length < 30) {
                console.warn(`[Transform] Artículo ${crudo.id} sin texto suficiente, omitiendo.`);
                skipped.push(crudo.id);
                continue;
            }

            try {
                // Transformar
                const articleData = await transformCrudo(crudo);

                // 3. Insertar en la tabla `articles`
                const { error: insertError } = await supabase
                    .from('articles')
                    .insert(articleData);

                if (insertError) {
                    const msg = `[Transform] ❌ Error insertando "${crudo.title?.substring(0, 50)}": ${insertError.message}`;
                    console.error(msg);
                    errors.push(msg);
                    continue;
                }

                // 4. Marcar el crudo como 'procesado'
                const { error: updateError } = await supabase
                    .from('articles_crudos')
                    .update({ status: 'procesado' })
                    .eq('id', crudo.id);

                if (updateError) {
                    console.warn(`[Transform] ⚠️ No se pudo marcar ${crudo.id} como procesado:`, updateError.message);
                }

                transformed.push(crudo.id);
                console.log(`[Transform] ✅ Transformado: "${crudo.title?.substring(0, 60)}" → slug: ${articleData.slug}`);

            } catch (err: any) {
                const msg = `[Transform] ❌ Error procesando ${crudo.id}: ${err.message}`;
                console.error(msg);
                errors.push(msg);
            }
        }

    } catch (err: any) {
        console.error('[Transform] Error crítico:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }

    const result = {
        success: true,
        transformed: transformed.length,
        skipped: skipped.length,
        errors: errors.length > 0 ? errors : undefined
    };

    console.log('[Transform] Resultado final:', result);
    return res.status(200).json(result);
}
