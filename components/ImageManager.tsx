import React from 'react';
import { ImageIcon as ImageIconLucide, Edit, Plus, X, Image as ImageIcon } from 'lucide-react';

export interface ImageSlot {
    id: string;
    url: string;
    file?: File;
    isProcessed: boolean;
}

interface ImageManagerProps {
    featuredImage: ImageSlot | null;
    galleryImages: ImageSlot[];
    onAddFeatured: () => void;
    onAddGallery: () => void;
    onEditFeatured: () => void;
    onMakeFeatured: (index: number) => void;
    onEditGallery: (index: number) => void;
    onRemoveGallery: (id: string) => void;
}

export const ImageManager: React.FC<ImageManagerProps> = ({
    featuredImage,
    galleryImages,
    onAddFeatured,
    onAddGallery,
    onEditFeatured,
    onMakeFeatured,
    onEditGallery,
    onRemoveGallery
}) => {
    return (
        <div className="space-y-6">
            {/* Featured Image */}
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Imagen Destacada (1080p)
                </label>
                <div
                    onClick={onAddFeatured}
                    className="w-full aspect-video bg-slate-100 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-all overflow-hidden relative group"
                >
                    {featuredImage ? (
                        <>
                            <img src={featuredImage.url} className="w-full h-full object-cover" alt="Preview" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-6 transition-all">
                                <button 
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onEditFeatured(); }}
                                    className="p-4 bg-blue-600 text-white rounded-xl hover:bg-blue-500 hover:scale-110 flex flex-col items-center gap-2 transition-all shadow-xl"
                                >
                                    <Edit size={24} /> 
                                    <span className="text-[10px] font-black uppercase tracking-widest">Editar Filtros</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onAddFeatured(); }}
                                    className="p-4 bg-slate-800 text-white rounded-xl hover:bg-slate-700 hover:scale-110 flex flex-col items-center gap-2 transition-all shadow-xl border border-slate-600"
                                >
                                    <ImageIconLucide size={24} /> 
                                    <span className="text-[10px] font-black uppercase tracking-widest">Cambiar Foto</span>
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <ImageIconLucide size={32} className="text-slate-300 mb-2" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Añadir Imagen Principal
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* Gallery */}
            <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Galería Adicional
                    </label>
                    <button
                        type="button"
                        onClick={onAddGallery}
                        className="flex items-center gap-1 text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 hover:bg-blue-100 transition-all"
                    >
                        <Plus size={12} /> AÑADIR
                    </button>
                </div>
                <div className="grid grid-cols-4 gap-3">
                    {galleryImages.map((img, idx) => (
                        <div key={img.id} className="aspect-square bg-slate-100 rounded-xl overflow-hidden relative group border border-slate-200">
                            <img src={img.url} className="w-full h-full object-cover" alt={`Gallery ${idx}`} />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-3 transition-all p-2">
                                <button
                                    type="button"
                                    onClick={() => onMakeFeatured(idx)}
                                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg flex gap-1.5 items-center text-[9px] font-black uppercase tracking-wider w-full justify-center hover:bg-green-500 shadow-md"
                                >
                                    <ImageIcon size={12} /> Destacar
                                </button>
                                <div className="flex gap-2 w-full">
                                    <button
                                        type="button"
                                        onClick={() => onEditGallery(idx)}
                                        className="flex-1 py-1.5 bg-blue-600 text-white rounded-lg flex justify-center hover:bg-blue-500 shadow-md"
                                    >
                                        <Edit size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onRemoveGallery(img.id)}
                                        className="flex-1 py-1.5 bg-red-600 text-white rounded-lg flex justify-center hover:bg-red-500 shadow-md"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {galleryImages.length === 0 && (
                        <div className="col-span-4 py-8 bg-slate-50 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-300">
                            <ImageIcon size={24} className="mb-2 opacity-20" />
                            <span className="text-[9px] font-black uppercase opacity-40">Galería vacía</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
