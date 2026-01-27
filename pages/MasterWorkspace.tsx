import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { getGeminiResponse } from '../services/gemini';
import { Article } from '../types';
import { 
  Briefcase, 
  Zap, 
  Activity, 
  BarChart3, 
  Megaphone, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Mic, 
  MonitorPlay, 
  Sparkles, 
  Send, 
  Loader2, 
  Calendar, 
  ArrowUpRight, 
  ExternalLink,
  ChevronRight,
  Database,
  Cloud,
  LayoutTemplate,
  ShieldCheck,
  ClipboardList,
  Target,
  History,
  // Added missing RefreshCw import
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const MasterWorkspace: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickDraft, setQuickDraft] = useState('');
  const [draftResult, setDraftResult] = useState('');
  const [isProcessingDraft, setIsProcessingDraft] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [notes, setNotes] = useState(() => localStorage.getItem('director_notes') || '');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchProductionData();
    return () => clearInterval(timer);
  }, []);

  const fetchProductionData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('articles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);
      if (data) setArticles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessDraft = async () => {
    if (!quickDraft.trim()) return;
    setIsProcessingDraft(true);
    try {
      const prompt = `
        Actúa como el jefe de redacción de Saladillo Vivo. 
        Toma este borrador o idea y transformalo en una noticia profesional con estilo rioplatense (Argentina).
        Devuelve el título y el cuerpo de la noticia.
        BORRADOR: "${quickDraft}"
      `;
      const result = await getGeminiResponse(prompt);
      setDraftResult(result);
    } catch (error) {
      setDraftResult("Che, hubo un error procesando el texto. Intentá de nuevo.");
    } finally {
      setIsProcessingDraft(false);
    }
  };

  const saveNotes = (val: string) => {
    setNotes(val);
    localStorage.setItem('director_notes', val);
  };

  const adSlots = [
    { name: 'Header Principal', sponsor: 'Municipalidad Saladillo', status: 'Activo', expiry: '15 May' },
    { name: 'Sidebar A (Noticias)', sponsor: 'Comercio Local S.A.', status: 'Por Vencer', expiry: '10 Abr' },
    { name: 'Zócalo Streaming', sponsor: 'Agro Saladillo', status: 'Activo', expiry: '01 Jun' },
    { name: 'Intersticial APP', sponsor: 'Libre', status: 'Disponible', expiry: '-' },
  ];

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Top Header & Clock */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden border border-white/5">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
            <Briefcase size={200} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <ShieldCheck size={28} />
            </div>
            <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter">Despacho de Dirección</h2>
                <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em]">Saladillo Vivo Control Center</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 relative z-10">
            <div className="text-right">
                <p className="text-3xl font-black font-mono tracking-tighter">
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {currentTime.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
            </div>
            <div className="h-12 w-[1px] bg-white/10 hidden md:block"></div>
            <div className="hidden md:flex gap-2">
                <div className="flex flex-col items-center p-2 bg-white/5 rounded-xl border border-white/10">
                    <span className="text-[9px] font-black text-slate-500 uppercase">Visitas</span>
                    <span className="text-sm font-black text-blue-400">12.4k</span>
                </div>
                <div className="flex flex-col items-center p-2 bg-white/5 rounded-xl border border-white/10">
                    <span className="text-[9px] font-black text-slate-500 uppercase">Activos</span>
                    <span className="text-sm font-black text-green-400">86</span>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Columna Izquierda: Operación Diaria */}
        <div className="lg:col-span-8 space-y-8">
            
            {/* Monitor de Producción Multimedia */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-black text-slate-800 flex items-center gap-3 uppercase text-xs tracking-tighter">
                        <Activity className="text-blue-600" size={18} /> Flujo de Producción Multimedia
                    </h3>
                    <button onClick={fetchProductionData} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                        <RefreshCw size={16} className={`${loading ? 'animate-spin' : ''} text-slate-400`} />
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <tr>
                                <th className="px-8 py-4">Noticia Reciente</th>
                                <th className="px-6 py-4">Estado Audio</th>
                                <th className="px-6 py-4">Estado Video</th>
                                <th className="px-8 py-4 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {articles.map((article) => (
                                <tr key={article.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-5">
                                        <p className="font-bold text-slate-800 text-sm line-clamp-1 uppercase tracking-tight">{article.title}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{new Date(article.created_at).toLocaleTimeString()}hs</p>
                                    </td>
                                    <td className="px-6 py-5">
                                        {article.audio_url ? (
                                            <span className="flex items-center gap-1.5 text-green-600 text-[10px] font-black bg-green-50 px-2 py-1 rounded-lg border border-green-100 uppercase">
                                                <Mic size={12} /> Producido
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5 text-red-400 text-[10px] font-black bg-red-50 px-2 py-1 rounded-lg border border-red-100 uppercase">
                                                <AlertCircle size={12} /> Pendiente
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-5">
                                        {article.url_slide ? (
                                            <span className="flex items-center gap-1.5 text-blue-600 text-[10px] font-black bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 uppercase">
                                                <MonitorPlay size={12} /> Masterizado
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5 text-amber-500 text-[10px] font-black bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 uppercase">
                                                <AlertCircle size={12} /> Sin Slide
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <Link 
                                            to={!article.audio_url ? "/audio-producer" : "/slides"} 
                                            onClick={() => !article.audio_url && localStorage.setItem('produce_audio_id', article.id.toString())}
                                            className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-blue-600 transition-all shadow-lg inline-block"
                                        >
                                            <ChevronRight size={16} />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Escritorio de Redacción IA */}
            <div className="bg-slate-50 rounded-[3rem] p-10 border border-slate-200 shadow-inner relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg text-white">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Borrador Rápido con IA</h3>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Optimización Rioplatense Directa</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <textarea 
                            value={quickDraft}
                            onChange={(e) => setQuickDraft(e.target.value)}
                            placeholder="Pegá un texto sucio, una idea o datos sueltos aquí..."
                            className="w-full h-32 bg-white border border-slate-200 rounded-[2rem] p-6 text-slate-700 font-medium placeholder:text-slate-300 outline-none focus:ring-4 focus:ring-indigo-100 transition-all resize-none"
                        />
                        <button 
                            onClick={handleProcessDraft} 
                            disabled={isProcessingDraft || !quickDraft.trim()}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                            {isProcessingDraft ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                            Argentinizar Noticia
                        </button>

                        {draftResult && (
                            <div className="mt-6 bg-white p-8 rounded-[2rem] border border-indigo-100 shadow-sm animate-fadeIn">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">Resultado Editorial</span>
                                    <button onClick={() => setDraftResult('')} className="text-slate-300 hover:text-red-500 transition-colors text-[9px] font-black uppercase">Limpiar</button>
                                </div>
                                <div className="text-slate-700 leading-relaxed font-medium whitespace-pre-line italic">
                                    {draftResult}
                                </div>
                                <div className="mt-6 flex gap-3">
                                    <button onClick={() => navigator.clipboard.writeText(draftResult)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-[10px] uppercase hover:bg-slate-200 transition-all">Copiar Texto</button>
                                    <Link to="/noticias" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-[10px] uppercase hover:bg-blue-700 text-center flex items-center justify-center gap-2">
                                        Crear Noticia <ArrowUpRight size={14} />
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Columna Derecha: Gestión Ejecutiva */}
        <div className="lg:col-span-4 space-y-8">
            
            {/* Notas del Director */}
            <div className="bg-amber-50 rounded-[2.5rem] border border-amber-200 shadow-sm p-8 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white">
                        <ClipboardList size={18} />
                    </div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-700">Agenda / Pendientes</h4>
                </div>
                <textarea 
                    value={notes}
                    onChange={(e) => saveNotes(e.target.value)}
                    placeholder="Escribí tus pendientes del día..."
                    className="w-full h-40 bg-transparent border-none text-amber-900 font-bold text-sm resize-none focus:ring-0 placeholder:text-amber-300 custom-scrollbar"
                />
                <div className="pt-2 border-t border-amber-200 flex justify-between items-center text-[8px] font-black text-amber-600 uppercase tracking-widest">
                    <span>Guardado automático</span>
                    <span>Modo Privado</span>
                </div>
            </div>

            {/* Monitor de Publicidad (Revenue) */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Megaphone size={16} className="text-purple-600" /> Control de Pautas
                    </h4>
                    <Link to="/publicidad" className="p-1.5 bg-white text-slate-400 rounded-lg border border-slate-200 hover:text-blue-600 transition-all shadow-sm">
                        <LayoutTemplate size={14} />
                    </Link>
                </div>
                <div className="p-4 space-y-3">
                    {adSlots.map((ad, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-purple-200 transition-all">
                            <div className="min-w-0">
                                <p className="text-[10px] font-black text-slate-800 uppercase truncate tracking-tight">{ad.name}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase truncate">{ad.sponsor}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase border ${
                                    ad.status === 'Activo' ? 'bg-green-50 text-green-600 border-green-100' : 
                                    ad.status === 'Por Vencer' ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' : 
                                    'bg-slate-100 text-slate-400 border-slate-200'
                                }`}>
                                    {ad.status}
                                </span>
                                <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">{ad.expiry}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Auditoría Rápida */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2">
                        <History size={16} className="text-blue-600" /> Auditoría
                    </h4>
                </div>
                <div className="p-5 space-y-4">
                    {[
                        { act: 'Slide Masterizado', obj: 'Accidente Ruta 205', time: '10 min' },
                        { act: 'Cambio de Ticker', obj: 'Alerta Clima', time: '45 min' },
                        { act: 'Nueva Noticia', obj: 'Obras en Centro', time: '2 hs' }
                    ].map((log, idx) => (
                        <div key={idx} className="flex items-start gap-3 relative">
                            {idx < 2 && <div className="absolute left-1.5 top-6 bottom-[-1rem] w-px bg-slate-100"></div>}
                            <div className="w-3 h-3 rounded-full bg-blue-500 mt-1 flex-shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight leading-none">{log.act}</p>
                                <p className="text-[9px] text-slate-400 mt-1 truncate">{log.obj} • {log.time}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Infraestructura Monitor */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white">
                <h4 className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 mb-6 border-b border-white/5 pb-4 flex items-center gap-2">
                    <Target size={14} /> Sistemas Saladillo Vivo
                </h4>
                <div className="space-y-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                                <Database size={14} className="text-blue-500" />
                            </div>
                            <span className="text-[10px] font-black uppercase text-slate-300">Base de Datos</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                            <span className="text-[9px] font-bold text-slate-500 uppercase">Online</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-sky-500/10 rounded-xl flex items-center justify-center border border-sky-500/20">
                                <Cloud size={14} className="text-sky-500" />
                            </div>
                            <span className="text-[10px] font-black uppercase text-slate-300">Almacenamiento R2</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                            <span className="text-[9px] font-bold text-slate-500 uppercase">Conectado</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20">
                                <Zap size={14} className="text-amber-500" />
                            </div>
                            <span className="text-[10px] font-black uppercase text-slate-300">Inteligencia Gemini</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                            <span className="text-[9px] font-bold text-slate-500 uppercase">Latencia: 0.8s</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};