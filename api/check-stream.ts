
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
      timeout: 5000,
    } as any);

    if (!response.ok) {
       return res.status(200).json({ isLive: false, status: response.status, msg: 'Error de respuesta' });
    }

    const contentType = response.headers.get('content-type') || '';
    
    // 1. YouTube Check
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const html = await response.text();
      const isLive = html.includes('isLiveBroadcast') && !html.includes('"isLiveBroadcast":false');
      return res.status(200).json({ isLive, type: 'youtube' });
    }

    // 2. HLS Check (.m3u8)
    if (url.includes('.m3u8') || contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('x-mpegURL')) {
      const playlist = await response.text();
      // Un stream en vivo suele tener #EXT-X-PLAYLIST-TYPE:EVENT o carecer de #EXT-X-ENDLIST
      // Si tiene #EXT-X-ENDLIST, es un VOD (grabación)
      const isLive = !playlist.includes('#EXT-X-ENDLIST');
      return res.status(200).json({ isLive, type: 'hls' });
    }

    // Default: Check content type or assumed live
    return res.status(200).json({ isLive: true, type: 'unknown' });

  } catch (err: any) {
    return res.status(200).json({ isLive: false, error: err.message });
  }
}
