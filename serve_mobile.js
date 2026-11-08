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

const ACTIVE_ISR_STREAMS = {};

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

    // High Speed ISR Camera Frame Relay
    if (req.url.startsWith('/api/isr_frame')) {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    const feedId = data.feedId || 'feed-body-1';
                    ACTIVE_ISR_STREAMS[feedId] = {
                        image: data.image,
                        telemetry: data.telemetry || {},
                        ts: Date.now()
                    };
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'ok' }));
                } catch (e) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: e.message }));
                }
            });
            return;
        } else if (req.method === 'GET') {
            const parsedUrl = new URL(req.url, 'http://localhost');
            const feedId = parsedUrl.searchParams.get('feedId') || 'feed-body-1';
            const stream = ACTIVE_ISR_STREAMS[feedId];

            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store'
            });

            if (stream && (Date.now() - stream.ts < 4000)) {
                res.end(JSON.stringify({
                    active: true,
                    feedId: feedId,
                    image: stream.image,
                    telemetry: stream.telemetry,
                    ageMs: Date.now() - stream.ts
                }));
            } else {
                res.end(JSON.stringify({ active: false }));
            }
            return;
        }
    }

    if (req.url.startsWith('/api/isr_active')) {
        const now = Date.now();
        const activeList = [];
        for (const [fid, s] of Object.entries(ACTIVE_ISR_STREAMS)) {
            if (now - s.ts < 4000) {
                activeList.push({ feedId: fid, telemetry: s.telemetry, ageMs: now - s.ts });
            }
        }
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store' });
        res.end(JSON.stringify({ activeStreams: activeList }));
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
