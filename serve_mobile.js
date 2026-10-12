const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const HTTP_PORT = 8080;
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

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

function handleRequest(req, res) {
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

// 1. HTTP Server
const httpServer = http.createServer(handleRequest);
httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
    const localIp = getLocalIp();
    console.log('========================================================');
    console.log('[*] TACTICAL RANGE CARD V8 - LOCAL MOBILE TEST SERVER');
    console.log('========================================================');
    console.log(`[*] PC HTTP:         http://localhost:${HTTP_PORT}`);
    console.log(`[*] Phone HTTP:      http://${localIp}:${HTTP_PORT}`);

    // 2. HTTPS Server (Enables Phone Hardware GPS & Sensors)
    const certPath = path.join(ROOT, 'cert.pem');
    const keyPath = path.join(ROOT, 'key.pem');
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        try {
            const httpsOptions = {
                key: fs.readFileSync(keyPath),
                cert: fs.readFileSync(certPath)
            };
            const httpsServer = https.createServer(httpsOptions, handleRequest);
            httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
                console.log('--------------------------------------------------------');
                console.log(`[*] Phone HTTPS (GPS): https://${localIp}:${HTTPS_PORT}`);
                console.log('[*] (Use HTTPS on phone for REAL hardware GPS accuracy!)');
                console.log('========================================================');
            });
        } catch (e) {
            console.warn('Could not start HTTPS server:', e.message);
        }
    } else {
        console.log('========================================================');
    }
});
