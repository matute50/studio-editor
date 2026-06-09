
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Newspaper,
  Presentation,
  CalendarDays,
  Video,
  Image as ImageIcon,
  ArrowRight,
  Clock,
  AudioWaveform,
  UserCheck,
  Share2,
  Youtube,
  Rocket,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Zap,
  FileText,
  BrainCircuit,
  Volume2,
  Layers,
  AlertTriangle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';

const LinkTyped = Link as any;

import { Article } from '../types';
import { newsService } from '../services/newsService';

// ─────────────────────────────────────────────────
// Módulos del Dashboard
// ─────────────────────────────────────────────────

const modules = [
  { title: 'Escritorio Responsable', desc: 'Resumen de producción.', icon: UserCheck, path: '/responsable', color: 'bg-blue-900', text: 'text-blue-900', bgLight: 'bg-blue-50' },
  { title: 'VozArgentina Studio', desc: 'Calibración de IA.', icon: AudioWaveform, path: '/voz-argentina-studio', color: 'bg-indigo-600', text: 'text-indigo-600', bgLight: 'bg-indigo-50' },
  { title: 'Editor Noticias', desc: 'Redactar y publicar.', icon: Newspaper, path: '/noticias', color: 'bg-blue-600', text: 'text-blue-600', bgLight: 'bg-blue-50' },
  { title: 'Estudio Locución', desc: 'Generar audio AI.', icon: ImageIcon, path: '/audio-producer', color: 'bg-purple-600', text: 'text-purple-600', bgLight: 'bg-purple-50' },
  { title: 'Generar Slides', desc: 'Carrusel de video.', icon: Presentation, path: '/slides', color: 'bg-indigo-600', text: 'text-indigo-600', bgLight: 'bg-indigo-50' },
  { title: 'Social Manager', desc: 'Publicar redes.', icon: Share2, path: '/social-manager', color: 'bg-pink-600', text: 'text-pink-600', bgLight: 'bg-pink-50' },
  { title: 'Avatar Studio', desc: 'Presentador AI.', icon: UserCheck, path: '/avatar-studio', color: 'bg-violet-600', text: 'text-violet-600', bgLight: 'bg-violet-50' },
  { title: 'Control Streaming', desc: 'YouTube Live Manager.', icon: Video, path: '/streaming', color: 'bg-red-600', text: 'text-red-600', bgLight: 'bg-red-50' },
  { title: 'YouTube Manager', desc: 'Videoteca TV.', icon: Youtube, path: '/youtube-manager', color: 'bg-rose-600', text: 'text-rose-600', bgLight: 'bg-rose-50' },
  { title: 'Agenda Eventos', desc: 'Calendario local.', icon: CalendarDays, path: '/agenda', color: 'bg-purple-600', text: 'text-purple-600', bgLight: 'bg-purple-50' },
  { title: 'Gestor Banners', desc: 'Publicidad.', icon: ImageIcon, path: '/banners', color: 'bg-emerald-600', text: 'text-emerald-600', bgLight: 'bg-emerald-50' },
];

// ─────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────

interface PipelineStats {
  crudas_pendientes: number;
  articles_total:    number;
  sin_resumen:       number;
  sin_audio:         number;
  sin_slide:         number;
  completos:         number;
  lastUpdated:       Date;
}

// ─────────────────────────────────────────────────
// PhasePill — indicador visual por fase
// ─────────────────────────────────────────────────

