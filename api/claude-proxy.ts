import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
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
      body: JSON.stringify({
        model,
        max_tokens,
        system,
        messages
      })
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error: any) {
    console.error("Claude Proxy Error:", error);
    return res.status(500).json({ error: error.message || 'Unknown Server Error' });
  }
}
