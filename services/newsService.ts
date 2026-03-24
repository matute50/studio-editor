import { supabase } from './supabase';
import { Article } from '../types';

const API_SECRET = 'sv-cron-2024';

export const newsService = {
    /**
     * Obtiene todos los artículos optimizados para el Dashboard.
     */
    async getArticles(): Promise<Article[]> {
        try {
            const { data, error } = await supabase
                .from('articles')
                .select('id, title, created_at, image_url, audio_url, url_slide, featureStatus, text, super_resumen')
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching articles:", error.message);
                throw error;
            }
            return data as Article[];
        } catch (err) {
            console.error("Critical error in newsService.getArticles:", err);
            return [];
        }
    },

    /**
     * Obtiene un artículo por su ID.
     */
    async getArticleById(id: string): Promise<Article | null> {
        try {
            const { data, error } = await supabase
                .from('articles')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                console.error(`Error fetching article ${id}:`, error.message);
                throw error;
            }
            return data as Article;
        } catch (err) {
            console.error(`Critical error in newsService.getArticleById(${id}):`, err);
            return null;
        }
    },

    /**
     * Obtiene métricas rápidas de producción.
     */
    async getArticleStats() {
        try {
            const { data, error } = await supabase
                .from('articles')
                .select('audio_url, url_slide');

            if (error) throw error;

            return {
                total: data.length,
                pendingAudio: data.filter(a => !a.audio_url).length,
                pendingSlide: data.filter(a => !a.url_slide).length,
                ready: data.filter(a => a.audio_url && a.url_slide).length
            };
        } catch (err) {
            console.error("Error fetching article stats:", err);
            return { total: 0, pendingAudio: 0, pendingSlide: 0, ready: 0 };
        }
    },
    /**
     * Obtiene noticias crudas con estado 'nuevo'.
     */
    async getRawArticles(): Promise<any[]> {
        try {
            const { data, error } = await supabase
                .from('articles_crudos')
                .select('*')
                .eq('status', 'nuevo')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error("Error fetching raw articles:", err);
            return [];
        }
    },

    /**
     * Actualiza el estado de una noticia cruda.
     */
    async updateRawArticleStatus(id: string, status: 'procesado' | 'eliminado') {
        try {
            const { error } = await supabase
                .from('articles_crudos')
                .update({ status })
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (err) {
            console.error("Error updating raw article status:", err);
            return false;
        }
    },

    /**
     * Dispara el scraping manual llamando al endpoint de la API.
     */
    async runManualScraping() {
        try {
            const response = await fetch('/api/scrape-news', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secret: API_SECRET })
            });
            if (!response.ok) throw new Error('Falló el scraper');
            return await response.json();
        } catch (err) {
            console.error("Error in manual scraping:", err);
            throw err;
        }
    },

    /**
     * Limpia la tabla de artículos crudos.
     */
    async clearRawArticles() {
        try {
            const response = await fetch('/api/news-pipeline?action=truncate', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secret: API_SECRET })
            });
            if (!response.ok) throw new Error('Falló el truncado');
            return await response.json();
        } catch (err) {
            console.error("Error truncating raw articles:", err);
            throw err;
        }
    },

    /**
     * Transforma un artículo crudo específico (por ID) hacia la tabla `articles`.
     * Marca el crudo como 'procesado' al finalizar.
     */
    async transformRawArticle(id: string) {
        try {
            const response = await fetch('/api/transform-articles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [id], secret: API_SECRET })
            });
            if (!response.ok) throw new Error('Falló la transformación');
            return await response.json();
        } catch (err) {
            console.error(`Error transformando artículo ${id}:`, err);
            throw err;
        }
    },

    /**
     * Transforma TODOS los artículos crudos con estado 'nuevo'.
     * Ideal para ejecutar después del scraping.
     */
    async transformAllRawArticles() {
        try {
            const response = await fetch('/api/transform-articles', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secret: API_SECRET })
            });
            if (!response.ok) throw new Error('Falló la transformación masiva');
            return await response.json();
        } catch (err) {
            console.error("Error en transformación masiva:", err);
            throw err;
        }
    },

    /**
     * Pipeline scraping → transformación.
     */
    async scrapeAndTransform() {
        try {
            const scrapeResult = await this.runManualScraping();
            console.log('[Pipeline] Scraping completado:', scrapeResult);
            const transformResult = await this.transformAllRawArticles();
            console.log('[Pipeline] Transformación completada:', transformResult);
            return { scrape: scrapeResult, transform: transformResult };
        } catch (err) {
            console.error("Error en pipeline scrape+transform:", err);
            throw err;
        }
    },

    /**
     * Genera el super_resumen estilo Ara para un artículo específico.
     */
    async generateResumenForArticle(id: number) {
        try {
            const response = await fetch('/api/generate-resumen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [id], secret: API_SECRET })
            });
            if (!response.ok) throw new Error('Falló la generación de resumen');
            return await response.json();
        } catch (err) {
            console.error(`Error generando resumen para artículo ${id}:`, err);
            throw err;
        }
    },

    /**
     * Genera super_resumen para todos los artículos que aún no tienen uno.
     */
    async generateAllResumenes() {
        try {
            const response = await fetch('/api/generate-resumen', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secret: API_SECRET })
            });
            if (!response.ok) throw new Error('Falló la generación masiva de resúmenes');
            return await response.json();
        } catch (err) {
            console.error("Error generando resúmenes masivos:", err);
            throw err;
        }
    },


    /**
     * Genera el audio TTS para un artículo específico (usa su super_resumen).
     */
    async generateAudioForArticle(id: number) {
        try {
            const response = await fetch('/api/generate-audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [id], secret: API_SECRET })
            });
            if (!response.ok) throw new Error('Falló la generación de audio');
            return await response.json();
        } catch (err) {
            console.error(`Error generando audio para artículo ${id}:`, err);
            throw err;
        }
    },

    /**
     * Genera audio TTS para todos los artículos con super_resumen sin audio_url.
     */
    async generateAllAudios() {
        try {
            const response = await fetch('/api/generate-audio', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secret: API_SECRET })
            });
            if (!response.ok) throw new Error('Falló la generación masiva de audios');
            return await response.json();
        } catch (err) {
            console.error("Error generando audios masivos:", err);
            throw err;
        }
    },

    /**
     * Genera el slide HTML para un artículo específico.
     */
    async generateSlideForArticle(id: number) {
        try {
            const response = await fetch('/api/generate-slide', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [id], secret: API_SECRET })
            });
            if (!response.ok) throw new Error('Falló la generación del slide');
            return await response.json();
        } catch (err) {
            console.error(`Error generando slide para artículo ${id}:`, err);
            throw err;
        }
    },

    /**
     * Genera slides para todos los artículos con audio pero sin url_slide.
     */
    async generateAllSlides() {
        try {
            const response = await fetch('/api/generate-slide', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secret: API_SECRET })
            });
            if (!response.ok) throw new Error('Falló la generación masiva de slides');
            return await response.json();
        } catch (err) {
            console.error("Error generando slides masivos:", err);
            throw err;
        }
    },

    /**
     * Pipeline completo de 5 fases:
     * Fase 1: Scraping          → articles_crudos
     * Fase 2: Transformación    → articles (slug, meta, descripción)
     * Fase 3: Super Resumen IA  → articles.super_resumen (estilo Ara)
     * Fase 4: Audio TTS         → articles.audio_url (Google TTS → R2)
     * Fase 5: Slide Visual      → articles.url_slide (HTML GSAP → R2)
     */
    async fullPipeline() {
        try {
            console.log('[Pipeline] 🚀 Iniciando pipeline completo de 5 fases...');

            const scrapeResult = await this.runManualScraping();
            console.log('[Pipeline] ✅ Fase 1 — Scraping:', scrapeResult);

            const transformResult = await this.transformAllRawArticles();
            console.log('[Pipeline] ✅ Fase 2 — Transformación:', transformResult);

            const resumenResult = await this.generateAllResumenes();
            console.log('[Pipeline] ✅ Fase 3 — Super Resumen IA:', resumenResult);

            const audioResult = await this.generateAllAudios();
            console.log('[Pipeline] ✅ Fase 4 — Audio TTS:', audioResult);

            const slideResult = await this.generateAllSlides();
            console.log('[Pipeline] ✅ Fase 5 — Slides Visuales:', slideResult);

            return {
                phase1_scraping: scrapeResult,
                phase2_transform: transformResult,
                phase3_resumen: resumenResult,
                phase4_audio: audioResult,
                phase5_slides: slideResult
            };
        } catch (err) {
            console.error("Error en pipeline completo:", err);
            throw err;
        }
    }
};
