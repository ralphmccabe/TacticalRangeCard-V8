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
            id: 'feed-base-c2',
            type: 'basecam',
            name: 'BASE C2 (COMMAND POST)',
            source: 'PC Command Desk Webcam',
            resolution: '1080P 30FPS',
            battery: 'AC PWR',
            signal: '100%',
            status: 'ONLINE',
            hudMode: 'crosshair',
            placeholderColor: '#0f172a'
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
    let feedTelemetry = {};
    window.feedTelemetry = feedTelemetry;
    let isMirroredToMain = false;

    // --- Tactical Mission Room State ---
    let currentMissionCode = 'ALPHA-1';
    try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('mission')) {
            currentMissionCode = urlParams.get('mission').toUpperCase().trim();
            localStorage.setItem('trc_isr_mission', currentMissionCode);
        } else {
            const stored = localStorage.getItem('trc_isr_mission');
            if (stored) currentMissionCode = stored.toUpperCase().trim();
        }
    } catch(e) {}

    // --- Multi-Cam 2x2 Matrix Mode State ---
    let isMatrixGridMode = false;

    // --- Screen WakeLock Management (Keeps bodycam/phone display awake during broadcast) ---
    let screenWakeLock = null;
    async function acquireScreenWakeLock() {
        try {
            if ('wakeLock' in navigator) {
                screenWakeLock = await navigator.wakeLock.request('screen');
                screenWakeLock.addEventListener('release', () => {
                    screenWakeLock = null;
                    console.log("[ISR] Screen WakeLock released");
                });
                console.log("[ISR] Screen WakeLock acquired: device display will stay active");
            }
        } catch (err) {
            console.warn("[ISR] Screen WakeLock error:", err);
        }
    }

    function releaseScreenWakeLock() {
        if (screenWakeLock) {
            try {
                screenWakeLock.release();
            } catch(e) {}
            screenWakeLock = null;
        }
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && isBroadcasting) {
            acquireScreenWakeLock();
        }
    });

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

        if (isMirroredToMain) {
            const topLabel = document.getElementById('feed-label-source');
            if (topLabel) topLabel.textContent = `SQUAD ISR: ${feed.name}`;
        }

        // Trigger immediate render
        renderCurrentActiveView();
    };

    // --- Broadcast Modal Tab Switcher ---
    window.switchBroadcastModalTab = function(tab) {
        const btnBroadcast = document.getElementById('isr-tab-btn-broadcast');
        const btnRemote = document.getElementById('isr-tab-btn-remote');
        const formBox = document.getElementById('isr-broadcast-form-container');
        const guideBox = document.getElementById('isr-broadcast-pc-guide');

        if (tab === 'remote') {
            if (btnRemote) {
                btnRemote.className = "flex-1 py-2 px-3 text-center font-black text-[11px] uppercase tracking-wider rounded-t border-b-2 border-cyan-400 text-cyan-300 bg-cyan-950/60 transition-all cursor-pointer";
            }
            if (btnBroadcast) {
                btnBroadcast.className = "flex-1 py-2 px-3 text-center font-black text-[11px] uppercase tracking-wider rounded-t border-b-2 border-transparent text-slate-400 hover:text-white bg-slate-900/60 transition-all cursor-pointer";
            }
            if (guideBox) guideBox.classList.remove('hidden');
            if (formBox) formBox.classList.add('hidden');
        } else {
            if (btnBroadcast) {
                btnBroadcast.className = "flex-1 py-2 px-3 text-center font-black text-[11px] uppercase tracking-wider rounded-t border-b-2 border-cyan-400 text-cyan-300 bg-cyan-950/60 transition-all cursor-pointer";
            }
            if (btnRemote) {
                btnRemote.className = "flex-1 py-2 px-3 text-center font-black text-[11px] uppercase tracking-wider rounded-t border-b-2 border-transparent text-slate-400 hover:text-white bg-slate-900/60 transition-all cursor-pointer";
            }
            if (formBox) formBox.classList.remove('hidden');
            if (guideBox) guideBox.classList.add('hidden');
        }
        if (window.lucide) window.lucide.createIcons();
    };

    window.onBroadcastRoleChange = function() {
        const roleSelect = document.getElementById('isr-broadcast-role-select');
        const sourceBox = document.getElementById('isr-broadcast-source-box');
        const facingSelect = document.getElementById('isr-broadcast-facing-select');
        const role = roleSelect ? roleSelect.value : 'feed-base-c2';

        if (role === 'feed-base-c2') {
            if (sourceBox) sourceBox.classList.remove('hidden');
            if (facingSelect) facingSelect.value = 'user';
        } else {
            if (sourceBox) sourceBox.classList.add('hidden');
            if (facingSelect) facingSelect.value = 'environment';
        }
    };

    async function populateCameraDeviceDropdown() {
        const select = document.getElementById('isr-broadcast-device-select');
        if (!select || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;

        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');
            if (videoDevices.length === 0) return;

            select.innerHTML = '';
            const ghostKeywords = ['phone', 'link', 'virtual', 's25', 'galaxy', 'droidcam', 'iriun', 'epoccam', 'obs'];
            let autoChosen = false;

            videoDevices.forEach((dev, idx) => {
                const opt = document.createElement('option');
                opt.value = dev.deviceId;
                const lbl = dev.label || `Camera ${idx + 1}`;
                const isGhost = ghostKeywords.some(k => lbl.toLowerCase().includes(k));

                if (isGhost) {
                    opt.textContent = `⚠️ ${lbl} (Ghost / Phone Link - Offline)`;
                } else {
                    opt.textContent = `📷 ${lbl} (Physical Hardware)`;
                    if (!autoChosen) {
                        opt.selected = true;
                        autoChosen = true;
                    }
                }
                select.appendChild(opt);
            });
        } catch(e) {}
    }

    window.onBroadcastSourceTypeChange = function() {
        const srcType = document.getElementById('isr-broadcast-source-type')?.value;
        const facingBox = document.getElementById('isr-broadcast-facing-box');
        if (facingBox) {
            if (srcType === 'screen') {
                facingBox.classList.add('hidden');
            } else {
                facingBox.classList.remove('hidden');
            }
        }
    };

    // --- Broadcast Setup Modal Controls ---
    window.openBroadcastSetupModal = function(roleHint) {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
        const host = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? '192.168.12.112' : location.hostname;
        const phoneUrl = `https://${host}:8443/?mission=${encodeURIComponent(currentMissionCode)}`;

        const qrImg = document.getElementById('isr-phone-qr-img');
        const phoneLink = document.getElementById('isr-phone-connect-url');
        if (qrImg) qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(phoneUrl)}`;
        if (phoneLink) {
            phoneLink.href = phoneUrl;
            phoneLink.textContent = phoneUrl;
        }

        const roleSelect = document.getElementById('isr-broadcast-role-select');
        if (roleSelect) {
            if (roleHint) {
                roleSelect.value = roleHint;
            } else if (!isMobile) {
                roleSelect.value = 'feed-base-c2';
            } else {
                roleSelect.value = 'feed-body-1';
            }
        }
        window.onBroadcastRoleChange();

        // Populate physical camera hardware dropdown (filters out ghost phones)
        populateCameraDeviceDropdown();

        // Default to broadcast tab
        window.switchBroadcastModalTab('broadcast');

        const m = document.getElementById('modal-isr-broadcast');
        if (m) {
            m.style.setProperty('display', 'flex', 'important');
            m.style.setProperty('z-index', '100000070', 'important');
            m.classList.remove('hidden');
        }

        const isSecure = window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        const httpsWarn = document.getElementById('isr-broadcast-https-warn');
        if (httpsWarn) {
            if (!isSecure) {
                httpsWarn.classList.remove('hidden');
                const link = document.getElementById('isr-broadcast-https-link');
                if (link) {
                    const secureUrl = `https://${location.hostname}:8443/`;
                    link.href = secureUrl;
                    link.textContent = `SWITCH TO SECURE CAMERA PORT (8443): ${secureUrl}`;
                }
            } else {
                httpsWarn.classList.add('hidden');
            }
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

    // --- Start Broadcasting From Local Device Camera or Screen ---
    window.startLocalBroadcasting = async function() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
        const roleSelect = document.getElementById('isr-broadcast-role-select');
        const facingSelect = document.getElementById('isr-broadcast-facing-select');
        const srcTypeSelect = document.getElementById('isr-broadcast-source-type');

        if (roleSelect) broadcastRoleId = roleSelect.value;
        if (facingSelect) broadcastFacingMode = facingSelect.value;
        const sourceType = srcTypeSelect ? srcTypeSelect.value : 'camera';

        if (!navigator.mediaDevices) {
            const secureUrl = `https://${location.hostname}:8443/`;
            alert(`⚠️ BROWSER SECURITY NOTICE:

Camera & Display APIs require a secure context.

Please open:
${secureUrl}`);
            return;
        }

        window.closeBroadcastSetupModal();

        try {
            // Stop existing broadcast stream if any
            if (activeMediaStream) {
                activeMediaStream.getTracks().forEach(t => t.stop());
            }

            let stream = null;

            if (sourceType === 'screen' && !isMobile) {
                if (!navigator.mediaDevices.getDisplayMedia) {
                    alert("⚠️ Screen capture is not supported by your current browser.");
                    return;
                }
                try {
                    stream = await navigator.mediaDevices.getDisplayMedia({
                        video: {
                            displaySurface: 'monitor',
                            frameRate: { ideal: 10, max: 15 }
                        },
                        audio: false
                    });
                    if (stream && stream.getVideoTracks().length > 0) {
                        stream.getVideoTracks()[0].addEventListener('ended', () => {
                            window.stopLocalBroadcasting();
                        });
                    }
                } catch(err) {
                    if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
                        console.error('Screen capture error:', err);
                    }
                    return;
                }
            } else {
                try {
                    const devSelect = document.getElementById('isr-broadcast-device-select');
                    const targetDevId = devSelect && devSelect.value && devSelect.value !== 'auto' ? devSelect.value : null;

                    let constraints;
                    if (isMobile) {
                        constraints = {
                            video: {
                                facingMode: { ideal: broadcastFacingMode },
                                width: { ideal: 640 },
                                height: { ideal: 480 }
                            },
                            audio: false
                        };
                    } else if (targetDevId) {
                        // Explicitly target selected physical webcam deviceId to bypass ghost phone links
                        constraints = {
                            video: {
                                deviceId: { exact: targetDevId },
                                width: { ideal: 640 },
                                height: { ideal: 480 }
                            },
                            audio: false
                        };
                    } else {
                        constraints = {
                            video: {
                                width: { ideal: 640 },
                                height: { ideal: 480 }
                            },
                            audio: false
                        };
                    }
                    try {
                        stream = await navigator.mediaDevices.getUserMedia(constraints);
                    } catch(eExact) {
                        if (targetDevId) {
                            // Retry with ideal deviceId
                            stream = await navigator.mediaDevices.getUserMedia({
                                video: { deviceId: { ideal: targetDevId }, width: { ideal: 640 }, height: { ideal: 480 } },
                                audio: false
                            });
                        } else {
                            throw eExact;
                        }
                    }
                } catch(e1) {
                    console.warn("Primary broadcast camera constraint failed, falling back to video: true", e1);
                    try {
                        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                    } catch(e2) {
                        if (e2.name === 'NotReadableError' || e2.name === 'TrackStartError') {
                            alert("⚠️ PC WEBCAM IS CURRENTLY IN USE BY ANOTHER APP:\n\nWindows Settings or the Windows Camera app is holding your webcam preview.\n\nPlease close the Windows Settings / Troubleshooting camera window and try again!");
                        } else if (e2.name === 'NotAllowedError' || e2.name === 'PermissionDeniedError') {
                            alert("⚠️ CAMERA ACCESS BLOCKED:\n\nPlease click the lock or camera icon in your browser URL bar and click 'Allow' to grant camera access.");
                        } else {
                            alert(`⚠️ WEBCAM ACCESS ERROR: ${e2.message || e2.name}`);
                        }
                        throw e2;
                    }
                }
            }

            activeMediaStream = stream;
            isBroadcasting = true;

            // Acquire Screen WakeLock so device stays on
            acquireScreenWakeLock();

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

                const isC2 = broadcastRoleId === 'feed-base-c2';
                const payload = {
                    missionId: currentMissionCode,
                    feedId: broadcastRoleId,
                    image: dataUrl,
                    telemetry: {
                        battery: isC2 ? '100% (AC)' : deviceSensors.battery,
                        heading: isC2 ? '000° N' : deviceSensors.heading,
                        speed: isC2 ? '0.0 MPH' : deviceSensors.speed,
                        lat: isC2 ? 'C2 COMMAND' : deviceSensors.lat,
                        lng: isC2 ? 'OPS DESK' : deviceSensors.lng,
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

            // If not in 2x2 matrix mode and not Base C2 on PC, switch to this feed
            if (broadcastRoleId !== 'feed-base-c2' && !isMatrixGridMode) {
                window.switchIsrFeed(broadcastRoleId);
            } else if (isMatrixGridMode) {
                renderCurrentActiveView();
            }

        } catch (err) {
            console.error('Camera access error:', err);
            showToast(`⚠️ CAMERA ACCESS ERROR: ${err.message || 'Permission denied'}`);
        }
    };

    // --- Stop Broadcasting ---
    window.stopLocalBroadcasting = function() {
        isBroadcasting = false;
        releaseScreenWakeLock();
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

        // Notify relay server that stream has ended
        if (broadcastRoleId) {
            fetch(`/api/isr_stop?missionId=${encodeURIComponent(currentMissionCode)}&feedId=${encodeURIComponent(broadcastRoleId)}`, { method: 'POST' }).catch(() => {});
        }

        const broadcastBtn = document.getElementById('isr-live-cam-toggle-btn');
        if (broadcastBtn) {
            broadcastBtn.style.background = 'linear-gradient(135deg, #06b6d4, #10b981) !important';
            broadcastBtn.style.border = '2px solid #22d3ee !important';
            broadcastBtn.style.boxShadow = '0 0 20px rgba(6,182,212,0.8) !important';
            broadcastBtn.innerHTML = '<i data-lucide="smartphone" class="w-4 h-4 text-black shrink-0"></i> <span>📱 BROADCAST FROM PHONE</span>';
            broadcastBtn.onclick = window.openBroadcastSetupModal;
            if (window.lucide) window.lucide.createIcons();
        }

        showToast('⏹️ CAMERA TRANSMISSION TERMINATED');
        renderCurrentActiveView();
    };

    // Dedicated function to stop and disconnect active ISR stream (viewer or broadcaster)
    window.stopActiveIsrFeed = async function() {
        if (isBroadcasting) {
            window.stopLocalBroadcasting();
        }

        if (isMatrixGridMode) {
            const quadFeedIds = ['feed-drone-1', 'feed-body-1', 'feed-body-2', 'feed-base-c2'];
            for (const qf of quadFeedIds) {
                try {
                    await fetch(`/api/isr_stop?missionId=${encodeURIComponent(currentMissionCode)}&feedId=${encodeURIComponent(qf)}`, { method: 'POST' });
                } catch(e) {}
                const f = feeds.find(x => x.id === qf);
                if (f) { f.isOnline = false; f.currentImg = null; }
            }
            lastReceivedFrame = null;
            lastReceivedTelemetry = null;
            renderCurrentActiveView();
            showToast("🛑 ALL SQUAD FEEDS TERMINATED & DISCONNECTED");
            if (typeof window.pushTacLog === 'function') {
                window.pushTacLog("ALL ISR SQUAD FEEDS TERMINATED", "WARN");
            }
            return;
        }

        try {
            await fetch(`/api/isr_stop?missionId=${encodeURIComponent(currentMissionCode)}&feedId=${encodeURIComponent(currentActiveFeedId)}`, { method: 'POST' });
        } catch(e) {}

        const feed = feeds.find(f => f.id === currentActiveFeedId);
        if (feed) {
            feed.isOnline = false;
            feed.currentImg = null;
        }
        lastReceivedFrame = null;
        lastReceivedTelemetry = null;

        renderCurrentActiveView();
        showToast(`🛑 LIVE FEED STOPPED: ${currentActiveFeedId.replace('feed-', '').toUpperCase()}`);
        if (typeof window.pushTacLog === 'function') {
            window.pushTacLog(`ISR LIVE FEED TERMINATED: ${currentActiveFeedId.toUpperCase()}`, "WARN");
        }
    };

    // Stop a specific single feed from 2x2 tile or control
    window.stopSpecificIsrFeed = async function(feedId) {
        if (feedId === 'feed-base-c2' || feedId === broadcastRoleId) {
            if (isBroadcasting) {
                window.stopLocalBroadcasting();
            }
        }
        try {
            await fetch(`/api/isr_stop?missionId=${encodeURIComponent(currentMissionCode)}&feedId=${encodeURIComponent(feedId)}`, { method: 'POST' });
        } catch(e) {}

        const feed = feeds.find(f => f.id === feedId);
        if (feed) {
            feed.isOnline = false;
            feed.currentImg = null;
        }
        showToast(`🛑 FEED TERMINATED: ${feed ? feed.name.toUpperCase() : feedId.toUpperCase()}`);
        if (typeof window.pushTacLog === 'function') {
            window.pushTacLog(`ISR FEED STOPPED: ${feed ? feed.name : feedId}`, "WARN");
        }
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
    let pollTick = 0;

    // --- Mission Room Manager Functions ---
    window.openMissionRoomModal = function() {
        const modal = document.getElementById('modal-isr-mission-room');
        if (!modal) return;
        const input = document.getElementById('isr-mission-code-input');
        if (input) input.value = currentMissionCode;
        const disp = document.getElementById('isr-mission-code-display');
        if (disp) disp.textContent = currentMissionCode;
        updateMissionRoomModalQr();
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        if (window.lucide) window.lucide.createIcons();
    };

    window.closeMissionRoomModal = function() {
        const modal = document.getElementById('modal-isr-mission-room');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    };

    window.setMissionCode = function(newCode) {
        if (!newCode) return;
        currentMissionCode = newCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
        localStorage.setItem('trc_isr_mission', currentMissionCode);

        // Update label in Window 7 header
        const lbl = document.getElementById('isr-mission-label');
        if (lbl) lbl.textContent = `ROOM: ${currentMissionCode}`;

        // Sync to Window 5 Comms passcode
        const commsCode = document.getElementById('comms-passcode');
        if (commsCode) commsCode.value = currentMissionCode;

        const disp = document.getElementById('isr-mission-code-display');
        if (disp) disp.textContent = currentMissionCode;

        updateMissionRoomModalQr();
        showToast(`🔑 CONNECTED TO MISSION ROOM: ${currentMissionCode}`);
        if (typeof window.pushTacLog === 'function') {
            window.pushTacLog(`MISSION ROOM JOINED: ${currentMissionCode}`, "SUCCESS");
        }

        window.closeMissionRoomModal();
        renderCurrentActiveView();
    };

    window.applyMissionCodeFromInput = function() {
        const input = document.getElementById('isr-mission-code-input');
        if (input && input.value) {
            window.setMissionCode(input.value);
        }
    };

    function updateMissionRoomModalQr() {
        const qrImg = document.getElementById('isr-mission-qr-img');
        const host = location.hostname || '192.168.12.112';
        const fullUrl = `https://${host}:8443/?mission=${encodeURIComponent(currentMissionCode)}`;
        if (qrImg) {
            qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(fullUrl)}`;
        }
    }

    window.copyMissionShareLink = function() {
        const host = location.hostname || '192.168.12.112';
        const fullUrl = `https://${host}:8443/?mission=${encodeURIComponent(currentMissionCode)}`;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(fullUrl).then(() => {
                showToast("📋 SQUAD JOIN LINK COPIED TO CLIPBOARD!");
            }).catch(() => {
                prompt("Copy this Squad Join link:", fullUrl);
            });
        } else {
            prompt("Copy this Squad Join link:", fullUrl);
        }
    };

    // --- 2x2 Multi-Cam Quad Matrix Mode ---
    window.toggleIsrMatrixView = function() {
        isMatrixGridMode = !isMatrixGridMode;
        const grid = document.getElementById('isr-matrix-grid');
        const singleCanvas = document.getElementById('isr-stream-canvas');
        const btnText = document.getElementById('isr-matrix-view-btn-text');
        const hdrLabel = document.getElementById('isr-hdr-matrix-label');
        const titleEl = document.getElementById('isr-active-cam-title');
        const snapBtnText = document.getElementById('isr-snapshot-btn-text');
        const recBtnText = document.getElementById('isr-record-btn-text');
        const stopBtnText = document.getElementById('isr-stop-feed-btn-text');

        if (isMatrixGridMode) {
            if (singleCanvas) singleCanvas.classList.add('hidden');
            if (grid) grid.classList.remove('hidden');
            if (btnText) btnText.textContent = "⊡ SINGLE FOCUS";
            if (hdrLabel) hdrLabel.textContent = "⊡ SINGLE FOCUS";
            if (titleEl) titleEl.textContent = "⊞ 2x2 SQUAD TACTICAL MATRIX (4 ACTIVE CHANNELS)";
            if (snapBtnText) snapBtnText.textContent = "SNAPSHOT (4-CAM QUAD)";
            if (recBtnText && !isRecording) recBtnText.textContent = "REC MATRIX";
            if (stopBtnText) stopBtnText.textContent = "STOP ACTIVE FEEDS";
            showToast("⊞ 2x2 QUAD-CAM MATRIX ACTIVE — TAP ANY TILE TO EXPAND");
        } else {
            if (grid) grid.classList.add('hidden');
            if (singleCanvas) singleCanvas.classList.remove('hidden');
            if (btnText) btnText.textContent = "⊞ 2x2 MATRIX";
            if (hdrLabel) hdrLabel.textContent = "⊞ 2x2 MATRIX";
            const feed = feeds.find(f => f.id === currentActiveFeedId) || feeds[0];
            if (titleEl) titleEl.textContent = feed.name;
            if (snapBtnText) snapBtnText.textContent = "SNAPSHOT";
            if (recBtnText && !isRecording) recBtnText.textContent = "REC";
            if (stopBtnText) stopBtnText.textContent = "STOP FEED";
            showToast(`⊡ SINGLE FOCUS ACTIVE: ${feed.name.toUpperCase()}`);
            renderCurrentActiveView();
        }
        if (window.lucide) window.lucide.createIcons();
    };

    window.selectMatrixTile = function(feedId) {
        window.switchIsrFeed(feedId);
        // Switch back to single focus on click
        if (isMatrixGridMode) {
            window.toggleIsrMatrixView();
        }
        const feed = feeds.find(f => f.id === feedId) || { name: feedId };
        showToast(`🔍 FOCUSED ON ${feed.name.toUpperCase()}`);
    };

    // Instant snapshot of a specific tile in the 2x2 matrix
    window.captureSingleTileSnapshot = async function(feedId, tileIndex) {
        const qCanvas = document.getElementById(`isr-quad-canvas-${tileIndex}`);
        if (!qCanvas) return;
        const feed = feeds.find(f => f.id === feedId) || { name: feedId.replace('feed-', '').toUpperCase(), source: 'ISR' };
        const dataUrl = qCanvas.toDataURL('image/jpeg', 0.90);
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
        const label = `ISR-${feed.name.replace(/[^a-zA-Z0-9]/g, '_')}-${timeStr}`;

        // Shutter flash effect on the viewport
        const vpBox = document.getElementById('isr-stream-viewport-box');
        if (vpBox) {
            const flash = document.createElement('div');
            flash.className = 'absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-300';
            flash.style.opacity = '0.85';
            vpBox.appendChild(flash);
            setTimeout(() => {
                flash.style.opacity = '0';
                setTimeout(() => flash.remove(), 300);
            }, 60);
        }

        try {
            if (typeof window.saveIntelSnapshot === 'function') {
                await window.saveIntelSnapshot(label, dataUrl, {
                    type: 'isr-snapshot',
                    feedId: feedId,
                    feedName: feed.name,
                    telemetry: lastReceivedTelemetry || {},
                    notes: `Optics snapshot from ${feed.name} (${feed.source || 'ISR'})`
                });
            } else if (window.TRC_IDB) {
                const entry = {
                    id: Date.now(),
                    label: label,
                    timestamp: now.toISOString(),
                    image: dataUrl,
                    type: 'isr-snapshot',
                    feedName: feed.name
                };
                await window.TRC_IDB.set('intelVault', entry.id.toString(), entry);
                if (typeof window.refreshVaultGrid === 'function') window.refreshVaultGrid();
            }

            if (typeof window.pushTacLog === 'function') {
                window.pushTacLog(`ISR TILE SNAPSHOT SAVED: ${label}`, "INTEL");
            }
            showToast(`📸 SNAPSHOT OF ${feed.name.toUpperCase()} SAVED TO INTEL VAULT!`);
        } catch(e) {
            console.error("Tile snapshot error:", e);
            showToast(`✅ SNAPSHOT CAPTURED`);
        }
    };
    
    function startViewerPolling() {
        if (viewerPollInterval) clearInterval(viewerPollInterval);

        viewerPollInterval = setInterval(async () => {
            pollTick++;

            // Every ~1 second (8 ticks @ 120ms), poll active streams across all feeds
            if (pollTick % 8 === 0) {
                try {
                    const actRes = await fetch(`/api/isr_active?missionId=${encodeURIComponent(currentMissionCode)}`);
                    if (actRes.ok) {
                        const actData = await actRes.json();
                        const activeList = actData.activeStreams || [];

                        // Update feed cards with LIVE indicator badges
                        feeds.forEach(f => {
                            const isLive = activeList.some(s => s.feedId === f.id);
                            const card = document.querySelector(`.isr-feed-card[data-feed-id="${f.id}"]`);
                            if (card) {
                                let badge = card.querySelector('.isr-live-badge');
                                if (isLive) {
                                    if (!badge) {
                                        badge = document.createElement('span');
                                        badge.className = 'isr-live-badge bg-red-600 text-white font-black text-[8px] px-1.5 py-0.5 rounded-full animate-pulse uppercase tracking-wider ml-auto';
                                        badge.textContent = '● LIVE';
                                        const hdr = card.querySelector('div:first-child');
                                        if (hdr) hdr.appendChild(badge);
                                    }
                                    card.classList.add('border-red-500', 'ring-2', 'ring-red-500/60');
                                } else {
                                    if (badge) badge.remove();
                                    card.classList.remove('border-red-500', 'ring-2', 'ring-red-500/60');
                                }
                            }
                        });

                        // Auto-switch to active phone stream if user is on default simulation
                        if (!isBroadcasting && activeList.length > 0) {
                            const hasActive = activeList.some(s => s.feedId === currentActiveFeedId);
                            if (!hasActive) {
                                window.switchIsrFeed(activeList[0].feedId);
                                showToast(`🔴 LIVE MOBILE STREAM DETECTED: AUTO-SWITCHED TO ${activeList[0].feedId.toUpperCase()}`);
                            }
                        }

                        // Incoming Base C2 Command Live Alert Banner (for field phones)
                        const c2Active = activeList.some(s => s.feedId === 'feed-base-c2');
                        const c2Banner = document.getElementById('isr-c2-live-banner');
                        if (c2Banner) {
                            if (c2Active && currentActiveFeedId !== 'feed-base-c2' && !isMatrixGridMode && broadcastRoleId !== 'feed-base-c2') {
                                c2Banner.classList.remove('hidden');
                            } else {
                                c2Banner.classList.add('hidden');
                            }
                        }
                    }
                } catch (e) {}
            }

            // Check if current active feed has a live stream
            try {
                const res = await fetch(`/api/isr_frame?missionId=${encodeURIComponent(currentMissionCode)}&feedId=${currentActiveFeedId}`);
                
            // If in 2x2 Matrix Mode, update all 4 quad tiles
            if (isMatrixGridMode && pollTick % 2 === 0) {
                const quadFeedIds = ['feed-drone-1', 'feed-body-1', 'feed-body-2', 'feed-base-c2'];
                quadFeedIds.forEach(async (qFid, idx) => {
                    try {
                        const qRes = await fetch(`/api/isr_frame?missionId=${encodeURIComponent(currentMissionCode)}&feedId=${qFid}`);
                        if (qRes.ok) {
                            const qData = await qRes.json();
                            const qCanvas = document.getElementById(`isr-quad-canvas-${idx + 1}`);
                            const qLiveBadge = document.getElementById(`isr-quad-live-${idx + 1}`);
                            if (qCanvas) {
                                const qCtx = qCanvas.getContext('2d');
                                if (qData.active && qData.image) {
                                    if (qLiveBadge) qLiveBadge.classList.remove('hidden');
                                    const qImg = new Image();
                                    qImg.onload = () => {
                                        qCanvas.width = 320;
                                        qCanvas.height = 240;
                                        qCtx.drawImage(qImg, 0, 0, qCanvas.width, qCanvas.height);
                                    };
                                    qImg.src = qData.image;
                                } else {
                                    if (qLiveBadge) qLiveBadge.classList.add('hidden');
                                    // Draw standby pattern
                                    qCanvas.width = 320;
                                    qCanvas.height = 240;
                                    qCtx.fillStyle = '#090d16';
                                    qCtx.fillRect(0, 0, 320, 240);
                                    qCtx.strokeStyle = 'rgba(6,182,212,0.15)';
                                    qCtx.lineWidth = 1;
                                    for(let x=0; x<320; x+=20) { qCtx.beginPath(); qCtx.moveTo(x,0); qCtx.lineTo(x,240); qCtx.stroke(); }
                                    for(let y=0; y<240; y+=20) { qCtx.beginPath(); qCtx.moveTo(0,y); qCtx.lineTo(320,y); qCtx.stroke(); }
                                    qCtx.fillStyle = '#64748b';
                                    qCtx.font = 'bold 11px monospace';
                                    qCtx.textAlign = 'center';
                                    qCtx.fillText('STANDBY / NO SIGNAL', 160, 125);
                                }
                            }
                        }
                    } catch(e) {}
                });
            }
    
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

    // --- Update Window 7 Button Status ---
    function updateTopScreenButton() {
        const btn = document.getElementById('isr-top-screen-btn');
        if (!btn) return;
        if (isMirroredToMain) {
            btn.className = "bg-red-600 hover:bg-red-500 text-white border-2 border-red-400 text-[9px] font-black px-2.5 py-1 rounded uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse";
            btn.innerHTML = `<i data-lucide="x" class="w-3.5 h-3.5 text-white"></i> <span>EXIT TOP</span>`;
        } else {
            btn.className = "bg-cyan-950/90 hover:bg-cyan-800 text-cyan-300 hover:text-white border border-cyan-500/50 text-[9px] font-black px-2.5 py-1 rounded uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow";
            btn.innerHTML = `<i data-lucide="tv" class="w-3.5 h-3.5 text-cyan-400"></i> <span>TOP SCREEN</span>`;
        }
        if (window.lucide) window.lucide.createIcons();
    }

    // --- Main Viewport Mirror Controls ---
    window.displayIsrInMainViewport = function() {
        if (isMirroredToMain) {
            // Toggle off if already mirrored!
            window.stopIsrMainViewport();
            return;
        }

        isMirroredToMain = true;
        const mainCanvas = document.getElementById('mainview-isr-canvas');
        const placeholder = document.getElementById('surveillance-placeholder');
        const killBtn = document.getElementById('feed-kill-btn');
        const exitBtn = document.getElementById('isr-topview-exit-btn');
        const floatExit = document.getElementById('isr-canvas-floating-exit-btn');
        const label = document.getElementById('feed-label-source');

        if (mainCanvas) {
            mainCanvas.classList.remove('hidden');
            mainCanvas.style.display = 'block';
        }
        if (placeholder) {
            placeholder.classList.add('hidden');
            placeholder.style.display = 'none';
        }
        if (killBtn) {
            killBtn.classList.remove('hidden');
            killBtn.style.display = 'flex';
            killBtn.onclick = window.stopIsrMainViewport;
        }
        if (exitBtn) {
            exitBtn.classList.remove('hidden');
            exitBtn.style.display = 'flex';
        }
        if (floatExit) {
            floatExit.classList.remove('hidden');
            floatExit.style.display = 'flex';
        }

        const feed = feeds.find(f => f.id === currentActiveFeedId) || feeds[0];
        if (label) label.textContent = `SQUAD ISR: ${feed.name}`;

        updateTopScreenButton();

        showToast(`📺 MIRRORING ${feed.name} TO TOP COMMAND SCREEN!`);
        renderCurrentActiveView();
        if (window.lucide) window.lucide.createIcons();
    };

    window.stopIsrMainViewport = function() {
        isMirroredToMain = false;
        const mainCanvas = document.getElementById('mainview-isr-canvas');
        const placeholder = document.getElementById('surveillance-placeholder');
        const killBtn = document.getElementById('feed-kill-btn');
        const exitBtn = document.getElementById('isr-topview-exit-btn');
        const floatExit = document.getElementById('isr-canvas-floating-exit-btn');
        const label = document.getElementById('feed-label-source');

        if (mainCanvas) {
            mainCanvas.classList.add('hidden');
            mainCanvas.style.display = 'none';
        }
        if (placeholder) {
            placeholder.classList.remove('hidden');
            placeholder.style.display = '';
        }
        if (killBtn) {
            killBtn.classList.add('hidden');
            killBtn.style.display = 'none';
        }
        if (exitBtn) {
            exitBtn.classList.add('hidden');
            exitBtn.style.display = 'none';
        }
        if (floatExit) {
            floatExit.classList.add('hidden');
            floatExit.style.display = 'none';
        }
        if (label) label.textContent = 'OFFLINE';

        updateTopScreenButton();

        showToast('⏹️ TOP SCREEN RESTORED TO DEFAULT DASHBOARD');
        if (window.lucide) window.lucide.createIcons();
    };

    // ESC key closes mirror
    window.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isMirroredToMain) {
            window.stopIsrMainViewport();
        }
    });

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

    let isrMediaRecorder = null;
    let isrRecordedChunks = [];
    let isrRecordStartTime = 0;

    // --- Snapshot to Intel Vault ---
    window.captureIsrSnapshotToVault = async function() {
        const vpBox = document.getElementById('isr-stream-viewport-box');
        if (vpBox) {
            const flash = document.createElement('div');
            flash.className = 'absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-300';
            flash.style.opacity = '0.85';
            vpBox.appendChild(flash);
            setTimeout(() => {
                flash.style.opacity = '0';
                setTimeout(() => flash.remove(), 300);
            }, 60);
        }

        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour12: false });

        if (isMatrixGridMode) {
            // COMPOSITE ALL 4 QUAD CANVASES INTO ONE TACTICAL RECON IMAGE
            const comp = document.createElement('canvas');
            comp.width = 640;
            comp.height = 480;
            const cCtx = comp.getContext('2d');
            cCtx.fillStyle = '#020617';
            cCtx.fillRect(0, 0, 640, 480);

            const q1 = document.getElementById('isr-quad-canvas-1');
            const q2 = document.getElementById('isr-quad-canvas-2');
            const q3 = document.getElementById('isr-quad-canvas-3');
            const q4 = document.getElementById('isr-quad-canvas-4');

            if (q1) cCtx.drawImage(q1, 0, 0, 320, 240);
            if (q2) cCtx.drawImage(q2, 320, 0, 320, 240);
            if (q3) cCtx.drawImage(q3, 0, 240, 320, 240);
            if (q4) cCtx.drawImage(q4, 320, 240, 320, 240);

            // Tactical Matrix HUD Overlays
            cCtx.strokeStyle = 'rgba(16, 185, 129, 0.7)';
            cCtx.lineWidth = 2;
            cCtx.strokeRect(0, 0, 640, 480);
            cCtx.beginPath();
            cCtx.moveTo(320, 0); cCtx.lineTo(320, 480);
            cCtx.moveTo(0, 240); cCtx.lineTo(640, 240);
            cCtx.stroke();

            // Quad Labels
            cCtx.font = 'bold 11px monospace';
            cCtx.fillStyle = '#10b981';
            cCtx.fillText('🚁 CH-1: AIR-1 DRONE', 10, 18);
            cCtx.fillText('🦺 CH-2: LEAD BODYCAM', 330, 18);
            cCtx.fillText('🎯 CH-3: POINT SCOUT', 10, 258);
            cCtx.fillText('💻 CH-4: BASE C2 COMMAND', 330, 258);

            // Footer Telemetry Stamp
            cCtx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            cCtx.fillRect(160, 458, 320, 22);
            cCtx.strokeStyle = '#06b6d4';
            cCtx.strokeRect(160, 458, 320, 22);
            cCtx.fillStyle = '#38bdf8';
            cCtx.font = 'bold 9px monospace';
            cCtx.textAlign = 'center';
            cCtx.fillText(`TACTICAL ISR QUAD RECON | ROOM: ${currentMissionCode} | ${timeStr}`, 320, 473);

            const dataUrl = comp.toDataURL('image/jpeg', 0.90);
            const label = `QUAD_ISR_MATRIX_${timeStr.replace(/[^0-9]/g, '')}`;

            try {
                if (typeof window.saveIntelSnapshot === 'function') {
                    await window.saveIntelSnapshot(label, dataUrl, {
                        type: 'isr-quad-matrix',
                        feedId: 'quad-matrix',
                        feedName: '4-CAM SQUAD MATRIX',
                        telemetry: lastReceivedTelemetry || {},
                        notes: `4-Channel Tactical Quad Recon Matrix snapshot (Room: ${currentMissionCode})`
                    });
                } else if (window.TRC_IDB) {
                    const entry = {
                        id: Date.now(),
                        label: label,
                        timestamp: now.toISOString(),
                        image: dataUrl,
                        type: 'isr-quad-matrix',
                        feedName: '4-CAM SQUAD MATRIX'
                    };
                    await window.TRC_IDB.set('intelVault', entry.id.toString(), entry);
                    if (typeof window.refreshVaultGrid === 'function') window.refreshVaultGrid();
                }

                if (typeof window.pushTacLog === 'function') {
                    window.pushTacLog(`QUAD ISR MATRIX SNAPSHOT SAVED: ${label}`, "INTEL");
                }
                showToast(`📸 4-CAM SQUAD MATRIX RECON SAVED TO INTEL VAULT!`);
            } catch(e) {
                console.error("Quad snapshot save error:", e);
                showToast(`✅ QUAD MATRIX CAPTURED LOCALLY`);
            }
            return;
        }

        // SINGLE VIEW CANVAS SNAPSHOT
        const canvas = document.getElementById('isr-stream-canvas');
        if (!canvas) return;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
        const feed = feeds.find(f => f.id === currentActiveFeedId) || feeds[0];
        const label = `ISR-${feed.name.replace(/[^a-zA-Z0-9]/g, '_')}-${timeStr}`;

        try {
            if (typeof window.saveIntelSnapshot === 'function') {
                await window.saveIntelSnapshot(label, dataUrl, {
                    type: 'isr-snapshot',
                    feedId: currentActiveFeedId,
                    feedName: feed.name,
                    telemetry: lastReceivedTelemetry || {},
                    notes: `Live optics snapshot from ${feed.name} (${feed.source})`
                });
            } else if (window.TRC_IDB) {
                const entry = {
                    id: Date.now(),
                    label: label,
                    timestamp: now.toISOString(),
                    image: dataUrl,
                    type: 'isr-snapshot',
                    feedName: feed.name
                };
                await window.TRC_IDB.set('intelVault', entry.id.toString(), entry);
                if (typeof window.refreshVaultGrid === 'function') window.refreshVaultGrid();
            }

            if (typeof window.pushTacLog === 'function') {
                window.pushTacLog(`ISR SNAPSHOT SAVED: ${label}`, "INTEL");
            }
            showToast(`📸 SNAPSHOT SAVED TO INTEL VAULT (WIN #4)!`);
        } catch(e) {
            console.error("Snapshot save error:", e);
            showToast(`✅ SNAPSHOT CAPTURED LOCALLY`);
        }
    };

    // --- Record Video Clip Toggle ---
    window.toggleIsrRecording = function() {
        const btn = document.getElementById('isr-record-btn');
        const feed = isMatrixGridMode ? { name: 'QUAD_MATRIX' } : (feeds.find(f => f.id === currentActiveFeedId) || feeds[0]);

        if (!isRecording) {
            // START RECORDING
            try {
                isrRecordedChunks = [];
                let stream = null;
                let recordCanvas = null;

                if (isMatrixGridMode) {
                    recordCanvas = document.createElement('canvas');
                    recordCanvas.width = 640;
                    recordCanvas.height = 480;
                    const rCtx = recordCanvas.getContext('2d');

                    const compInterval = setInterval(() => {
                        if (!isRecording) {
                            clearInterval(compInterval);
                            return;
                        }
                        const q1 = document.getElementById('isr-quad-canvas-1');
                        const q2 = document.getElementById('isr-quad-canvas-2');
                        const q3 = document.getElementById('isr-quad-canvas-3');
                        const q4 = document.getElementById('isr-quad-canvas-4');
                        rCtx.fillStyle = '#020617';
                        rCtx.fillRect(0, 0, 640, 480);
                        if (q1) rCtx.drawImage(q1, 0, 0, 320, 240);
                        if (q2) rCtx.drawImage(q2, 320, 0, 320, 240);
                        if (q3) rCtx.drawImage(q3, 0, 240, 320, 240);
                        if (q4) rCtx.drawImage(q4, 320, 240, 320, 240);
                        rCtx.strokeStyle = '#10b981';
                        rCtx.lineWidth = 2;
                        rCtx.strokeRect(0, 0, 640, 480);
                        rCtx.beginPath();
                        rCtx.moveTo(320, 0); rCtx.lineTo(320, 480);
                        rCtx.moveTo(0, 240); rCtx.lineTo(640, 240);
                        rCtx.stroke();
                    }, 50);

                    stream = recordCanvas.captureStream ? recordCanvas.captureStream(20) : null;
                } else {
                    const canvas = document.getElementById('isr-stream-canvas');
                    if (!canvas) {
                        showToast("⚠️ CANVAS NOT READY");
                        return;
                    }
                    recordCanvas = canvas;
                    stream = canvas.captureStream ? canvas.captureStream(20) : null;
                }

                if (!stream) {
                    showToast("⚠️ VIDEO STREAM CAPTURE UNSUPPORTED");
                    return;
                }

                let options = { mimeType: 'video/webm;codecs=vp8' };
                if (window.MediaRecorder && !MediaRecorder.isTypeSupported(options.mimeType)) {
                    options = { mimeType: 'video/webm' };
                }

                isrMediaRecorder = new MediaRecorder(stream, options);
                isrMediaRecorder.ondataavailable = function(e) {
                    if (e.data && e.data.size > 0) isrRecordedChunks.push(e.data);
                };

                isrMediaRecorder.onstop = async function() {
                    const blob = new Blob(isrRecordedChunks, { type: 'video/webm' });
                    const thumbDataUrl = recordCanvas ? recordCanvas.toDataURL('image/jpeg', 0.85) : '';
                    const clipName = `VIDEO_${feed.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`;
                    const durationSec = Math.max(1, Math.round((Date.now() - isrRecordStartTime) / 1000));

                    const reader = new FileReader();
                    reader.onloadend = async function() {
                        const videoDataUrl = reader.result;

                        if (typeof window.saveIntelSnapshot === 'function') {
                            await window.saveIntelSnapshot(clipName, videoDataUrl, {
                                type: 'video',
                                video: videoDataUrl,
                                thumb: thumbDataUrl,
                                feedId: isMatrixGridMode ? 'quad-matrix' : currentActiveFeedId,
                                feedName: feed.name,
                                duration: `${durationSec}s`,
                                notes: `Live video clip from ${feed.name} (${durationSec}s)`
                            });
                        }

                        if (typeof window.pushTacLog === 'function') {
                            window.pushTacLog(`ISR VIDEO SAVED TO INTEL VAULT: ${clipName} (${durationSec}s)`, "INTEL");
                        }
                        showToast(`💾 VIDEO RECORDING SAVED TO INTEL VAULT!`);
                    };
                    reader.readAsDataURL(blob);
                };

                isrMediaRecorder.start(250);
                isRecording = true;
                isrRecordStartTime = Date.now();

                if (btn) {
                    btn.className = "bg-red-600 hover:bg-red-500 text-white font-black text-[9px] sm:text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1 shadow animate-pulse border border-red-400 cursor-pointer";
                    btn.innerHTML = `<i data-lucide="circle-stop" class="w-3.5 h-3.5"></i> <span id="isr-record-btn-text">STOP REC</span>`;
                }
                showToast(`🔴 RECORDING LIVE ${isMatrixGridMode ? 'QUAD MATRIX' : feed.name.toUpperCase()} CLIP...`);
            } catch (err) {
                console.error("Recording error:", err);
                showToast(`⚠️ RECORDING ERROR: ${err.message}`);
            }
        } else {
            // STOP RECORDING
            isRecording = false;
            if (isrMediaRecorder && isrMediaRecorder.state !== 'inactive') {
                isrMediaRecorder.stop();
            }
            if (btn) {
                btn.className = "bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[9px] sm:text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1 border border-slate-600 transition-all cursor-pointer";
                btn.innerHTML = `<i data-lucide="video" class="w-3.5 h-3.5"></i> <span id="isr-record-btn-text">${isMatrixGridMode ? 'REC MATRIX' : 'REC'}</span>`;
            }
        }

        if (window.lucide) window.lucide.createIcons();
        renderCurrentActiveView();
    };

    // --- Pin Target to Recon Map ---
    window.pinIsrTargetToMap = async function() {
        const feed = feeds.find(f => f.id === currentActiveFeedId) || feeds[0];
        const canvas = document.getElementById('isr-stream-canvas');
        const dataUrl = canvas ? canvas.toDataURL('image/jpeg', 0.8) : null;

        // Coordinates from mobile telemetry or map center or default
        let pinLat = 31.9542;
        let pinLng = -102.1784;

        if (lastReceivedTelemetry && lastReceivedTelemetry.lat && lastReceivedTelemetry.lng) {
            pinLat = parseFloat(lastReceivedTelemetry.lat);
            pinLng = parseFloat(lastReceivedTelemetry.lng);
        } else if (deviceSensors && deviceSensors.lat && deviceSensors.lng) {
            pinLat = parseFloat(deviceSensors.lat);
            pinLng = parseFloat(deviceSensors.lng);
        } else if (window.orbitalMap && typeof window.orbitalMap.getCenter === 'function') {
            const center = window.orbitalMap.getCenter();
            pinLat = center.lat;
            pinLng = center.lng;
        }

        // Plot to Leaflet Orbital Map (Window 3: Geo Matrix)
        if (window.orbitalMap && window.L) {
            const targetIcon = window.L.divIcon({
                className: 'isr-map-pin',
                html: `<div style="background: rgba(6,182,212,0.95); border: 2px solid #22d3ee; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(6,182,212,0.9); color: black; font-weight: 900; font-size: 14px; cursor: pointer;">🎯</div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            });

            const marker = window.L.marker([pinLat, pinLng], { icon: targetIcon }).addTo(window.orbitalMap);
            marker.bindPopup(`
                <div style="font-family: monospace; font-size: 11px; color: #000; min-width: 170px;">
                    <b style="color: #0891b2; font-size: 12px;">🎯 ISR OPTICAL PIN</b><br>
                    <b>FEED:</b> ${feed.name}<br>
                    <b>COORDS:</b> ${pinLat.toFixed(5)}, ${pinLng.toFixed(5)}<br>
                    <b>TIME:</b> ${new Date().toLocaleTimeString()}<br>
                    ${dataUrl ? `<img src="${dataUrl}" style="width: 100%; border-radius: 4px; margin-top: 4px; border: 1px solid #0891b2;">` : ''}
                </div>
            `).openPopup();

            window.orbitalMap.setView([pinLat, pinLng], 15);
        }

        // Also save to Intel Vault as pinned target
        if (dataUrl && typeof window.saveIntelSnapshot === 'function') {
            const pinLabel = `PIN-${feed.name.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now().toString().slice(-4)}`;
            await window.saveIntelSnapshot(pinLabel, dataUrl, {
                type: 'target-pin',
                lat: pinLat,
                lng: pinLng,
                feedName: feed.name,
                notes: `Optical reconnaissance target locked from ${feed.name}`
            });
        }

        if (typeof window.pushTacLog === 'function') {
            window.pushTacLog(`ISR TARGET PINNED AT ${pinLat.toFixed(5)}, ${pinLng.toFixed(5)}`, "SUCCESS");
        }
        showToast(`📍 TARGET FROM ${feed.name} PLOTTED TO GEO MATRIX & VAULT!`);
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
        const hdrMatrixLabel = document.getElementById('isr-hdr-matrix-label');
        if (hdrMatrixLabel) hdrMatrixLabel.textContent = isMatrixGridMode ? "⊡ SINGLE FOCUS" : "⊞ 2x2 MATRIX";
        initDeviceSensors();
        startViewerPolling();

        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
        const hdrText = document.getElementById('isr-header-broadcast-btn-text');
        const viewText = document.getElementById('isr-viewport-broadcast-btn-text');
        const qrQuickBtn = document.getElementById('isr-header-phone-qr-btn');

        if (!isMobile) {
            if (hdrText) hdrText.textContent = "[💻 BROADCAST PC WEBCAM / C2]";
            if (viewText) viewText.textContent = "💻 BROADCAST PC WEBCAM";
            if (qrQuickBtn) qrQuickBtn.classList.remove('hidden');
        } else {
            if (hdrText) hdrText.textContent = "[🦺 BROADCAST BODYCAM]";
            if (viewText) viewText.textContent = "🦺 BROADCAST BODYCAM";
            if (qrQuickBtn) qrQuickBtn.classList.add('hidden');
        }

        const lbl = document.getElementById('isr-mission-label');
        if (lbl) lbl.textContent = `ROOM: ${currentMissionCode}`;

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
