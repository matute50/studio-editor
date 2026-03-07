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

    // 1. Verificar si ya se ejecutó hoy
    if (existsSync(lockFile)) {
        const lastRun = readFileSync(lockFile, 'utf8').trim();
        if (lastRun === today) {
            const files = readdirSync(targetDir).filter(f => f !== '.last_update');
            console.log(`${label} Ya actualizado hoy (${today}). Actual: ${files[0] ?? 'ninguno'}`);
            return;
        }
    }

    // 2. Obtener imágenes disponibles
    let imagenes;
    try {
        imagenes = readdirSync(sourceDir).filter(f =>
            EXTENSIONS.has(f.slice(f.lastIndexOf('.')).toLowerCase())
        );
    } catch {
        console.error(`${label} [ERROR] No se pudo leer: ${sourceDir}`);
        return;
    }

    if (imagenes.length === 0) {
        console.error(`${label} [ERROR] No hay imágenes en: ${sourceDir}`);
        return;
    }

    // 3. Selección aleatoria
    const elegida = imagenes[Math.floor(Math.random() * imagenes.length)];
    console.log(`${label} Imagen elegida: ${elegida}`);

    // 4. Limpiar destino (excepto lock) y copiar
    mkdirSync(targetDir, { recursive: true });
    for (const f of readdirSync(targetDir)) {
        if (f !== '.last_update') rmSync(join(targetDir, f), { force: true });
    }

    // REFERENCE_IMAGE.PNG
    const dest = join(targetDir, 'REFERENCE_IMAGE.PNG');
    copyFileSync(join(sourceDir, elegida), dest);

    // 30 copias numeradas: 01.png … 30.png
    for (let i = 1; i <= 30; i++) {
        const num = String(i).padStart(2, '0');
        copyFileSync(join(sourceDir, elegida), join(targetDir, `${num}.png`));
    }

    // 5. Guardar fecha de ejecución
    writeFileSync(lockFile, today, 'utf8');

    console.log(`${label} [OK] Destino: ${dest} | Fecha: ${today}`);
}

// Procesar todos los pares
for (const { source, target } of PARES) {
    procesarPar(join(ROOT, source), join(ROOT, target));
}
