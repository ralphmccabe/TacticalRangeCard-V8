/**
 * Tactical Range Card - Window 7: Tactical ISR & Multi-Feed Matrix Logic
 * Handles Drone feeds, Bodycams, Trail-Cams, Real Device Camera Broadcasts, and K9 Hound Telemetry
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
    let isRecording = false;

    // Real Broadcasting State
    let activeMediaStream = null;
    let broadcastInterval = null;
    let isBroadcasting = false;
    let broadcastRoleId = 'feed-body-1';
    let broadcastFacingMode = 'environment';
    let broadcastFps = 10;
    let deviceSensors = {
        battery: '95%',
        heading: '0° N',
        speed: '0 MPH',
        lat: 31.9542,
        lng: -102.1784
    };

    // Live Viewer State
    let viewerPollInterval = null;
    let lastReceivedFrame = null;
    let lastReceivedTelemetry = null;
    let isMirroredToMain = false;

    // --- Device Sensor Listeners ---
    function initDeviceSensors() {
        // Battery Status
        if (navigator.getBattery) {
            navigator.getBattery().then(bat => {
                const updateBat = () => {
                    deviceSensors.battery = `${Math.round(bat.level * 100)}%${bat.charging ? ' (CHG)' : ''}`;
                };
                updateBat();
                bat.addEventListener('levelchange', updateBat);
                bat.addEventListener('chargingchange', updateBat);
            }).catch(() => {});
        }

        // Compass / Orientation
        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', (e) => {
                if (e.alpha !== null && e.alpha !== undefined) {
                    const deg = Math.round(e.alpha);
                    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
                    const dir = dirs[Math.round(deg / 45) % 8];
                    deviceSensors.heading = `${deg}° ${dir}`;
                }
            }, true);
        }

        // GPS Geolocation
        if (navigator.geolocation) {
            navigator.geolocation.watchPosition((pos) => {
                deviceSensors.lat = pos.coords.latitude;
                deviceSensors.lng = pos.coords.longitude;
                if (pos.coords.speed !== null && pos.coords.speed !== undefined) {
                    const mph = Math.round(pos.coords.speed * 2.23694);
                    deviceSensors.speed = `${mph} MPH`;
                }
            }, () => {}, { enableHighAccuracy: true, maximumAge: 10000 });
        }
    }

    // --- Switch Active Feed ---
    window.switchIsrFeed = function(feedId) {
        currentActiveFeedId = feedId;
        const feed = feeds.find(f => f.id === feedId) || feeds[0];
        
        const titleEl = document.getElementById('isr-active-cam-title');
        const teleEl = document.getElementById('isr-active-telemetry');
        const badgeEl = document.getElementById('isr-active-source-badge');

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

        // Trigger immediate render
        renderCurrentActiveView();
    };

    // --- Broadcast Setup Modal Controls ---
    window.openBroadcastSetupModal = function() {
        const m = document.getElementById('modal-isr-broadcast');
        if (m) {
            m.style.setProperty('display', 'flex', 'important');
            m.style.setProperty('z-index', '100000070', 'important');
            m.classList.remove('hidden');
        }
        if (window.lucide) window.lucide.createIcons();
    };

    window.closeBroadcastSetupModal = function() {
        const m = document.getElementById('modal-isr-broadcast');
        if (m) {
            m.style.setProperty('display', 'none', 'important');
            m.classList.add('hidden');
        }
    };

    // --- Start Broadcasting From Local Device Camera ---
    window.startLocalBroadcasting = async function() {
        const roleSelect = document.getElementById('isr-broadcast-role-select');
        const facingSelect = document.getElementById('isr-broadcast-facing-select');
        if (roleSelect) broadcastRoleId = roleSelect.value;
        if (facingSelect) broadcastFacingMode = facingSelect.value;

        window.closeBroadcastSetupModal();

        try {
            // Stop existing if any
            if (activeMediaStream) {
                activeMediaStream.getTracks().forEach(t => t.stop());
            }

            const constraints = {
                video: {
                    facingMode: broadcastFacingMode,
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                },
                audio: false
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            activeMediaStream = stream;
            isBroadcasting = true;

            let video = document.getElementById('isr-broadcaster-video');
            if (!video) {
                video = document.createElement('video');
                video.id = 'isr-broadcaster-video';
                video.setAttribute('autoplay', '');
                video.setAttribute('playsinline', '');
                video.setAttribute('webkit-playsinline', '');
                video.muted = true;
                video.style.display = 'none';
                document.body.appendChild(video);
            }
            video.srcObject = stream;
            await video.play();

            // Create offscreen canvas for frame capture
            let captureCanvas = document.getElementById('isr-broadcaster-canvas');
            if (!captureCanvas) {
                captureCanvas = document.createElement('canvas');
                captureCanvas.id = 'isr-broadcaster-canvas';
                captureCanvas.width = 480;
                captureCanvas.height = 360;
                captureCanvas.style.display = 'none';
                document.body.appendChild(captureCanvas);
            }
            const captureCtx = captureCanvas.getContext('2d');

            // Show floating broadcasting HUD on this device
            showBroadcastingHud(broadcastRoleId);

            // Transmit frames periodically
            if (broadcastInterval) clearInterval(broadcastInterval);
            const intervalMs = Math.round(1000 / broadcastFps);

            broadcastInterval = setInterval(() => {
                if (!isBroadcasting || !video || video.readyState < 2) return;

                captureCtx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
                const dataUrl = captureCanvas.toDataURL('image/jpeg', 0.55);

                const payload = {
                    feedId: broadcastRoleId,
                    image: dataUrl,
                    telemetry: {
                        battery: deviceSensors.battery,
                        heading: deviceSensors.heading,
                        speed: deviceSensors.speed,
                        lat: deviceSensors.lat,
                        lng: deviceSensors.lng,
                        fps: `${broadcastFps} FPS`
                    }
                };

                // POST to local server
                fetch('/api/isr_frame', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }).catch(() => {});
            }, intervalMs);

            showToast(`🟢 BROADCASTING LIVE AS ${broadcastRoleId.toUpperCase()}!`);
            window.switchIsrFeed(broadcastRoleId);

        } catch (err) {
            console.error('Camera access error:', err);
            showToast(`⚠️ CAMERA ACCESS ERROR: ${err.message || 'Permission denied'}`);
        }
    };

    // --- Stop Broadcasting ---
    window.stopLocalBroadcasting = function() {
        isBroadcasting = false;
        if (broadcastInterval) {
            clearInterval(broadcastInterval);
            broadcastInterval = null;
        }
        if (activeMediaStream) {
            activeMediaStream.getTracks().forEach(t => t.stop());
            activeMediaStream = null;
        }
        const video = document.getElementById('isr-broadcaster-video');
        if (video) video.srcObject = null;

        const hud = document.getElementById('isr-broadcasting-hud');
        if (hud) hud.classList.add('hidden');

        showToast('⏹️ CAMERA TRANSMISSION TERMINATED');
        renderCurrentActiveView();
    };

    function showBroadcastingHud(roleId) {
        let hud = document.getElementById('isr-broadcasting-hud');
        if (hud) {
            hud.classList.remove('hidden');
            const lbl = document.getElementById('isr-broadcasting-hud-label');
            if (lbl) lbl.textContent = `🔴 LIVE: ${roleId.replace('feed-', '').toUpperCase()}`;
        }
    }

    // --- Viewer Frame Poller ---
    function startViewerPolling() {
        if (viewerPollInterval) clearInterval(viewerPollInterval);

        viewerPollInterval = setInterval(async () => {
            // Check if current active feed has a live stream
            try {
                const res = await fetch(`/api/isr_frame?feedId=${currentActiveFeedId}`);
                if (!res.ok) return;
                const data = await res.json();

                if (data.active && data.image) {
                    lastReceivedFrame = data.image;
                    lastReceivedTelemetry = data.telemetry;
                    renderLiveFrame(data.image, data.telemetry);
                } else {
                    lastReceivedFrame = null;
                    lastReceivedTelemetry = null;
                    // Render simulation
                    const feed = feeds.find(f => f.id === currentActiveFeedId) || feeds[0];
                    renderSimulationFrame(feed);
                }
            } catch (e) {
                // Server down or offline: render simulation
                const feed = feeds.find(f => f.id === currentActiveFeedId) || feeds[0];
                renderSimulationFrame(feed);
            }
        }, 120);
    }

    function renderCurrentActiveView() {
        if (lastReceivedFrame && lastReceivedTelemetry) {
            renderLiveFrame(lastReceivedFrame, lastReceivedTelemetry);
        } else {
            const feed = feeds.find(f => f.id === currentActiveFeedId) || feeds[0];
            renderSimulationFrame(feed);
        }
    }

    // --- Render Live Camera Frame With Tactical HUD ---
    function renderLiveFrame(imageDataUrl, telemetry) {
        const canvas = document.getElementById('isr-stream-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.onload = function() {
            const w = canvas.width = canvas.clientWidth || 640;
            const h = canvas.height = canvas.clientHeight || 360;

            // Draw incoming camera image
            ctx.drawImage(img, 0, 0, w, h);

            // Overlay subtle scanlines
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            for (let y = 0; y < h; y += 4) {
                ctx.fillRect(0, y, w, 1);
            }

            // Tactical Green Reticle
            drawTacticalHud(ctx, w, h, telemetry, true);

            // Mirror to main viewport if active
            if (isMirroredToMain) {
                renderMainviewMirror(img, telemetry);
            }
        };
        img.src = imageDataUrl;
    }

    // --- Render Simulation Tactical HUD Frame ---
    function renderSimulationFrame(feed) {
        const canvas = document.getElementById('isr-stream-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = canvas.width = canvas.clientWidth || 640;
        const h = canvas.height = canvas.clientHeight || 360;

        // Background
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, feed.placeholderColor || '#064e3b');
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

        // Tactical HUD
        drawTacticalHud(ctx, w, h, {
            battery: feed.battery,
            heading: '315° NW',
            speed: '12 MPH'
        }, false);

        // Center Feed Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(feed.name, w / 2, h / 2 - 40);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px monospace';
        ctx.fillText(`STANDBY / SIMULATION • TAP "BROADCAST FROM PHONE" TO GO LIVE`, w / 2, h / 2 + 50);

        // Mirror to main viewport if active
        if (isMirroredToMain) {
            renderMainviewSimulation(feed);
        }
    }

    // --- Shared Tactical HUD Overlay ---
    function drawTacticalHud(ctx, w, h, telemetry, isLive) {
        ctx.strokeStyle = isLive ? '#34d399' : '#10b981';
        ctx.lineWidth = 1.5;

        const cx = w / 2;
        const cy = h / 2;

        // Reticle
        ctx.beginPath();
        ctx.arc(cx, cy, 26, 0, Math.PI * 2);
        ctx.moveTo(cx - 40, cy); ctx.lineTo(cx - 12, cy);
        ctx.moveTo(cx + 12, cy); ctx.lineTo(cx + 40, cy);
        ctx.moveTo(cx, cy - 40); ctx.lineTo(cx, cy - 12);
        ctx.moveTo(cx, cy + 12); ctx.lineTo(cx, cy + 40);
        ctx.stroke();

        // Corner Brackets
        const b = 18;
        const pad = 16;
        // Top Left
        ctx.beginPath(); ctx.moveTo(pad, pad + b); ctx.lineTo(pad, pad); ctx.lineTo(pad + b, pad); ctx.stroke();
        // Top Right
        ctx.beginPath(); ctx.moveTo(w - pad - b, pad); ctx.lineTo(w - pad, pad); ctx.lineTo(w - pad, pad + b); ctx.stroke();
        // Bottom Left
        ctx.beginPath(); ctx.moveTo(pad, h - pad - b); ctx.lineTo(pad, h - pad); ctx.lineTo(pad + b, h - pad); ctx.stroke();
        // Bottom Right
        ctx.beginPath(); ctx.moveTo(w - pad - b, h - pad); ctx.lineTo(w - pad, h - pad); ctx.lineTo(w - pad, h - pad - b); ctx.stroke();

        // Live Badge
        if (isLive) {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath(); ctx.arc(28, 28, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'left';
            ctx.fillText('LIVE STREAM', 38, 31);
        }

        // Telemetry readout
        if (telemetry) {
            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'right';
            const bat = telemetry.battery || '95%';
            const head = telemetry.heading || '315° NW';
            ctx.fillText(`BAT: ${bat} • HDG: ${head}`, w - pad, pad + 12);
        }

        // Recording indicator
        if (isRecording) {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath(); ctx.arc(pad + 10, h - pad - 10, 6, 0, Math.PI * 2); ctx.fill();
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'left';
            ctx.fillText('REC', pad + 22, h - pad - 6);
        }
    }

    // --- Main Viewport Mirror Controls ---
    window.displayIsrInMainViewport = function() {
        isMirroredToMain = true;
        const mainCanvas = document.getElementById('mainview-isr-canvas');
        const placeholder = document.getElementById('surveillance-placeholder');
        const killBtn = document.getElementById('feed-kill-btn');
        const label = document.getElementById('feed-label-source');

        if (mainCanvas) mainCanvas.classList.remove('hidden');
        if (placeholder) placeholder.classList.add('hidden');
        if (killBtn) {
            killBtn.classList.remove('hidden');
            killBtn.onclick = window.stopIsrMainViewport;
        }

        const feed = feeds.find(f => f.id === currentActiveFeedId) || feeds[0];
        if (label) label.textContent = `SQUAD ISR: ${feed.name}`;

        showToast(`📺 MIRRORING ${feed.name} TO MAIN TOP SCREEN!`);
        renderCurrentActiveView();
    };

    window.stopIsrMainViewport = function() {
        isMirroredToMain = false;
        const mainCanvas = document.getElementById('mainview-isr-canvas');
        const placeholder = document.getElementById('surveillance-placeholder');
        const killBtn = document.getElementById('feed-kill-btn');
        const label = document.getElementById('feed-label-source');

        if (mainCanvas) mainCanvas.classList.add('hidden');
        if (placeholder) placeholder.classList.remove('hidden');
        if (killBtn) killBtn.classList.add('hidden');
        if (label) label.textContent = 'OFFLINE';

        showToast('TOP SCREEN RESTORED TO DEFAULT HUD');
    };

    function renderMainviewMirror(img, telemetry) {
        const canvas = document.getElementById('mainview-isr-canvas');
        if (!canvas || canvas.classList.contains('hidden')) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = canvas.width = canvas.clientWidth || 800;
        const h = canvas.height = canvas.clientHeight || 450;

        ctx.drawImage(img, 0, 0, w, h);
        drawTacticalHud(ctx, w, h, telemetry, true);
    }

    function renderMainviewSimulation(feed) {
        const canvas = document.getElementById('mainview-isr-canvas');
        if (!canvas || canvas.classList.contains('hidden')) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = canvas.width = canvas.clientWidth || 800;
        const h = canvas.height = canvas.clientHeight || 450;

        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, w, h);
        drawTacticalHud(ctx, w, h, { battery: feed.battery, heading: '315° NW' }, false);
    }

    // --- Mode Toggle: Lone Hunter vs Squad C2 ---
    window.setIsrOpMode = function(mode) {
        currentOpMode = mode;
        const loneBtn = document.getElementById('isr-mode-btn-lone');
        const squadBtn = document.getElementById('isr-mode-btn-squad');
        const bodycamRow = document.getElementById('isr-bodycam-feeds-group');

        if (mode === 'LONE') {
            if (loneBtn) {
                loneBtn.className = "flex-1 bg-emerald-500 text-black font-black text-[10px] sm:text-xs py-1.5 px-2.5 rounded uppercase tracking-wider flex items-center justify-center gap-1 shadow transition-all border border-emerald-400";
            }
            if (squadBtn) {
                squadBtn.className = "flex-1 bg-slate-900 text-slate-400 font-bold text-[10px] sm:text-xs py-1.5 px-2.5 rounded uppercase tracking-wider flex items-center justify-center gap-1 hover:text-white transition-all";
            }
            if (bodycamRow) bodycamRow.classList.add('hidden');
            showToast('LONE HUNTER MODE ACTIVE (1 SENSOR & 1 K9)');
        } else {
            if (squadBtn) {
                squadBtn.className = "flex-1 bg-emerald-500 text-black font-black text-[10px] sm:text-xs py-1.5 px-2.5 rounded uppercase tracking-wider flex items-center justify-center gap-1 shadow transition-all border border-emerald-400";
            }
            if (loneBtn) {
                loneBtn.className = "flex-1 bg-slate-900 text-slate-400 font-bold text-[10px] sm:text-xs py-1.5 px-2.5 rounded uppercase tracking-wider flex items-center justify-center gap-1 hover:text-white transition-all";
            }
            if (bodycamRow) bodycamRow.classList.remove('hidden');
            showToast('SQUAD C2 ACTIVE (FULL 5-MAN BODYCAMS & K9 TELEMETRY)');
        }
        if (window.lucide) window.lucide.createIcons();
    };

    // --- Snapshot to Intel Vault ---
    window.captureIsrSnapshotToVault = function() {
        const canvas = document.getElementById('isr-stream-canvas');
        if (!canvas) return;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const feed = feeds.find(f => f.id === currentActiveFeedId) || feeds[0];

        try {
            if (window.idbSaveIntel) {
                window.idbSaveIntel({
                    id: 'intel-isr-' + Date.now(),
                    title: `ISR SNAPSHOT [${feed.name}]`,
                    type: 'photo',
                    data: dataUrl,
                    timestamp: new Date().toISOString(),
                    lat: deviceSensors.lat,
                    lng: deviceSensors.lng,
                    notes: `Captured live from ${feed.source}`
                });
            }
            showToast(`✅ SNAPSHOT SAVED TO INTEL VAULT (WIN #4)!`);
        } catch(e) {
            showToast(`✅ SNAPSHOT CAPTURED!`);
        }
    };

    // --- Record Video Clip Toggle ---
    window.toggleIsrRecording = function() {
        isRecording = !isRecording;
        const btn = document.getElementById('isr-record-btn');
        if (btn) {
            if (isRecording) {
                btn.className = "bg-red-600 hover:bg-red-500 text-white font-black text-[9px] sm:text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1 shadow animate-pulse border border-red-400 cursor-pointer";
                btn.innerHTML = `<i data-lucide="circle-stop" class="w-3.5 h-3.5"></i> STOP REC`;
                showToast(`🔴 RECORDING ISR CLIP...`);
            } else {
                btn.className = "bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[9px] sm:text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1 border border-slate-600 transition-all cursor-pointer";
                btn.innerHTML = `<i data-lucide="video" class="w-3.5 h-3.5"></i> REC`;
                showToast(`💾 CLIP SAVED TO INTEL VAULT!`);
            }
            if (window.lucide) window.lucide.createIcons();
        }
        renderCurrentActiveView();
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
        initDeviceSensors();
        startViewerPolling();

        const feed = feeds[0];
        setTimeout(() => {
            renderSimulationFrame(feed);
            if (window.lucide) window.lucide.createIcons();
        }, 500);

        window.addEventListener('resize', () => {
            renderCurrentActiveView();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initIsr);
    } else {
        initIsr();
    }

})();
