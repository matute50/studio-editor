import { supabase } from './supabase';

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const YOUTUBE_BASE_URL = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeVideoReq {
    id: string;
    snippet: {
        title: string;
        description: string;
        thumbnails: {
            default: { url: string };
            medium: { url: string };
            high: { url: string };
        };
        channelTitle: string;
        publishedAt: string;
    };
    contentDetails: {
        duration: string; // ISO 8601 (PT3M20S)
    };
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

export const searchYouTubeVideoInfo = async (videoIdOrUrl: string): Promise<VideoAsset | null> => {
    if (!YOUTUBE_API_KEY) throw new Error("VITE_YOUTUBE_API_KEY no configurada");

    let videoId = videoIdOrUrl;
    // Basic URL parser
    if (videoIdOrUrl.includes('youtube.com') || videoIdOrUrl.includes('youtu.be')) {
        const url = new URL(videoIdOrUrl);
        if (url.searchParams.has('v')) {
            videoId = url.searchParams.get('v')!;
        } else {
            videoId = url.pathname.split('/').pop()!;
        }
    }

    try {
        const res = await fetch(`${YOUTUBE_BASE_URL}/videos?part=snippet,contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`);
        const data = await res.json();

        if (!data.items || data.items.length === 0) return null;

        const item: YouTubeVideoReq = data.items[0];

        return {
            youtube_id: item.id,
            title: item.snippet.title,
            thumbnail_url: item.snippet.thumbnails.high.url,
            duration_iso: item.contentDetails.duration,
            duration_sec: parseDuration(item.contentDetails.duration),
            category: 'General'
        };

    } catch (err) {
        console.error("YouTube API Error:", err);
        throw err;
    }
};

export const saveVideoToLibrary = async (video: VideoAsset) => {
    const { data, error } = await supabase
        .from('videos_external')
        .insert([video])
        .select();

    if (error) throw error;
    return data;
};

// Helper: Convert PT1H2M10S to seconds
const parseDuration = (duration: string): number => {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;

    const hours = (match[1] ? parseInt(match[1]) : 0);
    const minutes = (match[2] ? parseInt(match[2]) : 0);
    const seconds = (match[3] ? parseInt(match[3]) : 0);

    return (hours * 3600) + (minutes * 60) + seconds;
};
