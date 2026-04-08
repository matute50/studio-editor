import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { provider = 'gemini' } = req.query;

  try {
    if (provider === 'claude') {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY no encontrada en entorno Vercel");

      const { messages, system, model = 'claude-3-5-sonnet-latest', max_tokens = 1000 } = req.body;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        },
        body: JSON.stringify({ model, max_tokens, system, messages })
      });

      const data = await response.json();
      return res.status(response.status).json(data);
    } 
    
    // Default: Gemini
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
      { model: "gemini-1.5-flash", v: "v1beta" },
      { model: "gemini-1.5-flash-latest", v: "v1beta" },
      { model: "gemini-2.0-flash-exp", v: "v1beta" },
      { model: "gemini-1.5-pro", v: "v1beta" },
      { model: "gemini-1.5-pro-latest", v: "v1beta" }
    ];

    if (apiKeys.length === 0) {
      throw new Error("No hay API Keys de Gemini configuradas en el entorno (Vercel Env).");
    }

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
            lastError = JSON.stringify(raw);
          }
        } catch (e: any) {
             lastError = e.message;
        }
      }
    }

    return res.status(500).json({ error: "ALL_KEYS_FAILED", details: lastError });

  } catch (error: any) {
    console.error("AI Proxy Error:", error);
    return res.status(500).json({ error: error.message || 'Unknown Server Error' });
  }
}
