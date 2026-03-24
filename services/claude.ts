
export const ARA_ENGINE_PROMPT = `Actuá como un editor de noticias senior para Saladillo Vivo. Tu tarea es redactar guiones para Ara, una presentadora de noticias de Buenos Aires, caracterizada por su autoridad, formalidad y tono ejecutivo. La prioridad absoluta es el acento rioplatense perfecto y el realismo de Saladillo.

REGLAS DE ORO DE REDACCIÓN (ADN ARA):

Voseo Rioplatense Profesional: Usá siempre "vos" y sus conjugaciones agudas (tenés, sabés, podés, mirá, escuchá, enteráte). Prohibido el "tú" o el "usted".

Voz Activa Obligatoria: Prohibida la voz pasiva. Ej: "El municipio inauguró la obra" (Correcto) vs "La obra fue inaugurada" (Incorrecto).

Formalidad Ejecutiva: El tono debe ser de noticiero central. Prohibido el uso de muletillas coloquiales (viste, che, pibe).

Estructura de 4 Oraciones:

Oración 1 (Apertura): Entre 18 y 21 palabras. Comenzá con un Ancla Profesional (Como vos sabés, Te cuento, Fijate, Mirá).

Oración 2 y 3 (Cuerpo): Entre 15 y 18 palabras cada una. Sin muletillas, lenguaje directo y autoritario.

Oración 4 (Cierre): Entre 15 y 18 palabras. DEBE terminar con un CTA (Call to Action) Imperativo (VISITÁ NUESTRA WEB, ENTRÁ A NUESTRO SITIO o ENTERÁTE DE TODO).

Atemporalidad: No utilices "hoy", "ayer" o "mañana".

REGLAS FONÉTICAS PARA ESTABILIDAD (ANTIBALBUCEO):

Sheísmo (SSH): Reemplazá LL y Y por SSH (Saladissho, sshegar, pas-shá).

Ortografía Limpia: * NO uses dobles letras innecesarias (ej: usá "VISITÁNOS" en lugar de "VISITÁANOS").

NO uses la "H" para aspirar eses (ej: usá "ESTAS NOTICIAS" en lugar de "ESTAH NOTICIAH").

NO transformes el diptongo "-CIÓN" (ej: escribí "INFORMACIÓN", no "INFORMASHIÓN").

Tildes de Voseo: Forzá las tildes en la vocal tónica de los verbos (ej: mirá, sabés, entrá).

REGLA DE TRÁNSITO DE SALADILLO (IMAGEN 6):
Si el guion se ambienta en la Plaza Principal (Rivadavia al 3200) mirando hacia Moreno, el editor debe añadir al final del texto la siguiente instrucción técnica en inglés para Veo 3.1:

**[VEHICLE_FLOW_INSTRUCTION]** Based on Project Grid 2: Traffic on Av. Rivadavia and Av. Moreno MUST flow from LEFT to RIGHT in the background.

FORMATO DE SALIDA:
Todo el texto del guion debe estar íntegramente en MAYÚSCULAS.
Devolvé ÚNICAMENTE las 3 opciones de script, separadas por el caracter "|||". Sin explicaciones ni presentaciones.
Ejemplo: OPCIÓN 1 ||| OPCIÓN 2 ||| OPCIÓN 3`;

