import React, { useState, useEffect, useRef } from 'react';
import {
    Radio,
    Play,
    Square,
    Clock,
    Link2,
    AlertCircle,
    CheckCircle2,
    Trash2,
    RefreshCw,
    Eye,
    EyeOff,
    Copy,
    Wifi,
    WifiOff,
    Globe,
    Smartphone,
    Monitor,
    Info
} from 'lucide-react';
import { supabase } from '../services/supabase';

interface StreamingConfig {
    id: string;
    stream_url: string;
    is_active: boolean;
    started_at: string | null;
    ended_at: string | null;
    title: string | null;
    notes: string | null;
    created_at: string;
}

const LIVE_THRESHOLD_S = 10; // segundos

function elapsed(from: string | null): string {
    if (!from) return '—';
    const diff = Math.floor((Date.now() - new Date(from).getTime()) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

export const StreamingControl: React.FC = () => {
    const [configs, setConfigs] = useState<StreamingConfig[]>([]);
    const [active, setActive] = useState<StreamingConfig | null>(null);
    const [formUrl, setFormUrl] = useState('');
    const [formTitle, setFormTitle] = useState('');
    const [formNotes, setFormNotes] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tick, setTick] = useState(0);
    const [showPreview, setShowPreview] = useState(false);
    const [toasts, setToasts] = useState<{ id: number; type: string; msg: string }[]>([]);
    const toastId = useRef(0);

    const addToast = (type: string, msg: string) => {
        const id = ++toastId.current;
        setToasts(p => [...p, { id, type, msg }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
    };

    // Polling del reloj
    useEffect(() => {
        const t = setInterval(() => setTick(p => p + 1), 1000);
        return () => clearInterval(t);
    }, []);

    // Polling Supabase cada 5 s
    const fetchData = async () => {
        try {
            const { data, error } = await supabase
                .from('streaming_config')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);
            if (error) throw error;
            const rows = (data as StreamingConfig[]) || [];
            setConfigs(rows);
            const act = rows.find(r => r.is_active) || null;
            setActive(act);
        } catch (err) {
            console.error('[StreamingControl] Error fetch:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    // Pre-cargar formulario con URL del stream activo
    useEffect(() => {
        if (active) {
            setFormUrl(active.stream_url);
            setFormTitle(active.title || '');
            setFormNotes(active.notes || '');
        }
    }, [active?.id]);

    const handleActivate = async () => {
        if (!formUrl.trim()) return addToast('error', 'Ingresá una URL de stream válida');
        setSaving(true);
        try {
            // Desactivar cualquier stream anterior
            await supabase.from('streaming_config')
                .update({ is_active: false, ended_at: new Date().toISOString() })
                .eq('is_active', true);

            // Insertar nuevo config activo
            const { error } = await supabase.from('streaming_config').insert({
                stream_url: formUrl.trim(),
                title: formTitle.trim() || null,
                notes: formNotes.trim() || null,
                is_active: true,
                started_at: new Date().toISOString(),
            });
            if (error) throw error;
            addToast('success', '✓ Stream activado — los reproductores conmutarán en ~10 s');
            await fetchData();
        } catch (err: any) {
            addToast('error', `✗ Error: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDeactivate = async () => {
        if (!active) return;
        setSaving(true);
        try {
            const { error } = await supabase.from('streaming_config')
                .update({ is_active: false, ended_at: new Date().toISOString() })
                .eq('id', active.id);
            if (error) throw error;
            addToast('success', '✓ Stream desactivado — los reproductores volverán al modo normal');
            setActive(null);
            await fetchData();
        } catch (err: any) {
            addToast('error', `✗ Error: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await supabase.from('streaming_config').delete().eq('id', id);
            await fetchData();
        } catch (err) {
            addToast('error', '✗ No se pudo eliminar el registro');
        }
    };

    // Estado visual del stream activo
    const isLiveStable = active?.started_at
        ? (Date.now() - new Date(active.started_at).getTime()) / 1000 > LIVE_THRESHOLD_S
        : false;

    const statusLabel = active
        ? isLiveStable ? 'EN VIVO' : 'INICIANDO...'
        : 'INACTIVO';
    const statusColor = active
        ? isLiveStable ? 'text-red-400' : 'text-yellow-400'
        : 'text-slate-500';
    const statusBg = active
        ? isLiveStable ? 'bg-red-500/10 border-red-500/30' : 'bg-yellow-500/10 border-yellow-500/30'
        : 'bg-slate-800 border-slate-700';

    return (
        <div className="min-h-screen bg-[#050505] text-white p-8 relative">

            {/* TOASTS */}
            <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
                {toasts.map(t => (
                    <div key={t.id} className={`px-4 py-3 rounded-xl text-[12px] font-black uppercase tracking-tighter shadow-2xl border backdrop-blur-md pointer-events-auto transition-all animate-fadeIn
                        ${t.type === 'success' ? 'bg-[#00B140]/90 border-[#00B140] text-black' :
                          t.type === 'error'   ? 'bg-red-500/90 border-red-400 text-white' :
                          'bg-slate-800 border-slate-700 text-white'}`}>
                        {t.msg}
                    </div>
                ))}
            </div>

            {/* HEADER */}
            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                        <Radio size={22} className="text-red-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tighter text-white">Control Streaming</h1>
                        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Gestión de transmisiones en vivo</p>
                    </div>
                </div>

                {/* BADGE ESTADO GLOBAL */}
                <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border ${statusBg} transition-all duration-500`}>
                    <div className={`w-2.5 h-2.5 rounded-full ${active ? isLiveStable ? 'bg-red-400 animate-pulse' : 'bg-yellow-400 animate-pulse' : 'bg-slate-600'}`} />
                    <span className={`text-[13px] font-black uppercase tracking-widest ${statusColor}`}>
                        {statusLabel}
                    </span>
                    {active && (
                        <span className="text-[11px] text-slate-400 font-mono">
                            {elapsed(active.started_at)}
                        </span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* ── COLUMNA IZQUIERDA: Formulario de configuración ── */}
                <div className="xl:col-span-2 flex flex-col gap-6">

                    {/* Panel de configuración */}
                    <div className="bg-[#0D0D0D] rounded-3xl border border-[#1E1E1E] p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <Link2 size={16} className="text-[#00B140]" />
                            <h2 className="text-[13px] font-black uppercase tracking-widest text-[#AAA]">
                                Configuración del Stream
                            </h2>
                        </div>

                        {/* URL */}
                        <div className="mb-4">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                URL de Origen del Stream *
                            </label>
                            <div className="relative">
                                <input
                                    type="url"
                                    value={formUrl}
                                    onChange={e => setFormUrl(e.target.value)}
                                    placeholder="https://stream.ejemplo.com/live/stream.m3u8"
                                    className="w-full bg-[#070707] border border-[#222] rounded-xl px-4 py-3 pr-12 text-[13px] text-white font-medium placeholder:text-[#333] focus:border-[#00B140]/60 outline-none transition-all"
                                />
                                <button
                                    onClick={() => { navigator.clipboard.writeText(formUrl); addToast('success', '✓ URL copiada'); }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors"
                                >
                                    <Copy size={15} />
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-600 mt-1.5">
                                Compatible con HLS (.m3u8), YouTube Live, Twitch, etc.
                            </p>
                        </div>

                        {/* Título */}
                        <div className="mb-4">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                Título del evento
                            </label>
                            <input
                                type="text"
                                value={formTitle}
                                onChange={e => setFormTitle(e.target.value)}
                                placeholder="Ej: Apertura de la Feria Artesanal 2026"
                                className="w-full bg-[#070707] border border-[#222] rounded-xl px-4 py-3 text-[13px] text-white font-medium placeholder:text-[#333] focus:border-[#00B140]/60 outline-none transition-all"
                            />
                        </div>

                        {/* Notas */}
                        <div className="mb-6">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                Notas internas
                            </label>
                            <textarea
                                value={formNotes}
                                onChange={e => setFormNotes(e.target.value)}
                                placeholder="Observaciones sobre el evento o la transmisión..."
                                rows={3}
                                className="w-full bg-[#070707] border border-[#222] rounded-xl px-4 py-3 text-[13px] text-white font-medium placeholder:text-[#333] focus:border-[#00B140]/60 outline-none transition-all resize-none"
                            />
                        </div>

                        {/* Botones de acción */}
                        <div className="flex gap-3">
                            {!active ? (
                                <button
                                    onClick={handleActivate}
                                    disabled={saving || !formUrl.trim()}
                                    className="flex-1 flex items-center justify-center gap-3 h-12 bg-red-500 hover:bg-red-400 disabled:bg-[#1A1A1A] disabled:text-[#444] text-white font-black text-[12px] uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
                                >
                                    {saving
                                        ? <RefreshCw size={16} className="animate-spin" />
                                        : <Play size={16} />
                                    }
                                    {saving ? 'Activando...' : 'ACTIVAR STREAM'}
                                </button>
                            ) : (
                                <button
                                    onClick={handleDeactivate}
                                    disabled={saving}
                                    className="flex-1 flex items-center justify-center gap-3 h-12 bg-[#1A1A1A] hover:bg-red-900/40 border border-red-500/40 text-red-400 font-black text-[12px] uppercase tracking-widest rounded-xl transition-all active:scale-95"
                                >
                                    {saving
                                        ? <RefreshCw size={16} className="animate-spin" />
                                        : <Square size={16} />
                                    }
                                    {saving ? 'Deteniendo...' : 'DETENER STREAM'}
                                </button>
                            )}
                            <button
                                onClick={() => setShowPreview(p => !p)}
                                title="Vista previa del stream"
                                className="w-12 h-12 flex items-center justify-center bg-[#1A1A1A] border border-[#222] rounded-xl text-slate-500 hover:text-white hover:border-[#444] transition-all"
                            >
                                {showPreview ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        {/* Vista previa embebida */}
                        {showPreview && formUrl.trim() && (
                            <div className="mt-6 rounded-2xl overflow-hidden border border-[#1E1E1E] aspect-video bg-black">
                                <iframe
                                    src={formUrl}
                                    className="w-full h-full"
                                    allowFullScreen
                                    title="Stream Preview"
                                />
                            </div>
                        )}
                        {showPreview && !formUrl.trim() && (
                            <div className="mt-6 rounded-2xl border border-dashed border-[#222] aspect-video flex items-center justify-center">
                                <p className="text-[11px] text-slate-600 font-bold uppercase tracking-widest">
                                    Ingresá una URL para previsualizar
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Historial */}
                    <div className="bg-[#0D0D0D] rounded-3xl border border-[#1E1E1E] overflow-hidden">
                        <div className="flex items-center gap-3 p-5 border-b border-[#1E1E1E]">
                            <Clock size={15} className="text-slate-500" />
                            <h2 className="text-[12px] font-black uppercase tracking-widest text-[#888]">Historial de Transmisiones</h2>
                            <button onClick={fetchData} className="ml-auto text-slate-600 hover:text-white transition-colors">
                                <RefreshCw size={14} />
                            </button>
                        </div>

                        {loading ? (
                            <div className="p-10 flex items-center justify-center">
                                <div className="w-6 h-6 border-2 border-[#00B140] border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : configs.length === 0 ? (
                            <div className="p-10 text-center text-slate-600 text-[11px] font-bold uppercase tracking-widest">
                                Sin transmisiones registradas
                            </div>
                        ) : (
                            <div className="divide-y divide-[#111]">
                                {configs.map(cfg => (
                                    <div key={cfg.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#111] transition-all group">
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.is_active ? 'bg-red-400 animate-pulse' : 'bg-slate-700'}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12px] font-bold text-slate-300 truncate">
                                                {cfg.title || 'Sin título'}
                                            </p>
                                            <p className="text-[10px] text-slate-600 font-mono truncate">{cfg.stream_url}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className={`text-[10px] font-black uppercase ${cfg.is_active ? 'text-red-400' : 'text-slate-600'}`}>
                                                {cfg.is_active ? 'ACTIVO' : 'Finalizado'}
                                            </p>
                                            <p className="text-[9px] text-slate-700 font-mono">
                                                {new Date(cfg.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        {!cfg.is_active && (
                                            <button
                                                onClick={() => handleDelete(cfg.id)}
                                                className="opacity-0 group-hover:opacity-100 text-slate-700 hover:text-red-500 transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── COLUMNA DERECHA: Estado + Info ── */}
                <div className="flex flex-col gap-6">

                    {/* Estado actual del stream */}
                    <div className={`rounded-3xl border p-6 transition-all duration-500 ${active ? 'bg-red-950/20 border-red-500/20' : 'bg-[#0D0D0D] border-[#1E1E1E]'}`}>
                        <div className="flex items-center gap-2 mb-5">
                            {active ? <Wifi size={16} className="text-red-400" /> : <WifiOff size={16} className="text-slate-600" />}
                            <h3 className="text-[12px] font-black uppercase tracking-widest text-[#888]">Estado actual</h3>
                        </div>

                        {active ? (
                            <>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.6)]" />
                                    <span className="text-red-400 font-black text-[14px] uppercase tracking-widest">
                                        {isLiveStable ? 'EN VIVO' : 'INICIANDO...'}
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-400 font-bold truncate mb-1">{active.title || 'Stream activo'}</p>
                                <p className="text-[10px] text-slate-600 font-mono truncate mb-4">{active.stream_url}</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-black/30 rounded-xl p-3 text-center">
                                        <p className="text-[9px] text-slate-600 uppercase tracking-widest font-bold mb-1">Tiempo al aire</p>
                                        <p className="text-[18px] font-black font-mono text-white">{elapsed(active.started_at)}</p>
                                    </div>
                                    <div className={`rounded-xl p-3 text-center ${isLiveStable ? 'bg-[#00B140]/10 border border-[#00B140]/20' : 'bg-yellow-500/10 border border-yellow-500/20'}`}>
                                        <p className="text-[9px] text-slate-600 uppercase tracking-widest font-bold mb-1">Reproductores</p>
                                        <p className={`text-[11px] font-black ${isLiveStable ? 'text-[#00B140]' : 'text-yellow-400'}`}>
                                            {isLiveStable ? 'RECIBIENDO' : 'ESPERANDO'}
                                        </p>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 gap-3">
                                <WifiOff size={32} className="text-slate-800" />
                                <p className="text-[11px] text-slate-600 font-bold uppercase tracking-widest text-center">
                                    Sin stream activo.<br />Los reproductores están en<br />modo automático.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Versiones de reproductores */}
                    <div className="bg-[#0D0D0D] rounded-3xl border border-[#1E1E1E] p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <Globe size={15} className="text-slate-500" />
                            <h3 className="text-[12px] font-black uppercase tracking-widest text-[#888]">Reproductores</h3>
                        </div>
                        <div className="flex flex-col gap-3">
                            {[
                                { icon: Globe, label: 'Web', desc: 'saladillovivo.com.ar' },
                                { icon: Smartphone, label: 'Móvil', desc: 'App Android / iOS' },
                                { icon: Monitor, label: 'TV', desc: 'App Smart TV' },
                            ].map(({ icon: Icon, label, desc }) => (
                                <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A]">
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${active && isLiveStable ? 'bg-red-500/10 border border-red-500/20' : 'bg-[#1A1A1A] border border-[#222]'}`}>
                                        <Icon size={15} className={active && isLiveStable ? 'text-red-400' : 'text-slate-600'} />
                                    </div>
                                    <div>
                                        <p className="text-[12px] font-black text-slate-300">{label}</p>
                                        <p className="text-[10px] text-slate-600">{desc}</p>
                                    </div>
                                    <div className="ml-auto">
                                        {active && isLiveStable
                                            ? <CheckCircle2 size={15} className="text-[#00B140]" />
                                            : <div className="w-2 h-2 rounded-full bg-slate-700" />
                                        }
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Info técnica */}
                    <div className="bg-[#0D0D0D] rounded-3xl border border-[#1E1E1E] p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Info size={14} className="text-slate-600" />
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-[#555]">Lógica de detección</h3>
                        </div>
                        <div className="space-y-2 text-[10px] text-slate-600 leading-relaxed">
                            <p>• Los reproductores consultan el estado cada <span className="text-slate-400 font-bold">5 segundos</span>.</p>
                            <p>• El stream debe tener más de <span className="text-slate-400 font-bold">10 segundos</span> activo para conmutar al live.</p>
                            <p>• Al desactivar, los reproductores vuelven al modo automático en <span className="text-slate-400 font-bold">≤ 10 s</span>.</p>
                            <p>• El estado se persiste en <span className="text-slate-400 font-bold">Supabase</span> (tabla <code className="bg-[#111] px-1 rounded">streaming_config</code>).</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
