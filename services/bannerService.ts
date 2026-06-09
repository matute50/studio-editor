import { supabase } from './supabase';
import { Banner } from '../types';

export const bannerService = {
  async getBanners(): Promise<Banner[]> {
    const { data, error } = await supabase
      .from('anuncios')
      .select('*')
      .order('position', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[BannerService] Error fetch:', error);
      throw error;
    }
    
    return data || [];
  },

  async getActiveBanners(): Promise<Banner[]> {
    const { data, error } = await supabase
      .from('anuncios')
      .select('*')
      .eq('is_active', true)
      .order('position', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[BannerService] Error fetch active:', error);
      throw error;
    }
    return data || [];
  },

  async createBanner(banner: Omit<Banner, 'id' | 'created_at'>): Promise<Banner> {
    const { data, error } = await supabase
      .from('anuncios')
      .insert([banner])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateBanner(id: string, updates: Partial<Banner>): Promise<Banner> {
    const { data, error } = await supabase
      .from('anuncios')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteBanner(id: string): Promise<void> {
    const { error } = await supabase
      .from('anuncios')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
