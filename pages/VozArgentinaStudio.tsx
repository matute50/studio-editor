
import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Loader2,
  Volume2,
  Zap,
  Ear,
  Waves,
  Play,
  Pause,
  Save,
  MessageSquare,
  Sparkles,
  Info,
  ShieldCheck,
  // Fix: added missing icons required by the component
  ChevronRight,
  Activity
} from 'lucide-react';
import { generateSpeech } from '../services/gemini';

export const VozArgentinaStudio: React.FC = () => {
  const [testText, setTestText] = useState('Yo ya llegué a la playa y está lloviendo un montón.');
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [aiPrompt, setAiPrompt] = useState(() => localStorage.getItem('master_ai_audio_instruction') || '');
  const [showSaved, setShowSaved] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const savePrompt = () => {
    localStorage.setItem('master_ai_audio_instruction', aiPrompt);
    // Disparar evento manual para que otras pestañas se enteren
    window.dispatchEvent(new Event('storage'));
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 3000);
  };

  const handleTestPhonetics = async () => {
    if (!testText.trim()) return;
    setIsGenerating(true);
    setAudioUrl(null);
    try {
      const accentInstruction = `[INSTRUCCIÓN VITAL DE ACENTO]: Actúa como un locutor Rioplatense (Buenos Aires, Argentina). 
      1. USÁ SHEÍSMO: Pronuncia 'y' y 'll' como 'SH' (ej: 'Playa' -> 'Plasha').
      2. USÁ VOSEO: Usa 'vos' y no 'tú'.
      3. ASPIRACIÓN DE 'S': Las 's' finales suenan suaves como 'h' (ej: 'Vamos' -> 'Vamoh').
      4. ENTONACIÓN: Curva melódica porteña, con caída marcada al final.`;
      console.log("Iniciando generación de audio con:", { testText, accentInstruction, aiPrompt });
      const { localUrl } = await generateSpeech(testText, 'Kore', 'medio', 1.0, `${accentInstruction} ${aiPrompt}`);
      console.log("Audio generado URL:", localUrl);
      setAudioUrl(localUrl);
    } catch (err: any) {
      console.error("Error detallado:", err);
      alert("Error en calibración: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 p-8 space-y-8 animate-fadeIn">
      {/* HEADER MASTER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-slate-900/50 border border-white/5 p-10 rounded-[3rem] backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-blue-600 rounded-[2.5rem] flex items-center justify-center shadow-[0_0_50px_rgba(37,99,235,0.3)] ring-1 ring-white/20">
            <Radio size={40} className="text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">VozArgentina Studio</h1>
            <div className="flex items-center gap-3 mt-3">
              <span className="flex items-center gap-1.5 text-[10px] font-black text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full border border-blue-400/20 uppercase tracking-widest">
                <Zap size={12} /> Cerebro de IA Calibrado
              </span>
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest italic">Panel del Responsable</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse"></div>
              <span className="text-[10px] font-black text-white uppercase tracking-widest">IA Sincronizada</span>
            </div>
            <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Motor: Gemini 2.5 TTS</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* COLUMNA IZQUIERDA: CONFIGURACIÓN DE PROMPTS */}
        <div className="lg:col-span-5 space-y-8">
          <div className="bg-slate-900/60 border border-white/10 rounded-[2.5rem] p-8 space-y-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-3">
                <MessageSquare className="text-blue-400" /> Prompts Maestros
              </h2>
              {showSaved && (
                <div className="flex items-center gap-2 text-[10px] font-black text-green-400 uppercase animate-bounce">
                  <ShieldCheck size={14} /> Sincronizado
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-blue-600/5 border border-blue-500/20 rounded-2xl flex gap-3">
                <Info size={18} className="text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                  Lo que escribas acá se aplicará como **regla suprema** en el <span className="text-blue-400 font-bold">Estudio de Locución</span>.
                  Ideal para corregir acentos, pausas o tonos específicos de Saladillo.
                </p>
              </div>

              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-blue-100 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none h-56 placeholder:text-slate-800 font-medium"
                placeholder="Ej: Hablá más lento, hacé pausas largas en los puntos, usá un tono serio y profesional..."
              />

              <button
                onClick={savePrompt}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-lg group active:scale-95"
              >
                <Save size={18} className="group-hover:scale-110 transition-transform" />
                Aplicar Mejoras al Estudio
              </button>
            </div>
          </div>

          <div className="p-6 bg-slate-900/40 border border-white/5 rounded-2xl space-y-4">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Sparkles size={14} className="text-amber-500" /> Ejemplos de prompts
            </h4>
            <div className="space-y-2">
              {[
                "No pronuncies las S al final de las palabras.",
                "Hacé una pausa dramática antes de cada slogan.",
                "Mantené un tono amable pero distante, tipo noticiero nacional.",
                "Enfatizá mucho las palabras en mayúscula."
              ].map((txt, i) => (
                <div key={i} className="text-[11px] text-slate-500 hover:text-slate-300 cursor-pointer transition-colors flex items-center gap-2" onClick={() => setAiPrompt(aiPrompt + " " + txt)}>
                  <ChevronRight size={10} /> {txt}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: PROBADOR EN TIEMPO REAL */}
        <div className="lg:col-span-7 space-y-8">
          <div className="bg-slate-900/50 border border-white/5 rounded-[3rem] p-10 relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
              <Ear size={180} />
            </div>

            <div className="relative z-10">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-8 flex items-center gap-4">
                <Waves className="text-blue-400" /> Probador de Calibración
              </h2>

              <div className="space-y-6">
                <div className="relative">
                  <textarea
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-3xl p-8 text-white text-xl placeholder:text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/30 transition-all resize-none min-h-[180px] font-medium"
                    placeholder="Escribí para probar cómo afectan tus prompts al audio..."
                  />
                  <div className="absolute bottom-6 right-6">
                    <button
                      onClick={handleTestPhonetics}
                      disabled={isGenerating || !testText.trim()}
                      className="bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-2xl disabled:opacity-30 transition-all flex items-center gap-3 active:scale-95"
                    >
                      {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Volume2 size={18} />}
                      {isGenerating ? 'Calibrando...' : 'Escuchar Prueba'}
                    </button>
                  </div>
                </div>

                {audioUrl && (
                  <div className="p-8 bg-blue-600/10 border border-blue-500/20 rounded-[2.5rem] flex items-center gap-8 animate-fadeIn backdrop-blur-sm">
                    <button
                      onClick={togglePlay}
                      className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-105 transition-all ring-4 ring-blue-500/20"
                    >
                      {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} className="ml-1" fill="currentColor" />}
                    </button>
                    <div className="flex-1 space-y-3">
                      <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                        <Activity className="animate-pulse" size={14} /> Salida con Mejoras Aplicadas
                      </h3>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)] ${isPlaying ? 'w-full' : 'w-0'} transition-all duration-[5000ms] ease-linear`}></div>
                        </div>
                      </div>
                    </div>
                    <audio
                      ref={(el) => {
                        audioRef.current = el;
                        if (el) el.onended = () => setIsPlaying(false);
                      }}
                      src={audioUrl}
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
