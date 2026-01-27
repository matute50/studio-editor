
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { getPhoneticGuide, getSSMLName } from '../services/gemini';
import { 
  ShieldCheck, 
  Users, 
  Activity, 
  Database, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  UserPlus,
  Settings,
  HardDrive,
  BarChart3,
  Search,
  MoreVertical,
  Type,
  Sparkles,
  Volume2,
  Loader2,
  ArrowRightLeft,
  BookOpen,
  History,
  Languages,
  Crown,
  Info,
  BadgeCheck,
  Zap,
  Fingerprint,
  Code
} from 'lucide-react';

export const ControlCentral: React.FC = () => {
  const [stats, setStats] = useState({
    articles: 0,
    slides: 0,
    audios: 0,
    activeStaff: 3
  });
  const [loading, setLoading] = useState(true);
  const [phoneticTest, setPhoneticTest] = useState('');
  const [phoneticResult, setPhoneticResult] = useState('');
  const [ssmlResult, setSsmlResult] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { count: artCount } = await supabase.from('articles').select('*', { count: 'exact', head: true });
      const { count: slideCount } = await supabase.from('articles').select('*', { count: 'exact', head: true }).not('url_slide', 'is', null);
      const { count: audioCount } = await supabase.from('articles').select('*', { count: 'exact', head: true }).not('audio_url', 'is', null);
      
      setStats({
        articles: artCount || 0,
        slides: slideCount || 0,
        audios: audioCount || 0,
        activeStaff: 3
      });
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleTestPhonetic = async () => {
    if (!phoneticTest.trim()) return;
    setIsValidating(true);
    try {
      const [phonetic, ssml] = await Promise.all([
        getPhoneticGuide(phoneticTest),
        getSSMLName(phoneticTest)
      ]);
      setPhoneticResult(phonetic);
      setSsmlResult(ssml);
    } catch (err) {
      setPhoneticResult("Error al validar.");
      setSsmlResult("");
    } finally {
      setIsValidating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTestPhonetic();
  };

  const manualCategorias = [
    { 
        title: 'Los clásicos en -EZ', 
        desc: 'Graves que siempre llevan tilde (RAE).',
        examples: 'Martínez, González, Rodríguez, Pérez, Álvarez, Míguez.',
        color: 'text-blue-600',
        bg: 'bg-blue-50'
    },
    { 
        title: 'Agudos (-ON / -AN)', 
        desc: 'Tilde por terminación en N (RAE).',
        examples: 'Julián, Román, Verón, Monzón, Alemán, Rondón.',
        color: 'text-orange-600',
        bg: 'bg-orange-50'
    },
    { 
        title: 'Apellidos "Trampa"', 
        desc: 'Estandarización Argentina.',
        examples: 'Verón (Agudo), Solís (Agudo), Míguez (Grave en Z).',
        color: 'text-red-600',
        bg: 'bg-red-50'
    },
    { 
        title: 'Los Hiatos (Pura RAE)', 
        desc: 'Rompen diptongo con tilde gráfica.',
        examples: 'García, Díaz, Mejía, Báez, Uría, Demaría.',
        color: 'text-green-600',
        bg: 'bg-green-50'
    },
    { 
        title: 'Identidad Italiana', 
        desc: 'Preservar grafía original (Sin tilde).',
        examples: 'Rossi, Bianchi, Rizzo, Moretti, Bianchimano, Ricci.',
        color: 'text-purple-600',
        bg: 'bg-purple-50'
    },
    { 
        title: 'Falsos Amigos (-S)', 
        desc: 'Graves terminadas en S (Sin tilde).',
        examples: 'Flores, Ramos, Reyes, Torres, Campos, Bustos.',
        color: 'text-slate-600',
        bg: 'bg-slate-50'
    }
  ];

  const staff = [
    { name: 'Administrador Principal', email: 'admin@saladillovivo.com.ar', role: 'Responsable', status: 'Online', lastActive: 'Ahora' },
    { name: 'Editor de Contenidos', email: 'redaccion@saladillovivo.com.ar', role: 'Editor', status: 'Offline', lastActive: 'hace 2 horas' },
    { name: 'Locutor AI (VozArgentina)', email: 'ia-studio@internal', role: 'Bot', status: 'Online', lastActive: 'Ahora' },
  ];

  const logs = [
    { user: 'Admin', action: 'Actualizó Motor v9.1', target: 'SSML Conversion Engine', time: 'Recién' },
    { user: 'Admin', action: 'Normalizó Onomástica', target: 'Padrón Local', time: '10 min' },
    { user: 'Admin', action: 'Generó Slide HD', target: 'Accidente Ruta 205', time: '10:45 AM' },
  ];

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <ShieldCheck className="text-blue-600" size={36} />
            Control Central
          </h2>
          <p className="text-slate-500 font-medium">Gestión administrativa y onomástica de Saladillo Vivo</p>
        </div>
        <div className="flex gap-3">
            <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 flex items-center gap-2 hover:bg-slate-50 transition-colors">
                <Settings size={16} /> Configuración
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">
                <UserPlus size={16} /> Nuevo Staff
            </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Artículos Totales', value: stats.articles, icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Slides Publicados', value: stats.slides, icon: HardDrive, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Audios Producidos', value: stats.audios, icon: Activity, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Equipo Activo', value: stats.activeStaff, icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md group">
            <div className="flex justify-between items-start mb-4">
              <div className={`${stat.bg} ${stat.color} p-3 rounded-xl group-hover:scale-110 transition-transform`}>
                <stat.icon size={24} />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global</span>
            </div>
            <h3 className="text-2xl font-black text-slate-800">{loading ? '...' : stat.value}</h3>
            <p className="text-xs font-bold text-slate-400 uppercase mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          
          {/* Analista Genealógico AI */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
                    <Volume2 size={120} className="text-white" />
                </div>
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-white font-black text-xl mb-1 flex items-center gap-3">
                                <Fingerprint className="text-blue-400" /> Analista Genealógico AI
                            </h3>
                            <p className="text-slate-400 text-sm">Validación morfológica avanzada v9.1 (RAE + SSML Emphasis).</p>
                        </div>
                        <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-black text-blue-400 uppercase tracking-widest">
                            Morph Engine 
                        </div>
                    </div>
                    
                    <div className="flex gap-4">
                        <div className="flex-1 relative">
                            <input 
                                type="text" 
                                value={phoneticTest}
                                onChange={(e) => setPhoneticTest(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder="Ej: Ignacio Unzue, Maria Jose Martinez..." 
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold placeholder:text-slate-600"
                            />
                            <button 
                                onClick={handleTestPhonetic}
                                disabled={isValidating || !phoneticTest.trim()}
                                className="absolute right-2 top-2 bottom-2 px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
                            >
                                {isValidating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            </button>
                        </div>
                    </div>

                    {(phoneticResult || ssmlResult) && (
                        <div className="mt-6 space-y-4 animate-fadeIn">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Normalización RAE</p>
                                    <p className="text-white font-black text-xl tracking-tight">{phoneticResult}</p>
                                </div>
                                <div className="p-5 bg-blue-500/10 border border-blue-500/20 rounded-2xl relative overflow-hidden group">
                                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <Code size={12} /> Código SSML (Google TTS)
                                    </p>
                                    <p className="text-blue-200 font-mono text-[11px] break-all bg-black/20 p-2 rounded border border-blue-500/10">
                                        {ssmlResult}
                                    </p>
                                </div>
                           </div>
                        </div>
                    )}
                </div>
          </div>

          {/* Manual de Estilo Visual */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <BookOpen size={18} className="text-blue-500" /> Manual de Estilo Onomástico v9.1
                    </h3>
                    <BadgeCheck size={18} className="text-green-500" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                    {manualCategorias.map((seccion, i) => (
                        <div key={i} className={`p-4 rounded-xl ${seccion.bg} border border-slate-100 flex flex-col justify-between h-full`}>
                            <div>
                                <h4 className={`font-black text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2 ${seccion.color}`}>
                                    <Zap size={12} /> {seccion.title}
                                </h4>
                                <p className="text-[10px] font-bold text-slate-700 mb-2">{seccion.desc}</p>
                            </div>
                            <div className="text-[9px] font-mono text-slate-500 bg-white/60 p-2 rounded border border-slate-100 italic leading-tight">
                                {seccion.examples}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-center gap-2">
                        <Crown size={12} className="text-amber-500" /> Estrategia SSML: <span className="text-blue-600 font-mono">emphasis level="moderate"</span> para apellidos complejos.
                    </p>
                </div>
          </div>

          {/* Staff List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Users size={18} className="text-blue-500" /> Personal del Sitio
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <tr>
                            <th className="px-6 py-4">Usuario</th>
                            <th className="px-6 py-4">Rol</th>
                            <th className="px-6 py-4">Estado</th>
                            <th className="px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {staff.map((person, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-700 text-sm">{person.name}</div>
                                    <div className="text-[10px] text-slate-400">{person.email}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase ${
                                        person.role === 'Responsable' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                        {person.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1.5">
                                        <div className={`w-1.5 h-1.5 rounded-full ${person.status === 'Online' ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                                        <span className="text-xs font-medium text-slate-600">{person.status}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="p-1 hover:bg-slate-200 rounded text-slate-400 transition-colors"><MoreVertical size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        </div>

        {/* Auditoría Lateral */}
        <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <History size={18} className="text-orange-500" /> Auditoría
                    </h3>
                    <div className="flex gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    </div>
                </div>
                <div className="flex-1 p-6 space-y-6">
                    {logs.map((log, i) => (
                        <div key={i} className="flex gap-4 relative group">
                            {i !== logs.length - 1 && <div className="absolute left-3 top-7 bottom-0 w-0.5 bg-slate-100 group-hover:bg-blue-100 transition-colors"></div>}
                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 z-10 border-2 border-white">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-0.5">
                                    <span className="text-xs font-black text-slate-800 uppercase">{log.user}</span>
                                    <span className="text-[10px] font-bold text-slate-400">{log.time}</span>
                                </div>
                                <p className="text-xs text-slate-500">
                                    <span className="font-bold text-blue-600">{log.action}:</span> {log.target}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-200 relative overflow-hidden group">
                <div className="absolute -bottom-4 -right-4 opacity-10 group-hover:scale-125 transition-transform duration-500">
                    <ShieldCheck size={120} />
                </div>
                <h4 className="font-black text-xs uppercase tracking-[0.2em] mb-3">Integridad Lingüística</h4>
                <p className="text-xs opacity-80 mb-6 font-medium leading-relaxed">El motor de Saladillo Vivo v9.1 estandariza apellidos trampa y genera instrucciones SSML de alta precisión.</p>
                <button className="w-full py-3 bg-white text-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:shadow-lg transition-all">Estado del Motor</button>
            </div>

            <div className="bg-slate-900 rounded-3xl p-6 text-white border border-white/5">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center border border-green-500/20">
                        <Database className="text-green-500" size={20} />
                    </div>
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-widest">Servidor</h4>
                        <p className="text-[10px] text-slate-500">Supabase: Conectado</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
                    <CheckCircle2 size={12} className="text-green-500" />
                    <span className="text-[10px] font-bold uppercase text-slate-300">Sincronización OK</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
