
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { optimizeBodyForAudio, generateSpeech, appendSloganToText } from '../services/gemini';
import { generateAudio } from '../services/googleTTS';
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
  Zap,
  FilePlus,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  MessageSquareText
} from 'lucide-react';
import { VOICE_OPTIONS, SLOGANS } from '../constants';

const VIBE_OPTIONS = [
  { id: 'urgente', label: 'Flash: Al Aire Ya', icon: Flame, speed: 1.15, pitch: 'agudo', color: 'text-red-500' },
  { id: 'clasica', label: 'Noticia Clásica', icon: Radio, speed: 1.05, pitch: 'medio', color: 'text-teal-400' },
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
  const [selectedVibe, setSelectedVibe] = useState<string>('clasica');
  const [selectedCurtain, setSelectedCurtain] = useState<string>(CURTAIN_OPTIONS[1].url);
  const [musicVol, setMusicVol] = useState<number>(0.6);
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualTitle, setManualTitle] = useState('Audio Manual');
  const [feedback, setFeedback] = useState('');
  const [lastRating, setLastRating] = useState<boolean | null>(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [showFeedbackPanel, setShowFeedbackPanel] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [masterAiPrompt, setMasterAiPrompt] = useState(() => localStorage.getItem('master_ai_audio_instruction') || '');

  const [voicePrompts, setVoicePrompts] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPendingArticles();
    const handleSync = () => {
      const updatedMaster = localStorage.getItem('master_ai_audio_instruction') || '';
      setMasterAiPrompt(updatedMaster);

      const savedPrompts = localStorage.getItem('voice_tuning_prompts');
      if (savedPrompts) {
        try { setVoicePrompts(JSON.parse(savedPrompts)); } catch (e) { console.error("Error syncing prompts:", e); }
      }
    };

    // Initial load
    handleSync();

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
      } else if (vibe.id === 'clasica') {
        setUseLunfardo(false);
        setCreativityTemp(2);
        setSelectedCurtain(CURTAIN_OPTIONS.find(c => c.id === 'news_classic')?.url || '');
      } else {
        setCreativityTemp(2);
      }
    }
  }, [selectedVibe]);

  const fetchPendingArticles = async () => {
    setLoadingList(true);
    try {
      const { data, error } = await supabase.from('articles').select('*, body_voice_tuning').order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      setPendingArticles(data || []);

    } catch (err: any) {
      console.error("Error cargando noticias:", err);
      setError("Error cargando noticias: " + err.message);
    } finally { setLoadingList(false); }
  };

  const handleOptimizeScript = async () => {
    if (!script.trim()) return;
    setIsOptimizingScript(true);
    const solemnExtra = selectedVibe === 'solemne' ? 'Es una noticia fúnebre/solemne. Evitá modismos alegres, usá pausas respetuosas y mantené un tono de sobriedad absoluta.' : '';

    let styleExtra = `Estilo de locución deseado: ${selectedVibe.toUpperCase()}.`;
    if (selectedVibe === 'clasica') {
      styleExtra += " Mantené un tono periodístico FORMAL y CLÁSICO. No uses lunfardo. Tu objetivo es RESUMIR la noticia para que la lectura dure máximo 90 segundos (aprox 180 palabras). Sé conciso y directo.";
    }
    try {
      // Usamos el valor de temperatura para influir en el prompt de optimización
      const optimized = await optimizeBodyForAudio(script, useLunfardo, creativityTemp * 2, `${masterAiPrompt} ${solemnExtra} ${styleExtra}`);

      if (!optimized) throw new Error("La IA devolvió un texto vacío.");
      if (optimized.startsWith("Error:")) {
        throw new Error(optimized);
      }
      setScript(optimized);
    } catch (err: any) {
      console.error("Error en handleOptimizeScript:", err);
      setError("Error al optimizar: " + (err.message || err));
    } finally { setIsOptimizingScript(false); }
  };

  const handleGenerate = async () => {
    if (!script.trim()) return;
    if (!isManualMode && !selectedArticle) return;

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
        relax: "Locución TRANQUILA, informal, tipo charla de café.",
        clasica: "Locución DE NOTICIERO CLÁSICO, FORMAL, CLARA y OBJETIVA. Sin estridencias."
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

      // --- SELECCIÓN DE SLOGAN ROTATIVO (Regla de Oro: No repetir en el mismo día) ---
      const now = new Date();
      const offset = now.getTimezoneOffset() * 60000;
      const today = new Date(now.getTime() - offset).toISOString().split('T')[0];
      const storageKey = `slogans_usage_${today}`;
      let usedIndices: number[] = [];

      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) usedIndices = JSON.parse(stored);
      } catch (e) { console.error("Error reading slogan usage:", e); }

      // Reset si se usaron todos
      if (usedIndices.length >= SLOGANS.length) {
        usedIndices = [];
      }

      const availableIndices = SLOGANS.map((_, i) => i).filter(i => !usedIndices.includes(i));
      const sloganIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];

      // Guardar uso
      usedIndices.push(sloganIndex);
      localStorage.setItem(storageKey, JSON.stringify(usedIndices));

      const selectedSlogan = SLOGANS[sloganIndex];

      const scriptWithSlogan = selectedVibe === 'solemne'
        ? script
        : appendSloganToText(script, `¡${selectedSlogan}!`); // Añadir signos para énfasis básico

      // GOOGLE CLOUD TTS (CHIRP3-HD) - DETERMINISTA CON CACHÉ SHA-256
      // No le pasamos prompts de actuación, solo el texto y el slogan.
      const finalInputText = scriptWithSlogan;

      let speechResult: any; // Using any to access hashFileName later

      // 1. Obtener feedback histórico (los últimos 3 fallos) para "entrenar" contextualmente a Gemini
      const { data: pastFeedback } = await supabase
        .from('audio_feedback')
        .select('feedback_text')
        .eq('article_id', isManualMode ? 'manual' : String(selectedArticle?.id))
        .eq('rating', false)
        .order('created_at', { ascending: false })
        .limit(3);

      const feedbackContext = pastFeedback?.length
        ? `\n[CORRECCIONES BASADAS EN FALLOS ANTERIORES]: ${pastFeedback.filter(f => f.feedback_text).map(f => f.feedback_text).join(', ')}. EVITA ESTOS ERRORES.`
        : '';

      const fullExtraConfig = `${masterAiPrompt} ${feedbackContext}`.trim();

      console.log(`Intentando con Motor Gemini (Acento Rioplatense): ${selectedVoice} | Config: ${fullExtraConfig.slice(0, 50)}...`);
      try {
        speechResult = await generateSpeech(
          finalInputText,
          selectedVoice,
          'medio',
          manualSpeed,
          fullExtraConfig
        );
      } catch (geminiError) {
        console.warn("Fallo Gemini TTS, usando Fallback de Google Cloud:", geminiError);
        // Mapear ID simple a ID largo de Chirp3 para el fallback
        const chirpVoiceId = `es-US-Chirp3-HD-${selectedVoice}`;

        speechResult = await generateAudio(
          finalInputText,
          {
            voiceId: chirpVoiceId,
            pitch: 0.0,
            speakingRate: 1.05
          }
        );
      }

      const { blob: finalAudioBlob, duration: finalDuration } = await mixSpeechWithCustomIntro(speechResult.pcmData, selectedCurtain, musicVol);

      const finalUrl = URL.createObjectURL(finalAudioBlob);
      setGeneratedAudioUrl(finalUrl);
      setShowFeedbackPanel(true);
      setLastRating(null);
      setIsGeneratingAudio(false);

      // Si es manual, terminamos aquí (solo para pre-escucha y descarga local)
      if (isManualMode) return;

      if (!selectedArticle) return;

      // Usar el hash file name generado por googleTTS.ts para garantizar la caché. 
      // Si por alguna razón no viene (ej. fallback manual), usamos el ID y timestamp.
      const fileName = speechResult.hashFileName || `locucion_${selectedArticle.id}_${Date.now()}.mp3`;
      const publicUrl = await uploadAudioToR2(finalAudioBlob, fileName);

      // GUARDAR EN NUEVA COLUMNA body_voice_tuning PARA NO SOBRESCRIBIR EL TEXTO VISUAL (TICKER)
      await supabase.from('articles').update({
        audio_url: publicUrl,
        animation_duration: finalDuration,
        body_voice_tuning: scriptWithSlogan // Guardamos el guion optimizado aquí
      }).eq('id', selectedArticle.id);

      setPendingArticles(prev => prev.map(a => a.id === selectedArticle.id ? {
        ...a,
        audio_url: publicUrl,
        body_voice_tuning: scriptWithSlogan
      } : a));
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

  const handleDownloadManual = async () => {
    if (!generatedAudioUrl) return;

    const fileName = `${(isManualMode ? manualTitle : (selectedArticle?.title || 'audio')).replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp3`;

    try {
      // Intentar usar File System Access API para elegir destino
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: 'Audio MP3',
            accept: { 'audio/mpeg': ['.mp3'] },
          }],
        });
        const writable = await handle.createWritable();
        const response = await fetch(generatedAudioUrl);
        const blob = await response.blob();
        await writable.write(blob);
        await writable.close();
      } else {
        // Fallback clásico
        const link = document.createElement('a');
        link.href = generatedAudioUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Error al descargar:", err);
        setError("Error al descargar el archivo o permiso denegado.");
      }
    }
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

        {/* BOTÓN MODO MANUAL */}
        <div className="p-4 border-b bg-white">
          <button
            onClick={() => {
              setIsManualMode(true);
              setSelectedArticle(null);
              setScript('');
              setGeneratedAudioUrl(null);
            }}
            className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed transition-all font-black text-[10px] uppercase tracking-widest ${isManualMode ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-500'}`}
          >
            <FilePlus size={14} /> Nueva Locución Manual
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {pendingArticles.map(article => (
            <button key={article.id} onClick={() => {
              setIsManualMode(false);
              setSelectedArticle(article);
              setScript(article.text || '');
              setGeneratedAudioUrl(null);
            }} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${(!isManualMode && selectedArticle?.id === article.id) ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-100' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
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

        <div className="px-4 py-3 border-b border-white/5 bg-slate-900/50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-xl ${isPlaying ? 'animate-pulse ring-4 ring-blue-500/20' : ''}`}><Radio size={16} /></div>
            <div>
              <h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-1.5">
                Broadcast <span className="text-blue-500">Master</span>
                <span className="text-[7px] text-slate-500 bg-white/5 px-1 py-0.5 rounded ml-1">VozArgentina Studio</span>
              </h2>
              {masterAiPrompt && (
                <div className="mt-0.5">
                  <span className="text-[7px] font-black text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded border border-green-400/20 uppercase tracking-widest inline-flex items-center gap-1 animate-pulse">
                    <Sparkles size={8} /> Prompt Maestro Activo
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1 justify-end max-w-[500px] bg-black/40 p-1 rounded-xl border border-white/5">
            {VIBE_OPTIONS.map(v => (
              <button key={v.id} onClick={() => setSelectedVibe(v.id)} className={`px-2 py-1 rounded-lg text-[7px] font-black uppercase transition-all flex items-center gap-1 leading-none ${selectedVibe === v.id ? 'bg-white/10 text-white border border-white/10 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                <v.icon size={8} className={v.color} /> {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-slate-900 border-b border-white/5 relative">
          {isManualMode && (
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-1 items-end">
              <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Nombre</label>
              <input
                type="text"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                className="bg-slate-800 border border-white/10 rounded px-2 py-1 text-white text-[10px] uppercase font-bold outline-none focus:border-blue-500 transition-colors w-40"
                placeholder="Ej: Promo"
              />
            </div>
          )}
          <textarea ref={textareaRef} value={script} onChange={(e) => setScript(e.target.value)} className="flex-1 p-5 pb-10 bg-transparent text-white text-[15px] leading-relaxed outline-none resize-none font-medium custom-scrollbar min-h-[140px]" placeholder={isManualMode ? "Escribí aquí el texto que querés convertir en audio..." : "Guion de la noticia..."} />

          {/* BOTÓN FLOTANTE OPTIMIZAR (SIN BANNER) */}
          <div className="absolute bottom-3 right-4 z-10 flex items-center gap-3">
            {masterAiPrompt && <span className="text-[8px] text-slate-500 italic opacity-50">Prompt Maestro Aplicado</span>}
            <button
              onClick={handleOptimizeScript}
              disabled={isOptimizingScript || !script.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/90 hover:bg-amber-400 text-black rounded-lg shadow-md disabled:opacity-30 disabled:cursor-not-allowed transition-all text-[9px] font-black uppercase tracking-wider backdrop-blur-sm active:scale-95 border border-amber-400"
            >
              {isOptimizingScript ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {isOptimizingScript ? 'Optimizando...' : 'Optimizar Guion'}
            </button>
          </div>
        </div>

        {/* PANEL INFERIOR COMPACTADO */}
        <div className="bg-slate-950 p-4 space-y-4 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Voces */}
            <div className="lg:col-span-5 space-y-2">
              <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1 border-l-2 border-blue-500 pl-2">Voces</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <div className="text-[8px] font-black text-pink-400 uppercase tracking-widest flex items-center gap-1 border-b border-pink-500/20 pb-1">
                    <Sparkles size={8} /> Fem
                  </div>
                  {VOICE_OPTIONS.filter(v => v.gender === 'female').map(v => (
                    <button key={v.id} onClick={() => setSelectedVoice(v.id)} className={`w-full text-left p-1.5 rounded-lg border transition-all group ${selectedVoice === v.id ? 'bg-pink-600 border-pink-400 text-white shadow-[0_0_10px_rgba(236,72,153,0.3)]' : 'bg-slate-900 border-white/5 text-slate-400 hover:border-pink-500/30'}`}>
                      <div className={`font-black text-[9px] uppercase leading-tight ${selectedVoice === v.id ? 'text-white' : 'text-slate-300 group-hover:text-pink-200'}`}>{v.label}</div>
                      <div className={`text-[7px] italic opacity-60 truncate ${selectedVoice === v.id ? 'text-pink-100' : ''}`}>{v.desc}</div>
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <div className="text-[8px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1 border-b border-blue-500/20 pb-1">
                    <Zap size={8} /> Masc
                  </div>
                  {VOICE_OPTIONS.filter(v => v.gender === 'male').map(v => (
                    <button key={v.id} onClick={() => setSelectedVoice(v.id)} className={`w-full text-left p-1.5 rounded-lg border transition-all group ${selectedVoice === v.id ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]' : 'bg-slate-900 border-white/5 text-slate-400 hover:border-blue-500/30'}`}>
                      <div className={`font-black text-[9px] uppercase leading-tight ${selectedVoice === v.id ? 'text-white' : 'text-slate-300 group-hover:text-blue-200'}`}>{v.label}</div>
                      <div className={`text-[7px] italic opacity-60 truncate ${selectedVoice === v.id ? 'text-blue-100' : ''}`}>{v.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Cortinas */}
            <div className="lg:col-span-4 space-y-2">
              <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1 border-l-2 border-green-500 pl-2">Cortinas</label>
              <div className="grid grid-cols-2 gap-1.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                {CURTAIN_OPTIONS.map(c => (
                  <button key={c.id} onClick={() => setSelectedCurtain(c.url)} className={`p-1.5 rounded-lg border flex flex-col items-center justify-center text-center transition-all ${selectedCurtain === c.url ? (c.id === 'none' ? 'bg-slate-700 border-white text-white' : 'bg-green-600 border-green-400 text-white shadow-md') : 'bg-slate-900 border-white/5 text-slate-400 hover:bg-slate-800'}`}>
                    <c.icon size={12} className={`mb-1 ${c.id === 'none' ? 'text-red-400' : ''}`} />
                    <span className="text-[7.5px] font-black uppercase leading-[1.1]">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Ajustes Finos */}
            <div className="lg:col-span-3 bg-white/5 p-3 rounded-xl border border-white/10 flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  <span>Mezcla Cortina</span>
                  <span className="text-blue-400">{(musicVol * 100).toFixed(0)}%</span>
                </div>
                <input type="range" min={0.1} max={1.0} step={0.05} value={musicVol} onChange={(e) => setMusicVol(parseFloat(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" disabled={!selectedCurtain} />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  <span>Velocidad Voz</span>
                  <span className="text-blue-400">{manualSpeed}x</span>
                </div>
                <input type="range" min={0.8} max={1.3} step={0.05} value={manualSpeed} onChange={(e) => setManualSpeed(parseFloat(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  <span>Interpretación</span>
                  <span className="text-amber-400">{getTempLabel(creativityTemp)}</span>
                </div>
                <input type="range" min={1} max={4} step={1} value={creativityTemp} onChange={(e) => setCreativityTemp(parseInt(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                <div className="flex justify-between text-[6px] text-slate-500 font-bold uppercase mt-1">
                  <span>Fiel</span><span>Expres.</span><span>Creatv.</span><span>Libre</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FEEDBACK STATION - SISTEMA DE CALIFICACIÓN */}
        {generatedAudioUrl && showFeedbackPanel && (
          <div className="pt-4 border-t border-white/5 animate-slideDown">
            <div className="bg-slate-900/80 border border-white/5 rounded-2xl p-4 flex flex-col lg:flex-row items-center gap-6">
              <div className="flex flex-col gap-1 items-center lg:items-start shrink-0">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Calidad del Audio</span>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      setLastRating(true);
                      // Guardar éxito en DB
                      await supabase.from('audio_feedback').insert({
                        article_id: isManualMode ? 'manual' : String(selectedArticle?.id),
                        rating: true,
                        voice_id: selectedVoice
                      });
                      setShowFeedbackPanel(false); // Desaparece al dar positivo
                    }}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${lastRating === true ? 'bg-green-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-green-400'}`}
                  >
                    <ThumbsUp size={20} fill={lastRating === true ? "currentColor" : "none"} />
                  </button>
                  <button
                    onClick={() => setLastRating(false)}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${lastRating === false ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-red-400'}`}
                  >
                    <ThumbsDown size={20} fill={lastRating === false ? "currentColor" : "none"} />
                  </button>
                </div>
              </div>

              <div className="flex-1 w-full space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <MessageSquareText size={12} className="text-blue-400" />
                    {lastRating === false ? '¿Qué falló? (Feedback para entrenamiento)' : 'Sugerencia o comentario (Opcional)'}
                  </label>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder={lastRating === false ? "Ej: ERROR DE YEISMO, RITMO MONOTONO..." : "Escribí aquí..."}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-[11px] outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-inner"
                  />
                  <button
                    disabled={isSubmittingFeedback || (lastRating === false && !feedback.trim())}
                    onClick={async () => {
                      setIsSubmittingFeedback(true);
                      try {
                        await supabase.from('audio_feedback').insert({
                          article_id: isManualMode ? 'manual' : String(selectedArticle?.id),
                          rating: lastRating ?? false,
                          feedback_text: feedback,
                          voice_id: selectedVoice
                        });

                        if (lastRating === false) {
                          // Limpiar audio si no es satisfactorio para forzar reintento
                          setGeneratedAudioUrl(null);
                          if (selectedArticle) {
                            await supabase.from('articles').update({ audio_url: null }).eq('id', selectedArticle.id);
                          }
                          alert("Feedback enviado. El audio ha sido marcado para reintento con estas mejoras.");
                        } else {
                          alert("Feedback guardado con éxito.");
                        }
                        setFeedback('');
                        setShowFeedbackPanel(false); // Desaparece al presionar INFORMAR
                      } catch (e) {
                        console.error("Error enviando feedback:", e);
                      } finally {
                        setIsSubmittingFeedback(false);
                      }
                    }}
                    className="px-6 bg-white/5 hover:bg-white/10 text-white text-[9px] font-black uppercase rounded-xl transition-all border border-white/5 disabled:opacity-30"
                  >
                    {isSubmittingFeedback ? <Loader2 size={12} className="animate-spin" /> : 'Informar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="pt-6 border-t border-white/5 flex items-center gap-8">
          <button onClick={handleGenerate} disabled={isGeneratingAudio || !script.trim() || (!isManualMode && !selectedArticle)} className="h-16 px-12 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-xl flex items-center justify-center gap-3 disabled:opacity-30 transition-all font-black text-xs uppercase tracking-[0.3em]">
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
              <button
                onClick={handleDownloadManual}
                className="p-3 bg-white/5 text-white/40 hover:text-blue-400 rounded-xl transition-all"
                title="Descargar Audio"
              >
                <Download size={20} />
              </button>
              <audio ref={audioRef} src={generatedAudioUrl} onEnded={() => setIsPlaying(false)} className="hidden" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
