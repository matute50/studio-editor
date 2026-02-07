import React, { useState, useEffect } from 'react';
import {
    Youtube,
    Search,
    Loader2,
    Save,
    PlayCircle,
    Trash2,
    Clock
} from 'lucide-react';
import { searchYouTubeVideoInfo, VideoAsset, saveVideoToLibrary } from '../services/youtube';
import { supabase } from '../services/supabase';

export const YouTubeStudio: React.FC = () => {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState<VideoAsset | null>(null);
    const [library, setLibrary] = useState<VideoAsset[]>([]);
    const [loadingLib, setLoadingLib] = useState(true);

    useEffect(() => {
        fetchLibrary();
    }, []);

    const fetchLibrary = async () => {
        setLoadingLib(true);
        const { data } = await supabase.from('videos_external').select('*').order('created_at', { ascending: false });
        if (data) setLibrary(data);
        setLoadingLib(false);
    };

    const handleSearch = async () => {
        if (!url.trim()) return;
        setLoading(true);
        try {
            const data = await searchYouTubeVideoInfo(url);
            setPreview(data);
        } catch (err: any) {
            alert("Error buscando video: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!preview) return;
        try {
            await saveVideoToLibrary(preview);
            alert("Video guardado en biblioteca!");
            setPreview(null);
            setUrl('');
            fetchLibrary();
        } catch (err: any) {
            alert("Error al guardar: " + err.message);
        }
    };

    const handleDelete = async (id?: string) => {
        if (!id || !confirm("¿Eliminar video de la videoteca?")) return;
        await supabase.from('videos_external').delete().eq('id', id);
        fetchLibrary();
    };

    return (
        <div className="h-[calc(100vh-8rem)] bg-slate-50 rounded-3xl p-8 border border-slate-200 animate-fadeIn flex flex-col gap-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg text-white">
                        <Youtube size={32} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">YouTube Manager</h1>
                        <p className="text-[10px] items-center gap-2 font-bold uppercase text-slate-400">Gestión de Videoteca Externa</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-black text-slate-800">{library.length}</p>
                    <p className="text-[9px] font-bold uppercase text-slate-400">Videos Indexados</p>
                </div>
            </div>

            {/* Search Area */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex gap-4 items-start">
                <div className="flex-1 space-y-4">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="Pegar enlace de YouTube (o ID)..."
                            className="flex-1 px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 font-medium outline-none focus:ring-2 focus:ring-red-500 transition-all placeholder:text-slate-400 text-sm"
                        />
                        <button
                            onClick={handleSearch}
                            disabled={loading || !url}
                            className="px-6 bg-slate-900 text-white rounded-2xl hover:bg-red-600 transition-colors disabled:opacity-50 font-bold uppercase text-[10px] tracking-widest"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : 'BUSCAR'}
                        </button>
                    </div>

                    {preview && (
                        <div className="p-4 bg-red-50/50 rounded-2xl border border-red-100 flex gap-4 animate-slideUp">
                            <div className="w-32 aspect-video bg-slate-200 rounded-lg overflow-hidden shrink-0">
                                <img src={preview.thumbnail_url} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <input
                                    value={preview.title}
                                    onChange={(e) => setPreview({ ...preview, title: e.target.value })}
                                    className="w-full bg-transparent font-black text-slate-800 uppercase text-xs border-b border-red-200 focus:border-red-500 outline-none mb-1"
                                />
                                <p className="text-[10px] font-bold text-slate-400 mb-2">Duración: {preview.duration_sec}s</p>
                                <button onClick={handleSave} className="px-4 py-2 bg-red-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-700 transition-all flex items-center gap-2">
                                    <Save size={12} /> Guardar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Library Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {loadingLib ? (
                    <div className="h-full flex items-center justify-center text-slate-300"><Loader2 className="animate-spin w-8 h-8" /></div>
                ) : library.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50">
                        <Youtube size={64} className="mb-4" />
                        <p className="text-xs font-black uppercase tracking-widest">Videoteca vacía</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {library.map((video) => (
                            <div key={video.id} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                                <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden relative mb-3">
                                    <img src={video.thumbnail_url} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <a href={`https://www.youtube.com/watch?v=${video.youtube_id}`} target="_blank" rel="noreferrer" className="p-2 bg-white/20 hover:bg-white text-white hover:text-red-600 rounded-full transition-all">
                                            <PlayCircle size={20} />
                                        </a>
                                        <button onClick={() => handleDelete(video.id)} className="p-2 bg-white/20 hover:bg-red-600 text-white rounded-full transition-all">
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                    <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-white text-[9px] font-bold rounded">
                                        {new Date(video.duration_sec * 1000).toISOString().substr(14, 5)}
                                    </span>
                                </div>
                                <h3 className="text-[10px] font-black text-slate-800 uppercase leading-tight line-clamp-2 mb-1" title={video.title}>{video.title}</h3>
                                <div className="flex justify-between items-center text-[9px] font-bold text-slate-400">
                                    <span>{video.category || 'General'}</span>
                                    <span className="flex items-center gap-1"><Clock size={10} /> {video.duration_sec}s</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
