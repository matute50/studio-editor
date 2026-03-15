
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { uploadImageToR2 } from '../services/r2';
import { generateSuperResumen } from '../services/gemini';
import { NewsImageEditor } from '../components/NewsImageEditor';
import { Article } from '../types';
import { useNewsAI } from '../hooks/useNewsAI';
import { FeatureStatusSelector, FeatureStatus } from '../components/FeatureStatusSelector';
import { ImageManager, ImageSlot } from '../components/ImageManager';
import {
  Trash2,
  Edit,
  PlusCircle,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  AlertCircle,
  LayoutList,
  Globe,
  ChevronRight,
  Upload,
  Link as LinkIcon,
  DownloadCloud
} from 'lucide-react';

export const NewsEditor: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loadingList, setLoading_list] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  // Campos de texto
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [superResumen, setSuperResumen] = useState('');
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
  const [generatingResumen, setGeneratingResumen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { rewriteNews, isProcessingAI, aiError } = useNewsAI();

  useEffect(() => {
    resetForm();
    fetchArticles();
  }, []);

  useEffect(() => {
    if (aiError) setError(aiError);
  }, [aiError]);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const estimatedReadingTime = Math.floor(wordCount / 2.15);

  const sanitizeTitle = (val: string): string => {
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
    const result = await rewriteNews(title, text);
    if (result) {
      setTitle(sanitizeTitle(result.title));
      setText(result.body);
      setSuccessMsg("Redacción profesional aplicada.");
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleGenerateResumen = async () => {
    if (!text.trim()) {
      setError("El cuerpo de la noticia está vacío. Escribe algo antes de resumir.");
      return;
    }
    setGeneratingResumen(true);
    setError(null);
    try {
      const resumen = await generateSuperResumen(text);
      setSuperResumen(resumen);
      setSuccessMsg("Súper resumen generado con éxito.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || "Error al generar el súper resumen.");
    } finally {
      setGeneratingResumen(false);
    }
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

      let finalSuperResumen = superResumen.trim() || null;
      if (!finalSuperResumen && text.trim()) {
        try {
          finalSuperResumen = await generateSuperResumen(text);
          setSuperResumen(finalSuperResumen); // update ui optionally
        } catch (aiErr) {
          console.warn("Could not generate super resumen automatically:", aiErr);
        }
      }

      const articleData: any = {
        title: sanitizeTitle(title),
        text,
        image_url: finalFeaturedUrl,
        images_urls: finalGalleryUrls.length > 0 ? finalGalleryUrls : null,
        featureStatus: featureStatus === 'standard' ? null : featureStatus,
        super_resumen: finalSuperResumen
      };

      if (editingId) {
        // Al editar siempre actualizamos la fecha de creación para que suba a lo más reciente
        articleData.created_at = new Date().toISOString();
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
    setSuperResumen('');
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
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                  <label>Cuerpo de la Noticia</label>
                  <div className="flex gap-4 text-slate-400">
                    <span className="flex items-center gap-1"><LayoutList size={12} /> {wordCount} pal.</span>
                    <span className={`flex items-center gap-1 ${estimatedReadingTime > 80 ? 'text-red-500' : 'text-slate-400'}`}>
                      <ChevronRight size={12} /> {estimatedReadingTime}s / 80s
                    </span>
                  </div>
                </div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all h-64 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Súper Resumen (Estilo Ara: 4 oraciones)</label>
                <textarea
                  value={superResumen}
                  onChange={(e) => setSuperResumen(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all h-24 resize-none"
                  placeholder="Se genera automáticamente aplicando las 13 reglas del Estilo Ara (17-20 pal en 1ra oración, 15-18 en las demás)."
                />
              </div>

              <ImageManager
                featuredImage={featuredImage}
                galleryImages={galleryImages}
                onAddFeatured={() => setSourceSelector({ type: 'featured' })}
                onAddGallery={() => setSourceSelector({ type: 'gallery' })}
                onEditGallery={(idx) => setActiveEditor({ src: galleryImages[idx].url, type: 'gallery', index: idx })}
                onRemoveGallery={(id) => setGalleryImages(prev => prev.filter(item => item.id !== id))}
              />

              <FeatureStatusSelector
                currentStatus={featureStatus}
                onStatusChange={setFeatureStatus}
              />

              <div className="flex gap-3 pt-4 flex-col">
                <button
                  type="button"
                  onClick={handleGenerateResumen}
                  disabled={generatingResumen || !text.trim()}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {generatingResumen ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Generar Súper Resumen (Estilo Ara)
                </button>
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
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    {editingId ? 'GUARDAR EDICIÓN (NOTICIA)' : 'PUBLICAR NOTICIA'}
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
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight line-clamp-2 leading-tight mb-2">{article.title.replace(/\|/g, ' ')}</h4>
                  <div className="flex gap-2">
                    <button onClick={() => {
                      setEditingId(article.id);
                      setTitle(sanitizeTitle(article.title));
                      setText(article.text);
                      setSuperResumen(article.super_resumen || '');
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
