
// @google/genai coding guidelines followed: Using stable 'gemini-3-flash-preview' for text and 'gemini-2.5-flash-preview-tts' for audio.
import { GoogleGenAI, Modality } from "@google/genai";

const MODEL_ID = 'gemini-3-flash-preview';
const TTS_MODEL_ID = 'gemini-2.5-flash-preview-tts';
import { pcmToWav } from './audioProcessor';

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

const getAiClient = () => {
  if (!process.env.API_KEY) throw new Error("API_KEY no configurada.");
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};



export const cleanAIText = (text: string): string => {
  if (!text) return "";
  return text.replace(/\[.*?\]/gi, '').trim();
};

export const cleanTickerText = (text: string, title?: string): string => {
  let cleaned = cleanAIText(text);
  if (title) {
    const cleanTitle = cleanAIText(title).toUpperCase();
    if (cleaned.toUpperCase().startsWith(cleanTitle)) {
      cleaned = cleaned.substring(cleanTitle.length).trim();
      if (cleaned.startsWith(':') || cleaned.startsWith('-')) cleaned = cleaned.substring(1).trim();
    }
  }
  return cleaned;
};

export const appendSloganToText = (text: string): string => {
  return `${text} Saladillo Vivo, la información que importa.`;
};

export const getPhoneticGuide = async (text: string): Promise<string> => {
  const prompt = `Proporciona una guía fonética clara y normalización RAE para este nombre o frase en español rioplatense: "${text}"`;
  return await getGeminiResponse(prompt, 0.2);
};

export const getSSMLName = async (text: string): Promise<string> => {
  const prompt = `Genera un fragmento de código SSML válido para Google TTS que enfatice correctamente la pronunciación de: "${text}"`;
  return await getGeminiResponse(prompt, 0.1);
};

export const getGeminiResponse = async (prompt: string, temp: number = 0.5): Promise<string> => {
  if (!prompt) return "";
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
      config: {
        temperature: temp,
        systemInstruction: SYSTEM_NEWS_PROMPT
      }
    });
    return response.text || "";
  } catch (error) { return "Error de conexión con la IA."; }
};

export const generateProfessionalNews = async (rawInput: string): Promise<{ title: string, body: string }> => {
  const response = await getGeminiResponse(`Reescribe de forma profesional esta información: ${rawInput}`);

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
  const prompt = `Reescribir como agencia de noticias (215 palabras aprox): "${currentText}".`;
  const response = await getGeminiResponse(prompt, 0.4);
  return response.replace(/\[.*?\]/gi, '').trim();
};

export const optimizeBodyForAudio = async (
  currentBody: string,
  useLunfardo: boolean = false,
  creativity: number = 5,
  systemOverride: string = ''
): Promise<string> => {
  const prompt = `Optimiza la puntuación de este texto para una lectura fluida de Google TTS Argentina. 
  ${useLunfardo ? 'Podés usar algo de lunfardo sutil típico de la zona.' : 'Mantenelo formal y neutro.'}
  Creatividad: ${creativity}/10. 
  Instrucción adicional del director: ${systemOverride}
  Texto: "${currentBody}"`;
  return await getGeminiResponse(prompt, 0.3);
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
  extraConfig: string = ''
): Promise<{ localUrl: string, blob: Blob, pcmData: Uint8Array }> => {
  const keysToTry: string[] = [];

  if (process.env.GOOGLE_TTS_API_KEY) keysToTry.push(process.env.GOOGLE_TTS_API_KEY);
  // Add main API key as fallback if it's different or if TTS key wasn't added
  if (process.env.API_KEY && (!process.env.GOOGLE_TTS_API_KEY || process.env.API_KEY !== process.env.GOOGLE_TTS_API_KEY)) {
    keysToTry.push(process.env.API_KEY);
  }

  if (keysToTry.length === 0) throw new Error("No hay claves API configuradas (ni API_KEY ni GOOGLE_TTS_API_KEY).");

  let lastError: any = null;

  for (const apiKey of keysToTry) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const enrichedText = extraConfig ? `[Instruction: ${extraConfig}, Voice: ${voiceName}, Pitch: ${pitch}, Speed: ${speed}] ${text}` : text;

      const response = await ai.models.generateContent({
        model: TTS_MODEL_ID,
        contents: [{ parts: [{ text: enrichedText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName as any } }
          },
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
      console.warn(`Fallo al generar audio con clave terminada en ...${apiKey.slice(-4)}: ${error.message}`);
      lastError = error;
      // Continue to next key
    }
  }

  throw new Error(`Todas las claves fallaron. Último error: ${lastError?.message || "Desconocido"}`);
}
