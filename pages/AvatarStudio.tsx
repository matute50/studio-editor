import React, { useState, useEffect, useRef } from 'react';
import {
    Bot,
    Sparkles,
    MessageSquare,
    Send,
    RefreshCw,
    Download,
    Trash2,
    Settings,
    ChevronDown,
    Plus,
    Volume2,
    X,
    Play,
    Video,
    Monitor,
    Camera,
    Layout,
    Check,
    Pause,
    Scissors,
    Clock,
    User,
    Upload,
    Smartphone,
    Search,
    Wand2,
    ChevronUp,
    FolderOpen
} from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import { supabase } from '../services/supabase';
import { Article as BaseArticle } from '../types';
import { newsService } from '../services/newsService';

interface Article extends BaseArticle {
    confirmed?: boolean;
    mood?: MoodType;
    moodOverride?: boolean;
}

interface LocalNews {
    id: string;
    script: string;
    mood: MoodType;
    confirmed: boolean;
    priority: boolean;
    moodOverride?: boolean;
}

const MOODS = ['SOLEMNE', 'URGENTE', 'ALEGRE', 'TRISTE'] as const;
type MoodType = (typeof MOODS)[number];
import { improveScriptWithGemini } from '../services/claude';
import { generateAvatarVideo, optimizeBodyForAudio, adaptarTextoArgentino, translateActionToEnglish } from '../services/gemini';
import saludoTxt from '../saludo.txt?raw';
import ctaTxt from '../CTA.txt?raw';
import slogansTxt from '../slogans.txt?raw';

// CONSTANTES DE ESCENA Y PROMPTS
const BASE_IMAGE_PROMPT_PHASE_1 = `[FASE 1: CREACIÓN DE IDENTIDAD VISUAL - IMAGEN CANÓNICA]:
Ultra-detailed cinematic 8K portrait of Ara, a professional Argentine female news anchor, Latina appearance. She is sitting with a strict "inmovilidad poderosa" posture (firm, grounded, slight forward lean). She has a firm, authoritative expression with a subtle Duchenne protocol micro-expression involving only the orbicularis oculi (eye-corner contraction), lips closed in grado cero. Looking directly into the camera lens with intense, unbroken focus. 

"Realismo Agresivo" skin engine: Skin is distinctly realistic with visible pores (nose, cheeks), natural matte textures, subtle asymmetry, and subsurface scattering. NO plastic, wax, or CGI overly-perfect skin. Film grain and natural light imperfections induced. Hair: soft curls, shoulder-length, side-swept. Makeup: warm pink lips, natural glowy skin, defined eyelashes. Attire: Forest green blazer over an ivory blouse with a subtle pattern, dark pants. 

Camera & Lighting: Captured with ARRI Alexa 35, 85mm lens, f/1.8, shallow depth of field, high shutter speed (no motion blur). 3-point soft diffused warm lighting, key light 45° left, rim light separating the silhouette. Studio background (or Chroma Green), high contrast, documentary broadcast feel. No watermarks.`;

const MASTER_CONSISTENCY_LOCK = `[FASE 2: ANIMACIÓN Y LIP SYNC AVANZADO]
Using the canonical reference image, generate a seamless, morph-free cinematic video of Ara speaking directly to the lens in professional Argentine Rioplatense Spanish (Saladillo/Buenos Aires dialect).
LOCK CONSISTENCY: 100% visual fidelity. Zero style drift, zero hue shift on blazer, zero lighting change. No robotic stares. Continuous elastic speech wave with anticipated coarticulation.`;

const STILLNESS_CONTAINMENT = `[STILLNESS & CONTAINMENT — BROADCAST AUTHORITY]:
ISER "Inmovilidad Poderosa" rules: absolute torso stillness, micro-movements limited to natural physiological breathing (without nostril flare) and eye blinks.

[SMILE & TONGUE PROTOCOL]:
Sonrisa permitida SOLO como micro-expresión ≤15% (solo comisuras, labios cerrados, dientes NUNCA visibles). Calor se transmite por ojos.

DENTAL BARRIER PROTOCOL — ALVEODENTALS:
Alveodentals (T/D/S): Tongue remains strictly behind the dental barrier; tongue tip never visible externally.`;

const HUMAN_IMPERFECTION = `[HUMAN IMPERFECTION PROTOCOL]:
"Realismo Agresivo" skin engine: Skin is distinctly realistic with visible pores (nose, cheeks), natural matte textures, subtle asymmetry, and subsurface scattering. NO plastic, wax, or CGI overly-perfect skin.`;

const PHONETIC_ENGINE_V5_0 = `[LIP SYNC — SISTEMA FONÉTICO RIOPLATENSE v5.0 — BIOMECÁNICO COMPLETO]

LIP SYNC PRIORITY MAXIMUM (LatentSync 1.6 logic): High-precision viseme generation optimized for complete biomechanics. If any conflict exists between lip sync and any other instruction — lip sync wins.

LANGUAGE OVERRIDE — MANDATORY: This script is in Argentine Spanish — Rioplatense dialect, Saladillo/Buenos Aires. ALL lip sync, mouth movements and phonetic production must match Argentine Spanish phonology exclusively.

ABSOLUTE VERBATIM MODE: Read the script text EXACTLY as written, word for word, character for character. DO NOT hallucinate words, names or phrases.

MANDIBULAR EXPRESSION CALIBRATION:
Guidance scale 1.0-1.5 on final voseo verb syllables.
Natural jaw movement — never exaggerated.

SHEÍSMO AUDIO DRIVER PROTOCOL:
Yeísmo Rehilado: Lips must exhibit distinct forward protrusion and tight rectangular friction for [ʃ] sounds (all 'LL' and 'Y' phonemes). In the script, all LL and Y phonemes are acoustically driven as /ʃ/ — SSH sound (triple S for maximum friction).

VISEMA 2 — GLOTAL /h/ (S ASPIRADA): 
S-Aspirada: Teeth remain separated and mouth relaxes at syllable endings for aspirated 'S'.

VISEMA 7 — BILABIALES /p/, /b/, /m/: 
Plosives & Nasals: Absolute full lip seal for P/B/M. ZERO cheek inflation during nasals.

[SSML BREATH PAUSE PROTOCOL]:
250ms (0.25s) strictly calibrated micro-pauses at commas with no lip seal loss. Descending tonemes at the end of every sentence.`;

const SCRIPT_FIDELITY = `[SCRIPT FIDELITY — LEY ABSOLUTA]:
Leer exactamente lo escrito, en orden exacto. Prohibido: fillers, sinónimos, reordenar, resumir, improvisar. Cero tolerancia a desviaciones.`;

const TEMPORAL_ANCHOR_PROTOCOL = `[TEMPORAL ANCHOR PROTOCOL]:
The video must start and end with at least 2 frames identical to the reference image. All gestures and facial expressions must begin from the exact state of the reference image and revert back to that identical state after the speech is completed.`;

const AUDIO_STYLE = `[AUDIO_STYLE]:
Rioplatense nativo (Saladillo/Buenos Aires). Entonación profesional neutra, calibrada a mood solemne. Dicción clara (Rate -5%).`;

const NEGATIVE_PROMPT = `[NEGATIVE PROMPT]:\n--no text, logo, watermark, subtitles, lower thirds, ticker, ui, microphone, headset, cables, earpiece, melting hands, fused fingers, extra fingers, distorted hands, floating head, severed neck, mutating jewelry, green spill, green halo, shadows on background, gradient background, vignette, depth of field on background, unblinking, robot eyes, zombie stare, looking away, morphing, shoulder distortion, radioactive teeth, too many teeth, wrinkles aged, studio background generado, newsroom, 3D environment, bokeh excesivo, wall texture, floor, corners, horizon line, spotlight on background, furniture, decor, realistic room, brackets braces, metal in mouth, unnatural teeth, glowing teeth, exposed teeth at rest, gum distortion, plastic skin, wax skin, porcelain skin, over-smoothed skin, CGI skin, doll skin, synthetic skin, skin without pores, overly perfect skin, camera movement, zoom, push, pull, reframe, dolly, pan, tilt, turtle neck, forward head, hunched posture, visible breathing, chest rise, nostril flare, tongue visible, suggestive mouth, erotic mouth, adult content, seductive expression, shiny skin, glossy skin, specular highlights, oily skin, beauty filter, color shift on clothing, hue drift on blazer, outfit color inconsistency, smile showing teeth, wide smile, toothy grin, performative smile, theatrical happiness, mouth open for smile, lips parted for smile, separate background generation, replacing reference background, inventing background details, mechanical jaw movement, hinge jaw motion, frame by frame lip movement, discrete lip positions, no coarticulation, cheek inflation during nasals, hypernasality visible, dental closure on aspirated s, boca de goma, rubber mouth, synthetic lip movement, robotic mouth movement, lip sync mismatch, mouth ahead of audio, mouth behind audio, ascending final intonation, upward sentence ending, amateur delivery cadence, full bilabial closure on intervocalic b, full dental closure on intervocalic d, music, background music, soundtrack, animations, wipes, transitions, background animation`;

// ============================================================
// PROMPTS MAESTRO VEO 3.1 — ESTUDIO y EXTERIORES (CHROMA KEY)
// ============================================================

/** VEO 3.1 — MODO ESTUDIO */
const PROMPT_MAESTRO_VEO_ESTUDIO = (dialogo: string) => `Professional female news reporter, Ara, Argentinian from Buenos Aires. Maintain strong visual consistency with the reference image, preserving facial identity, hairstyle, wardrobe, and overall appearance.

Photorealistic, natural skin texture, realistic lighting, no artificial filters.

Calm, confident, and professional presence. Natural facial movement, subtle blinking, stable gaze.

Eye-level, locked-off medium shot. Clean and modern news studio background, identical to the reference image.

Centered composition, head and shoulders visible. Direct eye contact with camera.

Professional broadcast look, balanced lighting, neutral tones.

Speaks in Rioplatense Spanish (Buenos Aires accent). Natural, fluid speech with correct intonation and rhythm. Professional news delivery, warm and clear tone.

Clean studio audio, clear voice, no background noise.

She says:
"${dialogo}"

Avoid: robotic voice, exaggerated acting, Spain Spanish accent, lip sync errors, identity inconsistency, background changes, lighting flicker, blur, artificial skin, unnatural facial distortion.`;

/** VEO 3.1 — MODO EXTERIORES con CHROMA KEY */
const PROMPT_MAESTRO_VEO_EXTERIORES = (dialogo: string) => `Professional female news reporter, Ara, Argentinian from Buenos Aires. Maintain strong visual consistency with the reference image, preserving facial identity, hairstyle, wardrobe, and overall appearance.

Photorealistic, natural skin texture, realistic lighting, no artificial filters.

Calm, confident, and professional presence. Natural facial movement, subtle blinking, stable gaze.

Eye-level, locked-off medium shot. Green screen background, flat chroma green, evenly lit, no shadows.

Centered composition, head and shoulders visible. Reporter holding a microphone.

Natural outdoor reporting posture, direct eye contact.

Speaks in Rioplatense Spanish (Buenos Aires accent). Natural, fluid speech with correct intonation and rhythm. Professional news delivery, warm and clear tone.

Clean voice recording, no environmental noise.

She says:
"${dialogo}"

Avoid: robotic voice, exaggerated acting, Spain Spanish accent, lip sync errors, identity inconsistency, lighting flicker, blur, artificial skin, chroma shadows, background artifacts.`;

// Helper: devuelve el prompt VEO 3.1 correcto según el modo activo
const getPromptMaestroVEO = (modo: 'estudio' | 'exterior', dialogo: string) =>
    modo === 'exterior'
        ? PROMPT_MAESTRO_VEO_EXTERIORES(dialogo)
        : PROMPT_MAESTRO_VEO_ESTUDIO(dialogo);

// Mantenemos PROMPT_MAESTRO_SYSTEM como alias del de estudio para compatibilidad
const PROMPT_MAESTRO_SYSTEM = PROMPT_MAESTRO_VEO_ESTUDIO('Saladissho Vivo. La misma información, mejor contada. Visitános.');

