import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { redactarConHermes } from '../services/hermesService';

const SUPABASE_URL = 'https://otwvfihzaznyjvjtkvvd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90d3ZmaWh6YXpueWp2anRrdnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxMDQ3OTAsImV4cCI6MjA2MDY4MDc5MH0.YbKdivZM6gJCdXAf51Xctn8IpKhQCrMch89NoHwP0Z4';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { idNoticia, accion, feedback, textoCrudo, textoActual } = req.body;

        if (!idNoticia || !accion) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        if (accion === 'CORREGIR') {
            const nuevoTexto = await redactarConHermes(textoCrudo, feedback);
            return res.status(200).json({ success: true, nuevoTexto });
        }

        if (accion === 'APROBAR') {
            const pronPath = path.join(process.cwd(), 'pronunciacion.json');
            let pronunciacionData = { reemplazos: [] as { original: string, fonetico: string }[] };
            
            if (fs.existsSync(pronPath)) {
                pronunciacionData = JSON.parse(fs.readFileSync(pronPath, 'utf8'));
            }

            let textoFonetico = textoActual || '';
            for (const item of pronunciacionData.reemplazos) {
                // Regex para palabra exacta usando boundary \b, respetando mayúsculas/minúsculas según el reemplazo original
                const regex = new RegExp(`\\b${item.original}\\b`, 'g');
                textoFonetico = textoFonetico.replace(regex, item.fonetico);
            }

            // Actualizamos en base de datos
            const { error: updErr } = await supabase.from('articles').update({
                body_voice_tuning: textoFonetico,
                status: 'published'
            }).eq('id', idNoticia);

            if (updErr) throw updErr;

            // Iniciamos de forma asíncrona (sin bloquear la respuesta) el pipeline para audio y video
            const protocol = req.headers['x-forwarded-proto'] || 'https';
            const host = req.headers.host;
            const baseUrl = `${protocol}://${host}`;

            fetch(`${baseUrl}/api/news-pipeline`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'audio', ids: [idNoticia], secret: 'sv-cron-2024' })
            }).then(() => {
                fetch(`${baseUrl}/api/news-pipeline`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'slide', ids: [idNoticia], secret: 'sv-cron-2024' })
                }).catch(console.error);
            }).catch(console.error);

            return res.status(200).json({ success: true, message: 'Aprobado, fonética aplicada y pipeline iniciado' });
        }

        return res.status(400).json({ error: 'Acción inválida' });
    } catch (e: any) {
        console.error('Error procesando noticia:', e.message);
        return res.status(500).json({ error: e.message });
    }
}
