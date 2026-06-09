import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, Image as ImageIcon, Loader2, GripVertical, AlertTriangle } from 'lucide-react';
import { bannerService } from '../services/bannerService';
import { uploadBannerToR2 } from '../services/r2';
import { Banner } from '../types';

export const BannerManager: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBanner, setNewBanner] = useState<Partial<Banner>>({
    title: '',
    link_url: '',
    is_active: true,
    position: 0
  });
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const data = await bannerService.getBanners();
      setBanners(data);
      if (data.length > 0) {
        setNewBanner(prev => ({ ...prev, position: data[data.length - 1].position + 1 }));
      }
    } catch (error) {
      console.error('Error fetching banners:', error);
      alert('Error al cargar banners');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!newBanner.title || (!selectedFile && !newBanner.image_url)) {
      alert('Título e Imagen son requeridos');
      return;
    }

    try {
      setSaving(true);
      let imageUrl = newBanner.image_url || '';

      if (selectedFile) {
        setUploadingFile(true);
        imageUrl = await uploadBannerToR2(selectedFile);
        setUploadingFile(false);
      }

      if (editingId) {
        await bannerService.updateBanner(editingId, {
          title: newBanner.title!,
          image_url: imageUrl,
          link_url: newBanner.link_url || '',
          is_active: newBanner.is_active ?? true,
          position: newBanner.position ?? 0
        });
      } else {
        await bannerService.createBanner({
          title: newBanner.title!,
          image_url: imageUrl,
          link_url: newBanner.link_url || '',
          is_active: newBanner.is_active ?? true,
          position: newBanner.position ?? 0
        });
      }

      handleCancelForm();
      await fetchBanners();
    } catch (error: any) {
      alert('Error guardando banner: ' + error.message);
    } finally {
      setSaving(false);
      setUploadingFile(false);
    }
  };

  const handleEdit = (banner: Banner) => {
    setEditingId(banner.id);
    setNewBanner({
      title: banner.title,
      link_url: banner.link_url,
      is_active: banner.is_active,
      position: banner.position,
      image_url: banner.image_url
    });
    setPreviewUrl(banner.image_url);
    setSelectedFile(null);
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingId(null);
    setNewBanner({ title: '', link_url: '', is_active: true, position: banners.length });
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const toggleActive = async (banner: Banner) => {
    try {
      await bannerService.updateBanner(banner.id, { is_active: !banner.is_active });
      await fetchBanners();
    } catch (error) {
      console.error('Error toggling banner status:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este banner?')) return;
    try {
      await bannerService.deleteBanner(id);
      await fetchBanners();
    } catch (error) {
      console.error('Error deleting banner:', error);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 pb-32">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Gestor de Banners</h1>
          <p className="text-slate-500 font-medium">Administra la publicidad de la columna derecha</p>
        </div>
        <button
          onClick={() => showAddForm ? handleCancelForm() : setShowAddForm(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30"
        >
          {showAddForm ? <X size={20} /> : <Plus size={20} />}
          {showAddForm ? 'Cancelar' : 'Nuevo Banner'}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 animate-fadeIn">
          <h2 className="text-xl font-bold mb-4">{editingId ? 'Editar Banner' : 'Agregar Nuevo Banner'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título / Cliente</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newBanner.title}
                  onChange={(e) => setNewBanner({ ...newBanner, title: e.target.value })}
                  placeholder="Ej: Publicidad Panadería..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">URL del Enlace (Opcional)</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newBanner.link_url}
                  onChange={(e) => setNewBanner({ ...newBanner, link_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newBanner.is_active}
                    onChange={(e) => setNewBanner({ ...newBanner, is_active: e.target.checked })}
                    className="w-5 h-5 rounded text-blue-600"
                  />
                  <span className="font-bold text-slate-700">Activo (Visible)</span>
                </label>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Posición</label>
                  <input
                    type="number"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newBanner.position}
                    onChange={(e) => setNewBanner({ ...newBanner, position: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Imagen del Banner</label>
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 flex flex-col items-center justify-center text-center relative overflow-hidden h-48 bg-slate-50">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-contain absolute inset-0" />
                ) : (
                  <div className="text-slate-400">
                    <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-bold">Clic o arrastrar imagen</p>
                    <p className="text-xs mt-1">Recomendado: 300x250 o 300x600 px</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={handleCancelForm}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || uploadingFile}
              className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all disabled:opacity-50"
            >
              {(saving || uploadingFile) ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
              {uploadingFile ? 'Subiendo...' : saving ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Crear Banner'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : banners.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-500">
          <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <h3 className="text-xl font-bold mb-2">No hay banners</h3>
          <p>Agrega tu primer banner para mostrar en la columna de publicidad.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {banners.map(banner => (
            <div key={banner.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all group ${banner.is_active ? 'border-slate-200' : 'border-slate-200 opacity-60 grayscale'}`}>
              <div className="h-40 bg-slate-100 relative overflow-hidden">
                <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 flex gap-1">
                  <button 
                    onClick={() => toggleActive(banner)}
                    className={`p-1.5 rounded-lg shadow backdrop-blur-md transition-colors ${banner.is_active ? 'bg-green-500/90 text-white' : 'bg-slate-800/90 text-slate-300'}`}
                    title={banner.is_active ? 'Desactivar' : 'Activar'}
                  >
                    {banner.is_active ? <Check size={14} /> : <X size={14} />}
                  </button>
                  <button 
                    onClick={() => handleEdit(banner)}
                    className="p-1.5 rounded-lg bg-blue-500/90 text-white shadow backdrop-blur-md hover:bg-blue-600 transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => handleDelete(banner.id)}
                    className="p-1.5 rounded-lg bg-red-500/90 text-white shadow backdrop-blur-md hover:bg-red-600 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {!banner.is_active && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-widest">Inactivo</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <GripVertical size={14} className="text-slate-400" />
                  <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md uppercase">Pos: {banner.position}</span>
                </div>
                <h3 className="font-bold text-slate-800 truncate mb-1" title={banner.title}>{banner.title}</h3>
                <div className="text-[11px] text-slate-500 truncate mb-3">
                  {banner.link_url ? <a href={banner.link_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">{banner.link_url}</a> : 'Sin enlace'}
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                  Creado: {new Date(banner.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
