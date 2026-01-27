
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Article } from '../types';
import { 
  ShieldCheck, 
  Activity, 
  Zap, 
  Mic, 
  MonitorPlay, 
  CheckCircle2, 
  ArrowUpRight, 
  BarChart3, 
  Layers,
  RefreshCw,
  ChevronRight,
  ExternalLink,
  Database,
  Cloud
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const ResponsableWorkstation: React.FC = () => {
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
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 p-6 space-y-8 animate-fadeIn font-mono">
      {/* Header Estilo Centro de Comando */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-slate-900/40 border border-white/5 p-8 rounded-[2rem] backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.3)] border border-white/20">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-widest uppercase">Estación de Mando</h1>
            <p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.4em] mt-1">Saladillo Vivo Operator-01</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-right">
            <p className="text-3xl font-black text-white tracking-tighter">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Sistema Sincronizado</p>
          </div>
          <button onClick={fetchData} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all">
            <RefreshCw size={24} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Grid de Monitores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Noticias en Cola', value: stats.total, icon: Layers, color: 'text-blue-400', bg: 'bg-blue-400/10' },
          { label: 'Pendientes Audio', value: stats.pendingAudio, icon: Mic, color: 'text-red-400', bg: 'bg-red-400/10' },
          { label: 'Pendientes Video', value: stats.pendingSlide, icon: MonitorPlay, color: 'text-amber-400', bg: 'bg-amber-400/10' },
          { label: 'Listas para Web', value: stats.ready, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10' },
        ].map((m, i) => (
          <div key={i} className="bg-slate-900/60 border border-white/5 p-6 rounded-3xl group hover:border-white/20 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className={`${m.bg} ${m.color} p-3 rounded-xl border border-white/5`}>
                <m.icon size={20} />
              </div>
              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Monitor {i+1}</span>
            </div>
            <h3 className="text-4xl font-black text-white tracking-tighter">{m.value}</h3>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-8 overflow-hidden">
            <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-6">
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
                <Activity className="text-blue-50" size={20} /> Flujo Editorial Crítico
              </h3>
            </div>
            
            <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-4">
              {articles.map((article) => (
                <div key={article.id} className="bg-white/5 border border-white/5 rounded-2xl p-6 flex items-center justify-between group hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-6 flex-1 min-w-0">
                    <div className="w-14 h-14 bg-slate-800 rounded-xl overflow-hidden border border-white/10">
                      <img src={article.image_url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-white text-sm uppercase tracking-tight truncate">{article.title}</h4>
                      <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">{new Date(article.created_at).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${article.audio_url ? 'bg-green-600/20 border-green-500/30 text-green-400' : 'bg-red-600/20 border-red-500/30 text-red-400'}`} title="Audio Status">
                        <Mic size={14} />
                      </div>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${article.url_slide ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'bg-amber-600/20 border-amber-500/30 text-amber-400'}`} title="Video Status">
                        <MonitorPlay size={14} />
                      </div>
                    </div>
                    <Link to={!article.audio_url ? "/audio-producer" : "/slides"} className="p-3 bg-white/5 hover:bg-blue-600 text-white rounded-xl transition-all">
                      <ChevronRight size={18} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="bg-slate-900 border border-white/5 rounded-[3rem] p-8 space-y-6">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-4 flex items-center gap-2">
              <Zap size={14} className="text-blue-500" /> Atajos de Operador
            </h3>
            <div className="space-y-3">
              <Link to="/noticias" className="w-full p-5 bg-white/5 hover:bg-blue-600/20 rounded-2xl flex items-center justify-between group transition-all border border-white/5">
                <span className="font-bold text-xs uppercase text-slate-300">Redacción Central</span>
                <ArrowUpRight size={16} className="text-slate-600 group-hover:text-blue-400" />
              </Link>
              <Link to="/audio-producer" className="w-full p-5 bg-white/5 hover:bg-blue-600/20 rounded-2xl flex items-center justify-between group transition-all border border-white/5">
                <span className="font-bold text-xs uppercase text-slate-300">Estudio Broadcast</span>
                <ArrowUpRight size={16} className="text-slate-600 group-hover:text-blue-400" />
              </Link>
            </div>
          </div>

          <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-125 transition-transform duration-500">
              <BarChart3 size={100} />
            </div>
            <div className="relative z-10">
              <h4 className="font-black text-xs uppercase tracking-widest mb-2">Visitas Hoy</h4>
              <p className="text-4xl font-black">14.2K</p>
              <a href="https://www.saladillovivo.com.ar" target="_blank" className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/20 w-fit px-4 py-2 rounded-xl hover:bg-white/30 transition-all">
                Abrir Sitio <ExternalLink size={12} />
              </a>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-8">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-4">Status de Infraestructura</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database size={14} className="text-blue-500" />
                  <span className="text-xs font-bold text-slate-300">Supabase DB</span>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Cloud size={14} className="text-sky-500" />
                  <span className="text-xs font-bold text-slate-300">R2 CDN</span>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