const PROMPT_MAESTRO_GROK = `Hyper-photorealistic 8K exact match to reference image of Ara: identical facial bone structure, skin with visible pores and micro-wrinkles around eyes and mouth, natural fine peach fuzz/vello, realistic makeup, individual hair strands, lifelike eye reflections, clothing texture — zero deviation. Medium close-up waist-up shot, Ara looking DIRECTLY at camera with confident warm professional gaze conveying connection and sincerity. Captured mid-sentence actively speaking with wide open mouth: mouth extremely wide open mid-vowel articulation right now, lips clearly stretched and parted horizontally and vertically, upper and lower teeth prominently visible showing white, inner mouth cavity and tongue realistically positioned, no closed mouth, no sealed lips, no pursed lips, no neutral closed expression — strictly enforced wide open speaking mouth in fluent speech. Ara confident engaging Buenos Aires news anchor (TN/C5N style), saying: "{TEXTO_A_DECIR}" in authentic porteño rioplatense accent. Dynamic natural expressiveness prepared for animation: subtle authentic micro-expressions synced to speech tone, gentle eyebrow raise or furrow for emphasis, micro head tilt or nod for natural flow, lively sparkling eyes reflecting emotion and intelligence, subtle mouth corner curves, natural open-palm hand gestures synced to key words, restrained professional presenter style — no frozen face, no immobile features. Perfect porteño lip sync ready for animation: dynamic jaw drop on open vowels, lip protrusion and tension for yeísmo rehilado [sh/z], aspiration relaxed jaw on final /s/, sharp seseo, energetic realistic mouth dynamics. Broadcast studio realism: soft three-point lighting (key light left, fill right, subtle warm rim light), subsurface scattering skin, realistic lip gloss with wet inner lips and teeth visible, shallow depth of field sharp focus on face eyes mouth jaw and hands, captured as real news broadcast frame on Arri Alexa 65 with 85mm f/1.4 prime lens, accurate skin tones, maximum photorealism, no uncanny valley, fully prepared for facial animation and lip-sync. Vertical 9:16, --ar 9:16 --v 6 --stylize 15 --q 2 --style raw --chaos 0`;

