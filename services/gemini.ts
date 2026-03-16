
// @google/genai coding guidelines followed
import { GoogleGenAI, Modality } from "@google/genai";
import { pcmToWav } from './audioProcessor';

const MODEL_ID = 'gemini-2.0-flash';
const FAST_MODEL_ID = 'gemini-2.0-flash'; // Fast, stable model for quick tasks. gemini-1.5-flash tiraba 404 en el SDK nuevo.
const TTS_MODEL_ID = 'gemini-2.5-flash-preview-tts';
const VEO_MODEL_ID = 'models/veo-3.1-generate-preview'; // Usar nombre completo con prefijo

const SYSTEM_NEWS_PROMPT = `
### ROL
Eres un Senior News Editor para Saladillo Vivo.
TU OBJETIVO ES REDACTAR GUIONES PARA ARA, UNA PRESENTADORA FORMAL, PROFESIONAL Y AUTORITARIA DE BUENOS AIRES.

### REGLAS DE ORO (ESTILO ARA - ADN)
1. IDENTIDAD: Voseo rioplatense profesional (vos, tenés, sabés). PROHIBIDO tú, usted o neutro.
2. VOZ ACTIVA: Obligatoria. Prohibida la voz pasiva ("El municipio inauguró la obra" en lugar de "La obra fue inaugurada").
3. FORMALIDAD EJECUTIVA: Prohibido usar "viste", "che" o "pibe". Tono de noticiero central.
4. ESTRUCTURA DE 4 ORACIONES:
   - Oración 1 (Apertura): Entre 18 y 21 palabras. Iniciar con Ancla Profesional (ej: Como vos sabés, Te cuento, Fijate).
   - Oración 2 y 3 (Cuerpo): Entre 15 y 18 palabras cada una. Lenguaje directo y autoritario.
   - Oración 4 (Cierre): Entre 15 y 18 palabras. DEBE terminar con un CTA Imperativo: VISITÁ NUESTRA WEB, ENTRÁ A NUESTRO SITIO o ENTERÁTE DE TODO.
5. ATEMPORALIDAD: No utilices "hoy", "ayer" o "mañana".

### REGLAS DE SEGURIDAD (ANTIBALBUCEO)
- Sin dobles letras innecesarias (ej: "VISITÁNOS" en lugar de "VISITÁANOS").
- No usar "H" para aspirar eses (ej: "ESTAS NOTICIAS" en lugar de "ESTAH NOTICIAH").
- No transformar "-CIÓN" (ej: "INFORMACIÓN", no "INFORMASHIÓN").

### INSTRUCCIONES DE FORMATO
- TODO EL TEXTO DEBE ESTAR ÍNTEGRAMENTE EN MAYÚSCULAS.
- Respeta los delimitadores [TITULO_SLIDE] y [TEXTO_LECTURA].
`;

