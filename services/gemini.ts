
// @google/genai coding guidelines followed
import { GoogleGenAI, Modality } from "@google/genai";
import { pcmToWav } from './audioProcessor';

const MODEL_ID = 'gemini-2.0-flash';
const FAST_MODEL_ID = 'gemini-2.0-flash'; // Fast, stable model for quick tasks. gemini-1.5-flash tiraba 404 en el SDK nuevo.
const TTS_MODEL_ID = 'gemini-2.5-flash-preview-tts';

const SYSTEM_NEWS_PROMPT = `
### ROL
Eres un Periodista y Locutor de Radio Profesional de Saladillo. 
TU OBJETIVO ES CONTAR LA NOTICIA CON UN TONO DINÁMICO, AMENO PERO FORMAL. Eres un medio de comunicación, mantén siempre la seriedad periodística.

### REGLAS DE ORO
1. ESTILO PERIODÍSTICO RADIAL: Escribe para el oído usando un lenguaje claro y directo, pero con vocabulario cuidado.
2. CERO LENGUAJE INFORMAL: PROHIBIDO usar modismos callejeros, informales o jerga (ej. prohibido decir "che", "loco", etc).
3. TIEMPO PRESENTE: Las cosas están pasando ahora. Evita el pasado si es posible.
4. NÚMEROS REDONDOS: Filtra la precisión innecesaria. Di "cerca de 500" en lugar de "487". 
5. PUNTUACIÓN DE RESPIRACIÓN: Usa puntos y comas para marcar pausas naturales donde el locutor deba respirar.

### ESTRUCTURA DEL RELATO
1. ENTRADA (HOOK): Empieza con el dato periodístico más fuerte o atractivo de manera profesional.
2. CUERPO: Contá lo que pasó de forma lógica, fluida y con seriedad.
3. CIERRE: Terminá con contexto o una conclusión formal.

### INSTRUCCIONES DE FORMATO OBLIGATORIAS
Debes generar SIEMPRE este formato exacto:

[TITULO_SLIDE]
Un título gancho de máximo 8 palabras. Usa "|" para el salto de línea.

[TEXTO_LECTURA]
TODO EL TEXTO DEBE ESTAR EN MAYÚSCULAS.
Extensión estricta entre 160 y 180 palabras (para 75-80 segundos de locución a un ritmo de 150ppm).
`;

