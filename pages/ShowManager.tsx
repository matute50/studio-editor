
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import {
    Play,
    Trash2,
    GripVertical,
    Plus,
    Save,
    Share2,
    Tv,
    Newspaper,
    Video,
    ArrowUp,
    ArrowDown,
    ChevronRight,
    ExternalLink
} from 'lucide-react';

interface ContentItem {
    id: string | number;
    title: string;
    type: 'noticia' | 'video';
    image_url: string;
}

interface SequenceItem {
    uid: string; // Unique ID for this specific instance in the list
    contentId: string | number;
    type: 'noticia' | 'video';
    title: string;
    image_url: string;
}

export const ShowManager: React.FC = () => {
    const [news, setNews] = useState<ContentItem[]>([]);
    const [videos, setVideos] = useState<ContentItem[]>([]);
    const [sequence, setSequence] = useState<SequenceItem[]>([]);
    const [programName, setProgramName] = useState(`Resumen ${new Date().toLocaleDateString()}`);
    const [isSaving, setIsSaving] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchContent();
    }, []);

    const fetchContent = async () => {
        try {
            // Fetch news (todas, tengan audio o no)
            const { data: newsData } = await supabase
                .from('articles')
                .select('id, title, image_url, audio_url')
                .order('created_at', { ascending: false })
                .limit(40);

            // Fetch videos
            const { data: videoData } = await supabase
                .from('videos')
                .select('id, nombre, url, imagen')
                .order('createdAt', { ascending: false })
                .limit(20);

            if (newsData) {
                setNews(newsData.map(n => ({
                    id: n.id,
                    title: n.title,
                    type: 'noticia',
                    image_url: n.image_url
                })));
            }

            if (videoData) {
                setVideos(videoData.map(v => ({
                    id: v.id,
                    title: v.nombre || 'Video sin título',
                    type: 'video',
                    image_url: v.imagen
                })));
            }
        } catch (err) {
            console.error("Error fetching content:", err);
        }
    };

    const addToSequence = (item: ContentItem) => {
        const newItem: SequenceItem = {
            uid: Math.random().toString(36).substr(2, 9),
            contentId: item.id,
            type: item.type,
            title: item.title,
            image_url: item.image_url
        };
        setSequence([...sequence, newItem]);
    };

    const removeFromSequence = (uid: string) => {
        setSequence(sequence.filter(item => item.uid !== uid));
    };

    const moveUp = (index: number) => {
        if (index === 0) return;
        const newSequence = [...sequence];
        [newSequence[index - 1], newSequence[index]] = [newSequence[index], newSequence[index - 1]];
        setSequence(newSequence);
    };

    const moveDown = (index: number) => {
        if (index === sequence.length - 1) return;
        const newSequence = [...sequence];
        [newSequence[index + 1], newSequence[index]] = [newSequence[index], newSequence[index + 1]];
        setSequence(newSequence);
    };

    const handleSave = async () => {
        if (sequence.length === 0) {
            alert("La secuencia está vacía");
            return;
        }
        setIsSaving(true);
        try {
            const { data, error } = await supabase
                .from('resumenes')
                .insert([{
                    nombre: programName,
                    secuencia: sequence.map(item => ({
                        type: item.type,
                        id: item.contentId
                    }))
                }])
                .select();

            if (error) throw error;
            alert("Resumen guardado correctamente!");

            // Auto-share potential
            const summaryId = data[0].id;
            const shareUrl = `https://m.saladillovivo.com.ar/resumen/${summaryId}?unmute=1`;
            const whatsappText = `¡Mira el resumen de noticias de hoy en Saladillo Vivo! 📺\n\n${shareUrl}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(whatsappText)}`, '_blank');

        } catch (err: any) {
            alert("Error al guardar: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-8 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                        <Tv size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight italic">DIRECTOR DE PROGRAMA</h1>
                        <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Crea bloques de noticias automatizados</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        value={programName}
                        onChange={(e) => setProgramName(e.target.value)}
                        className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none min-w-[300px]"
                        placeholder="Nombre del programa..."
                    />
                    <button
                        onClick={handleSave}
                        disabled={isSaving || sequence.length === 0}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-200"
                    >
                        <Save size={18} />
                        {isSaving ? 'Guardando...' : 'Guardar y Compartir'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-250px)]">
                {/* Source List */}
                <div className="lg:col-span-4 flex flex-col gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <h2 className="text-lg font-black text-slate-900 tracking-tight">CONTENIDO DISPONIBLE</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-4">
                        <section>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Newspaper size={14} /> Noticias con Audio
                            </h3>
                            <div className="flex flex-col gap-2">
                                {news.map(item => (
                                    <div key={item.id} className="group flex items-center gap-3 p-3 bg-slate-50 hover:bg-blue-50 rounded-2xl border border-transparent hover:border-blue-100 transition-all cursor-pointer" onClick={() => addToSequence(item)}>
                                        <img src={item.image_url} className="w-12 h-12 rounded-xl object-cover shadow-sm" alt="" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-900 truncate">{item.title}</p>
                                        </div>
                                        <Plus size={18} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 mt-4 flex items-center gap-2">
                                <Video size={14} /> Videos de YouTube
                            </h3>
                            <div className="flex flex-col gap-2">
                                {videos.map(item => (
                                    <div key={item.id} className="group flex items-center gap-3 p-3 bg-slate-50 hover:bg-indigo-50 rounded-2xl border border-transparent hover:border-indigo-100 transition-all cursor-pointer" onClick={() => addToSequence(item)}>
                                        <img src={item.image_url} className="w-12 h-12 rounded-xl object-cover shadow-sm" alt="" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-900 truncate">{item.title}</p>
                                        </div>
                                        <Plus size={18} className="text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>

                {/* Sequence List */}
                <div className="lg:col-span-8 flex flex-col gap-4 bg-slate-900 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <Tv size={120} className="text-white" />
                    </div>

                    <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
                        <h2 className="text-lg font-black text-white tracking-tight italic">TU SECUENCIA (DAILY SHOW)</h2>
                        <div className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-widest">
                            {sequence.length} ÍTEMS
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-3 relative z-10">
                        {sequence.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4 border-2 border-dashed border-white/5 rounded-3xl">
                                <Tv size={48} className="opacity-20" />
                                <p className="font-bold text-slate-500">Haz clic en el contenido de la izquierda para armar el programa</p>
                            </div>
                        ) : (
                            sequence.map((item, index) => (
                                <div key={item.uid} className="group flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all">
                                    <span className="text-xl font-black text-white/20 w-8">{index + 1}</span>
                                    <img src={item.image_url} className="w-16 h-16 rounded-xl object-cover shadow-lg" alt="" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            {item.type === 'noticia' ? (
                                                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-tighter rounded">Noticia</span>
                                            ) : (
                                                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-tighter rounded">Video</span>
                                            )}
                                        </div>
                                        <p className="text-white font-bold tracking-tight line-clamp-1">{item.title}</p>
                                    </div>

                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => moveUp(index)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all" title="Subir">
                                            <ArrowUp size={16} />
                                        </button>
                                        <button onClick={() => moveDown(index)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all" title="Bajar">
                                            <ArrowDown size={16} />
                                        </button>
                                        <button onClick={() => removeFromSequence(item.uid)} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all" title="Eliminar">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <GripVertical size={20} className="text-white/10" />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
