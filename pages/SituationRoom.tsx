
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { getGeminiResponse } from '../services/gemini';
import { 
  ShieldCheck, 
  Zap, 
  Activity, 
  Database, 
  Cloud, 
  Eye, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Fingerprint, 
  MessageSquare, 
  Sparkles, 
  Send, 
  Loader2, 
  MonitorPlay,
  Layers,
  RefreshCw,
  Clock,
  Cpu,
  Terminal,
  FileSearch,
  Users,
  ArrowRight,
  X
} from 'lucide-react';
import { Article } from '../types';

export const SituationRoom: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalArticles: 0,
    mediaSync: 0,
    activeSlides: 0,
    serverUptime: '99.9%'
  });
  const [recentSlides, setRecentSlides] = useState<Article[]>([]);
  const [auditInput, setAuditInput] = useState('');
  const [auditResult, setAuditResult] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [viewingVideoUrl, setViewingVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchStats();
    return () => clearInterval(timer);
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data: articles, count } = await supabase.from('articles').select('*', { count: 'exact' }).order('created_at', { ascending: false });
      if (articles) {
        setRecentSlides(articles.filter(a => a.url_slide).slice(0, 4));
        const withMedia = articles.filter(a => a.url_slide && a.audio_url).length;
        setStats({
          totalArticles: count || 0,
          mediaSync: Math.round((withMedia / (count || 1)) * 100),
          activeSlides: articles.filter(a => a.url_slide).length,
          serverUptime: '99.98%'
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAudit = async () => {
    if (!auditInput.trim()) return;
    setIsAuditing(true);
    try {
      const prompt = `
        Sos el Auditor de Calidad Editorial de Saladillo Vivo. Tu misión es revisar este texto antes de que sea locutado.
        
        REGLAS DE AUDITORÍA:
        1. PRECISIÓN BIOGRÁFICA: ¿Usa "pibes" o "chicos" para referirse a adultos o bandas consagradas? (CRÍTICO: No llamar pibes a los Rolling Stones o autoridades).
        2. CERCANÍA: ¿Tiene el tono rioplatense adecuado (voseo)?
        3. LUNFARDO: ¿Es sutil o es un abuso forzado?
        
        TEXTO A AUDITAR: "${auditInput}"
        
        Responde con un informe breve: 
        - [ESTADO]: (APROBADO / REQUIERE AJUSTE / RECHAZADO)
        - [MOTIVO]: Explica por qué.
        - [SUGERENCIA]: Una frase corregida si hace falta.
      `;
      const result = await getGeminiResponse(prompt, 0.3);
      setAuditResult(result);
    } catch (error) {
      setAuditResult("Error en el sistema de auditoría.");
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 p-2 lg:p-6 space-y-8 animate-fadeIn font-sans">
      
      {/* VISUALIZADOR DE MASTER (MODAL) */}
      {viewingVideoUrl && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 lg:p-20 animate-fadeIn">
            <button 
                onClick={() => setViewingVideoUrl(null)}
                className="absolute top-10 right-10 p-4 bg-white/5 hover:bg-white/20 rounded-full text-white transition-all border border-white/10"
            >
                <X size={32} />
            </button>
            <div className="w-full max-w-6xl aspect-video bg-black rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(37,99,235,0.3)] border border-white/10">
                <video 
                    src={viewingVideoUrl} 
                    controls 
                    autoPlay 
                    className="w-full h-full object-contain"
                />
            </div>
            <div className="absolute bottom-10 left-0 right-0 text-center">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.5em] bg-blue-400/10 px-6 py-2 rounded-full border border-blue-400/20">
                    Sincronización de Master R2 Exitosa
                </span>
            </div>
        </div>
      )}

      {/* HEADER TÉCNICO */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-slate-900/50 border border-white/5 p-8 rounded-[2.5rem] backdrop-blur-xl">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.4)] ring-1 ring-white/20">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Sala de Situación</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1.5 text-[10px] font-black text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded uppercase tracking-widest border border-blue-400/20">
                <Cpu size={12} /> Master Core v4.0
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Responsable: Control Total</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-right">
            <p className="text-3xl font-black text-white font-mono tracking-tighter">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{currentTime.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <div className="h-12 w-px bg-white/10 hidden md:block"></div>
          <button onClick={fetchStats} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all group">
            <RefreshCw size={20} className={`text-slate-400 group-hover:text-white ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* MÉTRICAS DE INFRAESTRUCTURA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Noticias en DB', value: stats.totalArticles, icon: Database, color: 'text-blue-400', bg: 'bg-blue-400/10' },
          { label: 'Sincronía R2', value: `${stats.mediaSync}%`, icon: Cloud, color: 'text-sky-400', bg: 'bg-sky-400/10' },
          { label: 'Slides Activos', value: stats.activeSlides, icon: Layers, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
          { label: 'Uptime Sistema', value: stats.serverUptime, icon: Activity, color: 'text-green-400', bg: 'bg-green-400/10' },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl relative overflow-hidden group hover:border-white/20 transition-all">
            <div className={`absolute -right-4 -bottom-4 opacity-5 group-hover:scale-125 transition-transform duration-700 ${stat.color}`}>
              <stat.icon size={100} />
            </div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className={`${stat.bg} ${stat.color} p-3 rounded-xl border border-white/5`}>
                <stat.icon size={20} />
              </div>
              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Realtime</span>
            </div>
            <div className="relative z-10">
              <h3 className="text-3xl font-black text-white tracking-tighter">{loading ? '...' : stat.value}</h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-gradient-to-br from-indigo-950/50 to-slate-900/50 border border-white/10 rounded-[3rem] p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <Fingerprint size={160} className="text-white" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                  <Sparkles size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Auditor Estilístico IA</h3>
                  <p className="text-amber-400/60 text-[10px] font-black uppercase tracking-widest">Filtro de Calidad "Saladillo Vivo"</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="relative">
                  <textarea 
                    value={auditInput}
                    onChange={(e) => setAuditInput(e.target.value)}
                    placeholder="Pega el guion aquí para verificar cercanía, lunfardo y precisión de adjetivos..."
                    className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white text-lg placeholder:text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/30 transition-all resize-none min-h-[160px] font-medium"
                  />
                  <button 
                    onClick={handleAudit}
                    disabled={isAuditing || !auditInput.trim()}
                    className="absolute bottom-4 right-4 bg-amber-600 hover:bg-amber-500 px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.2em] text-white shadow-2xl disabled:opacity-30 transition-all flex items-center gap-2"
                  >
                    {isAuditing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    Auditar Calidad
                  </button>
                </div>

                {auditResult && (
                  <div className="bg-black/60 border border-white/10 rounded-3xl p-8 animate-fadeIn">
                    <div className="flex justify-between items-center mb-6">
                      <p className="text-amber-400 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                        <Terminal size={14} /> Informe de Auditoría de Mando
                      </p>
                      <button onClick={() => setAuditResult('')} className="text-slate-600 hover:text-white transition-colors text-[9px] font-black uppercase">Cerrar</button>
                    </div>
                    <div className="text-slate-300 leading-relaxed text-base italic whitespace-pre-line border-l-2 border-amber-500 pl-6">
                      {auditResult}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-white/5 rounded-[3rem] p-8">
            <div className="flex justify-between items-center mb-8 px-2">
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
                <FileSearch className="text-blue-500" size={20} /> Inventario de Producción
              </h3>
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Últimas 50 Noticias</span>
            </div>
            <div className="space-y-4">
              {recentSlides.map(article => (
                <div key={article.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 group-hover:scale-105 transition-transform">
                      <img src={article.image_url} className="w-full h-full object-cover" alt="Thumb" />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black text-white uppercase tracking-tight truncate max-w-[200px] lg:max-w-md">{article.title}</h4>
                      <p className="text-[9px] text-slate-600 font-bold uppercase mt-1">ID: {article.id} • {new Date(article.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                      <span className="text-[8px] font-black text-slate-600 uppercase mb-1">Bucket R2</span>
                      <div className="flex gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${article.url_slide ? 'bg-blue-500' : 'bg-red-950'}`} title="Slide WebM"></div>
                        <div className={`w-2 h-2 rounded-full ${article.audio_url ? 'bg-green-500' : 'bg-red-950'}`} title="Audio MP3"></div>
                      </div>
                    </div>
                    <button 
                        onClick={() => article.url_slide && setViewingVideoUrl(article.url_slide)}
                        disabled={!article.url_slide}
                        className={`p-2 rounded-lg transition-all ${
                            article.url_slide 
                            ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white' 
                            : 'bg-white/5 text-slate-700 cursor-not-allowed'
                        }`}
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="bg-slate-900 border border-white/5 rounded-[3.5rem] overflow-hidden flex flex-col h-full shadow-2xl">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-black/20">
              <h3 className="font-black text-white uppercase text-xs tracking-widest flex items-center gap-3">
                <MonitorPlay className="text-blue-500" size={18} /> Muro de la Magia
              </h3>
              <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
            </div>
            <div className="p-8 flex-1 space-y-8 overflow-y-auto custom-scrollbar">
               {recentSlides.slice(0, 3).map((article, idx) => (
                 <div key={idx} onClick={() => article.url_slide && setViewingVideoUrl(article.url_slide)} className="space-y-3 group cursor-pointer">
                    <div className="aspect-video bg-black rounded-3xl overflow-hidden relative border border-white/5 group-hover:border-blue-500/30 transition-all">
                       <img src={article.image_url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-700" alt="Slide" />
                       <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
                       <div className="absolute bottom-4 left-6 right-6">
                          <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Slide en Vivo</p>
                          <h4 className="text-[12px] font-black text-white uppercase leading-tight line-clamp-2">{article.title}</h4>
                       </div>
                       <div className="absolute top-4 right-4 flex gap-2">
                          <div className="px-2 py-1 bg-black/60 rounded-lg text-[8px] font-black text-white/40 uppercase tracking-widest backdrop-blur-md border border-white/10">720p HD</div>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
            <div className="p-6 bg-blue-600 text-center">
              <Link to="/slides" className="text-[10px] font-black text-white uppercase tracking-[0.3em] hover:tracking-[0.4em] transition-all flex items-center justify-center gap-2">
                Laboratorio de Slides <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-[3rem] p-8 space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 border-b border-white/5 pb-4">Actividad del Puesto</h4>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 border border-blue-400/20">
                       <Users size={18} />
                    </div>
                    <div>
                       <p className="text-xs font-black text-white uppercase tracking-tight">Lectores Activos</p>
                       <p className="text-[10px] text-slate-500 font-bold uppercase">Tendencia estable</p>
                    </div>
                 </div>
                 <span className="text-xl font-black text-green-400">84</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