// Helper to get all available API keys
const getApiKeys = (): string[] => {
  const keys: string[] = [];

  const addKey = (val: any) => {
    if (typeof val === 'string') {
      const clean = val.replace(/['"]/g, '').trim();
      if (clean && clean !== 'undefined' && clean !== 'null' && clean.length > 5 && !clean.startsWith('ae42b10')) { // ae42b10 is the TTS key
        keys.push(clean);
      }
    }
  };

  // 1. Intentar con process.env (Soportado vía vite.config.ts define)
  try { addKey(process.env.API_KEY); } catch (e) { }
  try { addKey(process.env.GEMINI_API_KEY); } catch (e) { }
  try { addKey(process.env.GEMINI_API_KEY_2); } catch (e) { }
  try { addKey(process.env.GEMINI_API_KEY_3); } catch (e) { }

  // 2. Intentar con import.meta.env (Soportado nativamente por Vite)
  try {
    addKey(import.meta.env.VITE_GEMINI_API_KEY);
    addKey(import.meta.env.VITE_GEMINI_API_KEY_2);
    addKey(import.meta.env.VITE_GEMINI_API_KEY_3);
  } catch (e) { }

  // Filter out duplicates
  const finalKeys = [...new Set(keys)];
  console.log(`[Gemini SDK] Cargadas ${finalKeys.length} API Keys válidas para rotación.`);
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

const REGLA_DE_ORO_FONETICA = `
### REGLA DE ORO DE REDACCIÓN (FONÉTICA Y LIP-SYNC)
Como editor experto en fonética para avatares de IA, aplica estrictamente:
1. FOMENTA EL VOSEO: Usa formas agudas ('vení', 'mirá', 'hablá'). Mantiene la boca abierta y estable al final.
2. ANCLAS BILABIALES: Inicia frases con 'P', 'B' o 'M' para forzar cierres labiales y recalibrar la sincronización.
3. ELIMINA CLUSTERS COMPLEJOS: Evita palabras con 3+ consonantes seguidas (ej. 'transporte' -> 'traslado'). Evita rigidez mandibular.
4. FILTRA DIPTONGOS CERRADOS: Evita 'ui' o 'iu' ('ciudad', 'triunfo') por ser demasiado rápidos para 24fps.
5. CONTROL DE "S" Y YEÍSMO: No satures con 'S' final ni acumules 'LL'/'Y' para evitar vibraciones labiales excesivas.
6. COHERENCIA SEMÁNTICA: Usa interjecciones porteñas ('¡Che!', '¡Mirá!') acorde al tono emocional.
`;

export const generateSuperResumen = async (body: string): Promise<string> => {
  const prompt = `Genera un SUPER RESUMEN de esta noticia para una presentadora virtual de IA. Aplica el "Protocolo 12x3": exactamente 3 oraciones independientes, cada una de 15 palabras (margen +/- 1), separadas por punto y un salto de línea.

${REGLA_DE_ORO_FONETICA}

REGLAS OBLIGATORIAS:
1. EXACTAMENTE 3 ORACIONES. Ni más, ni menos.
2. CADA ORACIÓN: entre 14 y 16 palabras. NUNCA más de 16. NUNCA menos de 14.
3. CADA ORACIÓN TERMINA CON PUNTO (.) seguido inmediatamente de un salto de línea (\\n) para iniciar la siguiente oración.
4. ESTRUCTURA: Oración 1 = QUÉ pasó. Oración 2 = QUIÉN/DÓNDE (contexto). Oración 3 = RESULTADO/IMPACTO.
5. TIEMPO PRESENTE, VOZ ACTIVA, SUJETO-VERBO-PREDICADO. Sin subordinadas.
6. SIN adjetivos innecesarios, SIN modismos, SIN siglas oscuras. CERO muletillas.
7. FORMATO: Solo las 3 oraciones, cada una en una nueva línea tras su punto final. Ortografía española perfecta, mayúsculas solo al inicio de cada oración y en nombres propios. Sin prefijos ni markdown.
8. CUENTA MANUALMENTE LAS PALABRAS de cada oración antes de entregar. Si son menos de 14, expandí con detalle. Si son más de 16, reescribí más conciso.

Ejemplo de salida correcta:
El equipo municipal de Saladillo inicia la repavimentación integral de tres calles del centro histórico.
La obra abarca las arterias principales Belgrano, San Martín y la avenida Rivadavia de la ciudad.
Los vecinos celebran hoy esta mejora vial que beneficiará directamente a más de diez mil personas.

Noticia completa:
${body}`;

  const response = await getGeminiResponse(
    prompt,
    0.3,
    `Eres un redactor experto en síntesis periodística "Protocolo 12x3" para avatares de IA. ${REGLA_DE_ORO_FONETICA} Tu objetivo es el lip-sync perfecto.`
  );
  return response.replace(/\[.*?\]/gi, '').trim();
};

/** Reformulación dirigida: recibe el resumen actual y garantiza el rango de 14-16 palabras. */
export const reformularSuperResumen = async (resumenActual: string): Promise<string> => {
  const oraciones = resumenActual.split(/(?<!\b[A-ZÁÉÍÓÚÑ])\.\s+(?=[A-ZÁÉÍÓÚÑ])/).map(s => s.trim()).filter(s => s.length > 0);
  const problemas = oraciones
    .map((or, i) => ({ i: i + 1, palabras: or.split(/\s+/).filter(w => w.length > 0).length, or }))
    .filter(o => o.palabras < 14 || o.palabras > 16)
    .map(o => `  - Oración ${o.i} tiene ${o.palabras} palabras (requiere 14-16): "${o.or}"`)
    .join('\n');

  const prompt = `Tengo un resumen para una conductora de TV argentina con problemas de longitud en las oraciones:

${REGLA_DE_ORO_FONETICA}

${problemas || '(Ajustar el ritmo general)'}

Resumen actual completo:
"${resumenActual}"

Tu tarea: REESCRIBIR las 3 oraciones para que cada una tenga entre 14 y 16 palabras EXACTAMENTE, aplicando la REGLA DE ORO DE REDACCIÓN.

REGLAS OBLIGATORIAS:
1. EXACTAMENTE 3 ORACIONES.
2. CADA ORACIÓN: entre 14 y 16 palabras.
3. Mantené el tono de TV argentina (Rioplatense) y la estructura Informativa.
4. CADA ORACIÓN TERMINA CON PUNTO (.) seguido inmediatamente de un salto de línea (\\n).
5. FORMATO: solo las 3 oraciones, cada una en una línea nueva, sin prefijos.`;

  const response = await getGeminiResponse(
    prompt,
    0.2,
    `Eres un editor de TV argentino experto en fonética y métrica. ${REGLA_DE_ORO_FONETICA} Ajusta cada oración a 15 palabras (+/- 1).`
  );

  return response.replace(/\[.*?\]/gi, '').trim();
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
  seed?: number
): Promise<{ localUrl: string, blob: Blob, pcmData: Uint8Array }> => {
  const keysToTry = getApiKeys();

  if (keysToTry.length === 0) throw new Error("No hay claves API configuradas.");

  let lastError: any = null;

  for (const apiKey of keysToTry) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const isFemale = ['Aoede', 'Kore', 'Berenice', 'Cassiopeia'].includes(voiceName);
      const genderLabel = isFemale ? 'una mujer' : 'un hombre';
      const ageLabel = isFemale ? '32' : '35';
      const textureLabel = isFemale ? 'clara, cálida y profesional' : 'profunda, serena y con autoridad';
      const registerLabel = isFemale ? 'mezzo-soprano' : 'barítono';

      const personaPrompt = `
1. IDENTIDAD ACÚSTICA Y TIMBRE VOCAL (ESTRICTO): Debes mantener un timbre de voz absolutamente constante y fijo en cada generación. Eres ${genderLabel} de exactamente ${ageLabel} años de edad.
Tono y Registro: Tu voz tiene un registro ${registerLabel}.
Textura: Tu timbre es ${textureLabel}, con una resonancia de pecho firme y sin estridencias.
Consistencia: Bajo ningún concepto debes alterar tu género, tu edad aparente ni la textura de tus cuerdas vocales. Esta huella acústica debe ser idéntica en todas las lecturas.

2. ROL Y MACROENTONACIÓN: Eres un locutor nativo de Buenos Aires, Argentina. Antes de hablar, haz un análisis integral del sentido del texto para anticipar la intención. Mantén un tono fluido, empático y coloquial, conectando lógicamente las ideas sin leer oraciones aisladas.

3. PROSODIA Y MELODÍA RIOPLATENSE (INTOCABLE):
Curva Napolitana: Abandona la isocronía. El pico máximo de tu tono debe coincidir exactamente con la sílaba acentuada (alargándola), para luego dejar caer la voz de forma brusca (tono descendente H+L* en los puntos).
Pausas: Al llegar a una coma, estira la sílaba tónica previa dejando la frase en un "suspenso melódico" (L+H*+L).
Arranques: Si retomas el habla tras una pausa con B, D o G, hazlo con un arranque fuerte y oclusivo. Acelera el ritmo de las sílabas átonas logrando un flujo encadenado.

4. REGLAS FONÉTICAS ESTRICTAS:
Yeísmo rehilado: "ll" e "y" suenan siempre como una fricativa postalveolar sorda [ʃ] (como la "sh" inglesa).
Debilitamiento de la S: La "s" antes de consonante es una exhalación glotal suave. Al final de palabra se elide en el flujo rápido.
Voseo: Conjugación con acento en la última sílaba (ej. tenés, hacés, vení).`;

      const enrichedText = extraConfig ? `[Instruction: ${personaPrompt} ${extraConfig}, Voice: ${voiceName}, Pitch: ${pitch}, Speed: ${speed}] ${text} ` : `[Instruction: ${personaPrompt}, Voice: ${voiceName}, Pitch: ${pitch}, Speed: ${speed}] ${text} `;

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
