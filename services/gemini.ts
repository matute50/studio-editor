
// @google/genai coding guidelines followed: Using stable 'gemini-3-flash-preview' for text and 'gemini-2.5-flash-preview-tts' for audio.
import { GoogleGenAI, Modality } from "@google/genai";
import { pcmToWav } from './audioProcessor';

const MODEL_ID = 'gemini-3-flash-preview';
const FAST_MODEL_ID = 'gemini-1.5-flash-002'; // Trying specific version, with fallback below
const TTS_MODEL_ID = 'gemini-2.5-flash-preview-tts';

const SYSTEM_NEWS_PROMPT = `
### ROL
Eres un Redactor de Agencia de Noticias (Estilo Cable de Noticias / Diario La Nación).
NO eres un locutor de radio. NO eres un animador. NO eres un amigo de la audiencia.

### OBJETIVO
Tu única función es reescribir la información que recibes para convertirla en un texto periodístico formal, aséptico y objetivo.

### REGLAS DE ORO (PROHIBICIONES ESTRICTAS)
1. CERO ESTILO RADIAL: Prohibido usar frases como "¡Arriba Saladillo!", "Música maestro", "Qué noticia les traigo", "Arrancamos el día".
2. CERO SALUDOS: No saludes a la audiencia. No te despidas. Empieza la frase directamente con el sujeto de la noticia.
3. CERO PRIMERA PERSONA: Prohibido usar "Nosotros", "Les contamos", "Nuestro pibe". Escribe siempre en tercera persona ("Se informó", "La ciudad").
4. CERO COLOQUIALISMO: Prohibido usar palabras como: "pibe", "chocho", "linda noticia", "laburo". Usa léxico formal argentino (auto, vereda, informó).
5. CERO EXCLAMACIONES: Elimina todos los signos "¡!". El texto debe ser plano y serio.

### INSTRUCCIONES DE FORMATO OBLIGATORIAS
Debes generar SIEMPRE este formato exacto:

[TITULO_SLIDE]
Un título gancho de máximo 8 palabras. Usa "|" para el salto de línea cuidando no dejar preposiciones solas al final de la línea 1.

[TEXTO_LECTURA]
El cuerpo de la noticia. Extensión estricta entre 200 y 230 palabras (para 1m 40s de lectura). Usa puntuación perfecta para Google TTS.
`;

// Helper to get all available API keys
const getApiKeys = (): string[] => {
  const keys: string[] = [];
  if (process.env.API_KEY) keys.push(process.env.API_KEY);
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
  if (process.env.GEMINI_API_KEY_2) keys.push(process.env.GEMINI_API_KEY_2);
  if (process.env.GEMINI_API_KEY_3) keys.push(process.env.GEMINI_API_KEY_3);
  if (process.env.GOOGLE_TTS_API_KEY && !keys.includes(process.env.GOOGLE_TTS_API_KEY)) {
    keys.push(process.env.GOOGLE_TTS_API_KEY);
  }
  // Filter out duplicates and empty strings
  return [...new Set(keys)].filter(k => k && k.length > 5);
};

export const getGeminiResponse = async (prompt: string, temp: number = 0.5, systemInstruction: string = SYSTEM_NEWS_PROMPT, modelId: string = MODEL_ID): Promise<string> => {
  if (!prompt) return "";

  const keysToTry = getApiKeys();

  if (keysToTry.length === 0) return "Error: No hay API Key configurada (API_KEY, API_KEY_2, etc).";

  let lastError: any = null;

  for (const apiKey of keysToTry) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
          temperature: temp,
          systemInstruction: systemInstruction
        }
      });
      return response.text || "";
    } catch (error: any) {
      console.warn(`Fallo getGeminiResponse (${modelId}) con clave ...${apiKey.slice(-4)}: ${error.message} `);

      // Handle Quota Exceeded specifically
      if (error.message.includes("429") || error.message.includes("RESOURCE_EXHAUSTED")) {
        console.warn("⚠️ Cuota excedida para", modelId);
      }

      // FALLBACK LOGIC
      // 1. If 404 (Not Found), try proper fallback
      // 2. If 429 (Quota), try a different model family if possible (though often shared)

      const isQuotaError = error.message.includes("429") || error.message.includes("RESOURCE_EXHAUSTED");
      const isNotFoundError = error.message.includes("404") || error.message.includes("not found");

      if (isNotFoundError || isQuotaError) {
        // Define fallback chain: Input Model -> gemini-1.5-flash -> gemini-2.0-flash-exp
        let fallbackModel = MODEL_ID; // Default fallback
        if (modelId === MODEL_ID) fallbackModel = 'gemini-1.5-flash'; // If main failed, try old reliable
        if (modelId === 'gemini-1.5-flash') fallbackModel = 'gemini-2.0-flash-exp'; // Try experimental

        console.log(`⚠️ Fallback: ${modelId} falló (${isQuotaError ? 'Cuota' : '404'}), intentando con ${fallbackModel}...`);

        try {
          const aiRetry = new GoogleGenAI({ apiKey });
          const responseRetry = await aiRetry.models.generateContent({
            model: fallbackModel,
            contents: prompt,
            config: { temperature: temp, systemInstruction }
          });
          return responseRetry.text || "";
        } catch (retryError: any) {
          console.error(`Fallback ${fallbackModel} también falló:`, retryError.message);
          // If this was a quota error, we likely can't do much more than fail gracefully
          lastError = retryError;
        }
      } else {
        lastError = error;
      }
    }
  }

  console.error("Todas las claves fallaron en getGeminiResponse:", lastError);

  // Extract retry time if available
  const retryMatch = lastError?.message?.match(/retry in (\d+(\.\d+)?)s/);
  const retryTime = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 60;

  if (lastError?.message?.includes("429") || lastError?.message?.includes("RESOURCE_EXHAUSTED")) {
    throw new Error(`Cuota de IA excedida. Por favor espera ${retryTime} segundos antes de intentar de nuevo.`);
  }

  throw new Error(`Error en IA: ${lastError?.message || "Fallo crítico"}`);
};

