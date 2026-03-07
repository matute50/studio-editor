
/**
 * Custom Audio Decoding for Gemini TTS Raw PCM
 * Adheres to GenAI coding guidelines: Do not use native decodeAudioData for raw streams.
 */
async function decodePcmData(
  data: Uint8Array,
  ctx: BaseAudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  // PCM from Gemini is 16-bit little-endian
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Normalize Int16 (-32768 to 32767) to Float32 (-1.0 to 1.0)
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const audioBufferCache = new Map<string, AudioBuffer>();

async function loadAudio(ctx: BaseAudioContext, url: string): Promise<AudioBuffer> {
  // 1. Check Cache
  if (audioBufferCache.has(url)) {
    return audioBufferCache.get(url)!;
  }

  try {
    const isLocal = url.startsWith('blob:') || url.startsWith('data:');
    // REMOVED cache busting timestamp to allow browser caching and internal caching
    const finalUrl = url;

    const fetchOptions: RequestInit = isLocal ? {} : {
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Accept': 'audio/*'
      }
    };

    const response = await fetch(finalUrl, fetchOptions);

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} en ${url}`);
    }
    const arrayBuffer = await response.arrayBuffer();

    // Curtains (remote MP3/WAV) are decoded normally
    const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);

    // 2. Save to Cache (only remote URLs, not blobs which might be revoked)
    if (!isLocal) {
      audioBufferCache.set(url, decodedBuffer);
    }

    return decodedBuffer;
  } catch (error) {
    console.warn(`Error cargando audio: ${url}`, error);
    throw error;
  }
}

function bufferToMp3(buffer: AudioBuffer): Blob {
  const lamejs = (window as any).lamejs;
  if (!lamejs) throw new Error("lamejs no está cargado.");
  const channels = 1;
  const sampleRate = buffer.sampleRate;
  const kbps = 128;
  const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
  const rawData = buffer.getChannelData(0);
  const samples = new Int16Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    const s = Math.max(-1, Math.min(1, rawData[i]));
    samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  const mp3Data = [];
  const sampleBlockSize = 1152;
  for (let i = 0; i < samples.length; i += sampleBlockSize) {
    const sampleChunk = samples.subarray(i, i + sampleBlockSize);
    const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
    if (mp3buf.length > 0) mp3Data.push(mp3buf);
  }
  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) mp3Data.push(mp3buf);
  return new Blob(mp3Data, { type: 'audio/mpeg' });
}

const DEFAULT_INTRO_URL = 'https://pub-5b294f92f42e4cbda687d0122e15bc72.r2.dev/audios/news-intro.mp3';

/**
 * Mix speech (Raw PCM or URL) with musical curtain.
 */
export const mixSpeechWithCustomIntro = async (
  speechInput: string | Uint8Array,
  musicUrl: string | null | undefined,
  musicVolume: number = 0.6
): Promise<{ blob: Blob, duration: number }> => {
  const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

  try {
    let speechBuffer: AudioBuffer;

    // Handle Blob/MP3 Uint8Array bytes from Google TTS or raw PCM
    if (speechInput instanceof Uint8Array) {
      try {
        // Google TTS returns MP3 encoded as a Uint8Array, we can decode it natively
        speechBuffer = await tempCtx.decodeAudioData(speechInput.buffer.slice(0));
      } catch (e) {
        console.warn("Native decodeAudioData failed, falling back to custom raw PCM decode", e);
        speechBuffer = await decodePcmData(speechInput, tempCtx, 24000, 1);
      }
    } else {
      speechBuffer = await loadAudio(tempCtx, speechInput);
    }

    let musicBuffer: AudioBuffer | null = null;

    if (musicUrl && musicUrl.trim() !== '') {
      try {
        musicBuffer = await loadAudio(tempCtx, musicUrl);
      } catch (e) {
        console.warn("Fallo en cortina elegida. Usando DEFAULT_INTRO_URL como backup.");
        musicBuffer = await loadAudio(tempCtx, DEFAULT_INTRO_URL);
      }
    }

    const introTime = 2.0;
    const outroForegroundTime = 2.0;
    const fadeOutTime = 1.0;
    const totalDuration = introTime + speechBuffer.duration + outroForegroundTime + fadeOutTime;

    // Create high-quality offline context for mixing
    const offlineCtx = new OfflineAudioContext(1, 44100 * totalDuration, 44100);

    const speechSource = offlineCtx.createBufferSource();
    speechSource.buffer = speechBuffer;
    const speechGain = offlineCtx.createGain();
    speechGain.gain.value = 1.3;
    speechSource.connect(speechGain);
    speechGain.connect(offlineCtx.destination);
    speechSource.start(introTime);

    if (musicBuffer) {
      const musicSource = offlineCtx.createBufferSource();
      musicSource.buffer = musicBuffer;
      musicSource.loop = true;
      const musicGain = offlineCtx.createGain();

      const volHigh = musicVolume;
      const volLow = musicVolume * 0.22;

      const tSpeechStart = introTime;
      const tSpeechEnd = introTime + speechBuffer.duration;
      const tFadeStart = tSpeechEnd + outroForegroundTime;
      const tEnd = totalDuration;

      musicGain.gain.setValueAtTime(volHigh, 0);
      musicGain.gain.linearRampToValueAtTime(volLow, tSpeechStart);
      musicGain.gain.setValueAtTime(volLow, tSpeechEnd);
      musicGain.gain.linearRampToValueAtTime(volHigh, tSpeechEnd + 0.3);
      musicGain.gain.setValueAtTime(volHigh, tFadeStart);
      musicGain.gain.linearRampToValueAtTime(0, tEnd);

      musicSource.connect(musicGain);
      musicGain.connect(offlineCtx.destination);
      musicSource.start(0);
    }

    const renderedBuffer = await offlineCtx.startRendering();
    const mp3Blob = bufferToMp3(renderedBuffer);

    return {
      blob: mp3Blob,
      duration: totalDuration
    };
  } catch (error) {
    console.error("Error crítico en AudioMixer:", error);
    throw error;
  } finally {
    tempCtx.close();
  }
};
