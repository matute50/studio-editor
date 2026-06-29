export async function redactarConHermes(textoCrudo: string, feedback: string | null = null): Promise<string> {
  const url = "http://127.0.0.1:11434/api/chat";
  const systemPrompt = "Actuarás como un robot redactor periodístico automatizado para el diario 'Saladillo Vivo' de Argentina. Tu única tarea es reescribir el texto que te pase el usuario usando español rioplatense natural. REGLAS: 1. Devolvé única y exclusivamente el cuerpo de la noticia reescrita, sin introducciones ni frases como 'En Saladillo Vivo:'. 2. Traducí el lenguaje policial denso a común (ej: 'detuvieron a un hombre' en vez de 'aprehensión de masculino'). 3. Mantené exactos los nombres, calles, números y siglas originales (ej: UFIJ N° 2).";
  
  let userMessage = textoCrudo;
  if (feedback) {
    userMessage = `Noticia original: ${textoCrudo}\n\nCorrección solicitada por el editor: ${feedback}\n\nAplica este cambio estrictamente y reescribe la nota.`;
  }

  const payload = {
    model: "hermes3:8b",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
    ],
    stream: false
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Detalle de Ollama:", errorBody);
      throw new Error(`Error en la petición a Ollama: ${response.statusText}`);
    }

    const data = await response.json();
    return data.message?.content || "";
  } catch (error) {
    console.error("Error al redactar con Hermes:", error);
    throw error;
  }
}