export const generateProfessionalNews = async (rawInput: string): Promise<{ title: string, body: string }> => {
  const response = await getGeminiResponse(`Reescribe de forma profesional esta información: ${rawInput} `);

  const titleMatch = response.match(/\[TITULO_SLIDE\]\n?([\s\S]*?)\n\n\[TEXTO_LECTURA\]/);
  const bodyMatch = response.match(/\[TEXTO_LECTURA\]\n?([\s\S]*)/);

  return {
    title: titleMatch ? titleMatch[1].trim() : "Título No Generado",
    body: bodyMatch ? bodyMatch[1].trim() : "Cuerpo No Generado"
  };
};

export const improveNewsTitle = async (currentTitle: string): Promise<string> => {
  const prompt = `Generar un título gancho de máximo 8 palabras con salto de línea "|" para: "${currentTitle}".`;
  const response = await getGeminiResponse(prompt, 0.7);
  return response.replace(/\[.*?\]/gi, '').trim();
};

export const improveNewsBody = async (currentText: string): Promise<string> => {
  const prompt = `Reescribir como agencia de noticias(215 palabras aprox): "${currentText}".`;
  const response = await getGeminiResponse(prompt, 0.4);
  return response.replace(/\[.*?\]/gi, '').trim();
};

export const optimizeBodyForAudio = async (
  currentBody: string,
  useLunfardo: boolean = false,
  creativity: number = 5,
  systemOverride: string = ''
): Promise<string> => {
  const systemInstruction = "Eres un experto guionista de radio y locución. Tu tarea es mejorar la puntuación y fluidez del texto para ser leído en voz alta por un sistema TTS. NO agregues títulos ni metadatos. Solo devuelve el texto optimizado.";

  const prompt = `Optimiza la puntuación de este texto para una lectura fluida de Google TTS Argentina.
  ${useLunfardo ? 'Podés usar algo de lunfardo sutil típico de la zona.' : 'Mantenelo formal y neutro.'}
Creatividad: ${creativity}/10. 
  Instrucción adicional del director: ${systemOverride}
  Texto original: "${currentBody}"`;

  return await getGeminiResponse(prompt, 0.3, systemInstruction, FAST_MODEL_ID);
};

