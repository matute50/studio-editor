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
import { generateAvatarVideo, optimizeBodyForAudio, adaptarTextoArgentino } from '../services/gemini';
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

const PROMPT_MAESTRO_SYSTEM = `[IDENTIDAD_VISUAL:ARA_BUENOS_AIRES] Using the provided reference image of the professional news anchor, maintain her exact facial identity, clothing, and background. Eye-level, locked-off medium shot. The video begins with a brief silent pause, perfectly matching the reference expression. Then, the anchor looks directly at the camera, enunciating clearly. She acts and speaks with a strong, authentic Rioplatense accent from Buenos Aires, using acute voseo stress and a melodic cadence. Audio: She speaks at a brisk but natural pace and says: "Fijate que el Colectivo Cartografía Contracultural pintó en la Escuela Veintiséis de Saladillo un mural muy copado. Pasá a verlo." Immediately after the final word, she closes her mouth and holds a static resting pose in complete silence until the video ends. Negative prompt: neutral Spanish, Mexican accent, Spanish accent, corporate motivational tone, changing facial identity, morphing, wipe transitions, fade out, scene cuts, text overlays, subtitles, captions, title cards, typography, visual filters, post-processing effects, background music, sound effects, SFX, ambient noise, audio artifacts, extra dialogue, off-script talking, lip movement without audio, voice before speech, voice after speech.`;

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
    const [extLocacion, setExtLocacion] = useState('PLAZA PRINCIPAL');
    const [extAccion, setExtAccion] = useState('');
    const [imageTimestamp, setImageTimestamp] = useState(Date.now());
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);

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
            if (lines.length > 0) setSelectedSaludo(lines[Math.floor(Math.random() * lines.length)].trim());
        }
        // Cargar CTA al azar
        if (ctaTxt) {
            const lines = ctaTxt.split(/\n/).filter(l => l.trim().length > 0);
            if (lines.length > 0) setSelectedCTA(lines[Math.floor(Math.random() * lines.length)].trim());
        }
        // Cargar Slogan al azar
        if (slogansTxt) {
            const lines = slogansTxt.split(/\n/).filter(l => l.trim().length > 0);
            if (lines.length > 0) setSelectedSlogan(lines[Math.floor(Math.random() * lines.length)].trim());
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

    // Cargar audios al montar y verificar vestuario diario
    useEffect(() => {
        fetchAudios();
        
        // Verificación de vestuario automático diario
        const checkVestuario = async () => {
            const today = new Date().toISOString().slice(0, 10);
            const lsKey = `last_vestuario_update_${workingMode}`;
            const lastUpdate = localStorage.getItem(lsKey);
            
            if (lastUpdate !== today) {
                console.log(`[Vestuario] Iniciando rotación diaria para: ${workingMode}`);
                try {
                    const res = await fetch('/api/cambiar-vestuario', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ location: workingMode === 'estudio' ? 'estudio' : 'exteriores' })
                    });
                    if (res.ok) {
                        localStorage.setItem(lsKey, today);
                        console.log(`[Vestuario] Rotación completada con éxito para ${workingMode}`);
                        setImageTimestamp(Date.now());
                    }
                } catch (err) {
                    console.error('[Vestuario] Error en rotación diaria:', err);
                }
            }
        };

        checkVestuario();
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
            const res = await fetch('/api/list-audios');
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
        // REGLA 2: Prompt de Producción Veo 3.1 (Lenguaje Natural, Sin Comillas)
        // El script ya viene pre-procesado con el "Sándwich Porteño" desde NewsEditor
        const scriptProcesado = adaptarTextoArgentino(clip.script);

        if (workingMode === 'exterior') {
            const isIndoor = extLocacion === 'HCD' || extLocacion === 'HALL MUNICIPALIDAD';
            const lightingDetails = isIndoor ? 'High-ceiling indoor lighting, floor reflections.' : '';
            const actionDetails = extAccion ? `Background Action: ${extAccion}.` : '';
            const audioEnv = isIndoor ? '**Apply indoor hall echo and slight voice resonance.**' : 'Include **ambient sounds matched to climate and time (birds/traffic/rain/machinery)**.';
            
            return `[IDENTIDAD_VISUAL:ARA_BUENOS_AIRES] Eye-level medium shot of Ara, the professional news anchor from the provided reference image. Photorealistic facial identity lock, skin texture and professional attire/outfit appropriate for the selected environment. 8K cinema style, 85mm. She is standing in front of the **exact ${extLocacion}** of Saladillo, using the **background reference image** for environmental details. Lighting and Color Description from your Matrix based on Time (${extHorario}) + Weather (${extClima}). ${lightingDetails} ${actionDetails} [ANCLA_CONTEXTUAL_RIOPLATENSE] Una periodista de Buenos Aires, hablando con energía profesional y autoridad local sobre el ruido del ambiente, dice: "${scriptProcesado}" [AUDIO_ENV_FX] Execute "ssh" as /ʃ/ (sheísmo) for "LL" and "Y". Maintain "L" standard. Prosody: á-áh for emphasis. ${audioEnv} Sound: complete studio silence. Close mouth immediately after the last phoneme. Negative prompt: neutral Spanish, slang, lunfardo, Spanish from Spain, generic background, new location, camera movement, background music, corporate motivational tone.`.replace(/\s+/g, ' ').trim();
        }

        return `[IDENTIDAD_VISUAL:ARA_BUENOS_AIRES] Using the provided reference image of the professional news anchor, maintain her exact facial identity, clothing, and background. Eye-level, locked-off medium shot. The video begins with a brief silent pause, perfectly matching the reference expression. Then, the anchor looks directly at the camera, enunciating clearly. She acts and speaks with a strong, authentic Rioplatense accent from Buenos Aires, using acute voseo stress and a melodic cadence. Audio: She speaks at a brisk but natural pace and says: "${scriptProcesado}" Immediately after the final word, she closes her mouth and holds a static resting pose in complete silence until the video ends. Negative prompt: neutral Spanish, Mexican accent, Spanish accent, corporate motivational tone, changing facial identity, morphing, wipe transitions, fade out, scene cuts, text overlays, subtitles, captions, title cards, typography, visual filters, post-processing effects, background music, sound effects, SFX, ambient noise, audio artifacts, extra dialogue, off-script talking, lip movement without audio, voice before speech, voice after speech.`;
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
                ? `https://media.saladillovivo.com.ar/vestuario_de_hoy_estudio/REFERENCE_IMAGE.PNG`
                : `https://media.saladillovivo.com.ar/vestuario_de_hoy_exteriores/REFERENCE_IMAGE.PNG`;
            
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
            const res = await fetch(`/api/delete-audio?fileName=${encodeURIComponent(fileName)}`, {
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
                            onClick={() => copiarAlPortapapeles(PROMPT_MAESTRO_SYSTEM)}
                            className="px-3 py-1.5 bg-[#1A1A1A] border border-[#00B140]/30 text-[#00B140] rounded-md text-[9px] font-black uppercase tracking-tighter hover:bg-[#00B140] hover:text-black transition-all flex items-center gap-2"
                        >
                            <Sparkles size={12} /> Prompt Maestro (System)
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
                                            src={workingMode === 'estudio' ? `https://media.saladillovivo.com.ar/vestuario_de_hoy_estudio/REFERENCE_IMAGE.PNG?t=${imageTimestamp}` : `https://media.saladillovivo.com.ar/vestuario_de_hoy_exteriores/REFERENCE_IMAGE.PNG?t=${imageTimestamp}`} 
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
                                                        if (lines.length > 0) setSelectedSaludo(lines[Math.floor(Math.random() * lines.length)].trim());
                                                    }}
                                                    className="text-[9px] bg-[#1A1A1A] hover:bg-[#333] transition-all border border-[#222] px-2 py-0.5 rounded-md text-[#888] font-black uppercase flex items-center gap-1"
                                                >
                                                    <RefreshCw size={10} /> Cambiar
                                                </button>
                                                <button 
                                                    onClick={() => copiarAlPortapapeles(generarPromptParaClip({ script: selectedSaludo }))}
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
                                                        if (lines.length > 0) setSelectedCTA(lines[Math.floor(Math.random() * lines.length)].trim());
                                                    }}
                                                    className="text-[9px] bg-[#1A1A1A] hover:bg-[#333] transition-all border border-[#222] px-2 py-0.5 rounded-md text-[#888] font-black uppercase flex items-center gap-1"
                                                >
                                                    <RefreshCw size={10} /> Cambiar
                                                </button>
                                                <button 
                                                    onClick={() => copiarAlPortapapeles(generarPromptParaClip({ script: selectedCTA }))}
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
                                                        if (lines.length > 0) setSelectedSlogan(lines[Math.floor(Math.random() * lines.length)].trim());
                                                    }}
                                                    className="text-[9px] bg-[#1A1A1A] hover:bg-[#333] transition-all border border-[#222] px-2 py-0.5 rounded-md text-[#888] font-black uppercase flex items-center gap-1"
                                                >
                                                    <RefreshCw size={10} /> Cambiar
                                                </button>
                                                <button 
                                                    onClick={() => copiarAlPortapapeles(generarPromptParaClip({ script: selectedSlogan }))}
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
                                            </select>
                                        </div>
                                    </div>

                                    {/* LOCACIÓN */}
                                    <div className="bg-[#161616] p-2 rounded-xl border border-[#222]">
                                        <label className="block text-[9px] font-bold text-[#888] uppercase tracking-widest mb-1.5">Locación</label>
                                        <select 
                                            value={extLocacion}
                                            onChange={(e) => setExtLocacion(e.target.value)}
                                            className="w-full bg-[#0D0D0D] border border-[#222] rounded-lg p-1.5 text-[11px] font-black text-[#fff] focus:border-[#00B140] outline-none transition-all cursor-pointer hover:border-[#333]"
                                        >
                                            <option value="PLAZA PRINCIPAL">PLAZA PRINCIPAL</option>
                                            <option value="CENTRO">CENTRO</option>
                                            <option value="MUNICIPALIDAD">MUNICIPALIDAD</option>
                                            <option value="HALL MUNICIPALIDAD">HALL MUNICIPALIDAD</option>
                                            <option value="HCD">HCD</option>
                                            <option value="COMISARIA">COMISARIA</option>
                                            <option value="OBRA PUBLICA">OBRA PUBLICA</option>
                                        </select>
                                    </div>

                                    {/* ACCIÓN */}
                                    <div className="bg-[#161616] p-2 rounded-xl border border-[#222]">
                                        <label className="block text-[9px] font-bold text-[#888] uppercase tracking-widest mb-1.5">Acción en cámara (Opcional)</label>
                                        <textarea 
                                            value={extAccion}
                                            onChange={(e) => setExtAccion(e.target.value)}
                                            placeholder="Ej: Gente caminando de fondo..."
                                            className="w-full bg-[#0D0D0D] p-2 rounded-lg border border-[#222] text-[11px] text-[#fff] font-medium resize-none outline-none focus:border-[#00B140]/50 transition-all h-16"
                                        />
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
                    <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
                        <div className="p-4 border-b border-[#2A2A2A] flex justify-between items-center bg-[#1A1A1A] rounded-t-2xl">
                            <h3 className="text-[#00B140] font-medium flex items-center gap-2">
                                <FolderOpen size={18} />
                                Galería de Vestuario ({workingMode.toUpperCase()})
                            </h3>
                            <button 
                                onClick={() => setIsGalleryOpen(false)}
                                className="text-gray-400 hover:text-white transition-colors p-1"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                            <p className="text-gray-400 text-sm mb-4">
                                Arrastra y suelta (drag and drop) cualquier imagen directamente hacia Luma, Runway o tu escritorio.
                            </p>
                            <div className="grid grid-cols-5 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-12 gap-1 auto-rows-max">
                                <div className="flex flex-col relative group col-span-2 row-span-2">
                                    <div className="text-[9px] absolute top-1 left-1 bg-[#00B140] text-black px-1 py-0.5 rounded font-bold z-10 shadow-lg pointer-events-none">REF.</div>
                                    <img 
                                        src={`https://media.saladillovivo.com.ar/vestuario_de_hoy_${workingMode === 'estudio' ? 'estudio' : 'exteriores'}/REFERENCE_IMAGE.PNG?t=${imageTimestamp}`}
                                        className="w-full h-full object-cover rounded-md border border-[#00B140] cursor-grab active:cursor-grabbing hover:brightness-110 transition-all shadow-xl"
                                        draggable="true"
                                        alt="Reference"
                                    />
                                </div>
                                {Array.from({ length: 30 }, (_, i) => {
                                    const numStr = String(i + 1).padStart(2, '0');
                                    return (
                                        <div key={numStr} className="flex flex-col relative group">
                                            <div className="text-[8px] absolute top-0.5 left-0.5 bg-black/80 text-gray-300 px-1 py-0.5 rounded backdrop-blur-md pointer-events-none z-10">{numStr}</div>
                                            <img 
                                                src={`https://media.saladillovivo.com.ar/vestuario_de_hoy_${workingMode === 'estudio' ? 'estudio' : 'exteriores'}/${numStr}.png?t=${imageTimestamp}`}
                                                className="w-full aspect-square object-cover rounded-sm border border-[#222] cursor-grab active:cursor-grabbing hover:border-[#00B140] transition-colors"
                                                draggable="true"
                                                alt={`Copia ${numStr}`}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default AvatarStudio;
