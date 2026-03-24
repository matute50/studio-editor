import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { system, prompt } = req.body;
    let lastError = "";

    const apiKeys = [
      process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2, process.env.GEMINI_API_KEY_3,
      process.env.GEMINI_API_KEY_4, process.env.GEMINI_API_KEY_5, process.env.GEMINI_API_KEY_6,
      process.env.GEMINI_API_KEY_7, process.env.GEMINI_API_KEY_8, process.env.GEMINI_API_KEY_9,
      process.env.GEMINI_API_KEY_10, process.env.GEMINI_API_KEY_11, process.env.GEMINI_API_KEY_12,
      process.env.GEMINI_API_KEY_13, process.env.GEMINI_API_KEY_14
    ].filter(Boolean) as string[];

    const configs = [
      { model: "gemini-2.0-flash", v: "v1beta" },
      { model: "gemini-1.5-flash", v: "v1beta" },
      { model: "gemini-1.5-flash-latest", v: "v1beta" },
      { model: "gemini-1.5-pro", v: "v1beta" },
      { model: "gemini-1.5-pro-latest", v: "v1beta" },
      { model: "gemini-2.5-flash-preview", v: "v1beta" },
      { model: "gemini-3-flash-preview", v: "v1beta" }
    ];

    if (apiKeys.length === 0) {
      throw new Error("No hay API Keys de Gemini configuradas en el entorno (Vercel Env).");
    }

    // Rotamos por clave y modelo hasta encontrar una que funcione
    for (const key of apiKeys) {
      for (const { model, v } of configs) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/${v}/models/${model}:generateContent?key=${key}`;
          const gReq = {
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: system }] },
            generationConfig: { temperature: 0.7 }
          };

          const result = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(gReq)
          });
          
          const raw = await result.json();

          if (result.ok && raw.candidates?.[0]?.content?.parts?.[0]?.text) {
            return res.status(200).json({ text: raw.candidates[0].content.parts[0].text });
          } else {
            console.log(`Fallo silencioso model: ${model} key: ...${key.slice(-4)}`);
            lastError = JSON.stringify(raw);
          }
        } catch (e: any) {
             lastError = e.message;
        }
      }
    }

    return res.status(500).json({ error: "ALL_KEYS_FAILED", details: lastError });

  } catch (error: any) {
    console.error("Gemini Proxy Error:", error);
    return res.status(500).json({ error: error.message || 'Unknown Server Error' });
  }
}