function PhasePill({ icon: Icon, label, count, color, pending }: {
  icon: React.ElementType;
  label: string;
  count: number;
  color: string;
  pending?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
      pending ? 'border-amber-500/30 bg-amber-500/5' : 'border-white/5 bg-white/5'
    }`}>
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-xl ${color} flex items-center justify-center shrink-0`}>
          <Icon size={14} className="text-white" />
        </div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {pending && count > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
        <span className={`text-sm font-black tabular-nums ${pending && count > 0 ? 'text-amber-400' : 'text-white'}`}>
          {count}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// DashboardHome
// ─────────────────────────────────────────────────

export const DashboardHome: React.FC = () => {
  const [recentArticles, setRecentArticles] = useState<Article[]>([]);
  const [loading, setLoading]               = useState(true);
  const [isLive, setIsLive]                 = useState(false);
  const [streamTitle, setStreamTitle]       = useState('');

  // Pipeline
  const [pipelineStats, setPipelineStats]   = useState<PipelineStats | null>(null);
  const [loadingStats, setLoadingStats]     = useState(true);
  const [isPipelining, setIsPipelining]     = useState(false);
  const [pipelinePhase, setPipelinePhase]   = useState('');
  const [pipelineOk, setPipelineOk]         = useState<boolean | null>(null);
  const refreshInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Stats del pipeline desde Supabase ──
  const fetchPipelineStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const [
        { count: crudas },
        { count: total },
        { count: sinResumen },
        { count: sinAudio },
        { count: sinSlide },
        { count: completos }
      ] = await Promise.all([
        supabase.from('articles_crudos').select('*', { count: 'exact', head: true }).eq('status', 'nuevo'),
        supabase.from('articles').select('*', { count: 'exact', head: true }),
        supabase.from('articles').select('*', { count: 'exact', head: true }).is('super_resumen', null),
        supabase.from('articles').select('*', { count: 'exact', head: true }).is('audio_url', null),
        supabase.from('articles').select('*', { count: 'exact', head: true }).is('url_slide', null),
        supabase.from('articles').select('*', { count: 'exact', head: true }).not('audio_url', 'is', null).not('url_slide', 'is', null),
      ]);

      setPipelineStats({
        crudas_pendientes: crudas    ?? 0,
        articles_total:    total     ?? 0,
        sin_resumen:       sinResumen ?? 0,
        sin_audio:         sinAudio  ?? 0,
        sin_slide:         sinSlide  ?? 0,
        completos:         completos ?? 0,
        lastUpdated:       new Date(),
      });
    } catch (err) {
      console.error('[Dashboard] Error cargando stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // ── Ejecutar pipeline rápido ──
  const handleQuickPipeline = async () => {
    if (isPipelining) return;
    setIsPipelining(true);
    setPipelineOk(null);
    try {
      setPipelinePhase('🔍 Scraping...');      await newsService.runManualScraping();
      setPipelinePhase('⚙️ Transformando...'); await newsService.transformAllRawArticles();
      setPipelinePhase('🧠 Resúmenes IA...');  await newsService.generateAllResumenes();
      setPipelinePhase('🎙️ Audio TTS...');     await newsService.generateAllAudios();
      setPipelinePhase('🎬 Slides...');         await newsService.generateAllSlides();
      setPipelineOk(true);
      setPipelinePhase('✅ Completo');
      await fetchPipelineStats();
    } catch (err: any) {
      setPipelineOk(false);
      setPipelinePhase('❌ ' + (err.message || 'Error').substring(0, 40));
    } finally {
      setIsPipelining(false);
      setTimeout(() => { setPipelinePhase(''); setPipelineOk(null); }, 5000);
    }
  };

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const data = await newsService.getArticles();
        if (data) setRecentArticles(data.slice(0, 4));
      } catch { } finally { setLoading(false); }
    };

    const fetchStreamStatus = async () => {
      const { data } = await supabase
        .from('streaming_config')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1).single();
      if (data) { setIsLive(data.is_active); setStreamTitle(data.title || ''); }
    };

    fetchRecent();
    fetchStreamStatus();
    fetchPipelineStats();

    // Auto-refresh cada 60s
    refreshInterval.current = setInterval(fetchPipelineStats, 60000);

    const channel = supabase
      .channel('streaming_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'streaming_config' }, fetchStreamStatus)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (refreshInterval.current) clearInterval(refreshInterval.current);
    };
  }, [fetchPipelineStats]);

  // Salud del pipeline
  const pipelineHealth = pipelineStats
    ? pipelineStats.completos / Math.max(pipelineStats.articles_total, 1)
    : 0;
  const healthColor = pipelineHealth >= 0.8 ? 'text-green-400' : pipelineHealth >= 0.5 ? 'text-amber-400' : 'text-red-400';
  const healthBg    = pipelineHealth >= 0.8 ? 'bg-green-500'  : pipelineHealth >= 0.5 ? 'bg-amber-500'  : 'bg-red-500';

  return (
    <div className="space-y-10 animate-fadeIn min-h-screen relative">
      {/* Fondo */}
      <div className="fixed inset-0 bg-slate-950 -z-20" />
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 -z-10 mix-blend-soft-light" />
      <div className="fixed top-0 -left-1/4 w-full h-full blur-[120px] rounded-full mix-blend-screen animate-blob bg-blue-600/20" />
      <div className="fixed bottom-0 -right-1/4 w-full h-full blur-[120px] rounded-full mix-blend-screen animate-blob animation-delay-2000 bg-violet-600/20" />

      {/* Hero */}
      <div className="glass-panel rounded-[2.5rem] p-10 relative overflow-hidden group transition-all duration-700">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-violet-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="relative z-10 flex justify-between items-end">
          <div>
            <h2 className="text-5xl font-black mb-4 uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
              Studio <span className="text-blue-500">Pro</span>
            </h2>
            <p className="text-slate-400 max-w-xl text-lg font-medium leading-relaxed">
              Centro de control de producción multimedia de alta fidelidad.
            </p>
          </div>
          <div className="hidden lg:flex flex-col items-end gap-4 text-right">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Sistema Operativo</div>
              <div className="text-2xl font-bold text-white tracking-widest">SALADILLO<span className="text-blue-500">VIVO</span></div>
            </div>
            <div className={`px-4 py-2 rounded-2xl border transition-all duration-500 flex flex-col items-end ${isLive ? 'bg-red-500/10 border-red-500/50' : 'bg-slate-800/50 border-white/5'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`} />
                <span className={`text-[10px] font-black uppercase tracking-widest ${isLive ? 'text-red-500' : 'text-slate-500'}`}>
                  {isLive ? 'Streaming En Vivo' : 'Streaming Inactivo'}
                </span>
              </div>
              {isLive && streamTitle && (
                <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase max-w-[150px] truncate">{streamTitle}</div>
              )}
            </div>
          </div>
        </div>
        <div className="absolute right-0 top-0 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
          <Newspaper className="w-96 h-96 -mt-24 -mr-24" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Módulos ── */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2 pl-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            Suite de Aplicaciones
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {modules.map((module) => (
              <LinkTyped
                key={module.path}
                to={module.path}
                className="group glass-card p-6 rounded-3xl relative overflow-hidden hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                <div className="flex items-start justify-between mb-8">
                  <div className={`w-14 h-14 rounded-2xl ${module.bgLight} ${module.text} flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-lg`}>
                    <module.icon className="w-7 h-7" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </div>
                <div>
                  <h4 className="font-black text-lg text-slate-200 uppercase tracking-tight group-hover:text-white transition-colors">{module.title}</h4>
                  <p className="text-[11px] text-slate-500 font-bold uppercase mt-2 tracking-wide group-hover:text-slate-400 transition-colors">{module.desc}</p>
                </div>
              </LinkTyped>
            ))}
          </div>
        </div>

        {/* ── Columna derecha ── */}
        <div className="space-y-6">

          {/* ══════════════════════════════
              WIDGET: PIPELINE DE PRODUCCIÓN
          ══════════════════════════════ */}
          <div>
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2 pl-2 mb-4">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              Pipeline de Producción
            </h3>
            <div className="glass-panel rounded-3xl p-6 space-y-4 relative overflow-hidden">

              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isPipelining ? 'bg-blue-600 animate-pulse' : pipelineOk === true ? 'bg-green-600' : pipelineOk === false ? 'bg-red-600' : 'bg-slate-700'}`}>
                    <Rocket size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-white uppercase tracking-wide">Auto Pipeline</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase truncate max-w-[140px]">
                      {pipelinePhase || (pipelineStats?.lastUpdated
                        ? `Act. ${pipelineStats.lastUpdated.toLocaleTimeString()}`
                        : 'Cargando...')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={fetchPipelineStats} disabled={loadingStats} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                    <RefreshCw size={12} className={`text-slate-400 ${loadingStats ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={handleQuickPipeline}
                    disabled={isPipelining}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                      isPipelining ? 'bg-slate-700 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/40'
                    }`}
                  >
                    {isPipelining ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />}
                    {isPipelining ? '...' : 'Ejecutar'}
                  </button>
                </div>
              </div>

              {/* Barra de salud */}
              {pipelineStats && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Salud del pipeline</span>
                    <span className={`text-[10px] font-black ${healthColor} uppercase`}>{Math.round(pipelineHealth * 100)}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full ${healthBg} rounded-full transition-all duration-700`} style={{ width: `${Math.round(pipelineHealth * 100)}%` }} />
                  </div>
                </div>
              )}

              {/* Fases */}
              {loadingStats ? (
                <div className="flex items-center justify-center py-6 gap-3 text-slate-500">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Sincronizando...</span>
                </div>
              ) : pipelineStats ? (
                <div className="space-y-2">
                  <PhasePill icon={FileText}     label="Crudas pendientes" count={pipelineStats.crudas_pendientes} color="bg-amber-600"  pending={pipelineStats.crudas_pendientes > 0} />
                  <PhasePill icon={Layers}        label="Total en archivo"  count={pipelineStats.articles_total}    color="bg-blue-600" />
                  <PhasePill icon={BrainCircuit}  label="Sin resumen IA"    count={pipelineStats.sin_resumen}       color="bg-indigo-600" pending={pipelineStats.sin_resumen > 0} />
                  <PhasePill icon={Volume2}       label="Sin audio TTS"     count={pipelineStats.sin_audio}         color="bg-violet-600" pending={pipelineStats.sin_audio > 0} />
                  <PhasePill icon={Presentation}  label="Sin slide visual"  count={pipelineStats.sin_slide}         color="bg-pink-600"   pending={pipelineStats.sin_slide > 0} />

                  {/* Completos */}
                  <div className="flex items-center justify-between p-3 rounded-2xl border border-green-500/20 bg-green-500/5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-green-600 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={14} className="text-white" />
                      </div>
                      <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Producción completa</span>
                    </div>
                    <span className="text-sm font-black text-green-400 tabular-nums">{pipelineStats.completos}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-6 gap-2 text-red-400">
                  <AlertTriangle size={14} />
                  <span className="text-[10px] font-bold uppercase">Error cargando stats</span>
                </div>
              )}

              {/* Próximos crons */}
              <div className="pt-2 border-t border-white/5">
                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest text-center">
                  🕐 Cron: 7hs · 10hs · 12hs · 16hs · 19hs · 22hs (UTC)
                </p>
              </div>
            </div>
          </div>

          {/* ── Actividad Reciente ── */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2 pl-2">
              <span className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" />
              Actividad Reciente
            </h3>
            <div className="glass-panel rounded-3xl overflow-hidden">
              {loading ? (
                <div className="p-10 flex flex-col items-center justify-center text-slate-500 gap-4">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-bold uppercase tracking-widest">Sincronizando...</span>
                </div>
              ) : recentArticles.length === 0 ? (
                <div className="p-10 text-center text-slate-500 italic">No hay actividad reciente.</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {recentArticles.map((article) => (
                    <div key={article.id} className="p-5 hover:bg-white/5 transition-colors group cursor-default">
                      <div className="flex gap-4">
                        <div className="w-14 h-14 rounded-xl bg-slate-800 shrink-0 overflow-hidden relative">
                          <img src={article.image_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <h5 className="text-xs font-black text-slate-300 uppercase truncate mb-1.5 group-hover:text-white transition-colors">{article.title}</h5>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(article.created_at).toLocaleDateString()}</span>
                            {(article as any).audio_url  && <span className="text-green-500/70">🎙️</span>}
                            {(article as any).url_slide  && <span className="text-blue-500/70">🎬</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Stat */}
            <div className="glass-card rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-20">
                <Video className="w-24 h-24 text-violet-500 rotate-12" />
              </div>
              <div className="relative z-10">
                <div className="text-3xl font-black text-white mb-1">24/7</div>
                <div className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Tiempo al Aire</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
