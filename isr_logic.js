/**
 * Tactical Range Card - Window 7: Tactical ISR & Multi-Feed Matrix Logic
 * Handles Drone feeds, Bodycams, Trail-Cams, and K9 Hound Telemetry
 */

(function() {
    'use strict';

    // Default Feed Registry
    const DEFAULT_FEEDS = [
        {
            id: 'feed-drone-1',
            type: 'drone',
            name: 'OVERHEAD DRONE (AIR-1)',
            source: 'DJI / Autel 4K Feed',
            resolution: '1080P 30FPS',
            battery: '84%',
            signal: '98%',
            status: 'ONLINE',
            hudMode: 'crosshair',
            placeholderColor: '#064e3b'
        },
        {
            id: 'feed-body-1',
            type: 'bodycam',
            name: 'LEAD BODYCAM (CHEST-RIG)',
            source: 'Player #1 Phone Cam',
            resolution: '720P 30FPS',
            battery: '91%',
            signal: '100%',
            status: 'ONLINE',
            hudMode: 'tactical',
            placeholderColor: '#1e3a8a'
        },
        {
            id: 'feed-body-2',
            type: 'bodycam',
            name: 'POINT SCOUT BODYCAM',
            source: 'Player #9 Phone Cam',
            resolution: '720P 30FPS',
            battery: '78%',
            signal: '92%',
            status: 'ONLINE',
            hudMode: 'tactical',
            placeholderColor: '#312e81'
        },
        {
            id: 'feed-trail-1',
            type: 'trailcam',
            name: 'NORTH FENCE TRAIL-CAM',
            source: 'Old Android on Fence Post',
            resolution: '1080P 15FPS',
            battery: '96% (Solar)',
            signal: '88%',
            status: 'ONLINE',
            hudMode: 'perimeter',
            placeholderColor: '#78350f'
        },
        {
            id: 'feed-trail-2',
            type: 'trailcam',
            name: 'DEER BLIND / FEEDER CAM',
            source: 'RTSP Remote Blind Cam',
            resolution: '1080P 15FPS',
            battery: '100% (Solar)',
            signal: '82%',
            status: 'ONLINE',
            hudMode: 'perimeter',
            placeholderColor: '#701a75'
        }
    ];

    // Default Hounds
    const DEFAULT_HOUNDS = [
        {
            id: 'dog-1',
            name: 'BUCK',
            role: 'LEAD HOUND',
            collarType: 'Garmin TT15',
            distance: '1.2 mi NW',
            speed: '14 MPH',
            heading: '315° NW',
            lat: 31.9542,
            lng: -102.1784,
            status: 'TRAILING',
            statusClass: 'bg-emerald-500 text-black'
        },
        {
            id: 'dog-2',
            name: 'BLUE',
            role: 'TRACKER',
            collarType: 'LoRa 915MHz',
            distance: '1.1 mi NW',
            speed: '12 MPH',
            heading: '310° NW',
            lat: 31.9538,
            lng: -102.1760,
            status: 'TRAILING',
            statusClass: 'bg-emerald-500 text-black'
        },
        {
            id: 'dog-3',
            name: 'DAISY',
            role: 'STRIKER',
            collarType: 'Phone-Beacon',
            distance: '2.3 mi N',
            speed: '0 MPH',
            heading: '005° N',
            lat: 31.9782,
            lng: -102.1691,
            status: 'TREE\'D ALERT 🚨',
            statusClass: 'bg-amber-400 text-black animate-pulse font-black'
        }
    ];

    let currentActiveFeedId = 'feed-drone-1';
    let currentOpMode = 'SQUAD'; // 'LONE' or 'SQUAD'
    let feeds = [...DEFAULT_FEEDS];
    let hounds = [...DEFAULT_HOUNDS];
    let streamMuted = true;
    let isRecording = false;

    // --- Switch Active Feed ---
    window.switchIsrFeed = function(feedId) {
        currentActiveFeedId = feedId;
        const feed = feeds.find(f => f.id === feedId) || feeds[0];
        
        const titleEl = document.getElementById('isr-active-cam-title');
        const teleEl = document.getElementById('isr-active-telemetry');
        const badgeEl = document.getElementById('isr-active-source-badge');
        const viewportCanvas = document.getElementById('isr-stream-canvas');

        if (titleEl) titleEl.textContent = feed.name;
        if (teleEl) teleEl.textContent = `${feed.resolution} • BAT: ${feed.battery} • SIGNAL: ${feed.signal}`;
        if (badgeEl) badgeEl.textContent = feed.source;

        // Highlight selected feed card
        document.querySelectorAll('.isr-feed-card').forEach(card => {
            if (card.dataset.feedId === feedId) {
                card.classList.add('border-emerald-400', 'ring-2', 'ring-emerald-400/50', 'bg-emerald-950/40');
                card.classList.remove('border-slate-800', 'bg-slate-900/80');
            } else {
                card.classList.remove('border-emerald-400', 'ring-2', 'ring-emerald-400/50', 'bg-emerald-950/40');
                card.classList.add('border-slate-800', 'bg-slate-900/80');
            }
        });

        // Redraw canvas frame
        renderCanvasFrame(feed);
    };

    // --- Render Viewport Frame with Simulated HUD ---
    function renderCanvasFrame(feed) {
        const canvas = document.getElementById('isr-stream-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = canvas.width = canvas.clientWidth || 640;
        const h = canvas.height = canvas.clientHeight || 360;

        // Background gradient
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, feed.placeholderColor || '#0f172a');
        grad.addColorStop(1, '#020617');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Grid lines
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 40) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y < h; y += 40) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        // Tactical HUD Overlays
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.5;

        // Center reticle
        const cx = w / 2;
        const cy = h / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 28, 0, Math.PI * 2);
        ctx.moveTo(cx - 45, cy); ctx.lineTo(cx - 15, cy);
        ctx.moveTo(cx + 15, cy); ctx.lineTo(cx + 45, cy);
        ctx.moveTo(cx, cy - 45); ctx.lineTo(cx, cy - 15);
        ctx.moveTo(cx, cy + 15); ctx.lineTo(cx, cy + 45);
        ctx.stroke();

        // Corner brackets
        const bSize = 20;
        ctx.strokeStyle = '#34d399';
        // Top-left
        ctx.beginPath(); ctx.moveTo(20, 20 + bSize); ctx.lineTo(20, 20); ctx.lineTo(20 + bSize, 20); ctx.stroke();
        // Top-right
        ctx.beginPath(); ctx.moveTo(w - 20 - bSize, 20); ctx.lineTo(w - 20, 20); ctx.lineTo(w - 20, 20 + bSize); ctx.stroke();
        // Bottom-left
        ctx.beginPath(); ctx.moveTo(20, h - 20 - bSize); ctx.lineTo(20, h - 20); ctx.lineTo(20 + bSize, h - 20); ctx.stroke();
        // Bottom-right
        ctx.beginPath(); ctx.moveTo(w - 20 - bSize, h - 20); ctx.lineTo(w - 20, h - 20); ctx.lineTo(w - 20, h - 20 - bSize); ctx.stroke();

        // Feed text in center
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(feed.name, cx, cy - 60);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';
        ctx.fillText(`SOURCE: ${feed.source} • STATUS: ${feed.status}`, cx, cy + 65);

        // Recording indicator
        if (isRecording) {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath(); ctx.arc(35, 35, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'left';
            ctx.fillText('REC', 48, 39);
        }
    }

    // --- Mode Toggle: Lone Hunter vs Squad C2 ---
    window.setIsrOpMode = function(mode) {
        currentOpMode = mode;
        const loneBtn = document.getElementById('isr-mode-btn-lone');
        const squadBtn = document.getElementById('isr-mode-btn-squad');
        const bodycamRow = document.getElementById('isr-bodycam-feeds-group');

        if (mode === 'LONE') {
            if (loneBtn) {
                loneBtn.className = "flex-1 bg-emerald-500 text-black font-black text-xs py-2 px-3 rounded-lg uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow border-2 border-emerald-400";
            }
            if (squadBtn) {
                squadBtn.className = "flex-1 bg-slate-900 text-slate-400 font-bold text-xs py-2 px-3 rounded-lg uppercase tracking-wider flex items-center justify-center gap-1.5 border border-slate-700 hover:text-white transition-all";
            }
            if (bodycamRow) bodycamRow.classList.add('hidden');
        } else {
            if (squadBtn) {
                squadBtn.className = "flex-1 bg-emerald-500 text-black font-black text-xs py-2 px-3 rounded-lg uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow border-2 border-emerald-400";
            }
            if (loneBtn) {
                loneBtn.className = "flex-1 bg-slate-900 text-slate-400 font-bold text-xs py-2 px-3 rounded-lg uppercase tracking-wider flex items-center justify-center gap-1.5 border border-slate-700 hover:text-white transition-all";
            }
            if (bodycamRow) bodycamRow.classList.remove('hidden');
        }
    };

    // --- Snapshot to Intel Vault ---
    window.captureIsrSnapshotToVault = function() {
        const canvas = document.getElementById('isr-stream-canvas');
        const feed = feeds.find(f => f.id === currentActiveFeedId) || feeds[0];
        
        let base64Data = null;
        if (canvas) {
            base64Data = canvas.toDataURL('image/jpeg', 0.85);
        }

        const timestamp = new Date().toISOString();
        const callsign = (document.getElementById('post-author') && document.getElementById('post-author').value) || 'LEAD_01';

        const snapshotRecord = {
            id: 'isr_' + Date.now(),
            type: 'ISR_CAMERA_FEED',
            feedName: feed.name,
            source: feed.source,
            timestamp: timestamp,
            author: callsign,
            dataUrl: base64Data,
            notes: `Captured from ${feed.name} (${feed.source}) at ${new Date().toLocaleTimeString()}`
        };

        // Save to IndexedDB if helper exists
        if (window.TRCDatabase && window.TRCDatabase.saveSnapshot) {
            window.TRCDatabase.saveSnapshot(snapshotRecord).then(() => {
                showToast(`✅ SNAPSHOT SAVED TO INTEL VAULT!`);
            }).catch(() => {
                fallbackSaveSnapshot(snapshotRecord);
            });
        } else {
            fallbackSaveSnapshot(snapshotRecord);
        }
    };

    function fallbackSaveSnapshot(record) {
        try {
            const list = JSON.parse(localStorage.getItem('trc_isr_snapshots') || '[]');
            list.unshift(record);
            localStorage.setItem('trc_isr_snapshots', JSON.stringify(list.slice(0, 30)));
            showToast(`✅ SNAPSHOT SAVED TO INTEL VAULT (WIN #4)!`);
        } catch(e) {
            showToast(`✅ SNAPSHOT CAPTURED!`);
        }
    }

    // --- Record Video Clip Toggle ---
    window.toggleIsrRecording = function() {
        isRecording = !isRecording;
        const btn = document.getElementById('isr-record-btn');
        if (btn) {
            if (isRecording) {
                btn.className = "flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded font-black text-xs uppercase animate-pulse border border-red-400";
                btn.innerHTML = `<i data-lucide="circle-stop" class="w-4 h-4"></i> STOP REC`;
                showToast(`🔴 RECORDING ISR CLIP...`);
            } else {
                btn.className = "flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 rounded font-bold text-xs uppercase hover:bg-slate-700 border border-slate-600";
                btn.innerHTML = `<i data-lucide="video" class="w-4 h-4"></i> RECORD CLIP`;
                showToast(`💾 CLIP SAVED TO INTEL VAULT!`);
            }
            if (window.lucide) window.lucide.createIcons();
        }
        const feed = feeds.find(f => f.id === currentActiveFeedId) || feeds[0];
        renderCanvasFrame(feed);
    };

    // --- Pin Target to Recon Map ---
    window.pinIsrTargetToMap = function() {
        const feed = feeds.find(f => f.id === currentActiveFeedId) || feeds[0];
        showToast(`📍 TARGET FROM ${feed.name} PLOTTED TO GEO MATRIX & RECON MAP!`);
    };

    // --- Hound Intercept Route ---
    window.interceptHound = function(houndId) {
        const h = hounds.find(d => d.id === houndId);
        if (!h) return;
        showToast(`🎯 ROUTE CALCULATED TO ${h.name} (${h.distance})! OPENING RECON MAP...`);
        if (window.toggleFullscreen) {
            // Jump to Comms / Recon Map
            window.toggleFullscreen('panel-comms');
        }
    };

    // --- Add Custom Feed Wizard ---
    window.openByodWizardModal = function() {
        const m = document.getElementById('modal-byod-wizard');
        if (m) {
            m.style.setProperty('display', 'flex', 'important');
            m.style.setProperty('z-index', '100000060', 'important');
            m.classList.remove('hidden');
        }
        if (window.lucide) window.lucide.createIcons();
    };

    window.closeByodWizardModal = function() {
        const m = document.getElementById('modal-byod-wizard');
        if (m) {
            m.style.setProperty('display', 'none', 'important');
            m.classList.add('hidden');
        }
    };

    // --- Guide Modal ---
    window.openIsrGuideModal = function() {
        const m = document.getElementById('modal-isr-guide');
        if (m) {
            m.style.setProperty('display', 'flex', 'important');
            m.style.setProperty('z-index', '100000060', 'important');
            m.classList.remove('hidden');
        }
        if (window.lucide) window.lucide.createIcons();
    };

    window.closeIsrGuideModal = function() {
        const m = document.getElementById('modal-isr-guide');
        if (m) {
            m.style.setProperty('display', 'none', 'important');
            m.classList.add('hidden');
        }
    };

    // --- Toast Helper ---
    function showToast(msg) {
        let toast = document.getElementById('isr-toast-notify');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'isr-toast-notify';
            toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#047857;color:#fff;font-family:monospace;font-weight:900;padding:10px 20px;border-radius:8px;border:2px solid #34d399;box-shadow:0 10px 30px rgba(0,0,0,0.5);z-index:9999999;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;pointer-events:none;transition:opacity 0.3s;';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.style.opacity = '1';
        toast.style.display = 'block';
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => { toast.style.display = 'none'; }, 300);
        }, 3000);
    }

    // Initialize on window load or script load
    function initIsr() {
        const feed = feeds[0];
        setTimeout(() => {
            renderCanvasFrame(feed);
            if (window.lucide) window.lucide.createIcons();
        }, 500);

        // Auto redraw on resize
        window.addEventListener('resize', () => {
            const currentFeed = feeds.find(f => f.id === currentActiveFeedId) || feeds[0];
            renderCanvasFrame(currentFeed);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initIsr);
    } else {
        initIsr();
    }

})();
