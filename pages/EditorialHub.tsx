
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { 
  Briefcase, 
  Activity, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Megaphone, 
  Layout, 
  FileText, 
  Mic, 
  MonitorPlay,
  ArrowRight,
  Database,
  Cloud,
  Zap,
  Calendar,
  ExternalLink,
  ChevronRight,
  BarChart,
  Target
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Article } from '../types';

export const EditorialHub: React.FC = () => {
  const [newsStats, setNewsStats] = useState({
    total: 0,
    noAudio: 0,
    noSlide: 0,
    featured: 0
  });
  const [recentArticles, setRecentArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: articles } = await supabase.from('articles').select('*').order('created_at', { ascending: false });
      
      if (articles) {
        setRecentArticles(articles.slice(0, 5));
        setNewsStats({
          total: articles.length,
          noAudio: articles.filter(a => !a.audio_url).length,
          noSlide: articles.filter(a => !a.url_slide).length,
          featured: articles.filter(a => a.featureStatus === 'featured').length
        });
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const adCampaigns = [
    { client: 'Municipalidad de Saladillo', banner: 'Home Top', status: 'Activo', expiry: '2025-05-15', clicks: 1240 },
    { client: 'Comercio Local S.A.', banner: 'Sidebar B', status: 'Venciendo', expiry: '2025-04-10', clicks: 450 },
    { client: 'Evento Rural 2025', banner: 'Intersticial', status: 'Activo', expiry: '2025-06-01', clicks: 3200 },
  ];

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Header Ejecutivo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Briefcase className="text-amber-500" size={36} />
            Hub de Dirección Operativa
          </h2>
          <p className="text-slate-500 font-medium">Control ejecutivo y supervisión de flujo de trabajo de Saladillo Vivo</p>
        </div>
        <div className="flex gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
            <div className="px-4 py-2 bg-green-50 text-green-700 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                Sitio Live
            </div>
            <a href="https://www.saladillovivo.com.ar" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-colors">
                Abrir Portal <ExternalLink size={12} />
            </a>
        </div>
      </div>

      {/* Grid de Estado Crítico */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Noticias Totales', value: newsStats.total, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', desc: 'Base de datos' },
          { label: 'Faltan Audios', value: newsStats.noAudio, icon: Mic, color: 'text-red-500', bg: 'bg-red-50', desc: 'Requiere atención' },
          { label: 'Faltan Slides', value: newsStats.noSlide, icon: MonitorPlay, color: 'text-amber-500', bg: 'bg-amber-50', desc: 'Producción video' },
          { label: 'Destacadas Hoy', value: newsStats.featured, icon: Target, color: 'text-indigo-600', bg: 'bg-indigo-50', desc: 'Portada activa' },
        ].map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className={`absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500 ${item.color}`}>
              <item.icon size={100} />
            </div>
            <div className="flex justify-between items-start relative z-10">
              <div className={`${item.bg} ${item.color} p-3 rounded-2xl`}>
                <item.icon size={24} />
              </div>
              {item.value > 5 && item.label.includes('Faltan') && (
                <div className="bg-red-100 text-red-600 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase">Crítico</div>
              )}
            </div>
            <div className="mt-4 relative z-10">
              <h3 className="text-3xl font-black text-slate-800">{loading ? '...' : item.value}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{item.label}</p>
              <p className="text-[9px] font-bold text-slate-400 italic mt-0.5">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna Izquierda: Supervisión Editorial */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Cola de Producción Pendiente */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-black text-slate-800 flex items-center gap-3 uppercase text-sm tracking-tighter">
                    <Activity className="text-blue-600" size={20} /> Cola de Producción Editorial
                </h3>
                <Link to="/noticias" className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-1">
                    Gestionar Noticias <ChevronRight size={14} />
                </Link>
            </div>
            <div className="divide-y divide-slate-50">
                {loading ? (
                    <div className="p-12 text-center text-slate-400 font-bold uppercase text-xs">Sincronizando flujo...</div>
                ) : recentArticles.length === 0 ? (
                    <div className="p-12 text-center text-slate-300 italic">No hay actividad reciente.</div>
                ) : recentArticles.map((article) => (
                    <div key={article.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-100">
                                {article.image_url ? <img src={article.image_url} className="w-full h-full object-cover" /> : <Layout className="m-auto mt-3 text-slate-200" size={20}/>}
                            </div>
                            <div className="min-w-0">
                                <h4 className="font-bold text-slate-800 text-sm truncate uppercase tracking-tight">{article.title}</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(article.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${article.audio_url ? 'bg-green-50 border-green-100 text-green-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
                                <Mic size={12} />
                                <span className="text-[8px] font-black uppercase">{article.audio_url ? 'Audio OK' : 'Falta'}</span>
                            </div>
                            <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${article.url_slide ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>
                                <MonitorPlay size={12} />
                                <span className="text-[8px] font-black uppercase">{article.url_slide ? 'Video OK' : 'Falta'}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Nota: Las noticias sin audio ni slide no aparecerán correctamente en la visualización de la APP móvil.
                </p>
            </div>
          </div>

          {/* Gestión de Publicidad Rápida */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-black text-slate-800 flex items-center gap-3 uppercase text-sm tracking-tighter">
                    <Megaphone className="text-purple-600" size={20} /> Campañas Publicitarias Activas
                </h3>
                <Link to="/publicidad" className="text-[10px] font-black text-purple-600 hover:text-purple-700 uppercase tracking-widest flex items-center gap-1">
                    Gestor Completo <ChevronRight size={14} />
                </Link>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <tr>
                            <th className="px-8 py-4">Sponsor / Cliente</th>
                            <th className="px-6 py-4">Ubicación</th>
                            <th className="px-6 py-4">Estado</th>
                            <th className="px-6 py-4">Vencimiento</th>
                            <th className="px-8 py-4 text-right">Clicks</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {adCampaigns.map((ad, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-8 py-4 font-bold text-slate-700 text-sm">{ad.client}</td>
                                <td className="px-6 py-4 text-xs text-slate-500 font-bold uppercase">{ad.banner}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                                        ad.status === 'Activo' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                        {ad.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-xs font-mono text-slate-600">{ad.expiry}</td>
                                <td className="px-8 py-4 text-right font-black text-blue-600">{ad.clicks}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Métricas y Quick Actions */}
        <div className="space-y-6">
            
            {/* Tarjeta de Métricas Rápidas */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/30 transition-all duration-500"></div>
                <div className="relative z-10">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-6">Tráfico Saladillo Vivo</h4>
                    <div className="space-y-6">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase">Lecturas Hoy</p>
                                <p className="text-4xl font-black">12.4k</p>
                            </div>
                            <div className="flex items-center gap-1 text-green-400 text-xs font-bold mb-1">
                                <TrendingUp size={16} /> +12%
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                                <span>Engagement</span>
                                <span>82%</span>
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 w-[82%] shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Accesos Directos Ejecutivos */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 px-2">Acciones Ejecutivas</h4>
                <Link to="/ticker" className="w-full p-4 bg-red-50 hover:bg-red-100 text-red-700 rounded-2xl flex items-center justify-between transition-all group">
                    <div className="flex items-center gap-3">
                        <Zap size={20} className="text-red-600" />
                        <span className="font-bold text-xs uppercase">Noticia Urgente</span>
                    </div>
                    <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </Link>
                <Link to="/agenda" className="w-full p-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-between transition-all group">
                    <div className="flex items-center gap-3">
                        <Calendar size={20} className="text-indigo-600" />
                        <span className="font-bold text-xs uppercase">Agenda de Ciudad</span>
                    </div>
                    <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </Link>
                <Link to="/header-images" className="w-full p-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-between transition-all group">
                    <div className="flex items-center gap-3">
                        <Layout size={20} className="text-blue-600" />
                        <span className="font-bold text-xs uppercase">Portada / Header</span>
                    </div>
                    <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </Link>
            </div>

            {/* Estado de la Infraestructura */}
            <div className="bg-slate-50 rounded-[2rem] border border-slate-200 p-6 space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-2">Infraestructura AI</h4>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2">
                            <Database size={14} className="text-blue-500" />
                            <span className="text-[10px] font-bold text-slate-700">Supabase</span>
                        </div>
                        <CheckCircle2 size={12} className="text-green-500" />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2">
                            <Cloud size={14} className="text-sky-500" />
                            <span className="text-[10px] font-bold text-slate-700">Cloudflare R2</span>
                        </div>
                        <CheckCircle2 size={12} className="text-green-500" />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2">
                            <Zap size={14} className="text-amber-500" />
                            <span className="text-[10px] font-bold text-slate-700">Gemini Pro API</span>
                        </div>
                        <CheckCircle2 size={12} className="text-green-500" />
                    </div>
                </div>
            </div>

            {/* Auditoría de Seguridad Rápida */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-950 rounded-[2.5rem] p-8 text-white shadow-xl">
                <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-4 flex items-center gap-2">
                    <Target size={14} /> Seguridad de Redacción
                </h4>
                <p className="text-xs text-slate-400 font-medium mb-6 italic leading-relaxed">
                    "Todas las acciones en este panel son auditadas para garantizar la integridad informativa de Saladillo Vivo."
                </p>
                <div className="flex items-center gap-3 text-amber-400 bg-amber-400/10 p-4 rounded-2xl border border-amber-400/20">
                    <AlertCircle size={20} />
                    <div>
                        <p className="text-[10px] font-black uppercase">IP Autorizada</p>
                        <p className="text-[9px] font-bold opacity-70 tracking-tighter">Acceso restringido a terminales seguras.</p>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};
