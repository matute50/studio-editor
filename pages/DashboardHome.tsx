
import React, { useEffect, useState } from 'react';
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

const LinkTyped = Link as any;

import { Article } from '../types';
import { newsService } from '../services/newsService';

const modules = [
  { title: 'Escritorio Responsable', desc: 'Resumen de producción.', icon: UserCheck, path: '/responsable', color: 'bg-blue-900', text: 'text-blue-900', bgLight: 'bg-blue-50' },
  { title: 'VozArgentina Studio', desc: 'Calibración de IA.', icon: AudioWaveform, path: '/voz-argentina-studio', color: 'bg-indigo-600', text: 'text-indigo-600', bgLight: 'bg-indigo-50' },
  { title: 'Editor Noticias', desc: 'Redactar y publicar.', icon: Newspaper, path: '/noticias', color: 'bg-blue-600', text: 'text-blue-600', bgLight: 'bg-blue-50' },
  { title: 'Estudio Locución', desc: 'Generar audio AI.', icon: ImageIcon, path: '/audio-producer', color: 'bg-purple-600', text: 'text-purple-600', bgLight: 'bg-purple-50' },
  { title: 'Generar Slides', desc: 'Carrusel de video.', icon: Presentation, path: '/slides', color: 'bg-indigo-600', text: 'text-indigo-600', bgLight: 'bg-indigo-50' },
  { title: 'YouTube Manager', desc: 'Gestión videoteca.', icon: Video, path: '/youtube-studio', color: 'bg-red-600', text: 'text-red-600', bgLight: 'bg-red-50' },
  { title: 'Social Manager', desc: 'Publicar redes.', icon: Share2, path: '/social-manager', color: 'bg-pink-600', text: 'text-pink-600', bgLight: 'bg-pink-50' },
  { title: 'Avatar Studio', desc: 'Presentador AI.', icon: UserCheck, path: '/avatar-studio', color: 'bg-violet-600', text: 'text-violet-600', bgLight: 'bg-violet-50' },
  { title: 'Agenda Eventos', desc: 'Calendario local.', icon: CalendarDays, path: '/agenda', color: 'bg-purple-600', text: 'text-purple-600', bgLight: 'bg-purple-50' },
];

export const DashboardHome: React.FC = () => {
  const [recentArticles, setRecentArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-10 animate-fadeIn min-h-screen relative">
      {/* Background Gradient Mesh */}
      <div className="fixed inset-0 bg-slate-950 -z-20"></div>
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 -z-10 mix-blend-soft-light"></div>
      <div className="fixed top-0 -left-1/4 w-full h-full bg-blue-600/20 blur-[120px] rounded-full mix-blend-screen animate-blob"></div>
      <div className="fixed bottom-0 -right-1/4 w-full h-full bg-violet-600/20 blur-[120px] rounded-full mix-blend-screen animate-blob animation-delay-2000"></div>

      {/* Hero Section */}
      <div className="glass-panel rounded-[2.5rem] p-10 relative overflow-hidden group">
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
          <div className="hidden lg:block text-right">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Sistema Operativo</div>
            <div className="text-2xl font-bold text-white tracking-widest">SALADILLO<span className="text-blue-500">VIVO</span></div>
          </div>
        </div>

        <div className="absolute right-0 top-0 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
          <Newspaper className="w-96 h-96 -mt-24 -mr-24" />
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

          {/* Quick Stats or Promo */}
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
  );
};
