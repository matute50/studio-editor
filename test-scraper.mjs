import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://otwvfihzaznyjvjtkvvd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90d3ZmaWh6YXpueWp2anRrdnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxMDQ3OTAsImV4cCI6MjA2MDY4MDc5MH0.YbKdivZM6gJCdXAf51Xctn8IpKhQCrMch89NoHwP0Z4';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const FEEDS = [
    { name: 'Ahora Saladillo', url: 'https://ahorasaladillo-diariodigital.com.ar/feed/' },
    { name: 'ABC Saladillo', url: 'https://www.abcsaladillo.com.ar/feed/' },
    { name: 'Info Saladillo', url: 'https://infosaladillo.com.ar/feed/' }
];

function extractTag(xml, tag) {
    const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    if (!match) return '';
    let content = match[1];
    content = content.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
    return content.trim();
}

function extractImage(text) {
    const imgRegex = /<img[^>]+src=["']([^"'>]+)["'][^>]*>/gi;
    let match;
    while ((match = imgRegex.exec(text)) !== null) {
        const src = match[1];
        if (src.includes('s.w.org/images/core/emoji') || src.includes('wp-smiley')) continue;
        return src;
    }
    return null;
}

async function fetchOgImage(url) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos para el test manual
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) return null;
        const html = await response.text();
        const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"'>]+)["']/i) ||
                        html.match(/<meta[^>]+content=["']([^"'>]+)["'][^>]+property=["']og:image["']/i);
        return ogMatch ? ogMatch[1] : null;
    } catch (e) { return null; }
}

async function runTest() {
    console.log("🚀 Iniciando Escaneo con Ciclo de Re-intento...");
    const results = [];

    // 1. Escaneo Normal (Feeds)
    for (const feed of FEEDS) {
        try {
            console.log(`📡 Consultando: ${feed.name}...`);
            const response = await fetch(feed.url);
            const xml = await response.text();
            const items = xml.split('<item>').slice(1);

            for (const itemXml of items) {
                const title = extractTag(itemXml, 'title');
                const link = extractTag(itemXml, 'link');
                const description = extractTag(itemXml, 'description');
                const contentEncoded = extractTag(itemXml, 'content:encoded') || description;

                if (title && link) {
                    let imageUrl = extractImage(itemXml) || extractImage(contentEncoded);
                    if (!imageUrl) {
                        imageUrl = await fetchOgImage(link);
                    }
                    results.push({
                        title: title.slice(0, 255),
                        text: description.replace(/<[^>]*>?/gm, '').substring(0, 2000),
                        source_url: link,
                        image_url: imageUrl || '',
                        images_url: imageUrl ? [imageUrl] : [],
                        status: 'nuevo'
                    });
                }
            }
        } catch (error) {
            console.error(`❌ Error en ${feed.name}:`, error.message);
        }
    }

    if (results.length > 0) {
        console.log(`💾 Guardando noticias detectadas...`);
        await supabase.from('articles_crudos').upsert(results, { onConflict: 'source_url', ignoreDuplicates: true });
    }

    // 2. PASE DE RE-ESCANEO (Lo que pidió el usuario)
    console.log("🔍 Buscando noticias 'nuevas' que aún no tengan imagen para re-intentar...");
    const { data: missing } = await supabase
        .from('articles_crudos')
        .select('id, source_url, title')
        .eq('status', 'nuevo')
        .or('image_url.eq."",image_url.is.null');

    if (missing && missing.length > 0) {
        console.log(`🔄 Encontradas ${missing.length} noticias sin imagen. Ejecutando re-escaneo profundo...`);
        let recovered = 0;
        for (const item of missing) {
            console.log(`   👉 Re-intentando en: ${item.title.slice(0, 40)}...`);
            const img = await fetchOgImage(item.source_url);
            if (img) {
                await supabase.from('articles_crudos')
                    .update({ image_url: img, images_url: [img] })
                    .eq('id', item.id);
                recovered++;
                console.log(`      ✅ ¡Imagen recuperada!`);
            } else {
                console.log(`      ❌ Sigue sin imagen.`);
            }
        }
        console.log(`\n✨ Ciclo de recuperación finalizado. Imágenes rescatadas: ${recovered}`);
    } else {
        console.log("✅ No hay noticias nuevas sin imagen. ¡Todo al día!");
    }
}

runTest();
