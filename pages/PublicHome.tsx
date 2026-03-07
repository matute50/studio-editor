
import React, { useEffect, useState } from 'react';
import { Article } from '../types';
import { newsService } from '../services/newsService';
import { Clock, ChevronRight, Newspaper, Calendar, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const LinkTyped = Link as any;


export const PublicHome: React.FC = () => {
  const [sections, setSections] = useState<{
    featured: Article | null;
    secondary: Article[];
    tertiary: Article[];
    standard: Article[];
  }>({
    featured: null,
    secondary: [],
    tertiary: [],
    standard: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const data = await newsService.getArticles();
      if (data) {
        organizeNews(data);
      }
    } catch (err) {
      console.error("Error fetching news:", err);
    } finally {
      setLoading(false);
    }
  };

  const organizeNews = (allArticles: Article[]) => {
    const featured = allArticles.find(a => a.featureStatus === 'featured') || null;
    const secondary = allArticles.filter(a => a.featureStatus === 'secondary' && a.id !== featured?.id);
    const tertiary = allArticles.filter(a => a.featureStatus === 'tertiary' && a.id !== featured?.id);
    const usedIds = new Set([featured?.id, ...secondary.map(s => s.id), ...tertiary.map(t => t.id)]);
    const standard = allArticles.filter(a => !usedIds.has(a.id));
    setSections({ featured, secondary, tertiary, standard });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Saladillo Vivo • Cargando Portada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pb-20 font-sans animate-fadeIn overflow-y-auto h-full">
      {/* HEADER INSTITUCIONAL */}
      <header className="bg-slate-950 text-white py-8 px-8 border-b border-white/5 shadow-2xl sticky top-0 z-40 backdrop-blur-md bg-slate-950/95">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="space-y-1">
            <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">Saladillo Vivo</h1>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.5em] ml-1">Portal de Noticias</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div> En Vivo</span>
            </div>
            <LinkTyped to="/admin" className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border border-white/10">
              <ArrowLeft size={14} /> Volver al Panel
            </LinkTyped>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-20">

        {/* NIVEL 1: NOTICIA DESTACADA (HERO) */}
        {sections.featured && (
          <section className="animate-slideUp">
            <LinkTyped to={`/noticia/${sections.featured.id}`} className="group relative block aspect-[21/9] overflow-hidden rounded-[3rem] shadow-2xl border border-slate-100">
              <img
                src={sections.featured.image_url}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                alt={sections.featured.title}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
              <div className="absolute bottom-0 left-0 p-8 md:p-16 w-full md:w-3/4">
                <span className="bg-red-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 inline-block shadow-lg">
                  Noticia de Tapa
                </span>
                <h2 className="text-4xl md:text-6xl font-black text-white leading-[0.9] tracking-tighter uppercase mb-6 group-hover:translate-x-2 transition-transform duration-500">
                  {sections.featured.title.replace('|', '\n')}
                </h2>
                <div className="flex items-center gap-6 text-slate-400">
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-tight">
                    <Calendar size={16} /> {new Date(sections.featured.created_at).toLocaleDateString()}
                  </span>
                  <div className="h-4 w-px bg-white/20"></div>
                  <span className="text-xs font-bold uppercase tracking-tight">Saladillo • Edición Central</span>
                </div>
              </div>
            </LinkTyped>
          </section>
        )}

        {/* NIVEL 2: NOTICIAS SECUNDARIAS (GRID 2) */}
        {sections.secondary.length > 0 && (
          <section>
            <div className="flex items-center gap-4 mb-10">
              <h3 className="text-xs font-black uppercase tracking-[0.4em] text-slate-400">Relevantes</h3>
              <div className="h-px bg-slate-100 flex-1"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {sections.secondary.map(article => (
                <LinkTyped key={article.id} to={`/noticia/${article.id}`} className="group space-y-6">
                  <div className="aspect-video overflow-hidden rounded-[2.5rem] bg-slate-100 shadow-xl ring-1 ring-slate-100">
                    <img
                      src={article.image_url}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      alt={article.title}
                    />
                  </div>
                  <div className="px-2 space-y-4">
                    <h4 className="text-3xl font-black text-slate-900 leading-none uppercase tracking-tighter group-hover:text-blue-600 transition-colors">
                      {article.title}
                    </h4>
                    <p className="text-slate-500 text-sm font-medium line-clamp-2 leading-relaxed">
                      {article.text}
                    </p>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Clock size={12} /> {new Date(article.created_at).toLocaleDateString()}
                      </span>
                      <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all">
                        <ChevronRight size={20} />
                      </div>
                    </div>
                  </div>
                </LinkTyped>
              ))}
            </div>
          </section>
        )}

        {/* NIVEL 3: NOTICIAS TERCIARIAS (GRID 3) */}
        {sections.tertiary.length > 0 && (
          <section className="bg-slate-50 -mx-4 px-4 py-20 sm:-mx-8 sm:px-8 rounded-[4rem] border border-slate-100 shadow-inner">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-4 mb-12">
                <h3 className="text-xs font-black uppercase tracking-[0.4em] text-slate-400">Mosaico</h3>
                <div className="h-px bg-slate-200 flex-1"></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                {sections.tertiary.map(article => (
                  <LinkTyped key={article.id} to={`/noticia/${article.id}`} className="group flex flex-col bg-white p-5 rounded-[2.5rem] border border-slate-100 hover:shadow-2xl transition-all duration-500">
                    <div className="aspect-[4/3] overflow-hidden rounded-[2rem] mb-6">
                      <img src={article.image_url} className="w-full h-full object-cover transition-all duration-700" alt={article.title} />
                    </div>
                    <div className="flex-1 flex flex-col">
                      <h5 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-tight mb-4 group-hover:text-blue-600 transition-colors">
                        {article.title}
                      </h5>
                      <div className="mt-auto pt-6 flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-50">
                        <span className="flex items-center gap-2"><Clock size={12} /> {new Date(article.created_at).toLocaleDateString()}</span>
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </LinkTyped>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* NIVEL 4: ARCHIVO ESTÁNDAR (GRID 4) */}
        <section>
          <div className="flex items-center gap-4 mb-10">
            <h3 className="text-xs font-black uppercase tracking-[0.4em] text-slate-400">Más Noticias</h3>
            <div className="h-px bg-slate-100 flex-1"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {sections.standard.map(article => (
              <LinkTyped key={article.id} to={`/noticia/${article.id}`} className="group space-y-4">
                <div className="aspect-square overflow-hidden rounded-[1.5rem] bg-slate-100 border border-slate-200">
                  <img src={article.image_url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={article.title} />
                </div>
                <div>
                  <h6 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {article.title}
                  </h6>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-2 tracking-widest">
                    {new Date(article.created_at).toLocaleDateString()}
                  </p>
                </div>
              </LinkTyped>
            ))}
          </div>

          {sections.standard.length === 0 && !sections.featured && (
            <div className="text-center py-20 opacity-30 flex flex-col items-center gap-4">
              <Newspaper size={40} />
              <p className="text-[10px] font-black uppercase tracking-[0.5em]">No hay contenido disponible</p>
            </div>
          )}
        </section>
      </main>

      {/* FOOTER PUBLICO */}
      <footer className="bg-slate-950 text-white mt-20 py-20 px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="text-center md:text-left space-y-2">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Saladillo Vivo</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.5em]">La información en movimiento</p>
          </div>
          <div className="flex flex-wrap justify-center gap-10 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
            <LinkTyped to="/admin" className="hover:text-white transition-colors">Redacción</LinkTyped>
            <a href="#" className="hover:text-white transition-colors">Nosotros</a>
            <a href="#" className="hover:text-white transition-colors">Publicidad</a>
            <a href="#" className="hover:text-white transition-colors">Contacto</a>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-10 border-t border-white/5 text-center text-[9px] font-bold text-slate-600 uppercase tracking-widest">
          Saladillo Vivo © 2025 • Desarrollado con IA Master Studio
        </div>
      </footer>
    </div>
  );
};
