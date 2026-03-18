import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Monitor, Save, Play, Power, AlertCircle, CheckCircle2, History } from 'lucide-react';
// import ReactPlayer from 'react-player'; // Eliminado por falta de dependencia

interface StreamConfig {
  id: string;
  stream_url: string;
  is_active: boolean;
  title: string;
  notes: string | null;
  started_at: string | null;
  ended_at: string | null;
}

export const StreamingControl: React.FC = () => {
    const [config, setConfig] = useState<StreamConfig | null>(null);
    const [url, setUrl] = useState('');
    const [title, setTitle] = useState('');
    const [notes, setNotes] = useState('');
    const [isActive, setIsActive] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        fetchStreamConfig();
    }, []);

    const fetchStreamConfig = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('streaming')
                .select('*')
                .eq('id', 25)
                .single();

            if (data) {
                setConfig({
                    id: data.id.toString(),
                    stream_url: data.url,
                    is_active: data.isActive,
                    title: data.nombre,
                    notes: '',
                    started_at: null,
                    ended_at: null
                } as any);
                setUrl(data.url);
                setTitle(data.nombre || '');
                setIsActive(data.isActive);
            }
        } catch (err) {
            console.error('Error fetching stream config:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (activate: boolean = false) => {
        try {
            setSaving(true);
            setMessage(null);

            const now = new Date().toISOString();
            
            // 1. Payload para historial (streaming_config)
            const historyPayload: any = {
                stream_url: url,
                title,
                notes,
                is_active: activate,
            };

            if (activate) {
                historyPayload.started_at = now;
                historyPayload.ended_at = null;
            } else if (config?.is_active && !activate) {
                historyPayload.ended_at = now;
            }

            // Guardar en historial
            await supabase.from('streaming_config').insert([historyPayload]);

            // 2. Actualizar ESTADO MAESTRO (tabla 'streaming', id 25)
            // Esta es la tabla que leerán los reproductores para evitar confusión de filas
            const { data, error } = await supabase
                .from('streaming')
                .update({
                    isActive: activate,
                    url: url,
                    nombre: title,
                    updatedAt: now
                })
                .eq('id', 25)
                .select()
                .single();

            if (error) throw error;

            // Actualizar estado local
            setConfig({
                ...config,
                id: data.id.toString(),
                stream_url: data.url,
                is_active: data.isActive,
                title: data.nombre,
                notes: notes,
                started_at: activate ? now : (config?.started_at || null),
                ended_at: !activate ? now : null
            } as any);

            setIsActive(data.isActive);
            setMessage({ text: activate ? 'Streaming ACTIVADO con éxito' : 'Configuración guardada correctamente', type: 'success' });
            
            setTimeout(() => setMessage(null), 3000);
        } catch (err: any) {
            setMessage({ text: `Error: ${err.message}`, type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const toggleStatus = () => {
        handleSave(!isActive);
    };

    const getEmbedUrl = (inputUrl: string) => {
        if (!inputUrl) return '';
        try {
            const urlObj = new URL(inputUrl);
            let videoId = '';
            
            if (urlObj.hostname.includes('youtube.com')) {
                if (urlObj.pathname.startsWith('/live/')) {
                    videoId = urlObj.pathname.split('/')[2];
                } else {
                    videoId = urlObj.searchParams.get('v') || '';
                }
            } else if (urlObj.hostname.includes('youtu.be')) {
                videoId = urlObj.pathname.slice(1);
            }

            if (videoId) {
                return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`;
            }
        } catch (e) {
            console.error('URL inválida para el preview');
        }
        return '';
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Cargando configuración...</p>
                </div>
            </div>
        );
    }

    const embedUrl = getEmbedUrl(url);

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fadeIn">
            <header className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Control de Streaming</h2>
                    <p className="text-slate-500 text-sm font-medium">Gestión de transmisiones en vivo vía YouTube</p>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest ${isActive ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
                    <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-slate-400'}`}></div>
                    {isActive ? 'Transmisión en Vivo' : 'Streaming Inactivo'}
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* CONFIGURACIÓN */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                        <div className="flex items-center gap-2 text-slate-900 mb-4">
                            <Monitor className="w-5 h-5 text-blue-500" />
                            <h3 className="font-black text-sm uppercase tracking-wider">Parámetros del Stream</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">URL de YouTube Live</label>
                                <input 
                                    type="text" 
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none font-medium text-slate-700"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Título de la Transmisión</label>
                                <input 
                                    type="text" 
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Ej: Sesión del Concejo Deliberante"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none font-medium text-slate-700"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Notas / Descripción (Interno)</label>
                                <textarea 
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                    placeholder="Detalles adicionales..."
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none font-medium text-slate-700 resize-none"
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex gap-3">
                            <button
                                onClick={() => handleSave(isActive)}
                                disabled={saving}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
                            >
                                <Save size={18} />
                                {saving ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                            
                            <button
                                onClick={toggleStatus}
                                disabled={saving || !url}
                                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg ${isActive ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                            >
                                <Power size={18} />
                                {isActive ? 'Finalizar Vivo' : 'Iniciar Vivo'}
                            </button>
                        </div>

                        {message && (
                            <div className={`mt-4 p-4 rounded-xl flex items-center gap-3 animate-slideUp ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                                <p className="text-xs font-bold">{message.text}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* MONITOR PREVIEW */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden flex flex-col shadow-2xl">
                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Play className="w-4 h-4 text-blue-400" />
                            <h3 className="text-white font-black text-[10px] uppercase tracking-[0.2em]">Monitor de Previsualización</h3>
                        </div>
                        {isActive && <span className="flex items-center gap-1.5 px-2 py-1 bg-red-500/20 text-red-500 rounded text-[9px] font-black uppercase tracking-widest">Live Signal</span>}
                    </div>
                    
                    <div className="flex-1 aspect-video bg-black flex items-center justify-center relative">
                        {embedUrl ? (
                            <iframe 
                                src={embedUrl}
                                className="w-full h-full border-none"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title="Stream Preview"
                            ></iframe>
                        ) : (
                            <div className="flex flex-col items-center gap-4 text-slate-600 p-8 text-center">
                                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
                                    <Monitor className="w-8 h-8" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest mb-1 text-slate-500">Sin Señal</p>
                                    <p className="text-[10px] opacity-50">Ingrese una URL de YouTube para iniciar el monitor</p>
                                </div>
                            </div>
                        )}

                        {isActive && (
                            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg shadow-2xl animate-pulse pointer-events-none">
                                <div className="w-2 h-2 rounded-full bg-white"></div>
                                <span className="text-[10px] font-black">EN VIVO</span>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-slate-800/50 border-t border-white/5 space-y-3">
                         <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-900 rounded-lg border border-white/5">
                                <Monitor size={16} className="text-blue-400" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Estado de Recepción</p>
                                <p className="text-xs font-bold text-white">{url ? 'Señal recibida correctamente' : 'Esperando fuente...'}</p>
                            </div>
                         </div>
                    </div>
                </div>
            </div>

            {/* HISTORIAL RECIENTE */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                    <History size={16} className="text-slate-400" />
                    <h3 className="font-black text-[10px] text-slate-500 uppercase tracking-widest">Últimas Sesiones</h3>
                </div>
                {/* Aquí podríamos listar sesiones pasadas de streaming_config */}
                <div className="p-6 text-center">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest italic">Cargando historial de transmisiones...</p>
                </div>
            </div>
        </div>
    );
};
