import 'dotenv/config'; // Requires dotenv to read .env.local if not loaded automatically. 
// Actually, for a quick script, I'll just read the file manually or assume the user runs it with env.
// But since I can't rely on `dotenv` being installed in `devDependencies` (it implies `vite` project), I'll parse .env.local manually.

import fs from 'fs';
import path from 'path';
import https from 'https';

// Manual .env parser for the specific file structure we saw
const envPath = path.resolve(process.cwd(), '.env.local');
let YOUTUBE_KEY = '';
let SUPABASE_URL = '';
let SUPABASE_KEY = '';

if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
        if (line.startsWith('VITE_YOUTUBE_API_KEY=')) {
            YOUTUBE_KEY = line.split('=')[1].replace(/"/g, '').trim();
        }
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
            SUPABASE_URL = line.split('=')[1].replace(/"/g, '').trim();
        }
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
            SUPABASE_KEY = line.split('=')[1].replace(/"/g, '').trim();
        }
    }
}

console.log(`[CHECK] API Key found: ${YOUTUBE_KEY ? 'YES (...' + YOUTUBE_KEY.slice(-4) + ')' : 'NO'}`);
console.log(`[CHECK] Supabase found: ${SUPABASE_URL ? 'YES' : 'NO'}`);

// 1. Verify YouTube
const testVideoId = 'dQw4w9WgXcQ'; // Rick
const ytUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${testVideoId}&key=${YOUTUBE_KEY}`;

function checkYouTube() {
    return new Promise((resolve) => {
        https.get(ytUrl, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const json = JSON.parse(data);
                    if (json.items && json.items.length > 0) {
                        console.log('[SUCCESS] YouTube API Connection Verified. Title:', json.items[0].snippet.title);
                        resolve(true);
                    } else {
                        console.log('[WARNING] YouTube API returned 200 but no items.');
                        resolve(false);
                    }
                } else {
                    console.log(`[ERROR] YouTube API Failed: ${res.statusCode} - ${data}`);
                    resolve(false);
                }
            });
        }).on('error', err => {
            console.log('[ERROR] YouTube Request Error:', err);
            resolve(false);
        });
    });
}

// 2. Verify Supabase (via Fetch if node 18+)
// We'll use a simple REST call to the table
async function checkSupabase() {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.log('[ERROR] Missing Supabase Config');
        return;
    }

    // table: videos_external
    const url = `${SUPABASE_URL}/rest/v1/videos_external?select=count&limit=1`;
    try {
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });

        if (response.ok) {
            console.log('[SUCCESS] Supabase Connection Verified (Table `videos_external` is accessible).');
        } else {
            const text = await response.text();
            console.log(`[ERROR] Supabase Failed: ${response.status} - ${text}`);
            if (response.status === 404) console.log('       Maybe the table does not exist?');
        }
    } catch (err) {
        console.log('[ERROR] Supabase Fetch Error:', err);
    }
}

(async () => {
    console.log('--- STARTING VERIFICATION ---');
    await checkYouTube();
    if (typeof fetch !== 'undefined') {
        await checkSupabase();
    } else {
        console.log('[SKIP] Supabase check skipped (fetch not available in this node env).');
    }
    console.log('--- DONE ---');
})();
