#!/usr/bin/env node
/**
 * daily_vestuario_estudio.mjs
 * Selecciona UNA imagen aleatoria de cada carpeta fuente y la copia
 * a la carpeta de destino correspondiente como REFERENCE_IMAGE.PNG + 30 copias.
 * Se ejecuta una vez por día — lock por carpeta destino.
 *
 * Uso:
 *   node scripts/daily_vestuario_estudio.mjs
 *   npm run vestuario
 */

import { readFileSync, writeFileSync, readdirSync, copyFileSync, rmSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const today = new Date().toISOString().slice(0, 10); // "yyyy-MM-dd"

/** Pares fuente → destino a procesar */
const PARES = [
    { source: 'vestuario_estudio', target: 'vestuario_de_hoy_estudio' },
    { source: 'vestuario_exteriores', target: 'vestuario_de_hoy_exteriores' },
];

function procesarPar(sourceDir, targetDir) {
    const lockFile = join(targetDir, '.last_update');
    const label = `[${sourceDir} → ${targetDir}]`;

    console.log(`[Script desactivado] Ya no procesamos el par ${targetDir}`);
}

// Procesar todos los pares
for (const { source, target } of PARES) {
    procesarPar(join(ROOT, source), join(ROOT, target));
}
console.log("Desactivada la rotación diaria de vestuario por petición.");
