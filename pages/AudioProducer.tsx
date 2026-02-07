
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { optimizeBodyForAudio, generateSpeech, appendSloganToText } from '../services/gemini';
import { uploadAudioToR2 } from '../services/r2';
import { mixSpeechWithCustomIntro } from '../services/audioMixer';
import { Article } from '../types';
import {
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Play,
  Pause,
  Download,
  Sparkles,
  CheckCircle2,
  Music4,
  Radio,
  Coffee,
  Flame,
  Headphones,
  SlidersHorizontal,
  FastForward,
  Gavel,
  Trophy,
  PartyPopper,
  ShieldAlert,
  Ghost,
  AlertTriangle,
  Music2,
  Heart,
  Thermometer,
  Megaphone,
  Theater,
  Music
} from 'lucide-react';

const VOICE_OPTIONS = [
  { id: 'Kore', label: 'Lucía', desc: 'Central' },
  { id: 'Fenrir', label: 'Marcelo', desc: 'Policial' },
  { id: 'Aoede', label: 'Sofía', desc: 'Cultura' },
  { id: 'Charon', label: 'Claudio', desc: 'Deportes' },
  { id: 'Puck', label: 'Mateo', desc: 'Juvenil' },
  { id: 'Zephyr', label: 'Paula', desc: 'Clima' },
] as const;

const VIBE_OPTIONS = [
  { id: 'urgente', label: 'Flash: Al Aire Ya', icon: Flame, speed: 1.15, pitch: 'agudo', color: 'text-red-500' },
  { id: 'barrial', label: 'Crónica de Barrio', icon: Radio, speed: 1.0, pitch: 'medio', color: 'text-blue-400' },
  { id: 'solemne', label: 'Solemne / Fúnebre', icon: Heart, speed: 0.88, pitch: 'bajo', color: 'text-slate-400' },
  { id: 'relax', label: 'Mateando Tranca', icon: Coffee, speed: 0.85, pitch: 'bajo', color: 'text-orange-400' },
  { id: 'pnt', label: 'Venta PNT', icon: Megaphone, speed: 1.12, pitch: 'medio', color: 'text-yellow-500' },
  { id: 'cultural', label: 'Evento Cultural', icon: Theater, speed: 1.0, pitch: 'medio', color: 'text-indigo-400' },
  { id: 'deportivo', label: 'Evento Deportivo', icon: Trophy, speed: 1.25, pitch: 'agudo', color: 'text-green-500' },
  { id: 'sexy', label: 'Sexy', icon: Sparkles, speed: 0.88, pitch: 'bajo', color: 'text-pink-400' },
];

const CURTAIN_OPTIONS = [
  { id: 'none', label: 'SIN CORTINA (Solo Voz)', icon: Music2, url: '' },
  { id: 'news_classic', label: 'Noticias Clásica', icon: Radio, url: 'https://pub-5b294f92f42e4cbda687d0122e15bc72.r2.dev/audios/news-intro.mp3' },
  { id: 'politics', label: 'Política / Serio', icon: Gavel, url: 'https://pub-5b294f92f42e4cbda687d0122e15bc72.r2.dev/audios/curtain-politics.mp3' },
  { id: 'police', label: 'Policiales / Acción', icon: ShieldAlert, url: 'https://pub-5b294f92f42e4cbda687d0122e15bc72.r2.dev/audios/curtain-police.mp3' },
  { id: 'sports', label: 'Deportes / Energía', icon: Trophy, url: 'https://pub-5b294f92f42e4cbda687d0122e15bc72.r2.dev/audios/curtain-sports.mp3' },
  { id: 'mystery', label: 'Misterio / Suspenso', icon: Ghost, url: 'https://pub-5b294f92f42e4cbda687d0122e15bc72.r2.dev/audios/curtain-mystery.mp3' },
  { id: 'festive', label: 'Festivo / Eventos', icon: PartyPopper, url: 'https://pub-5b294f92f42e4cbda687d0122e15bc72.r2.dev/audios/curtain-festive.mp3' },
];