// Helper to get all available API keys
const getApiKeys = (silent: boolean = false): string[] => {
  const keys: string[] = [];

  const addKey = (val: any) => {
    if (typeof val === 'string') {
      // Limpieza profunda: quitar comillas (incluyendo ¨), espacios y caracteres no alfanuméricos
      const clean = val.replace(/['"¨]/g, '').trim();
      if (clean && clean !== 'undefined' && clean !== 'null' && clean.length > 10) {
        keys.push(clean);
      }
    }
  };

  // 1. Intentar con process.env (Soportado vía vite.config.ts define)
  try { addKey(process.env.API_KEY); } catch (e) { }
  try { addKey(process.env.GEMINI_API_KEY); } catch (e) { }
  try { addKey(process.env.GEMINI_API_KEY_2); } catch (e) { }
  try { addKey(process.env.GEMINI_API_KEY_3); } catch (e) { }
  try { addKey(process.env.GEMINI_API_KEY_4); } catch (e) { }
  try { addKey(process.env.GEMINI_API_KEY_5); } catch (e) { }
  try { addKey(process.env.GEMINI_API_KEY_6); } catch (e) { }
  try { addKey(process.env.GEMINI_API_KEY_7); } catch (e) { }
  try { addKey(process.env.GEMINI_API_KEY_8); } catch (e) { }
  try { addKey(process.env.GEMINI_API_KEY_9); } catch (e) { }
  try { addKey(process.env.GEMINI_API_KEY_10); } catch (e) { }
  try { addKey(process.env.GEMINI_API_KEY_11); } catch (e) { }
  try { addKey(process.env.GEMINI_API_KEY_12); } catch (e) { }
  try { addKey(process.env.GEMINI_API_KEY_13); } catch (e) { }
  try { addKey(process.env.GEMINI_API_KEY_14); } catch (e) { }

  // 2. Intentar con import.meta.env (Soportado nativamente por Vite)
  try {
    addKey(import.meta.env.VITE_GEMINI_API_KEY);
    addKey(import.meta.env.VITE_GEMINI_API_KEY_2);
    addKey(import.meta.env.VITE_GEMINI_API_KEY_3);
    addKey(import.meta.env.VITE_GEMINI_API_KEY_4);
    addKey(import.meta.env.VITE_GEMINI_API_KEY_5);
    addKey(import.meta.env.VITE_GEMINI_API_KEY_6);
    addKey(import.meta.env.VITE_GEMINI_API_KEY_7);
    addKey(import.meta.env.VITE_GEMINI_API_KEY_8);
    addKey(import.meta.env.VITE_GEMINI_API_KEY_9);
    addKey(import.meta.env.VITE_GEMINI_API_KEY_10);
    addKey(import.meta.env.VITE_GEMINI_API_KEY_11);
    addKey(import.meta.env.VITE_GEMINI_API_KEY_12);
    addKey(import.meta.env.VITE_GEMINI_API_KEY_13);
    addKey(import.meta.env.VITE_GEMINI_API_KEY_14);
  } catch (e) { }

  // Filter out duplicates
  const finalKeys = [...new Set(keys)];
  if (!silent) {
    console.log(`[Gemini SDK] Cargadas ${finalKeys.length} API Keys válidas para rotación.`);
  }
  return finalKeys;
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
      // Handle Quota Exceeded specifically
      const isQuotaError = error.message.includes("429") || error.message.includes("RESOURCE_EXHAUSTED");
      const isNotFoundError = error.message.includes("404") || error.message.includes("not found");

      if (isNotFoundError || isQuotaError) {
        console.log(`⚠️ ${isQuotaError ? 'Cuota excedida' : 'Modelo no encontrado'} con clave terminada en ...${apiKey.slice(-4)} para el modelo ${modelId}. Probando siguiente clave si existe...`);
        lastError = error;
        continue; // Try the next API key in the array
      } else {
        lastError = error;
        console.error(`Error desconocido en IA con clave ...${apiKey.slice(-4)}:`, error.message);
        break; // Stop trying keys if it's a completely different error
      }
    }
  }

  if (lastError?.message?.includes("429") || lastError?.message?.includes("RESOURCE_EXHAUSTED")) {
    // Si estamos en 2.0-flash y nos bloquea, intentamos como último recurso saltar a 2.5-flash
    // ya que Google contabiliza las peticiones por separado entre modelos
    if (modelId === 'gemini-2.0-flash') {
      console.log("⚠️ Todas las claves fallaron en 2.0-flash por cuota. Rescatando operación automáticamente con gemini-2.5-flash...");
      try {
        const fallbackAi = new GoogleGenAI({ apiKey: keysToTry[0] });
        const fallbackResponse = await fallbackAi.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            temperature: temp,
            systemInstruction: systemInstruction
          }
        });
        console.log("✅ Operación rescatada: gemini-2.5-flash tomó el control con éxito!");
        return fallbackResponse.text || "";
      } catch (fallbackError: any) {
        console.log("⚠️ Fallback a 2.5-flash también falló:", fallbackError.message);
        console.log("⚠️ Intentando fallback último recurso a gemini-3-flash-preview...");
        try {
          const fallbackAiPro = new GoogleGenAI({ apiKey: keysToTry[0] });
          const fallbackResponsePro = await fallbackAiPro.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
              temperature: temp,
              systemInstruction: systemInstruction
            }
          });
          console.log("✅ Fallback a gemini-3-flash-preview exitoso");
          return fallbackResponsePro.text || "";
        } catch (fallbackErrorPro: any) {
          console.error("❌ Fallback a 3-flash-preview también falló:", fallbackErrorPro.message);
          throw new Error("Cuota de IA excedida en todos los modelos (2.0 y 2.5/3.0). Por favor espera 1 minuto o considera habilitar facturación en Google AI Studio.");
        }
      }
    }
  }

  console.error("❌ Todas las claves fallaron y no se pudo usar fallback en getGeminiResponse:", lastError?.message);
  throw lastError || new Error("Error desconocido al contactar Gemini");
};

