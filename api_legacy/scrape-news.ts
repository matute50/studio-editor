import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────
// Configuración Supabase
// ─────────────────────────────────────────────────
const SUPABASE_URL = 'https://otwvfihzaznyjvjtkvvd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90d3ZmaWh6YXpueWp2anRrdnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxMDQ3OTAsImV4cCI6MjA2MDY4MDc5MH0.YbKdivZM6gJCdXAf51Xctn8IpKhQCrMch89NoHwP0Z4';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─────────────────────────────────────────────────
// Configuración de fuentes RSS + perfil de scraping
// ─────────────────────────────────────────────────
const FEEDS = [
    {
        name: 'Ahora Saladillo',
        url: 'https://ahorasaladillo-diariodigital.com.ar/feed/',
        profile: 'ahorasaladillo'
    },
    {
        name: 'ABC Saladillo',
        url: 'https://www.abcsaladillo.com.ar/feed/',
        profile: 'abcsaladillo'
    },
    {
        name: 'Info Saladillo',
        url: 'https://infosaladillo.com.ar/feed/',
        profile: 'infosaladillo'
    }
];

// ─────────────────────────────────────────────────
// UTILIDADES BASE
// ─────────────────────────────────────────────────

/**
 * Extrae el texto entre etiquetas XML, manejando CDATA y namespaces.
 */
function extractTag(xml: string, tag: string): string {
    const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    if (!match) return '';
    return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
}

/**
 * Extrae el URL del tag <link> de un ítem RSS WordPress.
 * WordPress pone el link así: <link>https://...</link> sin atributos ni CDATA.
 * Evita confundir con <atom:link> u otros tags que tienen atributos.
 */
function extractItemLink(itemXml: string): string {
    // Buscar <link>URL</link> sin atributos (link del ítem, no atom:link)
    const m = itemXml.match(/<link>\s*(https?:[^<]+)\s*<\/link>/i);
    if (m) return m[1].trim();
    // Fallback: guid con isPermaLink="true"
    const g = itemXml.match(/<guid[^>]*isPermaLink=["']true["'][^>]*>\s*(https?:[^<]+)\s*<\/guid>/i);
    if (g) return g[1].trim();
    // Fallback final: cualquier guid
    const gAny = itemXml.match(/<guid[^>]*>\s*(https?:[^<]+)\s*<\/guid>/i);
    if (gAny) return gAny[1].trim();
    return '';
}

/**
 * Convierte una URL relativa a absoluta según el baseUrl dado.
 */
function toAbsoluteUrl(url: string, baseUrl: string): string {
    try {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        return new URL(url, baseUrl).href;
    } catch (e) {
        return url;
    }
}

/**
 * Fetch robusto con timeout y headers de navegador real.
 */
async function fetchWithTimeout(url: string, options: any = {}): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 15000);
    try {
        const resp = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache',
                ...(options.headers || {})
            }
        });
        clearTimeout(id);
        return resp;
    } catch (e) {
        clearTimeout(id);
        throw e;
    }
}

// ─────────────────────────────────────────────────
// LÓGICA DE LIMPIEZA DE HTML
// ─────────────────────────────────────────────────

/**
 * Elimina tags script, style, iframe y otros elementos no deseados del HTML.
 */
function removeJunkTags(html: string): string {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '');
}

/**
 * Convierte HTML a texto plano limpio.
 */
