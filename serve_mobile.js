const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const HTTP_PORTS = [8080, 8000];
const HTTPS_PORT = 8443;
const ROOT = __dirname;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.webm': 'video/webm',
    '.txt': 'text/plain; charset=utf-8'
};

// Mission-partitioned active ISR streams: { [missionId]: { [feedId]: { image, telemetry, ts } } }
const ACTIVE_ISR_STREAMS = {};

function getMissionStreams(missionId) {
    const mid = (missionId || 'ALPHA-1').toString().toUpperCase().trim();
    if (!ACTIVE_ISR_STREAMS[mid]) ACTIVE_ISR_STREAMS[mid] = {};
    return ACTIVE_ISR_STREAMS[mid];
}

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    // Prefer 192.168.12.x or physical WiFi
    let fallback = '127.0.0.1';
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                if (iface.address.startsWith('192.168.12.')) {
                    return iface.address;
                }
                if (!iface.address.startsWith('192.168.56.')) {
                    fallback = iface.address;
                }
            }
        }
    }
    return fallback;
}

function handleRequest(req, res) {
    // Universal CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // High Speed ISR Camera Frame Relay (Mission-Partitioned)
    if (req.url.startsWith('/api/isr_frame')) {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    const missionId = (data.missionId || 'ALPHA-1').toUpperCase().trim();
                    const feedId = data.feedId || 'feed-body-1';
                    const missionStreams = getMissionStreams(missionId);
                    missionStreams[feedId] = {
                        image: data.image,
                        telemetry: data.telemetry || {},
                        ts: Date.now()
                    };
                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ status: 'ok', missionId, feedId }));
                } catch (e) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: e.message }));
                }
            });
            return;
        } else if (req.method === 'GET') {
            const parsedUrl = new URL(req.url, 'http://localhost');
            const missionId = (parsedUrl.searchParams.get('missionId') || 'ALPHA-1').toUpperCase().trim();
            const feedId = parsedUrl.searchParams.get('feedId') || 'feed-body-1';
            const missionStreams = getMissionStreams(missionId);
            const stream = missionStreams[feedId];

            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store',
                'Access-Control-Allow-Origin': '*'
            });

            if (stream && (Date.now() - stream.ts < 8000)) {
                res.end(JSON.stringify({
                    active: true,
                    missionId: missionId,
                    feedId: feedId,
                    image: stream.image,
                    telemetry: stream.telemetry,
                    ageMs: Date.now() - stream.ts
                }));
            } else {
                res.end(JSON.stringify({ active: false, missionId, feedId }));
            }
            return;
        }
    }

    // Stop / Purge Active ISR Stream in Mission
    if (req.url.startsWith('/api/isr_stop')) {
        let feedId = null;
        let missionId = 'ALPHA-1';
        try {
            const parsedUrl = new URL(req.url, 'http://localhost');
            feedId = parsedUrl.searchParams.get('feedId');
            if (parsedUrl.searchParams.get('missionId')) missionId = parsedUrl.searchParams.get('missionId').toUpperCase().trim();
        } catch(e) {}

        const clearFeed = (mId, fId) => {
            const missionStreams = getMissionStreams(mId);
            if (fId && missionStreams[fId]) {
                delete missionStreams[fId];
                console.log(`[ISR] [${mId}] Feed stopped: ${fId}`);
            } else if (!fId) {
                for (const k of Object.keys(missionStreams)) delete missionStreams[k];
                console.log(`[ISR] [${mId}] All active feeds cleared`);
            }
        };

        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try {
                    if (body) {
                        const data = JSON.parse(body);
                        if (data.feedId) feedId = data.feedId;
                        if (data.missionId) missionId = data.missionId.toUpperCase().trim();
                    }
                } catch(e) {}
                clearFeed(missionId, feedId);
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ status: 'stopped', missionId, feedId }));
            });
            return;
        } else {
            clearFeed(missionId, feedId);
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ status: 'stopped', missionId, feedId }));
            return;
        }
    }

    // List all active streams in the requested Mission Room
    if (req.url.startsWith('/api/isr_active')) {
        let missionId = 'ALPHA-1';
        try {
            const parsedUrl = new URL(req.url, 'http://localhost');
            if (parsedUrl.searchParams.get('missionId')) missionId = parsedUrl.searchParams.get('missionId').toUpperCase().trim();
        } catch(e) {}

        const missionStreams = getMissionStreams(missionId);
        const now = Date.now();
        const activeList = [];
        for (const [fid, s] of Object.entries(missionStreams)) {
            if (now - s.ts < 8000) {
                activeList.push({ feedId: fid, telemetry: s.telemetry, ageMs: now - s.ts });
            }
        }
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ missionId, activeStreams: activeList }));
        return;
    }

    let reqPath = decodeURI(req.url.split('?')[0]);
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

    const safePath = path.normalize(path.join(ROOT, reqPath));
    if (!safePath.startsWith(ROOT)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('403 Forbidden');
        return;
    }

    fs.stat(safePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }

        const ext = path.extname(safePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        });

        const stream = fs.createReadStream(safePath);
        stream.pipe(res);
    });
}

function startServers() {
    const localIp = getLocalIp();

    console.log('========================================================');
    console.log('[*] TACTICAL RANGE CARD V8 - MOBILE & ISR RELAY SERVER');
    console.log('========================================================');

    HTTP_PORTS.forEach(port => {
        const s = http.createServer(handleRequest);
        s.on('error', (err) => {
            console.warn(`[!] HTTP Port ${port} warning: ${err.message}`);
        });
        s.listen(port, '0.0.0.0', () => {
            console.log(`[*] HTTP Active:     http://localhost:${port} & http://${localIp}:${port}`);
        });
    });

    // HTTPS Server for mobile camera & GPS permissions
    const certPath = path.join(ROOT, 'cert.pem');
    const keyPath = path.join(ROOT, 'key.pem');
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        try {
            const httpsOptions = {
                key: fs.readFileSync(keyPath),
                cert: fs.readFileSync(certPath)
            };
            const httpsServer = https.createServer(httpsOptions, handleRequest);
            httpsServer.on('error', (e) => console.warn(`[!] HTTPS Port ${HTTPS_PORT} warning: ${e.message}`));
            httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
                console.log(`[*] HTTPS (Camera):  https://localhost:${HTTPS_PORT} & https://${localIp}:${HTTPS_PORT}`);
                console.log('========================================================');
            });
        } catch (e) {
            console.warn('Could not start HTTPS server:', e.message);
        }
    }
}

startServers();