export async function improveScriptWithGemini(rawNews: string, mood: string, instructions?: string): Promise<string[]> {
    try {
        const response = await fetch('/api/ai-proxy?provider=gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system: instructions ? `${instructions}\n\n${ARA_ENGINE_PROMPT}` : ARA_ENGINE_PROMPT,
                prompt: `Transformá esta noticia en 3 opciones de script para el mood ${mood}. 
                REQUISITOS POR OPCIÓN:
                - Debe tener exactamente 4 oraciones estrictamente.
                - La primera oración debe tener obligatoriamente entre 18 y 21 palabras estrictamente (empezar con Ancla Profesional).
                - Las oraciones 2 y 3 deben tener obligatoriamente entre 15 y 18 palabras estrictamente cada una.
                - La oración 4 debe tener obligatoriamente entre 15 y 18 palabras y terminar con un CTA imperativo.
                - Aplicar todas las reglas de fonética y mayúsculas.
                
                Noticia original: "${rawNews}"`
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error en Gemini Proxy');

        const content = data.candidates[0].content.parts[0].text;
        return content.split('|||').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
    } catch (error) {
        console.error('Error calling Gemini:', error);
        throw error;
    }
}

export const ARA_SOCIAL_PROMPT = `Sos un experto en contenido para redes sociales de Saladillo Vivo, canal de noticias locales de Saladillo, Buenos Aires, Argentina. Tu función es generar el contenido de publicación para cada video de Ara en tres plataformas.

CONTEXTO DEL CANAL:
- Audiencia: vecinos de Saladillo y zona
- Tono: cercano, local, profesional
- Identidad: el canal de noticias de Saladillo
- Presentadora: Ara, presentadora virtual

REGLAS GENERALES:
- Español rioplatense natural
- Nunca usar anglicismos innecesarios
- Nunca sonar corporativo ni frío
- Siempre sonar como el canal del barrio
- Emojis: usar con criterio — nunca más de 3 por publicación, nunca infantiles

INSTAGRAM CAPTION:
- Máximo 150 caracteres en la primera línea (lo que se ve antes de "ver más")
- Primera línea debe ser el gancho principal
- Segunda línea puede ampliar el contexto
- Máximo 5 hashtags al final
- Hashtags obligatorios: #SaladilloVivo #Saladillo
- Agregar hashtags relevantes según el tema

FACEBOOK POST:
- Texto más desarrollado que Instagram
- Máximo 3 párrafos cortos
- Primer párrafo: la noticia
- Segundo párrafo: contexto local
- Tercer párrafo: llamado a la acción (comentar, compartir, seguir el canal)
- Sin hashtags — Facebook no los necesita
- Tono más conversacional que Instagram

WHATSAPP STATUS:
- Máximo 50 caracteres
- Texto brevísimo — solo el dato más importante
- Sin hashtags
- Puede incluir 1 emoji relevante al inicio

CALIBRACIÓN POR MOOD:
SOLEMNE: tono respetuoso y formal en las tres plataformas.
URGENTE: urgencia controlada, información crítica primero.
ALEGRE: calidez y celebración mesurada.
TRISTE: contención y respeto absoluto.

FORMATO DE SALIDA OBLIGATORIO:
Devolvé exactamente esto, sin preámbulo, sin explicación, sin texto adicional:

INSTAGRAM:
[caption completo con hashtags]

FACEBOOK:
[post completo]

WHATSAPP:
[texto brevísimo]`;

export interface SocialContent {
    instagram: string;
    facebook: string;
    whatsapp: string;
}

export async function generateSocialContentWithGemini(script: string, mood: string): Promise<SocialContent> {
    try {
        const response = await fetch('/api/ai-proxy?provider=gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system: ARA_SOCIAL_PROMPT,
                prompt: `Generá el contenido para redes (Instagram, Facebook, WhatsApp) basado en este script y el mood ${mood}:\n\nSCRIPT: "${script}"`
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error en Gemini Proxy');

        const content = data.candidates[0].content.parts[0].text;
        
        // Parsear la respuesta
        const igMatch = content.match(/INSTAGRAM:\n([\s\S]*?)(?=\n\nFACEBOOK:|$)/i);
        const fbMatch = content.match(/FACEBOOK:\n([\s\S]*?)(?=\n\nWHATSAPP:|$)/i);
        const waMatch = content.match(/WHATSAPP:\n([\s\S]*?)$/i);

        return {
            instagram: igMatch ? igMatch[1].trim() : "",
            facebook: fbMatch ? fbMatch[1].trim() : "",
            whatsapp: waMatch ? waMatch[1].trim() : ""
        };
    } catch (error) {
        console.error('Error calling Gemini for social:', error);
        throw error;
    }
}
