import React, { useState, useEffect } from 'react';
import {
    Youtube,
    Loader2,
    Save,
    PlayCircle,
    Trash2,
    Clock,
    Edit2,
    Image as ImageIcon
} from 'lucide-react';
import { searchYouTubeVideoInfo, VideoAsset, saveVideoToLibrary } from '../services/youtube';
import { supabase } from '../services/supabase';

export const YouTubeStudio: React.FC = () => {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState<VideoAsset | null>(null);
    const [library, setLibrary] = useState<VideoAsset[]>([]);
    const [loadingLib, setLoadingLib] = useState(true);

    const [publishedVideos, setPublishedVideos] = useState<any[]>([]);
    const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);
    const [activeCategory, setActiveCategory] = useState('');
    const [publishCategory, setPublishCategory] = useState('');
    const [publishing, setPublishing] = useState(false);

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);

    const handlePublish = async () => {
        if (!preview || !publishCategory) return;
        setPublishing(true);
        try {
            const videoData = {
                nombre: preview.title,
                url: `https://www.youtube.com/watch?v=${preview.youtube_id}`,
                categoria: publishCategory,
                imagen: preview.thumbnail_url,
                createdAt: new Date().toISOString(), // Using camelCase as discovered
                updatedAt: new Date().toISOString()
            };

            const { error } = await supabase.from('videos').insert([videoData]);

            if (error) {
                console.error("Error publishing video:", error);
                alert("Error al publicar: " + error.message);
            } else {
                alert("Video publicado exitosamente en: " + publishCategory);
                setPreview(null);
                setUrl('');
                setPublishCategory('');
                fetchPublishedVideos(); // Refresh the list
            }
        } catch (err: any) {
            console.error("Unexpected error publishing:", err);
            alert("Error inesperado al publicar: " + err.message);
        } finally {
            setPublishing(false);
        }
    };

    useEffect(() => {
        fetchLibrary();
        fetchPublishedVideos();
    }, []);

    const fetchPublishedVideos = async () => {
        try {
            const { data, error } = await supabase.from('videos').select('*').order('createdAt', { ascending: false }); // Note: 'createdAt' based on schema check

            if (error) {
                console.error("Error fetching published videos:", error);
                alert("Error cargando videos publicados: " + error.message);
                return;
            }

            if (data) {
                setPublishedVideos(data);

                // Extract categories and calculate counts
                const counts: Record<string, number> = {};
                data.forEach((v) => {
                    if (v.categoria) {
                        counts[v.categoria] = (counts[v.categoria] || 0) + 1;
                    }
                });

                // Convert to array and sort
                const catArray = Object.entries(counts)
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => a.name.localeCompare(b.name));

                setCategories(catArray);
            }
        } catch (err: any) {
            console.error("Unexpected error fetching published videos:", err);
            alert("Error inesperado: " + err.message);
        }
    };

    const fetchLibrary = async () => {
        setLoadingLib(true);
        const { data } = await supabase.from('videos_external').select('*').order('created_at', { ascending: false });
        if (data) setLibrary(data);
        setLoadingLib(false);
    };

    const getThumbnail = (url: string) => {
        if (!url) return '';
        const videoId = url.split('v=')[1];
        if (videoId) {
            const ampersandPosition = videoId.indexOf('&');
            // If there's an ampersand, cut off everything after it.
            // If not, use the whole string (even if it's potentially long, but usually ID is 11 chars).
            // A safer regex might be better, but sticking to split for now with the existing logic improved.
            // Better yet, use a regex or check for youtu.be as well.
            const id = ampersandPosition !== -1 ? videoId.substring(0, ampersandPosition) : videoId;
            return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
        }
        // Fallback for short URLs (youtu.be)
        if (url.includes('youtu.be/')) {
            const id = url.split('youtu.be/')[1]?.split('?')[0];
            if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
        }
        return '';
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

    const handleRename = async (video: any) => {
        const newName = prompt("Nuevo nombre para el video:", video.nombre);
        if (!newName || newName === video.nombre) return;

        try {
            const { error } = await supabase
                .from('videos')
                .update({ nombre: newName })
                .eq('id', video.id);

            if (error) {
                alert("Error al renombrar: " + error.message);
            } else {
                fetchPublishedVideos(); // Refresh list
            }
        } catch (err: any) {
            alert("Error: " + err.message);
        }
    };

    const handleImageCheck = (id: number) => {
        setSelectedVideoId(id);
        fileInputRef.current?.click();
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !selectedVideoId) return;
        const file = e.target.files[0];

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `custom_thumb_${selectedVideoId}_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('imagenvideos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('imagenvideos')
                .getPublicUrl(filePath);

            const { error: updateError } = await supabase
                .from('videos')
                .update({ imagen: publicUrl })
                .eq('id', selectedVideoId);

            if (updateError) throw updateError;

            alert("Miniatura actualizada con éxito!");
            fetchPublishedVideos();

        } catch (err: any) {
            console.error("Error uploading image:", err);
            alert("Error al subir imagen: " + err.message);
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
            setSelectedVideoId(null);
        }
    };

    const handleDeletePublished = async (id: number) => {
        if (!confirm("¿Estás seguro de eliminar este video del carrusel público?")) return;

        try {
            const { error } = await supabase.from('videos').delete().eq('id', id);
            if (error) {
                alert("Error al eliminar: " + error.message);
            } else {
                fetchPublishedVideos();
            }
        } catch (err: any) {
            alert("Error: " + err.message);
        }
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

                                <div className="flex flex-col gap-2 mt-2">
                                    <div className="flex gap-2">
                                        <select
                                            value={publishCategory}
                                            onChange={(e) => setPublishCategory(e.target.value)}
                                            className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-red-200 text-[10px] font-bold uppercase text-slate-700 outline-none focus:ring-2 focus:ring-red-500"
                                        >
                                            <option value="">Seleccionar Categoría...</option>
                                            {categories.map((cat) => (
                                                <option key={cat.name} value={cat.name}>{cat.name}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={handlePublish}
                                            disabled={!publishCategory || publishing}
                                            className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {publishing ? <Loader2 className="animate-spin w-3 h-3" /> : 'PUBLICAR'}
                                        </button>
                                    </div>

                                    <button onClick={handleSave} className="w-full px-4 py-1.5 bg-slate-200 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-300 transition-all flex items-center justify-center gap-2">
                                        <Save size={12} /> Guardar en Biblioteca (Sin Publicar)
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Internal Video Library (Supabase 'videos' table) */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Videos Publicados (App TV)</h2>
                    <div className="flex gap-2">
                        <select
                            onChange={(e) => setActiveCategory(e.target.value)}
                            className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-xs uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">Todas las Categorías</option>
                            {categories.map((cat) => (
                                <option key={cat.name} value={cat.name}>{cat.name} ({cat.count})</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar p-1">
                    {publishedVideos.filter(v => !activeCategory || v.categoria === activeCategory).map((video) => (
                        <div key={video.id} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                            <div className="aspect-video bg-slate-200 rounded-xl overflow-hidden relative mb-3">
                                <img
                                    src={video.imagen || getThumbnail(video.url) || `https://ui-avatars.com/api/?name=${video.nombre}&background=random`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = getThumbnail(video.url) || `https://ui-avatars.com/api/?name=${video.nombre}&background=random`;
                                    }}
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                    <a href={video.url} target="_blank" rel="noreferrer" className="p-1 bg-white/20 hover:bg-white text-white hover:text-blue-600 rounded-full transition-all">
                                        <PlayCircle size={14} />
                                    </a>
                                    <button
                                        onClick={() => handleRename(video)}
                                        className="p-1 bg-white/20 hover:bg-yellow-400 text-white hover:text-yellow-900 rounded-full transition-all"
                                        title="Renombrar Video"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDeletePublished(video.id)}
                                        className="p-1 bg-white/20 hover:bg-red-600 text-white rounded-full transition-all"
                                        title="Eliminar Publicación"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleImageCheck(video.id)}
                                        className="p-1 bg-blue-600 hover:bg-blue-400 text-white rounded-full transition-all"
                                        title="Subir Miniatura Personalizada"
                                    >
                                        <ImageIcon size={14} />
                                    </button>
                                </div>
                            </div>
                            <h3 className="text-[10px] font-black text-slate-800 uppercase leading-tight line-clamp-2 mb-1" title={video.nombre}>{video.nombre}</h3>
                            <div className="flex justify-between items-center text-[9px] font-bold text-slate-400">
                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{video.categoria}</span>
                            </div>
                        </div>
                    ))}
                </div>
                {/* Hidden File Input for Custom Thumbnails */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                />
            </div>

            {/* External Library Section Title */}
            <div className="flex items-center gap-2 mt-4">
                <Youtube size={20} className="text-red-600" />
                <h3 className="text-md font-black text-slate-700 uppercase">Repositorio Externo (YouTube)</h3>
            </div>

            {/* Library Grid (External) */}
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