// --- COMPONENTE PRINCIPAL ---
export function AvatarStudio() {
    // CONTEXTO Y ESTADOS
    const [workingMode, setWorkingMode] = useState<'estudio' | 'exterior'>('estudio');
    const [aiEngine, setAiEngine] = useState<'GROK' | 'VEO'>('VEO');
    const [audioList, setAudioList] = useState<string[]>([]);
    const [selectedAudios, setSelectedAudios] = useState<string[]>([]);
    const [activeAudio, setActiveAudio] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [segments, setSegments] = useState<{ id: string; start: number; end: number; duration: number }[]>([]);
    const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
    const [productionClips, setProductionClips] = useState<{ 
        id: string; 
        segmentIndex: number; 
        audioFile: string; 
        status: 'ready' | 'pending' | 'generating'; 
        prompt?: string;
        script?: string;
        videoUrl?: string;
        videoData?: string;
    }[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [productionStep, setProductionStep] = useState<number | null>(null);
    const [eta, setEta] = useState<number | null>(null);
    const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("9:16");
    const [toasts, setToasts] = useState<any[]>([]);
    const [articles, setArticles] = useState<Article[]>([]);
    const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null);
    const [sourceType, setSourceType] = useState<'AUDIO' | 'SUPABASE'>('SUPABASE');
    const [selectedSaludo, setSelectedSaludo] = useState('');
    const [selectedCTA, setSelectedCTA] = useState('');
    const [selectedSlogan, setSelectedSlogan] = useState('');

    const [extHorario, setExtHorario] = useState('MAÑANA');
    const [extClima, setExtClima] = useState('SOLEADO');
    const [extPosicionSol, setExtPosicionSol] = useState('Luz Frontal (Front Lighting)');
    const [extScript, setExtScript] = useState('');
    const [extSpeechOption, setExtSpeechOption] = useState('SOLO SPEECH');
    const [extAccion, setExtAccion] = useState('');
    const [extAccionEN, setExtAccionEN] = useState('');
    const [isTranslatingAction, setIsTranslatingAction] = useState(false);
    const [imageTimestamp, setImageTimestamp] = useState(Date.now());
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [isBgGalleryOpen, setIsBgGalleryOpen] = useState(false);
    const [bgList, setBgList] = useState<{key: string, url: string, name: string}[]>([]);
    const [bgFolderPath, setBgFolderPath] = useState('');
    const [selectedBg, setSelectedBg] = useState<string | null>(null);

    // Galería Vestuario - Lasso y Selección
    const [selectedVestuario, setSelectedVestuario] = useState<Set<string>>(new Set());
    const [lasso, setLasso] = useState({ x1: 0, y1: 0, x2: 0, y2: 0, isSelecting: false });
    const galleryRef = useRef<HTMLDivElement>(null);
    const initialLassoSelection = useRef<Set<string>>(new Set());

    const handleGalleryMouseDown = (e: React.MouseEvent) => {
        const el = e.target as HTMLElement;
        if (el.tagName === 'IMG' || el.tagName === 'BUTTON' || el.closest('button')) return;
        if (e.button !== 0) return; // Sólo botón izquierdo
        setLasso({ x1: e.clientX, y1: e.clientY, x2: e.clientX, y2: e.clientY, isSelecting: true });
        
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
            initialLassoSelection.current = new Set(selectedVestuario);
        } else {
            initialLassoSelection.current = new Set();
            setSelectedVestuario(new Set());
        }
    };

    useEffect(() => {
        if (!lasso.isSelecting) return;
        const handleMouseMove = (e: MouseEvent) => {
            setLasso(prev => ({ ...prev, x2: e.clientX, y2: e.clientY }));
            if (galleryRef.current) {
                const rectLeft = Math.min(lasso.x1, e.clientX);
                const rectRight = Math.max(lasso.x1, e.clientX);
                const rectTop = Math.min(lasso.y1, e.clientY);
                const rectBottom = Math.max(lasso.y1, e.clientY);

                const newSet = new Set(initialLassoSelection.current);
                const items = galleryRef.current.querySelectorAll('.vestuario-item');
                items.forEach(el => {
                    const box = el.getBoundingClientRect();
                    const isIntersecting = !(rectRight < box.left || rectLeft > box.right || rectBottom < box.top || rectTop > box.bottom);
                    const id = el.getAttribute('data-id');
                    if (id && isIntersecting) {
                        newSet.add(id);
                    }
                });
                setSelectedVestuario(newSet);
            }
        };
        const handleMouseUp = () => setLasso(prev => ({ ...prev, isSelecting: false }));
        
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [lasso.isSelecting, lasso.x1, lasso.y1]);

    // Traductor automático de Acción en Cámara (Exterior)
    useEffect(() => {
        if (!extAccion.trim()) {
            setExtAccionEN('');
            return;
        }

        const timer = setTimeout(async () => {
            setIsTranslatingAction(true);
            try {
                const translated = await translateActionToEnglish(extAccion);
                setExtAccionEN(translated);
            } catch (err) {
                console.error("Error traduciendo acción:", err);
            } finally {
                setIsTranslatingAction(false);
            }
        }, 1200); // 1.2s debounce

        return () => clearTimeout(timer);
    }, [extAccion]);

    // Listener global para Ctrl+C en la galería
    useEffect(() => {
        const handleGlobalCopy = (e: ClipboardEvent) => {
            // Solo si la galería está abierta y el foco no está en un input
            if (isGalleryOpen && selectedVestuario.size > 0) {
                const active = document.activeElement?.tagName;
                if (active !== 'INPUT' && active !== 'TEXTAREA') {
                    e.preventDefault();
                    copySelectedToClipboard();
                }
            }
        };
        window.addEventListener('copy', handleGlobalCopy);
        return () => window.removeEventListener('copy', handleGlobalCopy);
    }, [isGalleryOpen, selectedVestuario, workingMode]);

    const handleVestuarioClick = (e: React.MouseEvent, id: string) => {
        const newSet = new Set(selectedVestuario);
        if (e.ctrlKey || e.metaKey) {
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
        } else {
            newSet.clear();
            newSet.add(id);
        }
        setSelectedVestuario(newSet);
    };

    const handleVestuarioDragStart = (e: React.DragEvent, id: string) => {
        let set = selectedVestuario;
        if (!set.has(id)) {
            set = new Set([id]);
            setSelectedVestuario(set);
        }
        const urlList = Array.from(set).map(x => `https://media.saladillovivo.com.ar/vestuario_de_hoy_${workingMode === 'estudio' ? 'estudio' : 'exteriores'}/${x === 'REF' ? 'REFERENCE_IMAGE.PNG' : `${x}.png`}`);
        
        // 1. Texto plano
        e.dataTransfer.setData('text/plain', urlList.join('\n'));
        
        // 2. URI List (Estándar para múltiples links)
        e.dataTransfer.setData('text/uri-list', urlList.join('\r\n'));
        
        // 3. HTML (Ayuda a muchos editores a reconocer múltiples imágenes)
        const html = urlList.map(url => `<img src="${url}">`).join(' ');
        e.dataTransfer.setData('text/html', html);

        // 4. Ghost Image (Contador visual)
        if (set.size > 1) {
            const dragGhost = document.createElement('div');
            dragGhost.style.background = '#00B140';
            dragGhost.style.color = 'black';
            dragGhost.style.padding = '6px 14px';
            dragGhost.style.borderRadius = '12px';
            dragGhost.style.fontWeight = 'black';
            dragGhost.style.fontSize = '12px';
            dragGhost.style.position = 'absolute';
            dragGhost.style.top = '-1000px';
            dragGhost.style.zIndex = '999999';
            dragGhost.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
            dragGhost.innerText = `Arrastrando ${set.size} fotos`;
            document.body.appendChild(dragGhost);
            e.dataTransfer.setDragImage(dragGhost, 0, 0);
            setTimeout(() => dragGhost.remove(), 0);
        }

        e.dataTransfer.effectAllowed = 'copy';
    };

    const handleBgDragStart = (e: React.DragEvent, url: string, name: string) => {
        setSelectedBg(url);
        
        // 1. Texto plano
        e.dataTransfer.setData('text/plain', url);
        
        // 2. URI List
        e.dataTransfer.setData('text/uri-list', url + '\r\n');
        
        // 3. HTML
        const html = `<img src="${url}">`;
        e.dataTransfer.setData('text/html', html);

        // Ghost Image para feedback
        const dragGhost = document.createElement('div');
        dragGhost.style.background = '#00B140';
        dragGhost.style.color = 'black';
        dragGhost.style.padding = '6px 14px';
        dragGhost.style.borderRadius = '12px';
        dragGhost.style.fontWeight = 'black';
        dragGhost.style.fontSize = '12px';
        dragGhost.style.position = 'absolute';
        dragGhost.style.top = '-1000px';
        dragGhost.style.zIndex = '999999';
        dragGhost.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
        dragGhost.innerText = `Arrastrando: ${name}`;
        document.body.appendChild(dragGhost);
        e.dataTransfer.setDragImage(dragGhost, 0, 0);
        setTimeout(() => dragGhost.remove(), 0);

        e.dataTransfer.effectAllowed = 'copy';
    };

    const copySelectedToClipboard = async () => {
        if (selectedVestuario.size === 0) return addToast('warning', '⚠ Selecciona imágenes primero');
        addToast('info', `✦ Preparando ${selectedVestuario.size} fotos para el portapapeles...`);
        
        try {
            const urls = Array.from(selectedVestuario).map(x => 
                `https://media.saladillovivo.com.ar/vestuario_de_hoy_${workingMode === 'estudio' ? 'estudio' : 'exteriores'}/${x === 'REF' ? 'REFERENCE_IMAGE.PNG' : `${x}.png`}`
            );

            // Descargar todos los blobs
            const blobs = await Promise.all(urls.map(async url => {
                const resp = await fetch(url);
                if (!resp.ok) throw new Error("Error de red");
                return await resp.blob();
            }));

            // Intentar copiar como ClipboardItems (archivos reales)
            // Nota: Algunos navegadores o sistemas pueden limitar el número de archivos
            const clipboardItems = blobs.map(blob => new ClipboardItem({ [blob.type]: blob }));
            
            await navigator.clipboard.write(clipboardItems);
            addToast('success', `✓ ${selectedVestuario.size} fotos copiadas como ARCHIVOS`);
        } catch (err) {
            console.error("Error copying to clipboard:", err);
            // Fallback: Copiar como texto y HTML básico
            const urls = Array.from(selectedVestuario).map(x => 
                `https://media.saladillovivo.com.ar/vestuario_de_hoy_${workingMode === 'estudio' ? 'estudio' : 'exteriores'}/${x === 'REF' ? 'REFERENCE_IMAGE.PNG' : `${x}.png`}`
            );
            try {
                // Clipboard API básica
                const text = urls.join('\n');
                await navigator.clipboard.writeText(text);
                addToast('info', 'ℹ Copiado como enlaces (el sistema no permitió archivos múltiples)');
            } catch (innerErr) {
                addToast('error', '✗ Error al intentar copiar');
            }
        }
    };

    const downloadSelectedVestuario = async () => {
        if (selectedVestuario.size === 0) return addToast('warning', '⚠ Selecciona imágenes primero (con click o arrastrando)');
        addToast('info', `Descargando ${selectedVestuario.size} imágenes...`);
        const promises = Array.from(selectedVestuario).map(async (id, index) => {
            try {
                const name = id === 'REF' ? 'REFERENCE_IMAGE.PNG' : `${id}.png`;
                const url = `https://media.saladillovivo.com.ar/vestuario_de_hoy_${workingMode === 'estudio' ? 'estudio' : 'exteriores'}/${name}?t=${imageTimestamp}`;
                const res = await fetch(url);
                const blob = await res.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = name;
                document.body.appendChild(a);
                setTimeout(() => {
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(blobUrl);
                }, index * 250); 
            } catch (err) {
                console.error("Error downloading", id, err);
            }
        });
        await Promise.all(promises);
    };

    const [isGeneratingScripts, setIsGeneratingScripts] = useState(false);
    const waveformRef = useRef<HTMLDivElement>(null);
    const productionClipsRef = useRef(productionClips);

    useEffect(() => {
        productionClipsRef.current = productionClips;
    }, [productionClips]);
    const waveSurferRef = useRef<WaveSurfer | null>(null);

    const SEGMENT_COLORS = [
        'rgba(0, 177, 64, 0.2)',   // Verde Ara
        'rgba(0, 100, 255, 0.2)',  // Azul
        'rgba(255, 170, 0, 0.2)',  // Naranja
        'rgba(200, 0, 255, 0.2)',  // Púrpura
        'rgba(255, 0, 100, 0.2)',  // Rosa
    ];

    useEffect(() => {
        // Cargar saludo al azar
        if (saludoTxt) {
            const lines = saludoTxt.split(/\n/).filter(l => l.trim().length > 0);
            if (lines.length > 0) setSelectedSaludo(adaptarTextoArgentino(lines[Math.floor(Math.random() * lines.length)].trim()));
        }
        // Cargar CTA al azar
        if (ctaTxt) {
            const lines = ctaTxt.split(/\n/).filter(l => l.trim().length > 0);
            if (lines.length > 0) setSelectedCTA(adaptarTextoArgentino(lines[Math.floor(Math.random() * lines.length)].trim()));
        }
        // Cargar Slogan al azar
        if (slogansTxt) {
            const lines = slogansTxt.split(/\n/).filter(l => l.trim().length > 0);
            if (lines.length > 0) setSelectedSlogan(adaptarTextoArgentino(lines[Math.floor(Math.random() * lines.length)].trim()));
        }
    }, []);

    // Inicializar WaveSurfer
    useEffect(() => {
        if (!waveformRef.current) return;

        const ws = WaveSurfer.create({
            container: waveformRef.current,
            waveColor: '#333',
            progressColor: '#00B140',
            cursorColor: '#00B140',
            barWidth: 2,
            barRadius: 3,
            height: 80,
            normalize: true,
            interact: true,
            fillParent: true,
        });

        // Plugin de regiones para guías visuales
        const regions = ws.registerPlugin(RegionsPlugin.create());
        
        ws.on('play', () => setIsPlaying(true));
        ws.on('pause', () => setIsPlaying(false));
        
        waveSurferRef.current = ws;

        return () => {
            ws.destroy();
        };
    }, []);

    // Cargar audio cuando cambie el activo
    useEffect(() => {
        if (activeAudio && waveSurferRef.current) {
            console.log(`[WaveSurfer] Cargando audio: https://media.saladillovivo.com.ar/audios_Ara/${activeAudio}`);
            waveSurferRef.current.load(`https://media.saladillovivo.com.ar/audios_Ara/${activeAudio}`);
            
            waveSurferRef.current.once('ready', () => {
                const ws = waveSurferRef.current;
                if (!ws) return;
                
                const duration = ws.getDuration();
                const regions = ws.getActivePlugins().find(p => p instanceof RegionsPlugin) as any;
                if (!regions) return;

                regions.clearRegions();
                
                // Crear obligatoriamente 4 segmentos automáticos
                let currentTime = 0;
                for (let index = 0; index < 4; index++) {
                    const limit = index === 0 ? 8 : 7;
                    const end = Math.min(currentTime + limit, duration);
                    
                    regions.addRegion({
                        id: `seg-${index}`,
                        start: currentTime,
                        end: end,
                        color: SEGMENT_COLORS[index % SEGMENT_COLORS.length],
                        drag: false,
                        resize: true,
                        content: `S${index + 1}`
                    });
                    
                    currentTime = end;
                }

                // Actualizar lista local de segmentos y seleccionar el primero
                const initialRegions = regions.getRegions().sort((a: any, b: any) => a.start - b.start);
                const initialSegments = initialRegions.map((r: any) => ({
                    id: r.id,
                    start: r.start,
                    end: r.end,
                    duration: r.end - r.start
                }));
                setSegments(initialSegments);
                
                // Forzar selección del primer segmento al cargar
                if (initialRegions.length > 0) {
                    const firstId = initialRegions[0].id;
                    setSelectedSegmentId(firstId);
                    
                    // Asegurar que el contenido visual se inicialice con el ID correcto
                    initialRegions.forEach((r: any, i: number) => {
                        const isSelected = r.id === firstId;
                        r.setOptions({ 
                            content: `S${i+1}: ${(r.end - r.start).toFixed(1)}s`,
                            color: SEGMENT_COLORS[i % SEGMENT_COLORS.length].replace('0.2', isSelected ? '0.4' : '0.2')
                        });
                    });
                }

                // Función para actualizar el texto de duración en la región
                const updateRegionContent = (r: any, i: number) => {
                    const isSelected = r.id === selectedSegmentId;
                    r.setOptions({ 
                        content: `S${i+1}: ${(r.end - r.start).toFixed(1)}s`,
                        color: SEGMENT_COLORS[i % SEGMENT_COLORS.length].replace('0.2', isSelected ? '0.4' : '0.2')
                    });
                };

                // Inicializar contenidos
                regions.getRegions().forEach((r: any, i: number) => updateRegionContent(r, i));

                // Escuchar clicks en regiones
                regions.on('region-clicked', (region: any, e: Event) => {
                    e.stopPropagation();
                    setSelectedSegmentId(region.id);
                });

                // Lógica de actualización de regiones contiguas y límites
                regions.on('region-updated', (region: any) => {
                    const allRegions = regions.getRegions().sort((a: any, b: any) => a.start - b.start);
                    const idx = allRegions.findIndex((r: any) => r.id === region.id);
                    if (idx === -1) return;

                    const limit = idx === 0 ? 8 : 7;
                    
                    // 1. Forzar límite de duración
                    if (region.end - region.start > limit) {
                        region.end = region.start + limit;
                    }

                    // 2. Ajustar el inicio del siguiente segmento para que sea contiguo
                    if (idx < allRegions.length - 1) {
                        const next = allRegions[idx + 1];
                        next.setOptions({ start: region.end });
                    }

                    // 3. Si movemos el inicio (excepto en el primero), el anterior debe terminar aquí
                    if (idx > 0) {
                        const prev = allRegions[idx - 1];
                        prev.setOptions({ end: region.start });
                    }

                    // Actualizar contenidos de texto para todos los afectados
                    allRegions.forEach((r: any, i: number) => updateRegionContent(r, i));

                    // Actualizar estado para la UI
                    setSegments(allRegions.map((r: any) => ({
                        id: r.id,
                        start: r.start,
                        end: r.end,
                        duration: r.end - r.start
                    })));
                });
            });

            waveSurferRef.current.on('error', (err) => {
                console.error(`[WaveSurfer] Error cargando ${activeAudio}:`, err);
            });
        }
    }, [activeAudio]);

    // Actualizar colores cuando cambia la selección
    useEffect(() => {
        if (!waveSurferRef.current) return;
        const regions = waveSurferRef.current.getActivePlugins().find(p => p instanceof RegionsPlugin) as any;
        if (!regions) return;

        regions.getRegions().forEach((r: any, i: number) => {
            const isSelected = r.id === selectedSegmentId;
            r.setOptions({ 
                color: SEGMENT_COLORS[i % SEGMENT_COLORS.length].replace('0.2', isSelected ? '0.4' : '0.2')
            });
        });
    }, [selectedSegmentId]);

    // Cargar audios al montar
    useEffect(() => {
        fetchAudios();
        const interval = setInterval(fetchAudios, 5000); // Poll cada 5s
        return () => clearInterval(interval);
    }, [workingMode]);

    const handlePlayPause = () => {
        const ws = waveSurferRef.current;
        if (!ws) return;

        if (isPlaying) {
            ws.pause();
        } else {
            const regionsPlugin = ws.getActivePlugins().find(p => p instanceof RegionsPlugin) as any;
            const region = regionsPlugin?.getRegions().find((r: any) => r.id === selectedSegmentId);
            
            if (region) {
                // 1. Ir al inicio del segmento
                ws.setTime(region.start);
                
                // 2. Definir detector de final de segmento
                const onTimeUpdate = () => {
                    const currentTime = ws.getCurrentTime();
                    if (currentTime >= region.end) {
                        ws.pause();
                        ws.un('timeupdate', onTimeUpdate);
                    }
                };

                // 3. Limpiar detectores previos para no acumular
                ws.un('pause', () => ws.un('timeupdate', onTimeUpdate));
                
                // 4. Iniciar y escuchar
                ws.on('timeupdate', onTimeUpdate);
                ws.once('pause', () => ws.un('timeupdate', onTimeUpdate));
                
                ws.play();
                console.log(`[WaveSurfer] Reproducción estricta: ${region.start.toFixed(2)}s - ${region.end.toFixed(2)}s`);
            } else {
                ws.play();
            }
        }
    };

    const fetchAudios = async () => {
        try {
            const res = await fetch('/api/audio-management');
            if (res.ok) {
                const data = await res.json();
                if (data.audios) {
                    setAudioList(data.audios.sort());
                }
            }
        } catch (err) {
            console.error("Error cargando audios:", err);
        }

        try {
            // También cargamos las noticias de Supabase independiente de si el audio falla
            const news = await newsService.getArticles();
            setArticles(news as Article[]);
        } catch (err) {
            console.error("Error cargando noticias de Supabase:", err);
        }
    };

    const generarSegmentosAudio = async () => {
        if (!activeAudio || segments.length === 0) return;
        
        setIsProcessing(true);
        try {
            const res = await fetch('/api/process-audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: activeAudio,
                    segments: segments
                })
            });

            const data = await res.json();
            if (res.ok) {
                addToast('success', `✓ Generados ${data.count} segmentos con éxito`);
                fetchAudios(); // Actualizar lista de archivos
            } else {
                addToast('error', `✗ Error: ${data.error}`);
            }
        } catch (err) {
            addToast('error', "✗ Error de conexión al generar audios");
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };

    const generarPromptParaClip = (clip: any) => {
        // REGLA 2: Prompt de Producción Veo 3.1 / Grok (Lenguaje Natural)
        const scriptProcesado = adaptarTextoArgentino(clip.script);

        if (workingMode === 'exterior') {
            // 1. Guion base
            let scriptRaw = extScript || clip.script;

            // 2. Aplicar agregados según opción seleccionada
            if (extSpeechOption === 'SALUDO') {
                const lines = saludoTxt.split(/\n/).filter(l => l.trim().length > 0);
                if (lines.length > 0) {
                    const randomSaludo = lines[Math.floor(Math.random() * lines.length)].trim();
                    scriptRaw = `${randomSaludo} ${scriptRaw}`;
                }
            } else if (extSpeechOption === 'CTA') {
                const lines = ctaTxt.split(/\n/).filter(l => l.trim().length > 0);
                if (lines.length > 0) {
                    const randomCTA = lines[Math.floor(Math.random() * lines.length)].trim();
                    scriptRaw = `${scriptRaw} ${randomCTA}`;
                }
            } else if (extSpeechOption === 'SLOGAN') {
                const lines = slogansTxt.split(/\n/).filter(l => l.trim().length > 0);
                if (lines.length > 0) {
                    const randomSlogan = lines[Math.floor(Math.random() * lines.length)].trim();
                    scriptRaw = `${scriptRaw} ${randomSlogan}`;
                }
            }

            const scriptAraStyle = adaptarTextoArgentino(scriptRaw);
            const guionCaps = scriptAraStyle.toUpperCase();
            
            const bgImageName = selectedBg ? selectedBg.split('/').pop() : 'background_reference_image_1.png';

            // 2. Ingeniería de Prompts para AMBIENT_PHYSICS (Reglas Google Veo 3.1)
            const horarioPrompt = extHorario.toLowerCase();
            const weatherClause = (extClima === 'INDOOR' || extHorario === 'NOCHE') ? "" : `Weather: ${extClima.toLowerCase()}, `;
            
            let technicalLight = "";
            const h = extHorario;
            const c = extClima;

            if (c === 'SOLEADO') {
                if (h === 'MAÑANA') technicalLight = "5500K direct sunlight, 90,000 lux, high contrast, sharp defined shadows, clear sky";
                else if (h === 'TARDE') technicalLight = "4500K golden hour sun, 45,000 lux, low-angle light, long cinematic soft shadows, warm amber tones";
                else technicalLight = "5500K clear daylight, bright illumination";
            } else if (c === 'NUBLADO') {
                if (h === 'MAÑANA') technicalLight = "6500K overcast daylight, 20,000 lux, soft diffused light, shadowless, neutral cool palette";
                else if (h === 'TARDE') technicalLight = "7000K heavy clouds, 12,000 lux, moody flat lighting, high color saturation, cool blue tint";
                else technicalLight = "6500K neutral overcast light";
            } else if (c === 'LLUVIA') {
                if (h === 'MAÑANA') technicalLight = "7500K rainy morning, 8,000 lux, desaturated, misty, wet pavement reflections, cold light";
                else if (h === 'TARDE') technicalLight = "8000K stormy dusk, 4,000 lux, deep blue hour tones, dark moody, cinematic rain streaks";
                else technicalLight = "7500K rainy ambient light";
            } else if (h === 'NOCHE') {
                technicalLight = "Night exterior, 5600K HMI key light on subject, high contrast, deep black background";
            } else if (c === 'INDOOR') {
                technicalLight = "Interior 3200K tungsten soft fill, 800 lux, low contrast, professional broadcast look";
            } else {
                technicalLight = "Balanced cinematic lighting, high fidelity";
            }

            // Integración de la posición del sol con la iluminación técnica
            const positionPrefix = (c === 'SOLEADO' && h !== 'NOCHE') ? `${extPosicionSol.toLowerCase()} with ` : "";
            const tipoDeLuz = `${positionPrefix}${technicalLight}`;

            const ambientPhysicsTag = `[AMBIENT_PHYSICS] Time: ${horarioPrompt}, ${weatherClause}Lighting Position: ${tipoDeLuz} on the subject, combined with flat, shadowless lighting exclusively on the green screen background.`.trim();
            
            // 3. Parámetros adicionales (Acción y Profundidad)
            const accionNarrativa = extAccionEN || "The anime-style avatar Ara maintains a professional standing posture with no extra gestures.";
            const depthOfField = "Shallow depth of field, sharp focus on subject.";
            const negativePrompt = "\nPrompt Negativo (Negative Prompt):\nbackground details, gradients, shadows on background, uneven lighting, camera movement, camera drift, text overlays, subtitles";

            return `[PRIORIDAD_SISTEMA:CHROMA_KEY] Absolute priority: The background is a solid green screen. [FIDELIDAD_CONTEXTUAL] Use ${bgImageName} as a rigid plate. ${ambientPhysicsTag} [ESCENARIO_ESTÁTICO] The background is completely static. Depth of Field: ${depthOfField} [ACCIÓN_NARRATIVA] ${accionNarrativa} [AUDIO_ARA_V2] Character says: "${guionCaps}" speaking with a clear Argentine Rioplatense accent (no subtitles). [CIERRE] Mouth closes 250ms. Static pose.${negativePrompt}`.trim();
        }

        if (aiEngine === 'GROK') {
            return PROMPT_MAESTRO_GROK.replace('{TEXTO_A_DECIR}', scriptProcesado);
        }

        return PROMPT_MAESTRO_SYSTEM.replace(
            'Saladissho Vivo. La misma información, mejor contada. Visitános.',
            scriptProcesado
        );
    };

    const handleGenerarPrompt = (clipId: string) => {
        setProductionClips(prev => prev.map(clip => {
            if (clip.id === clipId) {
                const generatedPrompt = generarPromptParaClip(clip);
                addToast('success', `✓ Prompt generado para Clip ${clip.segmentIndex}`);
                return { ...clip, status: 'ready', prompt: generatedPrompt };
            }
            return clip;
        }));
    };

    const copiarAlPortapapeles = (text: string) => {
        navigator.clipboard.writeText(text);
        addToast('success', '✓ Prompt copiado al portapapeles');
    };

    const abrirCarpetaVestuario = () => {
        setIsGalleryOpen(true);
        addToast('success', '✓ Galería de Vestuario abierta');
    };

    const fetchBackgrounds = async (folder: string) => {
        try {
            setBgFolderPath(folder);
            const res = await fetch(`/api/admin-utils?action=list-backgrounds&folder=${encodeURIComponent(folder)}`);
            if (res.ok) {
                const data = await res.json();
                setBgList(data.backgrounds);
                setIsBgGalleryOpen(true);
            } else {
                addToast('error', '✗ Error al cargar fondos');
            }
        } catch (err) {
            console.error("Error fetching backgrounds:", err);
            addToast('error', '✗ Error de red al cargar fondos');
        }
    };

    const cambiarVestuarioManual = async () => {
        try {
            addToast('info', '✦ Actualizando vestuario...');
            const res = await fetch('/api/cambiar-vestuario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ location: workingMode === 'estudio' ? 'estudio' : 'exteriores' })
            });
            if (res.ok) {
                addToast('success', '✓ Vestuario cambiado correctamente');
                setImageTimestamp(Date.now());
            } else {
                addToast('error', '✗ Hubo un error al cambiar el vestuario');
            }
        } catch (error) {
            console.error("Error al cambiar vestuario:", error);
            addToast('error', '✗ Error al intentar cambiar el vestuario');
        }
    };

    const handleGenerarVideo = async (clip: any) => {
        if (!clip.prompt || !clip.script) return;
        
        // Pasos 5: Validación de Cuotas y Límites Pro
        if (clip.segmentIndex > 20) {
            addToast('error', `✗ Límite máximo Pro (20 clips / 148s) alcanzado`);
            return;
        }

        setProductionClips(prev => prev.map(c => c.id === clip.id ? { ...c, status: 'generating' } : c));
        
        try {
            // 1. Obtener imagen de referencia en base64
            const imagePath = workingMode === 'estudio' 
                ? `https://media.saladillovivo.com.ar/vestuario_de_hoy_estudio/REFERENCE_IMAGE.png`
                : `https://media.saladillovivo.com.ar/vestuario_de_hoy_exteriores/REFERENCE_IMAGE.png`;
            
            const imgResp = await fetch(imagePath);
            const imgBlob = await imgResp.blob();
            const imgBase64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                reader.readAsDataURL(imgBlob);
            });

            // 1b. No se requiere fondo adicional (La imagen de referencia ya incluye el fondo)
            const bgBase64: string | undefined = undefined;

            // 2. Obtener audio segmentado en base64 (Sólo si venimos de source AUDIO)
            let audBase64: string | undefined = undefined;
            if (sourceType === 'AUDIO' || (clip.audioFile && !clip.audioFile.includes('NOTICIA_'))) {
                try {
                    const audioUrl = `https://media.saladillovivo.com.ar/audios_Ara/${clip.audioFile}`;
                    const audResp = await fetch(audioUrl);
                    if (audResp.ok) {
                        const audBlob = await audResp.blob();
                        audBase64 = await new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                            reader.readAsDataURL(audBlob);
                        });
                    }
                } catch (e) {
                    console.warn("Audio no encontrado o no disponible para este clip. Generando sin referencia de audio.");
                }
            }

            // 3. Obtener video previo si es una extensión (segmento > 1)
            let previousVideoBase64: string | undefined = undefined;
            if (clip.segmentIndex > 1) {
                // Usamos la referencia mutable para obtener el valor más fresco del videoData anterior
                const prevClip = productionClipsRef.current.find(c => c.segmentIndex === clip.segmentIndex - 1);
                if (prevClip && prevClip.videoData) {
                    previousVideoBase64 = prevClip.videoData;
                } else {
                    addToast('warning', `⚠ Clip ${clip.segmentIndex - 1} no disponible para extensión. Generando clip base.`);
                }
            }

            // 4. Llamar al servicio VEO 3.1
            const result = await generateAvatarVideo(clip.script, imgBase64, audBase64, bgBase64, previousVideoBase64, aspectRatio);
            
            if (result.status === 'ready') {
                const updatedClips = productionClipsRef.current.map(c => c.id === clip.id ? { 
                    ...c, 
                    status: 'ready' as const, 
                    videoUrl: result.videoUrl,
                    videoData: result.videoData 
                } : c);
                
                // Actualizar ref inmediatamente para la siguiente iteración del loop Auto-Extend
                productionClipsRef.current = updatedClips;
                
                // Actualizar estado para la UI
                setProductionClips(updatedClips);
                addToast('success', `✓ Clip ${clip.segmentIndex} generado con éxito`);
            } else {
                addToast('success', `✦ Clip ${clip.segmentIndex} enviado a cola de renderizado`);
            }

        } catch (error: any) {
            console.error("Error al generar video:", error);
            addToast('error', `✗ Error: ${error.message}`);
            setProductionClips(prev => prev.map(c => c.id === clip.id ? { ...c, status: 'ready' } : c));
        }
    };

    const generarProduccion = () => {
        if (sourceType === 'AUDIO' && (!activeAudio || segments.length === 0)) {
            addToast('error', "✗ Selecciona un audio y define los segmentos primero");
            return;
        }

        if (sourceType === 'SUPABASE' && !selectedArticleId) {
            addToast('error', "✗ Selecciona una noticia de Supabase primero");
            return;
        }

        if (sourceType === 'SUPABASE') {
            const article = articles.find(a => a.id === selectedArticleId);
            if (!article || !article.super_resumen) {
                addToast('error', "✗ La noticia no tiene súper resumen generado");
                return;
            }

            // Dividir por saltos de línea (\n) que es como lo genera gemini.ts ahora
            const sentences = article.super_resumen.split(/\n/)
                .map(s => s.trim())
                .filter(s => s.length > 5);
            
            const newClips = sentences.map((script, i) => ({
                id: `article-${article.id}-clip-${i + 1}`,
                segmentIndex: i + 1,
                audioFile: `NOTICIA_${article.id}_CLIP_${i + 1}.mp3`, // Placeholder
                status: 'ready' as const,
                script: script
            }));

            setProductionClips(newClips);
            addToast('success', `✓ Cargados ${newClips.length} clips desde el Súper Resumen de Supabase`);
            return;
        }

        const match = activeAudio?.match(/noticia_(\d+)/);
        const noticiaId = match ? match[1] : activeAudio?.replace(/\D/g, '') || "1";

        const newClips = segments.map((seg, i) => ({
            id: seg.id,
            segmentIndex: i + 1,
            audioFile: `SEGMENTOS/NOT${noticiaId}_SEG${i + 1}.mp3`,
            status: 'pending' as const,
            script: ''
        }));

        setProductionClips(newClips);
        addToast('success', `✓ Creadas ${newClips.length} tareas de producción. Ahora redactá los guiones.`);
    };

    const handleAutoRedactarScripts = async () => {
        if (productionClips.length === 0) {
            addToast('error', "✗ Primero dale a 'GENERAR PRODUCCIÓN' para crear los slots");
            return;
        }

        const rawText = window.prompt("Pegá aquí la noticia en bruto para que Ara la redacte:", "Hoy hubo una asamblea con los compañeros municipales en la sede de la calle Belgrano por el tema de la paritaria local.");
        if (!rawText) return;

        setIsGeneratingScripts(true);
        addToast('info', '✦ Redactando 4 segmentos con Estilo Ara (IA)...');

        try {
            const options = await improveScriptWithGemini(rawText, 'SOLEMNE');
            const selectedOption = options[0]; // Usamos la primera opción por defecto

            // Dividir la opción elegida en oraciones individuales manteniendo la puntuación
            const sentences = selectedOption.match(/[^.!?\n]+[.!?\n]*/g)
                ?.map(s => s.trim())
                .filter(s => s.length > 5) || [];
            
            setProductionClips(prev => prev.map((clip, i) => ({
                ...clip,
                script: sentences[i] || clip.script // Asignamos cada oración a su correspondiente slot
            })));

            addToast('success', '✓ Guiones redactados y validados con éxito');
        } catch (error) {
            console.error("Error redactando guiones:", error);
            addToast('error', '✗ Error al redactar con IA. Intenta de nuevo.');
        } finally {
            setIsGeneratingScripts(false);
        }
    };

    const toggleSelection = (fileName: string) => {
        setSelectedAudios(prev => 
            prev.includes(fileName) 
                ? prev.filter(f => f !== fileName) 
                : [...prev, fileName]
        );
        setActiveAudio(fileName);
    };

    const eliminarAudio = async (fileName: string) => {
        try {
            const res = await fetch(`/api/audio-management?fileName=${encodeURIComponent(fileName)}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                addToast('success', `✓ Audio eliminado: ${fileName}`);
                setSelectedAudios(prev => prev.filter(f => f !== fileName));
                fetchAudios();
            }
        } catch (err) {
            addToast('error', "✗ No se pudo eliminar el audio");
        }
    };

    // Funciones auxiliares
    const addToast = (type: string, message: string) => {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };

    return (
        <div className="w-full h-full bg-[#0F0F0F] text-white flex flex-col font-['Inter',system-ui,sans-serif] overflow-hidden min-h-[600px]">
            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #111; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #555; }
                
                @keyframes toast-enter {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .animate-toast-enter { animation: toast-enter 0.3s ease-out forwards; }
            ` }} />

            {/* HEADER MINIMALISTA CON SELECTORES ESENCIALES */}
            <div className="h-[70px] border-b border-[#1E1E1E] bg-[#111111] flex items-center justify-between px-8 z-50">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#00B140] rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(0,177,64,0.3)]">
                            <Bot size={18} className="text-black" />
                        </div>
                        <h1 className="text-[15px] font-bold tracking-tighter uppercase">Avatar Studio</h1>
                    </div>

                    <div className="h-8 w-[1px] bg-[#222]"></div>

                    {/* SELECTOR MOTOR */}
                    <div className="flex bg-[#0D0D0D] p-1 rounded-xl border border-[#1E1E1E]">
                        <button 
                            onClick={() => setAiEngine('GROK')}
                            className={`px-5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${aiEngine === 'GROK' ? 'bg-[#1A1A1A] text-[#00B140] shadow-xl' : 'text-[#444] hover:text-[#666]'}`}
                        >
                            GROK (FLUX)
                        </button>
                        <button 
                            onClick={() => setAiEngine('VEO')}
                            className={`px-5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${aiEngine === 'VEO' ? 'bg-[#1A1A1A] text-[#00B140] shadow-xl' : 'text-[#444] hover:text-[#666]'}`}
                        >
                            VEO (GOOGLE)
                        </button>
                    </div>

                    {/* SELECTOR MODO */}
                    <div className="flex bg-[#0D0D0D] p-1 rounded-xl border border-[#1E1E1E]">
                        <button 
                            onClick={() => setWorkingMode('estudio')}
                            className={`flex items-center gap-2 px-5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${workingMode === 'estudio' ? 'bg-[#1A1A1A] text-[#00B140] shadow-xl' : 'text-[#444] hover:text-[#666]'}`}
                        >
                            <Layout size={14} /> ESTUDIO
                        </button>
                        <button 
                            onClick={() => setWorkingMode('exterior')}
                            className={`flex items-center gap-2 px-5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${workingMode === 'exterior' ? 'bg-[#1A1A1A] text-[#00B140] shadow-xl' : 'text-[#444] hover:text-[#666]'}`}
                        >
                            <Camera size={14} /> EXTERIORES
                        </button>
                    </div>

                    {/* SELECTOR FORMATO */}
                    <div className="flex bg-[#0D0D0D] p-1 rounded-xl border border-[#1E1E1E]">
                        <button 
                            onClick={() => setAspectRatio('9:16')}
                            className={`flex items-center gap-2 px-5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${aspectRatio === '9:16' ? 'bg-[#1A1A1A] text-[#00B140] shadow-xl' : 'text-[#444] hover:text-[#666]'}`}
                        >
                            <Smartphone size={14} /> 9:16
                        </button>
                        <button 
                            onClick={() => setAspectRatio('16:9')}
                            className={`flex items-center gap-2 px-5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${aspectRatio === '16:9' ? 'bg-[#1A1A1A] text-[#00B140] shadow-xl' : 'text-[#444] hover:text-[#666]'}`}
                        >
                            <Monitor size={14} /> 16:9
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button 
                        onClick={generarProduccion}
                        className="h-10 px-6 rounded-xl bg-[#00B140] text-black font-bold text-[12px] shadow-[0_4px_15px_rgba(0,177,64,0.2)] hover:bg-[#00CC48] transition-all active:scale-95"
                    >
                        GENERAR PRODUCCIÓN
                    </button>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-[1fr_1fr] overflow-hidden bg-[#0F0F0F]">
                {/* --- COLUMNA IZQUIERDA: AUDIO DE ARA --- */}
                <div className="flex flex-col bg-[#111111] border-r border-[#1E1E1E] overflow-y-auto custom-scrollbar p-0">
                    <div className="p-6 pb-2">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <MessageSquare size={18} className="text-[#00B140]" />
                                <h2 className="text-[13px] font-bold uppercase tracking-widest text-[#AAA]">Fuente de Contenido</h2>
                            </div>
                            
                            <div className="flex bg-[#0D0D0D] p-0.5 rounded-lg border border-[#1E1E1E]">
                                <button 
                                    onClick={() => setSourceType('SUPABASE')}
                                    className={`px-3 py-1 rounded-md text-[9px] font-black transition-all ${sourceType === 'SUPABASE' ? 'bg-[#00B140] text-black' : 'text-[#444] hover:text-[#666]'}`}
                                >
                                    NOTICIAS
                                </button>
                                <button 
                                    onClick={() => setSourceType('AUDIO')}
                                    className={`px-3 py-1 rounded-md text-[9px] font-black transition-all ${sourceType === 'AUDIO' ? 'bg-[#00B140] text-black' : 'text-[#444] hover:text-[#666]'}`}
                                >
                                    AUDIOS
                                </button>
                            </div>
                        </div>

                        {sourceType === 'AUDIO' ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
                        {audioList.length === 0 ? (
                            <div className="col-span-full bg-[#161616] border border-[#222] border-dashed rounded-xl p-8 text-center">
                                <p className="text-[12px] text-[#444] uppercase font-bold">No hay audios generados</p>
                            </div>
                        ) : (
                            audioList.map((audio, index) => {
                                const isSelected = activeAudio === audio;
                                return (
                                    <div 
                                        key={audio} 
                                        onClick={() => {
                                            setActiveAudio(audio);
                                            setSelectedAudios([audio]);
                                        }}
                                        className={`
                                            group relative h-7 px-2.5 rounded-md flex items-center justify-between cursor-pointer transition-all
                                            ${isSelected 
                                                ? 'bg-[#00B140] text-black shadow-[0_0_10px_rgba(0,177,64,0.1)]' 
                                                : 'bg-[#161616] border border-[#222] text-[#555] hover:border-[#333] hover:text-[#777]'}
                                        `}
                                    >
                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                            <span className="text-[9px] font-black tracking-tighter uppercase whitespace-nowrap">Noticia {index + 1}</span>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    eliminarAudio(audio);
                                                }}
                                                className={`
                                                    text-[12px] font-black leading-none hover:scale-125 transition-transform flex items-center justify-center w-3 h-3
                                                    ${isSelected ? 'text-black/30 hover:text-black' : 'text-red-500/30 hover:text-red-500'}
                                                `}
                                                title="Quitar noticia"
                                            >
                                                x
                                            </button>
                                        </div>
                                        
                                        {isSelected && (
                                            <div className="shrink-0">
                                                <Check size={9} strokeWidth={5} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                        </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2">
                                {articles.length === 0 ? (
                                    <div className="bg-[#161616] border border-[#222] border-dashed rounded-xl p-8 text-center">
                                        <p className="text-[12px] text-[#444] uppercase font-bold">No hay noticias en Supabase</p>
                                    </div>
                                ) : (
                                    articles.map((article) => (
                                        <div 
                                            key={article.id}
                                            onClick={() => setSelectedArticleId(article.id)}
                                            className={`
                                                flex gap-3 p-3 rounded-xl border transition-all cursor-pointer
                                                ${selectedArticleId === article.id 
                                                    ? 'bg-[#00B140]/10 border-[#00B140] shadow-[0_0_15px_rgba(0,177,64,0.05)]' 
                                                    : 'bg-[#161616] border-[#222] hover:border-[#333]'}
                                            `}
                                        >
                                            <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-[#222]">
                                                <img src={article.image_url} className="w-full h-full object-cover" alt="" />
                                            </div>
                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                <div className="flex justify-between items-start">
                                                    <span className="text-[8px] font-black text-[#555] uppercase">{new Date(article.created_at).toLocaleDateString()}</span>
                                                    {article.super_resumen && (
                                                        <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-[#00B140]/20 text-[#00B140] uppercase">Resumen OK</span>
                                                    )}
                                                </div>
                                                <h4 className={`text-[11px] font-black uppercase tracking-tight line-clamp-2 mt-1 ${selectedArticleId === article.id ? 'text-white' : 'text-[#888]'}`}>
                                                    {article.title.replace(/\|/g, ' ')}
                                                </h4>
                                            </div>
                                            {selectedArticleId === article.id && (
                                                <div className="self-center">
                                                    <div className="w-4 h-4 bg-[#00B140] rounded-full flex items-center justify-center">
                                                        <Check size={10} className="text-black" strokeWidth={4} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* --- PANEL DE ONDA (WAVEFORM) TOTALMENTE MAXIMIZADO --- */}
                <div className="mt-auto flex flex-col border-t border-[#1E1E1E] bg-[#0D0D0D] min-h-[400px]">
                        <div className="px-4 py-3 border-b border-[#1E1E1E] bg-[#111] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#00B140]/10 flex items-center justify-center text-[#00B140]">
                                    <Volume2 size={16} />
                                </div>
                                <h3 className="text-[11px] font-black text-white uppercase tracking-tighter truncate max-w-[200px]">
                                    {activeAudio ? activeAudio : "Esperando selección..."}
                                </h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={handlePlayPause}
                                    disabled={!activeAudio}
                                    className="h-8 px-4 rounded-lg bg-[#00B140] text-black font-black text-[10px] flex items-center gap-2 hover:bg-[#00CC48] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                                    {isPlaying ? "PAUSA" : "REPRODUCIR"}
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 relative flex flex-col justify-center">
                            {!activeAudio && (
                                <div className="absolute inset-0 flex items-center justify-center bg-[#0D0D0D]/80 z-20">
                                    <p className="text-[10px] text-[#333] font-black uppercase tracking-[0.2em]">Seleccione noticia para visualizar onda</p>
                                </div>
                            )}
                            
                            <div className="py-8 bg-[#070707] w-full">
                                <div ref={waveformRef} className="w-full h-36"></div>
                            </div>

                            {activeAudio && (
                                <div className="px-6 py-4 border-t border-[#1E1E1E]/30 bg-[#0D0D0D]">
                                    <div className="flex flex-col gap-6">
                                        <div className="flex flex-wrap gap-3">
                                            {segments.map((seg, i) => {
                                                const isSelected = seg.id === selectedSegmentId;
                                                return (
                                                    <button 
                                                        key={seg.id}
                                                        onClick={() => setSelectedSegmentId(seg.id)}
                                                        className={`flex items-center gap-2 bg-[#161616] border px-3 py-1.5 rounded-lg transition-all ${isSelected ? 'border-[#00B140] bg-[#00B140]/5 shadow-[0_0_10px_rgba(0,177,64,0.1)]' : 'border-[#222]'}`}
                                                    >
                                                        <div 
                                                            className="w-2 h-2 rounded-full" 
                                                            style={{ backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length].replace('0.2', '1') }}
                                                        ></div>
                                                        <span className={`text-[10px] font-black uppercase ${isSelected ? 'text-[#00B140]' : 'text-[#888]'}`}>SEG {i + 1}:</span>
                                                        <span className={`text-[11px] font-mono font-bold ${seg.duration > (i === 0 ? 8 : 7) ? 'text-red-500' : (isSelected ? 'text-white' : 'text-[#00B140]')}`}>
                                                            {seg.duration.toFixed(2)}s
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <div className="flex items-center justify-between border-t border-[#1E1E1E] pt-6">
                                            <div className="flex items-center gap-6 text-[9px] font-black text-[#444] uppercase tracking-widest">
                                                <div className="flex items-center gap-2">
                                                    <Clock size={12} className="text-[#00B140]" />
                                                    S1: <span className="text-[#888]">MAX 8s</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#444]"></div>
                                                    RESTO: <span className="text-[#888]">MAX 7s</span>
                                                </div>
                                            </div>

                                            <button 
                                                onClick={generarSegmentosAudio}
                                                disabled={isProcessing || !activeAudio}
                                                className={`
                                                    flex items-center gap-3 px-6 py-2.5 rounded-full font-black text-[11px] uppercase tracking-tighter transition-all active:scale-95
                                                    ${isProcessing 
                                                        ? 'bg-[#1E1E1E] text-[#444] cursor-not-allowed' 
                                                        : 'bg-white text-black hover:bg-[#00B140] hover:text-white shadow-[0_10px_20px_rgba(255,255,255,0.05)]'}
                                                `}
                                            >
                                                {isProcessing ? (
                                                    <div className="w-4 h-4 border-2 border-[#444] border-t-white rounded-full animate-spin"></div>
                                                ) : (
                                                    <Scissors className="w-4 h-4" />
                                                )}
                                                {isProcessing ? 'Procesando...' : 'Generar Audios Segmentados'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- COLUMNA DERECHA: VISUAL Y ANIMACIÓN --- */}
                <div className="flex flex-col bg-[#0D0D0D] overflow-y-auto custom-scrollbar p-6">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <Video size={18} className="text-[#00B140]" />
                            <h2 className="text-[13px] font-bold uppercase tracking-widest text-[#AAA]">Visual y Animación</h2>
                        </div>
                        <button 
                            onClick={() => {
                                if (aiEngine === 'GROK') {
                                    copiarAlPortapapeles(PROMPT_MAESTRO_GROK.replace('{TEXTO_A_DECIR}', extScript || 'Saladissho Vivo. La misma información, mejor contada. Visitános.'));
                                } else {
                                    // VEO 3.1: usa el prompt correcto según ESTUDIO o EXTERIORES
                                    const dialogo = workingMode === 'exterior'
                                        ? (extScript || 'Escribí el diálogo de Ara en exteriores.')
                                        : 'Saladissho Vivo. La misma información, mejor contada. Visitános.';
                                    copiarAlPortapapeles(getPromptMaestroVEO(workingMode, dialogo));
                                }
                            }}
                            className="px-3 py-1.5 bg-[#1A1A1A] border border-[#00B140]/30 text-[#00B140] rounded-md text-[9px] font-black uppercase tracking-tighter hover:bg-[#00B140] hover:text-black transition-all flex items-center gap-2"
                        >
                            <Sparkles size={12} /> Prompt Maestro ({aiEngine === 'GROK' ? 'GROK' : `VEO 3.1 · ${workingMode === 'exterior' ? 'EXTERIORES' : 'ESTUDIO'}`})
                        </button>
                    </div>

                    <div className="flex gap-6 items-start">
                        <div className="flex flex-col gap-3 shrink-0">
                            <div className={`bg-[#111] rounded-2xl border border-[#1E1E1E] flex flex-col items-center justify-center gap-4 relative overflow-hidden group transition-all duration-500 ${aspectRatio === '9:16' ? 'aspect-[9/16] w-[140px]' : 'aspect-video w-[320px]'}`}>
                                {previewVideoUrl ? (
                                    <video 
                                        src={previewVideoUrl} 
                                        controls 
                                        autoPlay 
                                        className="w-full h-full object-cover z-20 relative"
                                    />
                                ) : (
                                    <>
                                        <img 
                                            src={workingMode === 'estudio' ? `https://media.saladillovivo.com.ar/vestuario_de_hoy_estudio/REFERENCE_IMAGE.png?t=${imageTimestamp}` : `https://media.saladillovivo.com.ar/vestuario_de_hoy_exteriores/REFERENCE_IMAGE.png?t=${imageTimestamp}`} 
                                            className="absolute inset-0 w-full h-full object-cover transition-opacity" 
                                            alt="Avatar Preview"
                                        />
                                    </>
                                )}
                            </div>
                            <div className="flex w-full gap-2">
                                <button 
                                    onClick={abrirCarpetaVestuario}
                                    className="flex-1 h-8 bg-[#161616] border border-[#222] rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#888] hover:bg-[#00B140] hover:text-black hover:border-[#00B140] transition-all active:scale-95 shadow-lg"
                                >
                                    <FolderOpen size={14} /> ABRIR
                                </button>
                                <button 
                                    onClick={cambiarVestuarioManual}
                                    className="flex-1 h-8 bg-[#161616] border border-[#222] rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#888] hover:bg-[#00B140] hover:text-black hover:border-[#00B140] transition-all active:scale-95 shadow-lg"
                                >
                                    <RefreshCw size={14} /> CAMBIAR
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col gap-2 max-w-[400px]">
                            {workingMode === 'estudio' && (
                                <>
                                    {/* CAJA SALUDO */}
                                    <div className="bg-[#161616] p-2 rounded-xl border border-[#222]">
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-[10px] font-bold text-[#00B140] uppercase tracking-widest">Saludo</label>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => {
                                                        const lines = saludoTxt.split(/\n/).filter(l => l.trim().length > 0);
                                                        if (lines.length > 0) setSelectedSaludo(adaptarTextoArgentino(lines[Math.floor(Math.random() * lines.length)].trim()));
                                                    }}
                                                    className="text-[9px] bg-[#1A1A1A] hover:bg-[#333] transition-all border border-[#222] px-2 py-0.5 rounded-md text-[#888] font-black uppercase flex items-center gap-1"
                                                >
                                                    <RefreshCw size={10} /> Cambiar
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        if (aiEngine === 'VEO') {
                                                            copiarAlPortapapeles(getPromptMaestroVEO(workingMode, selectedSaludo));
                                                        } else {
                                                            copiarAlPortapapeles(generarPromptParaClip({ script: selectedSaludo }));
                                                        }
                                                    }}
                                                    className="text-[9px] bg-[#1A1A1A] hover:bg-[#00B140] hover:text-black transition-all border border-[#222] px-2 py-0.5 rounded-md text-[#555] font-black uppercase"
                                                >
                                                    Copiar Prompt
                                                </button>
                                            </div>
                                        </div>
                                        <textarea 
                                            value={selectedSaludo}
                                            onChange={(e) => setSelectedSaludo(e.target.value)}
                                            className="w-full bg-[#0D0D0D] p-1.5 rounded-lg border border-[#222] text-[12px] text-[#888] font-medium leading-relaxed italic resize-none outline-none focus:border-[#00B140]/50 focus:text-white transition-all h-12"
                                        />
                                    </div>

                                    {/* CAJA CTA */}
                                    <div className="bg-[#161616] p-2 rounded-xl border border-[#222]">
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-[10px] font-bold text-[#00B140] uppercase tracking-widest">CTA (Call to Action)</label>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => {
                                                        const lines = ctaTxt.split(/\n/).filter(l => l.trim().length > 0);
                                                        if (lines.length > 0) setSelectedCTA(adaptarTextoArgentino(lines[Math.floor(Math.random() * lines.length)].trim()));
                                                    }}
                                                    className="text-[9px] bg-[#1A1A1A] hover:bg-[#333] transition-all border border-[#222] px-2 py-0.5 rounded-md text-[#888] font-black uppercase flex items-center gap-1"
                                                >
                                                    <RefreshCw size={10} /> Cambiar
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        if (aiEngine === 'VEO') {
                                                            copiarAlPortapapeles(getPromptMaestroVEO(workingMode, selectedCTA));
                                                        } else {
                                                            copiarAlPortapapeles(generarPromptParaClip({ script: selectedCTA }));
                                                        }
                                                    }}
                                                    className="text-[9px] bg-[#1A1A1A] hover:bg-[#00B140] hover:text-black transition-all border border-[#222] px-2 py-0.5 rounded-md text-[#555] font-black uppercase"
                                                >
                                                    Copiar Prompt
                                                </button>
                                            </div>
                                        </div>
                                        <textarea 
                                            value={selectedCTA}
                                            onChange={(e) => setSelectedCTA(e.target.value)}
                                            className="w-full bg-[#0D0D0D] p-1.5 rounded-lg border border-[#222] text-[12px] text-[#888] font-medium leading-relaxed italic resize-none outline-none focus:border-[#00B140]/50 focus:text-white transition-all h-12"
                                        />
                                    </div>

                                    {/* CAJA SLOGAN */}
                                    <div className="bg-[#161616] p-2 rounded-xl border border-[#222]">
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-[10px] font-bold text-[#00B140] uppercase tracking-widest">Slogan</label>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => {
                                                        const lines = slogansTxt.split(/\n/).filter(l => l.trim().length > 0);
                                                        if (lines.length > 0) setSelectedSlogan(adaptarTextoArgentino(lines[Math.floor(Math.random() * lines.length)].trim()));
                                                    }}
                                                    className="text-[9px] bg-[#1A1A1A] hover:bg-[#333] transition-all border border-[#222] px-2 py-0.5 rounded-md text-[#888] font-black uppercase flex items-center gap-1"
                                                >
                                                    <RefreshCw size={10} /> Cambiar
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        if (aiEngine === 'VEO') {
                                                            copiarAlPortapapeles(getPromptMaestroVEO(workingMode, selectedSlogan));
                                                        } else {
                                                            copiarAlPortapapeles(generarPromptParaClip({ script: selectedSlogan }));
                                                        }
                                                    }}
                                                    className="text-[9px] bg-[#1A1A1A] hover:bg-[#00B140] hover:text-black transition-all border border-[#222] px-2 py-0.5 rounded-md text-[#555] font-black uppercase"
                                                >
                                                    Copiar Prompt
                                                </button>
                                            </div>
                                        </div>
                                        <textarea 
                                            value={selectedSlogan}
                                            onChange={(e) => setSelectedSlogan(e.target.value)}
                                            className="w-full bg-[#0D0D0D] p-1.5 rounded-lg border border-[#222] text-[12px] text-[#888] font-medium leading-relaxed italic resize-none outline-none focus:border-[#00B140]/50 focus:text-white transition-all h-12"
                                        />
                                    </div>
                                </>
                            )}

                            {workingMode === 'exterior' && (
                                <div className="flex flex-col gap-3 w-full bg-[#111] p-3 rounded-xl border border-[#1E1E1E]">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Camera size={14} className="text-[#00B140]" />
                                        <h3 className="text-[10px] font-black text-[#00B140] tracking-widest uppercase">Entorno Exterior</h3>
                                    </div>
                                    
                                    {/* HORARIO Y CLIMA */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-[#161616] p-2 rounded-xl border border-[#222]">
                                            <label className="block text-[9px] font-bold text-[#888] uppercase tracking-widest mb-1.5">Horario</label>
                                            <select 
                                                value={extHorario}
                                                onChange={(e) => setExtHorario(e.target.value)}
                                                className="w-full bg-[#0D0D0D] border border-[#222] rounded-lg p-1.5 text-[11px] font-black text-[#fff] focus:border-[#00B140] outline-none transition-all cursor-pointer hover:border-[#333]"
                                            >
                                                <option value="MAÑANA">MAÑANA</option>
                                                <option value="TARDE">TARDE</option>
                                                <option value="NOCHE">NOCHE</option>
                                            </select>
                                        </div>
                                        <div className="bg-[#161616] p-2 rounded-xl border border-[#222]">
                                            <label className="block text-[9px] font-bold text-[#888] uppercase tracking-widest mb-1.5">Clima</label>
                                            <select 
                                                value={extClima}
                                                onChange={(e) => setExtClima(e.target.value)}
                                                className="w-full bg-[#0D0D0D] border border-[#222] rounded-lg p-1.5 text-[11px] font-black text-[#fff] focus:border-[#00B140] outline-none transition-all cursor-pointer hover:border-[#333]"
                                            >
                                                <option value="SOLEADO">SOLEADO</option>
                                                <option value="NUBLADO">NUBLADO</option>
                                                <option value="LLUVIA">LLUVIA</option>
                                                <option value="VIENTO">VIENTO</option>
                                                <option value="INDOOR">INDOOR</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* LOCACIÓN Y AGREGADO */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className={`bg-[#161616] p-2 rounded-xl border border-[#222] transition-opacity ${ (extClima !== 'SOLEADO' || extHorario === 'NOCHE') ? 'opacity-30' : 'opacity-100'}`}>
                                            <label className="block text-[9px] font-bold text-[#888] uppercase tracking-widest mb-1.5">Posición del Sol</label>
                                            <select 
                                                value={extPosicionSol}
                                                onChange={(e) => setExtPosicionSol(e.target.value)}
                                                disabled={extClima !== 'SOLEADO' || extHorario === 'NOCHE'}
                                                className="w-full bg-[#0D0D0D] border border-[#222] rounded-lg p-1.5 text-[11px] font-black text-[#fff] focus:border-[#00B140] outline-none transition-all cursor-pointer hover:border-[#333] disabled:cursor-not-allowed"
                                            >
                                                <option value="Luz Frontal (Front Lighting)">Luz Frontal (Front Lighting)</option>
                                                <option value="Luz Lateral izquierda (left Side Lighting)">Luz Lateral izquierda (left Side Lighting)</option>
                                                <option value="Luz Lateral derecha (rigth Side Lighting)">Luz Lateral derecha (rigth Side Lighting)</option>
                                                <option value="Contraluz (Backlighting)">Contraluz (Backlighting)</option>
                                                <option value="Luz de Tres Cuartos izq. (left Rembrandt Lighting)">Luz de Tres Cuartos izq. (left Rembrandt Lighting)</option>
                                                <option value="Luz de Tres Cuartos der. (rigth Rembrandt Lighting)">Luz de Tres Cuartos der. (rigth Rembrandt Lighting)</option>
                                                <option value="Luz Cenital (Top Lighting)">Luz Cenital (Top Lighting)</option>
                                            </select>
                                        </div>
                                        <div className="bg-[#161616] p-2 rounded-xl border border-[#222]">
                                            <label className="block text-[9px] font-bold text-[#888] uppercase tracking-widest mb-1.5">Agregado Ara</label>
                                            <select 
                                                value={extSpeechOption}
                                                onChange={(e) => setExtSpeechOption(e.target.value)}
                                                className="w-full bg-[#0D0D0D] border border-[#222] rounded-lg p-1.5 text-[11px] font-black text-[#fff] focus:border-[#00B140] outline-none transition-all cursor-pointer hover:border-[#333]"
                                            >
                                                <option value="SOLO SPEECH">SOLO SPEECH</option>
                                                <option value="SALUDO">SALUDO</option>
                                                <option value="CTA">CTA</option>
                                                <option value="SLOGAN">SLOGAN</option>
                                            </select>
                                        </div>
                                    </div>
                                    {/* ARA DICE (GUION EXTERIOR) */}
                                    <div className="bg-[#161616] p-2 rounded-xl border border-[#222]">
                                        <div className="flex justify-between items-center mb-1.5">
                                            <label className="text-[9px] font-bold text-[#888] uppercase tracking-widest">ARA DICE:</label>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-bold text-[#333] uppercase tracking-tighter">Max 20 palabras / oración</span>
                                                {(() => {
                                                    const sentences = extScript.split(/[.!?]+/).filter(s => s.trim().length > 0);
                                                    let maxWords = 0;
                                                    sentences.forEach(s => {
                                                        const count = s.trim().split(/\s+/).filter(w => w.length > 0).length;
                                                        if (count > maxWords) maxWords = count;
                                                    });
                                                    return (
                                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${maxWords > 20 ? 'bg-red-500/20 text-red-500' : 'bg-[#00B140]/10 text-[#00B140]'}`}>
                                                            {maxWords}/20
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                        <textarea 
                                            value={extScript}
                                            onChange={(e) => setExtScript(e.target.value)}
                                            placeholder="Escribe lo que Ara dirá en exteriores..."
                                            className="w-full h-24 bg-[#0D0D0D] border border-[#222] rounded-lg p-3 text-[12px] text-[#fff] font-medium focus:border-[#00B140] outline-none transition-all resize-none placeholder:text-[#333]"
                                        />
                                    </div>

                                    {/* ACCIÓN */}
                                    <div className="bg-[#161616] p-2 rounded-xl border border-[#222]">
                                        <div className="flex justify-between items-center mb-1.5">
                                            <label className="text-[9px] font-bold text-[#888] uppercase tracking-widest">Acción en cámara (Opcional)</label>
                                            {isTranslatingAction && (
                                                <span className="text-[8px] font-black text-[#00B140] animate-pulse">TRADUCIENDO...</span>
                                            )}
                                        </div>
                                        <textarea 
                                            value={extAccion}
                                            onChange={(e) => setExtAccion(e.target.value)}
                                            placeholder="Ej: Ara saluda con su mano libre..."
                                            className="w-full bg-[#0D0D0D] p-2 rounded-lg border border-[#222] text-[11px] text-[#fff] font-medium resize-none outline-none focus:border-[#00B140]/50 transition-all h-16"
                                        />
                                        {extAccionEN && !isTranslatingAction && (
                                            <div className="mt-2 p-1.5 bg-black/30 rounded border border-white/5">
                                                <p className="text-[9px] text-[#444] leading-tight italic">
                                                    <span className="font-bold text-[#666]">VEO-SYNC:</span> {extAccionEN}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>



                    {/* --- LISTA DE CLIPS DE PRODUCCIÓN --- */}
                    <div className="mt-8 flex-1 flex flex-col min-h-0">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Sparkles size={16} className="text-[#00B140]" />
                                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#888]">Clips de Producción</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={handleAutoRedactarScripts}
                                    disabled={isGeneratingScripts || productionClips.length === 0}
                                    className="px-3 py-1.5 bg-[#1A1A1A] border border-[#00B140]/30 text-[#00B140] rounded-md text-[9px] font-black uppercase tracking-tighter hover:bg-[#00B140]/10 transition-all disabled:opacity-30 flex items-center gap-2"
                                >
                                    {isGeneratingScripts ? <RefreshCw size={10} className="animate-spin" /> : <Wand2 size={10} />}
                                    IA: Redactar Guiones
                                </button>
                                <button 
                                onClick={async () => {
                                    if (productionClips.length === 0) {
                                        addToast('error', '✗ No hay clips en la lista de producción');
                                        return;
                                    }

                                    addToast('info', '✦ Iniciando Producción en Cadena (Extend Mode)');
                                    
                                    for (let i = 0; i < productionClips.length; i++) {
                                        // Refrescamos la referencia en cada iteración por seguridad
                                        const currentClips = productionClipsRef.current;
                                        const clip = currentClips[i];
                                        
                                        setProductionStep(i + 1);
                                        setEta((currentClips.length - i) * 45);

                                        // 1. Validar Guion
                                        if (!clip.script || clip.script.length < 5) {
                                            addToast('error', `✗ Clip ${i + 1} no tiene un guion válido.`);
                                            setProductionStep(null);
                                            setEta(null);
                                            return;
                                        }

                                        // 2. Auto-Generar Prompt si falta
                                        let activePrompt = clip.prompt;
                                        if (!activePrompt) {
                                            activePrompt = generarPromptParaClip(clip);
                                            // Actualizar clip localmente para handleGenerarVideo
                                            clip.prompt = activePrompt;
                                            clip.status = 'ready';
                                            // Sincronizar estado global
                                            setProductionClips(prev => prev.map(c => c.id === clip.id ? { ...c, prompt: activePrompt, status: 'ready' } : c));
                                        }

                                        // 3. Ejecutar y esperar renderizado
                                        await handleGenerarVideo(clip);
                                    }
                                    
                                    setProductionStep(null);
                                    setEta(null);
                                    addToast('success', '✓ Producción automática finalizada');
                                }}
                                className="px-3 py-1.5 bg-[#FFD700] text-black rounded-md text-[9px] font-black uppercase tracking-tighter hover:bg-[#FFC400] transition-all"
                            >
                                Producción VEO (Auto-Extend)
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-col gap-4 mb-6">
                            <div className="flex items-center justify-between">
                                <span className="bg-[#161616] px-2 py-0.5 rounded text-[9px] font-black text-[#444] border border-[#222]">
                                    {productionClips.length} SEGMENTOS
                                </span>
                                {productionStep !== null && (
                                    <div className="flex items-center gap-2">
                                        {eta !== null && (
                                            <span className="text-[9px] font-bold text-[#444] uppercase tracking-tighter">
                                                ETA: ~{Math.floor(eta / 60)}:{String(eta % 60).padStart(2, '0')} min
                                            </span>
                                        )}
                                        <span className="text-[9px] font-black text-[#00B140] uppercase tracking-tighter">
                                            Procesando {productionStep} de {productionClips.length}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {productionStep !== null && (
                                <div className="h-1.5 w-full bg-[#161616] rounded-full overflow-hidden border border-[#222]">
                                    <div 
                                        className="h-full bg-gradient-to-r from-[#00B140] to-[#00FF5A] transition-all duration-500 ease-out shadow-[0_0_10px_rgba(0,177,64,0.3)]"
                                        style={{ width: `${(productionStep / productionClips.length) * 100}%` }}
                                    ></div>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                            <div className="bg-[#111] rounded-2xl border border-[#1E1E1E] overflow-hidden">
                            {productionClips.length === 0 ? (
                                <div className="p-12 flex flex-col items-center justify-center text-center">
                                    <div className="w-12 h-12 rounded-full bg-[#1A1A1A] flex items-center justify-center mb-4">
                                        <Scissors size={20} className="text-[#333]" />
                                    </div>
                                    <p className="text-[10px] text-[#444] font-black uppercase tracking-[0.2em] max-w-[200px]">Pulse Generar Producción para crear los segmentos</p>
                                </div>
                            ) : (
                                <>
                                    <div className="divide-y divide-[#1E1E1E]">
                                        {productionClips.map((clip, i) => (
                                            <div key={clip.id} className="p-4 hover:bg-[#161616] transition-all group">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-5 h-5 rounded bg-[#1A1A1A] border border-[#222] flex items-center justify-center text-[9px] font-black text-[#555]">
                                                            {i + 1}
                                                        </span>
                                                        <span className="text-[10px] font-black text-[#888] uppercase tracking-tighter">Segmento {i + 1}</span>
                                                    </div>
                                                    <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border ${
                                                        clip.status === 'ready' ? 'bg-[#00B140]/10 border-[#00B140]/20 text-[#00B140]' :
                                                        clip.status === 'generating' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500 animate-pulse' :
                                                        'bg-[#1A1A1A] border-[#222] text-[#444]'
                                                    }`}>
                                                        {clip.status === 'ready' ? 'LISTO' : clip.status === 'generating' ? 'GENERANDO' : 'PENDIENTE'}
                                                    </div>
                                                </div>

                                                <textarea 
                                                    value={clip.script}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setProductionClips(prev => prev.map(c => c.id === clip.id ? { ...c, script: val } : c));
                                                    }}
                                                    className="w-full h-16 bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg p-3 text-[11px] text-[#888] font-medium focus:border-[#00B140]/50 focus:text-white transition-all resize-none outline-none mb-3"
                                                />

                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => {
                                                            const p = generarPromptParaClip(clip);
                                                            copiarAlPortapapeles(p);
                                                        }}
                                                        className="flex-1 h-8 bg-[#1A1A1A] border border-[#222] text-[#888] rounded-md text-[9px] font-black uppercase tracking-widest hover:bg-[#00B140] hover:text-black hover:border-[#00B140] transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <RefreshCw size={12} /> Copiar Prompt Veo
                                                    </button>
                                                    {clip.videoUrl && (
                                                        <button 
                                                            onClick={() => {
                                                                setPreviewVideoUrl(clip.videoUrl || null);
                                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                                            }}
                                                            className="w-8 h-8 bg-[#1A1A1A] border border-[#222] text-[#888] rounded-md flex items-center justify-center hover:bg-white hover:text-black transition-all"
                                                        >
                                                            <Play size={12} />
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => setProductionClips(prev => prev.filter(c => c.id !== clip.id))}
                                                        className="w-8 h-8 flex items-center justify-center bg-[#1A1A1A] border border-[#222] rounded-md text-[#333] hover:text-red-500 transition-all"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="p-4 bg-[#161616] border-t border-[#1E1E1E]">
                                        <button 
                                            onClick={() => {
                                                const allPrompts = productionClips
                                                    .map(c => generarPromptParaClip(c))
                                                    .join('\n\n');
                                                copiarAlPortapapeles(allPrompts);
                                            }}
                                            className="w-full h-10 bg-[#00B140] text-black rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#00CC48] transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-[0_4px_15px_rgba(0,177,64,0.2)]"
                                        >
                                            <Sparkles size={14} /> Copiar Prompts (1 x Línea)
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* TOAST NOTIFICATIONS */}
            <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none">
                {toasts.map(toast => (
                    <div 
                        key={toast.id}
                        className={`
                            w-[320px] p-[14px_16px] rounded-lg border-l-[3px] shadow-2xl flex items-center gap-3
                            pointer-events-auto animate-toast-enter
                            ${toast.type === 'success' ? 'bg-[#0D2B1A] border-[#00B140] text-[#00CC48]' : ''}
                            ${toast.type === 'warning' ? 'bg-[#2B1F0D] border-[#F59E0B] text-[#F59E0B]' : ''}
                            ${toast.type === 'error' ? 'bg-[#2B0D0D] border-[#EF4444] text-[#EF4444]' : ''}
                        `}
                    >
                        <span className="text-[13px] font-medium leading-tight">
                            {toast.message}
                        </span>
                    </div>
                ))}
            </div>

            {/* VESTUARIO GALLERY MODAL */}
            {isGalleryOpen && (
                <div className="fixed inset-0 z-[99999] bg-[#0A0A0A]/90 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
                        {/* Header */}
                        <div className="p-4 border-b border-[#2A2A2A] flex justify-between items-center bg-[#1A1A1A]">
                            <h3 className="text-[#00B140] font-medium flex items-center gap-2">
                                <FolderOpen size={18} />
                                Explorador de Vestuario ({workingMode.toUpperCase()})
                            </h3>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => {
                                        if (selectedVestuario.size === 31) setSelectedVestuario(new Set());
                                        else setSelectedVestuario(new Set(['REF', ...Array.from({length:30}, (_,i)=>String(i+1).padStart(2,'0'))]));
                                    }}
                                    className="text-xs bg-[#2A2A2A] hover:bg-[#333] tracking-wide text-gray-300 px-3 py-1.5 rounded transition"
                                >
                                    Sel. Todo
                                </button>
                                <button 
                                    onClick={copySelectedToClipboard}
                                    className="text-xs font-bold tracking-wide bg-[#1A1A1A] border border-[#00B140] text-[#00B140] px-4 py-1.5 rounded hover:bg-[#00B140] hover:text-black transition flex items-center gap-2"
                                >
                                    Copiar Fotos ({selectedVestuario.size})
                                </button>
                                <button 
                                    onClick={downloadSelectedVestuario}
                                    className="text-xs font-bold tracking-wide bg-[#00B140] hover:bg-[#00CC48] text-black px-4 py-1.5 rounded transition"
                                >
                                    Descargar ({selectedVestuario.size})
                                </button>
                                <button onClick={() => setIsGalleryOpen(false)} className="text-gray-400 hover:text-white transition-colors p-1 ml-2">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Body Container (handles lasso mousedown) */}
                        <div 
                            className="p-6 overflow-y-auto flex-1 custom-scrollbar select-none relative"
                            ref={galleryRef}
                            onMouseDown={handleGalleryMouseDown}
                        >
                            <p className="text-gray-400 text-sm mb-6 flex items-center gap-2">
                                <span className="bg-[#2A2A2A] text-xs px-2 py-0.5 rounded">Click + Arrastrar</span> crea un cuadro de selección (Lazo). <span className="bg-[#2A2A2A] text-xs px-2 py-0.5 rounded">Ctrl + Click</span> selecciona múltiples de a una.
                            </p>

                            <div className="flex gap-8">
                                {/* Left Pane: Reference */}
                                <div className="w-[18%] flex flex-col gap-3">
                                    <span className="text-xs text-gray-400 font-bold tracking-widest pl-1">REFERENCIA</span>
                                    <div 
                                        className={`vestuario-item relative group rounded-lg transition-all duration-75 border-[3px] p-1 
                                            ${selectedVestuario.has('REF') ? 'border-[#00B140] bg-[#00B140]/10' : 'border-transparent hover:border-[#333]'}`}
                                        data-id="REF"
                                        onClick={(e) => handleVestuarioClick(e, 'REF')}
                                    >
                                        <div className="text-[10px] absolute top-2 left-2 bg-[#00B140] text-black px-2 py-0.5 rounded font-bold z-10 shadow-lg pointer-events-none">IMAGEN_BASE</div>
                                        <img 
                                            src={`https://media.saladillovivo.com.ar/vestuario_de_hoy_${workingMode === 'estudio' ? 'estudio' : 'exteriores'}/REFERENCE_IMAGE.PNG?t=${imageTimestamp}`}
                                            className="w-full aspect-[9/16] object-cover rounded-md cursor-grab active:cursor-grabbing shadow-lg"
                                            draggable="true"
                                            onDragStart={(e) => handleVestuarioDragStart(e, 'REF')}
                                            alt="Reference"
                                        />
                                    </div>
                                </div>

                                {/* Right Pane: Grid of 30 copies into 10 cols X 3 rows */}
                                <div className="w-[82%] flex flex-col gap-3">
                                    <span className="text-xs text-gray-400 font-bold tracking-widest pl-1">COPIAS NUMERADAS (ALINEADAS)</span>
                                    <div className="grid grid-cols-10 gap-2">
                                        {Array.from({ length: 30 }, (_, i) => {
                                            const numStr = String(i + 1).padStart(2, '0');
                                            const isSelected = selectedVestuario.has(numStr);
                                            return (
                                                <div 
                                                    key={numStr} 
                                                    className={`vestuario-item flex flex-col relative group transition-all duration-75 rounded-md border-[3px] p-0.5
                                                        ${isSelected ? 'border-[#00B140] bg-[#00B140]/20 scale-95' : 'border-transparent hover:border-[#333]'}`}
                                                    data-id={numStr}
                                                    onClick={(e) => handleVestuarioClick(e, numStr)}
                                                >
                                                    <div className="text-[9px] absolute top-1 left-1 bg-black text-gray-200 px-1 py-0.5 rounded backdrop-blur-md pointer-events-none z-10">{numStr}</div>
                                                    <img 
                                                        src={`https://media.saladillovivo.com.ar/vestuario_de_hoy_${workingMode === 'estudio' ? 'estudio' : 'exteriores'}/${numStr}.png?t=${imageTimestamp}`}
                                                        className="w-full aspect-square object-cover rounded shadow-sm cursor-grab active:cursor-grabbing"
                                                        draggable="true"
                                                        onDragStart={(e) => handleVestuarioDragStart(e, numStr)}
                                                        alt={`Copia ${numStr}`}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Lasso Box Drawing */}
                        {lasso.isSelecting && (
                            <div 
                                style={{
                                    position: 'fixed',
                                    border: '1px solid rgba(0, 177, 64, 0.8)',
                                    backgroundColor: 'rgba(0, 177, 64, 0.2)',
                                    left: Math.min(lasso.x1, lasso.x2),
                                    top: Math.min(lasso.y1, lasso.y2),
                                    width: Math.abs(lasso.x2 - lasso.x1),
                                    height: Math.abs(lasso.y2 - lasso.y1),
                                    pointerEvents: 'none',
                                    zIndex: 9999999
                                }}
                            />
                        )}
                    </div>
                </div>
            )}
            {/* BACKGROUND GALLERY MODAL */}
            {isBgGalleryOpen && (
                <div className="fixed inset-0 z-[99999] bg-[#000]/95 backdrop-blur-xl flex items-center justify-center p-6">
                    <div className="bg-[#0A0A0A] border border-[#222] rounded-3xl w-full max-w-7xl max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden relative">
                        {/* Header */}
                        <div className="p-6 border-b border-[#1A1A1A] flex justify-between items-center bg-gradient-to-r from-[#0D0D0D] to-[#111]">
                            <div className="flex flex-col">
                                <h3 className="text-[#00B140] text-lg font-black uppercase tracking-[0.3em] flex items-center gap-3">
                                    <Camera size={22} />
                                    Locación: {bgFolderPath.replace('_', ' ')}
                                </h3>
                                <span className="text-[10px] text-[#444] font-bold uppercase tracking-widest mt-1">Explorando saladillovivo-media/{bgFolderPath}</span>
                            </div>
                            <button 
                                onClick={() => setIsBgGalleryOpen(false)} 
                                className="w-10 h-10 rounded-full bg-[#1A1A1A] text-[#444] hover:text-white hover:bg-red-500/20 hover:border-red-500/50 border border-[#222] transition-all flex items-center justify-center"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Grid */}
                        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                {bgList.map((bg) => (
                                        <div 
                                            key={bg.key} 
                                            className={`flex flex-col relative group transition-all duration-75 rounded-md border-[3px] p-0.5
                                                ${selectedBg === bg.url ? 'border-[#00B140] bg-[#00B140]/20 scale-95' : 'border-transparent hover:border-[#333]'}`}
                                            data-id={bg.key}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedBg(bg.url);
                                            }}
                                        >
                                            <div className="text-[9px] absolute top-1 left-1 bg-black text-gray-200 px-1 py-0.5 rounded backdrop-blur-md pointer-events-none z-10">
                                                {bg.name}
                                            </div>
                                            <img 
                                                src={bg.url}
                                                className="w-full aspect-video object-cover rounded shadow-sm cursor-grab active:cursor-grabbing"
                                                draggable="true"
                                                onDragStart={(e) => handleBgDragStart(e, bg.url, bg.name)}
                                                alt={`Fondo ${bg.name}`}
                                            />
                                        </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer info */}
                        <div className="p-4 bg-[#0D0D0D] border-t border-[#1A1A1A] flex justify-between items-center px-8">
                            <p className="text-[10px] text-[#444] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#00B140] animate-pulse"></div>
                                Un clic selecciona • Doble clic confirma • Arrastra a otra ventana
                            </p>
                            <button 
                                onClick={() => {
                                    if (selectedBg) {
                                        setIsBgGalleryOpen(false);
                                        addToast('success', `✓ Selección confirmada`);
                                    }
                                }}
                                disabled={!selectedBg}
                                className={`px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest transition-all ${selectedBg ? 'bg-[#00B140] text-black hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(0,177,64,0.2)]' : 'bg-[#1A1A1A] text-[#333] cursor-not-allowed'}`}
                            >
                                Seleccionar Fondo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AvatarStudio;
