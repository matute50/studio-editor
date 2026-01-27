
import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Cpu, 
  Activity, 
  Terminal, 
  Zap, 
  Database, 
  Cloud, 
  RefreshCw, 
  Eye, 
  MessageSquare,
  Sparkles,
  Send,
  Loader2,
  Lock,
  Wifi,
  History,
  LayoutGrid
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { getGeminiResponse } from '../services/gemini';

export const OperatorTerminal: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase.from('articles').select('title, created_at').order('created_at', { ascending: false }).limit(5);
    setLogs(data || []);
    setLoading(false);
  };

  const handleCommand = async () => {
    if (!input.trim()) return;
    setIsProcessing(true);
    try {
      const res = await getGeminiResponse(`Terminal de Comando Saladillo Vivo. Instrucción: ${input}. Responde breve y técnicamente.`, 0.3);
      setResponse(res);
    } catch (err) {
      setResponse("ERROR_CONNECTION_LOST: Reintentando...");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-400 relative overflow-hidden font-mono selection:bg-blue-500/30">
      {/* FONDO TÉCNICO: GRID Y MATRIZ */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0" style={{ 
          backgroundImage: `linear-gradient(rgba(30, 41, 59, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(30, 41, 59, 0.5) 1px, transparent 1px)`, 
          backgroundSize: '40px 40px' 
        }} />
        <div className="absolute inset-0 flex flex-wrap gap-12 p-8 overflow-hidden select-none">
          {Array.from({ length: 60 }).map((_, i) => (
            <div key={i} className="text-[8px] text-blue-900/40 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
              SALADILLOVIVO_DATA_IN >> 0x{Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 p-8 max-w-7xl mx-auto space-y-8">
        {/* HEADER TERMINAL */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-black/40 border border-white/10 p-8 rounded-3xl backdrop-blur-xl">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center border border-blue-600/30 shadow-[0_0_20px_rgba(37,99,235,0.2)]">
              <Cpu size={32} className="text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tighter uppercase">Terminal Operativa</h1>
              <div className="flex items-center gap-4 mt-1 text-[10px] font-black uppercase tracking-widest">
                <span className="flex items-center gap-1.5 text-blue-400"><Wifi size={12}/> System Online</span>
                <span className="text-slate-600">ID: SALADILLO_CORE_01</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xl font-black text-white">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Master Synchronous Clock</p>
            </div>
            <button onClick={fetchLogs} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all">
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LADO IZQUIERDO: COMANDOS */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-black/40 border border-white/10 rounded-[2rem] p-8 space-y-6">
              <div className="flex items-center gap-3 text-blue-500 border-b border-white/5 pb-4">
                <Terminal size={20} />
                <span className="text-xs font-black uppercase tracking-widest">Command Interface v4.0</span>
              </div>
              <div className="space-y-4">
                <div className="relative">
                  <textarea 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ingrese comando de auditoría o consulta estratégica..."
                    className="w-full h-40 bg-black/60 border border-white/5 rounded-2xl p-6 text-blue-100 outline-none focus:ring-1 focus:ring-blue-500/50 transition-all resize-none placeholder:text-slate-800"
                  />
                  <button 
                    onClick={handleCommand}
                    disabled={isProcessing || !input.trim()}
                    className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl disabled:opacity-30"
                  >
                    {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                  </button>
                </div>

                {response && (
                  <div className="bg-blue-950/20 border border-blue-500/20 rounded-2xl p-6 animate-fadeIn">
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-3">System Response:</p>
                    <div className="text-sm text-blue-200 leading-relaxed italic">
                      {response}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-[2rem] p-8">
              <div className="flex items-center gap-3 text-slate-500 mb-6">
                <History size={18} />
                <span className="text-xs font-black uppercase tracking-widest">Event Log</span>
              </div>
              <div className="space-y-3">
                {logs.map((log, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 text-[11px]">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-600">[{new Date(log.created_at).toLocaleTimeString()}]</span>
                      <span className="text-slate-300 font-bold uppercase truncate max-w-md">{log.title}</span>
                    </div>
                    <span className="text-blue-500 font-black">OK</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* LADO DERECHO: STATUS */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-black/40 border border-white/10 rounded-[2rem] p-8 space-y-6">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-4">Core Telemetry</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs">Database Engine</span>
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs">Storage (R2)</span>
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs">AI Inference</span>
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                </div>
              </div>
            </div>

            <div className="bg-blue-600 rounded-[2rem] p-8 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-125 transition-transform duration-500">
                <ShieldCheck size={80} />
              </div>
              <div className="relative z-10">
                <h4 className="font-black text-xs uppercase tracking-widest mb-2">Master Override</h4>
                <p className="text-[10px] font-bold opacity-80 leading-relaxed mb-6">Acceso directo a la consola de administración global.</p>
                <button className="w-full py-3 bg-white text-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:shadow-xl transition-all">
                  Launch Master
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border border-white/5 rounded-[2rem] p-8">
              <div className="flex items-center gap-3 mb-4">
                <Activity size={16} className="text-blue-500" />
                <span className="text-[10px] font-black uppercase text-slate-500">Processing Load</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-[24%] animate-pulse"></div>
              </div>
              <p className="text-[9px] text-slate-600 mt-2 font-bold uppercase">Load average: 0.24 / 0.18 / 0.12</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
