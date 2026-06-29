import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { CheckCircle2, RefreshCw, Loader2, Send } from 'lucide-react';
import { Article } from '../types';

export const HermesControl: React.FC = () => {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [textoActual, setTextoActual] = useState('');

  const fetchPendingArticle = async () => {
    setLoading(true);
    try {
      // Buscar la primera noticia pendiente desde Supabase directamente
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching article:', error);
      }
      
      if (data) {
        setArticle(data);
        setTextoActual(data.body_voice_tuning || data.text || '');
      } else {
        setArticle(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingArticle();
  }, []);

  const handleAprobar = async () => {
    if (!article) return;
    setProcessing(true);
    try {
      const res = await fetch('http://192.168.2.193:3000/api/procesar-noticia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idNoticia: article.id,
          accion: 'APROBAR',
          textoActual: textoActual
        })
      });

      const data = await res.json();
      if (data.success) {
        fetchPendingArticle();
      } else {
        alert('Error al aprobar: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión con la API en el puerto 3000');
    } finally {
      setProcessing(false);
    }
  };

  const handleCorregir = async () => {
    if (!article || !feedback.trim()) {
      alert('Por favor escribe un feedback para Hermes.');
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch('http://192.168.2.193:3000/api/procesar-noticia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idNoticia: article.id,
          accion: 'CORREGIR',
          feedback: feedback,
          textoCrudo: article.text,
          textoActual: textoActual
        })
      });

      const data = await res.json();
      if (data.success && data.nuevoTexto) {
        setTextoActual(data.nuevoTexto);
        setFeedback('');
      } else {
        alert('Error al corregir: ' + (data.error || 'Desconocido'));
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión con la API en el puerto 3000');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4 p-4">
        <h1 style={{ fontSize: '24px', color: '#00ff00', textAlign: 'center' }}>¡Panel de Control de Hermes Activo!</h1>
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 p-6 text-center space-y-4">
        <h1 style={{ fontSize: '24px', color: '#00ff00' }}>¡Panel de Control de Hermes Activo!</h1>
        <CheckCircle2 className="w-16 h-16 text-green-500" />
        <h2 className="text-xl font-black uppercase tracking-widest text-white">Todo al día</h2>
        <p className="text-sm">No hay noticias pendientes de revisión en la cola de Hermes.</p>
        <button 
          onClick={fetchPendingArticle}
          className="mt-8 px-6 py-3 bg-slate-800 text-white rounded-full font-bold uppercase text-xs tracking-widest hover:bg-slate-700 transition-all flex items-center gap-2"
        >
          <RefreshCw size={14} /> Refrescar
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-24 font-sans">
      {/* HEADER FIXO */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 p-4 shadow-lg">
        <h1 className="text-center font-black text-xl uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
          ¡Panel de Control de Hermes Activo!
        </h1>
        <p className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Saladillo Vivo</p>
      </header>

      <main className="p-4 space-y-6 max-w-lg mx-auto">
        
        {/* TARJETA DE NOTICIA */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
          {article.image_url && (
            <div className="w-full h-48 relative">
              <img src={article.image_url} alt="Portada" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
            </div>
          )}
          
          <div className="p-5 space-y-4 relative -mt-8">
            <span className="inline-block px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-[9px] font-black uppercase tracking-widest backdrop-blur-sm">
              Pendiente de revisión
            </span>
            <h2 className="text-xl font-black text-white leading-tight line-clamp-3">
              {article.title}
            </h2>

            {/* Visualizador de Texto (Actualizable) */}
            <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 shadow-inner">
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium break-words">
                {textoActual}
              </p>
            </div>

            {/* Audio Preview (si existiera previamente, aunque suele generarse post-aprobación) */}
            {article.audio_url && (
              <div className="mt-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Audio Generado Previo</p>
                <audio controls className="w-full h-10" src={article.audio_url}></audio>
              </div>
            )}
          </div>
        </div>

        {/* CONTROLES */}
        <div className="space-y-4">
          <button 
            onClick={handleAprobar}
            disabled={processing}
            className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 transition-all active:scale-95"
          >
            {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            Aprobar y Publicar
          </button>

          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-lg space-y-3">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">
              ¿Algo que corregir?
            </label>
            <textarea 
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Ej: Hacé el texto más corto y cambiá el tono..."
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-4 text-sm resize-none h-24 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-700"
            ></textarea>
            <button 
              onClick={handleCorregir}
              disabled={processing || !feedback.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest disabled:opacity-50 transition-all active:scale-95"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Mandar a corregir a Hermes
            </button>
          </div>
        </div>

      </main>
    </div>
  );
};
