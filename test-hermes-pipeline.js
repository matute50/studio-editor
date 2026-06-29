import fs from 'fs';
import path from 'path';

async function redactarConHermes(textoCrudo, feedback = null) {
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

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Detalle de Ollama:", errorBody);
    throw new Error(`Error HTTP: ${response.statusText}`);
  }
  const data = await response.json();
  return data.message?.content || "";
}

function aplicarFonetica(textoActual) {
  const pronPath = path.join(process.cwd(), 'pronunciacion.json');
  let pronunciacionData = { reemplazos: [] };
  
  if (fs.existsSync(pronPath)) {
    pronunciacionData = JSON.parse(fs.readFileSync(pronPath, 'utf8'));
  }

  let textoFonetico = textoActual || '';
  for (const item of pronunciacionData.reemplazos) {
    const regex = new RegExp(`\\b${item.original}\\b`, 'g');
    textoFonetico = textoFonetico.replace(regex, item.fonetico);
  }
  return textoFonetico;
}

async function runTests() {
  console.log("=== INICIANDO TEST DEL PIPELINE HERMES ===");

  const noticiaCruda = "En la jornada de ayer, personal de la Estación de Policía Comunal procedió a la aprehensión de un ciudadano de sexo masculino de 34 años de edad, quien momentos antes había sustraído elementos de un comercio... Interviene la UFIJ N° 2 en turno.";
  
  console.log("\n[1] Noticia Cruda Original:");
  console.log(noticiaCruda);

  try {
    console.log("\n[2] Ejecutando redactarConHermes (Inicial)...");
    const textoRedactado = await redactarConHermes(noticiaCruda);
    console.log("-> RESULTADO HERMES:");
    console.log(textoRedactado);

    console.log("\n[3] Simulando POST a /api/procesar-noticia con accion: 'CORREGIR'...");
    const feedback = "Cambia la palabra aprehensión por detuvieron y mantenlo breve";
    console.log(`-> Feedback: "${feedback}"`);
    const textoCorregido = await redactarConHermes(noticiaCruda, feedback);
    console.log("-> RESULTADO HERMES (CORREGIDO):");
    console.log(textoCorregido);

    console.log("\n[4] Simulando POST a /api/procesar-noticia con accion: 'APROBAR'...");
    const textoFinalTTS = aplicarFonetica(textoCorregido);
    console.log("-> TEXTO LISTO PARA TTS (CON FONÉTICA APLICADA):");
    console.log(textoFinalTTS);

    if (textoFinalTTS.includes("u efe i jota")) {
      console.log("\n✅ ÉXITO: El filtro de pronunciacion.json aplicó el reemplazo de 'UFIJ' correctamente.");
    } else if (textoCorregido.includes("UFIJ")) {
      console.log("\n❌ ERROR: 'UFIJ' no fue reemplazado por la fonética.");
    } else {
      console.log("\n⚠️ AVISO: 'UFIJ' no apareció en la redacción, por lo que no se probó la regex de esa palabra específica.");
    }

  } catch (err) {
    console.error("\n❌ ERROR DURANTE EL TEST:", err.message);
  }
}

runTests();
