import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const diccionarioFoneticoPlugin = () => ({
  name: 'diccionario-fonetico',
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      if (req.url === '/api/diccionario-fonetico') {
        const filePath = path.resolve(__dirname, 'ara-pronunciacion.txt');

        if (req.method === 'GET') {
          try {
            if (!fs.existsSync(filePath)) {
              fs.writeFileSync(filePath, '', 'utf-8');
            }
            const content = fs.readFileSync(filePath, 'utf-8');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/plain');
            res.end(content);
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        } else if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => body += chunk);
          req.on('end', () => {
            try {
              const { content } = JSON.parse(body);
              fs.writeFileSync(filePath, content, 'utf-8');
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true }));
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
      } else {
        next();
      }
    });
  }
});

const saveNoticiasPlugin = () => ({
  name: 'save-noticias',
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      if (req.url === '/api/save-noticias' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => body += chunk);
        req.on('end', () => {
          try {
            const { content } = JSON.parse(body);
            fs.writeFileSync(path.resolve(__dirname, 'noticias.txt'), content, 'utf-8');
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true }));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      } else {
        next();
      }
    });
  }
});

const geminiProxyPlugin = () => ({
  name: 'gemini-proxy',
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      if (req.url === '/api/gemini-proxy' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => body += chunk);
        req.on('end', async () => {
          try {
            const env = loadEnv('', process.cwd(), '');
            const apiKeys = [env.GEMINI_API_KEY, env.GEMINI_API_KEY_2].filter(Boolean);
            const { system, prompt } = JSON.parse(body);
            let lastError = "";

            // 1. INTENTAR CON GEMINI (ORDEN DE PRIORIDAD)
            const configs = [
              { model: "gemini-2.0-flash", v: "v1beta" },
              { model: "gemini-1.5-flash", v: "v1" },
              { model: "gemini-1.5-pro", v: "v1" }
            ];

            for (const config of configs) {
              for (const apiKey of apiKeys) {
                try {
                  const url = `https://generativelanguage.googleapis.com/${config.v}/models/${config.model}:generateContent?key=${apiKey}`;
                  const response = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      contents: [{ parts: [{ text: `INSTRUCCIONES DEL SISTEMA:\n${system}\n\nMENSAJE DEL USUARIO:\n${prompt}` }] }],
                      generationConfig: { temperature: 0.1, maxOutputTokens: 1000 }
                    })
                  });
                  const data = await response.json();
                  if (response.ok) {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(data));
                    return;
                  }
                  lastError = data.error?.message || JSON.stringify(data.error);
                } catch (e: any) { lastError = e.message; }
              }
            }

            // 2. FALLBACK A GROQ (NUEVO RESBALÓN DE ALTA VELOCIDAD)
            if (env.GROQ_API_KEY && env.GROQ_API_KEY !== "TU_CLAVE_DE_GROQ_AQUI") {
              console.warn("Gemini agotado. Iniciando fallback a Groq (Llama3-70b)...");
              try {
                const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${env.GROQ_API_KEY}`,
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    model: "llama3-70b-8192",
                    messages: [
                      { role: "system", content: system },
                      { role: "user", content: prompt }
                    ],
                    temperature: 0.1
                  })
                });
                const groqData = await groqResponse.json();
                if (groqResponse.ok) {
                  const mapped = {
                    candidates: [{
                      content: { parts: [{ text: groqData.choices[0].message.content }] }
                    }]
                  };
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(mapped));
                  return;
                }
                lastError = groqData.error?.message || "Error en Groq Fallback";
              } catch (e: any) { lastError = e.message; }
            }

            // 3. FALLBACK A OPENAI (SALVAVIDAS FINAL)
            if (env.OPENAI_API_KEY) {
              console.warn("Gemini y Groq agotados. Iniciando fallback a OpenAI (GPT-4o-mini)...");
              try {
                const oaResponse = await fetch("https://api.openai.com/v1/chat/completions", {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                      { role: "system", content: system },
                      { role: "user", content: prompt }
                    ],
                    temperature: 0.1
                  })
                });
                const oaData = await oaResponse.json();
                if (oaResponse.ok) {
                  const mapped = {
                    candidates: [{
                      content: { parts: [{ text: oaData.choices[0].message.content }] }
                    }]
                  };
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(mapped));
                  return;
                }
                lastError = oaData.error?.message || "Error en OpenAI Fallback";
              } catch (e: any) { lastError = e.message; }
            }

            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: `Agotados todos los recursos (Gemini, Groq y OpenAI). Último error: ${lastError}` }));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      } else {
        next();
      }
    });
  }
});

const serveVestuarioPlugin = () => ({
  name: 'serve-vestuario',
  configureServer(server: any) {
    const EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

    // ── API: cambiar vestuario al azar ────────────────────────────────────────
    server.middlewares.use((req: any, res: any, next: any) => {
      // POST /api/abrir-carpeta — abre explorador de Windows en la carpeta vestuario_de_hoy
      if (req.url === '/api/abrir-carpeta' && req.method === 'POST') {
        let body = '';
        req.on('data', (c: any) => body += c);
        req.on('end', () => {
          try {
            const { location } = JSON.parse(body) as { location: 'estudio' | 'exteriores' };
            const targetDir = path.resolve(__dirname, location === 'estudio' ? 'vestuario_de_hoy_estudio' : 'vestuario_de_hoy_exteriores');
            exec(`explorer "${targetDir}"`);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      // GET /api/vestuario-paths?location=estudio|exteriores
      if (req.url?.startsWith('/api/vestuario-paths') && req.method === 'GET') {
        try {
          const loc = new URL(req.url, 'http://localhost').searchParams.get('location') ?? 'estudio';
          const targetDir = path.resolve(__dirname, loc === 'estudio' ? 'vestuario_de_hoy_estudio' : 'vestuario_de_hoy_exteriores');
          const paths: string[] = [];
          for (let i = 1; i <= 30; i++) {
            const f = path.join(targetDir, `${String(i).padStart(2, '0')}.png`);
            if (fs.existsSync(f)) paths.push(f);
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ paths }));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }

      if (req.url === '/api/cambiar-vestuario' && req.method === 'POST') {
        let body = '';
        req.on('data', (c: any) => body += c);
        req.on('end', () => {
          try {
            const { location } = JSON.parse(body) as { location: 'estudio' | 'exteriores' };
            const sourceDir = path.resolve(__dirname, location === 'estudio' ? 'vestuario_estudio' : 'vestuario_exteriores');
            const targetDir = path.resolve(__dirname, location === 'estudio' ? 'vestuario_de_hoy_estudio' : 'vestuario_de_hoy_exteriores');

            // 1. Limpiar destino (excepto lock)
            fs.mkdirSync(targetDir, { recursive: true });
            for (const f of fs.readdirSync(targetDir)) {
              if (f !== '.last_update') fs.rmSync(path.join(targetDir, f), { force: true });
            }

            // 2. Elegir imagen al azar
            const imagenes = fs.readdirSync(sourceDir).filter(f => EXTS.has(path.extname(f).toLowerCase()));
            if (imagenes.length === 0) throw new Error('No hay imágenes en la carpeta fuente');
            const elegida = imagenes[Math.floor(Math.random() * imagenes.length)];

            // 3. Copiar como REFERENCE_IMAGE.PNG
            fs.copyFileSync(path.join(sourceDir, elegida), path.join(targetDir, 'REFERENCE_IMAGE.PNG'));

            // 4. 30 copias numeradas
            for (let i = 1; i <= 30; i++) {
              fs.copyFileSync(path.join(sourceDir, elegida), path.join(targetDir, `${String(i).padStart(2, '0')}.png`));
            }

            // 5. Actualizar lock
            fs.writeFileSync(path.join(targetDir, '.last_update'), new Date().toISOString().slice(0, 10), 'utf8');

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, elegida }));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }
      next();
    });

    // ── Servir imágenes estáticas de vestuario_de_hoy_* ───────────────────────
    const vestDirs: Record<string, string> = {
      '/vestuario_de_hoy_estudio/': path.resolve(__dirname, 'vestuario_de_hoy_estudio'),
      '/vestuario_de_hoy_exteriores/': path.resolve(__dirname, 'vestuario_de_hoy_exteriores'),
    };
    server.middlewares.use((req: any, res: any, next: any) => {
      for (const [prefix, dir] of Object.entries(vestDirs)) {
        if (req.url?.startsWith(prefix)) {
          const file = path.join(dir, req.url.slice(prefix.length).split('?')[0]);
          if (fs.existsSync(file) && fs.statSync(file).isFile()) {
            const ext = path.extname(file).toLowerCase();
            const mime = ext === '.png' ? 'image/png'
              : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
                : ext === '.webp' ? 'image/webp'
                  : 'application/octet-stream';
            res.setHeader('Content-Type', mime);
            res.setHeader('Cache-Control', 'no-cache');
            fs.createReadStream(file).pipe(res);
            return;
          }
        }
      }
      next();
    });
  }
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      watch: {
        ignored: ['**/noticias.txt']
      }
    },
    plugins: [react(), diccionarioFoneticoPlugin(), saveNoticiasPlugin(), serveVestuarioPlugin(), geminiProxyPlugin()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GOOGLE_TTS_API_KEY': JSON.stringify(env.GOOGLE_TTS_API_KEY),
      'process.env.GEMINI_API_KEY_2': JSON.stringify(env.GEMINI_API_KEY_2),
      'process.env.GEMINI_API_KEY_3': JSON.stringify(env.GEMINI_API_KEY_3)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
