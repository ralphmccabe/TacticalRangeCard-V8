import http.server
import socketserver
import mimetypes
import socket
import json
import time
import sys
import threading
from urllib.parse import urlparse, parse_qs

PORT = 8080

# MIME Types
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('application/json', '.json')
mimetypes.add_type('image/svg+xml', '.svg')

ACTIVE_ISR_STREAMS = {}

class TacticalServerHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Prevent caching of dynamic or app files during field testing
        if self.path.endswith('.html') or self.path.endswith('.js') or self.path.endswith('.css'):
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        if self.path.startswith('/api/isr_frame'):
            length = int(self.headers.get('content-length', 0))
            if length == 0:
                self.send_response(400)
                self.end_headers()
                return

            body = self.rfile.read(length)
            try:
                data = json.loads(body.decode('utf-8'))
                feed_id = data.get('feedId', 'feed-body-1')
                ACTIVE_ISR_STREAMS[feed_id] = {
                    'image': data.get('image'),
                    'telemetry': data.get('telemetry', {}),
                    'ts': time.time()
                }
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"status":"ok"}')
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
            return
        
        super().do_POST()

    def do_GET(self):
        if self.path.startswith('/api/isr_frame'):
            query = parse_qs(urlparse(self.path).query)
            feed_id = query.get('feedId', ['feed-body-1'])[0]
            stream = ACTIVE_ISR_STREAMS.get(feed_id)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'no-cache, no-store')
            self.end_headers()

            # Active if updated within the last 4 seconds
            if stream and (time.time() - stream['ts'] < 4.0):
                resp = {
                    'active': True,
                    'feedId': feed_id,
                    'image': stream['image'],
                    'telemetry': stream['telemetry'],
                    'ageMs': int((time.time() - stream['ts']) * 1000)
                }
                self.wfile.write(json.dumps(resp).encode('utf-8'))
            else:
                self.wfile.write(b'{"active":false}')
            return

        if self.path.startswith('/api/isr_active'):
            now = time.time()
            active_list = []
            for fid, s in ACTIVE_ISR_STREAMS.items():
                if now - s['ts'] < 4.0:
                    active_list.append({
                        'feedId': fid,
                        'telemetry': s.get('telemetry', {}),
                        'ageMs': int((now - s['ts']) * 1000)
                    })
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'no-cache, no-store')
            self.end_headers()
            self.wfile.write(json.dumps({'activeStreams': active_list}).encode('utf-8'))
            return

        super().do_GET()

class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True
    allow_reuse_address = True

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        PORT = int(sys.argv[1])

    local_ip = get_local_ip()
    print("=" * 60)
    print("  TACTICAL RANGE CARD - HIGH SPEED ISR RELAY SERVER")
    print("=" * 60)
    print(f"  Desktop PC:   http://localhost:{PORT}")
    print(f"  Mobile Phone: http://{local_ip}:{PORT}")
    print("=" * 60)
    print("  * Multi-threaded HTTP/1.1 Engine")
    print("  * High-Speed Real-time Camera & Telemetry Relay (/api/isr_frame)")
    print("=" * 60)

    try:
        with ThreadedTCPServer(("0.0.0.0", PORT), TacticalServerHandler) as httpd:
            httpd.serve_forever()
    except OSError as e:
        if "address already in use" in str(e).lower() or e.errno == 10048:
            print(f"[!] Port {PORT} in use, trying port 8000...")
            PORT = 8000
            print(f"  Desktop PC:   http://localhost:{PORT}")
            print(f"  Mobile Phone: http://{local_ip}:{PORT}")
            with ThreadedTCPServer(("0.0.0.0", PORT), TacticalServerHandler) as httpd:
                httpd.serve_forever()
        else:
            raise e
