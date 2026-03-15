import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import ffmpeg from 'fluent-ffmpeg';
import { S3Client, ListObjectsV2Command, CopyObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = '3f11be5ae3d34a83cf63343662eec80e';
const R2_ACCESS_KEY_ID = '6e5e3dce4038a338abfb5fe96c5cb8a9';
const R2_SECRET_ACCESS_KEY = 'c6873a1c2d0dd7b55bca1a51ecf42c5e4ab5c21563df79ad37c33295b86c2b70';
const R2_BUCKET_NAME = 'saladillovivo-media';

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true
});
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

const listAudiosPlugin = () => ({
  name: 'list-audios',
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      if (req.url === '/api/list-audios' && req.method === 'GET') {
        const targetDir = path.resolve(__dirname, 'audios_Ara');
        try {
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.mp3') || f.endsWith('.wav'));
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ audios: files }));
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      } else if (req.url?.startsWith('/api/delete-audio') && req.method === 'DELETE') {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const fileName = url.searchParams.get('fileName');
        const targetDir = path.resolve(__dirname, 'audios_Ara');
        
        if (!fileName) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Falta fileName' }));
          return;
        }

        try {
          const filePath = path.join(targetDir, fileName);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true }));
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      } else {
        next();
      }
    });
  }
});

const saveAudioPlugin = () => ({
  name: 'save-audio',
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      if (req.url?.startsWith('/api/save-audio')) {
        const targetDir = path.resolve(__dirname, 'audios_Ara');
        
        if (req.method === 'GET') {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const fileName = url.searchParams.get('fileName');
          
          if (!fileName) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Falta fileName' }));
            return;
          }

          const fileExists = fs.existsSync(path.join(targetDir, fileName));
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ exists: fileExists }));
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => body += chunk);
          req.on('end', () => {
            try {
              const { fileName, audioBase64 } = JSON.parse(body);
              if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
              }
              const buffer = Buffer.from(audioBase64, 'base64');
              fs.writeFileSync(path.join(targetDir, fileName), buffer);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err: any) {
              console.error("Error en save-audio:", err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }
      }
      next();
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

const claudeProxyPlugin = () => ({
  name: 'claude-proxy',
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      if (req.url === '/api/claude-proxy' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => body += chunk);
        req.on('end', async () => {
          try {
            const env = loadEnv('', process.cwd(), '');
            const apiKey = env.ANTHROPIC_API_KEY;
            if (!apiKey) throw new Error("ANTHROPIC_API_KEY no encontrada en .env");

            const { messages, system, model = 'claude-3-5-sonnet-latest', max_tokens = 1000 } = JSON.parse(body);

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
            res.statusCode = response.status || 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
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

const geminiProxyPlugin = () => {
  let apiKeys: string[] = [];
  
  return {
    name: 'gemini-proxy',
    configResolved(config: any) {
      const folder = config.root || process.cwd();
      const env = loadEnv(config.mode || 'development', folder, '');
      apiKeys = [
        env.GEMINI_API_KEY, env.GEMINI_API_KEY_2, env.GEMINI_API_KEY_3, env.GEMINI_API_KEY_4, 
        env.GEMINI_API_KEY_5, env.GEMINI_API_KEY_6, env.GEMINI_API_KEY_7, env.GEMINI_API_KEY_8, 
        env.GEMINI_API_KEY_9, env.GEMINI_API_KEY_10, env.GEMINI_API_KEY_11, env.GEMINI_API_KEY_12, 
        env.GEMINI_API_KEY_13, env.GEMINI_API_KEY_14, process.env.GEMINI_API_KEY
      ].filter(Boolean) as string[];
    },
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url === '/api/gemini-proxy' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => body += chunk);
          req.on('end', async () => {
            try {
              const { system, prompt } = JSON.parse(body);
              let lastError = "";

              const configs = [
                { model: "gemini-2.0-flash", v: "v1beta" },
                { model: "gemini-1.5-flash", v: "v1beta" },
                { model: "gemini-1.5-flash-latest", v: "v1beta" },
                { model: "gemini-1.5-pro", v: "v1beta" },
                { model: "gemini-1.5-pro-latest", v: "v1beta" },
                { model: "gemini-1.5-flash", v: "v1" }
              ];

              if (apiKeys.length === 0) {
                throw new Error("No se encontraron GEMINI_API_KEY en el entorno.");
              }

              for (const config of configs) {
                for (const apiKey of apiKeys) {
                  try {
                    const url = `https://generativelanguage.googleapis.com/${config.v}/models/${config.model}:generateContent?key=${apiKey}`;
                    
                    const payload: any = {
                      contents: [{ parts: [{ text: prompt }] }],
                      generationConfig: { 
                        temperature: 0.2, 
                        maxOutputTokens: 2048,
                        topP: 0.8,
                        topK: 40
                      },
                      safetySettings: [
                        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                      ]
                    };

                    if (config.v === 'v1beta' && system) {
                      payload.system_instruction = { parts: [{ text: system }] };
                    } else if (system) {
                      payload.contents[0].parts[0].text = `SYSTEM INSTRUCTIONS:\n${system}\n\nUSER PROMPT:\n${prompt}`;
                    }

                    const response = await fetch(url, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload)
                    });

                    const data = await response.json();
                    
                    if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
                      res.statusCode = 200;
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify(data));
                      return;
                    }

                    // Log para debug (aparece en la terminal del server)
                    if (!response.ok) {
                      console.warn(`[Gemini Proxy] Falló ${config.model} (${config.v}):`, data.error?.message || response.statusText);
                    } else if (data.promptFeedback?.blockReason) {
                      console.warn(`[Gemini Proxy] Bloqueado por seguridad: ${data.promptFeedback.blockReason}`);
                    }

                    lastError = data.error?.message || (data.promptFeedback?.blockReason ? `Bloqueado: ${data.promptFeedback.blockReason}` : JSON.stringify(data.error)) || "Respuesta vacía o sin candidatos";
                  } catch (e: any) { 
                    lastError = e.message;
                    console.error(`[Gemini Proxy] Error fatal en intento:`, e.message);
                  }
                }
              }

              // Fallback a GROQ si falla Gemini
              const env = loadEnv('development', process.cwd(), '');
              if (env.GROQ_API_KEY) {
                try {
                  const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                      "Authorization": `Bearer ${env.GROQ_API_KEY}`,
                      "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                      model: "llama-3.3-70b-versatile",
                      messages: [
                        { role: "system", content: system },
                        { role: "user", content: prompt }
                      ],
                      temperature: 0.2
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
                  lastError = groqData.error?.message || "Error en Groq fallback";
                } catch (e: any) { lastError = e.message; }
              }

              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: `No se pudo obtener respuesta de ninguna IA. Último error: ${lastError}` }));
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
  };
};

const processAudioPlugin = () => ({
  name: 'process-audio',
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      if (req.url === '/api/process-audio' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const { fileName, segments } = JSON.parse(body);
            const rootDir = process.cwd();
            const targetDir = path.resolve(rootDir, 'audios_Ara');
            const sourceFile = path.join(targetDir, fileName);

            if (!fs.existsSync(sourceFile)) {
              throw new Error(`No se encontró el audio original: ${fileName} en ${targetDir}`);
            }

            // Extraer ID de la noticia del nombre del archivo (ej: "noticia 1_1.mp3" -> "1")
            const noticiaIdMatch = fileName.match(/noticia (\d+)/i);
            const noticiaId = noticiaIdMatch ? noticiaIdMatch[1] : 'X';

            const segmentosDir = path.resolve(targetDir, 'SEGMENTOS');
            if (!fs.existsSync(segmentosDir)) {
              fs.mkdirSync(segmentosDir, { recursive: true });
            }

            console.log(`[FFMPEG] Procesando ${segments.length} segmentos para Noticia ${noticiaId} en ${segmentosDir}`);

            // Procesar cada segmento
            const promises = segments.map((seg: any, idx: number) => {
                return new Promise((resolve, reject) => {
                    const outputName = `NOT${noticiaId}_SEG${idx + 1}.mp3`;
                    const outputPath = path.join(segmentosDir, outputName);
                    
                    ffmpeg(sourceFile)
                        .setStartTime(seg.start)
                        .setDuration(seg.end - seg.start)
                        .output(outputPath)
                        .on('end', () => {
                            console.log(`[FFMPEG] Creado: ${outputName}`);
                            resolve(outputName);
                        })
                        .on('error', (err) => {
                            console.error(`[FFMPEG] Error en ${outputName}:`, err);
                            reject(err);
                        })
                        .run();
                });
            });

            await Promise.all(promises);

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, count: segments.length }));
          } catch (err: any) {
            console.error("Error al procesar audio:", err);
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

const serveAudiosPlugin = () => ({
  name: 'serve-audios',
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      const url = req.url || '';
      if (url.startsWith('/audios/')) {
        try {
          const rootDir = process.cwd();
          const targetDir = path.resolve(rootDir, 'audios_Ara');
          const urlPath = new URL(url, 'http://localhost').pathname;
          const fileName = decodeURIComponent(urlPath.slice(8));
          const filePath = path.join(targetDir, fileName);
          
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            const mimeMap: Record<string, string> = {
              '.mp3': 'audio/mpeg',
              '.wav': 'audio/wav',
              '.m4a': 'audio/mp4',
              '.ogg': 'audio/ogg'
            };
            res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Access-Control-Allow-Origin', '*'); 
            fs.createReadStream(filePath).pipe(res);
            return;
          }
        } catch (e) {
          console.error("Audio Serve Error:", e);
        }
      }
      next();
    });
  }
});

