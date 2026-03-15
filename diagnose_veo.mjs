import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

// Cargar Key 11
const envContent = fs.readFileSync('.env.local', 'utf8');
const match = envContent.match(/GEMINI_API_KEY_11=(?:¨|"|')(.*)(?:¨|"|')/);
const apiKey = match ? match[1] : '';

if (!apiKey) {
    console.error('Clave 11 no encontrada.');
    process.exit(1);
}

const client = new GoogleGenAI({ apiKey });

async function diagnose() {
    try {
        const result = await client.models.list();
        const modelsArray = Array.isArray(result) ? result : (result.models || []);
        
        console.log('--- DIAGNÓSTICO COMPLETO ---');
        console.log('Cantidad de modelos:', modelsArray.length);
        if (modelsArray.length === 0) {
            console.log('RESULTADO BRUTO:', JSON.stringify(result, null, 2));
        }

        modelsArray.forEach(m => {
            if (m.name.toLowerCase().includes('veo')) {
                console.log(`\nModelo: ${m.name}`);
                console.log(`Methods: ${JSON.stringify(m.supportedMethods || m.supportedActions || [])}`);
            }
        });
    } catch (e) {
        console.error('Error en diagnóstico:', e);
    }
}

diagnose();