function htmlToCleanText(html: string): string {
    return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#8217;/g, '\u2019')
        .replace(/&#8220;/g, '"')
        .replace(/&#8221;/g, '"')
        .replace(/&#8211;/g, '–')
        .replace(/&#8230;/g, '…')
        .replace(/&[a-z#0-9]+;/gi, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/**
 * Frases en párrafos que deben ser descartadas (footer social, compartir, etc.)
 */
const JUNK_PARAGRAPH_PATTERNS = [
    /seguinos en/i,
    /compartir/i,
    /facebook|twitter|instagram|whatsapp|telegram/i,
    /the post .+ (first appeared|appeared first) on/i,
    /appeared first on/i,
    /first appeared on/i,
    /\[…\]/,
    /suscribite/i,
    /envianos tu (noticia|nota|foto)/i,
];

/**
 * Filtra párrafos con contenido basura de redes sociales y pie de página.
 */
function filterJunkParagraphs(text: string): string {
    const paragraphs = text.split('\n\n');
    const cleaned = paragraphs.filter(p => {
        const trimmed = p.trim();
        if (trimmed.length < 5) return false;
        if (JUNK_PARAGRAPH_PATTERNS.some(pat => pat.test(trimmed))) return false;
        return true;
    });
    return cleaned.join('\n\n').trim();
}

// ─────────────────────────────────────────────────
// EXTRACCIÓN DE IMÁGENES
// ─────────────────────────────────────────────────

/** Lista de patrones a excluir en URLs de imágenes */
const IMAGE_JUNK = [
    'avatar', 'logo', 'favicon', 'smiley', 'emoji', 'icon',
    's.w.org',       // emojis de WordPress
    'banner', 'ads', 'publi',
    'wp-content/themes', 'wp-content/plugins',
    'gravatar', 'pixel', 'loading', 'placeholder',
    'blank', 'transparent', 'sidebar', 'footer', 'widget', 'social',
    'sharedaddy', 'sharing',
    '80x80', '150x150', '32x32', '16x16', '100x100', '110x110'
];

/** Tamaños mínimos. Ignorar si tiene estas dimensiones en la URL */
const TINY_IMAGE_REGEX = /-(80x80|150x150|32x32|16x16|100x100|110x110)\.(webp|jpg|png|jpeg|avif|gif)$/i;

/**
 * Extrae todas las imágenes válidas de un bloque de HTML.
 */
function extractImagesFromHtml(html: string, baseUrl: string): string[] {
    const found = new Set<string>();

    // Buscar <img> con src, data-src, data-lazy-src, data-original
    const imgRegex = /<img\s+([^>]+)>/gi;
    let m: RegExpExecArray | null;
    while ((m = imgRegex.exec(html)) !== null) {
        const attrs = m[1];

        // Extraer todos los atributos de imagen
        const srcAttrs = [
            /\bsrc\s*=\s*["']([^"'>\s]+)["']/i,
            /\bdata-src\s*=\s*["']([^"'>\s]+)["']/i,
            /\bdata-lazy-src\s*=\s*["']([^"'>\s]+)["']/i,
            /\bdata-original\s*=\s*["']([^"'>\s]+)["']/i,
        ];

        for (const pat of srcAttrs) {
            const sm = attrs.match(pat);
            if (sm && sm[1]) {
                found.add(toAbsoluteUrl(sm[1], baseUrl));
                break; // Preferir src sobre data-src si src existe
            }
        }

        // srcset: tomar la primera URL de mayor tamaño si existe
        const srcsetMatch = attrs.match(/\bsrcset\s*=\s*["']([^"']+)["']/i);
        if (srcsetMatch) {
            // Parsear srcset: "url 1x, url2 2x, ..."
            const candidates = srcsetMatch[1]
                .split(',')
                .map(entry => entry.trim().split(/\s+/)[0])
                .filter(Boolean);
            // Tomar la de mayor calidad (última en la lista, mayor tamaño)
            if (candidates.length > 0) {
                const best = candidates[candidates.length - 1];
                found.add(toAbsoluteUrl(best, baseUrl));
            }
        }
    }

    // Filtrar imágenes válidas
    return Array.from(found).filter(absUrl => {
        if (!absUrl) return false;
        if (!/\.(jpg|jpeg|png|webp|avif|gif)(\?.*)?$/i.test(absUrl)) return false;
        const lower = absUrl.toLowerCase();
        if (IMAGE_JUNK.some(junk => lower.includes(junk))) return false;
        if (TINY_IMAGE_REGEX.test(absUrl)) return false;
        return true;
    });
}

/**
 * Extrae la og:image de un HTML de página completa.
 */
function extractOgImage(html: string): string {
    const metaPatterns = [
        /<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
        /<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
        /<meta\s+[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
        /<meta\s+[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i,
    ];
    for (const pat of metaPatterns) {
        const m = html.match(pat);
        if (m && m[1] && !m[1].includes('s.w.org')) return m[1].trim();
    }
    return '';
}

// ─────────────────────────────────────────────────
// EXTRACCIÓN POR PERFIL DE SITIO
// ─────────────────────────────────────────────────

interface ScrapeResult {
    title: string;
    text: string;
    image_url: string;
    images_url: string[];
    raw_html: string; // HTML del contenido del artículo
}

/**
 * Extrae el bloque de contenido de un artículo de Ahora Saladillo.
 *
 * Estructura DOM:
 *   section.th-blog-wrapper
 *     div.blog-single.style-bg
 *       div.post-XXXXX
 *         h2.blog-title          ← TÍTULO
 *         div.blog-img > img     ← IMAGEN DESTACADA
 *         div.blog-content-wrap
 *           div.blog-content
 *             div.content        ← TEXTO + GALERÍA
 *             div.blog-tag       ← FIN del contenido real
 */
function extractAhoraSaladillo(html: string, link: string): ScrapeResult {
    const cleanHtml = removeJunkTags(html);

    // Título
    const titleMatch = cleanHtml.match(/<h2[^>]*class="blog-title"[^>]*>([\s\S]*?)<\/h2>/i);
    const title = titleMatch ? htmlToCleanText(titleMatch[1]) : '';

    // Imagen destacada: div.blog-img > img (imagen principal, NO lazy)
    const featuredMatch = cleanHtml.match(/<div[^>]*class="blog-img"[^>]*>([\s\S]*?)<\/div>/i);
    let image_url = '';
    if (featuredMatch) {
        const imgs = extractImagesFromHtml(featuredMatch[1], link);
        image_url = imgs[0] || '';
    }
    // Fallback: og:image
    if (!image_url) {
        image_url = extractOgImage(cleanHtml);
    }

    // Contenido: div.content dentro de div.blog-content
    let contentHtml = '';
    const contentMatch = cleanHtml.match(/<div[^>]*class="(?:blog-content-wrap|blog-content)\s*"[^>]*>([\s\S]*?)<div[^>]*class="blog-tag"/i);
    if (contentMatch) {
        contentHtml = contentMatch[1];
    } else {
        // Fallback: buscar simplemente div.content
        const altMatch = cleanHtml.match(/<div[^>]*class="content"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class="blog-tag"/i);
        if (altMatch) contentHtml = altMatch[1];
    }

    // Eliminar div.share-links-wrap del contenido
    contentHtml = contentHtml.replace(/<div[^>]*class="share-links[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');

    // Galería: figuras dentro del contenido
    const galleryImages = extractImagesFromHtml(contentHtml, link);

    // Texto limpio
    const rawText = htmlToCleanText(contentHtml);
    const filteredText = filterJunkParagraphs(rawText);

    const allImages = Array.from(new Set([image_url, ...galleryImages].filter(Boolean)));

    return {
        title,
        text: filteredText.substring(0, 3000),
        image_url: image_url || allImages[0] || '',
        images_url: allImages.slice(0, 10),
        raw_html: contentHtml
    };
}

/**
 * Extrae el bloque de contenido de un artículo de ABC Saladillo.
 *
 * Estructura DOM (WordPress blocks):
 *   article.post
 *     h1.entry-title        ← TÍTULO
 *     div.entry-content     ← TODO el contenido (párrafos, figuras)
 *       figure.wp-block-image / .wp-block-gallery ← Galería
 *     div.sharedaddy / .jp-relatedposts ← FIN del contenido
 */
function extractAbcSaladillo(html: string, link: string): ScrapeResult {
    const cleanHtml = removeJunkTags(html);

    // og:image como imagen principal (muy confiable en ABC)
    const image_url = extractOgImage(cleanHtml);

    // Título: h1.entry-title o h1 principal
    const titleMatch = cleanHtml.match(/<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)
        || cleanHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const title = titleMatch ? htmlToCleanText(titleMatch[1]) : '';

    // Contenido: entry-content, cortando en sharedaddy/related
    let contentHtml = '';
    const entryMatch = cleanHtml.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<(?:div[^>]*class="(?:sharedaddy|jp-relatedposts|post-tags)[^"]*"|\/article)/i);
    if (entryMatch) {
        contentHtml = entryMatch[1];
    } else {
        // Fallback: capturar el primer <article> completo
        const articleMatch = cleanHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
        if (articleMatch) contentHtml = articleMatch[1];
    }

    // Galería: wp-block-gallery y figuras individuales
    const galleryImages = extractImagesFromHtml(contentHtml, link);

    // Texto limpio
    const rawText = htmlToCleanText(contentHtml);
    const filteredText = filterJunkParagraphs(rawText);

    const allImages = Array.from(new Set([image_url, ...galleryImages].filter(Boolean)));

    return {
        title,
        text: filteredText.substring(0, 3000),
        image_url: image_url || allImages[0] || '',
        images_url: allImages.slice(0, 10),
        raw_html: contentHtml
    };
}

/**
 * Extrae el bloque de contenido de un artículo de InfoSaladillo.
 *
 * Estructura DOM (tema propio):
 *   section principal o article
 *     h1               ← TÍTULO
 *     img destacada    ← IMAGEN (primera img de tamaño real, antes del sidebar)
 *     <p> párrafos     ← TEXTO
 *   div widgets/sidebar ← ignorar
 *
 * Particularidades:
 * - Emojis como <img src="https://s.w.org/..."> → filtrar
 * - No tiene galería estructurada, las fotos van inline en el contenido
 */
function extractInfoSaladillo(html: string, link: string): ScrapeResult {
    const cleanHtml = removeJunkTags(html);

    // og:image es confiable aquí también
    const image_url = extractOgImage(cleanHtml);

    // Título: h1 principal
    const titleMatch = cleanHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const title = titleMatch ? htmlToCleanText(titleMatch[1]) : '';

    // Tratar de aislar el cuerpo del artículo antes del sidebar/widgets
    // InfoSaladillo usa una estructura simple, el contenido está antes de
    // elementos como "Entradas recientes", "Temas", "Newsletter"
    let searchArea = cleanHtml;

    // Cortar en la zona del sidebar (buscamos patrones comunes)
    const cutPatterns = [
        /class="[^"]*widget[^"]*"/i,
        /Entradas recientes/i,
        /id="[^"]*sidebar[^"]*"/i,
        /class="[^"]*sidebar[^"]*"/i,
        /Escucha la 90\.7/i,
        /class="[^"]*related[^"]*"/i,
    ];

    for (const pat of cutPatterns) {
        const idx = searchArea.search(pat);
        if (idx > 500) { // asegurarse de no cortar demasiado temprano
            searchArea = searchArea.substring(0, idx);
            break;
        }
    }

    // Extraer párrafos <p> del área de contenido (excluyendo los que solo tienen emojis)
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    const paragraphs: string[] = [];
    let pm: RegExpExecArray | null;
    while ((pm = pRegex.exec(searchArea)) !== null) {
        const pContent = pm[1];
        // Ignorar párrafos que solo contienen imágenes de emoji de WordPress
        if (/^(<img[^>]*s\.w\.org[^>]*>|\s)*$/.test(pContent)) continue;
        const pText = htmlToCleanText(pContent);
        if (pText.trim().length > 10) {
            paragraphs.push(pText.trim());
        }
    }

    const rawText = paragraphs.join('\n\n');
    const filteredText = filterJunkParagraphs(rawText);

    // Imágenes dentro del área de contenido (no sidebar)
    const contentImages = extractImagesFromHtml(searchArea, link);
    const allImages = Array.from(new Set([image_url, ...contentImages].filter(Boolean)));

    return {
        title,
        text: filteredText.substring(0, 3000),
        image_url: image_url || allImages[0] || '',
        images_url: allImages.slice(0, 10),
        raw_html: searchArea.substring(0, 5000) // HTML crudo limitado
    };
}

// ─────────────────────────────────────────────────
// SCRAPING DE PÁGINA INDIVIDUAL
// ─────────────────────────────────────────────────

/**
 * Descarga una página individual y extrae contenido según el perfil del sitio.
 */
async function scrapePage(url: string, profile: string, fallbackTitle: string): Promise<Partial<ScrapeResult>> {
    try {
        const response = await fetchWithTimeout(url);
        if (!response.ok) {
            console.error(`[Scraper] HTTP ${response.status} en ${url}`);
            return {};
        }
        const html = await response.text();

        if (profile === 'ahorasaladillo') return extractAhoraSaladillo(html, url);
        if (profile === 'abcsaladillo') return extractAbcSaladillo(html, url);
        if (profile === 'infosaladillo') return extractInfoSaladillo(html, url);

    } catch (err: any) {
        console.error(`[Scraper] Error scrapeando ${url} (${profile}):`, err.message);
    }
    return {};
}

// ─────────────────────────────────────────────────
// EXTRACCIÓN BÁSICA DESDE RSS (sin fetch de página)
// ─────────────────────────────────────────────────

/**
 * Extrae campos básicos desde el XML/HTML del ítem RSS.
 * Usado como fallback o complemento al scraping de página.
 */
function extractFromRssItem(itemXml: string, link: string): { textFallback: string; imagesFromFeed: string[] } {
    const description = extractTag(itemXml, 'description');
    const contentEncoded = extractTag(itemXml, 'content:encoded') || description;

    // Limpiar HTML del RSS
    const cleanContent = removeJunkTags(contentEncoded);
    let textFallback = htmlToCleanText(cleanContent);
    textFallback = filterJunkParagraphs(textFallback).substring(0, 2000);

    const imagesFromFeed = extractImagesFromHtml(cleanContent, link);

    return { textFallback, imagesFromFeed };
}

// ─────────────────────────────────────────────────
// HANDLER PRINCIPAL  (RSS-first, sin scraping de página)
// ─────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // ── Validación de secreto ──────────────────────
    const secret = req.query?.secret || req.headers?.['x-cron-secret'];
    if (secret !== 'sv-cron-2024') {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('[Scraper v3] Iniciando escaneo RSS-first...');
    const results: any[] = [];
    const errors: string[] = [];

    for (const feed of FEEDS) {
        console.log(`[Scraper] Procesando feed: ${feed.name}`);
        try {
            const response = await fetchWithTimeout(feed.url);
            if (!response.ok) {
                const msg = `[Scraper] ❌ Feed ${feed.name} respondió ${response.status}`;
                console.error(msg);
                errors.push(msg);
                continue;
            }

            const xml = await response.text();
            // Separar ítems del XML usando regex que captura bloques completos <item>...</item>
            const itemRegex = /<item[\s>][\s\S]*?<\/item>/gi;
            const rawItems = xml.match(itemRegex) || [];
            const items = rawItems;
            console.log(`[Scraper] ${feed.name}: ${items.length} ítems encontrados`);

            for (const itemXml of items) {
                const title = htmlToCleanText(extractTag(itemXml, 'title'));
                const link = extractItemLink(itemXml);

                if (!title || !link) {
                    console.warn(`[Scraper] ${feed.name}: ítem sin título o link, omitiendo`);
                    continue;
                }

                // Verificar si ya existe en Supabase antes de scrapear
                const { data: existing } = await supabase
                    .from('articles_crudos')
                    .select('id')
                    .eq('source_url', link)
                    .single();

                if (existing) {
                    console.log(`[Scraper] Ya existe: ${title.substring(0, 60)}`);
                    continue;
                }

                // ── Extraer TODO desde el RSS (content:encoded) ──
                const { textFallback, imagesFromFeed } = extractFromRssItem(itemXml, link);

                // Omitir artículos sin texto útil (ej: «Farmacias de turno» sin contenido)
                if (!textFallback || textFallback.trim().length < 30) {
                    console.warn(`[Scraper] ${feed.name}: sin texto útil, omitiendo «${title.substring(0, 50)}»`);
                    continue;
                }

                const record = {
                    title: title.substring(0, 255),
                    text: textFallback,
                    source_url: link,
                    source_name: feed.name,
                    image_url: imagesFromFeed[0] || '',
                    images_url: imagesFromFeed.slice(0, 10),
                    status: 'nuevo',
                    scrape_errors: null
                };

                results.push(record);
                console.log(`[Scraper] ✅ ${feed.name}: "${title.substring(0, 60)}" (imgs: ${imagesFromFeed.length})`);
            }

        } catch (error: any) {
            const msg = `[Scraper] ❌ Error crítico en feed ${feed.name}: ${error.message}`;
            console.error(msg);
            errors.push(msg);
        }
    }

    // Guardar en Supabase (upsert por source_url para evitar duplicados)
    if (results.length > 0) {
        const { error: upsertError } = await supabase
            .from('articles_crudos')
            .upsert(results, { onConflict: 'source_url' });

        if (upsertError) {
            console.error('[Scraper] ❌ Error en upsert Supabase:', upsertError.message);
            errors.push(`Supabase upsert error: ${upsertError.message}`);
        } else {
            console.log(`[Scraper] ✅ ${results.length} artículos guardados en articles_crudos`);
        }
    } else {
        console.log('[Scraper] No hay artículos nuevos para guardar.');
    }

    return res.status(200).json({
        success: true,
        count: results.length,
        errors: errors.length > 0 ? errors : undefined
    });
}
