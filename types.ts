
import { LucideIcon } from 'lucide-react';

export interface SidebarItem {
  title: string;
  path: string;
  icon: LucideIcon;
  description: string;
}

export interface DashboardStat {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
}

export enum UserRole {
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface Article {
  id: number;
  created_at: string;
  updated_at: string;
  title: string;
  text: string;
  image_url: string; // Imagen Destacada
  images_urls: string[] | null; // Galería (JSONB)
  featureStatus: 'featured' | 'secondary' | 'tertiary' | null;
  url_slide?: string | null;
  audio_url?: string | null;
  thumbnail_url?: string | null;
  animation_duration?: number | null;
  body_voice_tuning?: string | null;
}

export interface VideoAsset {
  id?: string;
  youtube_id: string;
  title: string;
  thumbnail_url: string;
  duration_iso: string;
  duration_sec: number;
  category: string;
  tags?: string[];
  created_at?: string;
}

/**
 * SALADILLO VIVO - TICKER MESSAGE SCHEMA
 */
export interface TickerMessage {
  id: number;
  created_at: string;
  text: string;
  priority: 'info' | 'alert' | 'urgent';
  active: boolean;
}

/**
 * SALADILLO VIVO - SCENE CONFIGURATION SCHEMA
 */
export interface SlideSceneConfig {
  meta: {
    id: string;
    createdAt: string;
    version: string;
  };
  content: {
    title: string;
    body: string;
    imageUrl: string;
    audioUrl?: string;
  };
  composition: {
    layoutVariant: 'classic-bottom-left' | 'full-center' | 'sidebar-right';
    overlayStyle: 'gradient-dark' | 'solid-red' | 'none';
    fontScale: number;
  };
  animation: {
    duration: number;
    kenBurnsStart: number;
    kenBurnsEnd: number;
    panDirection: 'x-left' | 'x-right' | 'y-up' | 'y-down' | 'static';
  };
}
