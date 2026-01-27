
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
  UserCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Article } from '../types';

const modules = [
  { title: 'Escritorio Responsable', desc: 'Resumen de producción.', icon: UserCheck, path: '/responsable', color: 'bg-blue-900', text: 'text-blue-900', bgLight: 'bg-blue-50' },
  { title: 'VozArgentina Studio', desc: 'Calibración de IA.', icon: AudioWaveform, path: '/voz-argentina-studio', color: 'bg-indigo-600', text: 'text-indigo-600', bgLight: 'bg-indigo-50' },
  { title: 'Editor Noticias', desc: 'Redactar y publicar.', icon: Newspaper, path: '/noticias', color: 'bg-blue-600', text: 'text-blue-600', bgLight: 'bg-blue-50' },
  { title: 'Estudio Locución', desc: 'Generar audio AI.', icon: ImageIcon, path: '/audio-producer', color: 'bg-purple-600', text: 'text-purple-600', bgLight: 'bg-purple-50' },
  { title: 'Generar Slides', desc: 'Carrusel de video.', icon: Presentation, path: '/slides', color: 'bg-indigo-600', text: 'text-indigo-600', bgLight: 'bg-indigo-50' },
  { title: 'Agenda Eventos', desc: 'Calendario local.', icon: CalendarDays, path: '/agenda', color: 'bg-purple-600', text: 'text-purple-600', bgLight: 'bg-purple-50' },
];

export const DashboardHome: React.FC = () => {
  const [recentArticles, setRecentArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecent = async () => {
      const { data } = await supabase
        .from('articles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(4);
      
      if (data) setRecentArticles(data);
      setLoading(false);
    };

    fetchRecent();
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black mb-2 uppercase">Gestión Saladillo Vivo</h2>
          <p className="text-slate-400 max-w-xl text-lg font-medium">
            Acceso directo a las herramientas de redacción y producción multimedia.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
          <Newspaper className="w-64 h-64 -mb-12 -mr-12" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            Herramientas Operativas
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {modules.map((module) => (
              <Link 
                key={module.path} 
                to={module.path}
                className="group bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex items-center gap-4"
              >
                <div className={`w-12 h-12 rounded-xl ${module.bgLight} ${module.text} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                  <module.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-[13px] text-slate-800 uppercase group-hover:text-blue-600 transition-colors">{module.title}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{module.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            Actividad Reciente
          </h3>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-slate-400">Sincronizando...</div>
            ) : recentArticles.length === 0 ? (
              <div className="p-8 text-center text-slate-300 italic">No hay noticias.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentArticles.map((article) => (
                  <div key={article.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex gap-3">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 shrink-0 overflow-hidden">
                        <img src={article.image_url} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="text-[11px] font-black text-slate-800 uppercase truncate mb-1">{article.title}</h5>
                        <div className="flex items-center text-[9px] text-slate-400 font-bold uppercase gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(article.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
