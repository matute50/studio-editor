
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL required' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
       return res.status(200).json({ isLive: false, status: response.status });
    }

    const contentType = response.headers.get('content-type') || '';
    
    // 1. YouTube Check
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const html = await response.text();
      // La prueba de oro en YouTube es el campo "isLive":true dentro del JSON ytInitialPlayerResponse
      // Los VOD (grabaciones) tienen "isLive":false o carecen del campo.
      const hasIsLiveTrue = html.includes('"isLive":true'); 
      const hasIsLiveNow = html.includes('"isLiveNow":true');
      const hasLiveBadge = html.includes('"label":"LIVE"');
      
      // IMPORTANTE: NO usamos isLiveBroadcast porque persiste en las grabaciones!
      const isLive = hasIsLiveTrue || hasIsLiveNow || (hasLiveBadge && !html.includes('"isLive":false'));
      return res.status(200).json({ isLive, type: 'youtube', isLiveTag: hasIsLiveTrue, isLiveNow: hasIsLiveNow });
    }

    // 2. HLS Check (.m3u8)
    if (url.includes('.m3u8') || contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('x-mpegURL')) {
      const playlist = await response.text();
      // Un stream en vivo suele carecer de #EXT-X-ENDLIST
      const isLive = !playlist.includes('#EXT-X-ENDLIST');
      return res.status(200).json({ isLive, type: 'hls' });
    }

    // Default: Assume live
    return res.status(200).json({ isLive: true, type: 'unknown' });

  } catch (err: any) {
    return res.status(200).json({ isLive: false, error: err.message });
  }
}
