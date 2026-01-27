
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { getGeminiResponse } from '../services/gemini';
import { 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  Activity, 
  Zap, 
  Globe, 
  MessageSquare, 
  Send, 
  Eye, 
  Clock,
  LayoutGrid,
  BarChart3,
  ExternalLink,
  ChevronRight,
  MonitorPlay,
  Mic,
  Sparkles,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Article } from '../types';

export const DirectorConsole: React.FC = () => {
  const [stats, setStats] = useState({
    visits: 12450,
    activeUsers: 84,
    avgTime: '4m 12s',
    totalArticles: 0
  });
  const [loading, setLoading] = useState(true);
  const [strategyInput, setStrategyInput] = useState('');
  const [strategyOutput, setStrategyOutput] = useState('');
  const [isConsulting, setIsConsulting] = useState(false);
  const [recentLogs, setRecentLogs] = useState([
    { id: 2, action: 'Nuevo Slide HD', user: 'Editor', time: '12 min' },
    { id: 3, action: 'Publicidad Activada', user: 'Admin', time: '1h' },
  ]);

  useEffect(() => {
    const fetchMetadata = async () => {
      const { count } = await supabase.from('articles').select('*', { count: 'exact', head: true });
      setStats(prev => ({ ...prev, totalArticles: count || 0 }));
      setLoading(false);
    };
    fetchMetadata();
  }, []);

  const handleConsultStrategy = async () => {
    if (!strategyInput.trim()) return;
    setIsConsulting(true);
    try {
      const systemInstruction = `
        Actúa como un experto en lingüística del español rioplatense y consultor de medios en Argentina.
        Tu objetivo es asesorar al Director de Saladillo Vivo.
        REGLAS ESTRICTAS:
        1. Voseo Obligatorio (vos, tenés, vení).
        2. Fonética de Argentina (sh/zh).
        3. Vocabulario local (laburo, pibe, bondi, posta).
        4. Tono: Respetuoso pero cercano, con "che" ocasional.
        Responde a la siguiente consulta sobre estrategia editorial o redacción:
      `;
      const response = await getGeminiResponse(`${systemInstruction} \n\n CONSULTA: ${strategyInput}`);
      setStrategyOutput(response);
    } catch (err) {
      setStrategyOutput("Che, algo falló con la conexión. Intentá de nuevo.");
    } finally {
      setIsConsulting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12 bg-slate-50 min-h-screen">
      {/* Header Ejecutivo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-2">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-slate-900 text-amber-500 rounded-3xl flex items-center justify-center shadow-2xl ring-4 ring-slate-100">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">
              Consola de Dirección
            </h2>
            <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-200 px-2 py-0.5 rounded">Nivel Master</span>
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded flex items-center gap-1">
                    <Globe size={10} /> www.saladillovivo.com.ar
                </span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Link to="/noticias" className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
            <LayoutGrid size={16} /> Redacción
          </Link>
          <a href="https://www.saladillovivo.com.ar" target="_blank" className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all flex items-center gap-2">
            Ver Sitio <ExternalLink size={16} />
          </a>
        </div>
      </div>

      {/* Grid de Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Visitas Únicas Hoy', value: stats.visits.toLocaleString(), trend: '+14%', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Usuarios Activos', value: stats.activeUsers, trend: 'En vivo', icon: Activity, color: 'text-green-500', bg: 'bg-green-50' },
          { label: 'Permanencia Promedio', value: stats.avgTime, trend: '+0.5s', icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Artículos Publicados', value: stats.totalArticles, trend: 'Global', icon: BarChart3, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-7 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-500">
            <div className={`absolute -right-4 -bottom-4 opacity-10 group-hover:scale-125 transition-transform duration-700 ${stat.color}`}>
                <stat.icon size={110} />
            </div>
            <div className="flex justify-between items-start relative z-10 mb-4">
              <div className={`${stat.bg} ${stat.color} p-4 rounded-2xl`}>
                <stat.icon size={26} />
              </div>
              <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${stat.trend === 'En vivo' ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-green-100 text-green-600'}`}>
                {stat.trend}
              </span>
            </div>
            <div className="relative z-10">
              <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{loading ? '...' : stat.value}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Columna Izquierda: Estrategia y Control */}
        <div className="lg:col-span-8 space-y-8">
            
            {/* Consultor Editorial Rioplatense */}
            <div className="bg-slate-950 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden border border-white/5">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                    <Sparkles size={180} />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                            <Zap size={24} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight">Consultor de Estrategia</h3>
                            <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest">Motor Argentina AI v2.5</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="relative">
                            <textarea 
                                value={strategyInput}
                                onChange={(e) => setStrategyInput(e.target.value)}
                                placeholder="Consultá sobre una noticia o tendencia local... (Ej: ¿Cómo enfocamos la nota sobre el aumento del bondi en Saladillo?)"
                                className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-white text-lg placeholder:text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none min-h-[140px]"
                            />
                            <button 
                                onClick={handleConsultStrategy}
                                disabled={isConsulting || !strategyInput.trim()}
                                className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-2xl disabled:opacity-30 flex items-center gap-2"
                            >
                                {isConsulting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                Consultar
                            </button>
                        </div>

                        {strategyOutput && (
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 animate-fadeIn">
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                                    <MessageSquare size={14} className="text-blue-400" /> Respuesta del Consultor
                                </p>
                                <div className="text-blue-50 leading-relaxed text-lg italic whitespace-pre-line">
                                    "{strategyOutput}"
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Columna Derecha: Monitor Operativo */}
        <div className="lg:col-span-4 space-y-8">
            
            {/* Estado del Staff y Auditoría */}
            <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
                <div className="p-8 border-b border-slate-100">
                    <h3 className="font-black text-slate-800 flex items-center gap-3 uppercase text-xs tracking-tighter">
                        <Activity className="text-blue-600" size={18} /> Monitor de Operaciones
                    </h3>
                </div>
                <div className="p-8 flex-1">
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-xs font-black text-slate-700 uppercase">Admin Principal</span>
                            </div>
                            <span className="text-xs font-bold text-slate-400">En línea</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 opacity-60">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                                <span className="text-xs font-black text-slate-700 uppercase">Redacción A</span>
                            </div>
                            <span className="text-xs font-bold text-slate-400">Hace 4h</span>
                        </div>
                    </div>

                    <div className="mt-12">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-2">Logs Recientes</h4>
                        <div className="space-y-6">
                            {recentLogs.map(log => (
                                <div key={log.id} className="flex gap-4 group">
                                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-black text-xs">
                                        {log.user[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between">
                                            <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{log.action}</p>
                                            <span className="text-[9px] font-bold text-slate-400">{log.time}</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">Por {log.user}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-6 bg-slate-900 text-center">
                    <Link to="/control-central" className="text-[10px] font-black text-white uppercase tracking-[0.2em] hover:text-amber-400 transition-colors">
                        Ver Auditoría Completa
                    </Link>
                </div>
            </div>

            {/* Quick Access Card */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-[3rem] p-8 text-white shadow-xl shadow-amber-100 group">
                <h4 className="font-black text-xs uppercase tracking-[0.2em] mb-4">Acceso Maestro</h4>
                <div className="grid grid-cols-2 gap-3">
                    <Link to="/audio-producer" className="p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all flex flex-col items-center gap-2">
                        <Mic size={20} />
                        <span className="text-[9px] font-black uppercase">Locución</span>
                    </Link>
                    <Link to="/slides" className="p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all flex flex-col items-center gap-2">
                        <MonitorPlay size={20} />
                        <span className="text-[9px] font-black uppercase">Videos</span>
                    </Link>
                </div>
                <button className="w-full mt-4 py-3 bg-white text-orange-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:shadow-2xl transition-all">
                    Configurar Sitio
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
