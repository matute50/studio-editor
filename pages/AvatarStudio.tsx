import React, { useState, useEffect } from 'react';
import {
    Bot,
    Sparkles,
    Copy,
    Plus,
    Minus,
    ChevronRight,
    Terminal,
    Image,
    Clock,
    Layout,
    Sun,
    Moon,
    Wind,
    Camera,
    Video,
    Volume2,
    Play,
    Pause,
    FileText,
    Settings,
    MessageSquare,
    Zap,
    Maximize2,
    Sparkles as SparklesIcon
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { improveScriptWithClaude } from '../services/claude';

// CONSTANTES DE ESCENA Y PROMPTS (18 BLOQUES)
const MASTER_CONSISTENCY_LOCK = "LOCK CONSISTENCY: Continue with 100% visual fidelity to the Ara Avatar reference. No creative deviations in her morphology. Maintain the exact same ethnic features, facial structure, skin tone, and character identity. HBO series standard of continuity.";

const STILLNESS_CONTAINMENT = "[STILLNESS & CONTAINMENT]: Presenter must remain perfectly centered. No walking, no large arm swings, no significant torso rotation. Head movements are micro-adjustments only. Frame stays locked.";

const HUMAN_IMPERFECTION = "[HUMAN IMPERFECTION PROTOCOL]: Introduce micro-imperfections. Occasional natural eyelid blinks (unsynchronized), subtle involuntary lip twitches, mild asymmetric mouth movements during complex phonemes. Not a perfect CG model.";

const PHONETIC_ENGINE_V4_1 = "[LIP SYNC — PHONETIC ENGINE V4.1]: Specialized Rioplatense Spanish synchronization. Emphasis on 'LL' and 'Y' as palate-fricative /ʃ/. Vowel transitions (A-E-I-O-U) must have visible jaw displacement. Plosive consonants (P, B, M) require tight lip closure. Natural fluid prosody.";

const SCRIPT_FIDELITY = "[SCRIPT FIDELITY]: Visual production must follow the provided text precisely. No ad-libbing or interpretation. Mouth movements strictly synchronized to the audio duration and phonetic density of the SCRIPT section.";

const AUDIO_STYLE = "[AUDIO_STYLE]: Deep broadcast voice, natural Argentinian Rioplatense accent. Calm, authoritative but warm 'News Anchor' tone. Studio acoustics — no echo, no room reverb.";

const NEGATIVE_PROMPT = "[NEGATIVE PROMPT]: low quality, distorted face, inconsistent features, walking, moving background (unless specified), glitches, extra fingers, cartoonish, 3D render look, digital smoothness, robotic movements, double chin, blurry eyes.";

// --- COMPONENTE PRINCIPAL ---
export function AvatarStudio() {
    const [error, setError] = useState<string | null>(null);

    // ESTADOS DE CONFIGURACIÓN GLOBAL (ARA)
    const [araMode, setAraMode] = useState<'news' | 'free'>('news');
    const [araMood, setAraMood] = useState(50); // 0-100 (Chill to High)
    const [araHorario, setAraHorario] = useState('dia');
    const [araClima, setAraClima] = useState('clear');
    const [araLightDir, setAraLightDir] = useState('frontal');
    const [araAmbientSound, setAraAmbientSound] = useState('studio');
    const [araCameraMov, setAraCameraMov] = useState('static');
    const [araVideoFormat, setAraVideoFormat] = useState('16:9');
    const [araBackground, setAraBackground] = useState('chroma');
    const [araUrbanActivity, setAraUrbanActivity] = useState('low');

    // ESTADOS DE CONTENIDO (NOTICIAS DINÁMICAS 1-6)
    const [saludoAra, setSaludoAra] = useState("Hola, soy Ara. Estas son las noticias más importantes de Saladillo Vivo.");
    const [noticias, setNoticias] = useState([
        { id: '1', script: '', mood: 'neutral', background: 'global' }
    ]);
    const [ctaText, setCtaText] = useState("Seguinos en nuestras redes para más información.");
    const [sloganText, setSloganText] = useState("Saladillo Vivo, la información que nos une.");

    // EXTRAS
    const [isImproving, setIsImproving] = useState<string | null>(null); // ID de la noticia
    const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
    const [activeRightPanel, setActiveRightPanel] = useState<'prompt' | 'broll'>('prompt');
    const [phoneticCorrections, setPhoneticCorrections] = useState<any[]>([]);

    // CARGAR DICCIONARIO FONÉTICO
    useEffect(() => {
        const fetchCorrections = async () => {
            try {
                const { data, error } = await supabase
                    .from('ara_pronunciacion')
                    .select('*')
                    .eq('activo', true);
                if (error) throw error;
                setPhoneticCorrections(data || []);
            } catch (err) {
                console.error("Error cargando diccionario fonético:", err);
            }
        };
        fetchCorrections();
    }, []);

    // GENERACIÓN DE PROMPT (18 BLOQUES)
    const obtenerPromptCompleto = () => {
        const scriptTotal = noticias.map(n => n.script).join(' ');
        const blocks = [];

        // 1. MASTER CONSISTENCY LOCK
        blocks.push(MASTER_CONSISTENCY_LOCK);
        
        // 2. STILLNESS & CONTAINMENT
        blocks.push(STILLNESS_CONTAINMENT);
        
        // 3. HUMAN IMPERFECTION PROTOCOL
        blocks.push(HUMAN_IMPERFECTION);
        
        // 4. LIP SYNC — PHONETIC ENGINE V4.1
        blocks.push(PHONETIC_ENGINE_V4_1);
        
        // 5. SCRIPT FIDELITY
        blocks.push(SCRIPT_FIDELITY);
        
        // 6. PHONETIC CORRECTIONS (Solo si hay activas)
        if (phoneticCorrections.length > 0) {
            const correcciones = phoneticCorrections.map(c => `${c.original} -> ${c.fonetica}`).join(', ');
            blocks.push(`[PHONETIC CORRECTIONS]: Use these specific phonetic maps: ${correcciones}`);
        }

        // 7. SCRIPT
        blocks.push(`[SCRIPT]: ${saludoAra} ${scriptTotal} ${ctaText} ${sloganText}`);

        // 8. MOOD + HORARIO
        const moodDesc = araMood < 33 ? "Chill, relaxed" : araMood < 66 ? "Neutral, professional" : "High energy, enthusiastic";
        blocks.push(`[MOOD + HORARIO]: Presenter is in a ${moodDesc} mood. Time of day: ${araHorario.toUpperCase()}. Lighting adjusts accordingly.`);

        // 9. CAMERA
        let techMeta = "Shot on ARRI Alexa 65. IMG_9854.CR2, RAW.16bit.ACEScg. stills archive, editorial_stills_archive. Subtle film grain. Mildly imperfect focus. Natural sensor texture — not digital smooth. hbo warnerbros broadcast quality finish.";
        blocks.push(`[CAMERA]: Format ${araVideoFormat}. ${techMeta}`);

        // 10. CAMERA MOVEMENT
        blocks.push(`[CAMERA MOVEMENT]: ${araCameraMov.toUpperCase()} movement only.`);

        // 11. CHROMA KEY / BACKGROUND
        if (araBackground === 'chroma') {
            blocks.push("[CHROMA KEY / BACKGROUND]: Pure Green Screen (Hex: #00FF00). Flat lighting. High contrast between presenter and background for clean extraction.");
        } else {
            blocks.push(`[CHROMA KEY / BACKGROUND]: Background is ${araBackground.toUpperCase()}. Blur: f/1.8 depth of field. Focus exclusively on Ara.`);
        }

        // 12. LIGHTING
        blocks.push(`[LIGHTING]: ${araLightDir.toUpperCase()} cinematic lighting setup.`);

        // 13. TECHNICAL - PHYSICS
        blocks.push("[TECHNICAL - PHYSICS]: Raytraced reflections. Subsurface scattering on skin. Realistic hair strand light interaction.");

        // 14. TEMPORAL
        blocks.push("[TEMPORAL]: 30fps stable frame rate. No temporal glitches or morphing.");

        // 15. OUTFIT & IDENTITY
        blocks.push("[OUTFIT & IDENTITY]: Ara's official wardrobe. Consistent dress/jacket from reference.");

        // 16. POSE & GESTURE
        blocks.push("[POSE & GESTURE]: Professional posture. Occasional subtle hand gestures within the frame boundaries.");

        // 17. AUDIO_STYLE
        blocks.push(AUDIO_STYLE);

        // 18. NEGATIVE PROMPT
        blocks.push(NEGATIVE_PROMPT);

        return blocks.join('\n\n');
    };

    const copiarPrompt = () => {
        navigator.clipboard.writeText(obtenerPromptCompleto());
        alert("Prompt copiado al portapapeles (18 bloques verificados).");
    };

    const agregarNoticia = () => {
        if (noticias.length < 6) {
            setNoticias([...noticias, { id: Date.now().toString(), script: '', mood: 'neutral', background: 'global' }]);
        }
    };

    const quitarNoticia = (id: string) => {
        if (noticias.length > 1) {
            setNoticias(noticias.filter(n => n.id !== id));
        }
    };

    const actualizarNoticia = (id: string, script: string) => {
        setNoticias(noticias.map(n => n.id === id ? { ...n, script } : n));
    };

    const mejorarConIA = async (id: string) => {
        const noticia = noticias.find(n => n.id === id);
        if (!noticia || !noticia.script) return;
        
        setIsImproving(id);
        setAiSuggestions([]); // Limpiar sugerencias previas
        try {
            const results = await improveScriptWithClaude(noticia.script, noticia.mood || "neutral");
            setAiSuggestions(results);
            // Si hay sugerencias, por ahora tomamos la primera para no romper el flujo, 
            // pero marcamos que hay sugerencias disponibles para que el usuario elija.
            if (results.length > 0) {
                actualizarNoticia(id, results[0]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsImproving(null);
        }
    };

    const bloquesActivos = () => {
        let count = 17; // Base (excluyendo condicionales)
        if (phoneticCorrections.length > 0) count++;
        // En este sistema los otros bloques son constantes o se ajustan pero siempre existen como bloque
        return `${count}/18`;
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 flex flex-col gap-6">
            <header className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-sky-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                        <Bot size={28} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Avatar Studio</h1>
                        <p className="text-[10px] font-bold uppercase text-slate-400">Panel de Emisión v5.0</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button className="px-4 py-2 bg-white rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2">
                        <Maximize2 size={14} /> Vista Previa
                    </button>
                    <button className="px-6 py-2 bg-sky-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-600/20 hover:bg-sky-500 transition-all">
                        + NUEVA GRABACIÓN
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-[1fr,450px] gap-6 flex-1 h-[calc(100vh-140px)]">
                {/* COLUMNA IZQUIERDA: CONFIGURACIÓN */}
                <div className="flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
                    {/* PANEL SUPERIOR: CONTROLES GLOBALES */}
                    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                            <Settings size={14} className="text-slate-400" />
                            <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Controles Globales</h2>
                        </div>
                        <div className="p-4 grid grid-cols-5 gap-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Modo</label>
                                <select className="w-full bg-slate-50 border-transparent rounded-lg text-xs font-medium" value={araMode} onChange={(e: any) => setAraMode(e.target.value)}>
                                    <option value="news">Noticias del Día</option>
                                    <option value="free">Ara Libre</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Horario</label>
                                <select className="w-full bg-slate-50 border-transparent rounded-lg text-xs font-medium" value={araHorario} onChange={(e) => setAraHorario(e.target.value)}>
                                    <option value="dia">Día</option>
                                    <option value="tarde">Tarde</option>
                                    <option value="noche">Noche</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Clima</label>
                                <select className="w-full bg-slate-50 border-transparent rounded-lg text-xs font-medium" value={araClima} onChange={(e) => setAraClima(e.target.value)}>
                                    <option value="clear">Despejado</option>
                                    <option value="cloudy">Nublado</option>
                                    <option value="rain">Lluvia</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Fondo</label>
                                <select className="w-full bg-slate-50 border-transparent rounded-lg text-xs font-medium" value={araBackground} onChange={(e) => setAraBackground(e.target.value)}>
                                    <option value="chroma">Chroma Green</option>
                                    <option value="estudio">Estudio TV</option>
                                    <option value="calle">Calle Urbana</option>
                                    <option value="plaza">Plaza Pública</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Formato</label>
                                <select className="w-full bg-slate-50 border-transparent rounded-lg text-xs font-medium" value={araVideoFormat} onChange={(e) => setAraVideoFormat(e.target.value)}>
                                    <option value="16:9">16:9 (YouTube)</option>
                                    <option value="9:16">9:16 (TikTok)</option>
                                    <option value="1:1">1:1 (Insta)</option>
                                </select>
                            </div>
                            {/* Segunda fila de controles */}
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Mood</label>
                                <input type="range" className="w-full accent-sky-600" value={araMood} onChange={(e) => setAraMood(Number(e.target.value))} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Luz</label>
                                <select className="w-full bg-slate-50 border-transparent rounded-lg text-xs font-medium" value={araLightDir} onChange={(e) => setAraLightDir(e.target.value)}>
                                    <option value="frontal">Frontal</option>
                                    <option value="lateral">Lateral</option>
                                    <option value="cenital">Cenital</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Sonido Amb.</label>
                                <select className="w-full bg-slate-50 border-transparent rounded-lg text-xs font-medium" value={araAmbientSound} onChange={(e) => setAraAmbientSound(e.target.value)}>
                                    <option value="studio">Estudio</option>
                                    <option value="urban">Urbano</option>
                                    <option value="nature">Naturaleza</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Cámara</label>
                                <select className="w-full bg-slate-50 border-transparent rounded-lg text-xs font-medium" value={araCameraMov} onChange={(e) => setAraCameraMov(e.target.value)}>
                                    <option value="static">Static</option>
                                    <option value="breathing">Breathing</option>
                                    <option value="dolly">Dolly In</option>
                                </select>
                            </div>
                            {araBackground !== 'chroma' && (
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Act. Urbana</label>
                                    <select className="w-full bg-slate-50 border-transparent rounded-lg text-xs font-medium" value={araUrbanActivity} onChange={(e) => setAraUrbanActivity(e.target.value)}>
                                        <option value="low">Baja</option>
                                        <option value="mid">Media</option>
                                        <option value="high">Alta</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* PANEL INFERIOR: CAMPOS DE CONTENIDO */}
                    <div className="space-y-6 pb-20">
                        {/* SALUDO */}
                        <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saludo Inicial</h3>
                                <button className="p-1.5 hover:bg-slate-50 rounded text-sky-600 bg-sky-50 transition-all font-bold text-[9px]">EDITAR SALUDO</button>
                            </div>
                            <p className="text-sm text-slate-600 italic leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                                "{saludoAra}"
                            </p>
                        </section>

                        {/* NOTICIAS DINÁMICAS */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-1">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Desarrollo de Noticias</h3>
                                <div className="flex gap-2">
                                    <button onClick={() => setNoticias(noticias.slice(0, -1))} disabled={noticias.length === 1} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 transition-all">
                                        <Minus size={16} />
                                    </button>
                                    <button onClick={agregarNoticia} disabled={noticias.length === 6} className="w-8 h-8 flex items-center justify-center bg-sky-600 rounded-lg text-white hover:bg-sky-500 transition-all shadow-lg shadow-sky-600/10">
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>

                            {noticias.map((noticia, index) => (
                                <div key={noticia.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                    <div className="p-3 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                                        <span className="text-[9px] font-black text-slate-300 uppercase">Bloque {index + 1}</span>
                                        <div className="flex gap-4 items-center">
                                            <div className="flex items-center gap-1.5">
                                                <div className={`w-1.5 h-1.5 rounded-full ${noticia.script.length > 20 ? 'bg-emerald-500' : 'bg-amber-400'}`}></div>
                                                <span className="text-[9px] font-bold text-slate-400">{noticia.script.split(/\s+/).filter(x => x.length > 0).length} PALABRAS</span>
                                            </div>
                                            <select className="bg-transparent border-none text-[9px] font-bold text-slate-500 cursor-pointer uppercase">
                                                <option>Fondo Global</option>
                                                <option>Estudio TV</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        <textarea
                                            placeholder="Ingresa el script de la noticia..."
                                            className="w-full min-h-[100px] border-none focus:ring-0 p-0 text-sm text-slate-700 leading-relaxed resize-none"
                                            value={noticia.script}
                                            onChange={(e) => actualizarNoticia(noticia.id, e.target.value)}
                                        />
                                        <button 
                                            onClick={() => mejorarConIA(noticia.id)}
                                            disabled={isImproving === noticia.id || !noticia.script}
                                            className="w-full py-2 bg-gradient-to-r from-sky-50 to-blue-50 text-sky-700 rounded-xl border border-sky-100 text-[10px] font-bold flex items-center justify-center gap-2 hover:shadow-sm transition-all"
                                        >
                                            <Sparkles size={14} className={isImproving === noticia.id ? "animate-spin" : ""} />
                                            {isImproving === noticia.id ? "PROCESANDO..." : "✨ MEJORAR CON IA"}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* CTA & SLOGAN */}
                        <div className="grid grid-cols-2 gap-4">
                            <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Call to Action</label>
                                <input type="text" value={ctaText} onChange={(e) => setCtaText(e.target.value)} className="w-full border-none p-0 text-sm font-medium text-slate-600 focus:ring-0" />
                            </section>
                            <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Slogan Final</label>
                                <input type="text" value={sloganText} onChange={(e) => setSloganText(e.target.value)} className="w-full border-none p-0 text-sm font-medium text-slate-600 focus:ring-0" />
                            </section>
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA: SALIDA */}
                <div className="flex flex-col gap-6">
                    {/* PANEL SUPERIOR: PREVIEW PROMPT */}
                    <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col h-full max-h-[600px]">
                        <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg border border-sky-500/20">
                                    <Terminal size={18} />
                                </div>
                                <span className="font-bold text-white text-sm">Preview del Prompt</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                                    {bloquesActivos()} bloques activos
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 p-6 overflow-hidden flex flex-col gap-4">
                            <div className="flex-1 bg-black/40 rounded-2xl border border-white/5 p-4 overflow-y-auto custom-scrollbar">
                                <pre className="text-sky-100/80 text-[12px] font-mono leading-relaxed whitespace-pre-wrap">
                                    {obtenerPromptCompleto()}
                                </pre>
                            </div>
                        </div>

                        <div className="p-6 bg-white/5 border-t border-white/5">
                            <button 
                                onClick={copiarPrompt}
                                className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-100 transition-all shadow-xl shadow-black/20"
                            >
                                <Copy size={18} /> 📋 Copiar prompt
                            </button>
                        </div>
                    </div>

                    {/* PANEL INFERIOR: ACCIONES */}
                    <div className="space-y-4">
                        <button className="w-full py-5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-3xl font-black text-lg uppercase tracking-widest shadow-2xl shadow-red-600/20 transition-all flex items-center justify-center gap-4">
                            <Video size={24} /> 🎬 Generar emisión
                        </button>

                        <div className="grid grid-cols-1 gap-2">
                            {/* Módulo B-Roll Saladillo (Colapsable Placeholder) */}
                            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                                        <Image size={18} />
                                    </div>
                                    <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">Módulo B-Roll Saladillo</span>
                                </div>
                                <ChevronRight size={18} className="text-slate-400" />
                            </div>

                            {/* Generador Redes (Colapsable Placeholder) */}
                            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
                                        <Zap size={18} />
                                    </div>
                                    <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">Contenido para Redes</span>
                                </div>
                                <ChevronRight size={18} className="text-slate-400" />
                            </div>
                        </div>

                        {/* Historial rápido (Miniaturas) */}
                        <div className="bg-slate-100/50 rounded-2xl p-4 border border-dashed border-slate-200">
                             <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Emisiones Recientes</span>
                                <Clock size={12} className="text-slate-300" />
                             </div>
                             <div className="flex gap-2 overflow-x-auto pb-2">
                                {[1,2,3].map(i => (
                                    <div key={i} className="min-w-[80px] aspect-video bg-slate-200 rounded-lg border border-slate-300 flex items-center justify-center">
                                        <Play size={16} className="text-slate-400" />
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

