
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { getGeminiResponse } from '../services/gemini';
import { 
  Zap, 
  ShieldCheck, 
  Activity, 
  Database, 
  Cloud, 
  Mic, 
  MonitorPlay, 
  Sparkles, 
  Send, 
  Loader2, 
  Clock, 
  AlertCircle,
  FileText,
  TrendingUp,
  RefreshCw,
  Terminal,
  Cpu,
  Fingerprint,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Article } from '../types';

export const ResponsibleCockpit: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<Article[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [isConsulting, setIsConsulting] = useState(false);
  const [integrityStats, setIntegrityStats] = useState({
    total: 0,
    missingAudio: 0,
    missingSlide: 0,
    healthy: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('articles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data) {
        setArticles(data);
        const missingA = data.filter(a => !a.audio_url).length;
        const missingS = data.filter(a => !a.url_slide).length;
        const total = data.length;
        setIntegrityStats({
          total,
          missingAudio: missingA,
          missingSlide: missingS,
          healthy: data.filter(a => a.audio_url && a.url_slide).length
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditorialChat = async () => {
    if (!chatInput.trim()) return;
    setIsConsulting(true);
    try {
      const prompt = `
        Consultoría Editorial de Saladillo Vivo.
        Pregunta del Responsable: "${chatInput}"
        REGLAS: Responde con autoridad, tono rioplatense, sé directo y no menciones innecesariamente el nombre del medio.
      `;
      const res = await getGeminiResponse(prompt, 0.4);
      setChatResponse(res);
    } catch (err) {
      setChatResponse("Error en la conexión con la neurona AI.");
    } finally {
      setIsConsulting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 p-6 space-y-8 animate-fadeIn">
      
      {/* HEADER MASTER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-slate-900/50 border border-white/5 p-10 rounded-[3rem] backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-[0_0_50px_rgba(37,99,235,0.3)] ring-1 ring-white/20">
            <ShieldCheck size={40} className="text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">Cockpit Master</h1>
            <div className="flex items-center gap-3 mt-3">
              <span className="flex items-center gap-1.5 text-[10px] font-black text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full border border-blue-400/20 uppercase tracking-widest">
                <Cpu size={12} /> Responsable ID: SV-01
              </span>
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Sincronización Global Activa</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8 bg-black/40 p-6 rounded-[2rem] border border-white/5">
          <div className="text-right">
            <p className="text-3xl font-black text-white font-mono tracking-tighter">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Master Clock</p>
          </div>
          <div className="h-10 w-px bg-white/10"></div>
          <button onClick={fetchData} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all">
            <RefreshCw size={24} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUMNA IZQUIERDA: INTEGRIDAD Y CHAT */}
        <div className="lg:col-span-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden group">
               <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-125 transition-transform duration-700 text-blue-400">
                  <FileText size={100} />
               </div>
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Noticias</p>
               <h3 className="text-4xl font-black text-white">{integrityStats.total}</h3>
               <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-blue-400">
                  <TrendingUp size={12} /> +{articles.slice(0, 5).length} hoy
               </div>
            </div>
            
            <div className={`border p-8 rounded-[2.5rem] relative overflow-hidden group ${integrityStats.missingAudio > 0 ? 'bg-red-950/20 border-red-500/20' : 'bg-slate-900 border-white/5'}`}>
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Sin Locución</p>
               <h3 className={`text-4xl font-black ${integrityStats.missingAudio > 0 ? 'text-red-500' : 'text-white'}`}>{integrityStats.missingAudio}</h3>
            </div>

            <div className={`border p-8 rounded-[2.5rem] relative overflow-hidden group ${integrityStats.missingSlide > 0 ? 'bg-amber-950/20 border-amber-500/20' : 'bg-slate-900 border-white/5'}`}>
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Sin Slide Video</p>
               <h3 className={`text-4xl font-black ${integrityStats.missingSlide > 0 ? 'text-amber-500' : 'text-white'}`}>{integrityStats.missingSlide}</h3>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-950/30 to-slate-900/50 border border-white/10 rounded-[3rem] p-10 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                <Fingerprint size={160} />
             </div>
             <div className="relative z-10">
                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8 flex items-center gap-3">
                   <Sparkles className="text-blue-400" /> Consultor Editorial Master
                </h3>
                
                <div className="space-y-6">
                  <div className="relative">
                    <textarea 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Consultá sobre una decisión editorial, un título o un enfoque de noticia..."
                      className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white text-lg placeholder:text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/30 transition-all resize-none min-h-[140px]"
                    />
                    <button 
                      onClick={handleEditorialChat}
                      disabled={isConsulting || !chatInput.trim()}
                      className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-2xl disabled:opacity-30 flex items-center gap-2"
                    >
                      {isConsulting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      Consultar
                    </button>
                  </div>

                  {chatResponse && (
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 animate-fadeIn">
                       <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Terminal size={14} /> Recomendación Editorial
                       </p>
                       <div className="text-blue-50 leading-relaxed text-lg italic whitespace-pre-line">
                          "{chatResponse}"
                       </div>
                    </div>
                  )}
                </div>
             </div>
          </div>
        </div>

        {/* COLUMNA DERECHA */}
        <div className="lg:col-span-4 space-y-8">
            <div className="bg-slate-900 border border-white/5 rounded-[3rem] p-8 space-y-4 shadow-2xl">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-4">Nodos Críticos</h3>
                <Link to="/noticias" className="w-full p-5 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-between group transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-600/20 text-blue-400 rounded-xl flex items-center justify-center border border-blue-400/20"><FileText size={18}/></div>
                        <span className="font-bold text-sm text-slate-300">Editor de Noticias</span>
                    </div>
                    <ArrowUpRight size={16} className="text-slate-600 group-hover:text-white" />
                </Link>
                <Link to="/audio-producer" className="w-full p-5 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-between group transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-green-600/20 text-green-400 rounded-xl flex items-center justify-center border border-green-400/20"><Mic size={18}/></div>
                        <span className="font-bold text-sm text-slate-300">Broadcast Studio</span>
                    </div>
                    <ArrowUpRight size={16} className="text-slate-600 group-hover:text-white" />
                </Link>
                <Link to="/slides" className="w-full p-5 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-between group transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-purple-600/20 text-purple-400 rounded-xl flex items-center justify-center border border-purple-400/20"><MonitorPlay size={18}/></div>
                        <span className="font-bold text-sm text-slate-300">Generador de Video</span>
                    </div>
                    <ArrowUpRight size={16} className="text-slate-600 group-hover:text-white" />
                </Link>
            </div>

            <div className="bg-slate-900 border border-white/5 rounded-[3rem] p-8 space-y-6">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-4">Estado del Sistema</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Database size={14} className="text-blue-500" />
                      <span className="text-xs font-bold">Supabase DB</span>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Cloud size={14} className="text-sky-500" />
                      <span className="text-xs font-bold">Cloudflare R2</span>
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
