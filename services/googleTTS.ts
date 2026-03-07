
/**
 * Google Cloud Text-to-Speech Service
 * Optimized for Argentinian News segments.
 */

const API_KEY = (import.meta.env.VITE_GOOGLE_TTS_API_KEY || import.meta.env.GOOGLE_TTS_API_KEY || '').trim();

export interface VoiceParams {
    voiceId: string;
    pitch: number;
    speakingRate: number;
    volumeGainDb?: number; // Added for fine tuning
}

/**
 * Sanitiza el texto para forzar voseo y términos argentinos básicos
 * Esto ayuda a los modelos multilingües (Chirp3) a "anclarse" en el acento.
 */
function sanitizeVoseo(text: string): string {
    return text
        // Pronombres y posesivos (básicos)
        .replace(/\btienes\b/gi, 'tenés')
        .replace(/\bquieres\b/gi, 'querés')
        .replace(/\bpuedes\b/gi, 'podés')
        .replace(/\bsabes\b/gi, 'sabés')
        .replace(/\bhablas\b/gi, 'hablás')
        .replace(/\bmiras\b/gi, 'mirás')
        .replace(/\bpiensas\b/gi, 'pensás')
        .replace(/\bentiendes\b/gi, 'entendés')
        .replace(/\bcomes\b/gi, 'comés')
        .replace(/\bconoces\b/gi, 'conocés')
        .replace(/\bdices\b/gi, 'decís')
        .replace(/\bpones\b/gi, 'ponés')
        .replace(/\bhaces\b/gi, 'hacés')
        .replace(/\bvienes\b/gi, 'venís')
        .replace(/\btú\b/gi, 'vos')
        .replace(/\bven\b/gi, 'vení')
        .replace(/\bmira\b/gi, 'mirá')
        .replace(/\bhaz\b/gi, 'hacé')
        .replace(/\bponle\b/gi, 'ponéle')
        .replace(/\bdile\b/gi, 'decile')
        .replace(/\bllámala\b/gi, 'llamala')
        .replace(/\bcoche\b/gi, 'auto')
        .replace(/\bordernador\b/gi, 'computadora')
        .replace(/\bcomputador\b/gi, 'computadora')
        .replace(/\bbaloncesto\b/gi, 'básquet')
        .replace(/\bzumo\b/gi, 'jugo')
        .replace(/\baparcar\b/gi, 'estacionar')
        .replace(/\bSaladillo\b/g, 'Saladillo'); // Asegurar preservación de marca capitalizada
}

/**
 * Wraps text in SSML tags targeting es-AR phonetics for multlingual models.
 * Fixed prosody to ensure determinism.
 */
function prepareSSML(text: string): string {
    const trimmed = text.trim();
    if (trimmed.startsWith('<speak')) {
        return trimmed;
    }
    // Very basic escaping for XML
    const escapedText = trimmed.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<speak xml:lang='es-AR'><prosody rate='1.05' pitch='0.0st'>${escapedText}</prosody></speak>`;
}

// Para NodeJS o Browser: MD5 Nativo rudimentario o CryptoJS (Asumimos uso de CryptoJS instanciado)
import CryptoJS from 'crypto-js';

async function checkAudioExists(url: string): Promise<boolean> {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Generates speech using Google Cloud TTS API.
 * Determinist: Cachea mediante HASH (texto+voz) en R2.
 */
export const generateAudio = async (
    text: string,
    params: VoiceParams = { voiceId: 'es-US-Chirp3-HD-Aoede', pitch: 0.0, speakingRate: 1.05, volumeGainDb: 0.0 }
): Promise<{ localUrl: string, blob: Blob, pcmData: Uint8Array }> => {

    if (!API_KEY) throw new Error("Missing VITE_GOOGLE_TTS_API_KEY in environment variables.");
    if (!text || text.trim() === '') throw new Error("Input text cannot be empty.");

    // 1. SANITIZAR VOSEO (PRIMING DE IDENTIDAD)
    const sanitizedText = sanitizeVoseo(text);

    // 2. ENCAPSULAR EN SSML ESTRICTO MODO ARGENTINA
    const ssmlText = prepareSSML(sanitizedText);

    // 3. GENERAR HASH ÚNICO DE LA PETICIÓN (DEDUPLICACIÓN SHA-256)
    const hashString = `${params.voiceId}_${ssmlText}`;
    const hashHex = CryptoJS.SHA256(hashString).toString();
    const cacheFileName = `tts_cache_${hashHex}.mp3`;
    const R2_PUBLIC_URL_BASE = 'https://pub-5b294f92f42e4cbda687d0122e15bc72.r2.dev/audios/';
    const cacheUrl = `${R2_PUBLIC_URL_BASE}${cacheFileName}`;

    console.log(`[Google TTS] Hash Cache generado: ${cacheFileName}`);

    // 4. CONSULTAR CACHÉ (HTTP HEAD DIRECTO AL BUCKET)
    const exists = await checkAudioExists(cacheUrl);

    if (exists) {
        console.log(`[Google TTS] ¡HIT en Caché! El audio ${cacheFileName} ya había sido generado.`);
        // Descargar el audio existente para mantener compatibilidad en UI
        const cacheResponse = await fetch(cacheUrl);
        const arrayBuffer = await cacheResponse.arrayBuffer();
        const pcmData = new Uint8Array(arrayBuffer);
        const blob = new Blob([pcmData], { type: 'audio/mpeg' });
        return {
            localUrl: URL.createObjectURL(blob),
            blob,
            pcmData,
            hashFileName: cacheFileName
        } as any;
    }

    console.log(`[Google TTS] MISS en Caché. Llamando a la API de Google Cloud para el nuevo texto...`);

    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`;

    // Estructura de Request estricta solicitada para Chirp3-HD (Multilingual phonetics triggered by SSML xml:lang)
    const requestBody = {
        input: { ssml: ssmlText },
        voice: {
            languageCode: 'es-US',
            name: params.voiceId
        },
        audioConfig: {
            audioEncoding: 'MP3'
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Google TTS Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const audioContent = data.audioContent;

    if (!audioContent) {
        throw new Error("Google TTS returned no audio content.");
    }

    // Convert base64 to Blob
    const binary = atob(audioContent);
    const pcmData = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        pcmData[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([pcmData], { type: 'audio/mpeg' });

    // La subida real a R2 ocurrirá en la vista principal luego de recibir este blob, 
    // pero marcamos que está optimizado devolviendolo de forma determinista.
    // TIP: El componente AudioProducer.tsx debería guardar el archivo usando `cacheFileName`.

    // Return extended standard object + hash info 
    // Modificaremos la UI (AudioProducer) para que use 'hashFileName' como nombre al guardar en R2
    return {
        localUrl: URL.createObjectURL(blob),
        blob,
        pcmData,
        // (Ignored by TS interface locally if not added, but available inside object for AudioProducer)
        hashFileName: cacheFileName
    } as any;
};