const serveVestuarioPlugin = () => ({
  name: 'serve-vestuario',
  configureServer(server: any) {
    const EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
    server.middlewares.use((req: any, res: any, next: any) => {
      if (req.url === '/api/abrir-carpeta' && req.method === 'POST') {
        let body = '';
        req.on('data', (c: any) => body += c);
        req.on('end', () => {
          try {
            const { location } = JSON.parse(body) as { location: 'estudio' | 'exteriores' };
            const prefix = location === 'estudio' ? 'vestuario_estudio%2F' : 'vestuario_exteriores%2F';
            const url = `https://dash.cloudflare.com/${R2_ACCOUNT_ID}/r2/default/buckets/${R2_BUCKET_NAME}/objects?prefix=${prefix}`;
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, redirectUrl: url }));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }
      if (req.url?.startsWith('/api/vestuario-paths') && req.method === 'GET') {
        try {
          const loc = new URL(req.url, 'http://localhost').searchParams.get('location') ?? 'estudio';
          const targetPrefix = loc === 'estudio' ? 'vestuario_de_hoy_estudio/' : 'vestuario_de_hoy_exteriores/';
          const paths: string[] = [];
          for (let i = 1; i <= 30; i++) {
            paths.push(`https://media.saladillovivo.com.ar/${targetPrefix}${String(i).padStart(2, '0')}.png`);
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
        req.on('end', async () => {
          try {
            const { location } = JSON.parse(body) as { location: 'estudio' | 'exteriores' };
            const sourcePrefix = location === 'estudio' ? 'vestuario_estudio/' : 'vestuario_exteriores/';
            const targetPrefix = location === 'estudio' ? 'vestuario_de_hoy_estudio/' : 'vestuario_de_hoy_exteriores/';
            
            // 1. Elegir una foto al azar de sourcePrefix
            const listCmd = new ListObjectsV2Command({ Bucket: R2_BUCKET_NAME, Prefix: sourcePrefix });
            const listed = await r2Client.send(listCmd);
            const imagenes = (listed.Contents || []).filter(item => item.Key && !item.Key.endsWith('/'));
            if (imagenes.length === 0) throw new Error('No hay imágenes en la carpeta fuente en R2');
            
            // (Solo leer de R2, las copias van directo a LOCAL)
            const elegida = imagenes[Math.floor(Math.random() * imagenes.length)].Key!;
            
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            
            // --- FUNCIONALIDAD CARPETA LOCAL EXCLUSIVA ---
            // Limpiar la carpeta local primero
            const localTargetDir = path.resolve(__dirname, targetPrefix.replace('/', ''));
            if (!fs.existsSync(localTargetDir)) {
               fs.mkdirSync(localTargetDir, { recursive: true });
            } else {
               const files = fs.readdirSync(localTargetDir);
               for (const f of files) {
                  fs.unlinkSync(path.join(localTargetDir, f));
               }
            }
            
            // Descargar la imagen elegida de R2 (es de dominio público), codificando la URL para evitar errores con espacios
            const encodeKey = elegida.split('/').map(segment => encodeURIComponent(segment)).join('/');
            const publicUrl = `https://media.saladillovivo.com.ar/${encodeKey}`;
            
            const imgRes = await fetch(publicUrl);
            if (!imgRes.ok) throw new Error(`Fallo al descargar la imagen de R2 desde ${publicUrl} (Status: ${imgRes.status})`);
            
            const imgBuffer = await imgRes.arrayBuffer();
            const nodeBuffer = Buffer.from(imgBuffer);
            
            // Guardar en la carpeta local las 30 copias y REFERENCE_IMAGE.PNG
            fs.writeFileSync(path.join(localTargetDir, 'REFERENCE_IMAGE.PNG'), nodeBuffer);
            for (let i = 1; i <= 30; i++) {
               fs.writeFileSync(path.join(localTargetDir, `${String(i).padStart(2, '0')}.png`), nodeBuffer);
            }
            console.log(`[Vestuario API Local] Imagen ${elegida} sincronizada en R2 y copiada a local ${localTargetDir}`);
            // ------------------------------------------

            res.end(JSON.stringify({ success: true, elegida }));
          } catch (err: any) {
            console.error("Error al rotar vestuario en R2:", err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }
      if (req.url && (req.url.startsWith('/vestuario_de_hoy_estudio/') || req.url.startsWith('/vestuario_de_hoy_exteriores/'))) {
        try {
          const rootDir = process.cwd();
          const routeParts = req.url.split('?')[0].split('/');
          const dirName = routeParts[1]; // vestuario_de_hoy_estudio o exteriores
          const fileName = decodeURIComponent(routeParts[2]);
          const targetDir = path.resolve(rootDir, dirName);
          const filePath = path.join(targetDir, fileName);
          
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            const mimeMap: Record<string, string> = {
              '.png': 'image/png',
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.webp': 'image/webp'
            };
            res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Access-Control-Allow-Origin', '*'); 
            fs.createReadStream(filePath).pipe(res);
            return;
          }
        } catch (e) {
          console.error("Local Vestuario Serve Error:", e);
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
        ignored: [
          '**/noticias.txt', 
          '**/vestuario_de_hoy_estudio/**', 
          '**/vestuario_de_hoy_exteriores/**'
        ]
      }
    },
    plugins: [
      react(), 
      listAudiosPlugin(), 
      diccionarioFoneticoPlugin(), 
      saveNoticiasPlugin(), 
      saveAudioPlugin(), 
      serveAudiosPlugin(),
      processAudioPlugin(),
      serveVestuarioPlugin(), 
      geminiProxyPlugin(), 
      claudeProxyPlugin()
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GOOGLE_TTS_API_KEY': JSON.stringify(env.GOOGLE_TTS_API_KEY),
      'process.env.GEMINI_API_KEY_2': JSON.stringify(env.GEMINI_API_KEY_2),
      'process.env.GEMINI_API_KEY_3': JSON.stringify(env.GEMINI_API_KEY_3),
      'process.env.GEMINI_API_KEY_4': JSON.stringify(env.GEMINI_API_KEY_4),
      'process.env.GEMINI_API_KEY_5': JSON.stringify(env.GEMINI_API_KEY_5),
      'process.env.GEMINI_API_KEY_6': JSON.stringify(env.GEMINI_API_KEY_6),
      'process.env.GEMINI_API_KEY_7': JSON.stringify(env.GEMINI_API_KEY_7),
      'process.env.GEMINI_API_KEY_8': JSON.stringify(env.GEMINI_API_KEY_8),
      'process.env.GEMINI_API_KEY_9': JSON.stringify(env.GEMINI_API_KEY_9),
      'process.env.GEMINI_API_KEY_10': JSON.stringify(env.GEMINI_API_KEY_10),
      'process.env.GEMINI_API_KEY_11': JSON.stringify(env.GEMINI_API_KEY_11),
      'process.env.GEMINI_API_KEY_12': JSON.stringify(env.GEMINI_API_KEY_12),
      'process.env.GEMINI_API_KEY_13': JSON.stringify(env.GEMINI_API_KEY_13),
      'process.env.GEMINI_API_KEY_14': JSON.stringify(env.GEMINI_API_KEY_14)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