// Custom manual decode function as required by guidelines
function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export const generateSpeech = async (
  text: string,
  voiceName: string = 'Kore',
  pitch: string = 'medio',
  speed: number = 1.0,
  extraConfig: string = '',
  seed?: number
): Promise<{ localUrl: string, blob: Blob, pcmData: Uint8Array }> => {
  const keysToTry = getApiKeys();

  if (keysToTry.length === 0) throw new Error("No hay claves API configuradas.");

  let lastError: any = null;

  for (const apiKey of keysToTry) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const enrichedText = extraConfig ? `[Instruction: ${extraConfig}, Voice: ${voiceName}, Pitch: ${pitch}, Speed: ${speed}] ${text} ` : text;

      const response = await ai.models.generateContent({
        model: TTS_MODEL_ID,
        contents: [{ parts: [{ text: enrichedText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName as any } }
          },
          ...(seed !== undefined ? { seed } : {})
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("La IA no devolvió datos de audio.");

      const pcmData = decodeBase64(base64Audio);
      // Convert to WAV for browser compatibility (24kHz, 1 channel)
      const blob = pcmToWav(pcmData, 24000, 1);

      return {
        localUrl: URL.createObjectURL(blob),
        blob,
        pcmData
      };



    } catch (error: any) {
      console.warn(`Fallo al generar audio con clave terminada en ...${apiKey.slice(-4)}: ${error.message} `);
      lastError = error;
      // Continue to next key
    }
  }

  throw new Error(`Todas las claves fallaron.Último error: ${lastError?.message || "Desconocido"} `);
}

// === CONSTANTS FOR CLONING ===
const ANALYSIS_MODEL_ID = 'gemini-1.5-flash';

// Helper to fetch audio and convert to base64
const fetchAudioAsBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch audio sample: ${response.statusText} `);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
};

export const generateClonedSpeech = async (
  text: string,
  referenceAudioUrl: string,
  promptInstruction: string = ''
): Promise<{ localUrl: string, blob: Blob, pcmData: Uint8Array }> => {
  const keysToTry = getApiKeys();

  if (keysToTry.length === 0) throw new Error("No hay claves API configuradas.");

  // STEP 1: Analyze the Audio Sample to extract voice characteristics
  // We use the most robust key for this analysis
  let voiceDescription = "Una voz estándar y clara";
  let detectedGender = 'neutral';

  try {
    console.log("Analizando muestra de voz...");
    const analysisAi = new GoogleGenAI({ apiKey: keysToTry[0] });
    const audioBase64 = await fetchAudioAsBase64(referenceAudioUrl);
    const mimeType = referenceAudioUrl.endsWith('.wav') ? 'audio/wav' : 'audio/mp3';

    const analysisResp = await analysisAi.models.generateContent({
      model: ANALYSIS_MODEL_ID,
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: audioBase64 } },
            { text: "Analyze this voice. Return a clean JSON object with this structure: { \"gender\": \"male\" | \"female\", \"description\": \"Detailed description in Spanish ignoring background noise\" }." }
          ]
        }
      ]
    });

    const textContent = analysisResp.text || analysisResp.candidates?.[0]?.content?.parts?.[0]?.text;
    if (textContent) {
      try {
        const cleanJson = textContent.replace(/```json/g, '').replace(/```/g, '').trim();
        const analysis = JSON.parse(cleanJson);

        voiceDescription = analysis.description || textContent;
        detectedGender = analysis.gender?.toLowerCase() === 'female' ? 'female' : 'male';

        console.log("Análisis de voz estructurado:", analysis);
      } catch (e) {
        console.warn("Fallo al parsear JSON de voz, usando fallback de texto:", e);
        voiceDescription = textContent;
        detectedGender = voiceDescription.toLowerCase().includes('mujer') || voiceDescription.toLowerCase().includes('femenina') || voiceDescription.toLowerCase().includes('female') ? 'female' : 'male';
      }
    }

  } catch (err) {
    console.warn("Fallo al analizar muestra de audio, usando defaults:", err);
  }

  // STEP 2: Configure the TTS to mimic this voice
  // We select a base voice that matches the gender
  const baseVoice = detectedGender === 'female' ? 'Aoede' : 'Charon';

  // We build a rich acting prompt
  const actingInstruction = `[ACTUACIÓN DE VOZ]: Tu voz original NO importa. Debes actuar imitando estas características exactas: "${voiceDescription}". ${promptInstruction ? `Instrucción adicional: ${promptInstruction}` : ''}`;

  console.log("Generando clonación simulada con:", { baseVoice, actingInstruction });

  // STEP 3: Generate the Audio using standard TTS but with heavy steering
  // We reuse the generateSpeech logic but force the specific voice and instruction
  return await generateSpeech(
    text,
    baseVoice,
    'medio',
    1.0,
    actingInstruction,
    undefined // No fixed seed, let it vary for acting
  );
};

export const cleanAIText = (text: string): string => {
  return text.replace(/\*\*/g, '').replace(/\[.*?\]/g, '').trim();
};

export const cleanTickerText = (text: string, titleToRemove?: string): string => {
  let cleaned = cleanAIText(text);
  if (titleToRemove && cleaned.toUpperCase().startsWith(titleToRemove.toUpperCase())) {
    cleaned = cleaned.substring(titleToRemove.length).trim();
  }
  return cleaned.replace(/^[-:]+\s*/, "").trim();
};

export const appendSloganToText = (text: string, slogan: string): string => {
  if (!slogan) return text;

  const cleanText = text.trim();
  // Ensure we have a pause before the slogan
  const separator = cleanText.endsWith('.') || cleanText.endsWith('!') || cleanText.endsWith('?') ? ' ' : '. ';

  // Format the slogan for emphasis. 
  // If it starts with the brand name, ensure it's treated as a distinct phrase.
  let formattedSlogan = slogan;
  if (!formattedSlogan.endsWith('.') && !formattedSlogan.endsWith('!')) {
    formattedSlogan += '.';
  }

  return `${cleanText}${separator}\n\n${formattedSlogan}`;
};
