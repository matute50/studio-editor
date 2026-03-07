import { supabase } from './supabase';
import { generateAudio, VoiceParams } from './googleTTS';

export interface AraVideoResult {
    id: string;
    tipo: 'saludo' | 'noticia' | 'cta' | 'slogan';
    url: string | null;
    nombreArchivo: string;
    brollUrl?: string | null;
    status: 'success' | 'failed' | 'processing';
}

/**
 * Módulo de Conexión a la API de Inferencia (Veo 3 / Grok / Seedance)
 * Este servicio implementa el "Paso 5" recomendado en los informes 2026.
 */

// NOTA: Esta URL base asume el uso de la API REST de Inference.sh para entornos de producción.
const INFERENCE_API_URL = "https://api.inference.sh/v1/apps/run";

async function triggerInferenceJob(appId: string, inputData: any, apiKey: string) {
    if (!apiKey) throw new Error("INFERENCE_SH_API_KEY no configurada.");

    const response = await fetch(INFERENCE_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            app: appId,
            input: inputData
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`Error Inference.sh [${appId}]: ${err.error?.message || response.statusText}`);
    }

    return await response.json(); // Dependiendo de inference.sh, puede devolver el asset o un job_id
}


/**
 * Ejecuta la generación en lote de videos principales (ARA) y material de apoyo (B-Roll).
 */
export async function ejecutarGeneracionVideoAra(promptsEnsamblados: any[]): Promise<AraVideoResult[]> {
    const resultadosFinales: AraVideoResult[] = [];

    // Obtenemos llaves desde nuestro entorno (Next/Vite)
    const infshApiKey = import.meta.env.VITE_INFERENCE_SH_API_KEY || ''; // Requerido para llamadas fetch directas
    const REFERENCE_IMAGE_URL = import.meta.env.VITE_ARA_REFERENCE_URL || "https://tu-bucket/reference_image.png";

    // Mantenemos la continuidad visual guardando el último fram del video anterior.
    // Inicialmente es la imagen de referencia.
    let lastFrameUrl = REFERENCE_IMAGE_URL;

    for (const [idx, item] of promptsEnsamblados.entries()) {
        console.log(`[ARA GENERATOR] Generando video para ID: ${item.id} (${item.tipo})`);
        let currentResult: AraVideoResult = {
            id: item.id,
            tipo: item.tipo,
            url: null,
            nombreArchivo: `Ara_${item.tipo}_${new Date().toISOString().split('T')[0]}.mp4`,
            status: 'processing'
        };

        try {
            // -- FASE A: AUDIO (Acento Rioplatense) --
            console.log(`[ARA GENERATOR] 1. Sintetizando Voz Argentina...`);
            const audioResponse = await generateAudio(item.texto, {
                voiceId: 'es-AR-Neural2-A', pitch: 0.0, speakingRate: 1.05
            });

            // Nota: En un flujo ideal de servidor, subirías `audioResponse.blob` a tu Storage temporal 
            // y pasarías su URL pública a Veo 3. Aquí simulamos que ya tenemos esa URL usando un placeholder:
            const audioPublicUrl = "https://tu-bucket/ara-audio-test.mp3";

            // -- FASE B: GENERACIÓN VÍDEO PRINCIPAL (Veo 3 Nativo Lip-Sync) --
            console.log(`[ARA GENERATOR] 2. Llamando a Google Veo 3... Input Frame: [${idx === 0 ? 'REFERENCE_IMAGE' : 'LAST_FRAME'}]`);

            // Descomentar para producción real cuando la API Key esté disponible:
            /*
            const veoResponse = await triggerInferenceJob("google/veo-3", {
                prompt: item.prompt,
                image_url: lastFrameUrl, // Pilar 2: Continuidad
                audio_url: audioPublicUrl // Pilar 3: Lip-Sync nativo
            }, infshApiKey);
            
            currentResult.url = veoResponse.url || veoResponse.video_url;
            lastFrameUrl = currentResult.url; // El video actual será el ancla del próximo
            */

            // Simulamos la respuesta exitosa por ahora:
            currentResult.url = `https://mock-veo3-result.com/video_${item.id}.mp4`;
            currentResult.status = 'success';


            // -- FASE C: B-ROLL AUTOMÁTICO (Solo Noticias) --
            if (item.tipo === 'noticia') {
                console.log(`[ARA GENERATOR] 3. Despachando B-Roll rápido asíncrono en Grok...`);
                // Extraemos el núcleo de la noticia
                const brollSubject = item.title ? item.title.replace(/[^a-zA-Z0-9 áéíóúÁÉÍÓÚñÑ]/g, '').slice(0, 100) : "documentary footage";
                const grokPrompt = `Cinematic b-roll footage of ${brollSubject}. Documentary style, realistic, 4K resolution, steady shot, natural lighting, with natural ambient sound and foley.`;

                /*
                 // Descomentar para producción real:
                 const grokResponse = await triggerInferenceJob("xai/grok-imagine-video", {
                     prompt: grokPrompt,
                     duration: 5
                 }, infshApiKey);
                 currentResult.brollUrl = grokResponse.url || grokResponse.video_url;
                 */

                currentResult.brollUrl = `https://mock-grok-result.com/broll_${item.id}.mp4`;
            }

        } catch (error: any) {
            console.error(`[ARA GENERATOR] Falló la generación para ${item.id}:`, error);
            currentResult.status = 'failed';
        }

        resultadosFinales.push(currentResult);
    }

    console.log("[ARA GENERATOR] Proceso masivo finalizado.");
    return resultadosFinales;
}
