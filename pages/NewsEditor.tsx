
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { uploadImageToR2 } from '../services/r2';
import { generateSuperResumen } from '../services/gemini';
import { NewsImageEditor } from '../components/NewsImageEditor';
import { Article, ArticleCrudo } from '../types';
import { useNewsAI } from '../hooks/useNewsAI';
import { newsService } from '../services/newsService';
import { sanitizationService } from '../services/sanitizationService';
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
  DownloadCloud,
  Zap,
  Rocket,
  CheckCircle2,
  XCircle,
  X
} from 'lucide-react';

export const NewsEditor: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loadingList, setLoading_list] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  // Raw News Management
  const [activeTab, setActiveTab] = useState<'archivo' | 'crudas'>('archivo');
  const [rawArticles, setRawArticles] = useState<ArticleCrudo[]>([]);
  const [loadingRaw, setLoadingRaw] = useState(false);
  const [isScraping, setIsScraping] = useState(false);

  // Pipeline completo
  const [isPipelining, setIsPipelining] = useState(false);
  const [pipelinePhase, setPipelinePhase] = useState<string>('');
  const [pipelineResult, setPipelineResult] = useState<Record<string, any> | null>(null);
  const [showPipelineModal, setShowPipelineModal] = useState(false);

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
    if (activeTab === 'crudas') {
      fetchRawArticles();
    }
  }, [activeTab]);

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

  const fetchRawArticles = async () => {
    setLoadingRaw(true);
    try {
      const data = await newsService.getRawArticles();
      setRawArticles(data);
    } catch (err: any) {
      setError(`Error fetching raw news: ${err.message}`);
    } finally {
      setLoadingRaw(false);
    }
  };

  const handleManualScraping = async () => {
    setIsScraping(true);
    try {
      await newsService.runManualScraping();
      await fetchRawArticles();
      setSuccessMsg("Scraping manual finalizado con éxito.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
        setError("Error al ejecutar el scraping manual.");
    } finally {
      setIsScraping(false);
    }
  };

  const handleFullPipeline = async () => {
    setIsPipelining(true);
    setShowPipelineModal(true);
    setPipelineResult(null);
    setError(null);
    try {
      setPipelinePhase('🔍 Fase 1 — Scraping de fuentes...');
      const scrape = await newsService.runManualScraping();

      setPipelinePhase('⚙️ Fase 2 — Transformando artículos...');
      const transform = await newsService.transformAllRawArticles();

      setPipelinePhase('🧠 Fase 3 — Generando resúmenes con IA...');
      const resumen = await newsService.generateAllResumenes();

      setPipelinePhase('🎙️ Fase 4 — Sintetizando audio TTS...');
      const audio = await newsService.generateAllAudios();

      setPipelinePhase('🎬 Fase 5 — Compilando slides visuales...');
      const slide = await newsService.generateAllSlides();

      setPipelineResult({ scrape, transform, resumen, audio, slide });
      setPipelinePhase('✅ Pipeline finalizado con éxito.');
      fetchArticles();
      fetchRawArticles();
    } catch (err: any) {
      setPipelinePhase('');
      setError(`Error en pipeline: ${err.message}`);
      setShowPipelineModal(false);
    } finally {
      setIsPipelining(false);
    }
  };

  const handleProcessRaw = async (raw: ArticleCrudo) => {
    // Aplicar Sanatización Ara DNA (Limpieza de palabras prohibidas y fechas relativas)
    const cleanTitle = sanitizationService.sanitizeTitle(raw.title);
    const cleanText = sanitizationService.sanitize(raw.text, raw.created_at);

    // Fill form with sanaticed data
    setTitle(cleanTitle);
    setText(cleanText);
    setFeaturedImage({ id: 'featured', url: raw.image_url, isProcessed: true });
    setGalleryImages(raw.images_url ? raw.images_url.map((url, i) => ({ id: `raw-${i}`, url, isProcessed: true })) : []);
    
    // Mark as processed in DB immediately
    await newsService.updateRawArticleStatus(raw.id, 'procesado');
    
    // Switch to form and refresh
    setEditingId(null);
    fetchRawArticles();
    setSuccessMsg("Noticia cruda cargada para procesamiento.");
    setTimeout(() => setSuccessMsg(null), 3000);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteRaw = async (id: string) => {
    const ok = await newsService.updateRawArticleStatus(id, 'eliminado');
    if (ok) {
      fetchRawArticles();
      setSuccessMsg("Noticia descartada.");
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };
 
  const handleSwapRawImage = async (raw: ArticleCrudo, newUrl: string) => {
    const oldPrimary = raw.image_url;
    const newGallery = raw.images_url.map(url => url === newUrl ? oldPrimary : url);
    
    // Actualización optimista para evitar saltos/re-renders del servidor
    setRawArticles(prev => prev.map(item => 
      item.id === raw.id 
        ? { ...item, image_url: newUrl, images_url: newGallery } 
        : item
    ));

    await newsService.updateRawArticle(raw.id, {
        image_url: newUrl,
        images_url: newGallery
    });
  };

  const handleRemoveRawImage = async (raw: ArticleCrudo, urlToRemove: string, isPrimary: boolean) => {
    let updates: Partial<ArticleCrudo> = {};
    
    if (isPrimary) {
        if (raw.images_url.length > 0) {
            const newPrimary = raw.images_url[0];
            const newGallery = raw.images_url.slice(1);
            updates = { image_url: newPrimary, images_url: newGallery };
        } else {
            updates = { image_url: '' };
        }
    } else {
        updates = { images_url: raw.images_url.filter(u => u !== urlToRemove) };
    }

    // Actualización optimista
    setRawArticles(prev => prev.map(item => 
      item.id === raw.id 
        ? { ...item, ...updates } 
        : item
    ));

    await newsService.updateRawArticle(raw.id, updates);
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
                onEditFeatured={() => {
                  if (featuredImage?.url) setActiveEditor({ src: featuredImage.url, type: 'featured' });
                }}
                onMakeFeatured={(idx) => {
                  const targetGallery = galleryImages[idx];
                  if (featuredImage) {
                    const newGallery = [...galleryImages];
                    newGallery[idx] = featuredImage;
                    setFeaturedImage(targetGallery);
                    setGalleryImages(newGallery);
                  } else {
                    setFeaturedImage(targetGallery);
                    setGalleryImages(prev => prev.filter((_, i) => i !== idx));
                  }
                }}
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
          <div className="px-8 py-2 border-b bg-slate-50 flex justify-between items-center shrink-0">
            <div className="flex gap-6">
              <button 
                onClick={() => setActiveTab('archivo')}
                className={`py-3 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 border-b-2 transition-all ${activeTab === 'archivo' ? 'border-blue-500 text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                <LayoutList size={14} /> Archivo
              </button>
              <button 
                onClick={() => setActiveTab('crudas')}
                className={`py-3 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 border-b-2 transition-all ${activeTab === 'crudas' ? 'border-amber-500 text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                <DownloadCloud size={14} /> Noticias Crudas
                {rawArticles.length > 0 && <span className="bg-amber-500 text-white text-[8px] px-1.5 py-0.5 rounded-full ml-1">{rawArticles.length}</span>}
              </button>
            </div>
            <div className="flex items-center gap-2">
              {/* Botón: Pipeline Completo (5 fases) */}
              <button
                onClick={handleFullPipeline}
                disabled={isPipelining || isScraping}
                title="Ejecutar pipeline automático completo: Scraping → Transform → Resumen → Audio → Slide"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all font-black text-[9px] uppercase tracking-widest border ${
                  isPipelining
                    ? 'bg-slate-100 text-slate-400 border-slate-200'
                    : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200'
                }`}
              >
                {isPipelining ? <Loader2 size={12} className="animate-spin" /> : <Rocket size={12} />}
                {isPipelining ? 'Ejecutando...' : 'Pipeline'}
              </button>

              {/* Botón: Solo Scraping */}
              <button 
                onClick={handleManualScraping} 
                disabled={isScraping || isPipelining}
                title="Ejecutar scraping manual y recuperar imágenes"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all font-black text-[9px] uppercase tracking-widest border ${isScraping ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'}`}
              >
                {isScraping ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                Scraping
              </button>
              <button onClick={activeTab === 'archivo' ? fetchArticles : fetchRawArticles} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                <RefreshCw size={16} className={`${(loadingList || loadingRaw) ? 'animate-spin' : ''} text-slate-400`} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {activeTab === 'archivo' ? (
              articles.map((article) => (
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
              ))
            ) : (
              rawArticles.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4 opacity-50">
                  <DownloadCloud size={48} />
                  <p className="text-[10px] font-black uppercase tracking-widest">No hay noticias crudas pendientes</p>
                </div>
              ) : (
                rawArticles.map((raw) => (
                  <div key={raw.id} className="group relative bg-white border border-slate-100 rounded-2xl p-4 flex gap-4 hover:border-amber-200 transition-all border-l-4 border-l-amber-400">
                    <div className="w-24 h-24 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center border-2 border-white shadow-lg shrink-0 transition-transform group-hover:scale-110 relative">
                      {raw.image_url ? (
                        <>
                          <img src={raw.image_url} className="w-full h-full object-cover" alt="Thumb" />
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleRemoveRawImage(raw, raw.image_url, true); }}
                            className="absolute top-1 right-1 w-5 h-5 bg-black/80 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-10"
                            title="Eliminar imagen principal"
                          >
                            <X size={12} />
                          </button>
                        </>
                      ) : (
                        <Globe size={24} className="text-slate-200" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        {/* Tags: Hostname y Fecha */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[7px] font-black px-1.5 py-0.5 rounded uppercase bg-slate-100 text-slate-500">{new URL(raw.source_url).hostname}</span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{new Date(raw.created_at).toLocaleDateString()}</span>
                        </div>
                        
                        {/* Título de la noticia */}
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight line-clamp-2 leading-tight mb-3">{raw.title}</h4>

                        {/* GALERÍA HORIZONTAL DEBAJO DEL TÍTULO */}
                        {raw.images_url && raw.images_url.length > 0 && (
                          <div className="flex gap-2.5 overflow-x-auto pb-4 scrollbar-hide">
                            {raw.images_url.map((img: string, idx: number) => (
                              <div key={idx} className="relative group/img shrink-0">
                                <img 
                                  src={img} 
                                  alt={`Gallery ${idx}`} 
                                  onClick={(e) => { e.stopPropagation(); handleSwapRawImage(raw, img); }}
                                  className="w-12 h-12 rounded-lg border-2 border-white object-cover shadow-sm transition-all hover:scale-110 hover:shadow-md cursor-pointer"
                                  title="Click para usar como imagen principal"
                                />
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleRemoveRawImage(raw, img, false); }}
                                  className="absolute -top-1 -right-1 w-4 h-4 bg-black text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-10 sm:opacity-0 group-hover/img:opacity-100"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleProcessRaw(raw)}
                            className="px-4 py-2 bg-amber-500 text-white rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-amber-600 shadow-sm transition-all"
                          >
                            Procesar
                          </button>
                          <button 
                            onClick={() => handleDeleteRaw(raw.id)}
                            className="px-4 py-2 bg-slate-100 text-slate-400 rounded-lg font-black text-[9px] uppercase tracking-widest hover:text-red-500 transition-all"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      </div>

      {/* ──────── MODAL: PIPELINE COMPLETO ──────── */}
      {showPipelineModal && (
        <div className="fixed inset-0 z-[300] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-8 space-y-6 animate-scaleIn">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${ isPipelining ? 'bg-blue-600 animate-pulse' : pipelineResult ? 'bg-green-500' : 'bg-slate-200' }`}>
                <Rocket size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tighter">Pipeline Automático</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">5 Fases de Producción</p>
              </div>
            </div>

            {/* Fase actual */}
            <div className="bg-slate-50 rounded-2xl p-4 min-h-[3rem] flex items-center gap-3">
              {isPipelining && <Loader2 size={16} className="text-blue-500 animate-spin shrink-0" />}
              {!isPipelining && pipelineResult && <CheckCircle2 size={16} className="text-green-500 shrink-0" />}
              <p className="text-sm font-bold text-slate-700">
                {pipelinePhase || 'Iniciando...'}
              </p>
            </div>

            {/* Resumen de resultados (cuando termina) */}
            {pipelineResult && (
              <div className="space-y-2">
                {[
                  { label: '🔍 Scraping', key: 'scrape', count: (r: any) => r?.error ? `❌ ${r.error.substring(0, 15)}...` : (r?.count ?? r?.scraped ?? r?.inserted ?? '—') },
                  { label: '⚙️ Transformados', key: 'transform', count: (r: any) => r?.error ? `❌ ${r.error.substring(0, 15)}...` : (r?.count ?? r?.transformed ?? '—') },
                  { label: '🧠 Resúmenes', key: 'resumen', count: (r: any) => r?.error ? `❌ ${r.error.substring(0, 15)}...` : (r?.count ?? r?.generated ?? '—') },
                  { label: '🎙️ Audios', key: 'audio', count: (r: any) => r?.error ? `❌ ${r.error.substring(0, 15)}...` : (r?.count ?? r?.generated ?? '—') },
                  { label: '🎬 Slides', key: 'slide', count: (r: any) => r?.error ? `❌ ${r.error.substring(0, 15)}...` : (r?.count ?? r?.generated ?? '—') },
                ].map(({ label, key, count }) => (
                  <div key={key} className="flex justify-between items-center px-4 py-2 bg-slate-50 rounded-xl">
                    <span className="text-[11px] font-black text-slate-600 uppercase tracking-wide">{label}</span>
                    <span className="text-[11px] font-black text-blue-700 tabular-nums">
                      {count(pipelineResult[key === 'scrape' ? 'scrape' : key === 'transform' ? 'transform' : key === 'resumen' ? 'resumen' : key === 'audio' ? 'audio' : 'slide'])}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Botón cerrar (solo visible cuando termina) */}
            {!isPipelining && (
              <button
                onClick={() => { setShowPipelineModal(false); setPipelineResult(null); setPipelinePhase(''); }}
                className="w-full py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all"
              >
                {pipelineResult ? '✅ Cerrar Resumen' : 'Cerrar'}
              </button>
            )}
          </div>
        </div>
      )}

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
