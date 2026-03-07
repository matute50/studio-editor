
import React, { useState, useCallback, useMemo } from 'react';
import Cropper from 'react-easy-crop';
import { getProcessedImage, ImageAdjustments } from '../utils/canvasUtils';
import {
  X,
  Check,
  RotateCcw,
  ZoomIn,
  Sun,
  Contrast,
  Droplets,
  Triangle,
  ArrowRight,
  Crop,
  Sliders,
  Loader2,
  Undo2,
  Sparkles,
  Zap,
  AlertCircle
} from 'lucide-react';

interface NewsImageEditorProps {
  src: string;
  onSave: (file: File, previewUrl: string) => void;
  onCancel: () => void;
}

type EditorMode = 'CROP' | 'EDIT';

export const NewsImageEditor: React.FC<NewsImageEditorProps> = ({ src, onSave, onCancel }) => {
  const [mode, setMode] = useState<EditorMode>('CROP');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [adjustments, setAdjustments] = useState<ImageAdjustments>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    sharpen: 50
  });

  const onCropComplete = useCallback((_: any, pixels: any) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleAutoEnhance = () => {
    setAdjustments({
      brightness: 105,
      contrast: 115,
      saturation: 120,
      sharpen: 80
    });
  };

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    setError(null);
    try {
      const { file, url } = await getProcessedImage(
        src,
        croppedAreaPixels,
        rotation,
        adjustments
      );
      onSave(file, url);
    } catch (err: any) {
      console.error("Error al procesar imagen:", err);
      setError(err.message || "Error desconocido al procesar la imagen.");
    } finally {
      setProcessing(false);
    }
  };

  // Cálculo de la transformación para la previsualización estricta en la fase 2
  const previewStyles = useMemo(() => {
    if (!croppedAreaPixels) return {};

    const containerWidth = 600;
    const scale = containerWidth / croppedAreaPixels.width;

    return {
      transform: `translate3d(${-croppedAreaPixels.x * scale}px, ${-croppedAreaPixels.y * scale}px, 0) scale(${scale}) rotate(${rotation}deg)`,
      transformOrigin: 'top left',
      filter: `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`,
      transition: 'filter 0.2s ease'
    };
  }, [croppedAreaPixels, rotation, adjustments]);

  const renderCropView = () => (
    <div className="flex-1 relative bg-black flex flex-col">
      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-slate-900">
            <AlertCircle size={48} className="text-red-500 mb-4" />
            <h4 className="text-white font-black uppercase tracking-tight mb-2">Error de Acceso Externo</h4>
            <p className="text-slate-400 text-sm max-w-md whitespace-pre-wrap">{error}</p>
            <button onClick={onCancel} className="mt-6 px-6 py-2 bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-all">Cerrar Editor</button>
          </div>
        ) : (
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={16 / 9}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            minZoom={1}
            restrictPosition={true}
          />
        )}
      </div>
      {!error && (
        <div className="bg-slate-900 border-t border-slate-800 p-4">
          <div className="max-w-3xl mx-auto flex gap-6">
            <div className="flex items-center gap-3 flex-1">
              <ZoomIn className="w-4 h-4 text-blue-400" />
              <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
            </div>
            <div className="flex items-center gap-3 flex-1">
              <RotateCcw className="w-4 h-4 text-purple-400" />
              <input type="range" value={rotation} min={0} max={360} step={1} onChange={(e) => setRotation(Number(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderEditView = () => (
    <div className="flex-1 relative bg-slate-900 flex flex-col md:flex-row overflow-hidden">
      <div className="flex-1 relative bg-black/50 flex items-center justify-center p-8 overflow-hidden">
        {/* Contenedor de Previsualización Estricta 16:9 */}
        <div className="relative shadow-2xl overflow-hidden bg-black ring-1 ring-white/10" style={{ width: '600px', height: '338px' }}>
          <img
            src={src}
            alt="Preview"
            className="absolute top-0 left-0 max-w-none will-change-transform"
            style={previewStyles}
          />
          {processing && <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-4 z-50">
            <Loader2 className="animate-spin text-blue-500" size={48} />
            <span className="text-white text-[10px] font-black uppercase tracking-widest">Masterizando 1080p...</span>
          </div>}
        </div>
      </div>

      <div className="w-full md:w-80 bg-slate-800 border-l border-slate-700 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between">
          <h4 className="text-white font-bold flex items-center gap-2"><Sliders className="w-4 h-4 text-blue-400" /> Ajustes</h4>
          <div className="flex gap-2">
            <button onClick={handleAutoEnhance} className="p-1.5 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all" title="Auto-Mejorar"><Sparkles size={14} /></button>
            <button onClick={() => setAdjustments({ brightness: 100, contrast: 100, saturation: 100, sharpen: 50 })} className="p-1.5 bg-slate-700 text-slate-400 rounded-lg hover:text-white transition-colors"><Undo2 size={14} /></button>
          </div>
        </div>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-300"><span><Sun className="inline w-3 h-3 mr-1" /> Brillo</span><span>{adjustments.brightness}%</span></div>
            <input type="range" min={50} max={150} value={adjustments.brightness} onChange={(e) => setAdjustments({ ...adjustments, brightness: Number(e.target.value) })} className="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-white" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-300"><span><Contrast className="inline w-3 h-3 mr-1" /> Contraste</span><span>{adjustments.contrast}%</span></div>
            <input type="range" min={50} max={150} value={adjustments.contrast} onChange={(e) => setAdjustments({ ...adjustments, contrast: Number(e.target.value) })} className="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-white" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-300"><span><Droplets className="inline w-3 h-3 mr-1" /> Saturación</span><span>{adjustments.saturation}%</span></div>
            <input type="range" min={0} max={200} value={adjustments.saturation} onChange={(e) => setAdjustments({ ...adjustments, saturation: Number(e.target.value) })} className="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-white" />
          </div>
          <div className="space-y-2 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <div className="flex justify-between text-xs text-blue-200 font-bold"><span><Triangle className="inline w-3 h-3 mr-1" /> Enfoque HD (1080p)</span><span>{adjustments.sharpen}%</span></div>
            <input type="range" min={0} max={100} value={adjustments.sharpen} onChange={(e) => setAdjustments({ ...adjustments, sharpen: Number(e.target.value) })} className="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-400" />
          </div>
          <div className="p-3 bg-slate-900/50 rounded-xl border border-white/5 text-[9px] text-slate-500 leading-tight">
            <Zap size={10} className="inline mr-1 text-amber-500" /> El encuadre seleccionado en el paso anterior se mantiene bloqueado para garantizar consistencia.
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col animate-fadeIn">
      <div className="flex items-center justify-between px-6 py-3 bg-slate-900 text-white border-b border-slate-800 shrink-0">
        <h3 className="text-lg font-bold flex items-center gap-2">
          {mode === 'CROP' ? <Crop className="w-5 h-5 text-blue-400" /> : <Sliders className="w-5 h-5 text-purple-400" />}
          {mode === 'CROP' ? '1. Recortar (16:9 HD)' : '2. Calidad Extra 1080p'}
        </h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
      </div>
      {mode === 'CROP' ? renderCropView() : renderEditView()}
      {!error && (
        <div className="bg-slate-900 border-t border-slate-800 p-4 shrink-0">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            {mode === 'EDIT' ? (
              <button onClick={() => setMode('CROP')} className="text-slate-400 hover:text-white text-sm font-medium flex items-center gap-2 transition-colors"><Undo2 size={16} /> Modificar Recorte</button>
            ) : <div />}
            <div className="flex items-center gap-3">
              {mode === 'CROP' ? (
                <button onClick={() => setMode('EDIT')} className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg transition-all">Siguiente Paso <ArrowRight size={16} /></button>
              ) : (
                <button onClick={handleSave} disabled={processing} className="flex items-center gap-2 px-8 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-bold shadow-lg transition-all disabled:opacity-50">
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {processing ? 'Exportando...' : 'Exportar a Saladillo Vivo'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
