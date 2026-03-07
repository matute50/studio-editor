import { supabase } from './supabase';
import { Article } from '../types';

export const newsService = {
    /**
     * Obtiene todos los artículos optimizados para el Dashboard.
     */
    async getArticles(): Promise<Article[]> {
        try {
            const { data, error } = await supabase
                .from('articles')
                .select('id, title, created_at, image_url, audio_url, url_slide, featureStatus, text')
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
    }
};
