import WaveSurfer from 'wavesurfer.js';

export interface AudioAnalysis {
    duration: number;
    peak: number;
    rms: number;
    suggestedGain: number;
}

/**
 * Analiza el volumen de una URL de audio y sugiere ganancia para normalizar.
 * Utiliza Web Audio API para decodificar y analizar el buffer completo.
 */
export const analyzeAudioLoudness = async (audioUrl: string): Promise<AudioAnalysis> => {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Análisis de canal 
        const rawData = audioBuffer.getChannelData(0);
        let sum = 0;
        let peak = 0;

        for (let i = 0; i < rawData.length; i++) {
            const abs = Math.abs(rawData[i]);
            if (abs > peak) peak = abs;
            sum += rawData[i] * rawData[i];
        }

        const rms = Math.sqrt(sum / rawData.length);
        const dbRMS = 20 * Math.log10(rms);

        // Objetivo simple: Llevar RMS a -14dB (aprox standard youtube/spotify)
        // Si el RMS actual es -20dB, gain necesitada: +6dB
        // Gain factor = 10 ^ (diff_db / 20)
        const targetDb = -14;
        const diff = targetDb - dbRMS;
        const suggestedGain = Math.pow(10, diff / 20);

        return {
            duration: audioBuffer.duration,
            peak,
            rms: dbRMS,
            suggestedGain
        };

    } catch (err) {
        console.error("Audio Analysis Error", err);
        throw err;
    }
};

/**
 * Normaliza un archivo de audio (Blob) aplicando ganancia.
 * Retorna un nuevo Blob WAV normalizado.
 * NOTA: Esto es pesado para el cliente si el archivo es muy grande.
 */
export const normalizeAudioBlob = async (originalBlob: Blob, gain: number): Promise<Blob> => {
    // Para simplificar y rendimiento, en el navegador a veces es mejor
    // solo devolver el valor de ganancia y aplicarlo en el <audio> tag o GainNode.
    // Pero si necesitamos "quemar" el volumen, debemos re-renderear.

    const audioContext = new AudioContext();
    const arrayBuffer = await originalBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const offlineCtx = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;

    const gainNode = offlineCtx.createGain();
    gainNode.gain.value = gain;

    source.connect(gainNode);
    gainNode.connect(offlineCtx.destination);
    source.start();

    const renderedBuffer = await offlineCtx.startRendering();

    return bufferToWave(renderedBuffer, renderedBuffer.length);
};

// Helper: Convert AudioBuffer to WAV Blob
function bufferToWave(abuffer: AudioBuffer, len: number) {
    let numOfChan = abuffer.numberOfChannels,
        length = len * numOfChan * 2 + 44,
        buffer = new ArrayBuffer(length),
        view = new DataView(buffer),
        channels = [], i, sample,
        offset = 0,
        pos = 0;

    // write WAVE header
    setUint32(0x46464952);                         // "RIFF"
    setUint32(length - 8);                         // file length - 8
    setUint32(0x45564157);                         // "WAVE"

    setUint32(0x20746d66);                         // "fmt " chunk
    setUint32(16);                                 // length = 16
    setUint16(1);                                  // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2);                      // block-align
    setUint16(16);                                 // 16-bit (hardcoded in this ex)

    setUint32(0x61746164);                         // "data" - chunk
    setUint32(length - pos - 4);                   // chunk length

    // write interleaved data
    for (i = 0; i < abuffer.numberOfChannels; i++)
        channels.push(abuffer.getChannelData(i));

    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {             // interleave channels
            sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
            view.setInt16(pos, sample, true);          // write 16-bit sample
            pos += 2;
        }
        offset++;                                     // next source sample
    }

    return new Blob([buffer], { type: "audio/wav" });

    function setUint16(data: any) {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    function setUint32(data: any) {
        view.setUint32(pos, data, true);
        pos += 4;
    }
}

/**
 * Convierte datos PCM raw (Uint8Array) a un Blob con cabecera WAV.
 * Gemini devuelve audio en 24kHz, 16-bit, Mono por defecto.
 */
export const pcmToWav = (pcmData: Uint8Array, sampleRate: number = 24000, numChannels: number = 1): Blob => {
    const bytesPerSample = 2; // 16-bit
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcmData.length;
    const headerSize = 44;
    const totalSize = headerSize + dataSize;

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    // RIFF Chunk
    writeString(view, 0, 'RIFF');
    view.setUint32(4, totalSize - 8, true);
    writeString(view, 8, 'WAVE');

    // fmt Chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true);  // AudioFormat (1 = PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true); // BitsPerSample

    // data Chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Write PCM data
    const pcmView = new Uint8Array(buffer, headerSize);
    pcmView.set(pcmData);

    return new Blob([buffer], { type: 'audio/wav' });
};

function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}
