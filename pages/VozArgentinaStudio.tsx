
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
  Activity,
  Mic2,
  Sliders,
  UploadCloud,
  Download
} from 'lucide-react';
import { generateSpeech, generateClonedSpeech } from '../services/gemini';
import { VOICE_OPTIONS } from '../constants';
import { uploadAudioToR2 } from '../services/r2';

export const VozArgentinaStudio: React.FC = () => {
  const [testText, setTestText] = useState('Yo ya llegué a la playa y está lloviendo un montón.');
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [aiPrompt, setAiPrompt] = useState(() => localStorage.getItem('master_ai_audio_instruction') || '');
  const [showSaved, setShowSaved] = useState(false);
  const [manualTitle, setManualTitle] = useState('VozArgentina_Estudio');

  // Voice Tuning State
  const [selectedVoice, setSelectedVoice] = useState<string>(VOICE_OPTIONS[0].id);
  const [voicePrompts, setVoicePrompts] = useState<Record<string, string>>({});

  // Cloning State
  const [useClonedVoice, setUseClonedVoice] = useState(false);
  const [clonedVoiceUrl, setClonedVoiceUrl] = useState(() => localStorage.getItem('cloned_voice_url') || '');
  const [clonedVoicePrompt, setClonedVoicePrompt] = useState(() => localStorage.getItem('cloned_voice_prompt') || '');
  const [isUploading, setIsUploading] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('voice_tuning_prompts');
    if (saved) {
      try { setVoicePrompts(JSON.parse(saved)); } catch (e) { console.error("Error loading voice prompts:", e); }
    }
  }, []);

  const handleVoicePromptChange = (val: string) => {
    const newPrompts = { ...voicePrompts, [selectedVoice]: val };
    setVoicePrompts(newPrompts);
    localStorage.setItem('voice_tuning_prompts', JSON.stringify(newPrompts));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await uploadAudioToR2(file, `clone_sample_${Date.now()}.mp3`, 'voice_clones');
      setClonedVoiceUrl(url);
      localStorage.setItem('cloned_voice_url', url);
      alert("Muestra de voz subida con éxito.");
    } catch (err: any) {
      console.error(err);
      alert("Error al subir muestra: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

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
      // LOGIC FOR CLONED VOICE
      if (useClonedVoice) {
        if (!clonedVoiceUrl) throw new Error("Debes subir una muestra de audio primero.");

        const fullPrompt = `${aiPrompt} ${clonedVoicePrompt}`;
        const { localUrl } = await generateClonedSpeech(testText, clonedVoiceUrl, fullPrompt);
        setAudioUrl(localUrl);

      } else {
        // LOGIC FOR STANDARD VOICE
        const accentInstruction = `[INSTRUCCIÓN VITAL DE ACENTO]: Actúa como un locutor Rioplatense (Buenos Aires, Argentina).
          1. USÁ SHEÍSMO: Pronuncia 'y' y 'll' como 'SH' (ej: 'Playa' -> 'Plasha').
          2. USÁ VOSEO: Usa 'vos' y no 'tú'.
          3. ASPIRACIÓN DE 'S': Las 's' finales suenan suaves como 'h' (ej: 'Vamos' -> 'Vamoh').
          4. ENTONACIÓN: Curva melódica porteña, con caída marcada al final.`;

        // Helper para generar seed determinista basado en el nombre de la voz
        const getVoiceSeed = (id: string): number => {
          let hash = 0;
          for (let i = 0; i < id.length; i++) {
            hash = ((hash << 5) - hash) + id.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
          }
          return Math.abs(hash);
        };

        const voiceSeed = getVoiceSeed(selectedVoice);
        const specificVoicePrompt = voicePrompts[selectedVoice] ? `[TU PERSONALIDAD ESPECÍFICA]: ${voicePrompts[selectedVoice]}` : '';

        const fullInstruction = `${accentInstruction} ${aiPrompt} ${specificVoicePrompt}`;
        const { localUrl } = await generateSpeech(testText, selectedVoice, 'medio', 1.0, fullInstruction, voiceSeed);
        setAudioUrl(localUrl);
      }

    } catch (err: any) {
      console.error("Error detallado:", err);
      alert("Error en generación: " + err.message);
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

  const handleDownloadManual = async () => {
    if (!audioUrl) return;

    const fileName = `${manualTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp3`;

    try {
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: 'Audio MP3',
            accept: { 'audio/mpeg': ['.mp3'] },
          }],
        });
        const writable = await handle.createWritable();
        const response = await fetch(audioUrl);
        const blob = await response.blob();
        await writable.write(blob);
        await writable.close();
      } else {
        const link = document.createElement('a');
        link.href = audioUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Error al descargar:", err);
        alert("Error al descargar el archivo.");
      }
    }
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
            <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Motor: Gemini 2.5 TTS + 2.0 Flash</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* COLUMNA IZQUIERDA: CONFIGURACIÓN DE PROMPTS */}
        <div className="lg:col-span-3 space-y-8">

          {/* SELECTOR DE VOZ Y TUNING */}
          <div className="bg-slate-900/60 border border-white/10 rounded-[2.5rem] p-6 space-y-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <Mic2 size={120} />
            </div>
            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-3">
                  <Sliders className="text-blue-400" size={16} /> Puesta a Punto
                </h2>
              </div>

              {/* MODOS: PREDEFINIDO vs CLONADO */}
              <div className="flex gap-2 p-1 bg-black/40 rounded-xl">
                <button
                  onClick={() => setUseClonedVoice(false)}
                  className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${!useClonedVoice ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                >
                  Voces Estudio
                </button>
                <button
                  onClick={() => setUseClonedVoice(true)}
                  className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${useClonedVoice ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                >
                  Clonar Voz Real
                </button>
              </div>

              {!useClonedVoice ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {/* COLUMNA VOCES FEMENINAS */}
                    <div className="space-y-2">
                      <h3 className="text-[9px] font-black text-pink-400 uppercase tracking-widest flex items-center gap-2 border-b border-pink-500/20 pb-1.5">
                        <Sparkles size={10} /> Femeninas
                      </h3>
                      {VOICE_OPTIONS.filter(v => v.gender === 'female').map(v => (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVoice(v.id)}
                          className={`w-full p-2 rounded-lg border text-left transition-all group ${selectedVoice === v.id ? 'bg-pink-600 border-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.4)]' : 'bg-black/20 border-white/5 hover:border-pink-500/30'}`}
                        >
                          <div className={`text-[9px] font-black uppercase truncate ${selectedVoice === v.id ? 'text-white' : 'text-slate-400 group-hover:text-pink-200'}`}>{v.label}</div>
                          <div className={`text-[7px] truncate ${selectedVoice === v.id ? 'text-pink-100' : 'text-slate-600'}`}>{v.desc}</div>
                        </button>
                      ))}
                    </div>

                    {/* COLUMNA VOCES MASCULINAS */}
                    <div className="space-y-2">
                      <h3 className="text-[9px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2 border-b border-blue-500/20 pb-1.5">
                        <Zap size={10} /> Masculinas
                      </h3>
                      {VOICE_OPTIONS.filter(v => v.gender === 'male').map(v => (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVoice(v.id)}
                          className={`w-full p-2 rounded-lg border text-left transition-all group ${selectedVoice === v.id ? 'bg-blue-600 border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-black/20 border-white/5 hover:border-blue-500/30'}`}
                        >
                          <div className={`text-[9px] font-black uppercase truncate ${selectedVoice === v.id ? 'text-white' : 'text-slate-400 group-hover:text-blue-200'}`}>{v.label}</div>
                          <div className={`text-[7px] truncate ${selectedVoice === v.id ? 'text-blue-100' : 'text-slate-600'}`}>{v.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest pl-1">Ajuste Fino para {VOICE_OPTIONS.find(v => v.id === selectedVoice)?.label}</label>
                    <textarea
                      value={voicePrompts[selectedVoice] || ''}
                      onChange={(e) => handleVoicePromptChange(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-blue-100 text-[10px] outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none h-24 placeholder:text-slate-700 font-medium leading-relaxed"
                      placeholder={`Ej: Quiero que ${VOICE_OPTIONS.find(v => v.id === selectedVoice)?.label} suene más joven...`}
                    />
                    <button
                      onClick={() => {
                        const btn = document.getElementById('btn-save-voice');
                        if (btn) {
                          const originalText = btn.innerText;
                          btn.innerText = '¡Guardado!';
                          btn.classList.add('bg-green-600', 'text-white');
                          setTimeout(() => {
                            btn.innerText = originalText;
                            btn.classList.remove('bg-green-600', 'text-white');
                          }, 2000);
                        }
                      }}
                      id="btn-save-voice"
                      className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      <Save size={12} /> Guardar Ajuste
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4 animate-fadeIn">
                  <div className="p-4 bg-purple-900/20 border border-purple-500/30 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-purple-300">
                      <UploadCloud size={16} />
                      <h3 className="text-[10px] font-black uppercase tracking-widest">Subir Muestra</h3>
                    </div>

                    <input
                      type="file"
                      accept=".mp3,audio/mpeg"
                      onChange={handleFileUpload}
                      className="w-full text-[10px] text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[9px] file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 cursor-pointer"
                    />

                    {isUploading && <div className="text-[9px] text-purple-400 font-bold animate-pulse">Subiendo...</div>}

                    {clonedVoiceUrl && (
                      <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
                        <ShieldCheck size={12} className="text-green-400" />
                        <span className="text-[9px] font-bold text-green-300">Validada</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest pl-1">Instrucciones</label>
                    <textarea
                      value={clonedVoicePrompt}
                      onChange={(e) => {
                        setClonedVoicePrompt(e.target.value);
                        localStorage.setItem('cloned_voice_prompt', e.target.value);
                      }}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-purple-100 text-[10px] outline-none focus:ring-2 focus:ring-purple-500/50 transition-all resize-none h-20 placeholder:text-slate-700 font-medium"
                      placeholder="Ej: Mantené el tono serio..."
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-[2.5rem] p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-3">
                <MessageSquare className="text-blue-400" size={16} /> Prompts Maestros
              </h2>
              {showSaved && (
                <div className="flex items-center gap-2 text-[9px] font-black text-green-400 uppercase animate-bounce">
                  <ShieldCheck size={12} /> OK
                </div>
              )}
            </div>

            <div className="space-y-3">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-blue-100 text-xs outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none h-40 placeholder:text-slate-800 font-medium leading-relaxed"
                placeholder="Reglas globales de locución..."
              />

              <button
                onClick={savePrompt}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-[9px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg group active:scale-95"
              >
                <Save size={14} className="group-hover:scale-110 transition-transform" />
                Aplicar Mejoras
              </button>
            </div>
          </div>

          <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl space-y-3">
            <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Sparkles size={12} className="text-amber-500" /> Ejemplos
            </h4>
            <div className="space-y-1.5">
              {[
                "No pronuncies las S al final.",
                "Pausas dramáticas antes de slogans.",
                "Tono amable tipo noticiero nacional."
              ].map((txt, i) => (
                <div key={i} className="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer transition-colors flex items-center gap-2 truncate" onClick={() => setAiPrompt(aiPrompt + " " + txt)}>
                  <ChevronRight size={10} /> {txt}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: PROBADOR EN TIEMPO REAL */}
        <div className="lg:col-span-9 space-y-8">
          <div className="bg-slate-900/50 border border-white/5 rounded-[3rem] p-10 relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
              <Ear size={180} />
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-4">
                  <Waves className="text-blue-400" /> Probador de Calibración
                </h2>
                <div className="flex flex-col items-end gap-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Nombre del Archivo</label>
                  <input
                    type="text"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white text-[10px] uppercase font-bold outline-none focus:ring-1 focus:ring-blue-500 transition-all w-64 shadow-inner"
                    placeholder="Ej: Voz_Prohibida"
                  />
                </div>
              </div>

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

                    <button
                      onClick={handleDownloadManual}
                      className="p-5 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-[1.5rem] transition-all group"
                      title="Descargar Audio"
                    >
                      <Download size={24} className="group-hover:scale-110 transition-transform" />
                    </button>

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