export const AudioProducer: React.FC = () => {
  const [pendingArticles, setPendingArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [script, setScript] = useState('');
  const [isOptimizingScript, setIsOptimizingScript] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [useLunfardo, setUseLunfardo] = useState(true);
  const [creativityTemp, setCreativityTemp] = useState<number>(1);
  const [selectedVoice, setSelectedVoice] = useState<string>('Kore');
  const [manualSpeed, setManualSpeed] = useState<number>(1.0);
  const [selectedVibe, setSelectedVibe] = useState<string>('barrial');
  const [selectedCurtain, setSelectedCurtain] = useState<string>(CURTAIN_OPTIONS[1].url);
  const [musicVol, setMusicVol] = useState<number>(0.6);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [masterAiPrompt, setMasterAiPrompt] = useState(() => localStorage.getItem('master_ai_audio_instruction') || '');

  useEffect(() => {
    fetchPendingArticles();
    const handleSync = () => {
      const updated = localStorage.getItem('master_ai_audio_instruction') || '';
      setMasterAiPrompt(updated);
    };
    window.addEventListener('storage', handleSync);
    return () => window.removeEventListener('storage', handleSync);
  }, []);

  useEffect(() => {
    if (selectedArticle) {
      setScript(selectedArticle.text || '');
      setGeneratedAudioUrl(null);
    }
  }, [selectedArticle]);

  // Al cambiar la vibra, ajustamos velocidad y parámetros automáticamente
  useEffect(() => {
    const vibe = VIBE_OPTIONS.find(v => v.id === selectedVibe);
    if (vibe) {
      setManualSpeed(vibe.speed);
      if (vibe.id === 'solemne') {
        setUseLunfardo(false);
        setCreativityTemp(1); // Lectura fiel para noticias fúnebres
        setSelectedCurtain(''); // Sugerir sin cortina
      } else if (vibe.id === 'urgente') {
        setCreativityTemp(3);
      } else if (vibe.id === 'deportivo') {
        setCreativityTemp(4);
        setSelectedCurtain(CURTAIN_OPTIONS.find(c => c.id === 'sports')?.url || '');
      } else if (vibe.id === 'pnt') {
        setCreativityTemp(3);
        setSelectedCurtain(CURTAIN_OPTIONS.find(c => c.id === 'festive')?.url || '');
      } else if (vibe.id === 'cultural') {
        setCreativityTemp(2);
      } else if (vibe.id === 'sexy') {
        setCreativityTemp(3);
        setSelectedCurtain('');
      } else {
        setCreativityTemp(2);
      }
    }
  }, [selectedVibe]);

  const fetchPendingArticles = async () => {
    setLoadingList(true);
    try {
      const { data } = await supabase.from('articles').select('*').order('created_at', { ascending: false }).limit(20);
      setPendingArticles(data || []);
    } catch (err: any) { setError("Error cargando noticias."); } finally { setLoadingList(false); }
  };

  const handleOptimizeScript = async () => {
    if (!script.trim()) return;
    setIsOptimizingScript(true);
    const solemnExtra = selectedVibe === 'solemne' ? 'Es una noticia fúnebre/solemne. Evitá modismos alegres, usá pausas respetuosas y mantené un tono de sobriedad absoluta.' : '';
    const styleExtra = `Estilo de locución deseado: ${selectedVibe.toUpperCase()}.`;
    try {
      // Usamos el valor de temperatura para influir en el prompt de optimización
      const optimized = await optimizeBodyForAudio(script, useLunfardo, creativityTemp * 2, `${masterAiPrompt} ${solemnExtra} ${styleExtra}`);
      setScript(optimized);
    } catch (err) { setError("Error al optimizar."); } finally { setIsOptimizingScript(false); }
  };

  const handleGenerate = async () => {
    if (!script.trim() || !selectedArticle) return;
    setIsGeneratingAudio(true);
    setGeneratedAudioUrl(null);
    setError(null);
    try {
      const solemnPrompt = selectedVibe === 'solemne' ? 'Locución SOLEMNE, RESPETUOSA, LENTA. Ajuste estricto al texto.' : '';
      const vibeMap: Record<string, string> = {
        urgente: "Locución de FLASH NOTICIOSO, URGENTE, RÁPIDA y con ALTA ENERGÍA.",
        barrial: "Locución de CRÓNICA BARRIAL, CERCANA, AMABLE y POPULAR.",
        pnt: "Locución COMERCIAL, entusiasta, persuasiva, estilo VENTA PNT de radio.",
        cultural: "Locución SOFISTICADA, culta, con buena dicción y ritmo pausado.",
        deportivo: "Locución DEPORTIVA, muy ENÉRGICA, vibrante y veloz.",
        sexy: "Locución SEDUCTORA, sugerente, profunda y con ritmo lento.",
        relax: "Locución TRANQUILA, informal, tipo charla de café."
      };
      const vibePrompt = vibeMap[selectedVibe] || "";

      // Mapeo de temperatura a instrucciones de locución
      const tempMap = [
        "",
        "Lectura FIEL, ESTRICTA y SOBRIA del texto.", // 1
        "Lectura EXPRESIVA, FLUIDA y NATURAL.",       // 2
        "Lectura CREATIVA, con énfasis marcado y dinamismo.", // 3
        "Lectura MUY EXPRESIVA, LIBRE, con gran interpretación periodística." // 4
      ];
      const tempPrompt = tempMap[creativityTemp] || "";

      const scriptWithSlogan = selectedVibe === 'solemne' ? script : appendSloganToText(script);

      const accentInstruction = `[INSTRUCCIÓN VITAL DE ACENTO]: Actúa como un locutor Rioplatense (Buenos Aires, Argentina). 
      1. USÁ SHEÍSMO: Pronuncia 'y' y 'll' como 'SH' (ej: 'Playa' -> 'Plasha').
      2. USÁ VOSEO: Usa 'vos' y no 'tú'.
      3. ASPIRACIÓN DE 'S': Las 's' finales suenan suaves como 'h' (ej: 'Vamos' -> 'Vamoh').
      4. ENTONACIÓN: Curva melódica porteña, con caída marcada al final.`;
      const speechResult = await generateSpeech(scriptWithSlogan, selectedVoice, 'medio', manualSpeed, `${accentInstruction} ${masterAiPrompt} ${solemnPrompt} ${vibePrompt} ${tempPrompt}`);

      const { blob: finalAudioBlob, duration: finalDuration } = await mixSpeechWithCustomIntro(speechResult.pcmData, selectedCurtain, musicVol);

      const finalUrl = URL.createObjectURL(finalAudioBlob);
      setGeneratedAudioUrl(finalUrl);
      setIsGeneratingAudio(false);

      const publicUrl = await uploadAudioToR2(finalAudioBlob, `locucion_${selectedArticle.id}.mp3`);
      await supabase.from('articles').update({ audio_url: publicUrl, animation_duration: finalDuration }).eq('id', selectedArticle.id);
      setPendingArticles(prev => prev.map(a => a.id === selectedArticle.id ? { ...a, audio_url: publicUrl } : a));
    } catch (err: any) {
      let msg = err.message || "Error desconocido";
      if (msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
        msg = "⏳ Límite de cuota gratuito excedido (Gemini Free Tier). Esperá unos 60 segundos antes de intentar de nuevo.";
      }
      setError(msg);
      setIsGeneratingAudio(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause(); else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const getTempLabel = (val: number) => {
    switch (val) {
      case 1: return "Fiel";
      case 2: return "Expresivo";
      case 3: return "Creativo";
      case 4: return "Libre";
      default: return "";
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
      {/* PANEL IZQUIERDO */}
      <div className="lg:col-span-3 flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b bg-slate-50 flex justify-between items-center shrink-0">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
            <Headphones size={14} className="text-blue-500" /> Noticieros Saladillo
          </h3>
          <button onClick={fetchPendingArticles} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors">
            <RefreshCw size={14} className={`${loadingList ? 'animate-spin' : ''} text-slate-400`} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {pendingArticles.map(article => (
            <button key={article.id} onClick={() => setSelectedArticle(article)} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selectedArticle?.id === article.id ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-100' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
              <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200 relative">
                {article.image_url ? <img src={article.image_url} className="w-full h-full object-cover" /> : <ImageIcon size={14} className="m-auto mt-3 text-slate-300" />}
                {article.audio_url && <div className="absolute top-0 right-0 p-0.5 bg-green-500 rounded-bl shadow-sm"><CheckCircle2 size={8} className="text-white" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[11px] font-bold truncate text-slate-700 uppercase">{article.title}</h4>
                {article.audio_url && <p className="text-[8px] text-green-600 font-bold uppercase">Audio Producido</p>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* CONSOLA CENTRAL */}
      <div className="lg:col-span-9 flex flex-col h-full bg-slate-950 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden">
        {error && <div className="bg-red-600 text-white text-[10px] font-bold px-6 py-2 flex items-center gap-2 animate-slideDown"><AlertTriangle size={12} /> {error}</div>}

        <div className="px-6 py-5 border-b border-white/5 bg-slate-900/50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-xl ${isPlaying ? 'animate-pulse ring-4 ring-blue-500/20' : ''}`}><Radio size={20} /></div>
            <div>
              <h2 className="text-xs font-black text-white uppercase tracking-[0.4em]">Broadcast <span className="text-blue-500">Master</span></h2>
              <div className="flex items-center gap-2">
                <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">VozArgentina Studio</p>
                {masterAiPrompt && (
                  <span className="text-[8px] font-black text-green-400 bg-green-400/10 px-2 py-0.5 rounded border border-green-400/20 uppercase tracking-widest flex items-center gap-1 animate-pulse">
                    <Sparkles size={8} /> Prompt Maestro Activo
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-wrap gap-2 justify-end max-w-2xl bg-black/40 p-1.5 rounded-2xl border border-white/5">
              {VIBE_OPTIONS.map(v => (
                <button key={v.id} onClick={() => setSelectedVibe(v.id)} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all flex items-center gap-1.5 ${selectedVibe === v.id ? 'bg-white/10 text-white border border-white/10 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                  <v.icon size={10} className={v.color} /> {v.label}
                </button>
              ))}
            </div>
            <button onClick={handleOptimizeScript} disabled={isOptimizingScript || !script.trim()} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-30 transition-all text-[11px] font-black uppercase shrink-0">
              {isOptimizingScript ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Preparar Guion
            </button>
          </div>
        </div>

        <div className="h-[30%] flex bg-slate-900 relative">
          <textarea ref={textareaRef} value={script} onChange={(e) => setScript(e.target.value)} className="flex-1 p-6 bg-slate-900 text-white text-lg leading-relaxed outline-none resize-none font-medium custom-scrollbar" placeholder="Guion de la noticia..." />
        </div>

        <div className="flex-1 bg-slate-950 p-6 space-y-8 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-4 space-y-3">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 border-l-2 border-blue-500 pl-2">Voces</label>
              <div className="grid grid-cols-2 gap-2">
                {VOICE_OPTIONS.map(v => (
                  <button key={v.id} onClick={() => setSelectedVoice(v.id)} className={`w-full text-left p-3 rounded-xl border transition-all ${selectedVoice === v.id ? 'bg-blue-600 border-blue-400 text-white shadow-xl' : 'bg-slate-900 border-white/5 text-slate-400'}`}>
                    <div className="font-black text-[10px] uppercase">{v.label}</div>
                    <div className="text-[8px] italic opacity-60">{v.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-4 space-y-3">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 border-l-2 border-green-500 pl-2">Cortinas</label>
              <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-40 pr-2 custom-scrollbar">
                {CURTAIN_OPTIONS.map(c => (
                  <button key={c.id} onClick={() => setSelectedCurtain(c.url)} className={`p-3 rounded-xl border text-center transition-all ${selectedCurtain === c.url ? (c.id === 'none' ? 'bg-slate-700 border-white text-white' : 'bg-green-600 border-green-400 text-white shadow-lg') : 'bg-slate-900 border-white/5 text-slate-400'}`}>
                    <c.icon size={14} className={`mx-auto mb-1 ${c.id === 'none' ? 'text-red-400' : ''}`} />
                    <span className="text-[8px] font-black uppercase leading-tight">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-4 space-y-4 bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col justify-center">
              <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <span className="flex items-center gap-2"><SlidersHorizontal size={14} /> Mezcla</span>
                <span className="text-blue-400">{(musicVol * 100).toFixed(0)}% Cortina</span>
              </div>
              <input type="range" min={0.1} max={1.0} step={0.05} value={musicVol} onChange={(e) => setMusicVol(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" disabled={!selectedCurtain} />

              <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest mt-4">
                <span className="flex items-center gap-2"><FastForward size={14} /> Velocidad</span>
                <span className="text-blue-400">{manualSpeed}x</span>
              </div>
              <input type="range" min={0.8} max={1.3} step={0.05} value={manualSpeed} onChange={(e) => setManualSpeed(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />

              {/* DESLIZABLE DE TEMPERATURA */}
              <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest mt-4">
                <span className="flex items-center gap-2"><Thermometer size={14} /> Temperatura</span>
                <span className="text-amber-400">{getTempLabel(creativityTemp)}</span>
              </div>
              <input type="range" min={1} max={4} step={1} value={creativityTemp} onChange={(e) => setCreativityTemp(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500" />
              <div className="flex justify-between text-[7px] text-slate-500 font-bold uppercase mt-1 px-1">
                <span>Fiel</span>
                <span>Expresivo</span>
                <span>Creativo</span>
                <span>Libre</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5 flex items-center gap-8">
            <button onClick={handleGenerate} disabled={isGeneratingAudio || !script.trim() || !selectedArticle} className="h-16 px-12 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-xl flex items-center justify-center gap-3 disabled:opacity-30 transition-all font-black text-xs uppercase tracking-[0.3em]">
              {isGeneratingAudio ? <Loader2 size={20} className="animate-spin" /> : <Music4 size={20} />} Largar Producción
            </button>

            {generatedAudioUrl && (
              <div className="flex-1 flex items-center gap-6 animate-fadeIn bg-white/5 p-3 pr-6 rounded-2xl border border-white/10 backdrop-blur-sm">
                <button onClick={togglePlay} className="w-12 h-12 flex items-center justify-center bg-white text-slate-950 rounded-full hover:scale-105 transition-all">
                  {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} className="ml-1" fill="currentColor" />}
                </button>
                <div className="flex-1 space-y-2">
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)] ${isPlaying ? 'w-full' : 'w-0'} transition-all duration-[3000ms] linear`}></div>
                  </div>
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Saladia de Master lista</span>
                </div>
                <a href={generatedAudioUrl} download className="p-3 bg-white/5 text-white/40 hover:text-blue-400 rounded-xl transition-all"><Download size={20} /></a>
                <audio ref={audioRef} src={generatedAudioUrl} onEnded={() => setIsPlaying(false)} className="hidden" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
