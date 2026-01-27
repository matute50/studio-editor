
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Article } from '../types';
import { 
  UserCheck, 
  Activity, 
  Mic, 
  MonitorPlay, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  ChevronRight,
  Database,
  Cloud,
  Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const ResponsibleDashboard: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pendingAudio: 0,
    pendingSlide: 0,
    ready: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('articles').select('*').order('created_at', { ascending: false });
      if (data) {
        setArticles(data);
        const audio = data.filter(a => !a.audio_url).length;
        const slides = data.filter(a => !a.url_slide).length;
        const ready = data.filter(a => a.audio_url && a.url_slide).length;
        setStats({
          total: data.length,
          pendingAudio: audio,
          pendingSlide: slides,
          ready: ready
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Sobrio */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-slate-900 p-8 rounded-[2rem] text-white">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center border border-white/20">
            <UserCheck size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Escritorio del Responsable</h1>
            <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Gestión de Contenidos y Multimedia</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-2xl font-black tracking-tighter">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Sincronizado</p>
          </div>
          <button onClick={fetchData} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Métricas Operativas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Noticias en Sistema', value: stats.total, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Faltan Audios', value: stats.pendingAudio, icon: Mic, color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'Faltan Slides', value: stats.pendingSlide, icon: MonitorPlay, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Contenido Completo', value: stats.ready, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
        ].map((m, i) => (
          <div key={i} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className={`${m.bg} ${m.color} p-3 rounded-xl`}>
                <m.icon size={20} />
              </div>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Métrica</span>
            </div>
            <h3 className="text-3xl font-black text-slate-800 tracking-tighter">{m.value}</h3>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Listado de Supervisión */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-black text-slate-800 flex items-center gap-3 uppercase text-xs tracking-tighter">
            <Activity className="text-blue-600" size={18} /> Supervisión de Producción
          </h3>
          <Link to="/noticias" className="text-[10px] font-black text-blue-600 uppercase hover:underline">Ver Editor Completo</Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-8 py-4">Título</th>
                <th className="px-6 py-4">Audio AI</th>
                <th className="px-6 py-4">Slide Video</th>
                <th className="px-8 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {articles.slice(0, 10).map((article) => (
                <tr key={article.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <p className="font-bold text-slate-800 text-sm truncate max-w-xs uppercase">{article.title}</p>
                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">{new Date(article.created_at).toLocaleDateString()}</p>
                  </td>
                  <td className="px-6 py-5">
                    {article.audio_url ? (
                      <span className="text-[9px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-100 uppercase">Producido</span>
                    ) : (
                      <span className="text-[9px] font-black text-red-400 bg-red-50 px-2 py-1 rounded-lg border border-red-100 uppercase">Pendiente</span>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    {article.url_slide ? (
                      <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 uppercase">Sincronizado</span>
                    ) : (
                      <span className="text-[9px] font-black text-amber-500 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 uppercase">Sin Video</span>
                    )}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <Link to={!article.audio_url ? "/audio-producer" : "/slides"} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                      <ChevronRight size={20} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Estado de Servicios */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20 text-blue-500">
            <Database size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-500">Base de Datos</p>
            <p className="text-xs font-bold">Supabase: Conectado</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center border border-sky-500/20 text-sky-500">
            <Cloud size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-500">Multimedia R2</p>
            <p className="text-xs font-bold">Cloudflare: Sincronizado</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20 text-amber-500">
            <Zap size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-500">Motor de IA</p>
            <p className="text-xs font-bold">Gemini Flash: Calibrado</p>
          </div>
        </div>
      </div>
    </div>
  );
};
