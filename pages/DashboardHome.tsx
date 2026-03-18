
import React, { useEffect, useRef, useState } from 'react';
import {
  Newspaper,
  Presentation,
  CalendarDays,
  Megaphone,
  Video,
  Radio,
  Image as ImageIcon,
  ArrowRight,
  Clock,
  AudioWaveform,
  UserCheck,
  Share2,
  Clapperboard
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';

const LinkTyped = Link as any;

import { Article } from '../types';
import { newsService } from '../services/newsService';

const LIVE_THRESHOLD_MS = 10_000;
const POLL_INTERVAL_MS  = 5_000;

const modules = [
  { title: 'Escritorio Responsable', desc: 'Resumen de producción.', icon: UserCheck, path: '/responsable', color: 'bg-blue-900', text: 'text-blue-900', bgLight: 'bg-blue-50' },
  { title: 'VozArgentina Studio', desc: 'Calibración de IA.', icon: AudioWaveform, path: '/voz-argentina-studio', color: 'bg-indigo-600', text: 'text-indigo-600', bgLight: 'bg-indigo-50' },
  { title: 'Editor Noticias', desc: 'Redactar y publicar.', icon: Newspaper, path: '/noticias', color: 'bg-blue-600', text: 'text-blue-600', bgLight: 'bg-blue-50' },
  { title: 'Estudio Locución', desc: 'Generar audio AI.', icon: ImageIcon, path: '/audio-producer', color: 'bg-purple-600', text: 'text-purple-600', bgLight: 'bg-purple-50' },
  { title: 'Generar Slides', desc: 'Carrusel de video.', icon: Presentation, path: '/slides', color: 'bg-indigo-600', text: 'text-indigo-600', bgLight: 'bg-indigo-50' },
  { title: 'YouTube Manager', desc: 'Gestión videoteca.', icon: Video, path: '/youtube-studio', color: 'bg-red-600', text: 'text-red-600', bgLight: 'bg-red-50' },
  { title: 'Social Manager', desc: 'Publicar redes.', icon: Share2, path: '/social-manager', color: 'bg-pink-600', text: 'text-pink-600', bgLight: 'bg-pink-50' },
  { title: 'Avatar Studio', desc: 'Presentador AI.', icon: UserCheck, path: '/avatar-studio', color: 'bg-violet-600', text: 'text-violet-600', bgLight: 'bg-violet-50' },
  { title: 'Control Streaming', desc: 'Transmisiones en vivo.', icon: Radio, path: '/streaming', color: 'bg-red-600', text: 'text-red-600', bgLight: 'bg-red-50' },
  { title: 'Agenda Eventos', desc: 'Calendario local.', icon: CalendarDays, path: '/agenda', color: 'bg-purple-600', text: 'text-purple-600', bgLight: 'bg-purple-50' },
];

export const DashboardHome: React.FC = () => {
  const [recentArticles, setRecentArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  // ── STREAMING SWITCH ──────────────────────────────────────────────────────
  const [mode, setMode] = useState<'VIDEOS' | 'STREAMING'>('VIDEOS');
  const [isManual, setIsManual] = useState(false);
  const [streamTitle, setStreamTitle] = useState<string | null>(null);
  const manualRef = useRef(isManual);
  manualRef.current = isManual;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const { data } = await supabase
          .from('streaming_config')
          .select('stream_url, started_at, title, is_active')
          .eq('is_active', true)
          .order('started_at', { ascending: false })
          .limit(1)
          .single();

        if (data?.started_at && data.is_active) {
          const age = Date.now() - new Date(data.started_at).getTime();
          if (age > LIVE_THRESHOLD_MS && !manualRef.current) {
            setMode('STREAMING');
            setStreamTitle((data as any).title || null);
          }
        } else if (!manualRef.current) {
          setMode('VIDEOS');
          setStreamTitle(null);
        }
      } catch (_) {
        if (!manualRef.current) {
          setMode('VIDEOS');
          setStreamTitle(null);
        }
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();
    return () => { if (timer) clearTimeout(timer); };
  }, []);

  const handleToggle = () => {
    setMode(prev => prev === 'VIDEOS' ? 'STREAMING' : 'VIDEOS');
    setIsManual(true);
  };

  const handleResetAuto = () => setIsManual(false);
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const data = await newsService.getArticles();
        if (data) setRecentArticles(data.slice(0, 4));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecent();
  }, []);

  const isStreaming = mode === 'STREAMING';

  return (
    <div className="space-y-10 animate-fadeIn min-h-screen relative">
      {/* Background Gradient Mesh */}
      <div className="fixed inset-0 bg-slate-950 -z-20"></div>
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 -z-10 mix-blend-soft-light"></div>
      <div className={`fixed top-0 -left-1/4 w-full h-full blur-[120px] rounded-full mix-blend-screen animate-blob transition-colors duration-1000 ${isStreaming ? 'bg-red-600/20' : 'bg-blue-600/20'}`}></div>
      <div className={`fixed bottom-0 -right-1/4 w-full h-full blur-[120px] rounded-full mix-blend-screen animate-blob animation-delay-2000 transition-colors duration-1000 ${isStreaming ? 'bg-orange-600/20' : 'bg-violet-600/20'}`}></div>

      {/* Hero Section */}
      <div className={`glass-panel rounded-[2.5rem] p-10 relative overflow-hidden group transition-all duration-700 ${isStreaming ? 'border border-red-500/20' : ''}`}>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-violet-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        <div className="relative z-10 flex justify-between items-end">
          <div>
            <h2 className="text-5xl font-black mb-4 uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
              Studio <span className="text-blue-500">Pro</span>
            </h2>
            <p className="text-slate-400 max-w-xl text-lg font-medium leading-relaxed">
              Centro de control de producción multimedia de alta fidelidad.
            </p>
          </div>

          {/* ── BLOQUE DERECHO: SALADILLO VIVO + SWITCH ── */}
          <div className="hidden lg:flex flex-col items-end gap-4">
            <div className="text-right">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Sistema Operativo</div>
              <div className="text-2xl font-bold text-white tracking-widest">SALADILLO<span className="text-blue-500">VIVO</span></div>
            </div>

            {/* SWITCH VIDEOS / STREAMING */}
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-3">
                {/* Label VIDEOS */}
                <span className={`text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${!isStreaming ? 'text-[#00B140]' : 'text-slate-600'}`}>
                  VIDEOS
                </span>

                {/* Toggle pill */}
                <button
                  onClick={handleToggle}
                  aria-label="Cambiar modo Videos/Streaming"
                  className={`relative w-14 h-7 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 shadow-lg
                    ${isStreaming
                      ? 'bg-red-500 focus:ring-red-500 shadow-[0_0_16px_rgba(239,68,68,0.4)]'
                      : 'bg-[#00B140] focus:ring-green-500 shadow-[0_0_16px_rgba(0,177,64,0.35)]'
                    }`}
                >
                  <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300
                    ${isStreaming ? 'left-8' : 'left-1'}`}
                  />
                  {isStreaming && (
                    <span className="absolute top-1 left-8 w-5 h-5 rounded-full bg-red-300 animate-ping opacity-60 pointer-events-none" />
                  )}
                </button>

                {/* Label STREAMING */}
                <span className={`text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${isStreaming ? 'text-red-400' : 'text-slate-600'}`}>
                  STREAMING
                </span>
              </div>

              {/* Indicadores de estado y modo */}
              <div className="flex items-center gap-2 justify-end">
                {isStreaming && streamTitle && (
                  <span className="text-[9px] text-red-400 font-bold truncate max-w-[160px]">{streamTitle}</span>
                )}
                {isManual ? (
                  <button
                    onClick={handleResetAuto}
                    className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white border border-slate-700 hover:border-slate-500 px-2 py-0.5 rounded-full transition-all"
                  >
                    MANUAL · restablecer AUTO
                  </button>
                ) : (
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00B140] animate-pulse inline-block" />
                    AUTO
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Icono decorativo — cambia según modo */}
        <div className="absolute right-0 top-0 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
          {isStreaming
            ? <Radio className="w-96 h-96 -mt-24 -mr-24" />
            : <Newspaper className="w-96 h-96 -mt-24 -mr-24" />
          }
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Modules Grid */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2 pl-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            Suite de Aplicaciones
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {modules.map((module) => (
              <LinkTyped
                key={module.path}
                to={module.path}
                className="group glass-card p-6 rounded-3xl relative overflow-hidden hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>

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

        {/* Activity Feed */}
        <div className="space-y-6">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2 pl-2">
            <span className="w-2 h-2 bg-violet-500 rounded-full animate-pulse"></span>
            Actividad Reciente
          </h3>
          <div className="glass-panel rounded-3xl overflow-hidden min-h-[400px]">
            {loading ? (
              <div className="p-10 flex flex-col items-center justify-center text-slate-500 gap-4 h-full">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
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
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h5 className="text-xs font-black text-slate-300 uppercase truncate mb-1.5 group-hover:text-white transition-colors">{article.title}</h5>
                        <div className="flex items-center text-[10px] text-slate-500 font-bold uppercase gap-2">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(article.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className={`glass-card rounded-3xl p-6 relative overflow-hidden transition-all duration-700 ${isStreaming ? 'border border-red-500/20' : ''}`}>
            <div className="absolute top-0 right-0 p-4 opacity-20">
              {isStreaming
                ? <Radio className="w-24 h-24 text-red-500 rotate-12" />
                : <Video className="w-24 h-24 text-violet-500 rotate-12" />
              }
            </div>
            <div className="relative z-10">
              {isStreaming ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse" />
                    <div className="text-2xl font-black text-red-400">EN VIVO</div>
                  </div>
                  <div className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Stream Activo</div>
                </>
              ) : (
                <>
                  <div className="text-3xl font-black text-white mb-1">24/7</div>
                  <div className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Tiempo al Aire</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