export const generateProfessionalNews = async (rawInput: string): Promise<{ title: string, body: string }> => {
  const prompt = `Reescribe de forma profesional esta información: ${rawInput}.\n\nREGLA ESTRICTA DE FORMATO:\nEmpieza tu respuesta con [TITULO_SLIDE], luego el título. Después [TEXTO_LECTURA] y luego el texto. NO uses [TÍTULO_SLIDE] con tilde.`;
  const response = await getGeminiResponse(prompt);

  const cleanResponse = response.replace(/\*\*/g, '').replace(/\[TÍTULO_SLIDE\]/gi, '[TITULO_SLIDE]').replace(/\[TEXTO LECTURA\]/gi, '[TEXTO_LECTURA]');

  const titleMatch = cleanResponse.match(/\[TITULO_SLIDE\]\s*([\s\S]*?)\s*\[TEXTO_LECTURA\]/i);
  const bodyMatch = cleanResponse.match(/\[TEXTO_LECTURA\]\s*([\s\S]*)/i);

  // Si ambas expresiones fallan, devolvemos todo el texto crudo como body para no bloquear al usuario
  let finalTitle = titleMatch ? titleMatch[1].trim() : "Generado por IA";
  let finalBody = bodyMatch ? bodyMatch[1].trim() : cleanResponse.trim();

  // Limpiar marcas markdown si quedaron
  finalTitle = finalTitle.replace(/^#+\s*/, '').trim();

  return {
    title: finalTitle,
    body: finalBody
  };
};

export const improveNewsTitle = async (currentTitle: string): Promise<string> => {
  const prompt = `Generar un título gancho de máximo 8 palabras con salto de línea "|" para: "${currentTitle}".`;
  const response = await getGeminiResponse(prompt, 0.7);
  return response.replace(/\[.*?\]/gi, '').trim();
};

export const improveNewsBody = async (currentText: string): Promise<string> => {
  const prompt = `Reescribir con estilo radial conversacional (170 palabras aprox, EN MAYÚSCULAS): "${currentText}".`;
  const response = await getGeminiResponse(prompt, 0.4);
  return response.replace(/\[.*?\]/gi, '').trim();
};

const REGLA_DE_ORO_FONETICA = `ROL: SENIOR NEWS EDITOR (ESTABILIDAD ANTIBALBUCEO). REGLAS: 1. SHEÍSMO (SSH): LL/Y -> SSH. 2. ORTOGRAFÍA LIMPIA: NO DOBLES LETRAS (VISITÁNOS), NO "H" PARA ASPIRAR (ESTAS), -CIÓN ESTÁNDAR. 3. VOSEO AGUDO: FORZAR TILDES. 4. MAYÚSCULAS: TODO EN MAYÚSCULAS. 5. CTA OBLIGATORIO: LA 4TA ORACIÓN TERMINA CON AUTORIDAD.`;

export const generateSuperResumen = async (body: string): Promise<string> => {
  const prompt = `ACTUÁ COMO UN EDITOR DE NOTICIAS SENIOR DE SALADILLO VIVO. GENERA UN SÚPER RESUMEN "ESTILO ARA" SIGUIENDO ESTAS REGLAS DE ORO:

${REGLA_DE_ORO_FONETICA}

REGLAS OBLIGATORIAS:
1. EXACTAMENTE 4 ORACIONES EN MAYÚSCULAS.
2. MÉTRICA POR ORACIÓN: 
   - ORACIÓN 1: 18 A 21 PALABRAS. EMPIEZA CON ANCLA PROFESIONAL (COMO VOS SABÉS / TE CUENTO / FIJATE).
   - ORACIONES 2 Y 3: 15 A 18 PALABRAS CADA UNA. TONO AUTORITARIO.
   - ORACIÓN 4: 15 A 18 PALABRAS. TERMINA CON CTA (VISITÁ NUESTRA WEB / ENTRÁ A NUESTRO SITIO / ENTERÁTE DE TODO).
3. PROHIBIDO: "VISTE", "CHE", "PIBE", "HOY", "AYER", "MAÑANA".
4. FONÉTICA: LL/Y -> SSH. MANTENÉ ORTOGRAFÍA LIMPIA Y MAYÚSCULAS.

NOTICIA COMPLETA:
${body}`;

  const response = await getGeminiResponse(
    prompt,
    0.3,
    `ERES UN SENIOR NEWS EDITOR DE TELEVISIÓN. ${REGLA_DE_ORO_FONETICA} GENERA EXACTAMENTE 4 ORACIONES EN MAYÚSCULAS CON MÉTRICAS 21/18/18/18 Y CTA OBLIGATORIO.`
  );
  const result = response.replace(/\[.*?\]/gi, '').trim().toUpperCase();

  return result;
};

/** Reformulación dirigida: recibe el resumen actual y garantiza los límites máximos de palabras. */
export const reformularSuperResumen = async (resumenActual: string, intentos = 0): Promise<string> => {
  const oraciones = resumenActual.split(/\n/).map(s => s.trim()).filter(s => s.length > 0);
  const problemas = oraciones
    .map((or, i) => {
       const limiteMax = 21;
       const limiteMin = 18;
       const palabras = or.split(/\s+/).filter(w => w.length > 0).length;
       return { i: i + 1, palabras, or, limiteMax, limiteMin };
    })
    .filter(o => o.palabras > o.limiteMax || o.palabras < o.limiteMin)
    .map(o => `  - Oración ${o.i} tiene ${o.palabras} palabras (debe tener entre ${o.limiteMin} y ${o.limiteMax}): "${o.or}"`)
    .join('\n');

  // Si no hay problemas y no es el primer pase (o venía bien desde un principio), devolver
  if (!problemas && oraciones.length === 4) return resumenActual;

  const prompt = `Tengo un resumen para una conductora de TV argentina con problemas de longitud y métrica en las oraciones:

${REGLA_DE_ORO_FONETICA}

${problemas || '(Ajustar el ritmo general asegurando exactamente 4 oraciones y el formato Sándwich Porteño)'}

Resumen actual completo:
"${resumenActual}"

Tu tarea: REESCRIBIR las oraciones para que cumplan exactamente el "Estilo Ara" y el hack de acento rioplatense.

REGLAS OBLIGATORIAS:
1. EXACTAMENTE 4 ORACIONES ESTRICTAMENTE.
2. MÉTRICA: Entre 18 y 21 palabras por oración. PROHIBIDO más de 21.
3. SÁNDWICH PORTEÑO: Cada oración empieza con (Mirá/Te cuento/Fijate) y termina con (viste/sabés/entendés/acá en el barrio).
4. Mantené el tono de TV argentina (Rioplatense) y la estructura Informativa.
5. UNIDAD DE SENTIDO: Cada oración termina con punto (.) aportando una idea gramaticalmente completa e independiente, seguida de un salto de línea (\\n).
6. FORMATO: solo las 4 oraciones, cada una en una línea nueva, sin comillas ni prefijos.`;

  const response = await getGeminiResponse(
    prompt,
    0.2,
    `Eres un editor de TV argentino experto en fonética y métrica. ${REGLA_DE_ORO_FONETICA} Ajusta el texto a exactamente 4 oraciones estrictamente, con 18-21 palabras cada una de manera estricta.`
  );

  const result = response.replace(/\[.*?\]/gi, '').trim();
  
  const nuevasOraciones = result.split(/\n/).map(s => s.trim()).filter(s => s.length > 0);
  const cumple = nuevasOraciones.length === 4 && nuevasOraciones.every((or) => {
      const count = or.split(/\s+/).filter(w => w.length > 0).length;
      return count >= 18 && count <= 21;
  });

  if (!cumple && intentos < 2) {
      console.warn(`Reformulación falló métrica (intento ${intentos + 1}). Reintentando...`);
      return await reformularSuperResumen(result, intentos + 1);
  }

  return result;
};

export const corregirOracionAra = async (oracion: string): Promise<string> => {
  const prompt = `Corrige la ortografía, tildes y puntuación de esta única oración.
Además, ajústala suavemente al "Estilo Ara" sin alterar su significado original ni extenderla demasiado:
- Voseo rioplatense natural.
- Estructura simple (Sujeto + verbo + predicado).
- Usa voz activa.
- Cero palabras temporales (ayer, hoy, mañana).
- No termines en "así" ni "hoy".
- Trata de mantener la misma longitud de palabras que ya tiene (${oracion.split(/\s+/).length} palabras aprox).
- Si le falta punto final, agrégalo.

Oración a corregir: "${oracion}"

Devuelve ÚNICAMENTE la oración corregida, sin comillas ni explicaciones.`;

  const response = await getGeminiResponse(prompt, 0.2, "Eres un editor experto de TV.");
  let result = response.replace(/\[.*?\]/gi, '').trim();
  if (result.length > 0 && !result.endsWith('.')) {
     result += '.';
  }
  return result;
};

/** Corrección ortográfica estricta: NO modifica longitud ni palabras, solo corrige acentos, mayúsculas y errores de tipeo. */
export const corregirOrtografiaLibre = async (textoLibre: string): Promise<string> => {
  const prompt = `Tengo un texto libre para un prompter de TV que necesita ÚNICAMENTE CORRECCIÓN ORTOGRÁFICA.
  
Texto actual:
"${textoLibre}"

Tu tarea: REESCRIBIR EL TEXTO EXACTAMENTE IGUAL EN CUANTO A PALABRAS Y ESTRUCTURA, pero corrigiendo errores de tipeo, faltas de ortografía, tildes y uso de mayúsculas/minúsculas.

REGLAS OBLIGATORIAS:
1. NO CAMBIAR NINGUNA PALABRA por un sinónimo. Mantén el vocabulario exacto, incluso si es informal.
2. NO ALTERAR LA LONGITUD, ni resumir, ni expandir.
3. SOLO corregir gramática y ortografía básica (tildes, b/v, c/s/z, h, aperturas de signos de interrogación/admiración).
4. DEVUELVE ÚNICAMENTE EL TEXTO CORREGIDO SIN EXPLICACIONES O NOTAS ADICIONALES.`;

  const response = await getGeminiResponse(
    prompt,
    0.1,
    `Eres un estricto corrector ortográfico. Tu única función es arreglar errores de tipeo e ingresar tildes sin cambiar las palabras originales del usuario.`
  );

  return response.trim();
};




export const optimizeBodyForAudio = async (
  currentBody: string,
  useLunfardo: boolean = false,
  creativity: number = 5,
  systemOverride: string = ''
): Promise<string> => {
  const systemInstruction = "Eres un experto guionista de radio y locución periodística. Tu tarea es adaptar el texto para ser leído en voz alta en un noticiero. DEBES MANTENER LA FORMALIDAD PERIODÍSTICA. PROHIBIDO usar modismos informales (ej. 'che'). NO agregues títulos ni metadatos. Solo devuelve el texto optimizado para lectura.";

  const prompt = `Optimiza la puntuación y redacción de este texto para una lectura periodística fluida en Google TTS Argentina.
  ${useLunfardo ? 'El tono debe ser ameno y cercano al oyente, pero siempre manteniendo la seriedad periodística. ESTÁ PROHIBIDO llegar a la informalidad excesiva o usar muletillas callejeras.' : 'Mantenelo estrictamente formal, serio y neutro.'}
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
  seed: number = 2147483647 // Semilla técnica fija para estabilidad total de Ara
): Promise<{ localUrl: string, blob: Blob, pcmData: Uint8Array }> => {
  const keysToTry = getApiKeys();

  if (keysToTry.length === 0) throw new Error("No hay claves API configuradas.");

  let lastError: any = null;

  for (const apiKey of keysToTry) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const normalizedVoice = voiceName.toLowerCase();
      const isFemale = ['aoede', 'kore', 'berenice', 'cassiopeia'].includes(normalizedVoice);
      const genderLabel = isFemale ? 'una mujer' : 'un hombre';
      const ageLabel = isFemale ? '32' : '35';
      const textureLabel = isFemale ? 'clara, cálida y profesional' : 'profunda, serena y con autoridad';
      const registerLabel = isFemale ? 'mezzo-soprano' : 'barítono';

      // TÁCTICA FINAL PERMITIDA POR GOOGLE TTS: "Tag de Una Sola Línea"
      // Tras confirmar que Gemini 2.5 TTS rechaza 'systemInstruction' y 'Multi-turn chat',
      // la única forma de pasar la identidad sin bajar volumen ni perder acento es
      // un tag directo asimilable en menos de un microsegundo de cálculo, sin explicaciones.
      const accentTag = `[Voz: Locutora de Buenos Aires, volumen alto y estable]`;
      const enrichedText = extraConfig 
        ? `${accentTag} [Tono: ${extraConfig}] ${text}` 
        : `${accentTag} ${text}`;

      const response = await ai.models.generateContent({
        model: TTS_MODEL_ID,
        contents: [{ parts: [{ text: enrichedText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            languageCode: 'es-AR',
            voiceConfig: { 
              prebuiltVoiceConfig: { 
                voiceName: voiceName as any 
              } 
            }
          },
          seed: seed !== undefined ? Math.min(seed, 2147483647) : undefined,
          speakingRate: 1.0,
          pitch: 0.0
        } as any
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
      const isQuotaError = error.message.includes("429") || error.message.includes("RESOURCE_EXHAUSTED");
      console.warn(`Fallo al generar audio con clave terminada en ...${apiKey.slice(-4)}: ${error.message} `);
      
      if (isQuotaError && apiKey === keysToTry[keysToTry.length - 1]) {
        // Si la última clave también falló por cuota
        lastError = new Error("⏳ Límite de cuota (Free Tier) alcanzado. La nueva versión de Gemini TTS permite un máximo de 10 audios diarios por clave. Por favor, esperá o usá otra clave.");
      } else {
        lastError = error;
      }
      // Continue to next key
    }
  }

  throw lastError || new Error("Todas las claves fallaron al generar audio.");
}

// === CONSTANTS FOR CLONING ===
const ANALYSIS_MODEL_ID = 'gemini-2.0-flash';

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

/**
 * CONFIGURACIÓN DE VIDEO VEO 3.1 (AI PRO)
 * Inicialización del cliente usando la clave 11 para video premium.
 */
const VEO_SYSTEM_DIRECTOR = `
[CONFIGURACIÓN CINEMATOGRÁFICA - ARA EN VIVO]:
- Estilo Visual: Iluminación de estudio de noticias de alta gama (Three-point lighting).
- Luz Clave: Luz suave sobre el rostro de Ara (35 años) con un ligero brillo en los ojos que denote viveza y contacto con el público.
- Luz de Recorte (Rim Light): Un sutil halo de luz en hombros y cabello para separarla del fondo, creando profundidad tridimensional.
- Cámara: Plano medio (Medium Shot), lente de 50mm para aspecto natural y humano.
- Integración: Sombras ambientales coherentes que denoten presencia física en el lugar.

[DIRECCIÓN DE ACTUACIÓN]:
- Movimientos: Manos pausadas y profesionales.
- Sincronización: Lip-sync total con audio rioplatense (sh), capturando la energía de una presentadora de noticias política y gremial en vivo.
`;

const getVeoClient = (apiKey: string) => {
    return new GoogleGenAI({ apiKey });
};

/**
 * PRE-PROCESADOR DE ACENTO: Inyecta voseo o modismos locales si el texto es muy neutro.
 * Esto evita que el modelo de voz nativo de Veo recaiga en acento neutro.
 */
export const adaptarTextoArgentino = (texto: string): string => {
    let textoBase = texto.toUpperCase();
    
    // 0. Corrector de Acentuación Voseo (Rioplatense): Forzamos la tilde en la vocal tónica
    textoBase = textoBase
        .replace(/\b(ENTERATE)\b/gi, "ENTERÁTE")
        .replace(/\b(INFORMATE)\b/gi, "INFORMÁTE")
        .replace(/\b(SUMATE)\b/gi, "SUMÁTE")
        .replace(/\b(ACERCATE)\b/gi, "ACERCÁTE")
        .replace(/\b(COMUNICATE)\b/gi, "COMUNICÁTE")
        .replace(/\b(SUSCRIBITE)\b/gi, "SUSCRIBÍTE")
        .replace(/\b(SEGUINOS)\b/gi, "SEGUÍNOS")
        .replace(/\b(MIRALO)\b/gi, "MIRÁLO")
        .replace(/\b(CONTANOS)\b/gi, "CONTÁNOS")
        .replace(/\b(BUSCALO)\b/gi, "BUSCÁLO")
        .replace(/\b(LLAMAME)\b/gi, "LLAMÁME")
        .replace(/\b(ENTRA)\b/gi, "ENTRÁ")
        .replace(/\b(MIRA)\b/gi, "MIRÁ")
        .replace(/\b(VISITANOS)\b/gi, "VISITÁNOS");

    // 1. Limpieza de Dobles Letras (Antibalbuceo)
    textoBase = textoBase
        .replace(/ÁA/g, "Á")
        .replace(/ÉE/g, "É")
        .replace(/ÍI/g, "Í")
        .replace(/ÓO/g, "Ó")
        .replace(/ÚU/g, "Ú");

    // 2. Reemplazo de LL y Y por SSH (Sheísmo para VEO 3.1)
    let textoProcesado = textoBase
        // Protegemos la conjunción "Y" y palabras terminadas en Y (como hoy) que no deben SSH
        .replace(/\bY\b/g, "Y@@@")
        .replace(/([A-Z]+Y)\b/g, "$1@@@")

        // Reemplazo LL -> SSH
        .replace(/LL/g, "SSH")
        
        // Reemplazo Y -> SSH (solo si no es protegida)
        .replace(/Y(?!@@@)/g, "SSH")

        // Restauración y Cantito
        .replace(/@@@/g, "")
        .replace(/(MUNICIPALIDAD|MUNICIPIO|INTENDENTE|GOBERNADOR)/g, "$1,");

    return textoProcesado.toUpperCase();
};

/**
 * PROTOCOLO DE FLUJO DE TRABAJO - SALADILLO VIVO (VEO 3.1)
 * 1. Enviar primer segmento de audio (8 segundos) al endpoint de generación base.
 * 2. Una vez recibido el video, iniciar automáticamente solicitudes extendVideo por cada segmento restante (7 segundos).
 * 3. Asegurar lip-sync mediante el audio de referencia en cada paso (estilo Rioplatense + Presentadora en Vivo).
 */
export const generateAvatarVideo = async (
    textoDeseado: string,
    imageReferenceBase64: string,
    audioReferenceBase64?: string,
    backgroundBase64?: string,
    previousVideoBase64?: string,
    aspectRatio: "9:16" | "16:9" = "9:16",
    retryCount = 0
): Promise<{ videoUrl: string, status: string, videoData?: string }> => {
    // FORZADO DE KEY: El usuario ha solicitado usar GROQ_API_KEY para Veo 3.1.
    // ADVERTENCIA: Veo 3.1 es de Google; una clave 'gsk_...' de Groq fallará con 401.
    const apiKey = process.env.GROQ_API_KEY || import.meta.env.VITE_GROQ_API_KEY || 
                   process.env.GEMINI_API_KEY_11 || import.meta.env.VITE_GEMINI_API_KEY_11;

    console.log(`[VEO_REST_V4] Iniciando generación con retry: ${retryCount} (Usando Key: ${apiKey?.substring(0, 8)}...)`);
    if (!apiKey) throw new Error("API Key no encontrada.");

    // List of models to try
    const modelsToTry = [
        'veo-3.1-generate-preview', 
        'veo-3.1-fast-generate-preview',
        'veo-3.0-generate-001'
    ];

    try {
        const isExtension = !!previousVideoBase64;
        
        // REGLA 3: Pre-procesador de Acento (Inyector de Voseo)
        const textoProcesado = adaptarTextoArgentino(textoDeseado);

        // REGLA 2: Formato del Prompt de Texto (Front-loading y Cero Comillas)
        // Se inyecta el textoProcesado sin comillas internas y con (no subtitles) al final absoluto.
        const finalPrompt = `[IDENTIDAD_VISUAL:ARA_BUENOS_AIRES] Using the provided reference image of the professional news anchor, maintain her exact facial identity, clothing, and background. Eye-level, locked-off medium shot. The video begins with a brief silent pause, perfectly matching the reference expression. Then, the anchor looks directly at the camera, enunciating clearly. She acts and speaks with a strong, authentic Rioplatense accent from Buenos Aires, using acute voseo stress and a melodic cadence. Audio: She speaks at a brisk but natural pace and says: "${textoProcesado}" Immediately after the final word, she closes her mouth and holds a static resting pose in complete silence until the video ends. Negative prompt: neutral Spanish, Mexican accent, Spanish accent, corporate motivational tone, changing facial identity, morphing, wipe transitions, fade out, scene cuts, text overlays, subtitles, captions, title cards, typography, visual filters, post-processing effects, background music, sound effects, SFX, ambient noise, audio artifacts, extra dialogue, off-script talking, lip movement without audio, voice before speech, voice after speech.`;

        const currentModelId = modelsToTry[retryCount % modelsToTry.length] || VEO_MODEL_ID.replace('models/', '');

        // Usamos el endpoint REST directamente para control total sobre el formato Vertex
        // que requiere Veo 3.1 según la investigación del usuario.
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModelId}:predictLongRunning?key=${apiKey}`;

        const referenceImages: any[] = [
            {
                referenceType: "asset",
                image: {
                    bytesBase64Encoded: imageReferenceBase64,
                    mimeType: "image/png"
                }
            }
        ];

        // Se elimina la inyección de fondo adicional para simplificar el payload (First Frame lo contiene)

        const body = {
            instances: [
                {
                    prompt: finalPrompt,
                    image: {
                        bytesBase64Encoded: imageReferenceBase64,
                        mimeType: "image/jpeg"
                    },
                    // EXTENSIÓN: Si hay video previo, se inyecta para continuidad temporal
                    ...(previousVideoBase64 ? {
                        video: {
                            bytesBase64Encoded: previousVideoBase64,
                            mimeType: "video/mp4"
                        }
                    } : {})
                }
            ],
            parameters: {
                aspectRatio: "16:9",
                durationSeconds: 8,
                resolution: "720p",
                seed: 1045
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        const operation = await response.json();
        const operationName = operation.name;
        console.log(`[VEO_REST] Operación iniciada: ${operationName}`);

        // Polling loop: Veo puede tardar minutos
        const opUrl = `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`;
        let done = false;
        let finalResponse = null;
        let pollingAttempts = 0;
        const maxPollingAttempts = 60; // 10 minutos aprox (10s x 60)

        while (!done && pollingAttempts < maxPollingAttempts) {
            pollingAttempts++;
            await new Promise(r => setTimeout(r, 10000)); // Esperar 10s

            const opRes = await fetch(opUrl);
            if (!opRes.ok) continue;

            const opData = await opRes.json();
            if (opData.done) {
                done = true;
                if (opData.error) {
                    throw new Error(`Operación falló: ${opData.error.message}`);
                }
                finalResponse = opData.response;
            } else {
                console.log(`[VEO_POLLING] Progreso: ${opData.metadata?.progress || 0}%...`);
            }
        }

        if (!done) {
            throw new Error("Timeout esperando la generación de video.");
        }

        const veoResponse = finalResponse?.generateVideoResponse;

        // 1. Verificar si el video fue bloqueado por filtros de seguridad (RAI)
        if (veoResponse?.raiMediaFilteredCount && veoResponse.raiMediaFilteredCount > 0) {
            const reasons = veoResponse.raiMediaFilteredReasons?.join(", ") || "Violación de políticas de seguridad (Likeness/Likelihood)";
            console.error("Video bloqueado por RAI de Google:", reasons);
            throw new Error(`Google bloqueó el video por seguridad: ${reasons}`);
        }

        // 2. Extraer la URI del video de la estructura correcta de Veo 3.1 REST
        const videoUri = veoResponse?.generatedSamples?.[0]?.video?.uri;

        if (!videoUri) {
            console.error("Respuesta final sin URI de video:", JSON.stringify(finalResponse, null, 2));
            throw new Error("No se pudo extraer la URI del video. Es posible que haya sido filtrado o haya ocurrido un error silencioso.");
        }

        console.log(`[VEO_REST] URI encontrada: ${videoUri}`);

        // 2. Descargar el video desde la URI (necesita la API KEY para el download)
        const downloadUrl = `${videoUri}&key=${apiKey}`;
        const videoResp = await fetch(downloadUrl);
        
        if (!videoResp.ok) {
            throw new Error(`Error al descargar video de Google: ${videoResp.statusText}`);
        }

        const videoBlob = await videoResp.blob();
        
        // 3. Convertir a Base64 para sincronización con el sistema de producción si es necesario
        // o devolver directamente el Blob URL para visualización inmediata
        const videoDataOutput = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(videoBlob);
        });

        return {
            videoUrl: URL.createObjectURL(videoBlob),
            status: 'ready',
            videoData: videoDataOutput // Mantenemos el videoData en base64 para el flujo de extensiones
        };

    } catch (error: any) {
        // Manejo de cuotas y modelos no encontrados con reintentos automáticos
        const isQuotaError = error.message.includes("429") || error.message.includes("RESOURCE_EXHAUSTED");
        const isNotFoundError = error.message.includes("404") || error.message.includes("not found");
        
        if ((isQuotaError || isNotFoundError) && retryCount < modelsToTry.length) {
            // BACKOFF: 10s para el primer reintento, luego exponencial (20s, 40s...) + jitter
            let waitTime = isNotFoundError ? 1000 : 10000 * Math.pow(2, retryCount);
            const jitter = Math.random() * 2000; // + 0-2 segundos aleatorios
            waitTime += jitter;

            console.warn(`[VEO_REST Fallback] Error en intento ${retryCount + 1}: ${error.message}. Reintentando en ${Math.round(waitTime/1000)}s...`);
            await new Promise(r => setTimeout(r, waitTime));
            return generateAvatarVideo(textoDeseado, imageReferenceBase64, audioReferenceBase64, backgroundBase64, previousVideoBase64, aspectRatio, retryCount + 1);
        }

        console.error("Error en Video Service REST:", error);
        throw new Error(`Fallo en generación de video: ${error.message}`);
    }
};

