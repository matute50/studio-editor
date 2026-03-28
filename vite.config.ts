import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import ffmpeg from 'fluent-ffmpeg';
import { S3Client, ListObjectsV2Command, CopyObjectCommand, DeleteObjectsCommand, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

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
        try {
          const listCmd = new ListObjectsV2Command({ Bucket: R2_BUCKET_NAME, Prefix: 'audios_Ara/' });
          const listed = await r2Client.send(listCmd);
          const audios = (listed.Contents || [])
              .map(item => item.Key?.replace('audios_Ara/', ''))
              .filter(key => key && (key.endsWith('.mp3') || key.endsWith('.wav')));
          
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ audios }));
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      } else if (req.url?.startsWith('/api/delete-audio') && req.method === 'DELETE') {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const fileName = url.searchParams.get('fileName');
        
        if (!fileName) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Falta fileName' }));
          return;
        }

        try {
          await r2Client.send(new DeleteObjectsCommand({
            Bucket: R2_BUCKET_NAME,
            Delete: { Objects: [{ Key: `audios_Ara/${fileName}` }] }
          }));
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
        const targetPrefix = 'audios_Ara/';
        
        if (req.method === 'GET') {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const fileName = url.searchParams.get('fileName');
          
          if (!fileName) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Falta fileName' }));
            return;
          }

          try {
            await r2Client.send(new HeadObjectCommand({ 
              Bucket: R2_BUCKET_NAME, 
              Key: `${targetPrefix}${fileName}` 
            }));
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ exists: true }));
          } catch (err: any) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ exists: false }));
          }
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => body += chunk);
          req.on('end', async () => {
            try {
              const { fileName, audioBase64 } = JSON.parse(body);
              const buffer = Buffer.from(audioBase64, 'base64');
              await r2Client.send(new PutObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: `${targetPrefix}${fileName}`,
                Body: buffer,
                ContentType: fileName.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg'
              }));
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
        req.on('end', async () => {
          try {
            const { content } = JSON.parse(body);
            await r2Client.send(new PutObjectCommand({
              Bucket: R2_BUCKET_NAME,
              Key: `noticias.txt`,
              Body: content,
              ContentType: 'text/plain; charset=utf-8'
            }));
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
  enforce: 'pre' as const,
  configureServer(server: any) {
    const EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
    server.middlewares.use((req: any, res: any, next: any) => {
      if (req.url === '/api/abrir-carpeta' && req.method === 'POST') {
        let body = '';
        req.on('data', (c: any) => body += c);
        req.on('end', () => {
          try {
            const { location } = JSON.parse(body) as { location: 'estudio' | 'exteriores' };
            const folderName = location === 'estudio' ? 'vestuario_de_hoy_estudio' : 'vestuario_de_hoy_exteriores';
            const targetPath = path.resolve(__dirname, folderName);
            if (!fs.existsSync(targetPath)) {
                fs.mkdirSync(targetPath, { recursive: true });
            }
            exec(`explorer.exe "${targetPath}"`, (error) => {
              if (error) {
                console.error(`Error abriendo explorador de archivos: ${error}`);
              }
            });
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
      next();
    });
  }
});

const listBackgroundsPlugin = () => ({
  name: 'list-backgrounds',
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      if (req.url?.startsWith('/api/list-backgrounds') && req.method === 'GET') {
        try {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const folder = url.searchParams.get('folder');
          if (!folder) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Folder parameter is required' }));
            return;
          }

          const listCmd = new ListObjectsV2Command({ 
            Bucket: R2_BUCKET_NAME, 
            Prefix: `${folder}/` 
          });

          const listed = await r2Client.send(listCmd);
          const backgrounds = (listed.Contents || [])
            .filter(item => item.Key && !item.Key.endsWith('/'))
            .map(item => ({
              key: item.Key,
              url: `https://media.saladillovivo.com.ar/${item.Key}`,
              name: item.Key?.split('/').pop()
            }));

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ backgrounds }));
        } catch (err: any) {
          console.error("Error en list-backgrounds:", err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      } else {
        next();
      }
    });
  }
});

const cambiarVestuarioPlugin = () => ({
  name: 'cambiar-vestuario',
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      if (req.url === '/api/cambiar-vestuario' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, message: "Acción diaria de vestuario deshabilitada.", image: "N/A" }));
          } catch (err: any) {
            console.error("Error en cambiar-vestuario:", err);
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

const scrapeNewsPlugin = () => ({
  name: 'scrape-news',
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      if (req.url === '/api/scrape-news' && req.method === 'POST') {
        try {
          // Reutilizamos la lógica del scraper (versión simplificada para el plugin)
          const FEEDS = [
            { name: 'Ahora Saladillo', url: 'https://ahorasaladillo-diariodigital.com.ar/feed/' },
            { name: 'ABC Saladillo', url: 'https://www.abcsaladillo.com.ar/feed/' },
            { name: 'Info Saladillo', url: 'https://infosaladillo.com.ar/feed/' }
          ];

          const extractTag = (xml: string, tag: string) => {
            const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i');
            const match = xml.match(regex);
            if (!match) return '';
            let content = match[1];
            content = content.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
            return content.trim();
          };


          const toAbsoluteUrl = (url: string, baseUrl: string) => {
            try {
              if (!url) return '';
              if (url.startsWith('http')) return url;
              return new URL(url, baseUrl).href;
            } catch (e) { return url; }
          };

          const extractAllImages = (html: string, baseUrl: string): string[] => {
            const found = new Set<string>();
            const imgTagRegex = /<img\s+([^>]+)>/gi;
            let m;
            while ((m = imgTagRegex.exec(html)) !== null) {
              const attrs = m[1];
              const srcAttrRegex = /(?:src|data-src|data-lazy-src|data-original|srcset)\s*=\s*(?:["']([^"'>]+)["']|([^ >]+))/gi;
              let attrMatch;
              while ((attrMatch = srcAttrRegex.exec(attrs)) !== null) {
                const val = attrMatch[1] || attrMatch[2];
                if (!val) continue;
                const attrName = attrMatch[0].split('=')[0].toLowerCase().trim();
                if (attrName.includes('srcset')) {
                  const parts = val.split(',').map(p => p.trim().split(' ')[0]);
                  parts.forEach(p => { if (p) { const abs = toAbsoluteUrl(p, baseUrl); if (abs) found.add(abs); } });
                } else {
                  const abs = toAbsoluteUrl(val, baseUrl);
                  if (abs) found.add(abs);
                }
              }
            }
            const junk = ['avatar', 'logo', 'favicon', 'smiley', 'emoji', 'icon', 's.w.org', 'banner', 'ads', 'publi', 'fb-share', 'wp-content/themes', 'wp-content/plugins', 'gravatar', 'pixel', 'loading', 'placeholder', 'blank', 'transparent', 'sidebar', 'footer', 'widget', 'social'];
            const isTinyThumbnail = /-(80x80|150x150|32x32|16x16)\.(?:webp|jpg|png|jpeg|avif|gif)$/i;
            return Array.from(found).filter(absUrl => {
              const lower = absUrl.toLowerCase();
              if (!/\.(jpg|jpeg|png|webp|avif|gif)(?:\?.*)?$/i.test(absUrl)) return false;
              if (junk.some(j => lower.includes(j)) && !lower.includes('post')) return false;
              if (isTinyThumbnail.test(absUrl)) return false;
              return true;
            });
          };

          const fetchWithTimeout = async (url: string, options = {}) => {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 15000);
            try {
              const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
                  'Cache-Control': 'no-cache',
                  ...((options as any).headers || {})
                }
              });
              clearTimeout(id);
              return response;
            } catch (e) { clearTimeout(id); throw e; }
          };

          const fetchAllPageImages = async (url: string) => {
            try {
              const resp = await fetchWithTimeout(url);
              if (!resp.ok) return [];
              const html = await resp.text();
              const found = new Set<string>();

              const metaRegex = /<(?:meta\s+[^>]*property=["']og:image["']\s+content=["']([^"'>]+)["']|meta\s+[^>]*name=["']twitter:image["']\s+content=["']([^"'>]+)["'])>/gi;
              let m;
              while ((m = metaRegex.exec(html)) !== null) { 
                const urlMatch = m[1] || m[2];
                if (urlMatch) found.add(toAbsoluteUrl(urlMatch.trim(), url)); 
              }

              const articleStart = html.match(/<(article|main)|class=['"][^"']*(?:entry-content|post-content|article-content|content)[^"']*["']/i);
              let searchBody = html;
              if (articleStart && articleStart.index !== undefined) {
                 searchBody = html.substring(articleStart.index);
              }
              const truncated = searchBody.split(/id=['"](?:related|comments|footer|sidebar)['"]|class=['"](?:td-post-sharing|related|comments|footer|sidebar|shared-blocks|tags-links)['"]|Related Tags:|Relacionados:/i)[0];

              extractAllImages(truncated, url).forEach(img => found.add(img));
              return Array.from(found);
            } catch (e) { return []; }
          };

          console.log("[Vite Scraper] Iniciando escaneo...");
          const results = [];

          for (const feed of FEEDS) {
            try {
              const response = await fetchWithTimeout(feed.url);
              if (!response.ok) continue;
              const xml = await response.text();
              const items = xml.split(/<item[\s>]/i).slice(1);
              console.log(`[Vite Scraper] ${feed.name}: ${items.length} items encontrados.`);
              
              for (const itemXml of items) {
                const title = extractTag(itemXml, 'title');
                const link = extractTag(itemXml, 'link');
                const description = extractTag(itemXml, 'description');
                const contentEncoded = extractTag(itemXml, 'content:encoded') || description;
                if (title && link) {
                  const pageImages = await fetchAllPageImages(link);
                  const allCombined = Array.from(new Set([
                    ...extractAllImages(itemXml, link),
                    ...extractAllImages(contentEncoded, link),
                    ...pageImages
                  ]));
                  if (allCombined.length > 0) {
                    results.push({
                      title: title.slice(0, 255),
                      text: description.replace(/<[^>]*>?/gm, '').substring(0, 2000),
                      source_url: link,
                      image_url: allCombined[0],
                      images_url: allCombined.slice(0, 8),
                      status: 'nuevo'
                    });
                  }
                }
              }
            } catch (err: any) {
              console.error(`[Vite Scraper] Error en ${feed.name}:`, err.message);
            }
          }

          const SUPABASE_URL = 'https://otwvfihzaznyjvjtkvvd.supabase.co';
          const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90d3ZmaWh6YXpueWp2anRrdnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxMDQ3OTAsImV4cCI6MjA2MDY4MDc5MH0.YbKdivZM6gJCdXAf51Xctn8IpKhQCrMch89NoHwP0Z4';
          
          if (results.length > 0) {
            await fetch(`${SUPABASE_URL}/rest/v1/articles_crudos`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Prefer': 'resolution=ignore-duplicates'
              },
              body: JSON.stringify(results)
            });

            const missingResp = await fetch(`${SUPABASE_URL}/rest/v1/articles_crudos?status=eq.nuevo`, {
              headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
            });
            const allNew = await missingResp.json();

            if (Array.isArray(allNew) && allNew.length > 0) {
              console.log(`[Vite Scraper] Re-analizando ${allNew.length} noticias para limpieza.`);
              for (const item of allNew) {
                const imgs = await fetchAllPageImages(item.source_url);
                if (imgs.length > 0) {
                  await fetch(`${SUPABASE_URL}/rest/v1/articles_crudos?id=eq.${item.id}`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      'apikey': SUPABASE_ANON_KEY,
                      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                    },
                    body: JSON.stringify({ image_url: imgs[0], images_url: imgs.slice(0, 8) })
                  });
                }
              }
            }
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, count: results.length }));
        } catch (err: any) {
          console.error("Error en local scraper:", err);
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      } else {
        next();
      }
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
      listBackgroundsPlugin(),
      cambiarVestuarioPlugin(),
      geminiProxyPlugin(), 
      claudeProxyPlugin(),
      scrapeNewsPlugin()
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
