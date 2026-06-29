import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { texto, voiceName = 'Kore', seed = 2147483647 } = req.body;

    if (!texto) {
      return res.status(400).json({ error: 'Falta el texto' });
    }

    const keys: string[] = [];
    for (let i = 1; i <= 30; i++) {
      const keyName = i === 1 ? 'GEMINI_API_KEY' : `GEMINI_API_KEY_${i}`;
      const val = process.env[keyName];
      if (val) keys.push(val);
    }

    const actingInstruction = `Sos una locutora profesional argentina de Buenos Aires. Tu acento es rioplatense auténtico: usás voseo, sheísmo (la LL y la Y se pronuncian como "sh"), y la S al final de sílaba y antes de consonante es aspirada. Leé el siguiente texto con esa fonética y con la melodía de un noticiero de Buenos Aires.\n\nTexto a leer:\n${texto}`;

    for (const apiKey of keys) {
      try {
        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-preview-tts',
          contents: [{ parts: [{ text: actingInstruction }] }],
          config: {
            responseModalities: ['AUDIO' as any],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voiceName as any }
              }
            },
            seed: Math.min(seed, 2147483647),
          } as any
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (base64Audio) {
          const audioBuffer = Buffer.from(base64Audio, 'base64');
          res.setHeader('Content-Type', 'audio/wav');
          res.setHeader('Content-Length', audioBuffer.length);
          return res.status(200).send(audioBuffer);
        }
      } catch (error: any) {
        if (error.message?.includes('429') || error.message?.includes('quota')) continue;
        console.error('[TTS API] Error:', error.message);
      }
    }

    return res.status(503).json({ error: 'Todas las keys agotadas' });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
