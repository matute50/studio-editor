
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { uploadImageToR2 } from '../services/r2';
import { NewsImageEditor } from '../components/NewsImageEditor';
import { generateProfessionalNews } from '../services/gemini';
import { Article } from '../types';
import {
  Trash2,
  Edit,
  PlusCircle,
  Loader2,
  RefreshCw,
  Crown,
  Star,
  LayoutList,
  Save,
  Sparkles,
  AlertCircle,
  ImageIcon as ImageIconLucide,
  Clock,
  FileText,
  Plus,
  Image as ImageIcon,
  X,
  Upload,
  Link as LinkIcon,
  Globe,
  ChevronRight
} from 'lucide-react';

type FeatureStatus = 'featured' | 'secondary' | 'tertiary' | 'standard' | '';

interface ImageSlot {
  id: string;
  url: string;
  file?: File;
  isProcessed: boolean;
}

export const NewsEditor: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loadingList, setLoading_list] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  // Campos de texto
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [featureStatus, setFeatureStatus] = useState<FeatureStatus>('standard');

  // Gestión de Imágenes
  const [featuredImage, setFeaturedImage] = useState<ImageSlot | null>(null);
  const [galleryImages, setGalleryImages] = useState<ImageSlot[]>([]);

  // UI para selección de origen (URL o Archivo)
  const [sourceSelector, setSourceSelector] = useState<{ type: 'featured' | 'gallery', index?: number } | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editor de Imágenes Activo
  const [activeEditor, setActiveEditor] = useState<{ src: string, type: 'featured' | 'gallery', index?: number } | null>(null);

  const [saving, setSaving] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    // Aseguramos limpieza al montar
    setTitle('');
    setText('');
    setFeaturedImage(null);
    setGalleryImages([]);
    setEditingId(null);
    fetchArticles();
  }, []);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const estimatedReadingTime = Math.floor(wordCount / 2.15);

  const sanitizeTitle = (val: string): string => {
    // Mantenemos los pipes durante la edición pero limpiamos saltos de línea reales
    return val.replace(/[\n\r]+/g, ' ').replace(/\s\s+/g, ' ').trim();
  };

  const fetchArticles = async () => {
    setLoading_list(true);
    try {
      const { data, error: err } = await supabase.from('articles').select('*').order('created_at', { ascending: false });
      if (err) throw err;
      setArticles(data || []);
    } catch (err: any) { setError(`Error: ${err.message}`); } finally { setLoading_list(false); }
  };

  const handleProfessionalRewrite = async () => {
    if (!title.trim() && !text.trim()) {
      setError("Ingresa al menos una idea o borrador para reescribir.");
      return;
    }
    setIsProcessingAI(true);
    setError(null);
    try {
      const result = await generateProfessionalNews(title + " " + text);

      // Validation: Only update if we got valid content back
      if (!result.title || result.title === "Título No Generado" || !result.body || result.body === "Cuerpo No Generado") {
        throw new Error("La IA no pudo generar un formato válido. Intentá de nuevo.");
      }

      setTitle(sanitizeTitle(result.title));
      setText(result.body);
      setSuccessMsg("Redacción profesional aplicada.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error("Error AI Redaction:", err);
      setError(err.message || "Error al conectar con la Agencia AI.");
    } finally { setIsProcessingAI(false); }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && sourceSelector) {
      const url = URL.createObjectURL(file);
      setActiveEditor({ src: url, type: sourceSelector.type, index: sourceSelector.index });
      setSourceSelector(null);
    }
    e.target.value = '';
  };

  const handleUrlLoad = () => {
    if (urlInput.trim() && sourceSelector) {
      setActiveEditor({ src: urlInput.trim(), type: sourceSelector.type, index: sourceSelector.index });
      setSourceSelector(null);
      setUrlInput('');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!featuredImage) {
      setError("Debe definir una imagen destacada.");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      let finalFeaturedUrl = featuredImage.url;
      if (featuredImage.file) {
        finalFeaturedUrl = await uploadImageToR2(featuredImage.file);
      }

      const finalGalleryUrls: string[] = [];
      for (const img of galleryImages) {
        if (img.file) {
          const uploadedUrl = await uploadImageToR2(img.file);
          finalGalleryUrls.push(uploadedUrl);
        } else {
          finalGalleryUrls.push(img.url);
        }
      }

      const articleData = {
        title: sanitizeTitle(title),
        text,
        image_url: finalFeaturedUrl,
        images_urls: finalGalleryUrls.length > 0 ? finalGalleryUrls : null,
        featureStatus: featureStatus === 'standard' ? null : featureStatus
      };

      if (editingId) {
        await supabase.from('articles').update(articleData).eq('id', editingId);
      } else {
        await supabase.from('articles').insert([articleData]);
      }

      setSuccessMsg(editingId ? 'Cambios guardados.' : 'Noticia publicada con éxito.');
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchArticles();
      resetForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setText('');
    setFeaturedImage(null);
    setGalleryImages([]);
    setFeatureStatus('standard');
  };

  return (
    <>
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={onFileSelect} />

      {sourceSelector && (
        <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 max-w-lg w-full space-y-8 animate-scaleIn">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Globe size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Cargar Imagen</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Selecciona el método de entrada</p>
            </div>

            <div className="space-y-6">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <Upload size={24} className="text-slate-300 group-hover:text-blue-600" />
                  <div className="text-left">
                    <span className="block text-sm font-black text-slate-700 uppercase tracking-tight">Subir Archivo</span>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Desde tu dispositivo</span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-300" />
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                <div className="relative flex justify-center text-[10px] font-black uppercase"><span className="px-4 bg-white text-slate-300">O bien</span></div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  <LinkIcon size={12} /> Pegar URL de Imagen
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="flex-1 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="https://ejemplo.com/imagen.jpg"
                  />
                  <button
                    onClick={handleUrlLoad}
                    disabled={!urlInput.trim()}
                    className="px-6 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 disabled:opacity-30 transition-all"
                  >
                    Cargar
                  </button>
                </div>
              </div>
            </div>

            <button onClick={() => { setSourceSelector(null); setUrlInput(''); }} className="w-full py-2 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-red-500 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {activeEditor && (
        <NewsImageEditor
          src={activeEditor.src}
          onSave={(file, previewUrl) => {
            if (activeEditor.type === 'featured') {
              setFeaturedImage({ id: 'featured', url: previewUrl, file, isProcessed: true });
            } else if (activeEditor.type === 'gallery') {
              if (activeEditor.index !== undefined) {
                setGalleryImages(prev => {
                  const updated = [...prev];
                  updated[activeEditor.index!] = { ...updated[activeEditor.index!], url: previewUrl, file, isProcessed: true };
                  return updated;
                });
              } else {
                setGalleryImages(prev => [...prev, { id: Date.now().toString(), url: previewUrl, file, isProcessed: true }]);
              }
            }
            setActiveEditor(null);
          }}
          onCancel={() => setActiveEditor(null)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-8rem)]">
        <div className="lg:col-span-5 flex flex-col h-full overflow-y-auto pr-2 custom-scrollbar">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                {editingId ? <Edit size={20} className="text-indigo-600" /> : <PlusCircle size={20} className="text-blue-600" />}
                {editingId ? 'Editar Noticia' : 'Nueva Noticia'}
              </h2>

            </div>

            {error && <div className="p-4 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-100 flex items-center gap-2"><AlertCircle size={14} /> {error}</div>}
            {successMsg && <div className="p-4 bg-green-50 text-green-700 text-xs font-bold rounded-xl border border-green-100 animate-fadeIn">{successMsg}</div>}

            <form onSubmit={handleSave} className="space-y-6" autoComplete="off">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título Gancho (Use | para salto de línea)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.replace(/[\n\r]+/g, ' '))}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder=""
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                  <label>Cuerpo de la Noticia</label>
                  <div className="flex gap-4 text-slate-400">
                    <span className="flex items-center gap-1"><FileText size={12} /> {wordCount} pal.</span>
                    <span className={`flex items-center gap-1 ${estimatedReadingTime > 100 ? 'text-red-500' : 'text-slate-400'}`}>
                      <Clock size={12} /> {estimatedReadingTime}s / 100s
                    </span>
                  </div>
                </div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all h-64 resize-none"
                  placeholder=""
                />
              </div>



              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Imagen Destacada (1080p)</label>
                <div
                  onClick={() => setSourceSelector({ type: 'featured' })}
                  className="w-full aspect-video bg-slate-100 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-all overflow-hidden relative group"
                >
                  {featuredImage ? (
                    <>
                      <img src={featuredImage.url} className="w-full h-full object-cover" alt="Preview" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                        <span className="text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Edit size={14} /> Cambiar</span>
                      </div>
                    </>
                  ) : (
                    <><ImageIconLucide size={32} className="text-slate-300 mb-2" /><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Añadir Imagen Principal</span></>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Galería Adicional</label>
                  <button
                    type="button"
                    onClick={() => setSourceSelector({ type: 'gallery' })}
                    className="flex items-center gap-1 text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 hover:bg-blue-100 transition-all"
                  >
                    <Plus size={12} /> AÑADIR
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {galleryImages.map((img, idx) => (
                    <div key={img.id} className="aspect-square bg-slate-100 rounded-xl overflow-hidden relative group border border-slate-200">
                      <img src={img.url} className="w-full h-full object-cover" alt={`Gallery ${idx}`} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-all">
                        <button type="button" onClick={() => setActiveEditor({ src: img.url, type: 'gallery', index: idx })} className="p-1.5 bg-blue-600 text-white rounded-lg"><Edit size={12} /></button>
                        <button type="button" onClick={() => setGalleryImages(prev => prev.filter(item => item.id !== img.id))} className="p-1.5 bg-red-600 text-white rounded-lg"><X size={12} /></button>
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

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Jerarquía Editorial</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'featured', label: 'Portada', icon: Crown, color: 'text-amber-500' },
                    { id: 'secondary', label: 'Secundaria', icon: Star, color: 'text-indigo-500' },
                    { id: 'tertiary', label: 'Terciaria', icon: Sparkles, color: 'text-blue-500' },
                    { id: 'standard', label: 'Estandar', icon: LayoutList, color: 'text-slate-400' }
                  ].map((s) => (
                    <button key={s.id} type="button" onClick={() => setFeatureStatus(s.id as FeatureStatus)} className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${featureStatus === s.id ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                      <s.icon size={20} className={`${featureStatus === s.id ? s.color : 'text-slate-300'} mb-1`} />
                      <span className="text-[8px] font-black uppercase">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4 flex-col">
                <button
                  type="button"
                  onClick={handleProfessionalRewrite}
                  disabled={isProcessingAI}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessingAI ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Redacción Profesional
                </button>
                <div className="flex gap-3">
                  <button type="button" onClick={resetForm} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Descartar</button>
                  <button type="submit" disabled={saving} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {editingId ? 'GUARDAR CAMBIOS' : 'PUBLICAR NOTICIA'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-8 py-5 border-b bg-slate-50 flex justify-between items-center shrink-0">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2"><LayoutList size={16} className="text-blue-500" /> Archivo de Redacción</h3>
            <button onClick={fetchArticles} className="p-2 hover:bg-slate-200 rounded-xl transition-colors"><RefreshCw size={16} className={`${loadingList ? 'animate-spin' : ''} text-slate-400`} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {articles.map((article) => (
              <div key={article.id} className="group relative bg-white border border-slate-100 rounded-2xl p-4 flex gap-4 hover:border-blue-200 transition-all">
                <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 border border-slate-100"><img src={article.image_url} className="w-full h-full object-cover" alt="Thumb" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {article.featureStatus && <span className="text-[7px] font-black px-1.5 py-0.5 rounded uppercase bg-amber-100 text-amber-600">{article.featureStatus}</span>}
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{new Date(article.created_at).toLocaleDateString()}</span>
                  </div>
                  {/* Ocultamos el pipe en la visualización de la lista administrativa sustituyéndolo por un espacio */}
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight line-clamp-2 leading-tight mb-2">{article.title.replace(/\|/g, ' ')}</h4>
                  <div className="flex gap-2">
                    <button onClick={() => {
                      setEditingId(article.id);
                      setTitle(sanitizeTitle(article.title));
                      setText(article.text);
                      setFeaturedImage({ id: 'featured', url: article.image_url, isProcessed: true });
                      setGalleryImages(article.images_urls ? article.images_urls.map((url, i) => ({ id: `old-${i}`, url, isProcessed: true })) : []);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }} className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-blue-600 hover:text-white transition-all"><Edit size={14} /></button>
                    <button onClick={() => setShowDeleteConfirm(article.id)} className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-red-600 hover:text-white transition-all"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
            <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="font-bold mb-4 uppercase text-xs tracking-widest">¿Eliminar noticia del archivo?</h3>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-600 uppercase text-[10px]">Cancelar</button>
              <button onClick={async () => { await supabase.from('articles').delete().eq('id', showDeleteConfirm); fetchArticles(); setShowDeleteConfirm(null); }} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg uppercase text-[10px]">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
