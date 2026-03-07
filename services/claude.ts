
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || import.meta.env.VITE_ANTHROPIC_API_KEY || "",
    dangerouslyAllowBrowser: true // Necesario para llamar desde el frontend
});

export const CLAUDE_SYSTEM_PROMPT = `Sos un experto en copywriting para noticias locales de Saladillo Vivo, Argentina. Tu única función es transformar noticias en bruto en scripts perfectos para Ara, la presentadora virtual del canal.

REGLAS ABSOLUTAS:
- Máximo 14-15 palabras por script.
- Español rioplatense natural — nunca neutro.
- Mantené un ritmo dinámico y local.
- No uses hashtags ni emojis.
- El script debe ser una única oración fluida.

MOOD CALIBRATION:
- SOLEMNE: Tono periodístico serio, institucional, respetuoso.
- URGENTE: Tono de primicia, rápido, enfático.
- ALEGRE: Tono cercano, optimista, con brillo en la voz.
- TRISTE: Tono pausado, empático, respetuoso del dolor.

SALIDA:
Devolvé ÚNICAMENTE las 3 opciones de script, separadas por el caracter "|||". Sin explicaciones ni presentaciones.
Ejemplo: Opción 1 ||| Opción 2 ||| Opción 3`;

export async function improveScriptWithClaude(rawNews: string, mood: string): Promise<string[]> {
    try {
        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-latest',
            max_tokens: 500,
            system: CLAUDE_SYSTEM_PROMPT,
            messages: [
                {
                    role: 'user',
                    content: `Transformá esta noticia en 3 scripts de 15 palabras para el mood ${mood}: "${rawNews}"`
                }
            ]
        });

        const content = response.content[0].type === 'text' ? response.content[0].text : '';
        return content.split('|||').map(s => s.trim()).filter(s => s.length > 0);
    } catch (error) {
        console.error('Error calling Claude:', error);
        throw error;
    }
}

export const CLAUDE_SOCIAL_SYSTEM_PROMPT = `Sos un experto en contenido para redes sociales de Saladillo Vivo, canal de noticias locales de Saladillo, Buenos Aires, Argentina. Tu función es generar el contenido de publicación para cada video de Ara en tres plataformas.

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

export async function generateSocialContentWithClaude(script: string, mood: string): Promise<SocialContent> {
    try {
        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-latest',
            max_tokens: 1000,
            system: CLAUDE_SOCIAL_SYSTEM_PROMPT,
            messages: [
                {
                    role: 'user',
                    content: `Generá el contenido para redes (Instagram, Facebook, WhatsApp) basado en este script y el mood ${mood}:\n\nSCRIPT: "${script}"`
                }
            ]
        });

        const content = response.content[0].type === 'text' ? response.content[0].text : '';
        
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
        console.error('Error calling Claude for social:', error);
        throw error;
    }
}