/**
 * --- ARQUITECTURA DE CONTINGENCIA (DISEÑO DE 2 PASOS) ---
 * Propuesta para el caso de que el audio nativo de Veo 3.1 no cumpla los estándares Rioplatenses.
 * 
 * PASO 1: Generación de Video Base (Veo 3.1)
 * El video se genera con Veo 3.1 usando el prompt optimizado. Si el acento falla, 
 * el video se trata como una base visual sin valor de audio final.
 * 
 * PASO 2: Post-Procesamiento de Lip-Sync Externo
 * Se toma el video generado y se envía a una API de Lip-Sync especializada 
 * (Sync Labs, HeyGen, o Wav2Lip) junto con un audio de alta fidelidad generado por 
 * un motor TTS especializado en clonación Rioplatense (Google es-AR o ElevenLabs).
 */

/**
 * Función PLACEHOLDER para el terreno de contingencia
 * Prepara la integración con un servicio de Lip-Sync de terceros.
 */
export const postProcessExternalLipSync = async (videoUrl: string, audioFile: string) => {
    console.log("[CONTINGENCIA] Iniciando post-procesamiento de Lip-Sync externo...");
    console.log(`[CONTINGENCIA] Video Base: ${videoUrl}`);
    console.log(`[CONTINGENCIA] Audio de Referencia (es-AR): ${audioFile}`);

    /**
     * Ejemplo de flujo esperado:
     * 1. Descargar videoUrl a un buffer.
     * 2. Llamar a API externa (ej. Sync Labs):
     *    const syncResponse = await fetch('https://api.synclabs.so/v1/video', {
     *        method: 'POST',
     *        body: JSON.stringify({ videoUrl, audioUrl: audioFile, model: 'sync-1.6' })
     *    });
     * 3. Retornar la nueva URL del video sincronizado con el audio Rioplatense nativo.
     */
    
    return {
        status: 'pending_external',
        message: "Groundwork preparado para Lip-Sync de terceros (ElevenLabs + SyncLabs)."
    };
};
