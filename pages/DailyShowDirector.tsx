import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Article } from '../types';
import {
    Clapperboard,
    Save,
    Trash2,
    Play,
    Copy,
    Plus,
    X,
    GripVertical,
    CheckCircle2,
    Loader2,
    RefreshCw,
    Search,
    Presentation
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SavedDailyShow {
    id: string;
    nombre: string;
    secuencia: string[];
    created_at: string;
}

export const DailyShowDirector: React.FC = () => {
    const { user } = useAuth();

    // States
    const [availableSlides, setAvailableSlides] = useState<Article[]>([]);
    const [loadingSlides, setLoadingSlides] = useState(true);

    const [savedShows, setSavedShows] = useState<SavedDailyShow[]>([]);
    const [loadingShows, setLoadingShows] = useState(true);

    const [currentShowId, setCurrentShowId] = useState<string | null>(null);
    const [showName, setShowName] = useState('Nuevo Daily Show');
    const [selectedSlides, setSelectedSlides] = useState<Article[]>([]);

    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const [searchTerm, setSearchTerm] = useState('');

    // Initial Data Fetch
    useEffect(() => {
        fetchAvailableSlides();
        fetchSavedShows();
    }, []);

    const fetchAvailableSlides = async () => {
        setLoadingSlides(true);
        try {
            // Traer articles que tengan url_slide (no nulo)
            const { data, error } = await supabase
                .from('articles')
                .select('*')
                .not('url_slide', 'is', null)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAvailableSlides(data || []);
        } catch (error: any) {
            console.error("Error fetching slides:", error);
            setErrorMsg("Error cargando slides: " + error.message);
        } finally {
            setLoadingSlides(false);
        }
    };

    const fetchSavedShows = async () => {
        setLoadingShows(true);
        try {
            const { data, error } = await supabase
                .from('resumenes')
                .select('id, nombre, secuencia, created_at')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSavedShows(data || []);
        } catch (error: any) {
            console.error("Error fetching saved shows:", error);
        } finally {
            setLoadingShows(false);
        }
    };

    // Actions
    const handleAddSlide = (slide: Article) => {
        setSelectedSlides([...selectedSlides, slide]);
    };

    const handleRemoveSlide = (indexToRemove: number) => {
        setSelectedSlides(selectedSlides.filter((_, index) => index !== indexToRemove));
    };

    const handleMoveUp = (index: number) => {
        if (index === 0) return;
        const newSlides = [...selectedSlides];
        const temp = newSlides[index];
        newSlides[index] = newSlides[index - 1];
        newSlides[index - 1] = temp;
        setSelectedSlides(newSlides);
    };

    const handleMoveDown = (index: number) => {
        if (index === selectedSlides.length - 1) return;
        const newSlides = [...selectedSlides];
        const temp = newSlides[index];
        newSlides[index] = newSlides[index + 1];
        newSlides[index + 1] = temp;
        setSelectedSlides(newSlides);
    };

    const loadShow = (show: SavedDailyShow) => {
        setCurrentShowId(show.id);
        setShowName(show.nombre);

        // Reconstruir selectedSlides desde los URLs guardados
        // Buscamos en availableSlides para recuperar el objeto completo (título, imagen)
        const reconstituted = show.secuencia.map(url => {
            const found = availableSlides.find(s => s.url_slide === url);
            // Si no se encuentra en la UI (fue eliminado el article), creamos un fallback
            if (found) return found;
            return {
                id: url,
                title: 'Slide Desconocido (URL)',
                image_url: 'https://saladillovivo.vercel.app/default-og-image.png',
                url_slide: url,
                text: ''
            } as unknown as Article;
        });

        setSelectedSlides(reconstituted);
    };

    const handleNewShow = () => {
        setCurrentShowId(null);
        setShowName('Nuevo Daily Show ' + new Date().toLocaleDateString());
        setSelectedSlides([]);
    };

    const handleSaveShow = async () => {
        if (!showName.trim()) {
            setErrorMsg("El show debe tener un nombre");
            return;
        }
        if (selectedSlides.length === 0) {
            setErrorMsg("Debes agregar al menos un slide");
            return;
        }

        setIsSaving(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            const urlsToSave = selectedSlides.map(s => s.url_slide).filter(Boolean);

            if (currentShowId) {
                // Update
                const { error } = await supabase
                    .from('resumenes')
                    .update({
                        nombre: showName,
                        secuencia: urlsToSave,
                    })
                    .eq('id', currentShowId);

                if (error) throw error;
                setSuccessMsg("Show actualizado con éxito");
            } else {
                // Insert
                const { data, error } = await supabase
                    .from('resumenes')
                    .insert({
                        nombre: showName,
                        secuencia: urlsToSave,
                        user_id: user?.id || null
                    })
                    .select()
                    .single();

                if (error) throw error;
                setCurrentShowId(data.id);
                setSuccessMsg("Show creado con éxito");
            }

            fetchSavedShows();

            // Limpiar mensaje éxito rápido
            setTimeout(() => setSuccessMsg(''), 3000);

        } catch (error: any) {
            console.error("Error saving:", error);
            setErrorMsg("Error guardando el show: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteShow = async () => {
        if (!currentShowId) return;
        if (!window.confirm(`¿Estás seguro de eliminar el show "${showName}"?`)) return;

        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('resumenes')
                .delete()
                .eq('id', currentShowId);

            if (error) throw error;

            setSuccessMsg("Show eliminado");
            handleNewShow();
            fetchSavedShows();
        } catch (error: any) {
            setErrorMsg("Error eliminando: " + error.message);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleShareWhatsApp = () => {
        if (!currentShowId) return;
        const url = `https://m.saladillovivo.com.ar/?resumen=${currentShowId}`;
        const encodedText = encodeURIComponent(`📺 *${showName || 'Daily Show'}*\nMirá el compacto de noticias en Saladillo ViVo:\n\n👉 ${url}`);

        window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');

        setSuccessMsg("¡Abriendo WhatsApp!");
        setTimeout(() => setSuccessMsg(''), 3000);
    };

    const filteredSlides = availableSlides.filter(slide =>
        slide.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-[calc(100vh-8rem)] grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">

            {/* Sidebar de Resúmenes */}
            <div className="lg:col-span-3 flex flex-col h-full bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b bg-slate-50 flex justify-between items-center shrink-0">
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                        <Clapperboard size={18} className="text-emerald-600" /> Archivo
                    </h3>
                    <button onClick={handleNewShow} className="p-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-xl transition-colors shadow-sm">
                        <Plus size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/30">
                    {loadingShows ? (
                        <div className="flex justify-center p-6"><Loader2 className="animate-spin text-slate-400" /></div>
                    ) : savedShows.length === 0 ? (
                        <div className="text-center p-6 text-slate-400 text-xs font-bold uppercase">No hay shows guardados</div>
                    ) : (
                        savedShows.map((show) => (
                            <div
                                key={show.id}
                                onClick={() => loadShow(show)}
                                className={"p-4 rounded-2xl border transition-all cursor-pointer " +
                                    (currentShowId === show.id ? 'bg-white border-emerald-400 ring-4 ring-emerald-50 shadow-md' : 'bg-white border-slate-100 hover:border-slate-300')}
                            >
                                <h4 className={"font-black text-sm line-clamp-2 leading-tight uppercase tracking-tight mb-2 " + (currentShowId === show.id ? 'text-emerald-700' : 'text-slate-800')}>
                                    {show.nombre}
                                </h4>
                                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500">
                                    <span>{show.secuencia.length} Slides</span>
                                    <span>{new Date(show.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Editor Principal (Centro) */}
            <div className="lg:col-span-5 flex flex-col h-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden relative">
                <div className="p-6 border-b bg-slate-50 shrink-0">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                                <Play size={24} className="text-blue-600 fill-blue-600" /> SEQUENCE BUILDER
                            </h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                                {selectedSlides.length} items en secuencia
                            </p>
                        </div>

                        {/* Notificaciones inline */}
                        {successMsg && <div className="text-[10px] text-green-700 bg-green-100 px-3 py-1.5 rounded-full font-black uppercase tracking-widest flex items-center gap-1"><CheckCircle2 size={12} /> {successMsg}</div>}
                        {errorMsg && <div className="text-[10px] text-red-700 bg-red-100 px-3 py-1.5 rounded-full font-black uppercase tracking-widest">{errorMsg}</div>}
                    </div>

                    <input
                        type="text"
                        value={showName}
                        onChange={(e) => setShowName(e.target.value)}
                        className="w-full text-2xl font-black text-slate-900 bg-transparent outline-none border-b-2 border-slate-200 focus:border-emerald-500 transition-colors pb-2"
                        placeholder="Título del Show"
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-100/50 custom-scrollbar">
                    {selectedSlides.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-50 border-2 border-dashed border-slate-300 rounded-3xl p-10 text-center">
                            <Clapperboard size={64} />
                            <p className="uppercase font-black text-xs tracking-widest">El show está vacío<br />Haz clic en un slide a la derecha para agregarlo</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {selectedSlides.map((slide, index) => (
                                <div key={index + '-' + slide.id} className="flex bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden group">
                                    {/* Reordenar controles */}
                                    <div className="w-10 bg-slate-50 flex flex-col items-center justify-center border-r border-slate-100 text-slate-400 gap-2">
                                        <button disabled={index === 0} onClick={() => handleMoveUp(index)} className="hover:text-blue-600 disabled:opacity-30">▲</button>
                                        <span className="text-[10px] font-black">{index + 1}</span>
                                        <button disabled={index === selectedSlides.length - 1} onClick={() => handleMoveDown(index)} className="hover:text-blue-600 disabled:opacity-30">▼</button>
                                    </div>

                                    <img src={slide.image_url} alt="" className="w-24 h-24 object-cover" />

                                    <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
                                        <h4 className="text-xs font-black uppercase text-slate-800 line-clamp-2 leading-tight">
                                            {slide.title}
                                        </h4>
                                        <div className="mt-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-1">
                                            <Presentation size={12} /> Visual Slide
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleRemoveSlide(index)}
                                        className="w-12 flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t bg-slate-50 shrink-0 grid grid-cols-2 gap-4">
                    <button
                        onClick={handleSaveShow}
                        disabled={isSaving || selectedSlides.length === 0}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl shadow-lg flex items-center justify-center gap-2 font-black text-[11px] uppercase tracking-widest transition-colors disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Guardar Secuencia
                    </button>

                    {currentShowId ? (
                        <div className="flex gap-2">
                            <button
                                onClick={handleShareWhatsApp}
                                className="flex-1 py-4 bg-[#25D366] hover:bg-[#1DA851] text-white rounded-2xl shadow-lg flex items-center justify-center gap-2 font-black text-[11px] uppercase tracking-widest transition-colors"
                            >
                                Compartir WA
                            </button>
                            <button
                                onClick={handleDeleteShow}
                                disabled={isDeleting}
                                className="w-16 flex items-center justify-center py-4 bg-red-100 hover:bg-red-200 text-red-700 rounded-2xl transition-colors disabled:opacity-50"
                            >
                                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            </button>
                        </div>
                    ) : (
                        <div className="w-full py-4 border-2 border-dashed border-slate-200 text-slate-400 rounded-2xl flex items-center justify-center font-black text-[10px] uppercase tracking-widest text-center">
                            Guarda el show<br />para compartir
                        </div>
                    )}
                </div>
            </div>

            {/* Banco de Slides (Derecha) */}
            <div className="lg:col-span-4 flex flex-col h-full bg-slate-900 rounded-3xl shadow-xl border border-slate-800 overflow-hidden text-white relative">
                <div className="p-6 border-b border-slate-800 shrink-0">
                    <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center justify-between mb-4">
                        <span className="flex items-center gap-2"><Presentation size={18} className="text-blue-400" /> Banco de Slides</span>
                        <button onClick={fetchAvailableSlides} className="hover:text-white"><RefreshCw size={16} className={loadingSlides ? 'animate-spin' : ''} /></button>
                    </h3>

                    <div className="relative">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar slides..."
                            className="w-full bg-slate-800 border-none rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                    {loadingSlides ? (
                        <div className="flex justify-center p-10"><Loader2 className="animate-spin text-slate-600" size={32} /></div>
                    ) : filteredSlides.length === 0 ? (
                        <div className="text-center p-10 text-slate-500 text-xs font-bold uppercase">No se encontraron slides</div>
                    ) : (
                        filteredSlides.map((slide) => (
                            <div
                                key={slide.id}
                                onClick={() => handleAddSlide(slide)}
                                className="flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-2xl cursor-pointer transition-all group"
                            >
                                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 relative">
                                    <img src={slide.image_url} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                    <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <Plus className="text-white drop-shadow-md" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[10px] font-black uppercase leading-tight line-clamp-2 text-slate-300 group-hover:text-white transition-colors">
                                        {slide.title.replace(/\|/g, ' ')}
                                    </h4>
                                    <span className="mt-1 inline-block text-[8px] font-black uppercase tracking-widest bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
                                        Slide Disponible
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

        </div>
    );
};
