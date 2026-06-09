import { supabase } from './supabase';
import { Banner } from '../types';

function mapDbToBanner(dbObj: any): Banner {
  return {
    id: dbObj.id,
    created_at: dbObj.created_at,
    title: dbObj.titulo || dbObj.title, // Fallback en caso de que las columnas cambien
    image_url: dbObj.imagen_url || dbObj.image_url,
    link_url: dbObj.enlace || dbObj.link_url,
    is_active: dbObj.activo !== undefined ? dbObj.activo : dbObj.is_active,
    position: dbObj.orden !== undefined ? dbObj.orden : dbObj.position
  };
}

export const bannerService = {
  async getBanners(): Promise<Banner[]> {
    const { data, error } = await supabase
      .from('anuncios')
      .select('*')
      .order('orden', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[BannerService] Error fetch:', error);
      throw error;
    }
    
    return (data || []).map(mapDbToBanner);
  },

  async getActiveBanners(): Promise<Banner[]> {
    const { data, error } = await supabase
      .from('anuncios')
      .select('*')
      .eq('activo', true)
      .order('orden', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[BannerService] Error fetch active:', error);
      throw error;
    }
    return (data || []).map(mapDbToBanner);
  },

  async createBanner(banner: Omit<Banner, 'id' | 'created_at'>): Promise<Banner> {
    const dbBanner = {
      titulo: banner.title,
      imagen_url: banner.image_url,
      enlace: banner.link_url,
      activo: banner.is_active,
      orden: banner.position
    };

    const { data, error } = await supabase
      .from('anuncios')
      .insert([dbBanner])
      .select()
      .single();

    if (error) throw error;
    return mapDbToBanner(data);
  },

  async updateBanner(id: string, updates: Partial<Banner>): Promise<Banner> {
    const dbUpdates: any = {};
    if (updates.title !== undefined) dbUpdates.titulo = updates.title;
    if (updates.image_url !== undefined) dbUpdates.imagen_url = updates.image_url;
    if (updates.link_url !== undefined) dbUpdates.enlace = updates.link_url;
    if (updates.is_active !== undefined) dbUpdates.activo = updates.is_active;
    if (updates.position !== undefined) dbUpdates.orden = updates.position;

    const { data, error } = await supabase
      .from('anuncios')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapDbToBanner(data);
  },

  async deleteBanner(id: string): Promise<void> {
    const { error } = await supabase
      .from('anuncios')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
