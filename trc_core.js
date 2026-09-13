let geoDistanceUnit = 'YDS';
/* 
    TACTICAL RANGE CARD PRO - PRODUCTION CORE v2.1
    SECURITY: AES-256 ENCRYPTED COMMS
*/

// === GLOBAL CLIENT-SIDE IMAGE RESIZER & OPTIMIZER ===
window.compressAndResizeImage = function(file, maxDim = 800, quality = 0.8) {
    return new Promise((resolve, reject) => {
        if (!file) { resolve(null); return; }
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = (e) => {
            const img = new Image();
            img.onerror = () => resolve(e.target.result);
            img.onload = () => {
                let w = img.width;
                let h = img.height;
                if (w > maxDim || h > maxDim) {
                    if (w > h) {
                        h = Math.round((h * maxDim) / w);
                        w = maxDim;
                    } else {
                        w = Math.round((w * maxDim) / h);
                        h = maxDim;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(img, 0, 0, w, h);
                const compressed = canvas.toDataURL('image/jpeg', quality);
                canvas.width = 0;
                canvas.height = 0;
                resolve(compressed);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
};

// === TACTICAL PDF THUMBNAIL GENERATOR ===
window.generatePdfThumbnailSvg = function(title) {
    const safeTitle = (title || 'EXECUTIVE INVOICE').substring(0, 26).toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="100%" height="100%">
        <rect width="300" height="300" fill="#090d16"/>
        <rect x="15" y="15" width="270" height="270" rx="10" fill="#0f172a" stroke="#3b82f6" stroke-width="3"/>
        <rect x="28" y="28" width="244" height="42" rx="6" fill="#1e293b" stroke="#60a5fa" stroke-width="1.5"/>
        <text x="150" y="54" fill="#60a5fa" font-size="13" font-family="monospace" font-weight="900" text-anchor="middle" letter-spacing="1">TRC EXECUTIVE INVOICE</text>
        <circle cx="150" cy="140" r="48" fill="#090d16" stroke="#22c55e" stroke-width="2.5"/>
        <line x1="150" y1="82" x2="150" y2="198" stroke="#22c55e" stroke-width="2"/>
        <line x1="92" y1="140" x2="208" y2="140" stroke="#22c55e" stroke-width="2"/>
        <circle cx="150" cy="140" r="18" fill="none" stroke="#22c55e" stroke-width="1.5"/>
        <circle cx="150" cy="140" r="5" fill="#22c55e"/>
        <rect x="30" y="206" width="240" height="26" rx="4" fill="#1e293b"/>
        <text x="150" y="223" fill="#f8fafc" font-size="11" font-family="monospace" font-weight="bold" text-anchor="middle">${safeTitle}</text>
        <rect x="75" y="244" width="150" height="24" rx="4" fill="#2563eb"/>
        <text x="150" y="260" fill="#ffffff" font-size="10" font-family="sans-serif" font-weight="900" text-anchor="middle" letter-spacing="1">TAP TO REWORK</text>
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
};

// === TACTICAL CRYPTO ENGINE (AES-256) ===

window.TacticalCrypto = {
    encrypt: function(data) {
        try {
            let secret = localStorage.getItem('trc_team_secret') || 'default-tactical-secret-key-2026';
            secret = secret.trim();
            return CryptoJS.AES.encrypt(JSON.stringify(data), secret).toString();
        } catch (e) {
            console.error("Encryption error", e);
            window.pushTacLog("CRYPTO ERROR: " + e.message, "ERROR");
            return null;
        }
    },
    decrypt: function(encryptedString) {
        try {
            if (typeof CryptoJS === 'undefined') {
                window.pushTacLog("FATAL: CryptoJS Library Missing!", "ERROR");
                return null;
            }
            let secret = localStorage.getItem('trc_team_secret') || 'default-tactical-secret-key-2026';
            secret = secret.trim();
            const bytes = CryptoJS.AES.decrypt(encryptedString, secret);
            const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
            if (!decryptedString) throw new Error("Passcode Mismatch");
            return JSON.parse(decryptedString);
        } catch (e) {
            console.error("Decryption error", e);
        }
    }
};

window.TacticalBinaryCrypto = {
    _getKey: async function() {
        let secret = localStorage.getItem('trc_team_secret') || 'default-tactical-secret-key-2026';
        secret = secret.trim();
        const encoder = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            encoder.encode(secret),
            { name: "PBKDF2" },
            false,
            ["deriveBits", "deriveKey"]
        );
        return await window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: encoder.encode("tactical-media-salt"),
                iterations: 100000,
                hash: "SHA-256"
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
    },
    encryptBlob: async function(blob) {
        try {
            const key = await this._getKey();
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const arrayBuffer = await blob.arrayBuffer();
            
            const encryptedBuffer = await window.crypto.subtle.encrypt(
                { name: "AES-GCM", iv: iv },
                key,
                arrayBuffer
            );
            
            // Prepend IV to the encrypted buffer
            const payload = new Uint8Array(12 + encryptedBuffer.byteLength);
            payload.set(iv, 0);
            payload.set(new Uint8Array(encryptedBuffer), 12);
            
            return new Blob([payload], { type: 'application/octet-stream' });
        } catch (e) {
            console.error("Binary Encryption Error", e);
            throw e;
        }
    },
    decryptBlob: async function(encryptedBlob, originalType = 'video/webm') {
        try {
            const key = await this._getKey();
            const arrayBuffer = await encryptedBlob.arrayBuffer();
            const payload = new Uint8Array(arrayBuffer);
            
            const iv = payload.slice(0, 12);
            const cipherBuffer = payload.slice(12);
            
            const decryptedBuffer = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                key,
                cipherBuffer
            );
            
            return new Blob([decryptedBuffer], { type: originalType });
        } catch (e) {
            console.error("Binary Decryption Error", e);
            throw e;
        }
    }
};

function initializeTacticalDashboard1() {

    // ── LAZY LOADERS ─────────────────────────────────────────────────────────
    // These scripts are NOT loaded at page start. They load the first time
    // they are actually needed, saving ~390 KB from the initial parse.
    window.ensureHtml2Canvas = function() {
        return new Promise((resolve, reject) => {
            if (window.html2canvas) { resolve(); return; }
            if (!window.loadScript) { reject(new Error('loadScript not available')); return; }
            window.loadScript('html2canvas.min.js?v=7.27.47').then(resolve).catch(reject);
        });
    };
    window.ensureSupabase = function() {
        return new Promise((resolve, reject) => {
            if (window.supabase && window.supabase.createClient) { resolve(); return; }
            if (!window.loadScript) { reject(new Error('loadScript not available')); return; }
            window.loadScript('lib/supabase.min.js').then(resolve).catch(reject);
        });
    };
    window.ensureTesseract = function() {
        return new Promise((resolve, reject) => {
            if (window.Tesseract) { resolve(); return; }
            if (!window.loadScript) { reject(new Error('loadScript not available')); return; }
            window.loadScript('lib/tesseract.min.js').then(resolve).catch(reject);
        });
    };
    
    // Global Supabase Credentials for all modules
    window.SUPABASE_URL = 'https://nvnwqcfgpwzheekninle.supabase.co';
    window.SUPABASE_KEY = 'sb_publishable_si9fg-bURw3K5yprgAgifw_Eez79zU0';

    // === 0. Global Security & Layout Protection ===
    // Enforce a 25-character limit on ALL text boxes to prevent layout breakage
    document.querySelectorAll('input[type="text"]').forEach(el => {
        el.setAttribute('maxlength', '25');
    });

    // type="number" ignores maxlength — enforce 25-char cap globally via JS
    document.querySelectorAll('input[type="number"]').forEach(el => {
        el.addEventListener('input', () => {
            if (el.value.length > 25) el.value = el.value.slice(0, 25);
        });
    });

    // === 1. Setup & Table Generation ===
    const tableBody = document.getElementById('distance-table-body');
    const mobileTableBody = document.getElementById('mobile-distance-table-body'); // NEW
    const distances = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];

    // Core inputs that exist in the static HTML
    const inputs = [
        'unit-name', 'call-sign', 'location-name', 'mgrs-coords', 'profile-date',
        'rifle-notes', 'wind-notes', 'scope-notes', 'shooting-angle', 'direction-notes', 'lrf-notes', 'compass-range',
        'compass-range-2', 'box-count-input',
        'sidebar-bal-input-alt', 'sidebar-bal-input-temp', 'sidebar-bal-input-baro',
        // Reload Data
        'caliber', 'zero', 'barrel', 'bullet', 'load', 'powder', 'primer', 'col', 'rings',
        'velocity', 'g1', 'weather', 'targetSize', 'groupSize',
        // Session Info
        'header-notes', 'shooter-name',
        // Solution & Equipment
        'elevation', 'hold-data', 'final-dope'
    ];


    // Generate Distance Table Rows and collect their Input IDs
    distances.forEach((dist) => {
        const clicksId = `clicks-${dist}`;
        const distInputId = `dist-${dist}`;
        const udlrId = `udlr-${dist}`;

        inputs.push(clicksId, udlrId, distInputId);
        
        // 1. Desktop Table Row
        if (tableBody) {
            const row = document.createElement('div');
            row.className = 'grid grid-cols-5 border-b border-black flex-1 items-stretch text-center';
            row.innerHTML = `
                <div class="border-r border-black h-full py-1 flex items-center justify-center font-handwriting text-blue-800 min-w-0 px-0.5 overflow-hidden">
                    <span id="display-${clicksId}" class="break-words leading-none w-full text-center" style="word-break: break-word;"></span>
                </div>
                <div class="col-span-2 border-r border-black h-full py-1 flex items-center justify-center bg-gray-50/30 min-w-0 px-0.5 overflow-hidden">
                    <span id="display-${distInputId}" class="text-sm font-bold break-words leading-none w-full text-center" style="word-break: break-word;">${dist}</span>
                </div>
                <div class="col-span-2 h-full py-1 flex items-center justify-center font-handwriting text-blue-800 min-w-0 px-0.5 overflow-hidden">
                    <span id="display-${udlrId}" class="break-words leading-none w-full text-center" style="word-break: break-word;"></span>
                </div>
            `;
            tableBody.appendChild(row);
        }

        // 2. Mobile Table Row
        if (mobileTableBody) {
            const row = document.createElement('div');
            row.className = 'grid grid-cols-5 border-b border-black flex-1 items-stretch text-center border-l-0 border-r-0';
            row.innerHTML = `
                <div class="border-r border-black h-full py-1 flex items-center justify-center font-handwriting text-blue-800 min-w-0 px-0.5 overflow-hidden">
                    <span id="mobile-display-${clicksId}" class="break-words leading-none w-full text-center" style="word-break: break-word;"></span>
                </div>
                <div class="col-span-2 border-r border-black h-full py-1 flex items-center justify-center bg-gray-50/30 min-w-0 px-0.5 overflow-hidden">
                    <span id="mobile-display-${distInputId}" class="text-[10px] font-bold break-words leading-none w-full text-center" style="word-break: break-word;">${dist}</span>
                </div>
                <div class="col-span-2 h-full py-1 flex items-center justify-center font-handwriting text-blue-800 min-w-0 px-0.5 overflow-hidden">
                    <span id="mobile-display-${udlrId}" class="break-words leading-none w-full text-center" style="word-break: break-word;"></span>
                </div>
            `;
            mobileTableBody.appendChild(row);
        }
    });

    // === 2. Data Syncing (Input -> Card) ===
    inputs.forEach(id => {
        const input = document.getElementById(id);
        const display = document.getElementById(`display-${id}`);
        const mobileDisplay = document.getElementById(`mobile-display-${id}`); // NEW

        if (input) {
            input.addEventListener('input', (e) => {
                if (display) display.textContent = e.target.value;
                if (mobileDisplay) mobileDisplay.textContent = e.target.value; // Sync to mobile field
            });
            // Initial sync
            if (display) display.textContent = input.value;
            if (mobileDisplay) mobileDisplay.textContent = input.value;
        }
    });

    // === 2.1 Barometric Pressure Auto-Formatter ===
    const baroInput = document.getElementById('bal-input-baro');
    if (baroInput) {
        baroInput.addEventListener('input', function(e) {
            // Only format if the user isn't actively backspacing the decimal
            if (e.inputType === 'deleteContentBackward') return;
            
            let val = this.value.replace(/[^0-9]/g, '');
            if (val.length > 2) {
                val = val.substring(0, 2) + '.' + val.substring(2, 4);
            }
            if (this.value !== val) {
                this.value = val;
                // Dispatch input event to trigger the generic sync listener
                this.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
    }

    // === 2.5 Dashboard <-> Sidebar Synchronization ===
    // SYNC DISABLED: Dashboard ballistic solver is fully independent of the range card form

    // === 1B. TARGET CANVAS SYSTEM ===
    function initTargetCanvases(type) {
        try {
            const dCanvas = document.getElementById(`canvas-${type}`);
            const mCanvas = document.getElementById(`mobile-canvas-${type}`);
            if (!dCanvas || !mCanvas) return null;

            let shots = [];

            function drawAll() {
                [dCanvas, mCanvas].forEach(canvas => {
                    const ctx = canvas.getContext('2d');
                    const { width, height } = canvas;
                    const centerX = width / 2;
                    const centerY = height / 2;

                    ctx.clearRect(0, 0, width, height);
                    
                    // Draw Concentric Rings
                    ctx.strokeStyle = '#9ca3af';
                    ctx.lineWidth = 1;
                    [0.2, 0.4, 0.6, 0.8].forEach(scale => {
                        ctx.beginPath();
                        ctx.arc(centerX, centerY, (width / 2) * scale, 0, Math.PI * 2);
                        ctx.stroke();
                    });

                    // Draw Crosshairs
                    ctx.strokeStyle = '#6b7280';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(centerX, 0); ctx.lineTo(centerX, height);
                    ctx.moveTo(0, centerY); ctx.lineTo(width, centerY);
                    ctx.stroke();

                    // Draw Center Point
                    ctx.fillStyle = type === 'shot' ? '#22c55e' : '#3b82f6';
                    ctx.beginPath(); ctx.arc(centerX, centerY, 3, 0, Math.PI * 2); ctx.fill();

                    // Draw Shots
                    shots.forEach((shot, index) => {
                        const x = shot.nx * width;
                        const y = shot.ny * height;
                        ctx.fillStyle = type === 'shot' ? '#ef4444' : '#f97316';
                        ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
                        ctx.fillStyle = '#ffffff';
                        ctx.font = 'bold 7px monospace';
                        ctx.textAlign = 'center';
                        ctx.fillText(index + 1, x, y + 2.5);
                    });
                });
            }

            [dCanvas, mCanvas].forEach(canvas => {
                canvas.addEventListener('mousedown', (e) => {
                    const rect = canvas.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    shots.push({ nx: x / rect.width, ny: y / rect.height });
                    drawAll();
                });
            });

            drawAll();

            return {
                getShots: () => shots,
                setShots: (newShots) => { shots = newShots; drawAll(); },
                clear: () => { shots = []; drawAll(); }
            };
        } catch (e) { return null; }
    }

    window.holdManager = initTargetCanvases('hold');
    window.shotManager = initTargetCanvases('shot');

    // Special handling for date formatting
    const dateInput = document.getElementById('date');
    if (dateInput && !dateInput.value) {
        dateInput.valueAsDate = new Date();
        const displayDate = document.getElementById('display-date');
        const mobileDisplayDate = document.getElementById('mobile-display-date');
        const val = dateInput.value;
        if (displayDate) displayDate.textContent = val;
        if (mobileDisplayDate) mobileDisplayDate.textContent = val;
    }

    // === 3. Canvas Logic (Shots & Holds) ===
    function calculateGroupMetrics(points) {
        if (points.length < 5) return null;
        
        // SAFETY THROTTLE: Max 12 shots for best subset discovery to prevent 2^N exponential lockups
        const workingSet = points.slice(0, 12);
        const n = workingSet.length;
        
        let minSpread = Infinity;
        let bestSubset = [];

        // Efficient Combination Generator: N choose 5
        function getCombinations(idx, currentSubset) {
            if (currentSubset.length === 5) {
                let maxDist = 0;
                for (let a = 0; a < 5; a++) {
                    for (let b = a + 1; b < 5; b++) {
                        const dx = currentSubset[a].nx - currentSubset[b].nx;
                        const dy = currentSubset[a].ny - currentSubset[b].ny;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > maxDist) maxDist = dist;
                    }
                }
                if (maxDist < minSpread) {
                    minSpread = maxDist;
                    bestSubset = [...currentSubset];
                }
                return;
            }
            for (let i = idx; i < n; i++) {
                currentSubset.push(workingSet[i]);
                getCombinations(i + 1, currentSubset);
                currentSubset.pop();
            }
        }

        getCombinations(0, []);
        return bestSubset.length === 5 ? { minSpread, bestSubset } : null;
    }

    // Unified target canvas initialization with mirroring
    function initTargetCanvases(desktopId, mobileId, type, clearBtnId) {
        const dCanvas = document.getElementById(desktopId);
        const mCanvas = document.getElementById(mobileId);
        if (!dCanvas || !mCanvas) return;

        const dCtx = dCanvas.getContext('2d');
        const mCtx = mCanvas.getContext('2d');
        let shots = [];

        function drawAll() {
            [dCanvas, mCanvas].forEach(canvas => {
                const ctx = canvas.getContext('2d');
                const { width, height } = canvas;
                const centerX = width / 2;
                const centerY = height / 2;

                ctx.clearRect(0, 0, width, height);
                ctx.strokeStyle = '#9ca3af';
                ctx.lineWidth = 1;

                [0.2, 0.4, 0.6, 0.8].forEach(scale => {
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, (width / 2) * scale, 0, Math.PI * 2);
                    ctx.stroke();
                });

                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(centerX, 0); ctx.lineTo(centerX, height);
                ctx.moveTo(0, centerY); ctx.lineTo(width, centerY);
                ctx.stroke();

                ctx.fillStyle = '#000';
                for (let i = 1; i < 5; i++) {
                    const offset = (width / 2) * (i * 0.2);
                    ctx.beginPath(); ctx.arc(centerX + offset, centerY, 2, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(centerX - offset, centerY, 2, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(centerX, centerY + offset, 2, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(centerX, centerY - offset, 2, 0, Math.PI * 2); ctx.fill();
                }

                if (type === 'shot') {
                    ctx.fillStyle = '#22c55e';
                    ctx.beginPath(); ctx.arc(centerX, centerY, 4, 0, Math.PI * 2); ctx.fill();
                }

                shots.forEach((shot, index) => {
                    const x = shot.nx * width;
                    const y = shot.ny * height;
                    
                    if (index === 0 && type === 'shot') {
                        // COLD BORE SHOT (Shot #1) in Blue
                        ctx.fillStyle = '#3b82f6';
                        ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
                        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke();
                    } else {
                        // Standard Shots in Theme Red
                        ctx.fillStyle = '#ef4444';
                        ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
                    }

                    // Number above shot
                    ctx.fillStyle = '#000000';
                    ctx.font = 'bold 8px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(index + 1, x, y - 6);
                });

                // TIGHTEST 5-SHOT GROUP ANALYZER & OVERLAY
                if (type === 'shot' && shots.length >= 5) {
                    const metrics = calculateGroupMetrics(shots);
                    if (metrics) {
                        const moa = (metrics.minSpread * 10).toFixed(2);
                        let gradeText = '🥉 C-CLASS RECRUIT';
                        if (moa < 0.5) gradeText = '👑 S-CLASS SNIPER';
                        else if (moa < 1.0) gradeText = '🥇 A-CLASS EXPERT';
                        else if (moa < 1.5) gradeText = '🥈 B-CLASS MARKSMAN';

                        // Draw best 5-shot subset connect lines (subtle overlay)
                        ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
                        ctx.lineWidth = 1;
                        ctx.setLineDash([2, 2]);
                        ctx.beginPath();
                        metrics.bestSubset.forEach((pt, i) => {
                            const px = pt.nx * width;
                            const py = pt.ny * height;
                            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                        });
                        ctx.closePath();
                        ctx.stroke();
                        ctx.setLineDash([]); // Reset line dash

                        // Update HUD display
                        const moaEl = document.getElementById('best-group-moa');
                        const gradeEl = document.getElementById('shooter-grade');
                        const hudEl = document.getElementById('shot-metrics-hud');
                        if (moaEl) moaEl.textContent = moa;
                        if (gradeEl) {
                            gradeEl.textContent = gradeText;
                        }
                        if (hudEl) hudEl.classList.remove('hidden');
                    }
                } else if (type === 'shot') {
                    const hudEl = document.getElementById('shot-metrics-hud');
                    if (hudEl) hudEl.classList.add('hidden');
                }
            });
        }

        const handlePointer = (e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const nx = (e.clientX - rect.left) / rect.width;
            const ny = (e.clientY - rect.top) / rect.height;

            if (e.button === 2) {
                shots.pop();
            } else if (shots.length < 20) {
                shots.push({ nx, ny });
            }
            drawAll();
        };

        [dCanvas, mCanvas].forEach(canvas => {
            canvas.getShots = () => shots;
            canvas.setShots = (newShots) => { shots = newShots; drawAll(); };
            canvas.addEventListener('click', handlePointer);
            canvas.addEventListener('contextmenu', e => e.preventDefault());
        });

        if (clearBtnId) {
            const clearBtn = document.getElementById(clearBtnId);
            if (clearBtn) clearBtn.addEventListener('click', () => { shots = []; drawAll(); });
        }
        drawAll();
    }

    initTargetCanvases('canvas-hold', 'mobile-canvas-hold', 'hold', 'clear-hold-btn');
    initTargetCanvases('canvas-shot', 'mobile-canvas-shot', 'shot', 'clear-shot-btn');

    // === 4. Profile Management & Library ===
    const profileSelect = document.getElementById('profileSelect');
    const saveProfileBtn = document.getElementById('saveProfileBtnManual');
    const deleteProfileBtn = document.getElementById('deleteProfileBtn');

    window.deleteRangeProfile = async function(name) {
        if (!name) return;
        if (!confirm(`PERMANENTLY DELETE "${name.toUpperCase()}" FROM SECURE CACHE?`)) return;

        try {
            // 1. Remove from memory cache
            if (window.loadedProfilesCache) delete window.loadedProfilesCache[name];
            
            // 2. Remove from IndexedDB
            if (window.TRC_IDB) {
                await window.TRC_IDB.delete('rangeCardProfiles', name);
            } else {
                // Fallback for manual deletion from LS
                const ps = JSON.parse(localStorage.getItem('rangeCardProfiles') || '{}');
                delete ps[name];
                localStorage.setItem('rangeCardProfiles', JSON.stringify(ps));
            }

            // 3. Visual sync
            if (window.updateProfileList) window.updateProfileList();
            if (window.refreshSatArchiveGrid) window.refreshSatArchiveGrid();
            if (window.refreshDopeCacheGrid) window.refreshDopeCacheGrid();

            // Reset preview states if deleted item was being viewed
            const prevName = document.getElementById('previewName');
            if (prevName && prevName.textContent === name) {
                document.getElementById('profilePreview').classList.add('hidden');
                document.getElementById('noSelection').classList.remove('hidden');
            }

            // alert("Successfully Expunged.");
        } catch (err) {
            console.error("Failed to delete profile:", err);
            alert("CRITICAL: Failed to erase cache entry.");
        }
    };

    // Wire up zombie global button!
    if (deleteProfileBtn) {
        deleteProfileBtn.onclick = () => {
            const target = document.getElementById('previewName')?.textContent;
            if(target) window.deleteRangeProfile(target);
        };
    }
    const clearFormBtn = document.getElementById('clearFormBtn');
    const libraryModal = document.getElementById('libraryModal');
    const libraryList = document.getElementById('libraryList');
    const openLibraryBtn = document.getElementById('openLibraryBtn');
    const closeLibraryBtn = document.getElementById('closeLibraryBtn');

    if (clearFormBtn) {
        clearFormBtn.onclick = () => {
            if (confirm("Clear all tactical data and start fresh? This cannot be undone.")) {
                // Reset text inputs
                inputs.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        // Keep the default distance values
                        if (id.startsWith('dist-')) {
                            // do nothing to the distance labels themselves (100, 200, etc)
                        } else {
                            el.value = '';
                            el.dispatchEvent(new Event('input'));
                        }
                    }
                });

                // Reset specific defaults
                if (dateInput) {
                    dateInput.valueAsDate = new Date();
                    dateInput.dispatchEvent(new Event('input'));
                }

                // Clear Canvases by triggering clicks on existing clear buttons
                ['clear-hold-btn', 'clear-shot-btn', 'clear-pencil', 'clear-grade'].forEach(id => {
                    const btn = document.getElementById(id);
                    if (btn) btn.click();
                });

                // Reset Calculator
                if (window.clearCalc) window.clearCalc();

                // Clear Compass lines (manually trigger redraw)
                if (window.drawCompassVector) window.drawCompassVector();

                // === EXTENDED CLEAR: RECON MAPPER ===
                // Clear Inputs & trigger displays
                const recName = document.getElementById('recon-scenario-name');
                const recRep = document.getElementById('recon-report');
                if (recName) { recName.value = ''; recName.dispatchEvent(new Event('input')); }
                if (recRep) { recRep.value = ''; recRep.dispatchEvent(new Event('input')); }

                // Remove map markers
                document.querySelectorAll('.recon-marker').forEach(m => m.remove());

                // Clear drawing canvases
                ['clear-recon-drawings', 'clear-recon-pencil'].forEach(id => {
                    const b = document.getElementById(id);
                    if (b) b.click();
                });

                // Reset Map background to default grid
                const recBg = document.getElementById('recon-bg-image');
                const recGrid = document.getElementById('recon-default-grid');
                const mobBg = document.getElementById('mobile-recon-bg-image');
                const mobGrid = document.getElementById('mobile-recon-default-grid');
                const recUpload = document.getElementById('map-bg-upload');

                if (recBg) { recBg.src = ''; recBg.classList.add('hidden'); }
                if (recGrid) recGrid.classList.remove('hidden');
                if (mobBg) { mobBg.src = ''; mobBg.classList.add('hidden'); }
                if (mobGrid) mobGrid.classList.remove('hidden');
                if (recUpload) recUpload.value = '';

                alert("Tactical data cleared.");
            }
        };
    }

    window.loadedProfilesCache = {};
    window.currentLibraryFilter = 'all';

    window.getProfiles = function() { return window.loadedProfilesCache || {}; };

    if (window.TRC_IDB) {
        window.TRC_IDB.migrateFromLocalStorage().then(() => {
            return window.TRC_IDB.getAll('rangeCardProfiles');
        }).then(profiles => {
            window.loadedProfilesCache = profiles || {};
            if (window.updateProfileList) window.updateProfileList();
        }).catch(err => {
            console.error("IDB load failed, falling back to localStorage:", err);
            window.loadedProfilesCache = JSON.parse(localStorage.getItem('rangeCardProfiles') || '{}');
            if (window.updateProfileList) window.updateProfileList();
        });
    } else {
        window.loadedProfilesCache = JSON.parse(localStorage.getItem('rangeCardProfiles') || '{}');
    }

    window.updateProfileList = function() {
        const ps = getProfiles();
        // Update hidden select
        profileSelect.innerHTML = '<option value="">Select a profile...</option>';
        // Update Library List
        if (libraryList) libraryList.innerHTML = '';

        let names = Object.keys(ps).sort().reverse();
        if (window.currentLibraryFilter === 'zero') {
            names = names.filter(name => !ps[name].isReconScenario);
        } else if (window.currentLibraryFilter === 'recon') {
            names = names.filter(name => !!ps[name].isReconScenario);
        }
        names.forEach((name, index) => {
            // Dropdown
            const opt = document.createElement('option');
            opt.value = name; opt.textContent = name;
            profileSelect.appendChild(opt);

            // Library Item
            if (libraryList) {
                const item = document.createElement('div');
                item.className = "p-4 bg-gray-800/30 hover:bg-neon-green/10 rounded-lg border border-gray-800 hover:border-neon-green/40 cursor-pointer transition-all group";
                item.innerHTML = `
                    <div class="flex items-center justify-between gap-3">
                        <div class="min-w-0 flex items-center gap-3">
                            <span class="text-[9px] font-mono text-neon-green opacity-40">${names.length - index}.</span>
                            <div class="min-w-0">
                                <div class="font-bold text-sm text-gray-200 truncate pr-4 group-hover:text-white">${name}</div>
                                <div class="text-[9px] text-gray-400 font-mono uppercase mt-1">
                                    ${ps[name].isReconScenario ? '🗺️ RECON SITREP' : (ps[name].caliber || 'No Caliber')} • ${ps[name].isReconScenario ? (ps[name].timestamp ? new Date(ps[name].timestamp).toLocaleDateString() : '--') : (ps[name].date || '--')}
                                </div>
                            </div>
                        </div>
                        <i data-lucide="chevron-right" class="w-4 h-4 text-gray-700 group-hover:text-neon-green"></i>
                    </div>
                `;
                item.onclick = () => previewProfile(name);
                libraryList.appendChild(item);
            }
        });
        if (window.lucide) window.lucide.createIcons();
    }

    window.previewProfile = function(name) {
        const ps = getProfiles();
        const data = ps[name];
        if (!data) return;

        const emptyState = document.getElementById('noSelection');
        if (emptyState) emptyState.classList.add('hidden');

        document.getElementById('profilePreview').classList.remove('hidden');
        document.getElementById('previewName').textContent = name;
        
        if (data.isReconScenario) {
            document.getElementById('previewCaliber').textContent = `🗺️ RECON SCENARIO SITREP`;
            document.getElementById('prevDate').textContent = data.timestamp ? new Date(data.timestamp).toLocaleDateString() : '--';
        } else {
            document.getElementById('previewCaliber').textContent = `${data.caliber || '---'} • ${data.bullet || '---'}`;
            document.getElementById('prevDate').textContent = data.date || '--';
        }

        // Populate Snapshot
        const img = document.getElementById('prevImage');
        const noImg = document.getElementById('noImageMsg');
        if (data.snapshot) {
            img.src = data.snapshot;
            img.classList.remove('hidden');
            noImg.classList.add('hidden');
        } else {
            img.src = "";
            img.classList.add('hidden');
            noImg.classList.remove('hidden');
        }

        // Expanded Data Fields
        document.getElementById('prevVel').textContent = data.velocity || '--';
        document.getElementById('prevZero').textContent = data.zero || '--';
        document.getElementById('prevBarrel').textContent = data.barrel || '--';
        document.getElementById('prevPowder').textContent = data.powder || '--';
        document.getElementById('prevLoad').textContent = data.load || '--';
        document.getElementById('prevCOL').textContent = data.col || '--';
        document.getElementById('prevRings').textContent = data.rings || '--';
        document.getElementById('prevG1').textContent = data.g1 || '--';
        document.getElementById('prevHeaderNotes').textContent = data['header-notes'] || '--';
        document.getElementById('prevShooter').textContent = data['shooter-name'] || '--';
        document.getElementById('prevTime').textContent = data.time || '--';
        document.getElementById('prevElev').textContent = data.elevation || '--';
        document.getElementById('prevHold').textContent = data['hold-data'] || '--';
        document.getElementById('prevFinal').textContent = data['final-dope'] || '--';
        document.getElementById('prevWeather').textContent = data.weather || '--';
        document.getElementById('prevRifleNotes').textContent = data['rifle-notes'] || '--';

        // Distance Table (100-1000)
        const dTable = document.getElementById('prevDistanceTable');
        if (dTable) {
            dTable.innerHTML = '';
            [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].forEach(d => {
                const clicks = data[`clicks-${d}`] || '--';
                const udlr = data[`udlr-${d}`] || '--';
                const row = document.createElement('div');
                row.className = "p-2 bg-black/60 border border-gray-800 rounded-lg flex flex-col items-center justify-center transition-all hover:border-neon-green/30";
                row.innerHTML = `
                    <span class="text-[7px] text-gray-400 font-bold uppercase tracking-tighter">${d}Y</span>
                    <span class="text-[11px] text-neon-green font-black leading-tight">${clicks}</span>
                    <span class="text-[7px] text-blue-400/70 font-bold uppercase">${udlr}</span>
                `;
                dTable.appendChild(row);
            });
        }

        // Toggle View Logic
        const viewDataBtn = document.getElementById('viewDataBtn');
        const viewImageBtn = document.getElementById('viewImageBtn');
        const dataView = document.getElementById('dataPreview');
        const imgView = document.getElementById('snapshotPreview');

        const activeClass = "bg-neon-green text-black";
        const inactiveClass = "text-gray-400 hover:text-white";

        viewDataBtn.onclick = () => {
            dataView.classList.remove('hidden');
            imgView.classList.add('hidden');
            viewDataBtn.className = `px-4 py-1.5 text-[10px] font-bold uppercase rounded transition-all ${activeClass}`;
            viewImageBtn.className = `px-4 py-1.5 text-[10px] font-bold uppercase rounded transition-all ${inactiveClass}`;
        };

        viewImageBtn.onclick = () => {
            dataView.classList.add('hidden');
            imgView.classList.remove('hidden');
            viewImageBtn.className = `px-4 py-1.5 text-[10px] font-bold uppercase rounded transition-all ${activeClass}`;
            viewDataBtn.className = `px-4 py-1.5 text-[10px] font-bold uppercase rounded transition-all ${inactiveClass}`;
        };

        // Default to Image (Visual) view as requested
        viewImageBtn.click();

        // Actions
        document.getElementById('loadSelectedBtn').onclick = () => {
            loadProfile(name);
            window.closeLibrary();
        };
        document.getElementById('injectReconBtn').onclick = () => {
            const ps = getProfiles();
            const data = ps[name];
            if (!data) return;

            const toggleBtn = document.getElementById('toggleReconMapperBtn');
            const isCurrentlyActive = toggleBtn && toggleBtn.textContent.includes('BACK TO RANGE CARD');
            if (!isCurrentlyActive && toggleBtn) {
                toggleBtn.click();
            }

            const rScenarioInput = document.getElementById('recon-scenario-name');
            const rReportInput = document.getElementById('recon-report');
            if (rScenarioInput) { rScenarioInput.value = data.name || ''; rScenarioInput.dispatchEvent(new Event('input')); }
            if (rReportInput) { rReportInput.value = data.report || ''; rReportInput.dispatchEvent(new Event('input')); }

            const rBgImage = document.getElementById('recon-bg-image');
            const mBgImage = document.getElementById('mobile-recon-bg-image');
            const rDefaultGrid = document.getElementById('recon-default-grid');
            const mDefaultGrid = document.getElementById('mobile-recon-default-grid');

            if (rBgImage) {
                const mapSrc = data.snapshot || data.bgImage || data.image;
                if (mapSrc) {
                    rBgImage.src = mapSrc;
                    rBgImage.classList.remove('hidden');
                    if (rDefaultGrid) rDefaultGrid.classList.add('hidden');
                    if (mBgImage) { mBgImage.src = mapSrc; mBgImage.classList.remove('hidden'); }
                    if (mDefaultGrid) mDefaultGrid.classList.add('hidden');
                } else {
                    rBgImage.classList.add('hidden'); rBgImage.src = '';
                    if (rDefaultGrid) rDefaultGrid.classList.remove('hidden');
                    if (mBgImage) { mBgImage.classList.add('hidden'); mBgImage.src = ''; }
                    if (mDefaultGrid) mDefaultGrid.classList.remove('hidden');
                }
            }

            document.querySelectorAll('.recon-marker').forEach(m => m.remove());
            if (data.markers && Array.isArray(data.markers)) {
                data.markers.forEach(m => {
                    if (typeof window.createMarker === 'function') {
                        window.createMarker(m.x, m.y, m.emoji, m.note || '');
                    }
                });
            }

            const rCanvas = document.getElementById('recon-canvas');
            const mCanvas = document.getElementById('mobile-recon-canvas');
            if (rCanvas) {
                const rCtx = rCanvas.getContext('2d');
                rCtx.clearRect(0, 0, rCanvas.width, rCanvas.height);
                if (mCanvas) mCanvas.getContext('2d').clearRect(0, 0, mCanvas.width, mCanvas.height);
                
                if (data.drawing) {
                    const img = new Image();
                    img.onload = () => {
                        rCtx.drawImage(img, 0, 0);
                        if (mCanvas) mCanvas.getContext('2d').drawImage(img, 0, 0);
                    };
                    img.src = data.drawing;
                }
            }

            window.closeLibrary();
        };
        document.getElementById('deleteSelectedBtn').onclick = () => {
            if (confirm(`Trash record "${name}"?`)) {
                const ps_new = getProfiles();
                delete ps_new[name];
                if (window.TRC_IDB) {
                    window.TRC_IDB.delete('rangeCardProfiles', name).then(() => {
                        updateProfileList();
                        resetPreview();
                    }).catch(err => {
                        console.error("IDB delete failed:", err);
                        updateProfileList();
                        resetPreview();
                    });
                } else {
                    localStorage.setItem('rangeCardProfiles', JSON.stringify(ps_new));
                    updateProfileList();
                    resetPreview();
                }
            }
        };
    }

    function resetPreview() {
        document.getElementById('profilePreview').classList.add('hidden');
        const emptyState = document.getElementById('noSelection');
        if (emptyState) emptyState.classList.remove('hidden');
    }

    function loadProfile(name) {
        const ps = getProfiles();
        const data = ps[name];
        if (!data) return;

        if (data.isReconScenario) {
            const toggleBtn = document.getElementById('toggleReconMapperBtn');
            const isCurrentlyActive = toggleBtn && toggleBtn.textContent.includes('BACK TO RANGE CARD');
            if (!isCurrentlyActive && toggleBtn) {
                toggleBtn.click();
            }

            const rScenarioInput = document.getElementById('recon-scenario-name');
            const rReportInput = document.getElementById('recon-report');
            
            if (rScenarioInput) {
                rScenarioInput.value = data.name || '';
                rScenarioInput.dispatchEvent(new Event('input'));
            }
            if (rReportInput) {
                rReportInput.value = data.report || '';
                rReportInput.dispatchEvent(new Event('input'));
            }

            const rBgImage = document.getElementById('recon-bg-image');
            const rDefaultGrid = document.getElementById('recon-default-grid');
            const mBgImage = document.getElementById('mobile-recon-bg-image');
            const mDefaultGrid = document.getElementById('mobile-recon-default-grid');

            if (rBgImage) {
                if (data.bgImage) {
                    rBgImage.src = data.bgImage;
                    rBgImage.classList.remove('hidden');
                    if (rDefaultGrid) rDefaultGrid.classList.add('hidden');
                    if (mBgImage) {
                        mBgImage.src = data.bgImage;
                        mBgImage.classList.remove('hidden');
                    }
                    if (mDefaultGrid) mDefaultGrid.classList.add('hidden');
                } else {
                    rBgImage.classList.add('hidden');
                    rBgImage.src = '';
                    if (rDefaultGrid) rDefaultGrid.classList.remove('hidden');
                    if (mBgImage) {
                        mBgImage.classList.add('hidden');
                        mBgImage.src = '';
                    }
                    if (mDefaultGrid) mDefaultGrid.classList.remove('hidden');
                }
            }

            document.querySelectorAll('.recon-marker').forEach(m => m.remove());
            if (data.markers && Array.isArray(data.markers)) {
                data.markers.forEach(m => {
                    if (typeof window.createMarker === 'function') {
                        window.createMarker(m.x, m.y, m.emoji, m.note || '');
                    }
                });
            }

            const rCanvas = document.getElementById('recon-canvas');
            const mCanvas = document.getElementById('mobile-recon-canvas');

            if (rCanvas) {
                const rCtx = rCanvas.getContext('2d');
                const mCtx = mCanvas ? mCanvas.getContext('2d') : null;
                rCtx.clearRect(0, 0, rCanvas.width, rCanvas.height);
                if (mCtx) mCtx.clearRect(0, 0, mCanvas.width, mCanvas.height);
                if (data.drawing) {
                    const img = new Image();
                    img.onload = () => {
                        rCtx.drawImage(img, 0, 0);
                        if (mCtx) mCtx.drawImage(img, 0, 0);
                    };
                    img.src = data.drawing;
                }
            }
            return;
        }

        const toggleBtn = document.getElementById('toggleReconMapperBtn');
        const isCurrentlyActive = toggleBtn && toggleBtn.textContent.includes('BACK TO RANGE CARD');
        if (isCurrentlyActive && toggleBtn) {
            toggleBtn.click();
        }
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.value = data[id] || '';
                el.dispatchEvent(new Event('input'));
            }
        });
        profileSelect.value = name;

        // Restore interactive clicked coordinates and redraw them instantly!
        const canvasShot = document.getElementById('canvas-shot');
        const canvasHold = document.getElementById('canvas-hold');
        if (canvasShot && canvasShot.setShots) canvasShot.setShots(data.shotPoints || []);
        if (canvasHold && canvasHold.setShots) canvasHold.setShots(data.holdPoints || []);

        // Restore pencil and grade drawings onto both desktop and mobile canvases
        ['pencil-canvas', 'mobile-pencil-canvas'].forEach(id => {
            const canvas = document.getElementById(id);
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                if (data.pencilDrawing) {
                    const img = new Image();
                    img.onload = () => ctx.drawImage(img, 0, 0);
                    img.src = data.pencilDrawing;
                }
            }
        });
        ['grade-canvas', 'mobile-grade-canvas'].forEach(id => {
            const canvas = document.getElementById(id);
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                if (data.gradeDrawing) {
                    const img = new Image();
                    img.onload = () => ctx.drawImage(img, 0, 0);
                    img.src = data.gradeDrawing;
                }
            }
        });
    }

    window.openLibrary = function() {
        libraryModal.classList.remove('hidden');
        const modalTitle = document.getElementById('libraryModalTitle');
        if (modalTitle) {
            modalTitle.textContent = 'TACTICAL DATA REPOSITORY';
        }
        window.updateProfileList();
        resetPreview();
    };
    window.closeLibrary = function() { libraryModal.classList.add('hidden'); };

    openLibraryBtn.onclick = () => {
        window.currentLibraryFilter = 'all';
        window.openLibrary();
    };
    closeLibraryBtn.onclick = window.closeLibrary;

    saveProfileBtn.onclick = () => {
        const name = prompt("Enter profile name to save tactical record:");
        if (!name) return;

        const existingProfiles = getProfiles();
        const lowerName = name.trim().toLowerCase();
        const nameExists = Object.keys(existingProfiles).some(k => k.trim().toLowerCase() === lowerName);
        if (nameExists) {
            alert("NAME ALREADY EXIST");
            return;
        }

        const dopeCount = Object.keys(existingProfiles).filter(k => !existingProfiles[k].isReconScenario).length;
        if (dopeCount >= 20) {
            alert("LIBRARY FULL: DOPE CACHE CAPACITY REACHED (20/20). PLEASE DELETE OLD CARDS FIRST.");
            return;
        }

        const container = document.getElementById('card-container');
        const previewPanel = document.getElementById('previewPanel');

        // Save current states to restore later
        const isVisuallyHidden = previewPanel.classList.contains('opacity-0');
        const originalTransform = container.style.transform;
        const originalScrollY = window.scrollY;

        // PRE-CAPTURE NORMALIZATION
        // 1. Show panel if hidden
        if (isVisuallyHidden) {
            previewPanel.classList.remove('opacity-0', 'pointer-events-none', 'absolute');
            previewPanel.classList.add('flex');
        }
        // 2. Reset scaling transform to capture at full resolution
        container.style.transform = 'none';
        // 3. Scroll to top to ensure coordinate sync
        window.scrollTo(0, 0);

        // EXTRA SAFETY: Disable transitions temporarily to avoid animation interference with html2canvas
        const originalTransition = previewPanel.style.transition;
        previewPanel.style.transition = 'none';

        // INDUSTRIAL FIX: Force fixed capture context
        document.body.classList.add('is-capturing');

        // DELAY for layout reflow and animation suppression
        setTimeout(() => {
            html2canvas(container, {
                scale: Math.max(window.devicePixelRatio || 2, 2),
                backgroundColor: '#ffffff',
                useCORS: true,
                logging: true,
                scrollX: 0,
                scrollY: 0
            }).then(canvas => {
                // Restore context
                document.body.classList.remove('is-capturing');
                previewPanel.style.transition = originalTransition;

                // POST-CAPTURE RESTORATION
                if (isVisuallyHidden) {
                    previewPanel.classList.add('opacity-0', 'pointer-events-none', 'absolute');
                    previewPanel.classList.remove('flex');
                }
                container.style.transform = originalTransform;
                window.scrollTo(0, originalScrollY);

                const snapshot = canvas.toDataURL("image/jpeg", 0.95);
                const data = { snapshot };

                inputs.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) data[id] = el.value;
                });

                // Read and save interactive canvas coordinates
                const canvasShot = document.getElementById('canvas-shot');
                const canvasHold = document.getElementById('canvas-hold');
                if (canvasShot && canvasShot.getShots) data.shotPoints = canvasShot.getShots();
                if (canvasHold && canvasHold.getShots) data.holdPoints = canvasHold.getShots();

                // Save drawings as data URLs
                const pCanvas = document.getElementById('pencil-canvas');
                const gCanvas = document.getElementById('grade-canvas');
                if (pCanvas) data.pencilDrawing = pCanvas.toDataURL();
                if (gCanvas) data.gradeDrawing = gCanvas.toDataURL();

                const ps = getProfiles();
                ps[name] = data;
                
                const postSave = () => {
                    window.currentLibraryFilter = 'all';
                    window.openLibrary();
                    window.previewProfile(name);
                };

                if (window.TRC_IDB) {
                    window.TRC_IDB.set('rangeCardProfiles', name, data).then(() => {
                        postSave();
                    }).catch(err => {
                        console.error("IDB save failed, falling back to localStorage:", err);
                        localStorage.setItem('rangeCardProfiles', JSON.stringify(ps));
                        postSave();
                    });
                } else {
                    localStorage.setItem('rangeCardProfiles', JSON.stringify(ps));
                    postSave();
                }
            }).catch(err => {
                document.body.classList.remove('is-capturing');
                previewPanel.style.transition = originalTransition;
                if (isVisuallyHidden) {
                    previewPanel.classList.add('opacity-0', 'pointer-events-none', 'absolute');
                    previewPanel.classList.remove('flex');
                }
                container.style.transform = originalTransform;
                window.scrollTo(0, originalScrollY);
                console.error("Capture failure:", err);
                
                if (err && err.name === 'QuotaExceededError' || err.toString().includes('exceeded the quota')) {
                    alert("CRITICAL: Browser memory is 100% full! You must delete old Dope Cards or Recon Maps from the library before you can save this one.");
                } else {
                    alert("Record save failed. Error: " + (err ? (err.stack || err.message || err) : "Unknown error"));
                }
            });
        }, 500); // Increased to 500ms for absolute stability
    };

    updateProfileList();
    // === 5. Compass Vector Visualization ===
    const compassCanvas = document.getElementById('compass-vector');
    const mobileCompassCanvas = document.getElementById('mobile-compass-vector'); // NEW

    const targetConfigs = [
        { angleId: 'shooting-angle', rangeId: 'compass-range' }
    ];

    window.drawCompassVector = function () {
        [compassCanvas, mobileCompassCanvas].forEach(canvas => {
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const { width, height } = canvas;
            const centerX = width / 2, centerY = height / 2;
            ctx.clearRect(0, 0, width, height);

            const maxRadius = (Math.min(width, height) / 2) - 15;

            targetConfigs.forEach((config, index) => {
                const ai = document.getElementById(config.angleId);
                const ri = document.getElementById(config.rangeId);
                if (!ai || !ri) return;

                // Parse Angle
                let ang = parseFloat(ai.value);
                if (isNaN(ang)) {
                    const m = (ai.value ? String(ai.value) : '').match(/\d+/);
                    if (m) ang = parseFloat(m[0]);
                }
                if (isNaN(ang)) return;

                // Parse Range for Scaling (0 - 1000 yds)
                let rangeVal = 0;
                const rangeMatch = (ri.value ? String(ri.value) : '').match(/\d+/);
                if (rangeMatch) rangeVal = parseFloat(rangeMatch[0]);

                // Calculate Radius based on range (Min 15% for visibility, Max 100%)
                const scaleFactor = Math.min(Math.max(rangeVal / 1000, 0.15), 1.0);
                const currentRadius = maxRadius * scaleFactor;

                const rads = (ang - 90) * (Math.PI / 180);
                const ex = centerX + currentRadius * Math.cos(rads);
                const ey = centerY + currentRadius * Math.sin(rads);

                // Draw Dotted Line
                ctx.beginPath();
                ctx.setLineDash([4, 4]);
                ctx.strokeStyle = '#888';
                ctx.lineWidth = 1;
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(ex, ey);
                ctx.stroke();
                ctx.setLineDash([]);

                // Draw X Marker
                const xs = 5;
                ctx.lineWidth = 2.5;
                ctx.strokeStyle = '#000';
                ctx.beginPath();
                ctx.moveTo(ex - xs, ey - xs); ctx.lineTo(ex + xs, ey + xs);
                ctx.moveTo(ex + xs, ey - xs); ctx.lineTo(ex - xs, ey + xs);
                ctx.stroke();

                // Draw Label
                const txt = ri.value;
                if (txt) {
                    ctx.font = 'bold 8px Inter, sans-serif';
                    ctx.textBaseline = 'middle';

                    // Base positioning relative to X marker (index 0 is T1, index 1 is Location/T2)
                    let baseAlign = (index === 1) ? 'left' : 'right';
                    let labelX = (index === 1) ? ex + 10 : ex - 10;
                    let labelY = ey;

                    // Small vertical stagger to prevent overlap if angles are identical
                    if (index === 0) labelY -= 8;

                    // Measure text to draw a small background for legibility
                    const metrics = ctx.measureText(txt);
                    const padding = 2;
                    const bgWidth = metrics.width + (padding * 2);
                    const bgHeight = 10;

                    // Calculate initial background left (X) coordinate based on alignment
                    let bgX = labelX;
                    if (baseAlign === 'right') bgX -= metrics.width;
                    let bgY = labelY - 5;

                    // BULLETPROOF BOUNDARY CLAMPING: Prevent text/background from running off the canvas
                    bgX = Math.max(12, Math.min(bgX, width - bgWidth - 12));
                    bgY = Math.max(12, Math.min(bgY, height - bgHeight - 12));

                    // Draw background rectangle
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
                    ctx.fillRect(bgX, bgY, bgWidth, bgHeight);

                    // Draw the text perfectly aligned inside the clamped background
                    ctx.textAlign = 'left';
                    ctx.fillStyle = '#1e3a8a';
                    ctx.fillText(txt, bgX + padding, bgY + 5);
                }
            });
        });
    }

    targetConfigs.forEach(c => {
        [c.angleId, c.rangeId].forEach(id => {
            const el = document.getElementById(id);
            if (el) ['input', 'change', 'blur'].forEach(ev => el.addEventListener(ev, window.drawCompassVector));
        });
    });
    setTimeout(window.drawCompassVector, 500);

    // === 6. Pencil Tool ===
    const canvases = [
        document.getElementById('pencil-canvas'),
        document.getElementById('mobile-pencil-canvas')
    ].filter(canvas => canvas !== null);

    const pencilToggle = document.getElementById('pencil-toggle');

    if (canvases.length > 0 && pencilToggle) {
        const contexts = canvases.map(c => c.getContext('2d'));
        let drawing = false;

        pencilToggle.addEventListener('change', (e) => {
            canvases.forEach(canvas => {
                canvas.classList.toggle('pointer-events-none', !e.target.checked);
                canvas.style.cursor = e.target.checked ? 'crosshair' : 'default';
            });
        });

        const getNormalizedPos = (e, canvas) => {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return { nx: (clientX - rect.left) / rect.width, ny: (clientY - rect.top) / rect.height };
        };

        const start = (e) => {
            if (!pencilToggle.checked) return;
            if (e.touches && e.touches.length > 1) return; // 2 fingers = pinch-zoom
            drawing = true;
            const { nx, ny } = getNormalizedPos(e, e.currentTarget);
            canvases.forEach((canvas, idx) => {
                const pCtx = contexts[idx];
                pCtx.beginPath(); pCtx.lineWidth = 1.0; pCtx.lineCap = 'round';
                pCtx.strokeStyle = '#6b7280';
                pCtx.moveTo(nx * canvas.width, ny * canvas.height);
            });
        };

        const move = (e) => {
            if (e.touches && e.touches.length > 1) { drawing = false; return; } // 2 fingers = zoom
            if (!drawing) return;
            const { nx, ny } = getNormalizedPos(e, e.currentTarget);
            canvases.forEach((canvas, idx) => {
                const pCtx = contexts[idx];
                pCtx.lineTo(nx * canvas.width, ny * canvas.height); pCtx.stroke();
            });
        };

        const stop = () => { if (!drawing) return; contexts.forEach(ctx => ctx.closePath()); drawing = false; };

        canvases.forEach(canvas => {
            canvas.addEventListener('mousedown', start);
            canvas.addEventListener('mousemove', move);
            canvas.addEventListener('mouseup', stop);
            canvas.addEventListener('mouseleave', stop);
            // passive:true = browser gesture pipeline stays open → pinch-zoom always works
            canvas.addEventListener('touchstart', start, { passive: true });
            canvas.addEventListener('touchmove', move, { passive: true });
            canvas.addEventListener('touchend', stop, { passive: true });
        });

        document.getElementById('clear-pencil').addEventListener('click', () => {
            if (confirm('Clear all drawings?')) {
                contexts.forEach((pCtx, i) => pCtx.clearRect(0, 0, canvases[i].width, canvases[i].height));
            }
        });
    }

    // === 6b. Grade Tool ===
    const gradeCanvases = [
        document.getElementById('grade-canvas'),
        document.getElementById('mobile-grade-canvas')
    ].filter(canvas => canvas !== null);

    const gradeToggle = document.getElementById('grade-toggle');

    if (gradeCanvases.length > 0 && gradeToggle) {
        const gradeContexts = gradeCanvases.map(c => c.getContext('2d'));
        let gradeDrawing = false;

        gradeToggle.addEventListener('change', (e) => {
            if (e.target.checked && pencilToggle) { pencilToggle.checked = false; pencilToggle.dispatchEvent(new Event('change')); }
            gradeCanvases.forEach(canvas => {
                canvas.classList.toggle('pointer-events-none', !e.target.checked);
                canvas.style.cursor = e.target.checked ? 'crosshair' : 'default';
            });
        });

        if (pencilToggle) {
            pencilToggle.addEventListener('change', (e) => {
                if (e.target.checked && gradeToggle) { gradeToggle.checked = false; gradeToggle.dispatchEvent(new Event('change')); }
            });
        }

        const getNormalizedPosG = (e, canvas) => {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return { nx: (clientX - rect.left) / rect.width, ny: (clientY - rect.top) / rect.height };
        };

        const startGrade = (e) => {
            if (!gradeToggle.checked) return;
            if (e.touches && e.touches.length > 1) return; // 2 fingers = pinch-zoom
            gradeDrawing = true;
            const { nx, ny } = getNormalizedPosG(e, e.currentTarget);
            gradeCanvases.forEach((canvas, idx) => {
                const gCtx = gradeContexts[idx];
                gCtx.beginPath(); gCtx.lineWidth = 1.0; gCtx.lineCap = 'round';
                gCtx.strokeStyle = '#ef4444';
                gCtx.moveTo(nx * canvas.width, ny * canvas.height);
            });
        };

        const moveGrade = (e) => {
            if (e.touches && e.touches.length > 1) { gradeDrawing = false; return; } // 2 fingers = zoom
            if (!gradeDrawing) return;
            const { nx, ny } = getNormalizedPosG(e, e.currentTarget);
            gradeCanvases.forEach((canvas, idx) => {
                const gCtx = gradeContexts[idx];
                gCtx.lineTo(nx * canvas.width, ny * canvas.height); gCtx.stroke();
            });
        };

        const stopGrade = () => { if (!gradeDrawing) return; gradeContexts.forEach(ctx => ctx.closePath()); gradeDrawing = false; };

        gradeCanvases.forEach(canvas => {
            canvas.addEventListener('mousedown', startGrade);
            canvas.addEventListener('mousemove', moveGrade);
            canvas.addEventListener('mouseup', stopGrade);
            canvas.addEventListener('mouseleave', stopGrade);
            // passive:true = browser gesture pipeline stays open → pinch-zoom always works
            canvas.addEventListener('touchstart', startGrade, { passive: true });
            canvas.addEventListener('touchmove', moveGrade, { passive: true });
            canvas.addEventListener('touchend', stopGrade, { passive: true });
        });

        document.getElementById('clear-grade').addEventListener('click', () => {
            if (confirm('Clear all grade drawings?')) {
                gradeContexts.forEach((gCtx, i) => {
                    gCtx.clearRect(0, 0, gradeCanvases[i].width, gradeCanvases[i].height);
                });
            }
        });
    }

        document.getElementById('downloadBtn').addEventListener('click', () => {
        const isReconActive = !document.getElementById('recon-card-container').classList.contains('hidden');
        
        // Restore workspace to desktop for correct capture
        if (isReconActive && typeof restoreWorkspaceToDesktop === 'function') {
            restoreWorkspaceToDesktop();
        }

        const container = isReconActive ? document.getElementById('recon-card-container') : document.getElementById('card-container');
        const previewPanel = document.getElementById('previewPanel');

        const originalTransform = container.style.transform;
        const originalScrollY = window.scrollY;
        const isVisuallyHidden = previewPanel.classList.contains('opacity-0');

        // PRE-CAPTURE NORMALIZATION
        if (isVisuallyHidden) {
            previewPanel.classList.remove('opacity-0', 'pointer-events-none', 'absolute');
            previewPanel.classList.add('flex');
        }

        const originalTransition = previewPanel.style.transition;
        previewPanel.style.transition = 'none';

        // INDUSTRIAL FIX: Force fixed capture context
        document.body.classList.add('is-capturing');

        window.scrollTo(0, 0);

       /* setTimeout(() => {
            html2canvas(container, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
                scrollX: 0,
                scrollY: 0
            })*/setTimeout(() => {
            // FIX: Force Lucide icons to draw before the "camera" clicks
            if (window.lucide) {
                window.lucide.createIcons();
            }

            // NEW CODE STARTS HERE
            html2canvas(container, {
                scale: Math.max(window.devicePixelRatio || 2, 2), // High-res capture for clarity
                backgroundColor: '#ffffff',
                useCORS: true,        // Critical for CDN icons
                allowTaint: false,    // Security handshake
                logging: true,        // Prints errors to F12 Console
                scrollX: 0,
                scrollY: 0,
                onclone: (clonedDoc) => {
                    // This forces the "X" and "Pencil" to be visible in the capture
                    const icons = clonedDoc.querySelectorAll('[data-lucide]');
                    icons.forEach(icon => icon.style.visibility = 'visible');
                }
            }).then(canvas => {
                // Restore context
                document.body.classList.remove('is-capturing');
                previewPanel.style.transition = originalTransition;

                // Restore view
                if (isVisuallyHidden) {
                    previewPanel.classList.add('opacity-0', 'pointer-events-none', 'absolute');
                    previewPanel.classList.remove('flex');
                }
                container.style.transform = originalTransform;
                window.scrollTo(0, originalScrollY);

                // Portal back to mobile if active
                if (isReconActive && typeof syncReconPortal === 'function') {
                    syncReconPortal();
                }

                const link = document.createElement('a');
                link.download = `RangeCard-${document.getElementById('date').value || 'export'}.png`;
                link.href = canvas.toDataURL("image/png");

                // For mobile/WebView compatibility
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }).catch(err => {
                document.body.classList.remove('is-capturing');
                previewPanel.style.transition = originalTransition;
                if (isVisuallyHidden) {
                    previewPanel.classList.add('opacity-0', 'pointer-events-none', 'absolute');
                    previewPanel.classList.remove('flex');
                }
                container.style.transform = originalTransform;
                window.scrollTo(0, originalScrollY);

                // Portal back to mobile if active
                if (isReconActive && typeof syncReconPortal === 'function') {
                    syncReconPortal();
                }

                console.error("Download capture failure:", err);
                alert("Download failed. See console.");
            });
        }, 500);
    });

    // === 8. Mobile Responsiveness & View Toggle ===
    const mobileViewToggle = document.getElementById('mobileViewToggle');
    // mainLayout and previewPanel are already declared above
    const toggleIcon = document.getElementById('toggleIcon');
    const aside = document.querySelector('aside');

    if (mobileViewToggle) {
        mobileViewToggle.onclick = () => {
            const isShowingPreview = previewPanel.classList.contains('active');
            if (isShowingPreview) {
                // Switch to Inputs
                previewPanel.classList.remove('active');
                aside.classList.remove('hidden');
                toggleIcon.setAttribute('data-lucide', 'eye');
                mobileViewToggle.classList.replace('bg-gray-800', 'bg-neon-green');
                mobileViewToggle.classList.replace('text-neon-green', 'text-black');
            } else {
                // Switch to Preview
                previewPanel.classList.add('active');
                aside.classList.add('hidden');
                toggleIcon.setAttribute('data-lucide', 'settings');
                mobileViewToggle.classList.replace('bg-neon-green', 'bg-gray-800');
                mobileViewToggle.classList.replace('text-black', 'text-neon-green');
            }
            if (window.lucide) window.lucide.createIcons();
            handleResponsiveScaling();
        };
    }

    // === TACTICAL FLAVOR COLOR CYCLING ===
    const colorCycleBtn = document.getElementById('colorCycleBtn');
    const flavors = [
        { name: "Cyber Cyan",      hex: "#00f5ff", rgb: "0, 245, 255" },
        { name: "Combat Red",      hex: "#ff1e1e", rgb: "255, 30, 30" },
        { name: "Phantom Violet",  hex: "#bf00ff", rgb: "191, 0, 255" },
        { name: "Marine Blue",     hex: "#0077ff", rgb: "0, 119, 255" },
        { name: "Plasma Pink",     hex: "#ff007f", rgb: "255, 0, 127" },
        { name: "Nuclear Lime",    hex: "#aaff00", rgb: "170, 255, 0" },
        { name: "Dark Earth (FDE)",hex: "#bfa16f", rgb: "191, 161, 111" },
        { name: "Arctic White",    hex: "#e9ecef", rgb: "233, 236, 239", isLight: true },
        { name: "Neon Green",      hex: "#00ff41", rgb: "0, 255, 65" },
        { name: "Tactical Amber",  hex: "#ffb300", rgb: "255, 179, 0" },
        { name: "Glowing Yellow",  hex: "#ffe600", rgb: "255, 230, 0" },
        { name: "Classic Grey",    hex: "#94a3b8", rgb: "148, 163, 184" },
        { name: "Stealth Black",   hex: "#374151", rgb: "55, 65, 81" },
    ];

    function applyFlavor(index) {
        const flavor = flavors[index];
        document.documentElement.style.setProperty('--accent-color', flavor.hex);
        document.documentElement.style.setProperty('--accent-rgb', flavor.rgb);
        
        // High-contrast tab text coloring for white/light-colored accents
        const isLightAccent = flavor.isLight || flavor.hex === '#ffffff' || flavor.hex === '#e9ecef';
        const tabTextColor = isLightAccent ? "#000000" : "#ffffff";
        document.documentElement.style.setProperty('--tab-text-color', tabTextColor);
        // Store light flag so CSS & other code can react
        document.documentElement.setAttribute('data-flavor-light', isLightAccent ? '1' : '0');

        // Remove previous flavor classes
        flavors.forEach(f => {
            const classToRemove = `flavor-${f.name.toLowerCase().replace(/\s|[()]/g, '-').replace(/-+/g, '-')}`;
            document.body.classList.remove(classToRemove);
        });

        // Add current flavor class
        document.body.classList.add(`flavor-${flavor.name.toLowerCase().replace(/\s|[()]/g, '-').replace(/-+/g, '-')}`);

        if (colorCycleBtn) {
            colorCycleBtn.innerHTML = `<i data-lucide="palette" class="w-4 h-4"></i>&nbsp;FLAVOR: ${flavor.name.toUpperCase()}`;
            
            // Dynamic theme styling applied by Antigravity
            colorCycleBtn.style.backgroundColor = `rgba(${flavor.rgb}, 0.15)`;
            colorCycleBtn.style.borderColor = flavor.hex;
            colorCycleBtn.style.color = flavor.hex;
            // Add text-shadow glow for vivid neon flavors
            colorCycleBtn.style.textShadow = isLightAccent ? 'none' : `0 0 8px rgba(${flavor.rgb}, 0.8), 0 0 16px rgba(${flavor.rgb}, 0.4)`;
            colorCycleBtn.style.boxShadow = isLightAccent ? 'none' : `0 0 12px rgba(${flavor.rgb}, 0.25), inset 0 0 8px rgba(${flavor.rgb}, 0.05)`;
            
            // Interactive hover feedback using the selected flavor colors
            colorCycleBtn.onmouseenter = () => {
                colorCycleBtn.style.backgroundColor = `rgba(${flavor.rgb}, 0.3)`;
                colorCycleBtn.style.boxShadow = isLightAccent ? 'none' : `0 0 20px rgba(${flavor.rgb}, 0.5), inset 0 0 12px rgba(${flavor.rgb}, 0.1)`;
            };
            colorCycleBtn.onmouseleave = () => {
                colorCycleBtn.style.backgroundColor = `rgba(${flavor.rgb}, 0.15)`;
                colorCycleBtn.style.boxShadow = isLightAccent ? 'none' : `0 0 12px rgba(${flavor.rgb}, 0.25), inset 0 0 8px rgba(${flavor.rgb}, 0.05)`;
            };
            
            if (window.lucide) window.lucide.createIcons();
        }

        localStorage.setItem('tacticalFlavorIndex', index);

        // Keep Recon Map card border in sync with flavor
        const reconCard = document.getElementById('recon-card-container');
        if (reconCard) reconCard.style.borderColor = flavor.hex;

        // ── ARCTIC WHITE / LIGHT FLAVOR BUG FIX ──────────────────────────────
        // The recon card is bg-white. If the accent IS white/near-white, the
        // title would be invisible. Force it to near-black in that case.
        const reconTitle = document.getElementById('display-recon-title');
        if (reconTitle) {
            reconTitle.style.color = isLightAccent ? '#111111' : flavor.hex;
            reconTitle.style.textShadow = isLightAccent ? 'none' : `0 0 6px rgba(${flavor.rgb}, 0.6)`;
        }
    }

    if (colorCycleBtn) {
        let currentFlavorIndex = parseInt(localStorage.getItem('tacticalFlavorIndex')) || 0;

        // Initial apply
        applyFlavor(currentFlavorIndex);

        colorCycleBtn.onclick = () => {
            currentFlavorIndex = (currentFlavorIndex + 1) % flavors.length;
            applyFlavor(currentFlavorIndex);
        };
    } else {
        // Fallback for startup if button isn't found immediately
        const savedIndex = parseInt(localStorage.getItem('tacticalFlavorIndex')) || 0;
        applyFlavor(savedIndex);
    }

    // === UNIVERSAL AUTO-SAVE SYSTEM ===
    function autoSaveAll() {
        const formData = {};
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.id) {
                formData[input.id] = input.value;
            }
        });
        localStorage.setItem('rangeCardAutoSave', JSON.stringify(formData));
        // console.log("Auto-save completed.");
    }

    function autoLoadAll() {
        const savedData = localStorage.getItem('rangeCardAutoSave');
        if (savedData) {
            try {
                const formData = JSON.parse(savedData);
                
                // --- ONE-TIME STABILIZATION PATCH: PURGE CORRUPT LEGACY KEYS FROM CACHE ---
                if (localStorage.getItem('rc_fix_corrupt_v1') !== 'true') {
                    delete formData['bal-input-mv'];
                    delete formData['bal-input-range'];
                    delete formData['bal-input-wind'];
                    localStorage.setItem('rangeCardAutoSave', JSON.stringify(formData));
                    localStorage.setItem('rc_fix_corrupt_v1', 'true');
                    // console.log("Fixed data corruptions in auto-save cache.");
                }
                Object.keys(formData).forEach(id => {
                    const input = document.getElementById(id);
                    if (input && input.type !== 'file') {
                        input.value = formData[id];
                        input.dispatchEvent(new Event('input'));
                    }
                });
                // console.log("Auto-load completed.");
            } catch (e) {
                console.error("Error loading auto-save data", e);
            }
        }
    }

    // Attach listeners to all inputs
    document.addEventListener('input', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
            autoSaveAll();
        }
    });

    // Run load on startup
    window.addEventListener('load', () => {
        autoLoadAll();
        setTimeout(handleResponsiveScaling, 300);
    });

    // === RESPONSIVE SCALING ===
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            // console.log("Resize detected, recalibrating layout...");
            handleResponsiveScaling();
            if (typeof syncReconPortal === 'function') syncReconPortal();
        }, 250);
    });

    function handleResponsiveScaling() {
        const wrapper = document.getElementById('card-scale-wrapper');
        const container = document.getElementById('card-container');
        if (!wrapper || !container) return;

        const targetWidth = 1000;
        const availableWidth = wrapper.offsetWidth - 32;
        let scale = availableWidth / targetWidth;

        container.style.transform = `scale(${scale})`;
        container.style.transformOrigin = 'top left';

        // Adjust wrapper height to accommodate scaled content
        wrapper.style.height = (targetWidth * 0.75 * scale) + 'px';
    }

    // Initial call
    handleResponsiveScaling();
    if (typeof syncReconPortal === 'function') syncReconPortal();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTacticalDashboard1);
} else {
    initializeTacticalDashboard1();
}

function toggleSection(id) { document.getElementById(id).classList.toggle('hidden'); }
window.appendCalc = function (v) {
    const displays = [document.getElementById('calc-display'), document.getElementById('calc-display-float')];
    displays.forEach(d => {
        if(d) d.value = (d.value === '0' && v !== '.') ? v : d.value + v;
    });
};
window.clearCalc = function () { 
    const displays = [document.getElementById('calc-display'), document.getElementById('calc-display-float')];
    displays.forEach(d => { if(d) d.value = '0'; });
};
window.executeCalc = function () {
    const d = document.getElementById('calc-display');
    const floatD = document.getElementById('calc-display-float');
    try { 
        const result = eval((d ? d.value : '0').replace(/[^-0-9+*/.]/g, ''));
        if(d) d.value = result;
        if(floatD) floatD.value = result;
    } catch { 
        if(d) d.value = 'Error'; 
        if(floatD) floatD.value = 'Error'; 
        setTimeout(clearCalc, 1000); 
    }
};
window.calcCos = function () {
    const d = document.getElementById('calc-display');
    const floatD = document.getElementById('calc-display-float');
    try { 
        const v = parseFloat(d ? d.value : '0'); 
        if (!isNaN(v)) {
            const result = Math.cos(v * Math.PI / 180).toFixed(4);
            if(d) d.value = result;
            if(floatD) floatD.value = result;
        } 
    } catch { 
        if(d) d.value = 'Error'; 
        if(floatD) floatD.value = 'Error'; 
        setTimeout(clearCalc, 1000); 
    }
};

// --- Vault Swipe Controller (V1.6 Connected) ---
function initializeTacticalDashboard2() {
    let profileNames = [];
    let currentProfileIndex = -1;

    function refreshProfileNames() {
        if (!window.getProfiles) return;
        const ps = window.getProfiles();
        // Align carousel perfectly with the displayed/filtered list logic
        let names = Object.keys(ps).sort().reverse();
        if (window.currentLibraryFilter === 'zero') {
            names = names.filter(n => !ps[n].isReconScenario);
        } else if (window.currentLibraryFilter === 'recon') {
            names = names.filter(n => !!ps[n].isReconScenario);
        }
        profileNames = names;
    }

    // Hook into the original update logic
    const originalUpdate = window.updateProfileList;
    window.updateProfileList = function() {
        if (originalUpdate) originalUpdate.apply(this, arguments);
        refreshProfileNames();
        updateGalleryStats();
    };

    const originalPreview = window.previewProfile;
    window.previewProfile = function(name) {
        if (originalPreview) originalPreview.apply(this, arguments);
        refreshProfileNames(); 
        currentProfileIndex = profileNames.indexOf(name);
        
        updateGalleryStats();
    };

    function updateGalleryStats() {
        const counter = document.getElementById('galleryCounter');
        if (counter && currentProfileIndex !== -1 && profileNames.length > 0) {
            counter.classList.remove('hidden');
            counter.textContent = `Card ${currentProfileIndex + 1} of ${profileNames.length}`;
        }
    }

    function navigate(dir, event) {
        if (event) { event.preventDefault(); event.stopPropagation(); }
        refreshProfileNames(); 
        if (profileNames.length === 0) return;
        
        // Use the public window function to force the flip
        let nextIndex = currentProfileIndex + dir;
        if (nextIndex >= profileNames.length) nextIndex = 0;
        if (nextIndex < 0) nextIndex = profileNames.length - 1;
        
        const nextName = profileNames[nextIndex];
        if (nextName && window.previewProfile) {
            window.previewProfile(nextName);
            if (window.lucide) window.lucide.createIcons();
        }
    }

    // Attach Click Events
    const prevBtn = document.getElementById('prevProfileBtn');
    const nextBtn = document.getElementById('nextProfileBtn');
    if (prevBtn) prevBtn.onclick = (e) => navigate(-1, e);
    if (nextBtn) nextBtn.onclick = (e) => navigate(1, e);

    // Swipe Logic
    let startX = 0;
    const swipeArea = document.getElementById('snapshotPreview');
    if (swipeArea) {
        const handleEnd = (endX, target) => {
            if (target.closest('button')) return;
            const diff = startX - endX;
            if (Math.abs(diff) > 50) navigate(diff > 0 ? 1 : -1);
        };
        swipeArea.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, {passive: true});
        swipeArea.addEventListener('touchend', (e) => { handleEnd(e.changedTouches[0].clientX, e.target); }, {passive: true});
        swipeArea.addEventListener('mousedown', (e) => { startX = e.clientX; });
        swipeArea.addEventListener('mouseup', (e) => { handleEnd(e.clientX, e.target); });
    }

    // === AMMO LIBRARY CONTROLLER BY ANTIGRAVITY ===
    const ammoLibraryModal = document.getElementById('ammoLibraryModal');
    const openAmmoLibraryBtn = document.getElementById('openAmmoLibraryBtn');
    const closeAmmoLibraryBtn = document.getElementById('closeAmmoLibraryBtn');
    const saveAmmoProfileBtn = document.getElementById('saveAmmoProfileBtn');
    const ammoLibraryList = document.getElementById('ammoLibraryList');

    // Input elements for ammo form
    const ammoInputs = {
        name: document.getElementById('ammo-name'),
        caliber: document.getElementById('ammo-caliber'),
        bullet: document.getElementById('ammo-bullet'),
        powder: document.getElementById('ammo-powder'),
        primer: document.getElementById('ammo-primer'),
        col: document.getElementById('ammo-col'),
        velocity: document.getElementById('ammo-velocity'),
        bc: document.getElementById('ammo-bc'),
        count: document.getElementById('ammo-count')
    };

    function getAmmoProfiles() {
        return JSON.parse(localStorage.getItem('rangeCardAmmoProfiles') || '{}');
    }

    function saveAmmoProfiles(profiles) {
        localStorage.setItem('rangeCardAmmoProfiles', JSON.stringify(profiles));
    }

    function updateAmmoList() {
        if (!ammoLibraryList) return;
        const profiles = getAmmoProfiles();
        ammoLibraryList.innerHTML = '';

        const keys = Object.keys(profiles);
        if (keys.length === 0) {
            ammoLibraryList.innerHTML = `
                <div class="col-span-1 md:col-span-2 flex flex-col items-center justify-center py-12 text-center text-gray-400 font-mono text-xs uppercase tracking-wider">
                    <i data-lucide="info" class="w-8 h-8 opacity-20 mb-2"></i>
                    No saved ammo batches found.
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        keys.forEach(key => {
            const p = profiles[key];
            const card = document.createElement('div');
            card.className = "bg-black border border-emerald-500/30 p-4 rounded-xl flex flex-col justify-between hover:border-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all shadow-md relative group overflow-hidden";
            card.innerHTML = `
                <!-- Send to Vault Checkbox -->
                <div class="absolute top-2 left-2 z-30 bg-black/60 p-1 rounded">
                    <label class="sr-only">Mark Ammo Profile for Vault</label><input autocomplete="off" type="checkbox" class="ammo-vault-checkbox w-4 h-4 cursor-pointer bg-black/50 border border-gray-500 rounded text-neon-green focus:ring-neon-green/50 shadow-lg" data-profile-name="${key}" title="Mark for Vault" aria-label="Mark Ammo Profile for Vault">
                </div>
                
                <div class="space-y-3 text-left mt-3">
                    <div class="flex justify-between items-start border-b border-emerald-500/20 pb-3 mb-2">
                        <div style="padding-left: 48px;">
                            <h4 class="text-white font-black uppercase text-base tracking-widest truncate max-w-[150px] drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]">${key}</h4>
                            <span class="text-[10px] text-emerald-400 font-mono uppercase tracking-widest bg-emerald-500/10 px-1.5 py-0.5 rounded-sm">${p.caliber || 'General'}</span>
                        </div>
                        <button class="delete-ammo-btn text-emerald-500/50 hover:text-red-500 hover:bg-red-950/40 p-1.5 rounded transition-colors z-30" data-name="${key}">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-y-2 text-[10px] font-mono text-emerald-100/70 uppercase tracking-wider">
                        <div class="truncate">Projectile: <span class="text-white font-bold ml-1">${p.bullet || '--'}</span></div>
                        <div class="truncate">Propellant: <span class="text-white font-bold ml-1">${p.powder || '--'}</span></div>
                        <div class="truncate">Primer: <span class="text-white font-bold ml-1">${p.primer || '--'}</span></div>
                        <div class="truncate">Overall Length: <span class="text-white font-bold ml-1">${p.col || '--'}</span></div>
                        <div class="truncate col-span-2">Muzzle Velocity: <span class="text-emerald-400 font-bold text-[11px] ml-1">${p.velocity || '--'} Feet Per Second</span></div>
                        <div class="truncate col-span-2">Ballistic Coef: <span class="text-emerald-400 font-bold text-[11px] ml-1">${p.bc || '--'}</span></div>
                    </div>
                </div>
                
                <div class="mt-4 pt-3 border-t border-emerald-500/20 flex items-center justify-start gap-4">
                    <!-- Adjustment Counter -->
                    <div class="flex items-center gap-2 bg-emerald-500/5 p-1 rounded border border-emerald-500/30">
                        <button class="adjust-ammo-btn bg-black text-emerald-400 border border-emerald-500/50 font-bold text-sm w-7 h-7 rounded flex items-center justify-center hover:bg-emerald-500 hover:text-black transition-colors z-30" data-name="${key}" data-amount="-1">-1</button>
                        <span class="text-white font-black text-xs px-2 min-w-[50px] text-center tracking-widest">${p.count || '0'} Rounds</span>
                        <button class="adjust-ammo-btn bg-black text-emerald-400 border border-emerald-500/50 font-bold text-sm w-7 h-7 rounded flex items-center justify-center hover:bg-emerald-500 hover:text-black transition-colors z-30" data-name="${key}" data-amount="1">+1</button>
                    </div>
                </div>
            `;
            
            // Checkbox logic
            card.addEventListener('click', (e) => {
                if (e.target.closest('.ammo-vault-checkbox')) {
                    const checkedBoxes = document.querySelectorAll('.ammo-vault-checkbox:checked');
                    
                    const vaultBtn = document.getElementById('ammo-to-vault-btn');
                    if (vaultBtn) {
                        if (checkedBoxes.length > 0) vaultBtn.classList.remove('hidden');
                        else vaultBtn.classList.add('hidden');
                    }
                    
                    const reworkBtn = document.getElementById('rework-ammo-btn');
                    if (reworkBtn) {
                        if (checkedBoxes.length === 1) reworkBtn.classList.remove('hidden');
                        else reworkBtn.classList.add('hidden');
                    }
                }
            });

            ammoLibraryList.appendChild(card);
        });
        
        // Ensure buttons start hidden
        const vaultBtn = document.getElementById('ammo-to-vault-btn');
        if (vaultBtn) vaultBtn.classList.add('hidden');
        
        const reworkBtn = document.getElementById('rework-ammo-btn');
        if (reworkBtn) reworkBtn.classList.add('hidden');

        // Add event listeners inside list
        document.querySelectorAll('.delete-ammo-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const name = btn.getAttribute('data-name');
                if (confirm(`Delete ammo profile "${name}"?`)) {
                    const profiles = getAmmoProfiles();
                    delete profiles[name];
                    saveAmmoProfiles(profiles);
                    updateAmmoList();
                }
            };
        });

        document.querySelectorAll('.adjust-ammo-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const name = btn.getAttribute('data-name');
                const amt = parseInt(btn.getAttribute('data-amount')) || 0;
                const profiles = getAmmoProfiles();
                if (profiles[name]) {
                    profiles[name].count = Math.max(0, (parseInt(profiles[name].count) || 0) + amt);
                    saveAmmoProfiles(profiles);
                    updateAmmoList();
                }
            };
        });

        document.querySelectorAll('.load-ammo-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const name = btn.getAttribute('data-name');
                const profiles = getAmmoProfiles();
                const p = profiles[name];
                if (p) {
                    // Populate inputs in range-card form
                    if (p.caliber) document.getElementById('caliber').value = p.caliber;
                    if (p.bullet) document.getElementById('bullet').value = p.bullet;
                    if (p.powder) document.getElementById('powder').value = p.powder;
                    if (p.primer) document.getElementById('primer').value = p.primer;
                    if (p.col) document.getElementById('col').value = p.col;
                    if (p.velocity) document.getElementById('velocity').value = p.velocity;
                    if (p.count) document.getElementById('box-count-input').value = p.count;

                    // Manually trigger input events to sync display card
                    ['caliber', 'bullet', 'powder', 'primer', 'col', 'velocity', 'box-count-input'].forEach(id => {
                        const el = document.getElementById(id);
                        if (el) el.dispatchEvent(new Event('input'));
                    });

                    alert(`Loaded specifications for "${name}" into card!`);
                    if (ammoLibraryModal) ammoLibraryModal.classList.add('hidden');
                }
            };
        });

        if (window.lucide) window.lucide.createIcons();
    }

    if (openAmmoLibraryBtn && ammoLibraryModal) {
        openAmmoLibraryBtn.onclick = () => {
            ammoLibraryModal.classList.remove('hidden');
            updateAmmoList();
        };
    }

    if (closeAmmoLibraryBtn && ammoLibraryModal) {
        closeAmmoLibraryBtn.onclick = () => {
            ammoLibraryModal.classList.add('hidden');
        };
    }

    if (saveAmmoProfileBtn) {
        saveAmmoProfileBtn.onclick = () => {
            const name = ammoInputs.name.value.trim();
            if (!name) {
                alert("Please enter a load/batch name.");
                return;
            }

            const profiles = getAmmoProfiles();
            profiles[name] = {
                caliber: ammoInputs.caliber.value.trim(),
                bullet: ammoInputs.bullet.value.trim(),
                powder: ammoInputs.powder.value.trim(),
                primer: ammoInputs.primer.value.trim(),
                col: ammoInputs.col.value.trim(),
                velocity: ammoInputs.velocity.value.trim(),
                bc: ammoInputs.bc ? ammoInputs.bc.value.trim() : '',
                count: parseInt(ammoInputs.count.value) || 0
            };

            saveAmmoProfiles(profiles);
            updateAmmoList();

            // Clear inputs
            Object.values(ammoInputs).forEach(input => {
                if (input) input.value = '';
            });

            alert(`Successfully saved batch "${name}" to Ammo Library!`);
        };
    }

    // === 10. Tactical Recon Mapper ===
    let isReconActive = false;
    let selectedEmoji = null;
    const toggleReconMapperBtn = document.getElementById('toggleReconMapperBtn');
    const normalSidebarView = document.getElementById('normal-sidebar-view');
    const reconSidebarView = document.getElementById('recon-sidebar-view');
    const normalCardContainer = document.getElementById('card-container');
    const reconCardContainer = document.getElementById('recon-card-container');

    function syncReconPortal() {
        const normalMobilePreview = document.getElementById('mobile-live-preview-complete');
        const reconMobilePreview = document.getElementById('mobile-recon-preview-complete');
        
        if (isReconActive) {
            if (reconMobilePreview) reconMobilePreview.classList.remove('hidden');
            if (normalMobilePreview) normalMobilePreview.classList.add('hidden');
            
            // Sync labels to the mobile stacked form
            const titleLabel = document.getElementById('mobile-display-recon-title-label');
            const reportLabel = document.getElementById('mobile-display-recon-report-label');
            const timestampLabel = document.getElementById('mobile-display-recon-timestamp-label');
            
            if (titleLabel) titleLabel.textContent = document.getElementById('display-recon-title').textContent;
            if (reportLabel) reportLabel.textContent = document.getElementById('display-recon-report').textContent;
            if (timestampLabel) timestampLabel.textContent = document.getElementById('display-recon-timestamp').textContent;
        } else {
            if (reconMobilePreview) reconMobilePreview.classList.add('hidden');
            if (normalMobilePreview) normalMobilePreview.classList.remove('hidden');
        }
    }
    window.syncReconPortal = syncReconPortal;
    
    if (toggleReconMapperBtn) {
        toggleReconMapperBtn.addEventListener('click', () => {
            isReconActive = !isReconActive;
            if (isReconActive) {
                toggleReconMapperBtn.innerHTML = '<i data-lucide="crosshair" class="w-4 h-4"></i> BACK TO RANGE CARD';
                toggleReconMapperBtn.classList.replace('bg-indigo-950/40', 'bg-emerald-950/40');
                toggleReconMapperBtn.classList.replace('border-indigo-500', 'border-emerald-500');
                toggleReconMapperBtn.classList.replace('text-indigo-400', 'text-emerald-400');
                
                normalSidebarView.classList.add('hidden');
                reconSidebarView.classList.remove('hidden');
                normalCardContainer.classList.add('hidden');
                reconCardContainer.classList.remove('hidden');
                
                // Prevent accidentally clicking the standard save button while in Recon View
                const stdSave = document.getElementById('saveProfileBtnManual');
                if (stdSave) stdSave.classList.add('hidden');
            } else {
                toggleReconMapperBtn.innerHTML = '<i data-lucide="map" class="w-4 h-4"></i> TACTICAL RECON MAPPER';
                toggleReconMapperBtn.classList.replace('bg-emerald-950/40', 'bg-indigo-950/40');
                toggleReconMapperBtn.classList.replace('border-emerald-500', 'border-indigo-500');
                toggleReconMapperBtn.classList.replace('text-emerald-400', 'text-indigo-400');
                
                normalSidebarView.classList.remove('hidden');
                reconSidebarView.classList.add('hidden');
                normalCardContainer.classList.remove('hidden');
                reconCardContainer.classList.add('hidden');

                const stdSave = document.getElementById('saveProfileBtnManual');
                if (stdSave) stdSave.classList.remove('hidden');
            }
            syncReconPortal();
            if (window.lucide) window.lucide.createIcons();
        });
    }

    // SITREP & Scenario Title Synchronizer
    const reconScenarioName = document.getElementById('recon-scenario-name');
    const displayReconTitle = document.getElementById('display-recon-title');
    const reconReport = document.getElementById('recon-report');
    const displayReconReport = document.getElementById('display-recon-report');
    const displayReconTimestamp = document.getElementById('display-recon-timestamp');

    if (reconScenarioName && displayReconTitle) {
        reconScenarioName.addEventListener('input', () => {
            displayReconTitle.textContent = reconScenarioName.value.trim().toUpperCase() || 'NEW SCENARIO';
            syncReconPortal();
        });
    }
    if (reconReport && displayReconReport) {
        reconReport.addEventListener('input', () => {
            displayReconReport.textContent = reconReport.value.trim() || 'NO SITREP FILED';
            const now = new Date();
            if (displayReconTimestamp) {
                displayReconTimestamp.textContent = now.toLocaleTimeString() + " | " + now.toLocaleDateString();
            }
            syncReconPortal();
        });
    }

    const mapBgUpload = document.getElementById('map-bg-upload');
    const reconBgImage = document.getElementById('recon-bg-image');
    const reconDefaultGrid = document.getElementById('recon-default-grid');

    if (mapBgUpload && reconBgImage) {
        mapBgUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
                    alert("Note: Apple HEIC/HEIF image formats are not natively supported by standard web browsers. Please convert your screenshot to PNG or JPG to upload successfully.");
                    return;
                }
                const reader = new FileReader();
                reader.onload = (event) => {
                    // Update main desktop workspace background
                    reconBgImage.src = event.target.result;
                    reconBgImage.classList.remove('hidden');
                    if (reconDefaultGrid) reconDefaultGrid.classList.add('hidden');

                    // Update twin mobile workspace background
                    const mobileBg = document.getElementById('mobile-recon-bg-image');
                    const mobileGrid = document.getElementById('mobile-recon-default-grid');
                    if (mobileBg) {
                        mobileBg.src = event.target.result;
                        mobileBg.classList.remove('hidden');
                    }
                    if (mobileGrid) mobileGrid.classList.add('hidden');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Emoji Marker Placement & Management
    const emojiButtons = document.querySelectorAll('.emoji-btn');
    const workspace = document.getElementById('recon-map-workspace');

    emojiButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            emojiButtons.forEach(b => b.classList.remove('border-neon-green', 'bg-gray-800'));
            if (selectedEmoji === btn.dataset.emoji) {
                selectedEmoji = null;
            } else {
                selectedEmoji = btn.dataset.emoji;
                btn.classList.add('border-neon-green', 'bg-gray-800');
                
                // SPARK OF TOUCHSCREEN GENIUS: Spawn the marker at 50%, 50% automatically!
                if (typeof createMarker === 'function') {
                    createMarker(50, 50, selectedEmoji, '');
                }
            }
        });
    });

    if (workspace) {
        workspace.addEventListener('click', (e) => {
            if (e.target !== workspace && e.target.id !== 'recon-canvas' && e.target.id !== 'recon-default-grid') return;
            if (!selectedEmoji) return;
            
            const drawToggle = document.getElementById('recon-pencil-toggle');
            if (drawToggle && drawToggle.checked) return;

            const rect = workspace.getBoundingClientRect();
            const clickX = ((e.clientX - rect.left) / rect.width) * 100;
            const clickY = ((e.clientY - rect.top) / rect.height) * 100;

            createMarker(clickX, clickY, selectedEmoji, '');
        });
    }

    function createSingleMarker(x, y, emoji, note, isMobileTwin = false) {
        const targetWorkspace = isMobileTwin 
            ? document.getElementById('mobile-recon-map-workspace') 
            : document.getElementById('recon-map-workspace');
        if (!targetWorkspace) return null;

        const marker = document.createElement('div');
        marker.className = 'absolute select-none cursor-move z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2 py-1 rounded border border-emerald-500/40 hover:border-emerald-400 hover:scale-105 transition-all shadow-md recon-marker';
        if (isMobileTwin) marker.classList.add('mobile-recon-marker');
        marker.style.left = `${x}%`;
        marker.style.top = `${y}%`;
        marker.dataset.emoji = emoji;
        marker.dataset.note = note;

        const emojiSpan = document.createElement('span');
        emojiSpan.className = 'text-xl filter drop-shadow-sm select-none';
        emojiSpan.textContent = emoji;

        const noteSpan = document.createElement('span');
        noteSpan.className = 'text-[8px] font-extrabold text-white font-mono bg-emerald-950/80 border border-emerald-500/40 px-1 py-0.5 rounded uppercase leading-none tracking-wider select-none whitespace-nowrap marker-note-span';
        noteSpan.textContent = note || 'LABEL';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'text-[12px] text-red-400 hover:text-red-300 transition-colors bg-red-950/40 border border-red-500/30 w-5 h-5 rounded flex items-center justify-center p-0 ml-1 cursor-pointer font-sans font-black';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = 'Delete Marker';
        
        // Stop drag & click propagation on contact
        deleteBtn.addEventListener('mousedown', (e) => e.stopPropagation());
        deleteBtn.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (confirm('Delete this marker?')) {
                if (marker.twin) marker.twin.remove();
                marker.remove();
            }
        });

        marker.appendChild(emojiSpan);
        marker.appendChild(noteSpan);
        marker.appendChild(deleteBtn);

        marker.addEventListener('click', (e) => {
            e.stopPropagation();
            const newNote = prompt('Enter notes / yardage for this marker:', marker.dataset.note);
            if (newNote !== null) {
                const trimmed = newNote.trim();
                marker.dataset.note = trimmed;
                noteSpan.textContent = trimmed || 'LABEL';
                if (marker.twin) {
                    marker.twin.dataset.note = trimmed;
                    const twinNoteSpan = marker.twin.querySelector('.marker-note-span');
                    if (twinNoteSpan) twinNoteSpan.textContent = trimmed || 'LABEL';
                }
            }
        });

        let isDragging = false;

        const dragStart = (e) => {
            isDragging = true;
            e.stopPropagation();
        };

        const dragMove = (e) => {
            if (!isDragging) return;
            const touch = e.touches && e.touches.length > 0 ? e.touches[0] : (e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches[0] : null);
            const clientX = touch ? touch.clientX : e.clientX;
            const clientY = touch ? touch.clientY : e.clientY;
            
            const rect = targetWorkspace.getBoundingClientRect();
            let pctX = ((clientX - rect.left) / rect.width) * 100;
            let pctY = ((clientY - rect.top) / rect.height) * 100;

            pctX = Math.max(1, Math.min(pctX, 88));
            pctY = Math.max(1, Math.min(pctY, 92));

            marker.style.left = `${pctX}%`;
            marker.style.top = `${pctY}%`;
            
            if (marker.twin) {
                marker.twin.style.left = `${pctX}%`;
                marker.twin.style.top = `${pctY}%`;
            }

            if (e.cancelable) e.preventDefault();
        };

        const dragEnd = () => {
            isDragging = false;
        };

        marker.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', dragMove);
        document.addEventListener('mouseup', dragEnd);

        marker.addEventListener('touchstart', dragStart, { passive: false });
        marker.addEventListener('touchmove', dragMove, { passive: false });
        marker.addEventListener('touchend', dragEnd);

        targetWorkspace.appendChild(marker);
        return marker;
    }

    function createMarker(x, y, emoji, note) {
        const desktopMarker = createSingleMarker(x, y, emoji, note, false);
        const mobileMarker = createSingleMarker(x, y, emoji, note, true);
        if (desktopMarker && mobileMarker) {
            desktopMarker.twin = mobileMarker;
            mobileMarker.twin = desktopMarker;
        }
    }
    window.createMarker = createMarker;

    // Recon Drawing Canvas Logic
    const reconCanvas = document.getElementById('recon-canvas');
    const mobileReconCanvas = document.getElementById('mobile-recon-canvas');
    const mobileReconBgImage = document.getElementById('mobile-recon-bg-image');
    const mobileReconDefaultGrid = document.getElementById('mobile-recon-default-grid');

    if (reconCanvas) {
        const rCtx = reconCanvas.getContext('2d');
        const mCtx = mobileReconCanvas ? mobileReconCanvas.getContext('2d') : null;
        let rDrawing = false;
        const reconPencilToggle = document.getElementById('recon-pencil-toggle');

        const getReconPos = (e, canvasEl) => {
            const rect = canvasEl.getBoundingClientRect();
            const touch = e.touches && e.touches.length > 0 ? e.touches[0] : (e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches[0] : null);
            const clientX = touch ? touch.clientX : e.clientX;
            const clientY = touch ? touch.clientY : e.clientY;
            return {
                x: ((clientX - rect.left) / rect.width) * canvasEl.width,
                y: ((clientY - rect.top) / rect.height) * canvasEl.height
            };
        };

        const startRDraw = (e) => {
            if (!reconPencilToggle || !reconPencilToggle.checked) return;
            if (e.touches && e.touches.length > 1) return; // Allow pinch-zoom
            rDrawing = true;
            
            const pos = getReconPos(e, e.currentTarget);
            rCtx.beginPath();
            rCtx.lineWidth = 1.0;
            rCtx.lineCap = 'round';
            rCtx.strokeStyle = '#ef4444';
            rCtx.moveTo(pos.x, pos.y);

            if (mCtx) {
                mCtx.beginPath();
                mCtx.lineWidth = 1.0;
                mCtx.lineCap = 'round';
                mCtx.strokeStyle = '#ef4444';
                mCtx.moveTo(pos.x, pos.y);
            }
        };

                const moveRDraw = (e) => {
            if (e.touches && e.touches.length > 1) { rDrawing = false; return; } // Allow pinch-zoom
            if (!rDrawing) return;
            const pos = getReconPos(e, e.currentTarget);
            rCtx.lineTo(pos.x, pos.y);
            rCtx.stroke();

            if (mCtx) {
                mCtx.lineTo(pos.x, pos.y);
                mCtx.stroke();
            }
        };

        const stopRDraw = () => {
            if (!rDrawing) return;
            rCtx.closePath();
            if (mCtx) mCtx.closePath();
            rDrawing = false;
        };

        reconCanvas.addEventListener('mousedown', startRDraw);
        reconCanvas.addEventListener('mousemove', moveRDraw);
        reconCanvas.addEventListener('mouseup', stopRDraw);
        reconCanvas.addEventListener('mouseleave', stopRDraw);
        reconCanvas.addEventListener('touchstart', startRDraw, { passive: true });
        reconCanvas.addEventListener('touchmove', moveRDraw, { passive: true });
        reconCanvas.addEventListener('touchend', stopRDraw, { passive: true });

        if (mobileReconCanvas) {
            mobileReconCanvas.addEventListener('mousedown', startRDraw);
            mobileReconCanvas.addEventListener('mousemove', moveRDraw);
            mobileReconCanvas.addEventListener('mouseup', stopRDraw);
            mobileReconCanvas.addEventListener('mouseleave', stopRDraw);
            mobileReconCanvas.addEventListener('touchstart', startRDraw, { passive: true });
            mobileReconCanvas.addEventListener('touchmove', moveRDraw, { passive: true });
            mobileReconCanvas.addEventListener('touchend', stopRDraw, { passive: true });
        }

        if (reconPencilToggle) {
            reconPencilToggle.addEventListener('change', () => {
                const label = reconPencilToggle.parentElement;
                if (reconPencilToggle.checked) {
                    label.classList.add('bg-emerald-950/40', 'border-emerald-500', 'text-emerald-400', 'shadow-lg', 'shadow-emerald-500/20');
                    label.querySelector('span').textContent = '🖊️ DRAWING ACTIVE';
                    reconCanvas.classList.remove('pointer-events-none');
                    reconCanvas.style.touchAction = 'pinch-zoom';
                    if (mobileReconCanvas) {
                        mobileReconCanvas.classList.remove('pointer-events-none');
                        mobileReconCanvas.style.touchAction = 'pinch-zoom';
                    }
                } else {
                    label.classList.remove('bg-emerald-950/40', 'border-emerald-500', 'text-emerald-400', 'shadow-lg', 'shadow-emerald-500/20');
                    label.querySelector('span').textContent = '🖊️ DRAW PATH';
                    reconCanvas.classList.add('pointer-events-none');
                    if (mobileReconCanvas) mobileReconCanvas.classList.add('pointer-events-none');
                }
            });
        }

        document.getElementById('clear-recon-drawings').addEventListener('click', () => {
            if (confirm('Clear drawings and markers?')) {
                rCtx.clearRect(0, 0, reconCanvas.width, reconCanvas.height);
                if (mCtx) mCtx.clearRect(0, 0, mobileReconCanvas.width, mobileReconCanvas.height);
                
                document.querySelectorAll('.recon-marker').forEach(m => m.remove());
                
                reconBgImage.classList.add('hidden');
                reconBgImage.src = '';
                if (mobileReconBgImage) {
                    mobileReconBgImage.classList.add('hidden');
                    mobileReconBgImage.src = '';
                }
                
                if (reconDefaultGrid) reconDefaultGrid.classList.remove('hidden');
                if (mobileReconDefaultGrid) mobileReconDefaultGrid.classList.remove('hidden');
            }
        });

        const clearReconPencilBtn = document.getElementById('clear-recon-pencil');
        if (clearReconPencilBtn) {
            clearReconPencilBtn.addEventListener('click', () => {
                if (confirm('Clear pencil drawings only?')) {
                    rCtx.clearRect(0, 0, reconCanvas.width, reconCanvas.height);
                    if (mCtx) mCtx.clearRect(0, 0, mobileReconCanvas.width, mobileReconCanvas.height);
                }
            });
        }
    }

    // Save and Load from library using our robust IndexedDB
    const saveReconMapBtn = document.getElementById('saveReconMapBtn');
    const openReconLibraryBtn = document.getElementById('openReconLibraryBtn');

    if (saveReconMapBtn) {
        saveReconMapBtn.addEventListener('click', async () => {
            const name = reconScenarioName.value.trim();
            if (!name) {
                alert('Please set a Scenario Name first.');
                return;
            }

            const existingProfiles = getProfiles();
            const lowerName = name.trim().toLowerCase();
            const nameExists = Object.keys(existingProfiles).some(k => k.trim().toLowerCase() === lowerName);
            if (nameExists) {
                alert("SCENARIO NAME ALREADY EXISTS");
                return;
            }

            const reconCount = Object.keys(existingProfiles).filter(k => !!existingProfiles[k].isReconScenario).length;
            if (reconCount >= 20) {
                alert("LIBRARY FULL: RECON MAP CAPACITY REACHED (20/20). PLEASE DELETE OLD MAPS FIRST.");
                return;
            }

            // Friendly loading indicator
            saveReconMapBtn.disabled = true;
            const originalHTML = saveReconMapBtn.innerHTML;
            saveReconMapBtn.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> GENERATING PREVIEW...';
            if (window.lucide) window.lucide.createIcons();

            const container = document.getElementById('recon-card-container');
            const previewPanel = document.getElementById('previewPanel');
            const isVisuallyHidden = previewPanel.classList.contains('opacity-0');
            const isContainerHidden = container.classList.contains('hidden');

            // Force visual activation for html2canvas
            if (isVisuallyHidden) {
                previewPanel.classList.remove('opacity-0', 'pointer-events-none', 'absolute');
                previewPanel.classList.add('flex');
            }

            const originalPosition = container.style.position;
            const originalTop = container.style.top;
            const originalLeft = container.style.left;
            const originalZIndex = container.style.zIndex;
            const originalWidth = container.style.width;
            const originalHeight = container.style.height;

            if (isContainerHidden) {
                container.classList.remove('hidden');
                container.classList.add('flex'); // Force flex so flex-1 works correctly on mobile
                container.style.position = 'absolute';
                container.style.top = '0';
                container.style.left = '0';
                container.style.width = '1000px'; // Force strict layout constraints
                container.style.height = '750px'; // Prevent flex child collapse inside absolute aspect-ratio
                container.style.zIndex = '-9999';
            }

            const originalTransform = container.style.transform;
            container.style.transform = 'none';

            const originalScrollY = window.scrollY;
            window.scrollTo(0, 0);

            // FIX: Mobile browsers (especially Safari/iOS) defer flexbox layout calculations 
            // when an absolute container is suddenly unhidden. We MUST wait a fraction of a second 
            // before asking for the bounding client rect, or the flex children will report 0 height.
            await new Promise(r => setTimeout(r, 150));

            // Force layout reflow
            void container.offsetHeight;

            // Capture precise layout bounds AFTER layout has settled
            const workspaceEl = document.getElementById('recon-map-workspace');
            const preCaptureContainerRect = container.getBoundingClientRect();
            const preCaptureWorkspaceRect = workspaceEl ? workspaceEl.getBoundingClientRect() : null;

            const originalTransition = previewPanel.style.transition;
            previewPanel.style.transition = 'none';
            document.body.classList.add('is-capturing');

            setTimeout(() => {
                const scale = Math.min(Math.max(window.devicePixelRatio || 1.5, 1.5), 1.5);
                html2canvas(container, {
                    scale: scale,
                    backgroundColor: '#ffffff',
                    useCORS: true,
                    logging: true,
                    scrollX: 0,
                    scrollY: 0,
                    ignoreElements: (el) => {
                        return el.id === 'recon-canvas' || (el.classList && el.classList.contains('recon-marker'));
                    }
                }).then(canvas => {
                    document.body.classList.remove('is-capturing');
                    
                    // --- NATIVE CANVAS COMPOSITE FOR OFFLINE EMOJIS AND DRAWINGS ---
                    const ctx = canvas.getContext('2d');
                    ctx.setTransform(1, 0, 0, 1, 0, 0); // RESET TRANSFORM
                    
                    if (preCaptureWorkspaceRect) {
                        const actualScale = canvas.width / preCaptureContainerRect.width;
                        
                        // BULLETPROOF MATHEMATICAL LAYOUT: 
                        // The card is STRICTLY 1000x750 pixels. Browser flexbox layout engines (especially iOS/Safari)
                        // can completely fail to report accurate bounding rects when an element is briefly unhidden off-screen.
                        // By hardcoding the known dimensions, we guarantee the drawing never squishes or bleeds!
                        const gridOffsetX = 32;     // left padding (p-8)
                        const gridOffsetY = 108;    // top padding + header height
                        const gridW = 608;          // 1000 - 64(padding) - 16(gap) - 312(w-1/3)
                        const gridH = 610;          // 750 - 108(top) - 32(bottom padding)
                        
                        let offsetX = gridOffsetX * actualScale;
                        let offsetY = gridOffsetY * actualScale;
                        let workspaceW = gridW * actualScale;
                        let workspaceH = gridH * actualScale;
                        
                        // 1. Draw the lines from reconCanvas
                        const reconCanvas = document.getElementById('recon-canvas');
                        if (reconCanvas) {
                            ctx.drawImage(reconCanvas, offsetX, offsetY, workspaceW, workspaceH);
                        }
                        
                        // 2. Draw the emojis natively to avoid html2canvas offline font crash
                        const markerElements = workspaceEl.querySelectorAll('.recon-marker:not(.mobile-recon-marker)');
                        markerElements.forEach(m => {
                            if (!m.dataset.emoji) return;
                            const xPercent = parseFloat(m.style.left);
                            const yPercent = parseFloat(m.style.top);
                            const px = offsetX + (xPercent / 100) * workspaceW;
                            const py = offsetY + (yPercent / 100) * workspaceH;
                            
                            ctx.font = `${24 * actualScale}px sans-serif`;
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            // Shadow for clarity against backgrounds
                            ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
                            ctx.shadowBlur = 4 * actualScale;
                            ctx.shadowOffsetX = 1 * actualScale;
                            ctx.shadowOffsetY = 1 * actualScale;
                            ctx.fillText(m.dataset.emoji, px, py - (2 * actualScale));
                            ctx.shadowColor = 'transparent';
                            
                            if (m.dataset.note) {
                                ctx.font = `bold ${8 * actualScale}px monospace`;
                                const textMetrics = ctx.measureText(m.dataset.note.toUpperCase());
                                const textW = textMetrics.width;
                                const textH = 8 * actualScale;
                                
                                const rectW = textW + (8 * actualScale);
                                const rectH = textH + (6 * actualScale);
                                const rectX = px - rectW/2;
                                const rectY = py + (12 * actualScale);
                                
                                ctx.fillStyle = 'rgba(2, 44, 34, 0.8)';
                                ctx.fillRect(rectX, rectY, rectW, rectH);
                                ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
                                ctx.lineWidth = 1 * actualScale;
                                ctx.strokeRect(rectX, rectY, rectW, rectH);
                                
                                ctx.fillStyle = '#ffffff';
                                ctx.fillText(m.dataset.note.toUpperCase(), px, rectY + rectH/2 + (0.5 * actualScale));
                            }
                        });
                    }
                    // ----------------------------------------------------------------

                    previewPanel.style.transition = originalTransition;

                    if (isVisuallyHidden) {
                        previewPanel.classList.add('opacity-0', 'pointer-events-none', 'absolute');
                        previewPanel.classList.remove('flex');
                    }

                    if (isContainerHidden) {
                        container.classList.add('hidden');
                        container.classList.remove('flex'); // Cleanup the forced flex class
                        container.style.position = originalPosition;
                        container.style.top = originalTop;
                        container.style.left = originalLeft;
                        container.style.width = originalWidth;
                        container.style.height = originalHeight;
                        container.style.zIndex = originalZIndex;
                    }
                    
                    container.style.transform = originalTransform;
                    window.scrollTo(0, originalScrollY);

                    const snapshotUrl = canvas.toDataURL("image/jpeg", 0.95);

                    const markers = [];
                    document.querySelectorAll('.recon-marker:not(.mobile-recon-marker)').forEach(m => {
                        markers.push({
                            x: parseFloat(m.style.left),
                            y: parseFloat(m.style.top),
                            emoji: m.dataset.emoji,
                            note: m.dataset.note
                        });
                    });

                    const drawingUrl = reconCanvas.toDataURL();

                    const reconData = {
                        id: 'recon-' + name.toLowerCase().replace(/\s+/g, '-'),
                        name: name,
                        isReconScenario: true,
                        snapshot: snapshotUrl,
                        bgImage: reconBgImage.classList.contains('hidden') ? '' : reconBgImage.src,
                        report: reconReport.value,
                        markers: markers,
                        drawing: drawingUrl,
                        timestamp: new Date().toISOString()
                    };

                    const ps = getProfiles();
                    ps[name] = reconData;

                    const postSave = () => {
                        saveReconMapBtn.disabled = false;
                        saveReconMapBtn.innerHTML = originalHTML;
                        if (window.lucide) window.lucide.createIcons();

                        window.currentLibraryFilter = 'all';
                        window.openLibrary();
                        if (window.previewProfile) window.previewProfile(name);
                    };

                    if (window.TRC_IDB) {
                        window.TRC_IDB.set('rangeCardProfiles', name, reconData).then(() => {
                            postSave();
                        }).catch(err => {
                            console.error("IDB save failed, falling back to localStorage:", err);
                            localStorage.setItem('rangeCardProfiles', JSON.stringify(ps));
                            postSave();
                        });
                    } else {
                        localStorage.setItem('rangeCardProfiles', JSON.stringify(ps));
                        postSave();
                    }

                }).catch(err => {
                    document.body.classList.remove('is-capturing');
                    previewPanel.style.transition = originalTransition;
                    if (isVisuallyHidden) {
                        previewPanel.classList.add('opacity-0', 'pointer-events-none', 'absolute');
                        previewPanel.classList.remove('flex');
                    }

                    if (isContainerHidden) {
                        container.classList.add('hidden');
                        container.classList.remove('flex'); // Cleanup the forced flex class
                        container.style.position = originalPosition;
                        container.style.top = originalTop;
                        container.style.left = originalLeft;
                        container.style.width = originalWidth;
                        container.style.height = originalHeight;
                        container.style.zIndex = originalZIndex;
                    }

                    container.style.transform = originalTransform;
                    window.scrollTo(0, originalScrollY);

                    saveReconMapBtn.disabled = false;
                    saveReconMapBtn.innerHTML = originalHTML;
                    if (window.lucide) window.lucide.createIcons();

                    console.error("Recon capture failure:", err);
                    if (err && err.name === 'QuotaExceededError' || err.toString().includes('exceeded the quota')) {
                        alert("CRITICAL: Browser memory is 100% full! You must delete old Dope Cards or Recon Maps from the library before you can save this one.");
                    } else {
                        alert("Recon save failed. Please check log.");
                    }
                });
            }, 500);
        });
    }

    if (openReconLibraryBtn) {
        openReconLibraryBtn.addEventListener('click', () => {
            window.currentLibraryFilter = 'all';
            window.openLibrary();
        });
    }

    // === TACTICAL STOPWATCH CONTROLLER ===
    let timerInterval = null;
    let timerMilliseconds = 0;
    let isTimerRunning = false;

    const timerDisplay = document.getElementById('stopwatch-display');
    const timerStartBtn = document.getElementById('stopwatch-start');
    const timerResetBtn = document.getElementById('stopwatch-reset');

    function updateTimerDisplay() {
        if (!timerDisplay) return;
        let totalSeconds = Math.floor(timerMilliseconds / 1000);
        let mins = Math.floor(totalSeconds / 60);
        let secs = totalSeconds % 60;
        let tenths = Math.floor((timerMilliseconds % 1000) / 100);

        let displayMins = mins.toString().padStart(2, '0');
        let displaySecs = secs.toString().padStart(2, '0');
        
        timerDisplay.innerHTML = `${displayMins}:${displaySecs}<span class="text-xs text-neon-green/50">.${tenths}</span>`;
    }

    if (timerStartBtn) {
        timerStartBtn.addEventListener('click', () => {
            if (isTimerRunning) {
                // Pause
                clearInterval(timerInterval);
                timerStartBtn.innerHTML = '<i data-lucide="play" class="w-4 h-4"></i>';
                timerStartBtn.classList.replace('bg-amber-950/40', 'bg-emerald-950/40');
                timerStartBtn.classList.replace('text-amber-500', 'text-emerald-400');
                timerStartBtn.classList.replace('border-amber-800', 'border-emerald-800');
                isTimerRunning = false;
            } else {
                // Start
                const startTime = Date.now() - timerMilliseconds;
                timerInterval = setInterval(() => {
                    timerMilliseconds = Date.now() - startTime;
                    updateTimerDisplay();
                }, 100);
                timerStartBtn.innerHTML = '<i data-lucide="pause" class="w-4 h-4"></i>';
                timerStartBtn.classList.replace('bg-emerald-950/40', 'bg-amber-950/40');
                timerStartBtn.classList.replace('text-emerald-400', 'text-amber-500');
                timerStartBtn.classList.replace('border-emerald-800', 'border-amber-800');
                isTimerRunning = true;
            }
            if (window.lucide) window.lucide.createIcons();
        });
    }

    if (timerResetBtn) {
        timerResetBtn.addEventListener('click', () => {
            clearInterval(timerInterval);
            isTimerRunning = false;
            timerMilliseconds = 0;
            updateTimerDisplay();
            if (timerStartBtn) {
                timerStartBtn.innerHTML = '<i data-lucide="play" class="w-4 h-4"></i>';
                timerStartBtn.className = "bg-emerald-950/40 border border-emerald-800 text-emerald-400 p-2 rounded hover:bg-emerald-900/60 hover:border-emerald-600 transition-colors";
            }
            if (window.lucide) window.lucide.createIcons();
        });
    }

    // =================================================================
    // === TACTICAL DUAL-VIEW HUD CONTROLLER ===
    // =================================================================
    const dualHudView = document.getElementById('dualHudView');
    const launchDualHudBtn = document.getElementById('launchDualHudBtn');
    const closeHudBtn = document.getElementById('closeHudBtn');
    
    const hudSelectCardBtn = document.getElementById('hudSelectCardBtn');
    const hudSelectMapBtn = document.getElementById('hudSelectMapBtn');
    const hudCardImg = document.getElementById('hudCardImg');
    const hudMapImg = document.getElementById('hudMapImg');
    const hudCardEmpty = document.getElementById('hudCardEmpty');
    const hudMapEmpty = document.getElementById('hudMapEmpty');
    
    const hudAssetSelectorOverlay = document.getElementById('hudAssetSelectorOverlay');
    const hudSelectorTitle = document.getElementById('hudSelectorTitle');
    const hudSelectorList = document.getElementById('hudSelectorList');
    const closeHudSelectorBtn = document.getElementById('closeHudSelectorBtn');

    let currentHudTarget = 'card'; // 'card' or 'map'

    // --- HUD Control & Open/Close ---
    if (launchDualHudBtn && dualHudView) {
        launchDualHudBtn.addEventListener('click', () => {
            dualHudView.classList.remove('hidden');
            document.body.style.overflow = 'hidden'; // Lock main scroll
            if (window.lucide) window.lucide.createIcons();
        });
    }

    if (closeHudBtn) {
        closeHudBtn.addEventListener('click', () => {
            dualHudView.classList.add('hidden');
            document.body.style.overflow = ''; // Restore scroll
        });
    }

    // --- Loader Logic ---
    function openHudAssetSelector(type) {
        currentHudTarget = type;
        hudSelectorTitle.textContent = type === 'card' ? 'SELECT RANGE CARD' : 'SELECT RECON MAP';
        hudSelectorList.innerHTML = '';

        const profiles = (typeof getProfiles === 'function') ? getProfiles() : {};
        let names = Object.keys(profiles).sort().reverse();

        // Filter by type
        if (type === 'card') {
            names = names.filter(n => !profiles[n].isReconScenario);
        } else {
            names = names.filter(n => !!profiles[n].isReconScenario);
        }

        if (names.length === 0) {
            hudSelectorList.innerHTML = `<div class="text-center py-8 text-gray-400 text-xs font-mono uppercase tracking-widest">No saved ${type}s found</div>`;
        } else {
            names.forEach(name => {
                const row = document.createElement('div');
                row.className = "p-3 bg-gray-900 hover:bg-orange-900/20 border border-gray-800 hover:border-orange-500/50 rounded cursor-pointer flex items-center justify-between transition-all group";
                
                const meta = profiles[name].isReconScenario 
                    ? `RECON • ${profiles[name].timestamp ? new Date(profiles[name].timestamp).toLocaleDateString() : 'Date Unknown'}`
                    : `${profiles[name].caliber || 'NO CALIBER'} • ${profiles[name].date || '--'}`;

                row.innerHTML = `
                    <div class="min-w-0">
                        <div class="font-bold text-[11px] text-white truncate uppercase group-hover:text-orange-400">${name}</div>
                        <div class="text-[9px] text-gray-400 font-mono uppercase mt-0.5">${meta}</div>
                    </div>
                    <i data-lucide="chevron-right" class="w-3.5 h-3.5 text-gray-400 group-hover:text-orange-400"></i>
                `;

                row.addEventListener('click', () => {
                    loadAssetIntoHud(profiles[name].snapshot);
                });
                
                hudSelectorList.appendChild(row);
            });
        }

        hudAssetSelectorOverlay.classList.remove('hidden');
        hudAssetSelectorOverlay.classList.add('flex');
        if (window.lucide) window.lucide.createIcons();
    }

    function loadAssetIntoHud(imgData) {
        if (!imgData) {
            alert("Error: No visual image snapshot found for this record.");
            return;
        }
        if (currentHudTarget === 'card') {
            hudCardImg.src = imgData;
            hudCardImg.classList.remove('hidden');
            hudCardEmpty.classList.add('hidden');
        } else {
            hudMapImg.src = imgData;
            hudMapImg.classList.remove('hidden');
            hudMapEmpty.classList.add('hidden');
        }
        // Close Selector
        hudAssetSelectorOverlay.classList.add('hidden');
        hudAssetSelectorOverlay.classList.remove('flex');
    }

    // --- Event Links ---
    if (hudSelectCardBtn) {
        hudSelectCardBtn.addEventListener('click', () => openHudAssetSelector('card'));
    }
    if (hudSelectMapBtn) {
        hudSelectMapBtn.addEventListener('click', () => openHudAssetSelector('map'));
    }
    if (closeHudSelectorBtn) {
        closeHudSelectorBtn.addEventListener('click', () => {
            hudAssetSelectorOverlay.classList.add('hidden');
            hudAssetSelectorOverlay.classList.remove('flex');
        });
    }
    // Close overlay on backdrop click
    if (hudAssetSelectorOverlay) {
        hudAssetSelectorOverlay.addEventListener('click', (e) => {
            if (e.target === hudAssetSelectorOverlay) {
                hudAssetSelectorOverlay.classList.add('hidden');
                hudAssetSelectorOverlay.classList.remove('flex');
            }
        });
    }

    // Force initial sync
    if (window.updateProfileList) window.updateProfileList();

    // ========================================================================
    // PRO UPGRADE: TACTICAL TOOLS DASHBOARD CORE LOGIC
    // ========================================================================
    const dashShell = document.getElementById('tacticalDashboard');
    const launchBtn = document.getElementById('launchToolsDashboardBtn');
    const exitBtn = document.getElementById('exitDashboardBtn');

    if (launchBtn && dashShell) {
        launchBtn.addEventListener('click', () => {
            dashShell.classList.remove('hidden');
            dashShell.classList.add('flex');
            document.body.classList.add('tactical-dashboard-active');
            // Update live clock loop if not already running
            if (!window.dashClockInterval) {
                const updateClock = () => {
                    const el = document.getElementById('dash-clock');
                    if(el) el.textContent = new Date().toLocaleTimeString('en-US', {hour12: false});
                };
                updateClock();
                window.dashClockInterval = setInterval(updateClock, 1000);
            }
            if (window.lucide) window.lucide.createIcons();
        });
    }

    if (exitBtn && dashShell) {
        exitBtn.addEventListener('click', () => {
            dashShell.classList.add('hidden');
            dashShell.classList.remove('flex');
            document.body.classList.remove('tactical-dashboard-active');
            
            // Reset any fullscreen panels back to normal on shutdown
            document.querySelectorAll('.dash-panel.is-maximized').forEach(el => {
                el.classList.remove('is-maximized');
                // Restore icon
                const btn = el.querySelector('.maximize-btn i');
                if(btn) btn.setAttribute('data-lucide', 'maximize-2');
            });
            if (window.lucide) window.lucide.createIcons();
        });
    }

    // GLOBAL FULLSCREEN TOGGLE HELPER (Exposed to window for onclick attributes)
    window.toggleFullscreen = function(panelId) {
        const panel = document.getElementById(panelId);
        if (!panel) return;

        const isMax = panel.classList.contains('is-maximized');
        
        // Close all other maximized panels first to ensure cleanliness
        document.querySelectorAll('.dash-panel.is-maximized').forEach(el => {
            el.classList.remove('is-maximized');
            const icon = el.querySelector('.maximize-btn [data-lucide]');
            if(icon) {
                const newI = document.createElement('i');
                newI.setAttribute('data-lucide', 'maximize-2');
                newI.className = icon.getAttribute('class').replace(/lucide(-[a-z0-9]+)?/g, '').trim();
                if(!newI.className) newI.className = 'w-3.5 h-3.5';
                icon.replaceWith(newI);
            }
            // RUN CLEANUP ON PANELS BEING AUTO-CLOSED
            if (el.id === 'panel-dope-select') {
                document.getElementById('dope-cache-selector-grid').classList.add('hidden');
                document.getElementById('dope-cache-selector-grid').classList.remove('flex');
            } else if (el.id === 'panel-sat-select') {
                document.getElementById('sat-archive-selector-grid').classList.add('hidden');
                document.getElementById('sat-archive-selector-grid').classList.remove('flex');
            } else if (el.id === 'panel-measuring') {
                document.getElementById('geo-toolkit-bar')?.classList.add('hidden');
                document.getElementById('geo-ruler-footer')?.classList.add('hidden');
            } else if (el.id === 'panel-vault') {
                document.getElementById('vault-selector-grid').classList.add('hidden');
                document.getElementById('vault-selector-grid').classList.remove('flex');
            }
        });

        if (!isMax) {
            panel.classList.add('is-maximized');
            const icon = panel.querySelector('.maximize-btn [data-lucide]');
            if(icon) {
                const newI = document.createElement('i');
                newI.setAttribute('data-lucide', 'minimize-2');
                newI.className = icon.getAttribute('class').replace(/lucide(-[a-z0-9]+)?/g, '').trim();
                if(!newI.className) newI.className = 'w-3.5 h-3.5';
                icon.replaceWith(newI);
            }

            // === TRIGGER SPECIFIC PANEL LOGIC ON OPEN ===
            if (panelId === 'panel-dope-select') {
                document.getElementById('dope-cache-selector-grid').classList.remove('hidden');
                document.getElementById('dope-cache-selector-grid').classList.add('flex');
                refreshDopeCacheGrid();
            } else if (panelId === 'panel-sat-select') {
                document.getElementById('sat-archive-selector-grid').classList.remove('hidden');
                document.getElementById('sat-archive-selector-grid').classList.add('flex');
                refreshSatArchiveGrid();
            } else if (panelId === 'panel-measuring') {
                // UNCONDITIONAL FORCED VISIBILITY INJECTION
                document.getElementById('geo-toolkit-bar')?.classList.remove('hidden');
                document.getElementById('geo-ruler-footer')?.classList.remove('hidden');
                setTimeout(() => { if(orbitalMap) orbitalMap.invalidateSize(); }, 600);
            } else if (panelId === 'panel-vault') {
                document.getElementById('vault-selector-grid').classList.remove('hidden');
                document.getElementById('vault-selector-grid').classList.add('flex');
                refreshVaultGrid();
            } else if (panelId === 'panel-comms') {
                setTimeout(() => { if(commsMapInstance) commsMapInstance.invalidateSize(); }, 600);
            } else if (panelId === 'panel-workstation') {
                if (typeof window.renderWorkstationMenu === 'function') {
                    window.renderWorkstationMenu();
                }
            }
        } else {
            // === CLEANUP SPECIFIC PANEL LOGIC ON CLOSE ===
            if (panelId === 'panel-dope-select') {
                document.getElementById('dope-cache-selector-grid').classList.add('hidden');
                document.getElementById('dope-cache-selector-grid').classList.remove('flex');
            } else if (panelId === 'panel-sat-select') {
                document.getElementById('sat-archive-selector-grid').classList.add('hidden');
                document.getElementById('sat-archive-selector-grid').classList.remove('flex');
            } else if (panelId === 'panel-measuring') {
                // UNCONDITIONAL FORCED HIDE INJECTION FOR MINIMIZED MODE
                document.getElementById('geo-toolkit-bar')?.classList.add('hidden');
                document.getElementById('geo-ruler-footer')?.classList.add('hidden');
                setTimeout(() => { if(orbitalMap) orbitalMap.invalidateSize(); }, 600);
            } else if (panelId === 'panel-vault') {
                document.getElementById('vault-selector-grid').classList.add('hidden');
                document.getElementById('vault-selector-grid').classList.remove('flex');
            } else if (panelId === 'panel-comms') {
                setTimeout(() => { if(commsMapInstance) commsMapInstance.invalidateSize(); }, 600);
            }
        }
        
        if (window.lucide) window.lucide.createIcons();
    };

    // ------------------------------------------------------------------------
    // 5. TAC-COMMS: DYNAMIC LOGGING INFRASTRUCTURE
    // ------------------------------------------------------------------------
    window.pushTacLog = function(message, type = 'INFO') {
        const feed = document.getElementById('tac-log-feed');
        const container = document.getElementById('tac-log-container');
        if (!feed) return;

        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const entry = document.createElement('div');
        
        // Type styles
        let prefixColor = 'text-emerald-600';
        let textColor = 'text-gray-400';
        if (type === 'ALERT') { prefixColor = 'text-red-500'; textColor = 'text-red-200'; }
        if (type === 'SUCCESS') { prefixColor = 'text-neon-green'; textColor = 'text-white font-bold'; }
        if (type === 'LOCK') { prefixColor = 'text-pink-500'; textColor = 'text-pink-200 font-bold'; }
        if (type === 'SYS') { prefixColor = 'text-blue-400'; textColor = 'text-blue-100'; }

        entry.className = `flex items-start gap-1.5 border-l-2 border-gray-800/50 pl-1 py-0.5 hover:bg-white/5 transition-colors group`;
        entry.innerHTML = `
            <span class="text-[7px] text-gray-400 font-mono group-hover:text-emerald-700 transition-colors">${timestamp}</span>
            <span class="font-black tracking-tighter text-[8px] ${prefixColor}">[${type}]</span>
            <span class="${textColor} uppercase tracking-wide leading-tight flex-1 text-[10px]">${message}</span>
        `;
        
        feed.appendChild(entry);
        
        // Keep scrolling to bottom for live updates!
        if(container) {
            container.scrollTop = container.scrollHeight;
        }
    };

    // Fire final cold-boot signal!
    setTimeout(() => window.pushTacLog("TACTICAL FEED ACTIVATED. READY TO TRANSMIT.", "SYS"), 2000);

    // ========================================================================
    // DOPE CACHE GRID SELECTOR SYSTEM
    // ========================================================================
    window.unloadDashboardCard = function(win) {
        window.pushTacLog(`SYSTEM: PANEL ${win} RESET INITIATED`, "SYS");
        if (win === 1) {
            const t = document.getElementById('dope-cache-active-display');
            if (!t) return;
            t.className = "w-full h-full flex items-center justify-center text-center px-2 group-hover:bg-emerald-500/5 transition-all";
            t.innerHTML = `<div class="text-center">
                                <i data-lucide="clipboard-list" class="w-6 h-6 text-gray-700 mx-auto mb-1 group-hover:text-emerald-600 transition-all"></i>
                                <p class="text-[8px] font-mono text-gray-400 uppercase tracking-[0.2em]">LOAD DOPE CACHE</p>
                            </div>`;
        } else if (win === 2) {
            const t = document.getElementById('sat-archive-active-display');
            if (!t) return;
            t.className = "w-full h-full flex items-center justify-center text-center px-2 group-hover:bg-emerald-500/5 transition-all";
            t.innerHTML = `<div class="text-center">
                                <i data-lucide="map" class="w-6 h-6 text-gray-700 mx-auto mb-1 group-hover:text-emerald-600 transition-all"></i>
                                <p class="text-[8px] font-mono text-gray-400 uppercase tracking-[0.2em]">ACCESS SAT ARCHIVE</p>
                            </div>`;
        } else if (win === 4) {
            const t = document.getElementById('vault-active-display');
            if (!t) return;
            t.innerHTML = `<div class="text-center">
                                <i data-lucide="database" class="w-6 h-6 text-gray-700 mx-auto mb-1 group-hover:text-emerald-600"></i>
                                <p class="text-[8px] font-mono text-gray-400 uppercase tracking-[0.2em]">SECURE INTEL VAULT</p>
                            </div>`;
        }
        if (window.lucide) window.lucide.createIcons();
    }

    function refreshDopeCacheGrid() {
        const container = document.getElementById('dope-cache-list-injection');
        if (!container) return;
        container.innerHTML = '';

        const profiles = window.getProfiles ? window.getProfiles() : {};
        // Filter strictly to Dope Cards (NO HIDDEN FILTERS!)
        const names = Object.keys(profiles).filter(n => !profiles[n].isReconScenario).sort().reverse();

        if (names.length === 0) {
            container.innerHTML = `<div class="col-span-full p-10 text-center border border-dashed border-gray-800 text-gray-400 uppercase font-mono text-xs">
                <i data-lucide="database" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
                Library Empty.<br>Please create & save a Dope Card in main forms first.
            </div>`;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        names.forEach(name => {
            const p = profiles[name];
            const card = document.createElement('div');
            card.className = "bg-gray-900/80 rounded hover:bg-emerald-950/20 transition-all p-2 cursor-pointer group relative overflow-hidden flex flex-col h-full" +
                " border-2" +
                " " + "vault-accent-card";
            
            // Try to extract a tiny preview from the snapshot if available
            let imgHtml = `<div class="aspect-[4/3] bg-black/50 flex items-center justify-center mb-2 border border-gray-800"><i data-lucide="image" class="text-gray-700 w-6 h-6"></i></div>`;
            if (p.snapshot) {
                imgHtml = `<div class="aspect-[4/3] w-full mb-2 border border-gray-800 overflow-hidden bg-white flex items-center justify-center"><img src="${p.snapshot}" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"></div>`;
            }

            card.innerHTML = `
                ${imgHtml}
                <div class="flex-1 min-w-0">
                    <h4 class="text-[10px] font-bold text-gray-200 truncate uppercase">${name}</h4>
                    <div class="flex justify-between mt-1">
                        <span class="text-[8px] font-mono text-emerald-500">${p.caliber || '--'}</span>
                        <span class="text-[8px] font-mono text-gray-400">${p.date || '--'}</span>
                    </div>
                </div>
                
                <div class="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 pointer-events-none border-2 border-transparent group-hover:border-emerald-500/50 rounded transition-all"></div>
                
                <!-- Send to Vault Checkbox -->
                <div class="absolute top-1 left-1 z-30 bg-black/60 p-0.5 rounded shadow-[0_0_10px_rgba(0,0,0,0.8)] border border-gray-600">
                    <label class="sr-only">Mark Dope Card for Vault</label><input autocomplete="off" type="checkbox" class="dope-vault-checkbox w-4 h-4 cursor-pointer bg-black/50 border border-gray-500 rounded text-neon-green focus:ring-neon-green/50 shadow-lg" data-profile-name="${name}" title="Mark for Vault" aria-label="Mark Dope Card for Vault">
                </div>
                
                <!-- Delete Button -->
                <button class="absolute top-1 right-1 z-30 bg-red-950/90 text-red-400 p-1 rounded border border-red-900/50 hover:bg-red-600 hover:text-white transition-colors" onclick="event.stopPropagation(); window.deleteRangeProfile('${name.replace(/'/g, "\\'")}')" title="Delete Profile">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
            `;
            
            // Handle Selection ONLY (ignore checkbox clicks)
            card.addEventListener('click', (e) => {
                if (e.target.closest('.dope-vault-checkbox')) {
                    // Update button visibility
                    const anyChecked = document.querySelectorAll('.dope-vault-checkbox:checked').length > 0;
                    const btn = document.getElementById('dope-to-vault-btn');
                    if (btn) {
                        if (anyChecked) btn.classList.remove('hidden');
                        else btn.classList.add('hidden');
                    }
                    return;
                }
                e.stopPropagation();
                selectDopeCardForDashboard(name, p);
            });
            
            container.appendChild(card);
        });
        if (window.lucide) window.lucide.createIcons();
        
        // Ensure button starts hidden
        const btn = document.getElementById('dope-to-vault-btn');
        if (btn) btn.classList.add('hidden');
    }

    function selectDopeCardForDashboard(name, data) {
        // BROADCAST TO TICKER
        window.pushTacLog(`DOPE CACHE ACCESSED: LOADED ${name.toUpperCase()}`, "SUCCESS");
        
        const target = document.getElementById('dope-cache-active-display');
        if (!target) return;

        // Set miniature preview in window 1
        target.innerHTML = `
            <div class="w-full h-full bg-black overflow-hidden flex items-center justify-center relative">
                ${data.snapshot ? `<img src="${data.snapshot}" class="w-full h-full object-contain">` : ''}
                
                <!-- Floating Badge overlay so detail is not obscured -->
                <div class="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-black via-black/50 to-transparent z-10"></div>
                <div class="absolute bottom-1 left-1 z-20 text-[9px] font-black text-emerald-400 drop-shadow-md truncate max-w-[60%] uppercase">
                    ${name}
                </div>
                <div class="absolute bottom-1 right-1 z-20 bg-black/80 border border-emerald-900 text-emerald-500 px-1 py-0.5 rounded text-[7px] font-mono font-bold">
                    CAL: ${data.caliber || '---'}
                </div>
                <!-- Non-Destructive Unload Actuator -->
                <button class="absolute top-1 right-1 bg-red-950/90 text-red-300 border border-red-600/50 p-1 rounded z-10 hover:bg-red-600 hover:text-white transition-all shadow-lg" onclick="event.stopPropagation(); window.unloadDashboardCard(1)" title="Unload Card">
                    <i data-lucide="trash-2" class="w-2.5 h-2.5"></i>
                </button>
            </div>
        `;
        
        if (window.lucide) window.lucide.createIcons();
        
        // Auto-Minimize back to grid!
        window.toggleFullscreen('panel-dope-select');
    }

    // ========================================================================
    // SAT ARCHIVE GRID SELECTOR SYSTEM
    // ========================================================================
    function refreshSatArchiveGrid() {
        const container = document.getElementById('sat-archive-list-injection');
        if (!container) return;
        container.innerHTML = '';

        const profiles = window.getProfiles ? window.getProfiles() : {};
        // Filter strictly to Recon Maps (No hide exclusions)
        const names = Object.keys(profiles).filter(n => !!profiles[n].isReconScenario).sort().reverse();

        if (names.length === 0) {
            container.innerHTML = `<div class="col-span-full p-10 text-center border border-dashed border-gray-800 text-gray-400 uppercase font-mono text-xs">
                <i data-lucide="satellite" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
                No Maps Detected.<br>Please construct & save a Recon Map first.
            </div>`;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        names.forEach(name => {
            const p = profiles[name];
            const card = document.createElement('div');
            card.className = "bg-gray-900/80 rounded hover:bg-emerald-950/20 transition-all p-2 cursor-pointer group relative overflow-hidden flex flex-col h-full" +
                " border-2" +
                " " + "vault-accent-card";
            
            // Handle map backdrop (CRITICAL SWAP: Prefer snapshot to inherit emojis and drawings automatically)
            const mapSrc = p.snapshot || p.bgImage || null;
            let imgHtml = `<div class="aspect-[4/3] bg-black/50 flex items-center justify-center mb-2 border border-gray-800"><i data-lucide="image" class="text-gray-700 w-6 h-6"></i></div>`;
            if (mapSrc) {
                imgHtml = `<div class="aspect-[4/3] w-full mb-2 border border-gray-800 overflow-hidden bg-black flex items-center justify-center relative">
                    <img src="${mapSrc}" class="w-full h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity">
                </div>`;
            }

            card.innerHTML = `
                ${imgHtml}
                <div class="flex-1 min-w-0">
                    <h4 class="text-[10px] font-bold text-emerald-100 truncate uppercase">${name}</h4>
                    <div class="flex justify-between mt-1">
                        <span class="text-[8px] font-mono text-gray-400 uppercase">RECON SITREP</span>
                        <span class="text-[8px] font-mono text-gray-400">${p.timestamp ? new Date(p.timestamp).toLocaleDateString() : '--'}</span>
                    </div>
                </div>
                
                <div class="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 pointer-events-none border-2 border-transparent group-hover:border-emerald-500/50 rounded transition-all"></div>
                
                <!-- Send to Vault Checkbox -->
                <div class="absolute top-1 left-1 z-30 bg-black/60 p-0.5 rounded">
                    <label class="sr-only">Mark Target Data for Vault</label><input autocomplete="off" type="checkbox" class="sat-vault-checkbox w-4 h-4 cursor-pointer bg-black/50 border border-gray-500 rounded text-neon-green focus:ring-neon-green/50 shadow-lg" data-profile-name="${name}" title="Mark for Vault" aria-label="Mark Target Data for Vault">
                </div>
                
                <!-- Delete Button -->
                <button class="absolute top-1 right-1 z-30 bg-red-950/90 text-red-400 p-1 rounded border border-red-900/50 hover:bg-red-600 hover:text-white transition-colors" onclick="event.stopPropagation(); window.deleteRangeProfile('${name.replace(/'/g, "\\'")}')" title="Delete Profile">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
            `;
            
            // Bind selection handler ONLY (ignore checkbox clicks)
            card.addEventListener('click', (e) => {
                if (e.target.closest('.sat-vault-checkbox')) {
                    // Update button visibility
                    const anyChecked = document.querySelectorAll('.sat-vault-checkbox:checked').length > 0;
                    const btn = document.getElementById('sat-to-vault-btn');
                    if (btn) {
                        if (anyChecked) btn.classList.remove('hidden');
                        else btn.classList.add('hidden');
                    }
                    return;
                }
                e.stopPropagation();
                selectSatArchiveForDashboard(name, p);
            });

            container.appendChild(card);
        });
        if (window.lucide) window.lucide.createIcons();
        
        // Ensure button starts hidden
        const btn = document.getElementById('sat-to-vault-btn');
        if (btn) btn.classList.add('hidden');
    }

    function selectSatArchiveForDashboard(name, data) {
        // BROADCAST TO TICKER
        window.pushTacLog(`SITREP INGESTED: SYNCED ${name.toUpperCase()}`, "SUCCESS");

        const target = document.getElementById('sat-archive-active-display');
        if (!target) return;

        // CRITICAL SIMPLIFICATION: Load high-fidelity pre-baked full card snapshot ONLY (identical logic to Window 1)
        const highFidelitySnapshot = data.snapshot || data.bgImage || '';

        target.innerHTML = `
            <div class="w-full h-full bg-black flex items-center justify-center overflow-hidden relative">
                ${highFidelitySnapshot ? `<img src="${highFidelitySnapshot}" class="w-full h-full object-contain block pointer-events-none">` : ''}
                
                <!-- Floating Header Badge Overlay -->
                <div class="absolute top-0 inset-x-0 h-8 bg-gradient-to-b from-black via-black/50 to-transparent z-10"></div>
                <div class="absolute top-1 left-1 z-20 opacity-95 bg-emerald-950/90 border border-emerald-600 text-emerald-300 px-2 py-0.5 rounded shadow-[0_0_10px_rgba(0,0,0,0.8)] font-black uppercase text-[7px] tracking-wider flex items-center gap-1">
                    <span class="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span> MAP: ${name}
                </div>

                <!-- Non-Destructive Unload Actuator -->
                <button class="absolute top-1 right-1 bg-red-950/90 text-red-300 border border-red-600/50 p-1 rounded z-10 hover:bg-red-600 hover:text-white transition-all shadow-[0_0_10px_rgba(0,0,0,0.8)]" onclick="event.stopPropagation(); window.unloadDashboardCard(2)" title="Unload Map">
                    <i data-lucide="trash-2" class="w-2.5 h-2.5"></i>
                </button>
            </div>
        `;
        
        if (window.lucide) window.lucide.createIcons();
        
        // Auto-Minimize back to grid!
        window.toggleFullscreen('panel-sat-select');
    }

    // ========================================================================
    // WEATHER / ATMOSPHERIC TELEMETRY SYNC
    // ========================================================================
    const syncWxBtn = document.getElementById('sync-wx-btn');
    if (syncWxBtn) {
        syncWxBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent maximizing dashboard just from clicking sync button
            fetchTacticalWeather();
        });
    }

    function fetchTacticalWeather() {
        const btn = document.getElementById('sync-wx-btn');
        const statusEl = document.getElementById('wx-status');
        
        if (!navigator.geolocation) {
            alert("Geolocation not supported by browser.");
            return;
        }

        // UI Feedback for loading state
        const originalText = btn.innerHTML;
        btn.innerHTML = `<span class="animate-pulse">📡 ACQUIRING ORBITAL LOC...</span>`;
        btn.disabled = true;
        statusEl.textContent = 'SYNCING...';
        statusEl.className = 'text-[7px] font-bold text-yellow-500 uppercase';

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;
                
                btn.innerHTML = `<span class="animate-pulse">🛰️ STREAMING CLIMATE...</span>`;

                // 1. Call Extended Open-Meteo API including Weather Code for Sky State
                const apiURL = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`;

                fetch(apiURL)
                    .then(response => response.json())
                    .then(data => {
                        const c = data.current;
                        if (!c) throw new Error("Incomplete stream data");

                        // 2. UNIT CONVERSIONS (HPA to INHG)
                        const hpa = c.surface_pressure;
                        const inHg = hpa * 0.02953;
                        const tempF = c.temperature_2m;

                        // 3. DYNAMIC DENSITY ALTITUDE CALCULATION (Unified High-Fidelity Physics)
                        const pressRatio = inHg / 29.92;
                        const tempRatio = 518.67 / (459.67 + tempF);
                        const airDensityRatio = pressRatio * tempRatio;
                        const densAlt = Math.round((1 - Math.pow(airDensityRatio, 1 / 4.25588)) / 0.0000068753);

                        // 4. WMO WEATHER CODE MAPPING
                        let skyCond = "CLEAR";
                        const code = c.weather_code;
                        if (code === 0) skyCond = "CLEAR";
                        else if (code <= 3) skyCond = "CLOUDY";
                        else if (code === 45 || code === 48) skyCond = "FOGGY";
                        else if (code >= 51 && code <= 67) skyCond = "RAINY";
                        else if (code >= 71 && code <= 77) skyCond = "SNOWY";
                        else if (code >= 80 && code <= 82) skyCond = "SHOWERS";
                        else if (code >= 95) skyCond = "STORM";
                        else skyCond = "DUSTY/HAZY";

                        // 5. INJECT INTELLIGENCE INTO GRID
                        document.getElementById("wx-temp").textContent = Math.round(tempF);
                        document.getElementById("wx-wind-speed").textContent = Math.round(c.wind_speed_10m);
                        document.getElementById("wx-wind-dir").textContent = `DEG ${Math.round(c.wind_direction_10m)}`;
                        
                        // Push converted inHg with decimal precision
                        document.getElementById("wx-pres").textContent = inHg.toFixed(2);
                        document.getElementById("wx-humid").textContent = Math.round(c.relative_humidity_2m);
                        
                        // Push our 3 new high-level data points
                        const condEl = document.getElementById("wx-cond");
                        const daEl = document.getElementById("wx-da");
                        const elevEl = document.getElementById("wx-elev");
                        
                        if (condEl) condEl.textContent = skyCond;
                        if (daEl) daEl.textContent = densAlt.toLocaleString();
                        
                        // Extract Ground Elevation from Topographical Model (Meters to Feet)
                        if (elevEl && data.elevation !== undefined) {
                            const fieldElevFeet = Math.round(data.elevation * 3.28084);
                            elevEl.textContent = fieldElevFeet.toLocaleString();
                        }
                        
                        // AUTO-SYNC TO BALLISTIC SOLVER INPUTS
                        document.getElementById("bal-input-temp").value = Math.round(tempF);
                        document.getElementById("bal-input-baro").value = inHg.toFixed(2);
                        document.getElementById("bal-input-wind").value = Math.round(c.wind_speed_10m);
                        document.getElementById("bal-input-wind-dir").value = Math.round(c.wind_direction_10m);
                        if (typeof runSolverMatrix === "function") runSolverMatrix(); // Force instant re-calculation so HUD updates
                        

                        // Success State Update
                        statusEl.textContent = "SYNCED";
                        statusEl.className = "text-[7px] font-bold text-emerald-500 uppercase";
                        
                        btn.innerHTML = `<i data-lucide="check" class="w-3 h-3"></i> SYSTEM CALIBRATED`;
                        btn.className = "mt-3 w-full bg-emerald-950/40 border border-emerald-900/60 py-1.5 rounded text-[8px] font-black uppercase text-emerald-400 flex items-center justify-center gap-1.5 tracking-[0.15em]";
                        btn.disabled = false;

                        // Refresh Lucide for checkmark
                        if (window.lucide) window.lucide.createIcons();

                        // Reset button style back after 5 seconds
                        setTimeout(() => {
                            btn.innerHTML = originalText;
                            btn.className = "mt-3 w-full bg-blue-950/40 hover:bg-blue-900/60 border border-blue-900/60 py-1.5 rounded text-[8px] font-black uppercase text-blue-300 flex items-center justify-center gap-1.5 tracking-[0.15em] transition-all active:scale-95";
                            if (window.lucide) window.lucide.createIcons();
                        }, 5000);
                    })
                    .catch(err => {
                        console.error("WX ERROR:", err);
                        statusEl.textContent = "STREAM FAIL";
                        statusEl.className = "text-[7px] font-bold text-red-500 uppercase";
                        btn.innerHTML = `<i data-lucide="alert-triangle" class="w-3 h-3"></i> RETRY SYNC`;
                        btn.disabled = false;
                        if (window.lucide) window.lucide.createIcons();
                    });
            },
            (error) => {
                console.error("GPS ERROR:", error);
                alert("Location Access Denied or Unavailable.");
                statusEl.textContent = "NO GPS";
                statusEl.className = "text-[7px] font-bold text-red-500 uppercase";
                btn.innerHTML = originalText;
                btn.disabled = false;
                if (window.lucide) window.lucide.createIcons();
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }

    // ========================================================================
    // GEOSPATIAL ORBITAL VECTOR MAP
    // ========================================================================
    let orbitalMap = null;
    window.eventMarkers = [];
    window.eventLines = [];
    let rallyPointLine = null;
    let mapMarkers = [];
    let mapPolyline = null;
    let mapLabelMarker = null;
    let isMultiTargetMode = false;
    let mapPolylines = [];
    let mapLabelMarkers = [];
    let isDrawingMode = false;
    let allDrawings = [];
    let currentDrawPath = null;

    function initGeoCanvas() {
        // Redirect call from the old function name to new Map engine
        initLiveMap();
    }

    function initLiveMap() {
        const container = document.getElementById("live-sat-map-container");
        if (!container) return;

        // 1. Create the Map if it hasn't been instantiated yet
        if (!orbitalMap) {
            // Force Canvas rendering instead of SVG so snapshots work flawlessly
            orbitalMap = L.map(container, {
                zoomControl: false,
                attributionControl: false,
                preferCanvas: true 
            });
            
            // Frame the view exactly around the Atlantic, showing Greenland ice and Antarctica
            orbitalMap.fitBounds([
                [80, -110], // North-West corner
                [-70, 40]   // South-East corner
            ]);
            window.orbitalMap = orbitalMap; 
            // Prevent grey map issue when resizing the container
            const resizeObserver = new ResizeObserver(() => {
                if (orbitalMap) orbitalMap.invalidateSize();
            });
            resizeObserver.observe(container);

            // 2. Load World Imagery Tile Layer (Satellite)
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 19,
                attribution: 'Tiles &copy; Esri',
                crossOrigin: true
            }).addTo(orbitalMap);

            // Push Zoom control to a custom location so it doesn't mess with our headers
            L.control.zoom({ position: 'bottomright' }).addTo(orbitalMap);

            // 3. Add Global Map Click Listener for Vector Points
            orbitalMap.on('click', handleMapClick);

            // Desktop drawing - Leaflet mouse events (reliable on PC)
            orbitalMap.on('mousedown', (e) => {
                if (!isDrawingMode) return;
                currentDrawPath = L.polyline([e.latlng], {color: '#3b82f6', weight: 5, opacity: 0.9, smoothFactor: 1}).addTo(orbitalMap);
                allDrawings.push(currentDrawPath);
            });
            orbitalMap.on('mousemove', (e) => {
                if (!isDrawingMode || !currentDrawPath) return;
                currentDrawPath.addLatLng(e.latlng);
            });
            orbitalMap.on('mouseup', () => {
                if (!isDrawingMode) return;
                currentDrawPath = null;
            });

            // Mobile drawing - native DOM touch events on the map container
            const mapContainer = orbitalMap.getContainer();

            function getTouchLatLng(touch) {
                const rect = mapContainer.getBoundingClientRect();
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;
                return orbitalMap.containerPointToLatLng(L.point(x, y));
            }

            mapContainer.addEventListener('touchstart', (e) => {
                if (e.touches && e.touches.length === 3) {
                    const panel = document.getElementById('panel-measuring');
                    if (panel && panel.classList.contains('is-maximized')) {
                        window.toggleFullscreen('panel-measuring');
                        window.pushTacLog('GEO-MATRIX MINIMIZED', 'SYS');
                    }
                    return;
                }
                if (!isDrawingMode) return;
                if (e.touches && e.touches.length > 1) return; // Allow pinch-zoom
                const latlng = getTouchLatLng(e.touches[0]);
                currentDrawPath = L.polyline([latlng], {color: '#3b82f6', weight: 5, opacity: 0.9, smoothFactor: 1}).addTo(orbitalMap);
                allDrawings.push(currentDrawPath);
            }, { passive: true });

            mapContainer.addEventListener('touchmove', (e) => {
                if (!isDrawingMode || !currentDrawPath) return;
                if (e.touches && e.touches.length > 1) { currentDrawPath = null; return; } // Allow pinch-zoom
                const latlng = getTouchLatLng(e.touches[0]);
                currentDrawPath.addLatLng(latlng);
            }, { passive: true });

            mapContainer.addEventListener('touchend', (e) => {
                if (!isDrawingMode) return;
                currentDrawPath = null;
            }, { passive: true });
        // Auto-Trigger initial GPS sync to find where the user currently is!
            // syncMapToGps(); // Disabled on page load to comply with Lighthouse Best Practices
            
            // Force re-renders to fix grey tile bugs on mobile layout shifts
            setTimeout(() => { if (orbitalMap) orbitalMap.invalidateSize(); }, 500);
            setTimeout(() => { if (orbitalMap) orbitalMap.invalidateSize(); }, 1500);
            setTimeout(() => { if (orbitalMap) orbitalMap.invalidateSize(); }, 3000);
        } else {
            // If it exists, just force an invalidation to correct size after maximizing
            orbitalMap.invalidateSize();
        }
    }

    // ----------------------------------------------------------------
    // GEO COORDINATE JUMP — parses lat,long from toolbar input
    // ----------------------------------------------------------------
    window.geoJumpToCoords = function() {
        const input = document.getElementById('geo-coord-jump-input') || document.getElementById('geo-jump-input');
        if (!input) return;
        const raw = input.value.trim();
        if (!raw) return;

        // Accept formats: "34.0069, -101.98" or "34.0069 -101.98" or "34.0069,-101.98"
        const parts = raw.split(/[\s,]+/).filter(Boolean);
        if (parts.length < 2) {
            if (window.showToast) window.showToast('⚠ Enter coordinates as: lat, long', 'WARNING');
            return;
        }
        const lat = parseFloat(parts[0]);
        const lon = parseFloat(parts[1]);
        if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            if (window.showToast) window.showToast('⚠ Invalid coordinates. Lat: -90–90  Long: -180–180', 'WARNING');
            return;
        }

        const targetMap = window.geoMap || window.orbitalMap || (typeof orbitalMap !== 'undefined' ? orbitalMap : null);

        if (!targetMap) {
            if (window.showToast) window.showToast('⚠ Map not active — open Geo Matrix first', 'WARNING');
            return;
        }

        // Fly to location
        targetMap.invalidateSize();
        targetMap.flyTo([lat, lon], 14, { animate: true, duration: 1.2 });

        // Drop a persistent green pulse marker at the destination
        if (window.L) {
            const jumpIcon = window.L.divIcon({
                className: '',
                html: `<div style="width:18px;height:18px;background:rgba(16,185,129,0.9);border:3px solid #00ff88;border-radius:50%;box-shadow:0 0 20px rgba(16,185,129,0.8);animation:pulse 1s infinite;"></div>`,
                iconSize: [18, 18], iconAnchor: [9, 9]
            });
            const marker = window.L.marker([lat, lon], { icon: jumpIcon }).addTo(targetMap);
            marker.bindPopup(`<b style="font-family:monospace;font-size:10px;">📍 JUMP TARGET</b><br><span style="font-family:monospace;font-size:9px;">${lat.toFixed(5)}, ${lon.toFixed(5)}</span>`).openPopup();
            
            if (!window.wireIntelMarkers) window.wireIntelMarkers = [];
            window.wireIntelMarkers.push(marker);
        }

        if (window.showToast) window.showToast(`📍 JUMPED → ${lat.toFixed(5)}, ${lon.toFixed(5)}`);
        input.value = '';
    };

    function syncMapToGps() {
        if (!navigator.geolocation) return;
        if (window.isGhostMode) {
            window.pushTacLog("GHOST MODE ACTIVE. GPS SYNC DENIED.", "WARNING");
            return;
        }
        
        const btn = document.getElementById('geo-live-gps-btn');
        const origHtml = btn.innerHTML;
        btn.innerHTML = `<span class="animate-pulse">🛰️ LOCATING...</span>`;

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;
                if (orbitalMap) {
                    orbitalMap.setView([lat, lon], 17); // High Zoom
                }
                btn.innerHTML = `<i data-lucide="check" class="w-3 h-3"></i> GPS LOCKED`;
                if (window.lucide) window.lucide.createIcons();
                setTimeout(() => { btn.innerHTML = origHtml; if (window.lucide) window.lucide.createIcons(); }, 2000);
            },
            (err) => {
                console.error(err);
                btn.innerHTML = `❌ GPS FAIL`;
                setTimeout(() => { btn.innerHTML = origHtml; if (window.lucide) window.lucide.createIcons(); }, 2000);
            },
            { enableHighAccuracy: true }
        );
    }

    function handleMapClick(e) {
    if (window.activeIconStamp) {
        window.dropTacticalIcon(e.latlng.lat, e.latlng.lng, window.activeIconStamp);
        return; // Don't do other click actions if we are stamping
    }
        if (isDrawingMode) return;
        // Prevent accidental marker drops when clicking to expand the panel from the dashboard
        const panel = document.getElementById('panel-measuring');
        if (panel && !panel.classList.contains('is-maximized')) return;

        const latlng = e.latlng;

        if (!isMultiTargetMode) {
            // Cycle limit to 2 points (Starting new measure sequence on 3rd click)
            if (mapMarkers.length >= 2) {
                clearMapMeasurements();
            }
        } else {
            // Hub and Spoke (1 Origin + up to 10 targets)
            if (mapMarkers.length >= 11) {
                clearMapMeasurements();
            }
        }

        // Create visual point (HIGH CONTRAST PINK OVERRIDE)
        const marker = L.circleMarker(latlng, {
            radius: 6,
            color: '#ff1493', // HOT PINK for maximum visibility on map
            fillColor: '#000',
            fillOpacity: 1,
            weight: 2
        }).addTo(orbitalMap);

        mapMarkers.push(marker);

        if (mapMarkers.length >= 2) {
            drawMapLine();
        } else {
            document.getElementById('live-map-dist').textContent = "--.--";
        }
    }

    window.drawMapLine = function() {
        if (!orbitalMap || mapMarkers.length < 2) return;

        if (mapPolyline) orbitalMap.removeLayer(mapPolyline);
        if (mapLabelMarker) orbitalMap.removeLayer(mapLabelMarker);
        mapPolylines.forEach(p => orbitalMap.removeLayer(p));
        mapLabelMarkers.forEach(l => orbitalMap.removeLayer(l));
        mapPolylines = [];
        mapLabelMarkers = [];

        const origin = mapMarkers[0].getLatLng();
        let lastDisplayDistance = "--.--";

        for (let i = 1; i < mapMarkers.length; i++) {
            const target = mapMarkers[i].getLatLng();

            // Create Visual Path Line (HOT PINK DOTTED OVERRIDE)
            const polyline = L.polyline([origin, target], {
                color: '#ff1493', // HOT PINK
                weight: 3,
                dashArray: '6, 8',
                opacity: 0.9
            }).addTo(orbitalMap);

            if (!isMultiTargetMode) {
                mapPolyline = polyline;
            } else {
                mapPolylines.push(polyline);
            }

            // === MIDPOINT LABEL INJECTION (HOT PINK DISTANCE) ===
            const midLat = (origin.lat + target.lat) / 2;
            const midLng = (origin.lng + target.lng) / 2;
            
            // Spherical Earth Math
            const distanceMeters = origin.distanceTo(target);
            let displayDistance;
            if (geoDistanceUnit === 'YDS') {
                displayDistance = (distanceMeters * 1.09361).toFixed(1);
            } else {
                displayDistance = distanceMeters.toFixed(1);
            }
            lastDisplayDistance = displayDistance;

            const labelHtml = `<div style="color:#ff1493; font-family:'JetBrains Mono', monospace; font-weight:900; font-size:20px; text-shadow:-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000; white-space:nowrap;">${displayDistance} ${geoDistanceUnit}</div>`;
            const customIcon = L.divIcon({
                html: labelHtml,
                className: 'geo-midpoint-label',
                iconSize: null,
                iconAnchor: [30, -10]
            });

            const marker = L.marker([midLat, midLng], { icon: customIcon }).addTo(orbitalMap);

            if (!isMultiTargetMode) {
                mapLabelMarker = marker;
            } else {
                mapLabelMarkers.push(marker);
            }
        }

        document.getElementById('live-map-dist').textContent = lastDisplayDistance;
        if(document.getElementById('live-map-unit')) document.getElementById('live-map-unit').textContent = geoDistanceUnit;
        
        window.pushTacLog(`ORBITAL VECTOR SECURED:  .`, "LOCK");
        
        // === PERSIST TO MINIMIZED PANEL VIEW ===
        const minimized = document.getElementById('geo-minimized-view');
        if (minimized) {
            minimized.innerHTML = `
                <div class="w-full h-full bg-emerald-950/20 flex flex-col items-center justify-center p-2 text-center relative group-hover:bg-emerald-500/5 transition-all">
                    <div class="absolute top-1 left-1 text-[6px] text-emerald-500 font-black uppercase opacity-60">VECTOR LOCK</div>
                    <span class="text-2xl font-black text-white font-mono tracking-tighter leading-none">${lastDisplayDistance}</span>
                    <span class="text-[8px] font-black text-emerald-400 uppercase tracking-[0.2em] mt-1">${geoDistanceUnit}</span>
                    <div class="absolute bottom-1 right-1 text-[6px] text-gray-400 font-mono">GEO_FIX</div>
                </div>
            `;
        }

        // Adjust camera briefly to see both points perfectly
        const group = new L.featureGroup(mapMarkers);
        orbitalMap.fitBounds(group.getBounds().pad(0.2));
    }

    function clearMapDrawings() {
        if (orbitalMap && allDrawings.length > 0) {
            allDrawings.forEach(d => orbitalMap.removeLayer(d));
            allDrawings = [];
        }
    }

    window.clearMapMeasurements = function clearMapMeasurements() {
        if (orbitalMap) {
            mapMarkers.forEach(m => orbitalMap.removeLayer(m));
            if (mapPolyline) orbitalMap.removeLayer(mapPolyline);
            if (mapLabelMarker) orbitalMap.removeLayer(mapLabelMarker);
            mapPolylines.forEach(p => orbitalMap.removeLayer(p));
            mapLabelMarkers.forEach(l => orbitalMap.removeLayer(l));
            if (window.wireIntelMarkers) {
                window.wireIntelMarkers.forEach(m => orbitalMap.removeLayer(m));
                window.wireIntelMarkers = [];
            }
            // BUG FIX: Clear My GPS position marker + tooltip
            if (window.mySelfPositionMarker) {
                orbitalMap.removeLayer(window.mySelfPositionMarker);
                window.mySelfPositionMarker = null;
            }
            // Also clear teammate locator marker
            if (window.teammateLocatorMarker) {
                orbitalMap.removeLayer(window.teammateLocatorMarker);
                window.teammateLocatorMarker = null;
            }
        }
        mapMarkers = [];
        mapPolyline = null;
        mapLabelMarker = null;
        mapPolylines = [];
        mapLabelMarkers = [];
        // Reset GPS display badge
        window.myLatestCoords = null;
        const gpsDisplay = document.getElementById('geo-my-coords-display');
        if (gpsDisplay) gpsDisplay.textContent = '';
        const gpsBadge = document.getElementById('geo-my-coords-badge');
        if (gpsBadge) gpsBadge.classList.add('hidden');
        document.getElementById('live-map-dist').textContent = "--.--";

        // Reset Minimized View Back to Idle State
        const minimized = document.getElementById('geo-minimized-view');
        if (minimized) {
            minimized.innerHTML = `
                <div class="text-center">
                    <i data-lucide="ruler" class="w-6 h-6 text-gray-700 mx-auto mb-1 group-hover:text-emerald-600"></i>
                    <p class="text-[8px] font-mono text-gray-400 uppercase tracking-[0.2em]">ENGAGE GEO MATRIX</p>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
        }
    }

    // Toolbar Wire-Ups
    const gpsBtn = document.getElementById('geo-live-gps-btn');
    if (gpsBtn) { gpsBtn.addEventListener('click', (e) => { e.stopPropagation(); syncMapToGps(); }); }

    const clearMapBtn = document.getElementById('geo-clear-map-btn');
    if (clearMapBtn) { clearMapBtn.addEventListener('click', (e) => { e.stopPropagation(); clearMapMeasurements(); }); }

    
    let stateBoundariesLayer = null;
    let currentGmuLayer = null;

    const statesBtn = document.getElementById('geo-states-btn');
    if (statesBtn) {
        statesBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!orbitalMap) return;

            if (stateBoundariesLayer) {
                if (orbitalMap.hasLayer(stateBoundariesLayer)) {
                    orbitalMap.removeLayer(stateBoundariesLayer);
                    statesBtn.classList.replace('bg-yellow-800', 'bg-yellow-950/80');
                    if (window.pushTacLog) window.pushTacLog('STATE LINES CLEARED', 'GEO');
                } else {
                    stateBoundariesLayer.addTo(orbitalMap);
                    statesBtn.classList.replace('bg-yellow-950/80', 'bg-yellow-800');
                    if (window.pushTacLog) window.pushTacLog('STATE LINES LOADED', 'GEO');
                }
            } else {
                statesBtn.classList.replace('bg-yellow-950/80', 'bg-yellow-800');
                if (window.pushTacLog) window.pushTacLog('DOWNLOADING STATE LINES', 'GEO');
                
                const url = 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
                stateBoundariesLayer = L.tileLayer(url, {
                    maxZoom: 19,
                    attribution: 'Esri, HERE, Garmin',
                    zIndex: 200,
                    opacity: 1.0
                }).addTo(orbitalMap);
                
                if (window.pushTacLog) window.pushTacLog('STATE OVERLAY LOADED', 'SUCCESS');
            }
        });
    }

    const countiesBtn = document.getElementById('geo-counties-btn');
    if (countiesBtn) {
        countiesBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!orbitalMap) return;
            
            if (currentGmuLayer) {
                orbitalMap.removeLayer(currentGmuLayer);
                currentGmuLayer = null;
                countiesBtn.classList.replace('bg-indigo-800', 'bg-indigo-950/80');
                if (window.pushTacLog) window.pushTacLog('COUNTY LINES CLEARED', 'GEO');
            } else {
                countiesBtn.classList.replace('bg-indigo-950/80', 'bg-indigo-800');
                
                const originalText = countiesBtn.innerHTML;
                countiesBtn.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> DOWNLOADING...';
                if (window.lucide) window.lucide.createIcons();
                countiesBtn.disabled = true;

                async function loadCounties() {
                    try {
                        let data = null;
                        const countiesUrl = 'https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json';
                        const cacheName = 'trc-counties-cache-v3';
                        const cache = await caches.open(cacheName);
                        const cachedResponse = await cache.match(countiesUrl);
                        
                        if (cachedResponse) {
                            if (window.pushTacLog) window.pushTacLog('LOADING COUNTIES FROM CACHE', 'GEO');
                            data = await cachedResponse.json();
                        } else {
                            if (window.pushTacLog) window.pushTacLog('DOWNLOADING COUNTY LINES', 'GEO');
                            const response = await fetch(countiesUrl);
                            if (!response.ok) throw new Error('Network response was not ok');
                            cache.put(countiesUrl, response.clone());
                            data = await response.json();
                        }

                        currentGmuLayer = L.geoJSON(data, {
                            style: function (feature) {
                                return {
                                    color: "#818cf8", // Indigo 400
                                    weight: 1,
                                    opacity: 0.6,
                                    fillOpacity: 0.0
                                };
                            },
                            onEachFeature: function(feature, layer) {
                                const name = feature.properties ? (feature.properties.NAME || feature.properties.name || feature.properties.namelsad) : null;
                                if (name) {
                                    layer.bindTooltip(name, {
                                        permanent: true,
                                        direction: "center",
                                        className: "county-label-tooltip"
                                    });
                                }
                            }
                        }).addTo(orbitalMap);
                        
                        if (window.pushTacLog) window.pushTacLog('COUNTY OVERLAY LOADED', 'SUCCESS');
                    } catch(err) {
                        console.error('Error loading Counties:', err);
                        if (window.pushTacLog) window.pushTacLog('ERROR LOADING COUNTIES', 'ERROR');
                        alert("Map Error: " + err.message);
                    } finally {
                        countiesBtn.innerHTML = originalText;
                        countiesBtn.disabled = false;
                        if (window.lucide) window.lucide.createIcons();
                    }
                }
                loadCounties();
            }
        });
    }

    const geoDrawBtn = document.getElementById('geo-draw-btn');
    if (geoDrawBtn) {
        geoDrawBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            isDrawingMode = !isDrawingMode;
            if (isDrawingMode) {
                geoDrawBtn.classList.replace('text-gray-300', 'text-blue-400');
                geoDrawBtn.classList.replace('bg-gray-800', 'bg-blue-900');
                geoDrawBtn.classList.add('border-blue-500');
                orbitalMap.dragging.disable();
                document.getElementById('live-sat-map-container').style.cursor = 'crosshair';
                document.getElementById('live-sat-map-container').style.touchAction = 'pinch-zoom';
            } else {
                geoDrawBtn.classList.replace('text-blue-400', 'text-gray-300');
                geoDrawBtn.classList.replace('bg-blue-900', 'bg-gray-800');
                geoDrawBtn.classList.remove('border-blue-500');
                orbitalMap.dragging.enable();
                document.getElementById('live-sat-map-container').style.cursor = '';
                document.getElementById('live-sat-map-container').style.touchAction = '';
            }
        });
    }

    const geoCompassBtn = document.getElementById('geo-compass-btn');
    if (geoCompassBtn) {
        geoCompassBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                DeviceOrientationEvent.requestPermission().catch(err => console.log("Device orientation permission:", err));
            }
            const overlay = document.getElementById('compass-overlay');
            if (overlay) {
                const isHidden = overlay.classList.contains('hidden');
                if (isHidden) {
                    overlay.classList.remove('hidden');
                    geoCompassBtn.classList.replace('text-gray-300', 'text-pink-400');
                    geoCompassBtn.classList.replace('bg-gray-800', 'bg-pink-900');
                    geoCompassBtn.classList.add('border-pink-500');
                } else {
                    overlay.classList.add('hidden');
                    geoCompassBtn.classList.replace('text-pink-400', 'text-gray-300');
                    geoCompassBtn.classList.replace('bg-pink-900', 'bg-gray-800');
                    geoCompassBtn.classList.remove('border-pink-500');
                }
            }
        });
    }

    const geoClearDrawBtn = document.getElementById('geo-clear-draw-btn');
    if (geoClearDrawBtn) {
        geoClearDrawBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            clearMapDrawings();
            // Also exit draw mode if active
            if (isDrawingMode) {
                isDrawingMode = false;
                if (geoDrawBtn) {
                    geoDrawBtn.classList.replace('text-blue-400', 'text-gray-300');
                    geoDrawBtn.classList.replace('bg-blue-900', 'bg-gray-800');
                    geoDrawBtn.classList.remove('border-blue-500');
                }
                orbitalMap.dragging.enable();
                document.getElementById('live-sat-map-container').style.cursor = '';
            }
        });
    }

    const geoResetMapBtn = document.getElementById('geo-reset-map-btn');
    if (geoResetMapBtn) {
        geoResetMapBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm("Reset map: Clear all drawings, markers, and imported overlays?")) {
                clearMapDrawings();
                clearMapMeasurements();
                if (window.importedImageOverlay && typeof orbitalMap !== 'undefined') {
                    orbitalMap.removeLayer(window.importedImageOverlay);
                    window.importedImageOverlay = null;
                }
                if (isDrawingMode && geoDrawBtn) geoDrawBtn.click();
                
                // Hide compass if visible
                const overlay = document.getElementById('compass-overlay');
                const compassBtn = document.getElementById('geo-compass-btn');
                if (overlay && !overlay.classList.contains('hidden')) {
                    overlay.classList.add('hidden');
                    if (compassBtn) {
                        compassBtn.classList.replace('text-pink-400', 'text-gray-300');
                        compassBtn.classList.replace('bg-pink-900', 'bg-gray-800');
                        compassBtn.classList.remove('border-pink-500');
                    }
                }
            }
        });
    }

    const geoJumpBtn = document.getElementById('geo-jump-btn');
    const geoJumpInput = document.getElementById('geo-jump-input');
    if (geoJumpBtn && geoJumpInput) {
        geoJumpBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const val = geoJumpInput.value.trim();
            if (!val) return;
            
            // Allow for a few formats: "31.94, -102.16" or "31.94 -102.16"
            const cleaned = val.replace(/[^0-9.-]/g, ' ').replace(/\s+/g, ' ').trim();
            const parts = cleaned.split(' ');
            
            if (parts.length >= 2) {
                const lat = parseFloat(parts[0]);
                const lon = parseFloat(parts[1]);
                const targetMap = window.geoMap || window.orbitalMap || (typeof orbitalMap !== 'undefined' ? orbitalMap : null);

                if (!isNaN(lat) && !isNaN(lon) && targetMap) {
                    targetMap.invalidateSize();
                    targetMap.setView([lat, lon], 16, { animate: false });
                    
                    if (window.L) {
                        const m = window.L.circleMarker([lat, lon], {
                            radius: 8, color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.5, weight: 2
                        }).bindTooltip("TARGET: " + lat.toFixed(5) + ", " + lon.toFixed(5)).addTo(targetMap);
                        
                        if (!window.wireIntelMarkers) window.wireIntelMarkers = [];
                        window.wireIntelMarkers.push(m);
                        
                        m.on('click', function() {
                            if (confirm("Remove this target marker?")) {
                                targetMap.removeLayer(m);
                                window.wireIntelMarkers = window.wireIntelMarkers.filter(marker => marker !== m);
                            }
                        });
                    }
                    
                    geoJumpInput.value = '';
                    if (window.showToast) window.showToast(`📍 JUMPED TO ${lat.toFixed(5)}, ${lon.toFixed(5)}`);
                } else {
                    alert("Invalid coordinates or Map not active. Use LAT, LON format.");
                }
            }
        });
        
        // Also allow hitting Enter inside the input box
        geoJumpInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                geoJumpBtn.click();
            }
        });
    }

    const geoUnitBtn = document.getElementById('geo-unit-toggle-btn');
    if (geoUnitBtn) {
        geoUnitBtn.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            geoDistanceUnit = geoDistanceUnit === 'YDS' ? 'M' : 'YDS'; 
            document.getElementById('geo-unit-label').textContent = geoDistanceUnit; 
            if(document.getElementById('live-map-unit')) 
                document.getElementById('live-map-unit').textContent = geoDistanceUnit; 
            if (typeof drawMapLine === 'function') drawMapLine(); 
        });
    }

    const geoModeBtn = document.getElementById('geo-mode-toggle-btn');
    if (geoModeBtn) {
        geoModeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            isMultiTargetMode = !isMultiTargetMode;
            document.getElementById('geo-mode-label').textContent = isMultiTargetMode ? 'MULTI' : 'SINGLE';
            
        });
    }

    // Master Snapshot Bridge Button (Window 3 to Window 4)
    // Master Snapshot Bridge Button (Window 3 to Window 4)
    const mapSnapBtn = document.getElementById('geo-snapshot-btn');
    if (mapSnapBtn) {
        mapSnapBtn.addEventListener('click', async (e) => {
            e.stopPropagation();

            let customName = prompt("Enter a name for this Geo Intel Capture:", "GEO_" + Date.now().toString().slice(-4));
            if (customName === null) return;
            if (customName.trim() === '') customName = "GEO_" + Date.now().toString().slice(-4);

            const originalHtml = mapSnapBtn.innerHTML;
            mapSnapBtn.innerHTML = `<span class="animate-pulse">📸 SAVING...</span>`;
            mapSnapBtn.disabled = true;

            const label = customName.trim().toUpperCase();

            // Capture geo metadata first
            let meta = {
                type: 'geo-snapshot',
                label: label,
                timestamp: new Date().toISOString(),
                myCoords: window.myLatestCoords ? Object.assign({}, window.myLatestCoords) : null
            };

            const tmInput = document.getElementById('geo-coord-jump-input') || document.getElementById('geo-jump-coords');
            const tmText = tmInput ? tmInput.value.trim() : '';

            let tmLat = null, tmLng = null;
            if (window.teammateLocatorMarker) {
                const pos = window.teammateLocatorMarker.getLatLng();
                tmLat = pos.lat;
                tmLng = pos.lng;
            } else if (tmText) {
                const parts = tmText.split(/[\s,]+/).filter(Boolean);
                if (parts.length >= 2) {
                    tmLat = parseFloat(parts[0]);
                    tmLng = parseFloat(parts[1]);
                }
            }

            if (tmLat !== null && tmLng !== null) {
                meta.teammateCoords = {
                    lat: tmLat,
                    lng: tmLng,
                    text: tmText,
                    tooltip: window.teammateLocatorMarker?.getTooltip()?.getContent() || ''
                };
            }

            if (typeof mapMarkers !== 'undefined' && mapMarkers.length >= 2) {
                meta.markers = mapMarkers.map(m => m.getLatLng());
            }
            if (typeof allDrawings !== 'undefined' && allDrawings.length > 0) {
                meta.drawings = allDrawings.map(d => d.getLatLngs());
            }
            if (typeof window.orbitalMap !== 'undefined' && window.orbitalMap) {
                const center = window.orbitalMap.getCenter().wrap();
                meta.centerLat = center.lat;
                meta.centerLng = center.lng;
                meta.zoom = window.orbitalMap.getZoom();
            }
            if (typeof distVal !== 'undefined' && distVal) meta.distance = distVal + ' ' + (typeof geoDistanceUnit !== 'undefined' ? geoDistanceUnit : 'YDS');

            // Rich Tactical Card Generator (Generous Padding & Readable Formatting)
            function buildTacticalGeoCanvas() {
                const fb = document.createElement('canvas');
                fb.width = 1000;
                fb.height = 650;
                const ctx = fb.getContext('2d');

                // Dark Stealth Background
                ctx.fillStyle = '#030712';
                ctx.fillRect(0, 0, fb.width, fb.height);

                // Tactical Grid
                ctx.strokeStyle = 'rgba(16,185,129,0.15)';
                ctx.lineWidth = 1;
                for (let x = 0; x < fb.width; x += 50) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,fb.height); ctx.stroke(); }
                for (let y = 0; y < fb.height; y += 50) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(fb.width,y); ctx.stroke(); }

                // Outer Emerald Border
                ctx.strokeStyle = '#10b981';
                ctx.lineWidth = 4;
                ctx.strokeRect(20, 20, fb.width - 40, fb.height - 40);

                const leftX = 90; // Generous 90px left margin ensures zero clipping in thumbnails!

                // Header Banner
                ctx.fillStyle = '#10b981';
                ctx.font = 'bold 24px monospace';
                ctx.textAlign = 'left';
                ctx.fillText(`🛰️ TACTICAL GEO MATRIX INTEL REPORT`, leftX, 65);

                ctx.fillStyle = '#6b7280';
                ctx.font = '13px monospace';
                ctx.fillText(`TIMESTAMP: ${new Date().toISOString()} | CARD: ${label}`, leftX, 92);

                ctx.strokeStyle = 'rgba(16,185,129,0.4)';
                ctx.beginPath(); ctx.moveTo(leftX, 108); ctx.lineTo(910, 108); ctx.stroke();

                // Section 1: My GPS
                ctx.fillStyle = '#34d399';
                ctx.font = 'bold 18px monospace';
                ctx.fillText(`[ OPERATOR POSITION (MY GPS) ]`, leftX, 150);

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 22px monospace';
                const myPosText = meta.myCoords
                    ? `LAT: ${meta.myCoords.lat.toFixed(6)} | LON: ${meta.myCoords.lng.toFixed(6)}`
                    : (document.getElementById('geo-my-coords-display')?.textContent || 'ACQUIRING...');
                ctx.fillText(myPosText, leftX + 20, 188);

                // Section 2: Teammate Locator Data
                if (meta.teammateCoords) {
                    ctx.fillStyle = '#22d3ee'; // cyan-400
                    ctx.font = 'bold 18px monospace';
                    ctx.fillText(`[ TEAMMATE LOCATOR DATA ]`, leftX, 245);

                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 19px monospace';
                    const tmTooltip = meta.teammateCoords.tooltip || `COORDINATES: ${meta.teammateCoords.lat.toFixed(6)}, ${meta.teammateCoords.lng.toFixed(6)}`;
                    
                    // Split long tooltips if necessary
                    if (tmTooltip.length > 55) {
                        const mid = tmTooltip.indexOf('|');
                        if (mid !== -1) {
                            ctx.fillText(tmTooltip.substring(0, mid).trim(), leftX + 20, 280);
                            ctx.fillText(tmTooltip.substring(mid + 1).trim(), leftX + 20, 312);
                        } else {
                            ctx.fillText(tmTooltip, leftX + 20, 280);
                        }
                    } else {
                        ctx.fillText(tmTooltip, leftX + 20, 280);
                    }
                }

                // Section 3: Measurements / Distance
                const distEl = document.getElementById('live-map-dist');
                const distValStr = (distEl && distEl.textContent !== '--.--') ? distEl.textContent : (meta.distance || null);
                if (distValStr) {
                    ctx.fillStyle = '#f59e0b';
                    ctx.font = 'bold 18px monospace';
                    ctx.fillText(`[ MEASURED TARGET DISTANCE ]`, leftX, 375);

                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 26px monospace';
                    ctx.fillText(`${distValStr} YDS`, leftX + 20, 415);
                }

                // Footer Watermark
                ctx.fillStyle = '#10b981';
                ctx.font = 'bold 15px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`TRC TACTICAL GEO MATRIX - SECURE INTEL REPORT`, fb.width / 2, fb.height - 40);

                return fb;
            }

            try {
                let dataUri = null;

                // STAGE 1: Try to capture the map perfectly using html2canvas.
                // Works perfectly if Esri tiles are served with CORS headers (which they are).
                if (window.orbitalMap && typeof html2canvas !== 'undefined') {
                    try {
                        const mapContainer = window.orbitalMap.getContainer();
                        const canvas = await html2canvas(mapContainer, { 
                            useCORS: true, 
                            allowTaint: false,
                            backgroundColor: '#030712'
                        });
                        dataUri = canvas.toDataURL('image/jpeg', 0.88);
                        
                        // If canvas is pure black (no tiles rendered), reject it
                        const sCtx = canvas.getContext('2d');
                        const px = sCtx.getImageData(Math.floor(canvas.width/2), Math.floor(canvas.height/2), 1, 1).data;
                        if (px[0] < 5 && px[1] < 5 && px[2] < 5) dataUri = null;
                    } catch(e) {
                        console.warn('[GEO CAPTURE] html2canvas failed:', e);
                        dataUri = null;
                    }
                }

                // STAGE 2: Rich tactical map card — drawn entirely with Canvas 2D API.
                // Looks like a real tactical map: dark satellite-style bg, compass, GPS pin, range lines.
                if (!dataUri) {
                    const fb = document.createElement('canvas');
                    fb.width = 900; fb.height = 700;
                    const c = fb.getContext('2d');

                    // ── Background: dark with subtle satellite-style noise grid ──
                    c.fillStyle = '#050f05';
                    c.fillRect(0, 0, fb.width, fb.height);

                    // Satellite-style grid pattern
                    c.strokeStyle = 'rgba(16,185,129,0.07)';
                    c.lineWidth = 1;
                    for (let x = 0; x < fb.width; x += 30) { c.beginPath(); c.moveTo(x,0); c.lineTo(x,fb.height); c.stroke(); }
                    for (let y = 0; y < fb.height; y += 30) { c.beginPath(); c.moveTo(0,y); c.lineTo(fb.width,y); c.stroke(); }

                    // Outer border
                    c.strokeStyle = '#10b981'; c.lineWidth = 3;
                    c.strokeRect(15, 15, fb.width - 30, fb.height - 30);
                    c.strokeStyle = '#064e3b'; c.lineWidth = 1;
                    c.strokeRect(22, 22, fb.width - 44, fb.height - 44);

                    // ── Header ──
                    c.fillStyle = '#10b981'; c.font = 'bold 22px monospace';
                    c.textAlign = 'left';
                    c.fillText('🛰  TACTICAL GEO MATRIX INTEL', 40, 60);
                    c.fillStyle = '#6b7280'; c.font = '11px monospace';
                    c.fillText(`CARD: ${label}   ·   ${new Date().toISOString()}`, 40, 82);
                    c.strokeStyle = 'rgba(16,185,129,0.35)'; c.lineWidth = 1;
                    c.beginPath(); c.moveTo(40, 96); c.lineTo(fb.width - 40, 96); c.stroke();

                    const cx = fb.width / 2, cy = fb.height / 2 + 30;
                    const R  = Math.min(fb.width, fb.height) * 0.30;

                    // ── Compass ring (top-left quadrant) ──
                    const rX = 120, rY = 210, rR = 80;
                    c.strokeStyle = '#1e40af'; c.lineWidth = 2;
                    c.beginPath(); c.arc(rX, rY, rR, 0, Math.PI * 2); c.stroke();
                    c.strokeStyle = '#3b82f6'; c.lineWidth = 1;
                    c.beginPath(); c.arc(rX, rY, rR - 10, 0, Math.PI * 2); c.stroke();
                    // Cardinal labels
                    [['N',0],['E',90],['S',180],['W',270]].forEach(([d, deg]) => {
                        const rad = (deg - 90) * Math.PI / 180;
                        const tx = rX + (rR - 20) * Math.cos(rad);
                        const ty = rY + (rR - 20) * Math.sin(rad);
                        c.fillStyle = d === 'N' ? '#ef4444' : '#93c5fd';
                        c.font = `bold ${d === 'N' ? 18 : 14}px Arial`;
                        c.textAlign = 'center'; c.textBaseline = 'middle';
                        c.fillText(d, tx, ty);
                    });
                    c.fillStyle = '#6b7280'; c.font = '10px monospace'; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
                    c.fillText('COMPASS VECTOR', rX - rR, rY + rR + 18);

                    // ── Range ring (main area) ──
                    c.strokeStyle = 'rgba(59,130,246,0.5)'; c.lineWidth = 2;
                    c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.stroke();
                    c.strokeStyle = 'rgba(59,130,246,0.2)'; c.lineWidth = 1;
                    c.beginPath(); c.arc(cx, cy, R * 0.6, 0, Math.PI * 2); c.stroke();

                    // ── GPS / My Position pin (center) ──
                    if (meta.myCoords) {
                        // Pulsing rings
                        [0.22, 0.14, 0.08].forEach((scale, i) => {
                            c.strokeStyle = `rgba(16,185,129,${0.2 + i*0.15})`;
                            c.lineWidth = 1;
                            c.beginPath(); c.arc(cx, cy, R * scale, 0, Math.PI * 2); c.stroke();
                        });
                        // GPS star pin
                        c.fillStyle = '#10b981';
                        c.beginPath(); c.arc(cx, cy, 10, 0, Math.PI * 2); c.fill();
                        c.fillStyle = '#ffffff';
                        c.font = 'bold 12px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
                        c.fillText('★', cx, cy);

                        // MY GPS label box
                        c.fillStyle = 'rgba(16,185,129,0.15)';
                        c.fillRect(cx - 200, cy + 18, 400, 50);
                        c.strokeStyle = '#10b981'; c.lineWidth = 1;
                        c.strokeRect(cx - 200, cy + 18, 400, 50);
                        c.fillStyle = '#34d399'; c.font = 'bold 11px monospace'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
                        c.fillText('MY GPS POSITION', cx, cy + 34);
                        c.fillStyle = '#ffffff'; c.font = 'bold 16px monospace';
                        c.fillText(`${meta.myCoords.lat.toFixed(6)},  ${meta.myCoords.lng.toFixed(6)}`, cx, cy + 56);
                    }

                    // ── Range markers & lines ──
                    const distEl = document.getElementById('live-map-dist');
                    const distValStr = (distEl && distEl.textContent !== '--.--') ? distEl.textContent : (meta.distance || null);

                    if (mapMarkers && mapMarkers.length >= 2) {
                        // Draw dashed line between virtual marker positions
                        const angleStep = (2 * Math.PI) / mapMarkers.length;
                        const markerCanvasPositions = mapMarkers.map((m, i) => {
                            const angle = angleStep * i - Math.PI / 6;
                            return { x: cx + R * 0.55 * Math.cos(angle), y: cy + R * 0.55 * Math.sin(angle), latlng: m.getLatLng() };
                        });

                        // Draw dashed lines between markers
                        c.setLineDash([8, 5]);
                        c.strokeStyle = '#ff1493'; c.lineWidth = 2;
                        c.beginPath();
                        markerCanvasPositions.forEach((p, i) => { if (i === 0) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y); });
                        c.stroke();
                        c.setLineDash([]);

                        // Draw marker dots
                        markerCanvasPositions.forEach((p, i) => {
                            c.fillStyle = '#000';
                            c.beginPath(); c.arc(p.x, p.y, 7, 0, Math.PI * 2); c.fill();
                            c.strokeStyle = '#ff1493'; c.lineWidth = 2;
                            c.beginPath(); c.arc(p.x, p.y, 7, 0, Math.PI * 2); c.stroke();
                            c.fillStyle = '#ff1493'; c.font = 'bold 9px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
                            c.fillText(`T${i+1}`, p.x, p.y);
                        });
                    } else {
                        // Just draw crosshair target marker
                        const tx = cx + R * 0.45, ty = cy - R * 0.3;
                        c.strokeStyle = '#ff1493'; c.lineWidth = 2;
                        c.beginPath(); c.moveTo(cx, cy); c.lineTo(tx, ty); c.stroke();
                        c.fillStyle = '#000';
                        c.beginPath(); c.arc(tx, ty, 8, 0, Math.PI * 2); c.fill();
                        c.strokeStyle = '#ff1493'; c.lineWidth = 2;
                        c.beginPath(); c.arc(tx, ty, 8, 0, Math.PI * 2); c.stroke();
                    }

                    // ── Distance readout panel ──
                    if (distValStr) {
                        c.fillStyle = 'rgba(245,158,11,0.12)';
                        c.fillRect(cx + R + 10, cy - 55, 200, 90);
                        c.strokeStyle = '#f59e0b'; c.lineWidth = 1;
                        c.strokeRect(cx + R + 10, cy - 55, 200, 90);
                        c.fillStyle = '#f59e0b'; c.font = 'bold 11px monospace'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
                        c.fillText('TARGET DISTANCE', cx + R + 110, cy - 36);
                        c.fillStyle = '#ffffff'; c.font = 'bold 28px monospace';
                        c.fillText(`${distValStr} YDS`, cx + R + 110, cy + 4);
                    }

                    // ── Teammate coords ──
                    if (meta.teammateCoords) {
                        c.fillStyle = 'rgba(34,211,238,0.1)';
                        c.fillRect(40, 460, 820, 55);
                        c.strokeStyle = '#22d3ee'; c.lineWidth = 1;
                        c.strokeRect(40, 460, 820, 55);
                        c.fillStyle = '#22d3ee'; c.font = 'bold 11px monospace'; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
                        c.fillText('🎯 TEAMMATE / TARGET LOCATOR:', 55, 479);
                        c.fillStyle = '#fff'; c.font = 'bold 15px monospace';
                        const tmText = meta.teammateCoords.tooltip || `${meta.teammateCoords.lat.toFixed(6)}, ${meta.teammateCoords.lng.toFixed(6)}`;
                        c.fillText(tmText, 55, 500);
                    }

                    // ── Footer ──
                    c.fillStyle = '#10b981'; c.font = 'bold 12px monospace'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
                    c.fillText('TRC TACTICAL GEO MATRIX  ·  SECURE INTEL REPORT', fb.width / 2, fb.height - 22);

                    dataUri = fb.toDataURL('image/jpeg', 0.88);
                }

                await window.saveIntelSnapshot(label, dataUri, meta);

                mapSnapBtn.innerHTML = `<i data-lucide="check" class="w-3 h-3 inline-block mr-1"></i> SENT TO INTEL VAULT`;
                if (window.pushTacLog) window.pushTacLog(`GEO INTEL [${label}] SAVED TO VAULT`, "SUCCESS");
            } catch (err) {
                console.error("Geo Matrix Save Error:", err);
                try {
                    const fb = buildTacticalGeoCanvas();
                    const dataUri = fb.toDataURL('image/jpeg', 0.95);
                    await window.saveIntelSnapshot(label, dataUri, meta);
                    mapSnapBtn.innerHTML = `<i data-lucide="check" class="w-3 h-3 inline-block mr-1"></i> SENT TO VAULT`;
                    if (window.pushTacLog) window.pushTacLog(`GEO INTEL [${label}] SAVED TO VAULT (FALLBACK)`, "SUCCESS");
                } catch(err2) {
                    console.error("Critical Save Error:", err2);
                    alert("Error saving Geo Matrix capture. Please try again.");
                }
            } finally {
                setTimeout(() => {
                    mapSnapBtn.innerHTML = originalHtml;
                    mapSnapBtn.disabled = false;
                    if (window.lucide) window.lucide.createIcons();
                }, 2000);
            }
        });
    }


    // ========================================================================
    // WINDOW 4: INTEL VAULT SYSTEM (UPGRADED TO INDEXEDDB PERMANENCE)
    // ========================================================================
    let vaultCache = [];
    Object.defineProperty(window, 'vaultCache', { get: () => vaultCache });

    // ASYNC INITIALIZATION
    async function initVaultFromDB() {
        if (!window.TRC_IDB) return;
        try {
            // First, migrate any legacy data from LocalStorage
            const legacyData = localStorage.getItem('TRC_INTEL_VAULT');
            if (legacyData) {
                const legacy = JSON.parse(legacyData);
                for (const item of legacy) {
                    await TRC_IDB.set('intelVault', item.id.toString(), item);
                }
                localStorage.removeItem('TRC_INTEL_VAULT');
                window.pushTacLog("MIGRATED VAULT TO PERMANENT DB", "SUCCESS");
            }

            const dbItems = await TRC_IDB.getAll('intelVault');
            vaultCache = Object.values(dbItems).sort((a, b) => {
                const tsA = new Date(a.timestamp).getTime();
                const tsB = new Date(b.timestamp).getTime();
                return tsB - tsA;
            });
            refreshVaultGrid();
        } catch (err) {
            console.error("[VAULT] DB Load Error:", err);
            window.pushTacLog("VAULT DB READ ERROR", "ERROR");
        }
    }
    initVaultFromDB();

    // ========================================================================
    // LOAD INTEL VAULT TO MAP
    // ========================================================================
    window.loadVaultToMap = function(item) {
        if (!item || (!item.markers && !item.originLat && !item.drawings && !item.image && !item.routeTracker)) {
            alert("This snapshot does not contain valid map data or images.");
            return;
        }

        // 1. Switch to Map Panel
        const panel = document.getElementById('panel-measuring');
        if (panel && !panel.classList.contains('is-maximized')) {
            window.toggleFullscreen('panel-measuring');
        }

        // 2. Clear Existing Map
        if (typeof clearMapMeasurements === 'function') clearMapMeasurements();
        if (typeof clearMapDrawings === 'function') clearMapDrawings();

        // 2.5 Remove any existing Image Backgrounds to prevent 'hologram' effect
        if (window.importedImageOverlay && window.orbitalMap) {
            window.orbitalMap.removeLayer(window.importedImageOverlay);
            window.importedImageOverlay = null;
        }

        // 2.6 Restore Compass Vector
        const compassOverlay = document.getElementById('compass-overlay');
        const compassBtn = document.getElementById('geo-compass-btn');
        if (compassOverlay && compassOverlay.classList.contains('hidden')) {
            compassOverlay.classList.remove('hidden');
            if (compassBtn) {
                compassBtn.classList.replace('text-gray-300', 'text-pink-400');
                compassBtn.classList.replace('bg-gray-800', 'bg-pink-900');
                compassBtn.classList.add('border-pink-500');
            }
        }

        // 3. Inject Markers
        if (item.markers && Array.isArray(item.markers)) {
            item.markers.forEach(ll => {
                const m = L.circleMarker(L.latLng(ll.lat, ll.lng), {
                    radius: 6, color: '#ff1493', fillColor: '#000', fillOpacity: 1, weight: 2
                }).addTo(orbitalMap);
                mapMarkers.push(m);
            });
        } else if (item.originLat && item.targetLat) {
            const oLatlng = L.latLng(item.originLat, item.originLng);
            const tLatlng = L.latLng(item.targetLat, item.targetLng);
            const m1 = L.circleMarker(oLatlng, { radius: 6, color: '#ff1493', fillColor: '#000', fillOpacity: 1, weight: 2 }).addTo(orbitalMap);
            const m2 = L.circleMarker(tLatlng, { radius: 6, color: '#ff1493', fillColor: '#000', fillOpacity: 1, weight: 2 }).addTo(orbitalMap);
            mapMarkers = [m1, m2];
        }

        // Set correct mode
        if (mapMarkers.length > 2) {
            isMultiTargetMode = true;
            document.getElementById('geo-mode-label').textContent = 'MULTI';
        } else {
            isMultiTargetMode = false;
            document.getElementById('geo-mode-label').textContent = 'SINGLE';
        }

        // 3.5. Inject Drawings
        if (item.drawings && Array.isArray(item.drawings)) {
            item.drawings.forEach(points => {
                const newDraw = L.polyline(points, {color: '#3b82f6', weight: 5, opacity: 0.9, smoothFactor: 1}).addTo(orbitalMap);
                allDrawings.push(newDraw);
            });
        }

        // 3.75. Inject Route Tracker
        if (item.routeTracker && Array.isArray(item.routeTracker)) {
            if (typeof window.loadRouteToMap === 'function') {
                window.loadRouteToMap(item.routeTracker);
            }
        }

        // 3.8. Restore My Position (GPS)
        if (item.myCoords && item.myCoords.lat && item.myCoords.lng) {
            window.myLatestCoords = { lat: item.myCoords.lat, lng: item.myCoords.lng };
            const displayEl = document.getElementById('geo-my-coords-display');
            const badgeEl = document.getElementById('geo-my-coords-badge');
            const latStr = item.myCoords.lat.toFixed(6);
            const lngStr = item.myCoords.lng.toFixed(6);
            if (displayEl) displayEl.textContent = `${latStr}, ${lngStr}`;
            if (badgeEl) badgeEl.classList.remove('hidden');

            if (window.orbitalMap) {
                const icon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div class="relative w-4 h-4 flex items-center justify-center"><div class="absolute w-full h-full rounded-full bg-emerald-500 animate-ping opacity-75"></div><div class="relative w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center text-[5px] text-white font-black">★</div></div>`,
                    iconSize: [16, 16]
                });
                if (window.mySelfPositionMarker) window.orbitalMap.removeLayer(window.mySelfPositionMarker);
                window.mySelfPositionMarker = L.marker([item.myCoords.lat, item.myCoords.lng], { icon }).addTo(window.orbitalMap);
                window.mySelfPositionMarker.bindTooltip(`MY POSITION: ${latStr}, ${lngStr}`, { permanent: true, direction: 'top', className: 'tactical-tooltip' });
            }
        }

        // 3.9. Restore Teammate Locator Position
        if (item.teammateCoords && item.teammateCoords.lat && item.teammateCoords.lng) {
            const tmInput = document.getElementById('geo-coord-jump-input') || document.getElementById('geo-jump-coords');
            if (tmInput) tmInput.value = item.teammateCoords.text || `${item.teammateCoords.lat.toFixed(6)}, ${item.teammateCoords.lng.toFixed(6)}`;

            if (window.orbitalMap) {
                const icon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div class="relative w-5 h-5 flex items-center justify-center"><div class="absolute w-full h-full rounded-full bg-cyan-400 animate-ping opacity-90"></div><div class="relative w-4 h-4 bg-cyan-500 border-2 border-white rounded-full flex items-center justify-center text-[7px] text-black font-black">🎯</div></div>`,
                    iconSize: [20, 20]
                });
                if (window.teammateLocatorMarker) window.orbitalMap.removeLayer(window.teammateLocatorMarker);

                let labelText = item.teammateCoords.tooltip;
                if (!labelText) {
                    labelText = `TEAMMATE LOCATOR: ${item.teammateCoords.lat.toFixed(6)}, ${item.teammateCoords.lng.toFixed(6)}`;
                }
                window.teammateLocatorMarker = L.marker([item.teammateCoords.lat, item.teammateCoords.lng], { icon }).addTo(window.orbitalMap);
                window.teammateLocatorMarker.bindTooltip(labelText, { permanent: true, direction: 'top', className: 'tactical-tooltip' }).openTooltip();
            }
        }

        // 4. Draw Line
        if (typeof drawMapLine === 'function') drawMapLine();

        // 5. Pan and Zoom to bounds or exact center
        if (window.orbitalMap) {
            const activeMarkers = [];
            if (window.mySelfPositionMarker) activeMarkers.push(window.mySelfPositionMarker);
            if (window.teammateLocatorMarker) activeMarkers.push(window.teammateLocatorMarker);
            if (mapMarkers && mapMarkers.length > 0) activeMarkers.push(...mapMarkers);

            if (activeMarkers.length > 0) {
                const group = L.featureGroup(activeMarkers);
                window.orbitalMap.fitBounds(group.getBounds(), { padding: [60, 60], maxZoom: 17 });
            } else if (item.centerLat !== undefined && item.centerLng !== undefined && item.zoom !== undefined) {
                window.orbitalMap.setView([item.centerLat, item.centerLng], item.zoom);
            }
        }
    };

    window.saveIntelSnapshot = saveIntelSnapshot;
    async function saveIntelSnapshot(label, dataUri, metadata = {}) {
        if (vaultCache.length >= 50) { // Increased limit for IDB
            alert("INTEL VAULT IS AT CAPACITY (50/50). PLEASE DELETE OLD INTEL.");
            return;
        }

        const activeDistEl = document.getElementById('live-map-dist');
        const activeDist = (activeDistEl && activeDistEl.textContent !== "--.--") ? activeDistEl.textContent : null;

        const entry = {
            id: Date.now(),
            label: label,
            timestamp: new Date().toISOString(),
            image: dataUri,
            distance: activeDist,
            ...metadata
        };
        
        vaultCache.unshift(entry);
        
        if (window.TRC_IDB) {
            await TRC_IDB.set('intelVault', entry.id.toString(), entry);
            if (entry.gametagData) {
                if (!entry.gametagData.image) entry.gametagData.image = dataUri;
                await window.TRC_IDB.set('gameTagLibrary', entry.gametagData.id, entry.gametagData);
            }
        }
        
        refreshVaultGrid();
    }

    window.refreshVaultGrid = refreshVaultGrid;
    function refreshVaultGrid(customList = null) {
        const container = document.getElementById('vault-list-injection');
        if (!container) return;
        container.innerHTML = '';

        const rawList = customList || vaultCache || [];
        
        // Strict deduplication by unique ID
        const seenIds = new Set();
        const listToRender = [];
        for (const item of rawList) {
            if (!item) continue;
            const itemIdStr = (item.id || item.timestamp || Math.random()).toString();
            if (!seenIds.has(itemIdStr)) {
                seenIds.add(itemIdStr);
                listToRender.push(item);
            }
        }

        if (listToRender.length === 0) {
            container.innerHTML = `<div class="col-span-full p-10 text-center border border-dashed border-gray-800 text-gray-400 font-mono text-xs uppercase flex flex-col items-center gap-2">
                <div>No Matching Intel in Vault.</div>
                <button onclick="if(window.refreshVaultGrid) window.refreshVaultGrid(); else refreshVaultGrid();" class="bg-emerald-600 text-white px-3 py-1 rounded text-[10px] font-bold uppercase hover:bg-emerald-500 cursor-pointer">SHOW ALL VAULT INTEL</button>
            </div>`;
            return;
        }
        listToRender.forEach((item, index) => {
            let itemColor = 'emerald-500'; // Default snapshot
            if (item.type === 'bolo-card') itemColor = 'orange-500';
            else if (item.type === 'gametag-card') itemColor = 'amber-500';
            else if (item.type === 'license-card') itemColor = 'green-400';
            else if (item.type === 'casefile-pdf' || item.casefileData || (item.workstationData && item.workstationData.type === 'casefile')) itemColor = 'blue-400';
            else if (item.label && (item.label.startsWith('GEO_') || item.label.startsWith('ROUTE'))) itemColor = 'blue-500';
            else if (item.type === 'video') itemColor = 'purple-500';
            else if (item.type === 'workstation-card') itemColor = 'fbbf24'; // Yellow-ish

            const el = document.createElement('div');
            el.className = `bg-gray-900 rounded hover:bg-${itemColor}/20 transition-all p-1 cursor-pointer group relative overflow-hidden border-2 vault-accent-card border-gray-800 hover:border-${itemColor}`;
            
            // Critical CSS for Mobile Chrome Native Drag
            el.style.webkitTouchCallout = 'none';
            el.style.webkitUserSelect = 'none';
            el.style.userSelect = 'none';
            el.style.webkitUserDrag = 'element';
            
            // Absolutely block Edge/Chrome from opening long-press context menus
            el.addEventListener('contextmenu', (e) => {
                e.preventDefault();
            });

            // Add Native HTML5 Drag as an indestructible fallback for Desktop
            el.setAttribute('draggable', 'true');
            el.dataset.vaultIndex = index;

            el.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', index);
                el.classList.add('opacity-50');
                if (typeof cleanupClones === 'function') cleanupClones(); // Nuke touch clone if native drag overrides
            });

            el.addEventListener('dragend', () => {
                el.classList.remove('opacity-50');
                if (typeof cleanupClones === 'function') cleanupClones(); // Failsafe
            });

            el.addEventListener('dragover', (e) => {
                e.preventDefault();
                el.classList.add('border-emerald-500');
            });

            el.addEventListener('dragleave', () => {
                el.classList.remove('border-emerald-500');
            });

            el.addEventListener('drop', (e) => {
                e.preventDefault();
                el.classList.remove('border-emerald-500');
                const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
                const dropIndex = index;
                if (dragIndex === dropIndex || isNaN(dragIndex)) return;

                const draggedItem = vaultCache[dragIndex];
                vaultCache.splice(dragIndex, 1);
                vaultCache.splice(dropIndex, 0, draggedItem);

                const now = Date.now();
                vaultCache.forEach((vItem, vIndex) => {
                    vItem.timestamp = now - (vIndex * 1000);
                    if (window.TRC_IDB) TRC_IDB.set('intelVault', vItem.id.toString(), vItem);
                });

                refreshVaultGrid();
            });

            // ==========================================
            // RAW MOBILE TOUCH DRAG POLYFILL (AD-BLOCKER PROOF)
            // ==========================================
            let touchTimer = null;
            let isTouchDragging = false;
            let initialY = 0;
            let initialX = 0;
            let cloneEl = null;

            const cleanupClones = () => {
                clearTimeout(touchTimer);
                isTouchDragging = false;
                el.classList.remove('opacity-50', 'border-emerald-500', 'scale-105');
                if (cloneEl) { cloneEl.remove(); cloneEl = null; }
                // Global nuke to guarantee no orphaned ghosts ever get stuck
                document.querySelectorAll('.vault-drag-clone').forEach(ghost => ghost.remove());
            };

            el.addEventListener('touchstart', (e) => {
                if(e.touches.length > 1) return; // Prevent multi-touch bugs
                if(e.target.closest('button') || e.target.closest('input')) return;
                
                cleanupClones(); // Ensure clean slate
                const touch = e.touches[0];
                initialX = touch.clientX;
                initialY = touch.clientY;
                
                // Wait 300ms to distinguish from scroll
                touchTimer = setTimeout(() => {
                    isTouchDragging = true;
                    el.classList.add('opacity-50', 'border-emerald-500', 'scale-105');
                    
                    // Create floating clone
                    cloneEl = el.cloneNode(true);
                    cloneEl.classList.add('vault-drag-clone'); // Special class for global destruction
                    cloneEl.style.position = 'fixed';
                    cloneEl.style.width = el.offsetWidth + 'px';
                    cloneEl.style.height = el.offsetHeight + 'px';
                    cloneEl.style.top = (initialY - el.offsetHeight/2) + 'px';
                    cloneEl.style.left = (initialX - el.offsetWidth/2) + 'px';
                    cloneEl.style.zIndex = '9999';
                    cloneEl.style.pointerEvents = 'none'; // so we can detect elements underneath
                    cloneEl.style.opacity = '0.9';
                    document.body.appendChild(cloneEl);
                    
                    if (navigator.vibrate) navigator.vibrate(50); // Haptic feedback
                }, 300);
            }, {passive: true});

            el.addEventListener('touchmove', (e) => {
                if (!isTouchDragging) {
                    // If they moved their finger before 300ms, it's a scroll. Cancel drag.
                    if (!e.touches || e.touches.length === 0) return;
                    const touch = e.touches[0];
                    if (Math.abs(touch.clientY - initialY) > 10 || Math.abs(touch.clientX - initialX) > 10) {
                        cleanupClones();
                    }
                    return;
                }
                
                // We are dragging! Prevent scrolling.
                e.preventDefault();
                if (!e.touches || e.touches.length === 0) return;
                const touch = e.touches[0];
                
                if (cloneEl) {
                    cloneEl.style.top = (touch.clientY - el.offsetHeight/2) + 'px';
                    cloneEl.style.left = (touch.clientX - el.offsetWidth/2) + 'px';
                }
                
                // Highlight drop target
                const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
                const dropTarget = elemBelow ? elemBelow.closest('.vault-accent-card') : null;
                
                document.querySelectorAll('.vault-accent-card').forEach(card => card.classList.remove('border-emerald-500'));
                if (dropTarget && dropTarget !== el) {
                    dropTarget.classList.add('border-emerald-500');
                }
            }, {passive: false});

            el.addEventListener('touchend', (e) => {
                if (!isTouchDragging) {
                    cleanupClones();
                    return;
                }
                
                const touch = e.changedTouches ? e.changedTouches[0] : null;
                let dropTarget = null;
                
                if (touch) {
                    const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
                    dropTarget = elemBelow ? elemBelow.closest('.vault-accent-card') : null;
                }
                
                document.querySelectorAll('.vault-accent-card').forEach(card => card.classList.remove('border-emerald-500'));
                
                cleanupClones(); // Must run before refreshVaultGrid
                
                if (dropTarget && dropTarget !== el) {
                    const dragIndex = index;
                    const dropIndex = parseInt(dropTarget.dataset.vaultIndex);
                    
                    if (!isNaN(dropIndex)) {
                        const draggedItem = vaultCache[dragIndex];
                        vaultCache.splice(dragIndex, 1);
                        vaultCache.splice(dropIndex, 0, draggedItem);

                        const now = Date.now();
                        vaultCache.forEach((vItem, vIndex) => {
                            vItem.timestamp = now - (vIndex * 1000);
                            if (window.TRC_IDB) TRC_IDB.set('intelVault', vItem.id.toString(), vItem);
                        });

                        refreshVaultGrid();
                    }
                }
            });
            
            el.addEventListener('touchcancel', cleanupClones);

            const isVideo = item.type === 'video';
            const isContact = item.contact || item.type === 'intel_report' || item.type === 'contact';
            const attachedPhoto = item.image || item.data || item.contact?.cardImageUrl || null;
            
            let imgContent = '';
            if (isVideo) {
                imgContent = `<i data-lucide="video" class="w-12 h-12 text-purple-500 opacity-80 pointer-events-none"></i>`;
            } else if (attachedPhoto) {
                imgContent = `
                    <div style="background-color: #030712; width: 100%; height: 100%; position: relative;" class="opacity-95 group-hover:opacity-100 transition-all pointer-events-none flex items-center justify-center">
                        <img src="${attachedPhoto}" style="max-width:100%; max-height:100%; object-fit:contain;" class="pointer-events-none" alt="">
                        ${isContact ? `
                        <div class="absolute top-1 left-1 bg-purple-950/90 text-purple-300 border border-purple-500/60 px-1 py-0.5 rounded text-[6px] font-black uppercase tracking-wider shadow z-10">
                            TRC OPERATOR
                        </div>` : ''}
                    </div>`;
            } else if (isContact) {
                const c = item.contact || {};
                imgContent = `
                    <div class="w-full h-full bg-slate-950 p-2 pt-2.5 text-white flex flex-col justify-between overflow-hidden border-2 border-purple-500/80 pointer-events-none relative shadow-inner text-left leading-tight bg-[radial-gradient(#a855f7_0.8px,transparent_0.8px)] [background-size:6px_6px]">
                        <div class="text-[6.5px] font-black tracking-widest text-purple-400 uppercase border-b border-purple-500/50 pb-1 shrink-0 flex justify-between items-center pl-6">
                            <span>TRC OPERATOR</span>
                            <span class="text-emerald-400 font-mono text-[5.5px] bg-emerald-950 px-1 border border-emerald-500/40 rounded">VERIFIED</span>
                        </div>
                        <div class="my-auto py-1 shrink-0">
                            ${c.bizname ? `<div class="text-[9px] font-black text-purple-300 uppercase leading-tight truncate">${c.bizname}</div>` : ''}
                            <div class="text-[8.5px] font-black text-white uppercase truncate mt-0.5">${item.author || c.author || 'OPERATOR'}</div>
                            ${c.unit ? `<div class="text-[7px] font-semibold text-slate-400 uppercase truncate">${c.unit}</div>` : ''}
                        </div>
                        <div class="text-[6.5px] font-mono border-t border-slate-800 pt-1 shrink-0 flex justify-between gap-1">
                            <span class="text-emerald-400 truncate">PH: ${c.phone || '--'}</span>
                            <span class="text-blue-400 truncate">WEB: ${c.web || '--'}</span>
                        </div>
                    </div>
                `;
            } else {
                imgContent = `<i data-lucide="file-text" class="w-10 h-10 text-emerald-400 opacity-60 pointer-events-none"></i>`;
            }

            el.innerHTML = `
                <div class="aspect-square bg-black overflow-hidden relative border border-gray-800 mb-1 flex items-center justify-center">
                    ${imgContent}
                </div>
                <div class="text-[7px] font-mono text-gray-400 uppercase truncate pr-4">${item.label || item.missionName || 'TACTICAL BRIEF'}</div>
                <div class="text-[6px] text-gray-400">${
                    (() => {
                        try {
                            let t = item.timestamp || item.id || Date.now();
                            if (typeof t === 'string' && t.startsWith('import_')) t = Date.now();
                            const d = new Date(t);
                            if (isNaN(d.getTime())) return '--:--';
                            return d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        } catch(e) { return '--:--'; }
                    })()
                }</div>
                
                <!-- Export Checkbox Overlay: LOCKED VISIBLE ON MOBILE -->
                <div class="absolute top-1.5 left-1.5 z-40 bg-black/60 p-1 rounded">
                    <label class="sr-only">Mark Vault Item for Export</label><input name="${item.id}" autocomplete="off" type="checkbox" class="vault-export-checkbox w-4 h-4 cursor-pointer bg-black/50 border border-gray-500 rounded text-neon-green focus:ring-neon-green/50 shadow-lg" data-vault-id="${item.id}" title="Mark for Export" aria-label="Mark Vault Item for Export">
                </div>

                <!-- Trash Icon Button Overlay: LOCKED VISIBLE ON MOBILE -->
                <button class="delete-vault-btn absolute top-1.5 right-1.5 bg-red-950/90 text-red-300 p-1.5 rounded border border-red-700 shadow-lg hover:bg-red-600 hover:text-white transition-all z-30" title="Delete Snapshot">
                    <i data-lucide="trash-2" class="w-3 h-3"></i>
                </button>

                ${item.remarksText ? `
                <button class="load-note-btn absolute bottom-7 right-1.5 bg-yellow-600 text-black p-1.5 rounded border border-yellow-400 shadow-lg hover:bg-yellow-400 transition-all z-30" title="Load to Notepad">
                    <i data-lucide="edit-3" class="w-3 h-3"></i>
                </button>
                ` : ''}

                ${(item.label && (item.label.startsWith('GEO_') || item.label.startsWith('ROUTE'))) ? `
                <button class="load-map-btn absolute bottom-7 left-1.5 bg-blue-600 text-white p-1.5 rounded border border-blue-400 shadow-lg hover:bg-blue-400 transition-all z-30" title="Load to Geo Matrix">
                    <i data-lucide="map" class="w-3 h-3"></i>
                </button>
                ` : ''}

                ${(item.label && item.label.startsWith('VIDEO_')) ? `
                <button class="load-video-btn absolute bottom-7 left-1.5 bg-purple-600 text-white p-1.5 rounded border border-purple-400 shadow-lg hover:bg-purple-400 transition-all z-30" title="Play Video">
                    <i data-lucide="play" class="w-3 h-3"></i>
                </button>
                ` : ''}

                ${(!item.remarksText && !(item.label && (item.label.startsWith('GEO_') || item.label.startsWith('ROUTE') || item.label.startsWith('VIDEO_')))) ? `
                <button class="load-snapshot-btn absolute bottom-7 left-1.5 bg-emerald-600 text-white p-1.5 rounded border border-emerald-400 shadow-lg hover:bg-emerald-400 transition-all z-30" title="Load Snapshot to Viewer">
                    <i data-lucide="camera" class="w-3 h-3"></i>
                </button>
                ` : ''}

                ${(item.type === 'casefile-pdf' || item.casefileData || (item.workstationData && item.workstationData.type === 'casefile')) ? `
                <button class="rework-casefile-btn absolute bottom-7 right-1.5 bg-blue-600 text-white p-1.5 rounded border border-blue-400 shadow-lg hover:bg-blue-400 hover:text-black transition-all z-30 flex items-center gap-1" title="Rework Casefile & Invoice">
                    <i data-lucide="file-check-2" class="w-3 h-3"></i>
                </button>
                ` : ''}
            `;
            
            el.addEventListener('click', (e) => {
                if(e.target.closest('.delete-vault-btn') || e.target.closest('.vault-export-checkbox') || e.target.closest('.load-note-btn') || e.target.closest('.load-map-btn') || e.target.closest('.load-video-btn') || e.target.closest('.load-snapshot-btn')) return;
                e.stopPropagation();
                if (item.type === 'casefile-pdf' || item.casefileData || (item.workstationData && item.workstationData.type === 'casefile')) {
                    const data = item.casefileData || (item.workstationData && item.workstationData.data) || item;
                    if (window.loadCaseFileBackToEditor) {
                        window.loadCaseFileBackToEditor(data);
                        return;
                    }
                }
                selectVaultItem(item);
            });

            const reworkCaseBtn = el.querySelector('.rework-casefile-btn');
            if (reworkCaseBtn) {
                reworkCaseBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const data = item.casefileData || (item.workstationData && item.workstationData.data) || item;
                    if (window.loadCaseFileBackToEditor) {
                        window.loadCaseFileBackToEditor(data);
                    }
                });
            }

            const loadBtn = el.querySelector('.load-note-btn');
            if(loadBtn) {
                loadBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    loadNoteBackToEditor(item);
                });
            }
            const loadMapBtn = el.querySelector('.load-map-btn');
            if(loadMapBtn) {
                loadMapBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if(window.loadVaultToMap) window.loadVaultToMap(item);
                });
            }

            const loadVidBtn = el.querySelector('.load-video-btn');
            if(loadVidBtn) {
                loadVidBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if(window.loadVideoBackToPlayer) window.loadVideoBackToPlayer(item);
                });
            }

            const loadSnapBtn = el.querySelector('.load-snapshot-btn');
            if(loadSnapBtn) {
                loadSnapBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.loadSnapshotToViewer) window.loadSnapshotToViewer(item);
                });
            }

            // Bind delete handler specific to this card
            const delBtn = el.querySelector('.delete-vault-btn');
            if(delBtn) {
                delBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteVaultEntry(item.id);
                });
            }

            container.appendChild(el);
        });

        if (window.lucide) window.lucide.createIcons();
    }

    async function deleteVaultEntry(id) {
        vaultCache = vaultCache.filter(x => x.id != id && x.id?.toString() !== id?.toString());
        if (window.TRC_IDB) {
            const stores = ['intelVault', 'workstationLibrary', 'gameTagLibrary', 'licenseLibrary', 'boloLibrary'];
            for (const s of stores) {
                try {
                    await TRC_IDB.delete(s, id.toString());
                    if (!isNaN(parseInt(id))) await TRC_IDB.delete(s, parseInt(id));
                } catch(e) {}
            }
        }
        refreshVaultGrid();
        if (window.showToast) window.showToast('🗑️ Card deleted.');
        if (window.pushTacLog) window.pushTacLog(`INTEL VAULT: CARD REMOVED`, 'WARN');
    }

    function selectVaultItem(item) {
        // BROADCAST TO TICKER
        window.pushTacLog(`INTEL VAULT ACCESS: RELOADING SAVED SNAPSHOT`, "SYS");

        // Auto-minimize Vault after selection so the user only sees the selected image outside
        const panel = document.getElementById('panel-vault');
        if (panel && panel.classList.contains('is-maximized')) {
            window.toggleFullscreen('panel-vault');
        }

        const target = document.getElementById('vault-active-display');
        if (!target) return;

        const isVideo = item.type === 'video';
        const isContactCard = item.contact || item.type === 'intel_report' || item.type === 'contact';
        let mediaHtml = '';

        if (isVideo) {
            mediaHtml = `<i data-lucide="video" class="w-20 h-20 text-purple-500 opacity-80"></i>`;
        } else if (item.type === 'casefile-pdf' || item.casefileData || (item.workstationData && item.workstationData.type === 'casefile')) {
            if (item.image) {
                mediaHtml = `<img src="${item.image}" class="w-full h-full object-contain cursor-pointer" onclick="if(window.loadCaseFileBackToEditor) window.loadCaseFileBackToEditor(window.vaultCache.find(x => x.id == '${item.id}')?.casefileData || window.vaultCache.find(x => x.id == '${item.id}'))">`;
            } else {
                mediaHtml = `<div class="flex items-center justify-center w-full h-full text-slate-400 font-mono text-[10px]">CASEFILE INVOICE</div>`;
            }
        } else if (item.type === 'officer_sitrep' || item.workstationData?.type === 'officer' || item.type === 'workstation') {
            if (item.image) {
                mediaHtml = `<img src="${item.image}" class="w-full h-full object-contain">`;
            } else {
                mediaHtml = `<div class="flex items-center justify-center w-full h-full text-slate-400 font-mono text-[10px]">NO VISUAL SNAPSHOT</div>`;
            }
        } else if (isContactCard) {
            const c = item.contact || {};
            const imgColHtml = item.image ? `
                <div class="w-full md:w-1/2 h-48 md:h-full bg-black border-b md:border-b-0 md:border-r border-slate-800 flex items-center justify-center relative overflow-hidden shrink-0">
                    <img src="${item.image}" class="w-full h-full object-contain">
                </div>
            ` : '';
            
            mediaHtml = `
                <div class="flex flex-col md:flex-row w-full h-full bg-slate-950 text-white overflow-y-auto custom-scrollbar">
                    ${imgColHtml}
                    <div class="flex-1 p-4 flex flex-col justify-between overflow-y-auto custom-scrollbar">
                        <div class="border-2 border-purple-500/80 rounded-xl bg-slate-900 p-4 shadow-[0_0_25px_rgba(168,85,247,0.35)] relative overflow-hidden text-left">
                            <div class="text-[9px] font-black tracking-widest text-purple-400 uppercase border-b border-purple-500/40 pb-1.5 mb-2.5 flex justify-between items-center">
                                <span class="flex items-center gap-1.5"><i data-lucide="contact" class="w-4 h-4 text-purple-400"></i> TACTICAL RANGE CARD OPERATOR</span>
                                <span class="text-emerald-400 font-mono text-[8px] bg-emerald-950 px-1.5 py-0.5 border border-emerald-500/40 rounded uppercase font-bold">VERIFIED CONTACT</span>
                            </div>
                            ${c.bizname ? `<div class="text-base font-black text-purple-300 uppercase tracking-wider mb-0.5">${c.bizname}</div>` : ''}
                            <div class="text-sm font-bold text-white uppercase tracking-wider">${item.author || c.author || 'OPERATOR'}</div>
                            ${c.unit ? `<div class="text-[10px] font-semibold text-slate-400 uppercase">${c.unit}</div>` : ''}
                            
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono border-t border-slate-800 pt-2.5 mt-2.5 text-slate-300">
                                <div><span class="text-slate-400 font-bold">PHONE:</span> <span class="font-bold text-white">${c.phone || '--'}</span></div>
                                <div><span class="text-slate-400 font-bold">COMMS:</span> <span class="font-bold text-emerald-400">${c.comms || '--'}</span></div>
                                <div><span class="text-slate-400 font-bold">WEB:</span> <span class="font-bold text-blue-400">${c.web || '--'}</span></div>
                            </div>
                            ${c.details ? `<div class="mt-2 text-xs italic text-purple-300 border-t border-slate-800/80 pt-2">Specialties: "${c.details}"</div>` : ''}
                            ${c.cardImageUrl ? `
                            <div class="mt-3 w-full max-h-36 bg-black rounded-lg overflow-hidden flex justify-center border border-gray-700">
                                <img src="${c.cardImageUrl}" class="max-h-36 object-contain">
                            </div>
                            ` : ''}
                        </div>
                        ${item.content ? `<div class="mt-2.5 p-2 bg-slate-900 border border-slate-800 rounded text-xs font-mono text-slate-200 text-left whitespace-pre-wrap">${item.content}</div>` : ''}
                    </div>
                </div>
            `;
        } else {
            mediaHtml = `<img src="${item.image}" class="w-full h-full object-contain">`;
        }

        // 1. Populate Target Visualizer (Window 4)
        target.innerHTML = `
            <div class="w-full h-full relative bg-black overflow-hidden flex items-center justify-center">
                ${mediaHtml}
                <div class="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none"></div>
                <div class="absolute bottom-1 left-1 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500 text-[7px] font-mono text-emerald-300 uppercase tracking-widest opacity-90 z-10">
                    ${item.label}
                </div>
                
                <!-- Non-Destructive Unload Actuator -->
                <div class="absolute top-1 right-1 flex gap-1 z-10">
                    ${isVideo ? `
                    <button class="bg-purple-600 text-white border border-purple-400 p-1.5 rounded hover:bg-purple-500 transition-all shadow-[0_0_10px_rgba(168,85,247,0.5)] flex items-center gap-1 font-black text-[7px]" onclick="event.stopPropagation(); window.loadVideoBackToPlayerById('${item.id}')" title="Play Video">
                        <i data-lucide="play" class="w-2.5 h-2.5"></i> PLAY VIDEO
                    </button>
                    ` : ''}
                    ${item.remarksText ? `
                    <button class="bg-yellow-600 text-black border border-yellow-400 p-1.5 rounded hover:bg-yellow-400 transition-all shadow-lg flex items-center gap-1 font-black text-[7px]" onclick="event.stopPropagation(); window.loadNoteBackToEditorById('${item.id}')" title="Load back to Notepad">
                        <i data-lucide="edit-3" class="w-2.5 h-2.5"></i> LOAD TO NOTEPAD
                    </button>
                    ` : ''}
                    ${item.routeTracker ? `
                    <button class="bg-cyan-600 text-black border border-cyan-400 p-1.5 rounded hover:bg-cyan-400 transition-all shadow-lg flex items-center gap-1 font-black text-[7px]" onclick="event.stopPropagation(); window.loadRouteToMapById('${item.id}')" title="Load Route to Map">
                        <i data-lucide="navigation" class="w-2.5 h-2.5"></i> LOAD ROUTE TO MAP
                    </button>
                    ` : ''}
                    ${item.type === 'mission_brief' ? `
                    <button class="bg-indigo-600 text-white border border-indigo-400 p-1.5 rounded hover:bg-indigo-500 transition-all shadow-[0_0_10px_rgba(79,70,229,0.5)] flex items-center gap-1 font-black text-[7px]" onclick="event.stopPropagation(); window.loadBriefingBackToEditorById('${item.id}')" title="Load back to Form">
                        <i data-lucide="clipboard-list" class="w-2.5 h-2.5"></i> REWORK BRIEFING
                    </button>
                    ` : ''}
                    ${item.type === 'operational_calendar' ? `
                    <button class="bg-blue-600 text-white border border-blue-400 p-1.5 rounded hover:bg-blue-500 transition-all shadow-[0_0_10px_rgba(59,130,246,0.5)] flex items-center gap-1 font-black text-[7px]" onclick="event.stopPropagation(); window.loadCalendarBackToEditorById('${item.id}')" title="Load back to Form">
                        <i data-lucide="calendar" class="w-2.5 h-2.5"></i> REWORK CALENDAR
                    </button>
                    ` : ''}
                    ${(item.type === 'gametag-card' || item.gametagData || (item.label && item.label.startsWith('HARVEST:'))) ? `
                    <button class="bg-amber-600 text-white border border-amber-400 p-1.5 rounded hover:bg-amber-500 transition-all shadow-[0_0_10px_rgba(245,158,11,0.5)] flex items-center gap-1 font-black text-[7px]" onclick="event.stopPropagation(); if(window.reworkGameTag) window.reworkGameTag('${item.id}')" title="Rework Field Harvest Tag">
                        <i data-lucide="tag" class="w-2.5 h-2.5"></i> REWORK HARVEST TAG
                    </button>
                    ` : ''}
                    ${(item.type === 'bolo-card' || item.boloData || (item.label && item.label.startsWith('BOLO:'))) ? `
                    <button class="bg-orange-600 text-white border border-orange-400 p-1.5 rounded hover:bg-orange-500 transition-all shadow-[0_0_10px_rgba(234,88,12,0.5)] flex items-center gap-1 font-black text-[7px]" onclick="event.stopPropagation(); if(window.reworkBolo) window.reworkBolo('${item.id}')" title="Rework BOLO Alert">
                        <i data-lucide="shield-alert" class="w-2.5 h-2.5"></i> REWORK BOLO
                    </button>
                    ` : ''}
                    ${(item.type === 'license-card' || item.licenseData || (item.label && item.label.startsWith('LICENSE:'))) ? `
                    <button class="bg-emerald-600 text-white border border-emerald-400 p-1.5 rounded hover:bg-emerald-500 transition-all shadow-[0_0_10px_rgba(16,185,129,0.5)] flex items-center gap-1 font-black text-[7px]" onclick="event.stopPropagation(); if(window.reworkLicense) window.reworkLicense('${item.id}')" title="Rework License">
                        <i data-lucide="badge-check" class="w-2.5 h-2.5"></i> REWORK LICENSE
                    </button>
                    ` : ''}
                    ${(item.type === 'casefile-pdf' || (item.workstationData && item.workstationData.type === 'casefile') || (item.label && item.label.includes('INVOICE'))) ? `
                    <button class="bg-blue-600 text-white border border-blue-400 p-1.5 rounded hover:bg-blue-500 transition-all shadow-[0_0_10px_rgba(59,130,246,0.5)] flex items-center gap-1 font-black text-[7px]" onclick="event.stopPropagation(); if(window.loadCaseFileBackToEditor) window.loadCaseFileBackToEditor(window.vaultCache.find(x => x.id == '${item.id}')?.casefileData || window.vaultCache.find(x => x.id == '${item.id}'))" title="Rework Invoice / Case">
                        <i data-lucide="file-check-2" class="w-2.5 h-2.5"></i> REWORK INVOICE
                    </button>
                    ` : ''}
                    ${item.type === 'workstation' ? `
                    <button class="bg-emerald-600 text-white border border-emerald-400 p-1.5 rounded hover:bg-emerald-500 transition-all shadow-[0_0_10px_rgba(16,185,129,0.5)] flex items-center gap-1 font-black text-[7px]" onclick="event.stopPropagation(); window.loadWorkstationBackToEditorById('${item.id}')" title="Load back to Workstation">
                        <i data-lucide="monitor" class="w-2.5 h-2.5"></i> REWORK WORKSTATION
                    </button>
                    ` : ''}
                    ${(item.contact || item.type === 'intel_report' || item.type === 'contact') ? `
                    <button class="bg-purple-600 text-white border border-purple-400 p-1.5 rounded hover:bg-purple-500 transition-all shadow-[0_0_10px_rgba(168,85,247,0.5)] flex items-center gap-1 font-black text-[7px]" onclick="event.stopPropagation(); window.reworkBusinessCard(window.vaultCache.find(x => x.id.toString() === '${item.id}'))" title="Rework Business Card">
                        <i data-lucide="wrench" class="w-2.5 h-2.5"></i> REWORK CARD
                    </button>
                    ` : ''}
                    <button class="bg-red-950/90 text-red-300 border border-red-600/50 p-1.5 rounded hover:bg-red-600 hover:text-white transition-all shadow-lg" onclick="event.stopPropagation(); window.unloadDashboardCard(4)" title="Unload Vault Item">
                        <i data-lucide="trash-2" class="w-2.5 h-2.5"></i>
                    </button>
                </div>
            </div>
        `;
        
        if (window.lucide) window.lucide.createIcons();

        // 2. DYNAMIC WINDOW 3 POPULATION (GEO MATRIX SYNC)
        const geoMinView = document.getElementById('geo-minimized-view');
        const geoLoadedReadout = document.getElementById('geo-loaded-readout');
        const geoLoadedDist = document.getElementById('geo-loaded-dist');
        const geoRefLabel = document.getElementById('geo-loaded-ref');

        if (geoMinView && geoLoadedReadout && geoLoadedDist) {
            let finalDist = item.distance;

            if (finalDist) {
                geoLoadedDist.textContent = finalDist;
                if(geoRefLabel) geoRefLabel.textContent = `REF_${item.id.toString().substr(-4)}`;
                
                // Reveal the live projection display
                geoMinView.style.display = 'none';
                geoLoadedReadout.classList.remove('hidden');
                geoLoadedReadout.classList.add('flex');
            } else {
                // IF NO DISTANCE PRE-SAVED: INITIATE MACHINE VISION OCR SCAN!
                geoMinView.style.display = 'none';
                geoLoadedReadout.classList.remove('hidden');
                geoLoadedReadout.classList.add('flex');
                geoLoadedDist.innerHTML = `<span class="animate-pulse text-[10px] text-emerald-400 tracking-widest font-black">SCAN_AI</span>`;
                if(geoRefLabel) geoRefLabel.textContent = "ANALYZE_TGT";

                if (typeof Tesseract !== "undefined") {
                    Tesseract.recognize(item.image, 'eng')
                        .then(({ data: { text } }) => {
                            // AI CLEANING ROUTINE: Lowercase and clean standard OCR noise
                            const cleanText = text.toUpperCase().replace(/\s+/g, ' '); 
                            console.log("AI RAW READ:", cleanText);

                            // 1. TARGETED SCAN: Look for Decimals first (e.g., 112.6) 
                            // This is the highest probability match for our measurement tool
                            const decimalMatch = cleanText.match(/\d{2,5}\.\d/);
                            
                            // 2. FALLBACK SCAN: Context-aware integers between 20 and 3000 yards
                            const allNumbers = cleanText.match(/\d{2,5}/g) || [];
                            const validIntegers = allNumbers.filter(n => parseInt(n) > 20 && parseInt(n) < 3000);

                            let foundVal = null;

                            if (decimalMatch) {
                                foundVal = decimalMatch[0]; // PERFECT LOCK
                            } else if (validIntegers.length > 0) {
                                // Use the first robust integer match instead of noise
                                foundVal = validIntegers[0]; 
                            }

                            if(foundVal) {
                                geoLoadedDist.innerHTML = foundVal;
                                if(geoRefLabel) geoRefLabel.textContent = `REF_${item.id.toString().substr(-4)}`;
                                
                                // CACHE SECURELY
                                const index = vaultCache.findIndex(x => x.id === item.id);
                                if (index !== -1) {
                                    vaultCache[index].distance = foundVal;
                                    if(window.TRC_IDB) TRC_IDB.set('intelVault', vaultCache[index].id.toString(), vaultCache[index]);
                                }
                            } else {
                                // Fallback to existing Smart Label Extractor if OCR failed
                                const fallback = item.label.match(/\d{2,4}/);
                                geoLoadedDist.textContent = fallback ? fallback[0] : "ERR";
                            }
                        })
                        .catch(e => { geoLoadedDist.textContent = "---"; });
                } else {
                    const fallback = item.label.match(/\d{2,4}/);
                    geoLoadedDist.textContent = fallback ? fallback[0] : "---";
                }
            }
        }

        // 3. ACTIVATE MANUAL OVERRIDE TOUCH LISTENER
        const touchZone = document.getElementById('geo-vector-touch-zone');
        if (touchZone) {
            // Clone node to wipe previous listeners instantly 
            const newTouchZone = touchZone.cloneNode(true);
            touchZone.parentNode.replaceChild(newTouchZone, touchZone);
            
            newTouchZone.addEventListener('click', (e) => {
                e.stopPropagation();
                const currentVal = document.getElementById('geo-loaded-dist').textContent;
                const override = prompt("🔐 MANUAL OVERRIDE: Enter Confirmed Yardage Vector:", currentVal);
                
                if (override !== null && override.trim() !== "") {
                    const cleanVal = override.replace(/[^\d.]/g, ''); // Keep only digits/dots
                    if(cleanVal) {
                        // Immediate visual update
                        document.getElementById('geo-loaded-dist').textContent = cleanVal;
                        
                        // Force update current item and database forever!
                        const idx = vaultCache.findIndex(x => x.id === item.id);
                        if (idx !== -1) {
                            vaultCache[idx].distance = cleanVal;
                            if(window.TRC_IDB) TRC_IDB.set('intelVault', vaultCache[idx].id.toString(), vaultCache[idx]);
                            console.log("VECTOR CACHE UPDATED MANUALLY:", cleanVal);
                        }
                    }
                }
            });
        }

        // Close selector to show maximized snapshot
        window.toggleFullscreen('panel-vault');
    }


    // ========================================================================
    // CENTRAL HUB: DUAL SURVEILLANCE CAMERA ENGINE
    // ========================================================================
    let activeStream = null;
    let currentFacingMode = "environment"; // Start with rear cam
    let isVideoMode = false;
    let mediaRecorder = null;
    let recordedChunks = [];
    let recordingTimer = null;

    const activateScopeBtn = document.getElementById('feed-activate-scope-btn');
    const activateVideoBtn = document.getElementById('feed-activate-video-btn');
    const switchBtn = document.getElementById('feed-switch-cam-btn');
    const killBtn = document.getElementById('feed-kill-btn');
    const videoEl = document.getElementById('surveillance-stream');
    const hud = document.getElementById('surveillance-hud');
    const placeholder = document.getElementById('surveillance-placeholder');
    const label = document.getElementById('feed-label-source');

    // --- TACTICAL HUD SENSOR LOGIC ---
    let hudAnimationId = null;
    let hudGeoWatchId = null;
    let currentHudHeading = 0;
    let currentHudPitch = 0;
    let deviceOrientationActive = false;

    let absoluteFired = false;
    function handleOrientation(e) {
        let heading;
        let pitch = e.beta;
        if (pitch === null || pitch === undefined) pitch = 0;

        if (e.webkitCompassHeading !== undefined && e.webkitCompassHeading !== null) {
            heading = e.webkitCompassHeading;
        } else {
            if (e.type === 'deviceorientationabsolute') {
                absoluteFired = true;
                heading = 360 - e.alpha; // Android
            } else if (e.type === 'deviceorientation') {
                if (absoluteFired) return; // Android fallback
                heading = 360 - e.alpha;
            }
        }
        
        if (heading === null || heading === undefined || isNaN(heading)) heading = 0;

        deviceOrientationActive = true; 
        
        // Adjust for device screen orientation (landscape vs portrait)
        let screenAngle = 0;
        if (window.screen && window.screen.orientation) {
            screenAngle = window.screen.orientation.angle || 0;
        } else if (typeof window.orientation !== "undefined") {
            screenAngle = window.orientation || 0;
        }
        
        heading = (heading + screenAngle) % 360;
        if (heading < 0) heading += 360;
        
        currentHudHeading = heading;
        currentHudPitch = pitch - 90;
    }

    function updateTacticalHUD() {
        // Mock animation removed for production

        // 1. Compass Update
        const compassValue = document.getElementById('hud-compass-value');
        const compassTape = document.getElementById('hud-compass-tape');
        if (compassValue) {
            const dirs = ["N","NE","E","SE","S","SW","W","NW","N"];
            const ord = dirs[Math.round(((currentHudHeading % 360) / 45))];
            compassValue.textContent = Math.round(currentHudHeading).toString().padStart(3, '0') + '° ' + ord;
        }
        if (compassTape) {
            if (!compassTape.innerHTML.includes('E')) {
                let tapeStr = "";
                for (let i = 0; i < 360; i += 15) {
                    let dir = i;
                    if (i === 0) dir = 'N';
                    else if (i === 90) dir = 'E';
                    else if (i === 180) dir = 'S';
                    else if (i === 270) dir = 'W';
                    tapeStr += `<span class="inline-block w-8 text-center">${dir}</span>`;
                }
                compassTape.innerHTML = tapeStr + tapeStr + tapeStr + tapeStr + tapeStr; // Extra buffers
                // Set tape explicitly so it doesn't auto-center based on flex
                compassTape.style.left = "50%";
            }
            
            // Each 15 degrees is 32px (w-8).
            // A full 360 tape is 24 items * 32px = 768px.
            // We put 5 copies. The middle copy starts at index 2 (0, 1, 2).
            // So the middle '0' (N) is at 2 * 768px = 1536px from left edge.
            // Center of that 'N' is 1536 + 16px (half of 32px) = 1552px.
            // We want that center to be at left: 50%.
            // So we translate by -1552px when heading is 0.
            
            const pxPerDegree = 32 / 15;
            const baseOffset = 1552; 
            const offset = baseOffset + (currentHudHeading * pxPerDegree);
            compassTape.style.transform = `translateX(-${offset}px)`;
        }

        // 2. Pitch Inclinometer Update
        const pitchAngle = document.getElementById('hud-pitch-angle');
        const pitchCos = document.getElementById('hud-pitch-cos');
        const pitchLadder = document.getElementById('hud-pitch-ladder');
        
        let p = Math.round(currentHudPitch);
        if (pitchAngle) pitchAngle.textContent = `A: ${Math.abs(p)}° ${p > 0 ? 'UP' : (p < 0 ? 'DN' : '')}`;
        if (pitchCos) {
            let cosVal = Math.cos(p * Math.PI / 180);
            pitchCos.textContent = `C: ${cosVal.toFixed(2)}`;
        }
        if (pitchLadder) {
            if (!pitchLadder.innerHTML.includes('div')) {
                let ladStr = "";
                for(let i=45; i>=-45; i-=5) {
                    if (i===0) ladStr += `<div class="h-6 flex items-center justify-end w-full"><div class="w-full h-[1px] bg-emerald-400"></div></div>`;
                    else ladStr += `<div class="h-6 flex items-center justify-end w-full gap-1"><span class="text-[5px] text-emerald-500">${Math.abs(i)}</span><div class="w-2/3 h-[1px] bg-emerald-500/50"></div></div>`;
                }
                pitchLadder.innerHTML = ladStr;
            }
            // 24px height per 5 degrees = 4.8px per degree
            const pOffset = (currentHudPitch * 4.8);
            pitchLadder.style.transform = `translateY(${pOffset}px)`;
        }

        hudAnimationId = requestAnimationFrame(updateTacticalHUD);
    }

    function initTacticalHUD() {
        
        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientationabsolute', handleOrientation, true);
            window.addEventListener('deviceorientation', handleOrientation, true);
        } else {
            deviceOrientationActive = false;
        }

        
        // Start GPS tracking for HUD
        if (navigator.geolocation) {
            hudGeoWatchId = navigator.geolocation.watchPosition((pos) => {
                const latEl = document.getElementById('hud-gps-lat');
                const lonEl = document.getElementById('hud-gps-lon');
                if (latEl) latEl.textContent = pos.coords.latitude.toFixed(6);
                if (lonEl) lonEl.textContent = pos.coords.longitude.toFixed(6);
                window.myLatestCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            }, (err) => {
                console.warn("HUD GPS Error:", err);
            }, { enableHighAccuracy: true });
        }
        
        hudAnimationId = requestAnimationFrame(updateTacticalHUD);
    }

    function stopTacticalHUD() {
        if (hudAnimationId) cancelAnimationFrame(hudAnimationId);
        window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
        window.removeEventListener('deviceorientation', handleOrientation, true);
        
        // Stop GPS tracking for HUD
        if (hudGeoWatchId !== null && navigator.geolocation) {
            navigator.geolocation.clearWatch(hudGeoWatchId);
            hudGeoWatchId = null;
        }
    }
    // --- END TACTICAL HUD SENSOR LOGIC ---

    async function startFeed() {
        if (activeStream) {
            activeStream.getTracks().forEach(track => track.stop());
        }

        try {
            const constraints = {
                video: {
                    facingMode: currentFacingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: isVideoMode ? true : false
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            activeStream = stream;
            
            if (isVideoMode && !window.videoAudioAlertShown) {
                window.videoAudioAlertShown = true;
                setTimeout(() => alert("VIDEO RECORDING:\nMicrophones for 2-way radio and AI Spotter are temporarily inactive."), 500);
            }
            window.activeStream = stream; // Export for flashlight
            
            // Re-enable autoplay for live stream
            videoEl.autoplay = true;
            videoEl.setAttribute('autoplay', '');
            videoEl.srcObject = stream;
            
            // Hard kick start for mobile auto-play security!
            try {
                await videoEl.play();
            } catch (playErr) {
                console.warn("Autoplay prevented, retrying with direct call", playErr);
                videoEl.play(); // Fire-and-forget fallback
            }
            
            videoEl.classList.remove('hidden');
            placeholder.classList.add('hidden');
            
            const captureBtn = document.getElementById('surveillance-capture-btn');
            const recStartBtn = document.getElementById('surveillance-record-start-btn');
            const recStopBtn = document.getElementById('surveillance-record-stop-btn');

            const hudToggleBtn = document.getElementById('feed-hud-toggle-btn');
            if (!isVideoMode) {
                hud.classList.remove('hidden');
                if(captureBtn) captureBtn.classList.remove('hidden');
                if(hudToggleBtn) hudToggleBtn.classList.remove('hidden');
                if(recStartBtn) recStartBtn.classList.add('hidden');
                if(recStopBtn) recStopBtn.classList.add('hidden');
                
                // Reset toggle button state if it was toggled off previously
                if (hudToggleBtn) {
                    hudToggleBtn.innerHTML = '<i data-lucide="eye-off" class="w-4 h-4"></i> HUD';
                    hudToggleBtn.classList.replace('text-gray-400', 'text-gray-300');
                    if (window.lucide) window.lucide.createIcons();
                }
            } else {
                hud.classList.add('hidden');
                if(captureBtn) captureBtn.classList.add('hidden');
                if(hudToggleBtn) hudToggleBtn.classList.add('hidden');
                if(recStartBtn) recStartBtn.classList.remove('hidden');
                if(recStopBtn) recStopBtn.classList.add('hidden');
            }

            if(killBtn) killBtn.classList.remove('hidden'); // Show shutdown button
            
            // FORCE SURVEILLANCE FOOTER VISIBLE ON START (Mobile Fix)
            const survFooter = document.getElementById('surveillance-footer');
            if(survFooter) survFooter.classList.remove('hidden');

            const flipBtn = document.getElementById('feed-switch-cam-btn');
            if(flipBtn) flipBtn.classList.remove('hidden');

            label.textContent = currentFacingMode === "environment" ? "REAR CAM" : "LOCAL HUD / FRONT";
            
            initTacticalHUD(); // START HUD LOGIC
            
        } catch (err) {
            console.error("Camera failed:", err);
            window.pushTacLog("CAMERA ACCESS DENIED", "ERROR");
        }
    }

    function stopFeed() {
        if (activeStream) {
            activeStream.getTracks().forEach(track => track.stop());
            activeStream = null;
            window.activeStream = null;
            
            // Reset Flashlight UI
            if (window.isFlashlightOn !== undefined) {
                window.isFlashlightOn = false;
                const fBtn = document.getElementById('flashlight-btn');
                if (fBtn) {
                    fBtn.classList.add('text-gray-400');
                    fBtn.classList.remove('text-yellow-400', 'bg-black/90');
                    fBtn.style.boxShadow = '';
                }
            }
        }
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        if (recordingTimer) clearTimeout(recordingTimer);
        // We cannot clear recTimerInterval here easily without scope, but we can reset the label
        const label = document.getElementById('feed-label-source');
        if (label) label.textContent = "OFFLINE";
        
        const recStartBtn = document.getElementById('surveillance-record-start-btn');
        const recStopBtn = document.getElementById('surveillance-record-stop-btn');
        if(recStartBtn) recStartBtn.classList.remove('hidden');
        if(recStopBtn) recStopBtn.classList.add('hidden');

        if (videoEl) {
            videoEl.srcObject = null;
            videoEl.src = "";
            videoEl.controls = false;
            videoEl.classList.add('hidden');
        }
        
        const imgViewer = document.getElementById('surveillance-snapshot-viewer');
        if (imgViewer) {
            imgViewer.src = "";
            imgViewer.classList.add('hidden');
        }
        
        const cardViewer = document.getElementById('surveillance-card-viewer');
        if (cardViewer) {
            cardViewer.innerHTML = "";
            cardViewer.classList.add('hidden');
        }
        
        placeholder.classList.remove('hidden');
        hud.classList.add('hidden');
        if(killBtn) killBtn.classList.add('hidden'); // Hide shutdown button again
        
        // RESTORE all buttons that may have been hidden during image/video review mode
        const _flipBtn = document.getElementById('feed-switch-cam-btn');
        const _hudToggleBtn = document.getElementById('feed-hud-toggle-btn');
        const _recStartBtn = document.getElementById('surveillance-record-start-btn');
        if (_flipBtn) _flipBtn.classList.remove('hidden');
        if (_hudToggleBtn) _hudToggleBtn.classList.remove('hidden');
        if (_recStartBtn) _recStartBtn.classList.remove('hidden');
        // Also reset kill button text in case it was changed to "CLOSE REVIEW"
        if (killBtn) killBtn.innerHTML = '<i data-lucide="power-off" class="w-4 h-4"></i>';

        // HIDE FOOTER ON STOP
        const survFooter = document.getElementById('surveillance-footer');
        if(survFooter) survFooter.classList.add('hidden');
        
        stopTacticalHUD(); // STOP HUD LOGIC

        label.textContent = "OFFLINE";
    }

    window.closeSurveillanceReview = stopFeed;

    
    function requestOrientationPermissionAndStartFeed(isVid) {
        isVideoMode = isVid;
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission().then(permissionState => {
                if (permissionState === 'granted') {
                    deviceOrientationActive = true;
                } else {
                    deviceOrientationActive = false;
                }
                startFeed();
            }).catch(err => {
                console.error(err);
                startFeed();
            });
        } else {
            startFeed();
        }
    }

    if (activateScopeBtn) {
        activateScopeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            requestOrientationPermissionAndStartFeed(false);
        });
    }

    if (activateVideoBtn) {
        activateVideoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            requestOrientationPermissionAndStartFeed(true);
        });
    }


    if (killBtn) {
        killBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            stopFeed();
        });
    }

    const hudToggleBtn = document.getElementById('feed-hud-toggle-btn');
    if (hudToggleBtn) {
        hudToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (hud) {
                hud.classList.toggle('hidden');
                // Toggle icon
                if (hud.classList.contains('hidden')) {
                    hudToggleBtn.innerHTML = '<i data-lucide="eye" class="w-4 h-4"></i> HUD';
                    hudToggleBtn.classList.replace('text-gray-300', 'text-gray-400');
                } else {
                    hudToggleBtn.innerHTML = '<i data-lucide="eye-off" class="w-4 h-4"></i> HUD';
                    hudToggleBtn.classList.replace('text-gray-400', 'text-gray-300');
                }
                if (window.lucide) window.lucide.createIcons();
            }
        });
    }

    if (switchBtn) {
        switchBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            currentFacingMode = currentFacingMode === "environment" ? "user" : "environment";
            if (activeStream) startFeed(); // Only start if they already triggered it
        });
    }

    // STREAM CAPTURE LOGIC (Push current frame directly to Vault Window 4)
    const captureBtn = document.getElementById('surveillance-capture-btn');
    if (captureBtn) {
        captureBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!videoEl || videoEl.paused || videoEl.ended) return;

            // Render current video frame to internal canvas
            const canvas = document.createElement('canvas');
            canvas.width = videoEl.videoWidth || 640;
            canvas.height = videoEl.videoHeight || 480;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
            
            // --- TACTICAL HUD FULL GRAPHIC BURN-IN ---
            if (!hud.classList.contains('hidden')) {
            // Dynamic scaler: Mobile cameras are high resolution (1080p+), so we must scale the UI up to match
            const scale = Math.max(1, Math.min(canvas.width, canvas.height) / 400); 
            ctx.scale(scale, scale);
            
            const cw = canvas.width / scale;
            const ch = canvas.height / scale;
            
            ctx.lineWidth = 1;
            const cx = cw / 2;
            const cy = ch / 2;
            
            // Set uniform styling for the HUD info
            ctx.font = "bold 12px monospace";
            ctx.fillStyle = "#10b981";
            
            // Top Center: Compass Tape
            const tapeWidth = cw * 0.6;
            const tapeHeight = 24;
            const tapeX = cw / 2 - tapeWidth / 2;
            const tapeY = 80;
            
            // Tape Background
            ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
            ctx.fillRect(tapeX, tapeY, tapeWidth, tapeHeight);
            ctx.strokeStyle = "rgba(16, 185, 129, 0.3)";
            ctx.strokeRect(tapeX, tapeY, tapeWidth, tapeHeight);

            // Tape Text (Clipping Region)
            ctx.save();
            ctx.beginPath();
            ctx.rect(tapeX, tapeY, tapeWidth, tapeHeight);
            ctx.clip();
            
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = "bold 8px monospace";
            ctx.fillStyle = "rgba(16, 185, 129, 0.7)";
            
            const pxPerDegree = 32 / 15;
            for (let deg = Math.floor(currentHudHeading - 90); deg <= currentHudHeading + 90; deg += 15) {
                let displayDeg = deg % 360;
                if (displayDeg < 0) displayDeg += 360;
                
                let dir = displayDeg;
                if (displayDeg === 0) dir = 'N';
                else if (displayDeg === 90) dir = 'E';
                else if (displayDeg === 180) dir = 'S';
                else if (displayDeg === 270) dir = 'W';

                const dx = (cw / 2) + ((deg - currentHudHeading) * pxPerDegree);
                ctx.fillText(dir, dx, tapeY + tapeHeight / 2);
            }
            ctx.restore();

            // Center Needle
            ctx.fillStyle = "#10b981";
            ctx.fillRect(cw / 2 - 1, tapeY, 2, tapeHeight);

            // Numerical Value Box
            const compassTxt = document.getElementById('hud-compass-value')?.textContent || "000° N";
            const valWidth = 50;
            const valHeight = 16;
            const valX = cw / 2 - valWidth / 2;
            const valY = tapeY - valHeight;
            ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
            ctx.fillRect(valX, valY, valWidth, valHeight);
            ctx.strokeStyle = "rgba(16, 185, 129, 0.5)";
            ctx.strokeRect(valX, valY, valWidth, valHeight);
            
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = "bold 10px monospace";
            ctx.fillStyle = "#10b981";
            ctx.fillText(compassTxt, cw / 2, valY + valHeight / 2 + 1);
            
            ctx.textBaseline = "alphabetic"; // Restore baseline for other text

            // 1. Center Reticle
            ctx.strokeStyle = "rgba(16, 185, 129, 0.7)";
            ctx.beginPath();
            ctx.moveTo(cx - 20, cy); ctx.lineTo(cx + 20, cy); // Horizontal cross
            ctx.moveTo(cx, cy - 20); ctx.lineTo(cx, cy + 20); // Vertical cross
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx, cy, 8, 0, Math.PI * 2); // Center circle
            ctx.stroke();
            
            // Set uniform styling for the HUD info
            ctx.font = "bold 12px monospace";
            ctx.fillStyle = "#10b981";
            
            // Left Side: Pitch, Cosine, Temp
            ctx.textAlign = "left";
            const tAng = document.getElementById('hud-pitch-angle')?.textContent || "A: --";
            const tCos = document.getElementById('hud-pitch-cos')?.textContent || "C: 1.00";
            const tTmp = document.getElementById('hud-tel-temp')?.textContent || "--°";
            ctx.fillText(tAng, 15, cy - 15);
            ctx.fillText(tCos, 15, cy);
            ctx.fillText(tTmp, 15, cy + 15);
            
            // Right Side: Elev, Hold, Rng
            ctx.textAlign = "right";
            const tElev = document.getElementById('hud-dope-elev')?.textContent || "--";
            const tHold = document.getElementById('hud-dope-hold')?.textContent || "--";
            const tRng = document.getElementById('hud-dope-rng')?.textContent || "--";
            ctx.fillText(`ELEV: ${tElev}`, cw - 15, cy - 15);
            ctx.fillText(`HOLD: ${tHold}`, cw - 15, cy);
            ctx.fillText(`RNG: ${tRng}`, cw - 15, cy + 15);
            
            // Bottom Center: Timestamp & GPS
            ctx.textAlign = "center";
            const dateStr = new Date().toISOString().replace('T', ' ').slice(0, 19) + "Z";
            ctx.fillText(dateStr, cx, ch - 95);
            
            if (window.myLatestCoords) {
                ctx.fillText(`GPS: ${window.myLatestCoords.lat.toFixed(6)}, ${window.myLatestCoords.lng.toFixed(6)}`, cx, ch - 80);
            } else {
                ctx.fillStyle = "#ef4444";
                ctx.fillText("GPS: ACQUIRING...", cx, ch - 80);
            }
            }
            // --- END BURN-IN ---
            
            // Get Base64
            const shotData = canvas.toDataURL('image/jpeg', 0.95);
            
            // Flash HUD for visceral feedback
            hud.classList.add('bg-white/40');
            setTimeout(() => hud.classList.remove('bg-white/40'), 100);

            // Get Custom Name from User
            const defaultName = "STREAM_CAPTURE_" + Date.now().toString().slice(-4);
            const userLabel = window.prompt("Enter Name for Intel Capture:", defaultName);
            if(userLabel === null) return; // User cancelled capture
            const finalLabel = userLabel.trim() || defaultName;

            // Save Directly to Window 4
            saveIntelSnapshot(finalLabel.toUpperCase(), shotData);
        });
    }

    // --- VIDEO RECORDER LOGIC ---
    let recTimerInterval = null;
    let recSecondsRemaining = 300; // 5 minutes

    const recStartBtn = document.getElementById('surveillance-record-start-btn');
    const recStopBtn = document.getElementById('surveillance-record-stop-btn');
    const labelSource = document.getElementById('feed-label-source');

    if (recStartBtn) {
        recStartBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!activeStream || !isVideoMode) return;

            recStartBtn.classList.add('hidden');
            recStopBtn.classList.remove('hidden');

            recordedChunks = [];
            let options = { mimeType: 'video/webm;codecs=vp9,opus' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options = { mimeType: 'video/webm' };
            }

            try {
                mediaRecorder = new MediaRecorder(activeStream, options);
            } catch (err) {
                console.error("MediaRecorder init failed", err);
                mediaRecorder = new MediaRecorder(activeStream);
            }

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || 'video/webm' });
                const defaultLabel = `SCOPETAPE_${Math.floor(Date.now() / 1000).toString().slice(-4)}`;
                
                const flash = document.createElement('div');
                flash.className = 'absolute inset-0 bg-red-500 z-[100] transition-opacity duration-500 opacity-100 pointer-events-none';
                document.getElementById('surveillance-container').appendChild(flash);
                setTimeout(() => { flash.style.opacity = '0'; setTimeout(()=>flash.remove(), 500); }, 100);

                if (labelSource) labelSource.textContent = "LOCAL HUD / FRONT";
                if (recTimerInterval) clearInterval(recTimerInterval);

                // Delay modal slightly so the flash is visible
                setTimeout(() => {
                    const modal = document.createElement('div');
                    modal.className = 'absolute inset-0 bg-black/90 z-[150] flex flex-col items-center justify-center p-4 backdrop-blur-sm pointer-events-auto';
                    modal.innerHTML = `
                        <div class="border border-emerald-500 bg-gray-900 p-6 rounded shadow-[0_0_30px_rgba(16,185,129,0.3)] w-full max-w-sm text-center">
                            <h3 class="text-emerald-400 font-mono font-bold tracking-widest uppercase mb-4"><i data-lucide="video" class="inline w-4 h-4 mr-2"></i> TAPE SECURED</h3>
                            <p class="text-[10px] text-gray-400 mb-2 uppercase tracking-widest font-mono">ENTER TAPE DESIGNATION:</p>
                            <input name="tape-name-input" autocomplete="off" type="text" id="tape-name-input" class="w-full bg-black border border-emerald-800 text-emerald-300 px-3 py-2 text-center font-mono font-bold tracking-widest uppercase mb-4 focus:outline-none focus:border-emerald-400" value="${defaultLabel}">
                            <button id="tape-save-btn" class="w-full bg-emerald-700 hover:bg-emerald-500 text-white font-black px-4 py-3 rounded text-[12px] uppercase tracking-widest transition-all">
                                ENCRYPT & SAVE TO VAULT
                            </button>
                        </div>
                    `;
                    document.getElementById('surveillance-container').appendChild(modal);
                    if (window.lucide) window.lucide.createIcons();
                    
                    const input = document.getElementById('tape-name-input');
                    const saveBtn = document.getElementById('tape-save-btn');
                    
                    input.focus();
                    input.select();
                    
                    saveBtn.addEventListener('click', () => {
                        let userLabel = input.value.trim().toUpperCase() || defaultLabel;
                        saveBtn.disabled = true;
                        saveBtn.textContent = 'ENCRYPTING...';
                        // Convert Blob → base64 data URL before saving
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            saveIntelSnapshot(userLabel, reader.result, { type: 'video' });
                            recordedChunks = [];
                            if (window.pushTacLog) window.pushTacLog(`VIDEO TAPE [${userLabel}] SAVED TO VAULT`, "SUCCESS");
                            modal.remove();
                        };
                        reader.onerror = () => {
                            if (window.pushTacLog) window.pushTacLog('VIDEO ENCODE FAILED', 'ERROR');
                            saveBtn.disabled = false;
                            saveBtn.textContent = 'ENCRYPT & SAVE TO VAULT';
                        };
                        reader.readAsDataURL(blob);
                    });

                    // Allow pressing Enter
                    input.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            saveBtn.click();
                        }
                    });
                }, 150);
            };

            mediaRecorder.start(250);

            // Timer display logic
            recSecondsRemaining = 300;
            if (labelSource) labelSource.textContent = `REC 05:00`;
            
            if (recTimerInterval) clearInterval(recTimerInterval);
            recTimerInterval = setInterval(() => {
                recSecondsRemaining--;
                if (recSecondsRemaining <= 0) {
                    clearInterval(recTimerInterval);
                } else {
                    const m = Math.floor(recSecondsRemaining / 60).toString().padStart(2, '0');
                    const s = (recSecondsRemaining % 60).toString().padStart(2, '0');
                    if (labelSource) labelSource.innerHTML = `<span class="text-red-500 animate-pulse font-bold">REC</span> ${m}:${s}`;
                }
            }, 1000);

            // Maximum 5-minute timeout (300000 ms)
            recordingTimer = setTimeout(() => {
                if (mediaRecorder && mediaRecorder.state === 'recording') {
                    if (recStopBtn) recStopBtn.click();
                }
            }, 300000);
        });
    }

    if (recStopBtn) {
        recStopBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
            }
            if (recordingTimer) clearTimeout(recordingTimer);
            if (recTimerInterval) clearInterval(recTimerInterval);
            
            recStopBtn.classList.add('hidden');
            recStartBtn.classList.remove('hidden');
            if (labelSource) labelSource.textContent = "LOCAL HUD / FRONT";
        });
    }


    // ========================================================================
    // TACTICAL BALLISTICS SOLVER MATRIX ENGINE
    // ========================================================================
    // THROTLED TICKER LOG FOR SOLVER SPAM PROTECTION
    let solverLogThrottle = null;

    window.runSolverMatrix = function runSolverMatrix() {
        // 0. Inform Ticker of live processing (Debounced once per 3s during fast typing)
        if (!solverLogThrottle) {
            window.pushTacLog("PARAMETERS MODIFIED -> RE-SOLVING BALLISTIC MATRIX...", "INFO");
            solverLogThrottle = setTimeout(() => { solverLogThrottle = null; }, 3000);
        }

        // 1. GATHER ALL INPUTS (HARDWARE, AMMO, ENVIRONMENT, ANGLE)
        let rawRangeYds = parseFloat(document.getElementById('bal-input-range')?.value) || 100;
        const windMph = parseFloat(document.getElementById('bal-input-wind')?.value) || 0;
        const mv = parseFloat(document.getElementById('bal-input-mv')?.value) || 2600;
        const bc = parseFloat(document.getElementById('bal-input-bc')?.value) || 0.5;
        const shInput = document.getElementById('bal-input-sh');
        let sightHgt = parseFloat(shInput?.value) || 1.5; 
        if (shInput && shInput.value && !shInput.value.includes('.') && shInput.value.length > 1) {
            shInput.value = shInput.value.slice(0,1) + '.' + shInput.value.slice(1);
            sightHgt = parseFloat(shInput.value);
        }
        const zeroYds = parseFloat(document.getElementById('bal-input-zr')?.value) || 100;

        // ENVIRONMENTALS
        const altitude = parseFloat(document.getElementById('bal-input-alt')?.value) || 0;
        const tempF = parseFloat(document.getElementById('bal-input-temp')?.value) || 59;
        const baroInHg = parseFloat(document.getElementById('bal-input-baro')?.value) || 29.92;

        // INCLINE (SLANT RANGE PHYSICS)
        const lookAngle = parseFloat(document.getElementById('bal-input-angle')?.value) || 0;
        const inputCosEl = document.getElementById('bal-input-cos');
        let inputCosine = parseFloat(inputCosEl?.value);
        // Absolute protection from division-by-zero and zero-fill visual glitches.
        // If the field is 0 or blank, we definitively treat the vector scalar as 1.0 and visual-sync the box.
        if (isNaN(inputCosine) || inputCosine === 0) {
            inputCosine = 1.0;
            if (inputCosEl) inputCosEl.value = "1.00"; 
        }
        
        // The True Range is mathematically shorthand for Horizontal Component relative to Gravity
        // Apply cosine reduction to the physical distance gravity operates across
        const effectiveRangeYds = rawRangeYds * inputCosine;

        if (effectiveRangeYds <= 0) return;
        
        // PROTECTIVE THRESHOLD: Avoid compute lockups/unstable iterations during live user typing
        if (mv < 100) return; 

        // 2. HIGH-FIDELITY AIR DENSITY (UNIFIED STATION PRESSURE PHYSICS)
        // Unified with Telemetry dashboard: Since inputs are labeled and processed as native STATION 
        // pressure, we omit the redundant altitude-scaling factor to prevent mathematical double-derating.
        const pressRatio = baroInHg / 29.92;
        const tempRatio = 518.67 / (459.67 + tempF);
        const airDensityRatio = pressRatio * tempRatio;

        // Calculate and display Density Altitude (DA) for user transparency
        const densityAltitude = (1 - Math.pow(airDensityRatio, 1 / 4.25588)) / 0.0000068753;
        const daDisplay = document.getElementById('bal-display-da');
        if (daDisplay) daDisplay.textContent = Math.round(densityAltitude) + " ft";

        // 3. THE ENGINE: MULTI-STEP NUMERICAL PROPAGATION (4-Phase Mach Dynamics)
        const gravity = 32.174; 
        const speedOfSound = 49.02 * Math.sqrt(tempF + 459.67); // Exact acoustic limit for air temp

        function simulateTrajectory(targetYards) {
            const targetFt = targetYards * 3;
            
            // =====================================================================
            // HIGH-FIDELITY INDUSTRY-STANDARD G1 BALLISTIC PROPAGATOR
            // Utilizing the verified Continuous Piecewise Power Data Array
            // =====================================================================
            const G1 = {
                T: [4230, 3680, 3450, 3295, 3130, 2960, 2830, 2680, 2460, 2225, 2015, 1890, 1810, 1730, 1595, 1520, 1420, 1360, 1315, 1280, 1220, 1185, 1150, 1100, 1060, 1025, 980, 945, 905, 860, 810, 780, 750, 700, 640, 600, 550, 250, 100, 65, 0],
                V: [ 
                    {A:1.4774e-04, M:1.9565}, {A:1.9203e-04, M:1.9250}, {A:2.8948e-04, M:1.8750}, {A:4.3499e-04, M:1.8250}, {A:6.5204e-04, M:1.7750}, {A:9.7481e-04, M:1.7250}, {A:1.4537e-03, M:1.6750}, {A:2.1629e-03, M:1.6250}, {A:3.2096e-03, M:1.5750}, {A:3.9044e-03, M:1.5500}, {A:3.2229e-03, M:1.5750}, {A:2.2033e-03, M:1.6250}, {A:1.5110e-03, M:1.6750}, {A:8.6100e-04, M:1.7500}, {A:4.0861e-04, M:1.8500}, {A:1.9545e-04, M:1.9500}, {A:5.4319e-05, M:2.1250}, {A:8.8477e-06, M:2.3750}, {A:1.4569e-06, M:2.6250}, {A:2.4195e-07, M:2.8750}, {A:1.6580e-08, M:3.2500}, {A:4.7455e-10, M:3.7500}, {A:1.3797e-11, M:4.2500}, {A:4.0702e-13, M:4.7500}, {A:2.9382e-14, M:5.1250}, {A:1.2286e-14, M:5.2500}, {A:2.9169e-14, M:5.1250}, {A:3.8551e-13, M:4.7500}, {A:1.1851e-11, M:4.2500}, {A:3.5661e-10, M:3.7500}, {A:1.0455e-08, M:3.2500}, {A:1.2912e-07, M:2.8750}, {A:6.8244e-07, M:2.6250}, {A:3.5692e-06, M:2.3750}, {A:1.8390e-05, M:2.1250}, {A:5.7112e-05, M:1.9500}, {A:9.2266e-05, M:1.8750}, {A:9.3380e-05, M:1.8750}, {A:7.2252e-05, M:1.9250}, {A:5.7927e-05, M:1.9750}, {A:5.2062e-05, M:2.0000}
                ]
            };

            function retard(velocity) {
                let currentA = -1, currentM = -1;
                for (let i = 0; i < G1.T.length; i++) {
                    if (velocity > G1.T[i]) {
                        currentA = G1.V[i].A;
                        currentM = G1.V[i].M;
                        break;
                    }
                }
                if (currentA === -1) {
                    currentA = G1.V[G1.V.length-1].A;
                    currentM = G1.V[G1.V.length-1].M;
                }
                // Final verified physics retardation computation scaled to specific atmospherics & BC
                return (currentA * Math.pow(velocity, currentM) * airDensityRatio) / bc;
            }

            // ITERATIVE ZERO ANGLE SOLVER
            function getZeroAngle() {
                let angle = 0.0;
                let deltaAngle = Math.PI / 180.0; // 1 degree step
                const targetX = zeroYds * 3.0;
                const startY = -(sightHgt / 12.0); // Start below line of sight
                
                for (let iter = 0; iter < 100; iter++) {
                    let v_x = mv * Math.cos(angle);
                    let v_y = mv * Math.sin(angle);
                    
                    let d_x = 0;
                    let d_y = startY;
                    let dt = 0.0005; // High resolution time step
                    
                    while (d_x <= targetX) {
                        let total_v = Math.sqrt(v_x*v_x + v_y*v_y);
                        let dragAccel = retard(total_v);
                        
                        let ax_drag = -(v_x / total_v) * dragAccel;
                        let ay_drag = -(v_y / total_v) * dragAccel;
                        
                        let v_x_next = v_x + ax_drag * dt;
                        let v_y_next = v_y + (ay_drag - gravity) * dt;
                        
                        d_x += dt * (v_x + v_x_next) / 2.0;
                        d_y += dt * (v_y + v_y_next) / 2.0;
                        
                        v_x = v_x_next;
                        v_y = v_y_next;
                        
                        if (v_x < 10) break;
                    }
                    
                    if (Math.abs(d_y) < 0.0001) break; // Intercept achieved
                    
                    if (d_y > 0) { // Hit high
                        if (deltaAngle > 0) deltaAngle = -deltaAngle / 2.0;
                    } else { // Hit low
                        if (deltaAngle < 0) deltaAngle = -deltaAngle / 2.0;
                    }
                    angle += deltaAngle;
                }
                return angle;
            }

            const zeroAngle = getZeroAngle();

            // MAIN TRAJECTORY INTEGRATION
            let v_x = mv * Math.cos(zeroAngle);   
            let v_y = mv * Math.sin(zeroAngle);    
            let d_x = 0;    
            let d_y = -(sightHgt / 12.0);    
            let t = 0;      
            const dt = 0.0005; 
            
            while (d_x < targetFt) {
                let total_v = Math.sqrt(v_x*v_x + v_y*v_y);
                let dragAccel = retard(total_v);
                
                let ax_drag = -(v_x / total_v) * dragAccel;
                let ay_drag = -(v_y / total_v) * dragAccel;
                
                let v_x_next = v_x + ax_drag * dt;
                let v_y_next = v_y + (ay_drag - gravity) * dt;
                
                d_x += dt * (v_x + v_x_next) / 2.0;
                d_y += dt * (v_y + v_y_next) / 2.0;
                
                v_x = v_x_next;
                v_y = v_y_next;
                t += dt;
                
                // ABSOLUTE SAFETY BREAKERS: Prevent browser lockup on hyper-low velocity collisions
                if (v_x < 10) break; 
                if (t > 10.0) break; // Bullets generally don't fly for 10+ seconds
            }
            
            return { time: t, drop: d_y * 12, finalVel: Math.sqrt(v_x*v_x + v_y*v_y) };
        }

        // 4. COMPUTE SOLUTIONS (Using Effective Slant Range)
        const targetSim = simulateTrajectory(effectiveRangeYds);

        // 5. ZERO-RANGE INTERCEPT VECTOR (Implicitly calculated via iterative zeroAngle solver)
        // If targetSim.drop is POSITIVE, the bullet is hitting HIGH, so we need a DOWN hold (-netDrop)
        // If targetSim.drop is NEGATIVE, the bullet is hitting LOW, so we need an UP hold (+netDrop)
        const netDropInches = -targetSim.drop;

        // 6. UNIFIED WINDAGE & GYROSCOPIC VECTORS (NET DRIFT SUMMATION)
        const windDirDeg = parseFloat(document.getElementById('bal-input-wind-dir')?.value) || 90;
        const shotDirDeg = parseFloat(document.getElementById('bal-input-shot-dir')?.value) || 0;
        
        const relativeAngleDeg = windDirDeg - shotDirDeg;
        const angleRad = relativeAngleDeg * (Math.PI / 180);
        const rawSine = Math.sin(angleRad); 
        
        const windIndicatorEl = document.getElementById('bal-wind-dir-indicator');
        if (windIndicatorEl) {
            if (Math.abs(rawSine) < 0.1) {
                windIndicatorEl.textContent = (Math.cos(angleRad) > 0) ? "HEADWIND ⬆" : "TAILWIND ⬇";
            } else if (rawSine > 0) {
                windIndicatorEl.textContent = "FROM R ⬅";
            } else {
                windIndicatorEl.textContent = "FROM L ➡";
            }
        }
        
        // Physics: Calculate basic drift magnitude in inches
        const crosswindFps = (windMph * Math.abs(rawSine)) * 1.4667;
        const vacuumTime = (effectiveRangeYds * 3) / mv;
        const baseDriftMag = crosswindFps * (targetSim.time - vacuumTime) * 12;
        
        // Realize vector direction: 
        // Positive (+) implies wind pushes Left -> Requires Right scope correction.
        // Negative (-) implies wind pushes Right -> Requires Left scope correction.
        const windDriftInches = rawSine >= 0 ? baseDriftMag : -baseDriftMag;

        // Calculate high-fidelity Spin Drift (Counter-Clockwise Gyro-Drift)
        // Default physics rule: 0.00018 mils offset per yard.
        const spinDriftMils = effectiveRangeYds * 0.00018;
        const milConstant = effectiveRangeYds * 0.036;
        const spinDriftInches = spinDriftMils * milConstant;
        
        // ALGEBRAIC UNIFICATION: Combine dynamic wind push and static right-hand spin push.
        // Standard spin pushes bullet Right -> Always forces additional Left (-) correction.
        const netDriftInches = windDriftInches - spinDriftInches;

        // Resolve Master Directional Orientation Code based on total Net Vector state
        let directionCode = '-';
        if (netDriftInches > 0.08) directionCode = 'R'; // Trivial threshold
        else if (netDriftInches < -0.08) directionCode = 'L';

        // 7. CONVERT UNIFIED NET VECTOR TO OPTIC UNITS (MILS / MOA)
        const opticMode = window.currentOpticMode || 'MIL';
        
        let opticElevValue = 0;
        let opticWindValue = 0; 
        let finalClicks = 0;
        let windClicks = 0;
        let elevDirectionCode = 'U';

        if (opticMode === 'MIL') {
            opticElevValue = netDropInches / milConstant; 
            opticWindValue = Math.abs(netDriftInches / milConstant);
            
            elevDirectionCode = opticElevValue >= 0 ? 'U' : 'D';
            finalClicks = Math.round(Math.abs(opticElevValue) * 10); 
            windClicks = Math.round(opticWindValue * 10);
        } else {
            // Unified MOA Output
            const moaConstant = effectiveRangeYds * 0.01047;
            opticElevValue = netDropInches / moaConstant;
            opticWindValue = Math.abs(netDriftInches / moaConstant);
            
            elevDirectionCode = opticElevValue >= 0 ? 'U' : 'D';
            finalClicks = Math.round(Math.abs(opticElevValue) * 10); 
            windClicks = Math.round(opticWindValue * 10);
        }

        // 8. ATOMIC DASHBOARD UPDATE
        const elevEl = document.getElementById('sol-elev-mil');
        if(elevEl) elevEl.textContent = Math.abs(opticElevValue).toFixed(2);
        
        const elevInchEl = document.getElementById('sol-elev-inch');
        if(elevInchEl) elevInchEl.textContent = Math.abs(netDropInches).toFixed(1) + '"';
        
        const elevClicksEl = document.getElementById('sol-elev-clicks');
        if(elevClicksEl) elevClicksEl.textContent = `${finalClicks}`;
        
        const elevLabelEl = document.getElementById('sol-elev-label-code');
        if (elevLabelEl) elevLabelEl.textContent = elevDirectionCode;

        const elevUnitEl = document.getElementById('sol-elev-unit');
        if (elevUnitEl) elevUnitEl.textContent = opticMode;

        // Final Windage Synchronization (Unified Net Readouts)
        const windMilEl = document.getElementById('sol-wind-mil');
        if(windMilEl) windMilEl.textContent = opticWindValue.toFixed(2);
        
        const windInchEl = document.getElementById('sol-wind-inch');
        if(windInchEl) windInchEl.textContent = Math.abs(netDriftInches).toFixed(1) + '"';
        
        const windLabelEl = document.getElementById('sol-wind-label-code');
        if (windLabelEl) windLabelEl.textContent = directionCode;
        
        const windClicksEl = document.getElementById('sol-wind-clicks');
        if(windClicksEl) windClicksEl.textContent = `${windClicks}`;

        const windUnitEl = document.getElementById('sol-wind-unit');
        if (windUnitEl) windUnitEl.textContent = opticMode;

        // --- HUD LIVE SYNC ---
        const hTelTemp = document.getElementById('hud-tel-temp');
        if (hTelTemp) hTelTemp.textContent = tempF + '°';
        const hTelBaro = document.getElementById('hud-tel-baro');
        if (hTelBaro) hTelBaro.textContent = baroInHg.toFixed(2);
        const hTelWind = document.getElementById('hud-tel-wind');
        if (hTelWind) hTelWind.textContent = `${windMph} MPH @ ${windDirDeg}°`;
        
        // Approximate DA for HUD (simplified model for visual display)
        // Standard formula: DA = Altitude + 120*(Temp - Standard Temp at Alt)
        const stdTemp = 59 - (0.00356 * altitude);
        const calcDA = Math.round(altitude + 120 * (tempF - stdTemp));
        const hTelDa = document.getElementById('hud-tel-da');
        if (hTelDa) hTelDa.textContent = calcDA;

        const hDopeElev = document.getElementById('hud-dope-elev');
        if (hDopeElev) hDopeElev.textContent = `${elevDirectionCode} ${Math.abs(opticElevValue).toFixed(2)}`;
        const hDopeHold = document.getElementById('hud-dope-hold');
        if (hDopeHold) hDopeHold.textContent = `${directionCode} ${opticWindValue.toFixed(2)}`;
        const hDopeRng = document.getElementById('hud-dope-rng');
        if (hDopeRng) hDopeRng.textContent = `${Math.round(rawRangeYds)} YDS`;
        // --- END HUD LIVE SYNC ---

        const btn = document.getElementById('master-solve-btn');
        if (btn) {
            btn.classList.add('animate-pulse', 'bg-emerald-300', 'text-black');
            setTimeout(() => btn.classList.remove('animate-pulse', 'bg-emerald-300', 'text-black'), 200);
        }
    }

    // === TELEMETRY HOOKS ===
    
    // 1. Sync Range from Map measurement (FIXED & ACTIVATED)
    const syncGeoBtn = document.getElementById('bal-sync-map');
    if (syncGeoBtn) {
        syncGeoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Attempt to fetch live measurement from active session
            const valSpan = document.getElementById('live-map-dist');
            if (valSpan && valSpan.textContent !== "--.--") {
                const dist = Math.round(parseFloat(valSpan.textContent));
                document.getElementById('bal-input-range').value = dist;
                
                syncGeoBtn.textContent = "LOCKED";
                syncGeoBtn.classList.add('bg-emerald-500', 'text-white');
                setTimeout(() => {
                    syncGeoBtn.textContent = "SYNC MAP";
                    syncGeoBtn.classList.remove('bg-emerald-500', 'text-white');
                    runSolverMatrix(); // Instant dynamic solve
                }, 800);
            } else {
                alert("No live map measurement detected! Draw a line on the recon map first.");
            }
        });
    }

    // 2. FULL METEO UPLINK (FIXED, ACTIVATED & EXPANDED)
    const balSyncWxBtn = document.getElementById('bal-sync-wx');
    if (balSyncWxBtn) {
        balSyncWxBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Fetch all source nodes from weather telemetry dashboard
            const wxWind = document.getElementById('wx-wind-speed');
            const wxDir = document.getElementById('wx-wind-dir');
            const wxTemp = document.getElementById('wx-temp');
            const wxPres = document.getElementById('wx-pres');

            if (wxWind && wxWind.textContent !== "--") {
                // 1. PULL WIND DATA
                document.getElementById('bal-input-wind').value = Math.round(parseFloat(wxWind.textContent));
                
                // Extract digits from "DEG 128"
                const dirMatch = wxDir.textContent.match(/\d+/);
                if(dirMatch) document.getElementById('bal-input-wind-dir').value = dirMatch[0];

                // 2. PULL CRITICAL ATMOSPHERICS
                if(wxTemp) document.getElementById('bal-input-temp').value = Math.round(parseFloat(wxTemp.textContent));
                if(wxPres) document.getElementById('bal-input-baro').value = parseFloat(wxPres.textContent);
                
                // LOG TO TAC-COMMS
                window.pushTacLog(`METEO UPLINK ESTABLISHED. ATMOSPHERICS INJECTED TO SOLVER.`, "SUCCESS");
                
                // SUCCESS FEEDBACK
                const originalBtnText = balSyncWxBtn.textContent;
                balSyncWxBtn.textContent = "LOCKED";
                balSyncWxBtn.classList.add('bg-emerald-500', 'text-white');
                
                setTimeout(() => { 
                    balSyncWxBtn.textContent = originalBtnText; 
                    balSyncWxBtn.classList.remove('bg-emerald-500', 'text-white');
                    runSolverMatrix(); // Instant complete recalculation
                }, 800);
            } else {
                alert("No orbital climate data available! Click 'SYNC SATELLITE CLIMATE' in the weather panel first.");
            }
        });
    }

    // Angle to Cosine Dynamic Link
    const inputAngle = document.getElementById('bal-input-angle');
    const inputCos = document.getElementById('bal-input-cos');
    if (inputAngle && inputCos) {
        inputAngle.addEventListener('input', () => {
            const deg = parseFloat(inputAngle.value) || 0;
            const rad = deg * (Math.PI / 180);
            inputCos.value = Math.abs(Math.cos(rad)).toFixed(3);
        });
    }

    // Master Trigger Listener
    const solveBtn = document.getElementById('master-solve-btn');
    if (solveBtn) {
        solveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            runSolverMatrix();
        });
    }

    // Optic Mode Toggle Listener
    window.currentOpticMode = 'MIL';
    const modeBtn = document.getElementById('bal-optic-mode-btn');
    if (modeBtn) {
        modeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.currentOpticMode = window.currentOpticMode === 'MIL' ? 'MOA' : 'MIL';
            modeBtn.textContent = `MODE: ${window.currentOpticMode}`;
            
            // Adjust visual state of button
            if (window.currentOpticMode === 'MOA') {
                modeBtn.classList.remove('text-blue-300', 'border-blue-700');
                modeBtn.classList.add('text-orange-300', 'border-orange-700');
            } else {
                modeBtn.classList.remove('text-orange-300', 'border-orange-700');
                modeBtn.classList.add('text-blue-300', 'border-blue-700');
            }
            
            runSolverMatrix();
        });
    }

    // === SYNC DISABLED: Dashboard ballistic solver is fully independent of the range card form ===
    // Each form must be filled in manually by the user.

    // Auto-calculate when any value manually changes
    ['bal-input-range', 'bal-input-shot-dir', 'bal-input-wind', 'bal-input-wind-dir', 'bal-input-mv', 'bal-input-bc', 'bal-input-sh', 'bal-input-zr', 'bal-input-alt', 'bal-input-temp', 'bal-input-baro', 'bal-input-angle', 'bal-input-cos'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', runSolverMatrix);
    });

    // Kickoff initial baseline calculation
    setTimeout(runSolverMatrix, 500);


    // AUTO-EXPAND PANEL ON TAP/CLICK
    document.querySelectorAll('.dash-panel').forEach(panel => {
        // Add a style to suggest interactivity
        panel.style.cursor = 'pointer';
        
        panel.addEventListener('click', (e) => {
            // 1. If it is already maximized, do not toggle it back automatically 
            //    (this allows user to interact with inside content without it closing).
            if (panel.classList.contains('is-maximized')) return;

            // 2. If they clicked a native control/button/input block inside, let that action fire instead of zooming
            if (e.target.closest('button') || e.target.closest('select') || e.target.closest('input') || e.target.closest('.relative.bg-gray-900\\/50')) return;
            
            // EXPLICIT BYPASS: If they click INSIDE the Grid Selectors to load a card, DO NOT trigger auto-zoom container!
            if (e.target.closest('#dope-cache-list-injection') || 
                e.target.closest('#sat-archive-list-injection') || 
                e.target.closest('#vault-list-injection')) {
                return;
            }

            // 3. Otherwise, auto-maximize this panel!
            if (panel.id) {
                window.toggleFullscreen(panel.id);
            }
        });
    });

    // Stabilize Window 3 permanently on application launch
    setTimeout(initLiveMap, 1000);

    // --- VAULT IMPORT / EXPORT LOGIC ---
    const vaultExportBtn = document.getElementById('vault-export-btn');
    const vaultImportBtn = document.getElementById('vault-import-btn');
    const vaultImportInput = document.getElementById('vault-import-input');

    async function getVaultItemExportUri(item) {
        if (!item) return null;
        // 1. If it's already a base64 data URI
        if (typeof item.image === 'string' && item.image.startsWith('data:image')) {
            return item.image;
        }
        if (typeof item.data === 'string' && item.data.startsWith('data:image')) {
            return item.data;
        }

        // 2. If it has a remote HTTP image (e.g. Supabase hosted image)
        const remoteUrl = (typeof item.image === 'string' && item.image.startsWith('http')) ? item.image :
                          (item.contact && typeof item.contact.cardImageUrl === 'string' && item.contact.cardImageUrl.startsWith('http')) ? item.contact.cardImageUrl : null;

        if (remoteUrl) {
            try {
                const resp = await fetch(remoteUrl, { mode: 'cors' });
                if (resp.ok) {
                    const blob = await resp.blob();
                    return await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                    });
                }
            } catch (e) {
                console.warn("Could not fetch remote image for export, falling back to canvas renderer", e);
            }
        }

        // 3. Render high-res tactical card canvas for contact/intel/text cards
        const canvas = document.createElement('canvas');
        canvas.width = 900;
        canvas.height = 1200;
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#030712';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Outer border
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 14;
        ctx.strokeRect(20, 20, 860, 1160);

        // Inner border
        ctx.strokeStyle = '#3b0764';
        ctx.lineWidth = 4;
        ctx.strokeRect(34, 34, 832, 1132);

        // Header bar
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(40, 40, 820, 120);

        ctx.fillStyle = '#c084fc';
        ctx.font = 'bold 36px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('TRC OPERATOR INTEL', 60, 115);

        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'right';
        ctx.fillText('VERIFIED // CARD', 830, 115);

        // Outfitter / Biz name
        const c = item.contact || {};
        const bizname = c.bizname || item.name || item.author || 'TRC OPERATOR';
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 50px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(bizname.toUpperCase().slice(0, 28), 60, 235);

        // Author / Unit
        ctx.fillStyle = '#a855f7';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText((item.author || c.author || 'OPERATOR').toUpperCase(), 60, 295);

        if (c.unit) {
            ctx.fillStyle = '#94a3b8';
            ctx.font = 'bold 28px monospace';
            ctx.fillText(`UNIT: ${c.unit.toUpperCase()}`, 60, 345);
        }

        // Divider line
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(60, 375);
        ctx.lineTo(840, 375);
        ctx.stroke();

        // Body Content / Intel Text
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '28px monospace';
        const text = item.content || c.details || 'VERIFIED TACTICAL OUTFITTER CONTACT // SAVED TO INTEL VAULT';
        const words = text.split(/\s+/);
        let line = '', y = 430;
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > 740 && n > 0) {
                ctx.fillText(line, 60, y);
                line = words[n] + ' ';
                y += 42;
                if (y > 900) break;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, 60, y);

        // Footer contact bar
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(40, 950, 820, 190);
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 3;
        ctx.strokeRect(40, 950, 820, 190);

        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 28px monospace';
        ctx.fillText(`TEL: ${c.phone || '--'}`, 60, 1010);

        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`WEB: ${c.web || '--'}`, 60, 1060);

        if (c.gps || (item.targetLat && item.targetLon)) {
            ctx.fillStyle = '#f59e0b';
            ctx.fillText(`GPS: ${c.gps || (item.targetLat + ', ' + item.targetLon)}`, 60, 1105);
        } else if (item.date) {
            ctx.fillStyle = '#94a3b8';
            ctx.fillText(`LOGGED: ${item.date}`, 60, 1105);
        }

        return canvas.toDataURL('image/png');
    }

    if (vaultExportBtn) {
        vaultExportBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const checkedBoxes = document.querySelectorAll('.vault-export-checkbox:checked');
            if (checkedBoxes.length === 0) {
                alert('Please select at least one snapshot to export using the checkboxes.');
                return;
            }

            const selectedIds = Array.from(checkedBoxes).map(cb => cb.dataset.vaultId || cb.name || cb.value);
            let itemsToExport = vaultCache.filter(item => selectedIds.includes(item.id?.toString()) || selectedIds.includes(String(item.id)));

            // If some items were not found in memory cache, look them up from IndexedDB
            if (itemsToExport.length < selectedIds.length && window.TRC_IDB) {
                for (const id of selectedIds) {
                    if (!itemsToExport.some(it => it.id?.toString() === id.toString())) {
                        const dbItem = await window.TRC_IDB.get('intelVault', id.toString());
                        if (dbItem) itemsToExport.push(dbItem);
                    }
                }
            }

            if (itemsToExport.length === 0) {
                alert('Could not find selected cards to export.');
                return;
            }

            let exportCount = 0;
            for (let i = 0; i < itemsToExport.length; i++) {
                const item = itemsToExport[i];
                try {
                    const dataUrl = await getVaultItemExportUri(item);
                    if (dataUrl) {
                        const a = document.createElement('a');
                        a.href = dataUrl;
                        const distStr = item.distance ? `${item.distance}yds_` : '';
                        const nameStr = (item.author || item.name || item.label || 'card').replace(/[^a-zA-Z0-9_-]/g, '_');
                        a.download = `TRC_INTEL_${nameStr}_${distStr}${item.timestamp || Date.now()}.png`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        exportCount++;
                    }
                } catch(err) {
                    console.error("Export error for item:", item, err);
                }
                await new Promise(r => setTimeout(r, 350));
            }
            
            // Uncheck boxes after export
            checkedBoxes.forEach(cb => cb.checked = false);
            if (window.showToast) window.showToast(`💾 Exported ${exportCount} card(s) to local device!`);
            window.pushTacLog(`EXPORTED ${exportCount} NATIVE IMAGES TO SECURE LOCAL STORAGE`, "SUCCESS");
        });
    }

    const vaultDeleteBtn = document.getElementById('vault-delete-btn');
    if (vaultDeleteBtn) {
        vaultDeleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const checkedBoxes = document.querySelectorAll('.vault-export-checkbox:checked');
            if (checkedBoxes.length === 0) {
                alert('Please select at least one card to delete using the checkboxes [✓].');
                return;
            }
            if (!confirm(`PERMANENTLY DELETE ${checkedBoxes.length} SELECTED CARD(S) FROM INTEL VAULT?`)) return;

            const selectedIds = Array.from(checkedBoxes).map(cb => cb.dataset.vaultId || cb.name || cb.value);
            vaultCache = vaultCache.filter(item => !selectedIds.includes(item.id?.toString()) && !selectedIds.includes(String(item.id)));

            if (window.TRC_IDB) {
                for (const id of selectedIds) {
                    await TRC_IDB.delete('intelVault', id.toString());
                    if (!isNaN(parseInt(id))) await TRC_IDB.delete('intelVault', parseInt(id));
                    await TRC_IDB.delete('workstationLibrary', id.toString());
                    if (!isNaN(parseInt(id))) await TRC_IDB.delete('workstationLibrary', parseInt(id));
                }
            }
            refreshVaultGrid();
            if (window.showToast) window.showToast(`🗑️ ${selectedIds.length} card(s) permanently deleted.`);
            if (window.pushTacLog) window.pushTacLog(`INTEL VAULT: DELETED ${selectedIds.length} CARDS`, 'WARN');
        });
    }
    const vaultToBriefBtn = document.getElementById('vault-to-brief-btn');
    if (vaultToBriefBtn) {
        vaultToBriefBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const checkedBoxes = document.querySelectorAll('.vault-export-checkbox:checked');
            
            if (checkedBoxes.length === 1) {
                const id = checkedBoxes[0].dataset.vaultId;
                if (window.loadBriefingBackToEditorById) {
                    window.loadBriefingBackToEditorById(id);
                }
            } else if (checkedBoxes.length > 1) {
                alert("Please select only ONE Mission Briefing to load into the editor.");
                return;
            } else {
                // If nothing selected, just open the briefing modal
                if(window.openBriefingModal) {
                    window.openBriefingModal();
                } else {
                    const modal = document.getElementById('missionBriefingModal');
                    if (modal) {
                        modal.classList.remove('hidden');
                        modal.classList.add('flex');
                        if(window.updateBriefingList) window.updateBriefingList();
                    }
                }
            }
            
            // Uncheck boxes
            checkedBoxes.forEach(cb => cb.checked = false);
            
            // Close the vault
            const vaultModal = document.getElementById('vault-modal-overlay');
            if (vaultModal) vaultModal.classList.add('hidden');
        });
    }

    const vaultToBoloBtn = document.getElementById('vault-to-bolo-btn');
    if (vaultToBoloBtn) {
        vaultToBoloBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const checkedBoxes = document.querySelectorAll('.vault-export-checkbox:checked');
            
            if (checkedBoxes.length === 1) {
                const id = checkedBoxes[0].dataset.vaultId;
                const item = vaultCache.find(x => x.id.toString() === id);
                if (item && item.type === 'bolo-card' && item.boloData) {
                    if(window.openBoloModal && window.loadBoloBackToEditor) {
                        window.openBoloModal();
                        if (!item.boloData.image) item.boloData.image = item.image;
                        window.loadBoloBackToEditor(item.boloData);
                        const vaultModal = document.getElementById('vault-modal-overlay');
                        if (vaultModal) vaultModal.classList.add('hidden');
                        checkedBoxes.forEach(cb => cb.checked = false);
                    }
                } else if (item && (!item.type || item.type === 'photo')) {
                    if (window.loadPhotoToBolo) {
                        window.loadPhotoToBolo(item.image);
                    }
                } else {
                    alert("The selected snapshot is not a valid BOLO card or photo.");
                    return;
                }
            } else if (checkedBoxes.length > 1) {
                alert("Please select only ONE Most Wanted card or photo to load into the editor.");
                return;
            } else {
                if(window.openBoloModal) {
                    window.openBoloModal();
                }
            }
            
            // Uncheck boxes
            checkedBoxes.forEach(cb => cb.checked = false);
            
            // Auto-close vault if full screen mode is active
            if (typeof window.toggleFullscreen === 'function') {
                const vaultPanel = document.getElementById('panel-vault');
                if (vaultPanel && vaultPanel.classList.contains('is-maximized')) {
                    window.toggleFullscreen('panel-vault');
                }
            }
        });
    }

    const vaultToAmmoBtn = document.getElementById('vault-to-ammo-btn');
    if (vaultToAmmoBtn) {
        vaultToAmmoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const checkedBoxes = document.querySelectorAll('.vault-export-checkbox:checked');
            if (checkedBoxes.length === 0) {
                alert('Please select at least one snapshot to send to Ammo Library.');
                return;
            }

            const selectedIds = Array.from(checkedBoxes).map(cb => cb.dataset.vaultId);
            const itemsToSend = vaultCache.filter(item => selectedIds.includes(item.id.toString()));
            
            let addedCount = 0;
            const ammoProfiles = typeof getAmmoProfiles === 'function' ? getAmmoProfiles() : JSON.parse(localStorage.getItem('rangeCardAmmoProfiles') || '{}');

            let debugInfo = [];
            itemsToSend.forEach(item => {
                if (item.isAmmo && item.originalName) {
                    // Extract ammo data and save
                    const newProfile = {
                        caliber: item.caliber || '',
                        bullet: item.bullet || '',
                        powder: item.powder || '',
                        primer: item.primer || '',
                        col: item.col || '',
                        velocity: item.velocity || '',
                        count: item.count || '0'
                    };
                    ammoProfiles[item.originalName] = newProfile;
                    addedCount++;
                } else {
                    debugInfo.push(`Label: ${item.label}, isAmmo: ${item.isAmmo}, origName: ${item.originalName}`);
                    console.warn(`Snapshot "${item.label}" is not an Ammo Card.`);
                }
            });

            if (addedCount > 0) {
                if(typeof saveAmmoProfiles === 'function') saveAmmoProfiles(ammoProfiles);
                else localStorage.setItem('rangeCardAmmoProfiles', JSON.stringify(ammoProfiles));
                
                if(typeof updateAmmoList === 'function') updateAmmoList();
                
                window.pushTacLog(`TRANSFERRED ${addedCount} CARDS TO AMMO LIBRARY`, "SUCCESS");
                alert(`Successfully sent ${addedCount} Ammo Card(s) to the Ammo Library!`);
            } else {
                alert(`None of the selected items were valid Ammo Cards.\n[DEBUG] ${debugInfo.join(' | ')}`);
            }

            // Uncheck boxes
            checkedBoxes.forEach(cb => cb.checked = false);
        });
    }

    const vaultGeoMatrixBtn = document.getElementById('vault-geomatrix-btn');
    if (vaultGeoMatrixBtn) {
        vaultGeoMatrixBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const checkedBoxes = document.querySelectorAll('.vault-export-checkbox:checked');
            if (checkedBoxes.length === 0) {
                alert('Please select a snapshot to load onto the Geo Matrix map.');
                return;
            }

            const selectedIds = Array.from(checkedBoxes).map(cb => cb.dataset.vaultId);
            const itemsToLoad = vaultCache.filter(item => selectedIds.includes(item.id.toString()));
            
            const routeItems = itemsToLoad.filter(item => item.routeTracker && item.routeTracker.length > 0);
            
            if (routeItems.length > 0) {
                if (window.loadRouteToMap) {
                    window.loadRouteToMap(routeItems[0].routeTracker);
                    
                    // Close the vault automatically
                    const vaultModal = document.getElementById('vault-modal-overlay');
                    if (vaultModal) vaultModal.classList.add('hidden');
                    
                    // Uncheck boxes after loading
                    checkedBoxes.forEach(cb => cb.checked = false);
                }
            } else {
            }
        });
    }

    const vaultToWorkstationBtn = document.getElementById('vault-to-workstation-btn');
    if (vaultToWorkstationBtn) {
        vaultToWorkstationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const checkedBoxes = document.querySelectorAll('.vault-export-checkbox:checked');
            if (checkedBoxes.length === 0) {
                alert('Please select a card to send to Workstation using the checkboxes [✓].');
                return;
            }
            const selectedId = checkedBoxes[0].dataset.vaultId || checkedBoxes[0].name || checkedBoxes[0].value;
            const item = vaultCache.find(v => v && (v.id == selectedId || v.id == selectedId.toString()));
            if (item) {
                const caseData = item.casefileData || (item.workstationData && item.workstationData.data) || item;
                if (window.loadCaseFileBackToEditor) {
                    window.loadCaseFileBackToEditor(caseData);
                } else if (window.loadWorkstationBackToEditorById) {
                    window.loadWorkstationBackToEditorById(selectedId);
                }
            }
            checkedBoxes.forEach(cb => cb.checked = false);
        });
    }


    const vaultToWhiteboardBtn = document.getElementById('vault-to-whiteboard-btn');
    if (vaultToWhiteboardBtn) {
        vaultToWhiteboardBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const checkedBoxes = document.querySelectorAll('.vault-export-checkbox:checked');
            if (checkedBoxes.length === 0) {
                alert('Please select a card to regrade to the Whiteboard using the checkboxes [✓].');
                return;
            }
            const selectedId = checkedBoxes[0].dataset.vaultId || checkedBoxes[0].name || checkedBoxes[0].value;
            const item = vaultCache.find(v => v && (v.id == selectedId || v.id == selectedId.toString()));
            if (item && item.image && window.loadWhiteboardImage) {
                // Send to whiteboard
                const title = (item.label || item.originalName || 'VAULT CARD') + ' - REGRADE';
                window.loadWhiteboardImage(item.image, title);
                // Clean up vault UI
                checkedBoxes.forEach(cb => cb.checked = false);
                const vaultModal = document.getElementById('vault-modal-overlay');
                if (vaultModal) vaultModal.classList.add('hidden');
                
                // Ensure icons are loaded if the modal just appeared
                if (window.lucide) {
                    setTimeout(() => window.lucide.createIcons(), 60);
                }
            } else {
                alert('Could not load image data for the selected card.');
            }
        });
    }

    // --- VAULT TO CACHE LOGIC ---
    const vaultToDopeBtn = document.getElementById('vault-to-dope-btn');
    if (vaultToDopeBtn) {
        vaultToDopeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const checkedBoxes = document.querySelectorAll('.vault-export-checkbox:checked');
            if (checkedBoxes.length === 0) {
                alert('Please select at least one snapshot to send to Dope Cache.');
                return;
            }

            const selectedIds = Array.from(checkedBoxes).map(cb => cb.dataset.vaultId);
            const itemsToSend = vaultCache.filter(item => selectedIds.includes(item.id.toString()));
            const ps = getProfiles();
            
            const currentDopeCount = Object.keys(ps).filter(k => !ps[k].isReconScenario).length;
            if (currentDopeCount + itemsToSend.length > 20) {
                alert(`LIBRARY FULL: DOPE CACHE HAS CAPACITY FOR ${20 - currentDopeCount} MORE CARDS. PLEASE DELETE OLD CARDS FIRST.`);
                return;
            }
            
            let sortedCount = 0;
            itemsToSend.forEach(item => {
                const defaultName = item.originalName || item.label || 'IMPORTED_DOPE_' + Date.now();
                const name = prompt("Enter a name for this DOPE card:", defaultName);
                if (name) {
                    if (item.originalName) {
                        // RESTORE FULL ORIGINAL FORM DATA FROM VAULT METADATA
                        ps[name] = Object.assign({}, item, {
                            snapshot: item.image,
                            timestamp: item.timestamp || Date.now()
                        });
                    } else {
                        // FALLBACK FOR EXTERNAL IMAGES IMPORTED INTO VAULT
                        ps[name] = {
                            snapshot: item.image,
                            isReconScenario: false,
                            timestamp: item.timestamp || Date.now(),
                            caliber: 'IMPORTED IMG',
                            date: new Date().toLocaleDateString()
                        };
                    }
                    sortedCount++;
                }
            });
            
            if (sortedCount > 0) {
                saveProfiles(ps);
                if (window.refreshDopeCacheGrid) window.refreshDopeCacheGrid();
                window.pushTacLog(`SORTED ${sortedCount} IMAGES TO DOPE CACHE`, "SUCCESS");
            }
            
            // Uncheck boxes
            checkedBoxes.forEach(cb => cb.checked = false);
        });
    }

    const vaultToSatBtn = document.getElementById('vault-to-sat-btn');
    if (vaultToSatBtn) {
        vaultToSatBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const checkedBoxes = document.querySelectorAll('.vault-export-checkbox:checked');
            if (checkedBoxes.length === 0) {
                alert('Please select at least one snapshot to send to Sat Archive.');
                return;
            }

            const selectedIds = Array.from(checkedBoxes).map(cb => cb.dataset.vaultId);
            const itemsToSend = vaultCache.filter(item => selectedIds.includes(item.id.toString()));
            const ps = getProfiles();
            
            const reconCount = Object.keys(ps).filter(k => !!ps[k].isReconScenario).length;
            if (reconCount + itemsToSend.length > 20) {
                alert(`LIBRARY FULL: RECON MAP CACHE HAS CAPACITY FOR ${20 - reconCount} MORE MAPS. PLEASE DELETE OLD MAPS FIRST.`);
                return;
            }
            
            let sortedCount = 0;
            itemsToSend.forEach(item => {
                const defaultName = item.originalName || item.label || 'IMPORTED_RECON_' + Date.now();
                const name = prompt("Enter a name for this Recon Map:", defaultName);
                if (name) {
                    if (item.originalName) {
                        ps[name] = Object.assign({}, item, {
                            snapshot: item.image,
                            // Preserve original item.bgImage (clean map) instead of overwriting with the flattened snapshot
                            timestamp: item.timestamp || Date.now()
                        });
                    } else {
                        ps[name] = {
                            snapshot: item.image,
                            bgImage: item.image, // Fallback: use snapshot as background
                            isReconScenario: true,
                            timestamp: item.timestamp || Date.now()
                        };
                    }
                    sortedCount++;
                }
            });
            
            if (sortedCount > 0) {
                if (window.TRC_IDB) {
                    Promise.all(Object.entries(ps).map(([key, val]) => window.TRC_IDB.set('rangeCardProfiles', key, val)))
                    .then(() => {
                        if (window.refreshSatArchiveGrid) window.refreshSatArchiveGrid();
                        if (window.refreshDopeCacheGrid) window.refreshDopeCacheGrid();
                        window.pushTacLog(`SORTED ${sortedCount} IMAGES TO SAT ARCHIVE`, "SUCCESS");
                    }).catch(err => console.error("IDB save failed for Sat Archive", err));
                } else {
                    try {
                        localStorage.setItem('rangeCardProfiles', JSON.stringify(ps));
                    } catch(e) {
                        console.error("LocalStorage full:", e);
                    }
                    if (window.refreshSatArchiveGrid) window.refreshSatArchiveGrid();
                    if (window.refreshDopeCacheGrid) window.refreshDopeCacheGrid();
                    window.pushTacLog(`SORTED ${sortedCount} IMAGES TO SAT ARCHIVE`, "SUCCESS");
                }
            }
            
            // Uncheck boxes
            checkedBoxes.forEach(cb => cb.checked = false);
        });
    }

    const clearAmmoFormBtn = document.getElementById('clearAmmoFormBtn');
    if (clearAmmoFormBtn) {
        clearAmmoFormBtn.onclick = () => {
            const ammoInputs = {
                name: document.getElementById('ammo-name'),
                caliber: document.getElementById('ammo-caliber'),
                bullet: document.getElementById('ammo-bullet'),
                powder: document.getElementById('ammo-powder'),
                primer: document.getElementById('ammo-primer'),
                col: document.getElementById('ammo-col'),
                velocity: document.getElementById('ammo-velocity'),
                bc: document.getElementById('ammo-bc'),
                count: document.getElementById('ammo-count')
            };
            Object.values(ammoInputs).forEach(input => { if(input) input.value = ''; });
        };
    }

    // --- REWORK AMMO BATCH LOGIC ---
    const reworkAmmoBtn = document.getElementById('rework-ammo-btn');
    if (reworkAmmoBtn) {
        reworkAmmoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const checkedBoxes = document.querySelectorAll('.ammo-vault-checkbox:checked');
            if (checkedBoxes.length !== 1) return;

            const name = checkedBoxes[0].dataset.profileName;
            const profiles = typeof getAmmoProfiles === 'function' ? getAmmoProfiles() : JSON.parse(localStorage.getItem('rangeCardAmmoProfiles') || '{}');
            const p = profiles[name];

            if (p) {
                const ammoForm = {
                    name: document.getElementById('ammo-name'),
                    caliber: document.getElementById('ammo-caliber'),
                    bullet: document.getElementById('ammo-bullet'),
                    powder: document.getElementById('ammo-powder'),
                    primer: document.getElementById('ammo-primer'),
                    col: document.getElementById('ammo-col'),
                    velocity: document.getElementById('ammo-velocity'),
                    bc: document.getElementById('ammo-bc'),
                    count: document.getElementById('ammo-count')
                };

                if(ammoForm.name) ammoForm.name.value = name || '';
                if(ammoForm.caliber) ammoForm.caliber.value = p.caliber || '';
                if(ammoForm.bullet) ammoForm.bullet.value = p.bullet || '';
                if(ammoForm.powder) ammoForm.powder.value = p.powder || '';
                if(ammoForm.primer) ammoForm.primer.value = p.primer || '';
                if(ammoForm.col) ammoForm.col.value = p.col || '';
                if(ammoForm.velocity) ammoForm.velocity.value = p.velocity || '';
                if(ammoForm.bc) ammoForm.bc.value = p.bc || '';
                if(ammoForm.count) ammoForm.count.value = p.count || '0';

                // Uncheck and hide buttons
                checkedBoxes[0].checked = false;
                reworkAmmoBtn.classList.add('hidden');
                const vaultBtn = document.getElementById('ammo-to-vault-btn');
                if (vaultBtn) vaultBtn.classList.add('hidden');

                if(ammoForm.name) ammoForm.name.focus();
            }
        });
    }

    // --- AMMO TO VAULT LOGIC ---
    const ammoToVaultBtn = document.getElementById('ammo-to-vault-btn');
    if (ammoToVaultBtn) {
        ammoToVaultBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const checkedBoxes = document.querySelectorAll('.ammo-vault-checkbox:checked');
            if (checkedBoxes.length === 0) return;

            const profiles = typeof getAmmoProfiles === 'function' ? getAmmoProfiles() : JSON.parse(localStorage.getItem('rangeCardAmmoProfiles') || '{}');
            let sentCount = 0;

            const escapeXml = (unsafe) => {
                return (unsafe || '--').toString().replace(/[<>&'"]/g, function (c) {
                    switch (c) {
                        case '<': return '&lt;';
                        case '>': return '&gt;';
                        case '&': return '&amp;';
                        case '\'': return '&apos;';
                        case '"': return '&quot;';
                        default: return c;
                    }
                });
            };

            checkedBoxes.forEach((cb, i) => {
                const name = cb.dataset.profileName;
                const p = profiles[name];
                if (p) {
                    const safeName = escapeXml(name.substring(0, 20));
                    const safeCal = escapeXml(p.caliber);
                    const safeBull = escapeXml(p.bullet);
                    const safePowd = escapeXml(p.powder);
                    const safePrim = escapeXml(p.primer);
                    const safeCol = escapeXml(p.col);
                    const safeVel = escapeXml(p.velocity);
                    const safeBc = escapeXml(p.bc);
                    const safeCount = escapeXml(p.count);

                    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="320" viewBox="0 0 300 320">
                        <rect width="300" height="320" fill="#000000"/>
                        <rect x="10" y="10" width="280" height="300" fill="none" stroke="#10b981" stroke-width="3" rx="10"/>
                        <text x="50%" y="40" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="22" font-weight="bold" fill="#ffffff">${safeName}</text>
                        <line x1="20" y1="60" x2="280" y2="60" stroke="#10b981" stroke-width="2" />
                        <text x="20" y="90" font-family="monospace" font-size="14" fill="#6ee7b7">Caliber: ${safeCal}</text>
                        <text x="20" y="120" font-family="monospace" font-size="14" fill="#a7f3d0">Projectile: ${safeBull}</text>
                        <text x="20" y="150" font-family="monospace" font-size="14" fill="#a7f3d0">Propellant: ${safePowd}</text>
                        <text x="20" y="180" font-family="monospace" font-size="14" fill="#a7f3d0">Ignition: ${safePrim}</text>
                        <text x="20" y="210" font-family="monospace" font-size="14" fill="#a7f3d0">Overall Length: ${safeCol}</text>
                        <text x="20" y="240" font-family="monospace" font-size="14" fill="#34d399">Muzzle Velocity: ${safeVel} FPS</text>
                        <text x="20" y="270" font-family="monospace" font-size="14" fill="#10b981">BC: ${safeBc}</text>
                        <text x="20" y="300" font-family="monospace" font-size="14" fill="#10b981">Box Count: ${safeCount}</text>
                    </svg>`;

                    // Safely encode to data URI avoiding btoa InvalidCharacterError and XML parsing issues
                    const ammoSvgDataUri = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);

                    const profileMetadata = Object.assign({}, p, { originalName: name, isAmmo: true });
                    setTimeout(() => {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            canvas.width = 300;
                            canvas.height = 320;
                            const ctx = canvas.getContext('2d');
                            ctx.fillStyle = '#000000';
                            ctx.fillRect(0, 0, 300, 320);
                            ctx.drawImage(img, 0, 0, 300, 320);
                            const jpegUri = canvas.toDataURL('image/jpeg', 0.9);
                            if (window.saveIntelSnapshot) {
                                window.saveIntelSnapshot('AMMO_CARD', jpegUri, profileMetadata);
                            }
                        };
                        img.src = ammoSvgDataUri;
                    }, i * 50);
                    sentCount++;
                }
            });

            if (sentCount > 0) {
                if (window.pushTacLog) window.pushTacLog(`TRANSFERRED ${sentCount} AMMO FILES TO INTEL VAULT`, "SUCCESS");
            }
            
            checkedBoxes.forEach(cb => cb.checked = false);
            ammoToVaultBtn.classList.add('hidden');
        });
    }

    // --- CACHE TO VAULT LOGIC ---
    const dopeToVaultBtn = document.getElementById('dope-to-vault-btn');
    if (dopeToVaultBtn) {
        dopeToVaultBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const checkedBoxes = document.querySelectorAll('.dope-vault-checkbox:checked');
            if (checkedBoxes.length === 0) return;

            const profiles = window.getProfiles ? window.getProfiles() : {};
            let sentCount = 0;
            let errCount = 0;

            checkedBoxes.forEach(cb => {
                const name = cb.dataset.profileName;
                const p = profiles[name];
                if (p && p.snapshot) {
                    // Clone profile and ensure name is attached so we don't lose the label
                    const profileMetadata = Object.assign({}, p, { originalName: name });
                    saveIntelSnapshot('DOPE_CARD', p.snapshot, profileMetadata);
                    sentCount++;
                } else {
                    errCount++;
                }
                cb.checked = false; // uncheck
            });

            if (errCount > 0) {
                alert(`Warning: ${errCount} DOPE card(s) could not be sent to Vault because they do not have a snapshot image attached.`);
            }
            if (sentCount > 0) {
                window.pushTacLog(`TRANSFERRED ${sentCount} DOPE CARDS TO SECURE VAULT`, "SUCCESS");
            }
            
            // Re-hide button
            dopeToVaultBtn.classList.add('hidden');
        });
    }

    const satToVaultBtn = document.getElementById('sat-to-vault-btn');
    if (satToVaultBtn) {
        satToVaultBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const checkedBoxes = document.querySelectorAll('.sat-vault-checkbox:checked');
            if (checkedBoxes.length === 0) return;

            const profiles = window.getProfiles ? window.getProfiles() : {};
            let sentCount = 0;
            let errCount = 0;

            checkedBoxes.forEach(cb => {
                const name = cb.dataset.profileName;
                const p = profiles[name];
                const mapSrc = p ? (p.snapshot || p.bgImage) : null;
                
                if (mapSrc) {
                    const profileMetadata = Object.assign({}, p, { originalName: name });
                    saveIntelSnapshot('RECON_MAP', mapSrc, profileMetadata);
                    sentCount++;
                } else {
                    errCount++;
                }
                cb.checked = false; // uncheck
            });

            if (errCount > 0) {
                alert(`Warning: ${errCount} Recon Map(s) could not be sent to Vault because they do not have a snapshot or background image.`);
            }
            if (sentCount > 0) {
                window.pushTacLog(`TRANSFERRED ${sentCount} MAPS TO SECURE VAULT`, "SUCCESS");
            }
            
            // Re-hide button
            satToVaultBtn.classList.add('hidden');
        });
    }

    if (vaultImportBtn && vaultImportInput) {
        vaultImportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            vaultImportInput.click();
        });

        vaultImportInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;

            let importCount = 0;
            let processed = 0;

            files.forEach(async (file) => {
                const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const dataUrl = event.target.result;
                    
                    // Parse metadata natively from our custom filename structure
                    let distMatch = file.name.match(/(\d+)yds_/);
                    let tsMatch = file.name.match(/_(\d+)\.(png|jpe?g|pdf)/i);
                    
                    let distance = distMatch ? parseInt(distMatch[1]) : 0;
                    let timestamp = tsMatch ? parseInt(tsMatch[1]) : Date.now();
                    
                    let newItem;
                    if (isPdf) {
                        const cleanName = file.name.replace(/\.pdf$/i, '');
                        let caseData = {
                            case_number: cleanName,
                            invoice_type: 'Executive Case File',
                            billed_to: '',
                            paid_by: '',
                            op_name: '',
                            op_agency: '',
                            op_license: '',
                            op_quals: '',
                            services_performed: '',
                            invoice_notes: '',
                            bounty: '0.00',
                            expenses: '0.00',
                            status: 'UNPAID',
                            is_paid: false
                        };

                        try {
                            const rawBinary = atob((dataUrl.split(',')[1] || ''));
                            
                            // Check for embedded JSON payload
                            const metaMatch = rawBinary.match(/TRC_CASEFILE_DATA_START:\s*([^\s:]+)\s*:TRC_CASEFILE_DATA_END/);
                            if (metaMatch) {
                                try {
                                    const parsed = JSON.parse(decodeURIComponent(metaMatch[1]));
                                    if (parsed && typeof parsed === 'object') {
                                        caseData = { ...caseData, ...parsed };
                                    }
                                } catch(eMeta) {}
                            }

                            // Fallback regex parsing on raw PDF text stream
                            const getMatch = (re) => {
                                const m = rawBinary.match(re);
                                return m ? m[1].trim() : '';
                            };

                            if (!caseData.op_name) caseData.op_name = getMatch(/Operator\s*\/\s*Callsign:\s*([^\n\r\(\)]+)/i);
                            if (!caseData.op_agency) caseData.op_agency = getMatch(/Agency\s*\/\s*Company:\s*([^\n\r\(\)]+)/i);
                            if (!caseData.op_license) caseData.op_license = getMatch(/License\s*\/\s*ID:\s*([^\n\r\(\)]+)/i);
                            if (!caseData.op_quals) caseData.op_quals = getMatch(/Qualifications:\s*([^\n\r\(\)]+)/i);
                            if (!caseData.case_number || caseData.case_number === cleanName) {
                                const cn = getMatch(/Case Number:\s*([^\n\r\(\)]+)/i);
                                if (cn) caseData.case_number = cn;
                            }
                            if (!caseData.billed_to) {
                                const bm = rawBinary.match(/BILLED TO[^\n\r]*[\r\n\s]+([^\r\n\(\)<>]+)/i);
                                if (bm && !bm[1].includes('PAYMENT')) caseData.billed_to = bm[1].trim();
                            }
                            if (!caseData.paid_by) {
                                const pm = rawBinary.match(/PAYMENT DETAILS[^\n\r]*[\r\n\s]+([^\r\n\(\)<>]+)/i);
                                if (pm && !pm[1].includes('LEAD')) caseData.paid_by = pm[1].trim();
                            }
                            if (!caseData.services_performed) {
                                const sm = rawBinary.match(/SERVICES PERFORMED[^\n\r]*[\r\n\s]+([^\r\n\(\)<>]+)/i);
                                if (sm && !sm[1].includes('INVOICE NOTES')) caseData.services_performed = sm[1].trim();
                            }
                            if (!caseData.invoice_notes) {
                                const nm = rawBinary.match(/INVOICE NOTES[^\n\r]*[\r\n\s]+([^\r\n\(\)<>]+)/i);
                                if (nm && !nm[1].includes('CHRONOLOGICAL')) caseData.invoice_notes = nm[1].trim();
                            }

                            if (/PAID IN FULL/i.test(rawBinary) && !/UNPAID/i.test(rawBinary)) {
                                caseData.status = 'PAID';
                                caseData.is_paid = true;
                            }
                        } catch(eParse) {}

                        // Generate composite hard copy card snapshot
                        let compositeThumb = '';
                        if (typeof window.generateWorkstationCompositeCard === 'function') {
                            try {
                                compositeThumb = await window.generateWorkstationCompositeCard('casefile', `INVOICE / CASE: ${caseData.case_number || cleanName}`, caseData, caseData.mainAttachedImage || '');
                            } catch(eComp) {}
                        }
                        if (!compositeThumb && window.generatePdfThumbnailSvg) {
                            compositeThumb = window.generatePdfThumbnailSvg(cleanName);
                        }

                        newItem = {
                            id: 'import_pdf_' + Math.random().toString(36).substr(2, 9),
                            timestamp: timestamp,
                            label: `INVOICE / CASE: ${caseData.case_number || cleanName}`,
                            image: compositeThumb,
                            pdfData: dataUrl,
                            fileName: file.name,
                            type: 'casefile-pdf',
                            distance: distance,
                            casefileData: caseData
                        };
                    } else {
                        newItem = {
                            id: 'import_' + Math.random().toString(36).substr(2, 9),
                            timestamp: timestamp,
                            label: `IMPORTED IMG ${distance ? '@ ' + distance + ' YDS' : ''}`,
                            image: dataUrl,
                            distance: distance,
                            type: 'image'
                        };
                    }

                    vaultCache.unshift(newItem);
                    importCount++;
                    processed++;

                    // Once all files are processed
                    if (processed === files.length) {
                        // Re-sort so newest is first
                        vaultCache.sort((a, b) => b.timestamp - a.timestamp);
                        
                        // Enforce cache limit
                        if(vaultCache.length > 50) {
                            vaultCache = vaultCache.slice(0, 50);
                            window.pushTacLog("VAULT CAPACITY (50) REACHED: OLDEST ITEMS OVERWRITTEN", "WARNING");
                        }
                        
                        if(window.TRC_IDB) {
                            vaultCache.forEach(item => {
                                TRC_IDB.set('intelVault', item.id.toString(), item);
                            });
                        }
                        refreshVaultGrid();
                        window.pushTacLog(`IMPORTED ${importCount} FILES INTO VAULT CACHE`, "SUCCESS");
                        if(window.showToast) window.showToast(`✅ Imported ${importCount} file(s) into Intel Vault`);
                        
                        // Reset input
                        vaultImportInput.value = '';
                    }
                };
                reader.readAsDataURL(file); // Read as data URI
            });
        });
    }

    // ========================================================================
    // TACTICAL COMMS LINK: SUPABASE INTEGRATION
    // ========================================================================
    let commsChannel = null;
    let commsUser = null;
    let commsMapInstance = null;
    let teamMarkers = {};
    let geoWatchId = null;

    
      const rallyBtn = document.getElementById('geo-rally-btn');
      if (rallyBtn) {
          rallyBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              if (window.commsChannel && window.commsUser) {
                  if (!window.myLatestCoords) { alert('Acquiring GPS lock... Please wait.'); return; } window.commsChannel.send({
                      type: 'broadcast',
                      event: 'rally',
                      payload: { user: window.commsUser, coords: window.myLatestCoords || null, timestamp: new Date().toISOString() }
                  });
                  // Visualization removed from orbitalMap per user request
                  window.pushTacLog("RALLY coordinates transmitted!", "SUCCESS");
              } else {
                  alert("Comms offline. Connect first.");
              }
          });
      }

      const sosBtn = document.getElementById('geo-sos-btn');
      if (sosBtn) {
          sosBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              if (window.commsChannel && window.commsUser) {
                  if (!window.myLatestCoords) { alert('Acquiring GPS lock... Please wait.'); return; } window.commsChannel.send({
                      type: 'broadcast',
                      event: 'sos',
                      payload: { user: window.commsUser, coords: window.myLatestCoords || null, timestamp: new Date().toISOString() }
                  });
                  // Visualization removed from orbitalMap per user request
                  window.pushTacLog("S.O.S. distress signal broadcasted!", "ALERT");
              } else {
                  alert("Comms offline. Connect first.");
              }
          });
      }

      const clearTracksBtn = document.getElementById('geo-clear-tracks-btn');
        if (clearTracksBtn) {
            clearTracksBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.orbitalMap) {
                    // Clear loaded route variables
                    if (loadedRoutePolyline) { window.orbitalMap.removeLayer(loadedRoutePolyline); loadedRoutePolyline = null; }
                    if (loadedStartMarker) { window.orbitalMap.removeLayer(loadedStartMarker); loadedStartMarker = null; }
                    if (loadedEndMarker) { window.orbitalMap.removeLayer(loadedEndMarker); loadedEndMarker = null; }
                    
                    // CLEAR LIVE TRACKS (Using the CORRECT local scope variables)
                    if (geoTrackPolyline) { 
                        window.orbitalMap.removeLayer(geoTrackPolyline); 
                        geoTrackPolyline = null;
                    }
                    if (geoTrackLiveDot) {
                        window.orbitalMap.removeLayer(geoTrackLiveDot);
                        geoTrackLiveDot = null;
                    }
                    // This is the bug fix: zero out the local array, not a window property
                    geoTrackData = []; 
  
                    // Clear event markers (RALLY, SOS)
                    if (window.eventMarkers && window.eventMarkers.length > 0) {
                        window.eventMarkers.forEach(m => window.orbitalMap.removeLayer(m));
                        window.eventMarkers = [];
                    }
                    // Clear event lines (RALLY lines)
                    if (window.eventLines && window.eventLines.length > 0) {
                        window.eventLines.forEach(l => window.orbitalMap.removeLayer(l));
                        window.eventLines = [];
                    }
                }
            });
      }

    const connectBtn = document.getElementById('comms-connect-btn');
    
    // Auto-fill from localStorage if available
    if (document.getElementById('comms-team') && localStorage.getItem('trc_comms_team')) {
        document.getElementById('comms-team').value = localStorage.getItem('trc_comms_team');
    }
    if (document.getElementById('comms-callsign') && localStorage.getItem('trc_comms_callsign')) {
        document.getElementById('comms-callsign').value = localStorage.getItem('trc_comms_callsign');
    }
    if (document.getElementById('comms-role') && localStorage.getItem('trc_comms_role')) {
        document.getElementById('comms-role').value = localStorage.getItem('trc_comms_role');
    }
    if (document.getElementById('comms-passcode') && localStorage.getItem('trc_comms_passcode')) {
        document.getElementById('comms-passcode').value = localStorage.getItem('trc_comms_passcode');
    }

    if (connectBtn) {
        connectBtn.addEventListener('click', async () => {
            const team = document.getElementById('comms-team').value.trim().toUpperCase();
            const callsign = document.getElementById('comms-callsign').value.trim().toUpperCase();
            const role = document.getElementById('comms-role').value.trim().toUpperCase();
            const rawPasscode = document.getElementById('comms-passcode').value.trim();
            const passcode = rawPasscode.replace(/[\u200B-\u200D\uFEFF]/g, '').toUpperCase();

            // Save to local storage to prevent losing place on reload
            localStorage.setItem('trc_comms_team', team);
            localStorage.setItem('trc_comms_callsign', callsign);
            localStorage.setItem('trc_comms_role', role);
            localStorage.setItem('trc_comms_passcode', passcode);
            
            const encSecret = document.getElementById('comms-encryption-secret') ? document.getElementById('comms-encryption-secret').value.trim().toUpperCase() : '';
            if (encSecret) {
                localStorage.setItem('trc_team_secret', encSecret);
            } else {
                localStorage.setItem('trc_team_secret', passcode);
            }

            window.pushTacLog(`AUTH ATTEMPT: ${callsign} @ ${team}`, "SYS");

            if (!team || !callsign || !role || !passcode) {
                alert("IDENTITY VERIFICATION FAILED: ALL FIELDS REQUIRED, INCLUDING MISSION CODE.");
                return;
            }

            // === MISSION CODE COMPLEXITY ENFORCEMENT ===
            const letterCount   = (passcode.match(/[A-Z]/g) || []).length;
            const digitCount    = (passcode.match(/[0-9]/g) || []).length;
            const specialCount  = (passcode.match(/[^A-Z0-9]/g) || []).length;

            if (passcode.length < 10) {
                alert("MISSION CODE REJECTED: Minimum 10 characters required.");
                return;
            }
            if (letterCount < 5) {
                alert(`MISSION CODE REJECTED: Requires at least 5 letters. Detected: ${letterCount}`);
                return;
            }
            if (digitCount < 2) {
                alert(`MISSION CODE REJECTED: Requires at least 2 numbers. Detected: ${digitCount}`);
                return;
            }
            if (specialCount < 3) {
                alert(`MISSION CODE REJECTED: Requires at least 3 special characters (e.g. !@#$%). Detected: ${specialCount}`);
                return;
            }
            // ==========================================

            // Force a deterministic ID based on Team + Callsign + Random Device ID so Supabase doesn't kick duplicate callsigns off
            let devicePin = localStorage.getItem('trc_device_pin');
            if (!devicePin) {
                devicePin = String(Math.floor(Math.random() * 9000) + 1000);
                localStorage.setItem('trc_device_pin', devicePin);
            }
            const deterministicId = 'u_' + (team + callsign).replace(/[^a-zA-Z0-9]/g, '').toUpperCase() + '_' + devicePin;
            commsUser = { id: deterministicId, callsign, role, team };

            // === UNLOCK AUDIO CONTEXT ON USER CLICK ===
            const rxAudio = document.getElementById('comms-rx-audio');
            if (rxAudio) {
                rxAudio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
                rxAudio.play().catch(() => {});
            }

            // Warm up microphone hardware directly within user gesture
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                window.pushTacLog('⚠️ MIC UNAVAILABLE: Requires HTTPS or localhost. PTT text-only mode.', 'ALERT');
                if (pttBtn) pttBtn.style.opacity = '0.4';
            } else {
                if (!window.activeMicStream) {
                    try {
                        window.activeMicStream = await navigator.mediaDevices.getUserMedia({ 
                            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
                        });
                    } catch (e1) {
                        try {
                            window.activeMicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        } catch (e2) {
                            window.activeMicStream = null;
                        }
                    }
                    if (window.activeMicStream && window.activeMicStream.getAudioTracks().length > 0) {
                        window.activeMicStream.getAudioTracks()[0].enabled = false;
                        window.pushTacLog("MICROPHONE READY (PTT ARMED)", "SUCCESS");
                    }
                }
            }

            const originalBtnHtml = connectBtn.innerHTML;
            connectBtn.innerHTML = "ESTABLISHING...";
            connectBtn.disabled = true;
            connectBtn.classList.add('opacity-50', 'cursor-not-allowed');

            // Failsafe reset if Supabase hangs
            const failsafe = setTimeout(() => {
                connectBtn.innerHTML = originalBtnHtml;
                connectBtn.disabled = false;
                connectBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }, 6000);

            // Establish comms link immediately
            initSupabaseComms(team, passcode, () => {
                clearTimeout(failsafe);
                connectBtn.innerHTML = originalBtnHtml;
                connectBtn.disabled = false;
                connectBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            });
        });
    }

    async function initSupabaseComms(teamName, passcode, onConnectedCallback) {
        // Show dashboard immediately for UI verification
        document.getElementById('comms-login').classList.add('hidden');
        document.getElementById('comms-dashboard').classList.remove('hidden');
        document.getElementById('comms-dashboard').classList.add('grid');
        document.getElementById('comms-sos-bar').classList.remove('hidden');
        
        // Trigger Lucide icon creation for the new dashboard elements
        if (window.lucide) window.lucide.createIcons();
        
        // Initialize Map
        initCommsMap();

        // Lazy-load Supabase on first connect (saves 198 KB on initial page load)
        if (!window.supabase || !window.supabase.createClient) {
            window.pushTacLog("LOADING COMMS DRIVER...", "SYS");
            try {
                await window.ensureSupabase();
                window.pushTacLog("COMMS DRIVER LOADED.", "SUCCESS");
            } catch(e) {
                window.pushTacLog("SUPABASE DRIVER FAILED TO LOAD. RUNNING IN LOCAL DEMO MODE.", "ALERT");
                if (onConnectedCallback) onConnectedCallback();
                return;
            }
        }

        // Mission-Specific Channel Hashing
        const normPass = (passcode || '').trim().replace(/[\u200B-\u200D\uFEFF]/g, '').toUpperCase();
        const normTeam = (teamName || '').trim().toUpperCase();
        let freqHash = 0;
        const seed = `TRC_${normTeam}_${normPass}`;
        for (let i = 0; i < seed.length; i++) {
            freqHash = ((freqHash << 5) - freqHash) + seed.charCodeAt(i);
            freqHash |= 0;
        }
        const freqHex = Math.abs(freqHash).toString(16).padStart(8, '0').toUpperCase();
        const missionId = `trc_freq_${normTeam.toLowerCase()}_${freqHex.toLowerCase()}`;
        window.currentMissionId = missionId;
        window.currentTeamName = normTeam;
        window.currentPasscode = normPass;
        window.currentFreqHex = freqHex;

        const supabaseUrl = window.SUPABASE_URL || 'https://nvnwqcfgpwzheekninle.supabase.co';
        const supabaseKey = window.SUPABASE_KEY || 'sb_publishable_si9fg-bURw3K5yprgAgifw_Eez79zU0';
        
        const diagSub = document.getElementById('diag-sub');
        const diagCrypto = document.getElementById('diag-crypto');
        const diagRx = document.getElementById('diag-rx');
        const diagTx = document.getElementById('diag-tx');
        window.diagRxCount = 0;
        window.diagTxCount = 0;
        
        if (diagCrypto) {
            diagCrypto.textContent = 'ENC: ' + (localStorage.getItem('trc_team_secret') ? 'CUSTOM' : 'DEFAULT');
        }

        if (supabaseUrl.includes('your-project-url')) {
            window.pushTacLog("SUPABASE KEYS NOT CONFIGURED. LOCAL SYNC ONLY.", "SYS");
            if (onConnectedCallback) onConnectedCallback();
            return;
        }

        try {
            // Use existing client or create new
            if (!window.supabaseClient) {
                window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
            }

            // Purge zombie channels before establishing a new link
            if (commsChannel) {
                window.supabaseClient.removeChannel(commsChannel);
                commsChannel = null;
            }

        commsChannel = window.supabaseClient.channel(missionId, {
            config: { presence: { key: commsUser.id } }
        });
        window.commsChannel = commsChannel;
        window.commsUser = commsUser;

          // 1.5 Handle RALLY and SOS
          commsChannel.on('broadcast', { event: 'rally' }, (payload) => {
              try {
                  const data = payload.payload;
                  if (data && data.coords) {
                      window.pushTacLog("RALLY POINT RECEIVED: " + data.user.callsign, "ALERT");
                      if (window.registerSquadMember && data.user) window.registerSquadMember(data.user, data.coords);
                      const rallyIcon = L.divIcon({ html: '<div style="background:#0ea5e9; border:2px solid white; width:20px; height:20px; border-radius:50%; box-shadow:0 0 15px #0ea5e9; animation: pulse 1s infinite;"></div>', className: '', iconSize:[20,20] });
                      window.eventMarkers = window.eventMarkers || [];
                      
                      if (data.coords.lat && typeof commsMapInstance !== 'undefined' && commsMapInstance) {
                          const m2 = L.marker([data.coords.lat, data.coords.lng], {icon: rallyIcon}).addTo(commsMapInstance).bindPopup('RALLY: ' + data.user.callsign).openPopup();
                          window.eventMarkers.push(m2);
                          
                          if (window.myLatestCoords && window.myLatestCoords.lat) {
                              const line2 = L.polyline([[window.myLatestCoords.lat, window.myLatestCoords.lng], [data.coords.lat, data.coords.lng]], { color: '#0ea5e9', weight: 3, dashArray: '5, 10' }).addTo(commsMapInstance);
                              window.eventLines = window.eventLines || [];
                              window.eventLines.push(line2);
                          }
                      }
                      if (window.playChatAlert) window.playChatAlert();
                  }
              } catch (e) { console.error("RALLY RX ERROR", e); }
          });

          commsChannel.on('broadcast', { event: 'sos' }, (payload) => {
              window.pushTacLog("SOS SIGNAL RECEIVED OVER COMMS CHANNEL!", "SYS");
              try {
                  if (payload.payload && payload.payload.msgId) {
                      if (window.receivedMsgIds.has(payload.payload.msgId)) return;
                      window.receivedMsgIds.add(payload.payload.msgId);
                  }
                  const data = payload.payload;
                  if (data) {
                      window.pushTacLog("S.O.S. RECEIVED FROM " + data.user.callsign + "!", "ALERT");
                      if (window.registerSquadMember && data.user) window.registerSquadMember(data.user, data.coords || null, '', true);
                      
                      // ── RECEIVED SOS BAR INDICATOR ──────────────────────────────────
                      if (window.showReceivedSosBar) window.showReceivedSosBar(data.user.callsign, data.user.id);

                      // Red map marker removed — banner-only SOS indicator
                      if (window.playChatAlert) {
                          window.playChatAlert();
                          setTimeout(window.playChatAlert, 500);
                          setTimeout(window.playChatAlert, 1000);
                      }
                  }
              } catch (e) { console.error("SOS RX ERROR", e); }
          });

          commsChannel.on('broadcast', { event: 'cancel_sos' }, (payload) => {
            if (payload.payload && payload.payload.msgId) {
                if (window.receivedMsgIds.has(payload.payload.msgId)) return;
                window.receivedMsgIds.add(payload.payload.msgId);
            }
            const data = payload.payload;
            // Remove map marker
            if (window.eventMarkers) {
                window.eventMarkers = window.eventMarkers.filter(marker => {
                    const popup = marker.getPopup();
                    if (popup && popup.getContent() === 'S.O.S.: ' + data.user.callsign) {
                        try { marker.remove(); } catch(e){}
                        if (typeof commsMapInstance !== 'undefined' && commsMapInstance && commsMapInstance.hasLayer(marker)) commsMapInstance.removeLayer(marker);
                        return false;
                    }
                    return true;
                });
            }
            // ── CLEAR RECEIVED SOS BAR ──────────────────────────────────────
            if (window.clearReceivedSosBar) window.clearReceivedSosBar(data.user.id, data.user.callsign);
            window.pushTacLog("S.O.S. CANCELLED BY " + data.user.callsign, "SYS");
        });

        // 1.4 Handle CHAT
        commsChannel.on('broadcast', { event: 'chat' }, (payload) => {
            window.pushTacLog("CHAT SIGNAL RECEIVED. ATTEMPTING DECRYPTION...", "SYS");
            try {
                if (payload.payload && payload.payload.msgId) {
                    if (window.receivedMsgIds.has(payload.payload.msgId)) return;
                    window.receivedMsgIds.add(payload.payload.msgId);
                }
                const dec = TacticalCrypto.decrypt(payload.payload.data);
                if (dec) {
                    window.pushTacLog(`CHAT DECRYPTED SUCCESSFULLY FROM ${dec.user.callsign}`, "SUCCESS");
                    if (window.registerSquadMember && dec.user) {
                        window.registerSquadMember(dec.user);
                    }
                    // Auto-negotiate WebRTC if not connected yet
                    if (dec.user && dec.user.id !== commsUser.id && !window.peerConnections[dec.user.id] && commsUser.id > dec.user.id) {
                        createPeerConnection(dec.user.id, true);
                    }
                    renderChatMessage(dec.user, dec.message, dec.user.id === commsUser.id, dec.image, dec.tapeUrl || null, dec.metadata || null);
                    if (dec.user.id !== commsUser.id) {
                        if (window.playChatAlert) window.playChatAlert();
                    }
                } else {
                    window.pushTacLog(`CHAT DECRYPTION FAILED! CHECK PASSCODE!`, "ERROR");
                }
            } catch (err) {
                console.error("CHAT RX ERROR:", err);
                window.pushTacLog(`CHAT RX FATAL ERROR: ` + err.message, "ERROR");
            }
        });

        window.peerConnections = window.peerConnections || {};
        window.dataChannels = window.dataChannels || {};
        window.receivedMsgIds = window.receivedMsgIds || new Set();

        // --- 3-COLOR SOS DISTRESS FLASH SYSTEM ---
        window.triggerSosFlashSequence = window.triggerSosFlashSequence || function() {
            const sosBarEl = document.getElementById('comms-sos-bar');
            if (sosBarEl && sosBarEl.dataset.receivedSosCallsigns) {
                const callsigns = sosBarEl.dataset.receivedSosCallsigns.split(',').filter(Boolean);
                if (callsigns.length > 0) {
                    const overlay = document.getElementById('sos-flash-overlay');
                    const toast = document.getElementById('sos-notification-toast');
                    const toastText = document.getElementById('sos-toast-text');
                    
                    if (toast && toastText) {
                        toastText.innerText = `⚠ DISTRESS SIGNAL: ${callsigns.join(' & ')} ⚠`;
                        toast.classList.remove('hidden');
                        toast.style.display = 'flex';
                    }
                    
                    if (overlay) {
                        overlay.classList.remove('hidden');
                        let step = 0;
                        const colors = ['rgba(239, 68, 68, 0.4)', 'rgba(249, 115, 22, 0.4)', 'rgba(234, 179, 8, 0.4)', 'transparent'];
                        const flashStep = () => {
                            if (step < colors.length) {
                                overlay.style.backgroundColor = colors[step];
                                step++;
                                setTimeout(flashStep, 400);
                            } else {
                                overlay.classList.add('hidden');
                                // The toast remains visible until SOS is explicitly canceled.
                            }
                        };
                        flashStep();
                    }
                }
            }
        };

        if (!window.sosFlashInterval) {
            window.sosFlashInterval = setInterval(window.triggerSosFlashSequence, 30000);
        }

        window.showReceivedSosBar = window.showReceivedSosBar || function(callsign, userId) {
            const sosBarEl = document.getElementById('comms-sos-bar');
            if (!sosBarEl) return;
            if (!sosBarEl.dataset.receivedSosUsers) sosBarEl.dataset.receivedSosUsers = '';
            const senders = sosBarEl.dataset.receivedSosUsers ? sosBarEl.dataset.receivedSosUsers.split(',') : [];
            if (!senders.includes(userId)) senders.push(userId);
            sosBarEl.dataset.receivedSosUsers = senders.join(',');
            sosBarEl.classList.add('bg-red-950', 'border-red-600', 'animate-pulse');
            sosBarEl.classList.remove('bg-gray-950', 'border-gray-800');
            let lbl = document.getElementById('received-sos-label');
            if (!lbl) {
                lbl = document.createElement('div');
                lbl.id = 'received-sos-label';
                lbl.className = 'w-full text-center text-red-300 font-black text-sm uppercase tracking-widest py-1 flex items-center justify-center gap-2';
                sosBarEl.insertBefore(lbl, sosBarEl.firstChild);
            }
            const allNames = (sosBarEl.dataset.receivedSosCallsigns || '').split(',').filter(Boolean);
            if (!allNames.includes(callsign)) allNames.push(callsign);
            sosBarEl.dataset.receivedSosCallsigns = allNames.join(',');
            lbl.innerHTML = `⚠ DISTRESS SIGNAL: ${allNames.join(' & ')} ⚠`;
            if (window.triggerSosFlashSequence) window.triggerSosFlashSequence();
        };

        window.clearReceivedSosBar = window.clearReceivedSosBar || function(userId, callsign) {
            const sosBarEl = document.getElementById('comms-sos-bar');
            if (!sosBarEl) return;
            let senders = sosBarEl.dataset.receivedSosUsers ? sosBarEl.dataset.receivedSosUsers.split(',').filter(Boolean) : [];
            let names   = sosBarEl.dataset.receivedSosCallsigns ? sosBarEl.dataset.receivedSosCallsigns.split(',').filter(Boolean) : [];
            senders = senders.filter(id => id !== userId);
            names   = names.filter(n => n !== callsign);
            sosBarEl.dataset.receivedSosUsers     = senders.join(',');
            sosBarEl.dataset.receivedSosCallsigns = names.join(',');
            if (senders.length === 0) {
                sosBarEl.classList.remove('bg-red-950', 'border-red-600', 'animate-pulse');
                sosBarEl.classList.add('bg-gray-950', 'border-gray-800');
                const lbl = document.getElementById('received-sos-label');
                if (lbl) lbl.remove();
                
                const overlay = document.getElementById('sos-flash-overlay');
                const toast = document.getElementById('sos-notification-toast');
                if (overlay) overlay.classList.add('hidden');
                if (toast) toast.classList.add('hidden');
            } else {
                const lbl = document.getElementById('received-sos-label');
                if (lbl) lbl.innerHTML = `⚠ DISTRESS SIGNAL: ${names.join(' & ')} ⚠`;
            }
        };
        
        function setupDataChannel(peerId, dc) {
            window.dataChannels[peerId] = dc;
            dc.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    
                    if (payload.msgId) {
                        if (window.receivedMsgIds.has(payload.msgId)) return;
                        window.receivedMsgIds.add(payload.msgId);
                    }

                    if (payload.event === 'chat') {
                        const dec = TacticalCrypto.decrypt(payload.data);
                        if (dec) {
                            window.pushTacLog(`P2P CHAT RECEIVED FROM ${dec.user.callsign}`, "SUCCESS");
                            renderChatMessage(dec.user, dec.message, false, dec.image, dec.tapeUrl || null, dec.metadata || null);
                            if (window.playChatAlert) window.playChatAlert();
                        }
                    } else if (payload.event === 'sos') {
                        window.pushTacLog(`P2P SOS RECEIVED!`, "ALERT");
                        // Same received-SOS bar indicator as Supabase path
                        if (payload.data && payload.data.user && window.showReceivedSosBar) {
                            window.showReceivedSosBar(payload.data.user.callsign, payload.data.user.id);
                        }
                        // Red map marker removed — banner-only SOS indicator
                        if (window.playChatAlert) {
                            window.playChatAlert();
                            setTimeout(window.playChatAlert, 500);
                            setTimeout(window.playChatAlert, 1000);
                        }
                    } else if (payload.event === 'cancel_sos') {
                        window.pushTacLog(`P2P SOS CANCEL RECEIVED!`, "SYS");
                        if (window.eventMarkers) {
                            window.eventMarkers = window.eventMarkers.filter(marker => {
                                const popup = marker.getPopup();
                                if (popup && popup.getContent() === 'S.O.S.: ' + payload.data.user.callsign) {
                                    try { marker.remove(); } catch(e){}
                                    if (typeof commsMapInstance !== 'undefined' && commsMapInstance && commsMapInstance.hasLayer(marker)) commsMapInstance.removeLayer(marker);
                                    return false;
                                }
                                return true;
                            });
                        }
                        // Same bar clear as Supabase path
                        if (payload.data && payload.data.user && window.clearReceivedSosBar) {
                            window.clearReceivedSosBar(payload.data.user.id, payload.data.user.callsign);
                        }
                    }
                } catch (e) { console.error("DataChannel RX Error", e); }
            };
        }
        
        window.pendingIceQueues = window.pendingIceQueues || {};

        window.attachMicToPeers = function(stream) {
            if (!stream) return;
            const track = stream.getAudioTracks()[0];
            if (!track) return;
            Object.values(window.peerConnections || {}).forEach(pc => {
                if (!pc || pc === 'FAILED') return;
                try {
                    const senders = pc.getSenders ? pc.getSenders() : [];
                    const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
                    if (audioSender) {
                        audioSender.replaceTrack(track);
                    } else {
                        const emptySender = senders.find(s => !s.track);
                        if (emptySender) {
                            emptySender.replaceTrack(track);
                        } else if (pc.addTrack) {
                            pc.addTrack(track, stream);
                        }
                    }
                } catch(e) {
                    console.warn("attachMicToPeers error:", e);
                }
            });
        };
        
        async function createPeerConnection(peerId, isInitiator) {
            const pc = new RTCPeerConnection({ 
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ],
                iceCandidatePoolSize: 10
            });
            window.peerConnections[peerId] = pc;

            // Establish audio channel with the actual hardware microphone (muted by default)
            if (window.activeMicStream && window.activeMicStream.getAudioTracks().length > 0) {
                window.activeMicStream.getTracks().forEach(track => {
                    pc.addTrack(track, window.activeMicStream);
                });
            } else {
                try { pc.addTransceiver('audio', { direction: 'sendrecv' }); } catch(e){}
            }

            // Batch ICE candidates
            if (!window.webrtcIceQueues) window.webrtcIceQueues = {};
            window.webrtcIceQueues[peerId] = window.webrtcIceQueues[peerId] || [];
            
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    window.webrtcIceQueues[peerId].push(event.candidate);
                    if (!window.webrtcIceTimeouts) window.webrtcIceTimeouts = {};
                    if (!window.webrtcIceTimeouts[peerId]) {
                        window.webrtcIceTimeouts[peerId] = setTimeout(() => {
                            const candidatesToSend = window.webrtcIceQueues[peerId];
                            window.webrtcIceQueues[peerId] = [];
                            window.webrtcIceTimeouts[peerId] = null;
                            if (candidatesToSend.length > 0 && commsChannel) {
                                commsChannel.send({
                                    type: 'broadcast', event: 'webrtc-ice-batch',
                                    payload: { target: peerId, sender: commsUser.id, candidates: candidatesToSend }
                                }).catch(() => {});
                            }
                        }, 250);
                    }
                }
            };

            pc.ontrack = (event) => {
                let audioEl = document.getElementById('webrtc-audio-' + peerId);
                if (!audioEl) {
                    audioEl = document.createElement('audio');
                    audioEl.id = 'webrtc-audio-' + peerId;
                    audioEl.autoplay = true;
                    audioEl.playsInline = true;
                    document.body.appendChild(audioEl);
                }
                
                const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
                audioEl.srcObject = stream;
                audioEl.volume = 1.0;
                audioEl.muted = false;
                audioEl.play().catch(() => {});
                window.pushTacLog(`AUDIO LINK SECURED: ${peerId}`, "SUCCESS");
            };

            pc.oniceconnectionstatechange = () => {
                const state = pc.iceConnectionState;
                window.pushTacLog(`WEBRTC LINK: ${state.toUpperCase()}`, "SYS");
                if (state === 'disconnected' || state === 'failed') {
                    const audioEl = document.getElementById('webrtc-audio-' + peerId);
                    if (audioEl) audioEl.remove();
                    delete window.peerConnections[peerId];
                    if (window.dataChannels[peerId]) delete window.dataChannels[peerId];
                }
            };

            if (isInitiator) {
                const dc = pc.createDataChannel('tactical-data');
                setupDataChannel(peerId, dc);
                
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                if (commsChannel) {
                    commsChannel.send({
                        type: 'broadcast', event: 'webrtc-offer',
                        payload: { target: peerId, sender: commsUser.id, offer: offer }
                    }).catch(() => {});
                }
            } else {
                pc.ondatachannel = (event) => {
                    setupDataChannel(peerId, event.channel);
                };
            }
            return pc;
        }

        commsChannel.on('broadcast', { event: 'webrtc-offer' }, async (payload) => {
            try {
                if (payload.payload.target !== commsUser.id) return;
                const { sender, offer } = payload.payload;
                let pc = window.peerConnections[sender];
                if (!pc || pc === 'FAILED' || pc.signalingState === 'closed') {
                    pc = await createPeerConnection(sender, false);
                }
                if (pc && pc !== 'FAILED') {
                    await pc.setRemoteDescription(new RTCSessionDescription(offer));
                    if (window.pendingIceQueues && window.pendingIceQueues[sender]) {
                        for (let c of window.pendingIceQueues[sender]) {
                            try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {}
                        }
                        delete window.pendingIceQueues[sender];
                    }
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    commsChannel.send({
                        type: 'broadcast', event: 'webrtc-answer',
                        payload: { target: sender, sender: commsUser.id, answer: answer }
                    }).catch(() => {});
                }
            } catch (err) { console.error("WebRTC Offer Error:", err); }
        });

        commsChannel.on('broadcast', { event: 'webrtc-answer' }, async (payload) => {
            try {
                if (payload.payload.target !== commsUser.id) return;
                const { sender, answer } = payload.payload;
                const pc = window.peerConnections[sender];
                if (pc && pc !== 'FAILED') {
                    await pc.setRemoteDescription(new RTCSessionDescription(answer));
                    if (window.pendingIceQueues && window.pendingIceQueues[sender]) {
                        for (let c of window.pendingIceQueues[sender]) {
                            try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {}
                        }
                        delete window.pendingIceQueues[sender];
                    }
                }
            } catch (err) { console.error("WebRTC Answer Error:", err); }
        });

        commsChannel.on('broadcast', { event: 'webrtc-ice-batch' }, async (payload) => {
            try {
                if (payload.payload.target !== commsUser.id) return;
                const { sender, candidates } = payload.payload;
                const pc = window.peerConnections[sender];
                if (!pc || pc === 'FAILED') return;
                
                if (!pc.remoteDescription || !pc.remoteDescription.type) {
                    window.pendingIceQueues[sender] = window.pendingIceQueues[sender] || [];
                    window.pendingIceQueues[sender].push(...candidates);
                } else {
                    for (let c of candidates) {
                        try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {}
                    }
                }
            } catch (err) { console.error("WebRTC ICE Batch Error:", err); }
        });

        // 2. Handle Radio (PTT)
        commsChannel.on('broadcast', { event: 'ptt' }, (payload) => {
            try {
                window.diagRxCount++;
                if (diagRx) diagRx.textContent = `RX: ${window.diagRxCount}`;
                const dec = TacticalCrypto.decrypt(payload.payload.data);
                if (dec && dec.user) {
                    if (window.registerSquadMember) window.registerSquadMember(dec.user);
                    if (dec.user.id !== commsUser.id && !window.peerConnections[dec.user.id] && commsUser.id > dec.user.id) {
                        createPeerConnection(dec.user.id, true);
                    }
                }
                const activeSpeaker = document.getElementById('ptt-active-speaker');
                if (dec && activeSpeaker && dec.user.id !== commsUser.id) {
                    if (dec.active) {
                        activeSpeaker.textContent = `RX: ${dec.user.callsign} (${dec.user.role})`;
                        activeSpeaker.classList.add('text-emerald-400', 'animate-pulse');
                        window.pushTacLog(`RECEIVING FROM: ${dec.user.callsign}`, "SUCCESS");
                    } else {
                        activeSpeaker.textContent = 'STANDBY';
                        activeSpeaker.classList.remove('text-emerald-400', 'animate-pulse');
                    }
                } else if (!dec) {
                    window.pushTacLog(`DECRYPTION FAILED FOR PTT!`, "ERROR");
                }
            } catch (err) { window.pushTacLog(`PTT HANDLER ERROR`, "ERROR"); }
        });

        // 2.5 DUAL-LAYER DISCOVERY HANDSHAKE (Instant teammate visibility without re-login)
        commsChannel.on('broadcast', { event: 'announce_join' }, (payload) => {
            try {
                const data = payload.payload;
                if (data && data.user) {
                    if (window.registerSquadMember) window.registerSquadMember(data.user, data.location, data.dutyStatus);
                    window.pushTacLog(`OPERATOR ONLINE: ${data.user.callsign}`, "SUCCESS");
                    if (data.user.id !== commsUser.id) {
                        // Immediately respond so the new teammate sees our badge too!
                        commsChannel.send({
                            type: 'broadcast',
                            event: 'announce_reply',
                            payload: { user: commsUser, location: window.myLatestCoords || null, dutyStatus: window.myDutyStatus || '', target: data.user.id }
                        }).catch(() => {});
                        // Automatically establish WebRTC peer connection
                        if (!window.peerConnections[data.user.id] && commsUser.id > data.user.id) {
                            createPeerConnection(data.user.id, true);
                        }
                    }
                }
            } catch(e) { console.error("announce_join RX Error:", e); }
        });

        commsChannel.on('broadcast', { event: 'announce_reply' }, (payload) => {
            try {
                const data = payload.payload;
                if (data && data.user && (!data.target || data.target === commsUser.id)) {
                    if (window.registerSquadMember) window.registerSquadMember(data.user, data.location, data.dutyStatus);
                    if (!window.peerConnections[data.user.id] && commsUser.id > data.user.id) {
                        createPeerConnection(data.user.id, true);
                    }
                }
            } catch(e) { console.error("announce_reply RX Error:", e); }
        });

        commsChannel.on('broadcast', { event: 'squad_ping' }, (payload) => {
            try {
                const data = payload.payload;
                if (data && data.user && data.user.id !== commsUser.id) {
                    if (window.registerSquadMember) window.registerSquadMember(data.user, data.location, data.dutyStatus);
                }
            } catch(e) {}
        });

        // 3. Handle Presence (Roster & GPS)
        commsChannel.on('presence', { event: 'sync' }, () => {
            const state = commsChannel.presenceState();
            updateTeamRoster(state);
            updateTeamMarkers(state);

            Object.keys(state).forEach(peerId => {
                if (peerId !== commsUser.id && !window.peerConnections[peerId]) {
                    if (commsUser.id > peerId) createPeerConnection(peerId, true);
                }
            });
        });

        // RECONNECT & JOIN HANDLER: Negotiates WebRTC and registers squad roster
        commsChannel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
            const state = commsChannel.presenceState();
            if (newPresences && newPresences.length > 0 && newPresences[0].user) {
                if (window.registerSquadMember) {
                    window.registerSquadMember(newPresences[0].user, newPresences[0].location, newPresences[0].dutyStatus, newPresences[0].distress);
                }
            }
            updateTeamRoster(state);
            updateTeamMarkers(state);
            if (key === commsUser.id) return;
            window.pushTacLog(`PLAYER JOINED: ${newPresences[0]?.user?.callsign || key}`, "SYS");

            if (!window.peerConnections[key] && commsUser.id > key) {
                createPeerConnection(key, true);
            }
        });

        commsChannel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            const state = commsChannel.presenceState();
            if (state[key] && state[key].length > 0) {
                updateTeamRoster(state);
                updateTeamMarkers(state);
                return;
            }
            
            // Clean up left operator from registry
            if (leftPresences && leftPresences[0]?.user?.id) {
                const uid = leftPresences[0].user.id;
                let stillOnline = false;
                Object.values(state).forEach(list => {
                    (list || []).forEach(p => {
                        if (p.user?.id === uid) stillOnline = true;
                    });
                });
                if (!stillOnline && window.activeSquadRegistry && window.activeSquadRegistry[uid]) {
                    delete window.activeSquadRegistry[uid];
                }
            }
            updateTeamRoster(state);
            updateTeamMarkers(state);
            
            if (window.peerConnections && window.peerConnections[key]) {
                try { window.peerConnections[key].close(); } catch(e){}
                delete window.peerConnections[key];
                const audioEl = document.getElementById('webrtc-audio-' + key);
                if (audioEl) audioEl.remove();
            }
        });

        let isIntentionalDisconnect = false;

        // ── BULLETPROOF DISCONNECT ───────────────────────────────────────────
        function doDisconnect() {
            isIntentionalDisconnect = true;

            // 1. Kill Heartbeat Timer
            if (window.squadHeartbeatInterval) {
                clearInterval(window.squadHeartbeatInterval);
                window.squadHeartbeatInterval = null;
            }

            // 2. Kill Supabase channel
            try {
                if (commsChannel) {
                    window.supabaseClient.removeChannel(commsChannel);
                    commsChannel = null;
                }
            } catch(e) { console.warn('[DISCONNECT] Supabase cleanup error:', e); }

            // 3. Kill all WebRTC peer connections
            try {
                Object.values(window.peerConnections || {}).forEach(pc => { try { pc.close(); } catch(e){} });
                window.peerConnections = {};
            } catch(e) { console.warn('[DISCONNECT] WebRTC cleanup error:', e); }

            // 4. Kill microphone stream
            try {
                if (window.activeMicStream) {
                    window.activeMicStream.getTracks().forEach(t => t.stop());
                    window.activeMicStream = null;
                }
            } catch(e) { console.warn('[DISCONNECT] Mic cleanup error:', e); }

            // 5. Stop GPS watch
            try {
                if (geoWatchId) { navigator.geolocation.clearWatch(geoWatchId); geoWatchId = null; }
            } catch(e) {}

            // 6. Reset Registry & Markers
            window.activeSquadRegistry = {};
            window.latestPresenceState = {};

            // 7. ALWAYS reset UI
            try {
                document.getElementById('comms-login').classList.remove('hidden');
                document.getElementById('comms-dashboard').classList.add('hidden');
                document.getElementById('comms-dashboard').classList.remove('grid');
                document.getElementById('comms-sos-bar').classList.add('hidden');
                const disconnectBtn = document.getElementById('comms-terminate-link-btn');
                if (disconnectBtn) disconnectBtn.classList.add('hidden');
                if (window.teamMarkers) {
                    Object.values(window.teamMarkers).forEach(m => { try { if(commsMapInstance) commsMapInstance.removeLayer(m); } catch(e){} });
                    window.teamMarkers = {};
                }
            } catch(e) { console.warn('[DISCONNECT] UI reset error:', e); }

            window.pushTacLog(`DISCONNECTED FROM NETWORK`, "SYS");
        }
        window.doDisconnect = doDisconnect;

        function reconnectComms() {
            if (isIntentionalDisconnect || !commsUser || !commsUser.callsign) return;
            window.pushTacLog("LINK SIGNAL RE-SYNCING...", "ALERT");
            try {
                if (commsChannel) {
                    try { window.supabaseClient.removeChannel(commsChannel); } catch(e){}
                    commsChannel = null;
                }
                initSupabaseComms(window.currentTeamName, window.currentPasscode, () => {
                    window.pushTacLog("FREQUENCY LINK RESTORED", "SUCCESS");
                });
            } catch(err) {
                console.warn("Reconnect attempt error:", err);
            }
        }
        window.reconnectComms = reconnectComms;
        window.establishTacticalLink = reconnectComms;

        commsChannel.subscribe(async (status, err) => {
            const hexBadge = window.currentFreqHex ? ` [${window.currentFreqHex.slice(0, 4)}]` : '';
            if (diagSub) diagSub.textContent = `SUB: ${status}${hexBadge}`;
            window.pushTacLog(`COMMS LINK: ${status}${hexBadge}`, status === 'SUBSCRIBED' ? "SUCCESS" : "ERROR");
            
            if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                if (!isIntentionalDisconnect) {
                    window.pushTacLog(`SIGNAL DROPPED (${status}). RECONNECTING IN 2s...`, "ALERT");
                    setTimeout(() => {
                        if (!isIntentionalDisconnect) reconnectComms();
                    }, 2000);
                }
            }

            if (status === 'SUBSCRIBED') {
                if (onConnectedCallback) onConnectedCallback();
                window.pushTacLog(`LINK LOCKED: MISSION CHANNEL ${teamName}${hexBadge}`, "SUCCESS");
                
                // Show dashboard
                document.getElementById('comms-login').classList.add('hidden');
                document.getElementById('comms-dashboard').classList.remove('hidden');
                document.getElementById('comms-dashboard').classList.add('grid');
                document.getElementById('comms-sos-bar').classList.remove('hidden');
                
                // Wire up disconnect button
                const disconnectBtn = document.getElementById('comms-terminate-link-btn');
                if (disconnectBtn) {
                    disconnectBtn.classList.remove('hidden');
                    const freshBtn = disconnectBtn.cloneNode(true);
                    disconnectBtn.parentNode.replaceChild(freshBtn, disconnectBtn);
                    freshBtn.classList.remove('hidden');
                    freshBtn.addEventListener('click', (e) => {
                        if (e) e.stopPropagation();
                        doDisconnect();
                    });
                }

                // Initialize Map
                initCommsMap();

                // Track presence immediately
                if (commsChannel) {
                    commsChannel.track({
                        online_at: new Date().toISOString(),
                        user: commsUser,
                        distress: window.isDistressActive || false,
                        dutyStatus: window.myDutyStatus || ''
                    }).catch(e => console.warn("Initial track failed:", e));

                    // Announce join so teammates immediately discover this operator
                    commsChannel.send({
                        type: 'broadcast',
                        event: 'announce_join',
                        payload: { user: commsUser, location: window.myLatestCoords || null, dutyStatus: window.myDutyStatus || '' }
                    }).catch(() => {});
                }

                // Active 20-Second Keepalive Heartbeat (Prevents 1-minute idle timeouts permanently)
                if (window.squadHeartbeatInterval) clearInterval(window.squadHeartbeatInterval);
                window.squadHeartbeatInterval = setInterval(() => {
                    if (commsChannel && commsChannel.state === 'joined') {
                        commsChannel.track({
                            online_at: new Date().toISOString(),
                            user: commsUser,
                            location: window.myLatestCoords || null,
                            dutyStatus: window.myDutyStatus || '',
                            distress: window.isDistressActive || false
                        }).catch(() => {});

                        commsChannel.send({
                            type: 'broadcast',
                            event: 'squad_ping',
                            payload: { user: commsUser, location: window.myLatestCoords || null, dutyStatus: window.myDutyStatus || '' }
                        }).catch(() => {});
                    }
                }, 20000);
            }
        });
        } catch (error) {
            window.pushTacLog("SUPABASE LINK FAILED", "ERROR");
            console.error(error);
        }
    }

    window.chatPayloadStore = window.chatPayloadStore || {};

    window.saveChatCardToVault = function(key) {
        const cardObj = window.chatPayloadStore[key];
        if (!cardObj) return;
        const title = cardObj.title || cardObj.name || cardObj.label || 'TRANSMITTED CARD';
        const img = cardObj.image || (cardObj.workstationData ? cardObj.workstationData.image : '') || '';
        if (window.saveIntelSnapshot) {
            window.saveIntelSnapshot(title, img, cardObj);
        }
        if (window.pushTacLog) window.pushTacLog(`CARD "${title}" SAVED TO INTEL VAULT`, 'SUCCESS');
        alert(`"${title}" Saved to Intel Vault!`);
    };

    window.reworkChatCard = function(key) {
        const cardObj = window.chatPayloadStore[key];
        if (!cardObj) return;
        const cardType = cardObj.type || (cardObj.workstationData ? cardObj.workstationData.type : 'officer');
        
        const vaultModal = document.getElementById('vault-modal');
        if (vaultModal) vaultModal.classList.add('hidden');
        
        if (typeof window.openWorkstationForm === 'function') {
            window.openWorkstationForm(cardType, cardObj);
            if (window.pushTacLog) window.pushTacLog(`CARD LOADED FOR REWORK [${cardType.toUpperCase()}]`, 'SUCCESS');
        }
    };

    function renderChatMessage(userObj, msg, isMe, imageBase64 = null, tapeUrl = null, tapeMetadata = null) {
        const feed = document.getElementById('chat-feed');
        if (!feed) return;
        const entry = document.createElement('div');
        entry.className = `flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-2`;
        
        let contentHtml = '';
        if (msg) contentHtml += `<div>${msg}</div>`;
        if (tapeMetadata && tapeMetadata.isPristineImage && tapeUrl) {
            const imgId = `pristine-${Math.random().toString(36).substring(2)}`;
            contentHtml += `<img id="${imgId}" src="${imageBase64}" class="mt-1 rounded border border-gray-600 w-32 h-auto cursor-pointer" style="opacity: 0.6;" onclick="window.open(this.src)">`;
            contentHtml += `<div id="${imgId}-status" class="text-[8px] text-blue-400 mt-1 animate-pulse">DECRYPTING HIGH-RES INTEL...</div>`;
            
            setTimeout(async () => {
                try {
                    const res = await fetch(tapeUrl);
                    const encryptedText = await res.text();
                    const decryptedObj = TacticalCrypto.decrypt(encryptedText);
                    const pristineB64 = decryptedObj.image || decryptedObj;
                    
                    const imgEl = document.getElementById(imgId);
                    if (imgEl) {
                        imgEl.src = pristineB64;
                        imgEl.style.opacity = '1';
                    }
                    const statusEl = document.getElementById(`${imgId}-status`);
                    if (statusEl) statusEl.remove();
                    
                    if (!isMe && window.saveIntelSnapshot) {
                        const vaultMeta = Object.assign(
                            { source: 'comms_chat', senderCallsign: userObj.callsign, senderRole: userObj.role },
                            tapeMetadata || {}
                        );
                        delete vaultMeta.isPristineImage;
                        window.saveIntelSnapshot(tapeMetadata.label || `COMMS_${userObj.callsign}`, pristineB64, vaultMeta);
                        window.pushTacLog("HIGH-RES INTEL SECURED TO VAULT", "SUCCESS");
                    }
                } catch (e) {
                    const statusEl = document.getElementById(`${imgId}-status`);
                    if (statusEl) { statusEl.className = "text-[8px] text-red-400 mt-1"; statusEl.innerText = "DECRYPTION FAILED"; }
                }
            }, 100);
        } else if (tapeMetadata && (tapeMetadata.type === 'casefile' || tapeMetadata.type === 'casefile-pdf' || tapeMetadata.casefileData)) {
            const cData = tapeMetadata.casefileData || tapeMetadata;
            const chatKey = `case_${Math.random().toString(36).substring(2, 9)}`;
            window.chatPayloadStore = window.chatPayloadStore || {};
            window.chatPayloadStore[chatKey] = cData;
            const isPaid = cData.status === 'PAID' || cData.is_paid === true;

            contentHtml += `
                <div class="mt-2 p-3 bg-slate-900 border-2 border-blue-500/80 rounded-xl text-left text-xs text-white max-w-full space-y-2 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                    <div class="font-black text-blue-300 text-[10px] uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <span class="flex items-center gap-1.5"><i data-lucide="file-check-2" class="w-4 h-4 text-blue-400"></i> INVOICE: ${cData.case_number || 'OFFICIAL'}</span>
                        <span class="text-[8px] px-1.5 py-0.5 rounded font-black font-mono uppercase ${isPaid ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50' : 'bg-red-950 text-red-300 border border-red-500/50'}">${isPaid ? '✔ PAID' : '⏳ UNPAID'}</span>
                    </div>
                    <div class="text-[10px] font-mono text-slate-300 grid grid-cols-2 gap-1.5">
                        <div><span class="text-slate-500">BILLED TO:</span> <b class="text-amber-300">${cData.billed_to || 'N/A'}</b></div>
                        <div><span class="text-slate-500">PAID BY:</span> <b class="text-emerald-300">${cData.paid_by || 'N/A'}</b></div>
                    </div>
                    ${cData.services_performed ? `<div class="text-[9.5px] font-mono p-1.5 bg-black/40 rounded border border-slate-800 text-purple-300">${cData.services_performed}</div>` : ''}
                    <div class="flex items-center gap-2 pt-1">
                        <button type="button" onclick="event.stopPropagation(); if(window.saveCasefileFromChatToVault) window.saveCasefileFromChatToVault('${chatKey}');" class="bg-purple-900 hover:bg-purple-800 text-purple-200 text-[9px] font-black px-2.5 py-1.5 rounded border border-purple-500/60 uppercase flex items-center gap-1 cursor-pointer shadow">
                            <i data-lucide="folder-plus" class="w-3 h-3"></i> SAVE TO VAULT
                        </button>
                        <button type="button" onclick="event.stopPropagation(); if(window.loadCaseFileBackToEditor) window.loadCaseFileBackToEditor(window.chatPayloadStore['${chatKey}']);" class="bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-black px-2.5 py-1.5 rounded uppercase flex items-center gap-1 cursor-pointer shadow">
                            <i data-lucide="edit-3" class="w-3 h-3"></i> REWORK INVOICE
                        </button>
                    </div>
                </div>
            `;
        } else if (tapeMetadata && (tapeMetadata.type === 'officer_sitrep' || tapeMetadata.type === 'officer' || tapeMetadata.workstationData?.type === 'officer' || tapeMetadata.workstationData)) {
            const cardObj = tapeMetadata.workstationData || tapeMetadata;
            const chatKey = `card_${Math.random().toString(36).substring(2, 9)}`;
            window.chatPayloadStore = window.chatPayloadStore || {};
            window.chatPayloadStore[chatKey] = cardObj;

            contentHtml += `
                <div class="mt-2 p-2 bg-slate-900 border border-cyan-500/60 rounded-lg text-left text-xs text-white max-w-full space-y-1.5 shadow-lg">
                    <div class="font-black text-cyan-300 text-[10px] uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-1">
                        <span>🚓 ${cardObj.title || cardObj.label || 'WORKSTATION DOSSIER'}</span>
                        <span class="text-[8px] bg-red-950 text-red-400 px-1.5 py-0.5 rounded border border-red-600/50 font-mono">ENCRYPTED INTEL</span>
                    </div>
                    ${imageBase64 ? `<img src="${imageBase64}" class="w-full h-44 object-contain rounded border border-slate-700 bg-black cursor-pointer shadow" onclick="if(window.loadSnapshotToViewer) window.loadSnapshotToViewer(window.chatPayloadStore['${chatKey}']);">` : ''}
                    <div class="flex items-center gap-1.5 pt-1 flex-wrap">
                        <button type="button" onclick="event.stopPropagation(); if(window.saveChatCardToVault) window.saveChatCardToVault('${chatKey}');" class="bg-purple-900 hover:bg-purple-800 text-purple-200 text-[9px] font-black px-2.5 py-1 rounded border border-purple-500/60 uppercase flex items-center gap-1 cursor-pointer shadow">
                            <i data-lucide="folder-plus" class="w-3 h-3 text-purple-300"></i> SAVE TO VAULT
                        </button>
                        <button type="button" onclick="event.stopPropagation(); if(window.reworkChatCard) window.reworkChatCard('${chatKey}');" class="bg-cyan-900 hover:bg-cyan-800 text-cyan-200 text-[9px] font-black px-2.5 py-1 rounded border border-cyan-500/60 uppercase flex items-center gap-1 cursor-pointer shadow">
                            <i data-lucide="refresh-cw" class="w-3 h-3 text-cyan-300"></i> REWORK CARD
                        </button>
                    </div>
                </div>
            `;
        } else if (imageBase64) {
            contentHtml += `
                <div class="mt-2 p-1.5 bg-slate-950 border border-cyan-500/60 rounded-lg text-left shadow-lg">
                    <div class="flex items-center justify-between text-[9px] font-black text-cyan-300 uppercase tracking-widest px-1 pb-1">
                        <span>INTEL CARD PREVIEW</span>
                        <span class="text-[8px] text-slate-400 font-mono">🔍 TAP TO ZOOM</span>
                    </div>
                    <img src="${imageBase64}" class="w-full max-w-[320px] h-auto object-contain rounded border border-slate-700 bg-slate-900 cursor-pointer shadow" onclick="if(window.loadSnapshotToViewer) { window.loadSnapshotToViewer({ image: this.src, label: '${(tapeMetadata?.label || 'INTEL CARD').replace(/'/g, "\\'")}' }); } else { window.open(this.src); }">
                </div>
            `;
        }

        if (tapeUrl && !(tapeMetadata && tapeMetadata.isPristineImage)) {
            const btnId = `btn-tape-${Math.random().toString(36).substring(2)}`;
            contentHtml += `
                <div class="mt-2 p-2 bg-purple-900/50 border border-purple-500/50 rounded text-center">
                    <i data-lucide="video" class="w-6 h-6 mx-auto mb-1 text-purple-400"></i>
                    <button id="${btnId}" class="bg-purple-700 hover:bg-purple-500 text-white text-[8px] font-black px-2 py-1 rounded w-full flex items-center justify-center gap-1">
                        <i data-lucide="download" class="w-3 h-3"></i> DOWNLOAD TAPE
                    </button>
                </div>
            `;
            setTimeout(() => {
                const btn = document.getElementById(btnId);
                if (btn) {
                    btn.onclick = async () => {
                        if(btn.disabled) return;
                        btn.innerHTML = `<i data-lucide="loader" class="w-3 h-3 animate-spin"></i> DECRYPTING...`;
                        btn.disabled = true;
                        try {
                            const res = await fetch(tapeUrl);
                            const encryptedBlob = await res.blob();
                            // Use original mime type from sender metadata so iOS mp4 plays correctly
                            const originalMime = (tapeMetadata && tapeMetadata.mimeType) ? tapeMetadata.mimeType : 'video/webm';
                            const decryptedBlob = await window.TacticalBinaryCrypto.decryptBlob(encryptedBlob, originalMime);
                            window.pushTacLog("ENCRYPTED TAPE DECRYPTED", "SUCCESS");
                            
                            // Convert decrypted Blob → base64 data URL so vault can store and play it
                            const tapeReader = new FileReader();
                            tapeReader.onloadend = () => {
                                const metadata = tapeMetadata ? Object.assign({}, tapeMetadata) : { label: "INCOMING_TAPE_" + Date.now().toString().slice(-4), type: "video" };
                                metadata.image = tapeReader.result;
                                metadata.id = Date.now() + Math.floor(Math.random() * 1000);
                                metadata.timestamp = Date.now();
                                metadata.isAmmo = false;
                                
                                vaultCache.unshift(metadata);
                                if(window.TRC_IDB) window.TRC_IDB.set('intelVault', metadata.id.toString(), metadata);
                                refreshVaultGrid();
                                
                                btn.innerHTML = `<i data-lucide="check" class="w-3 h-3 text-green-400 inline-block mr-1"></i> SENT TO INTEL VAULT`;
                                btn.classList.replace('bg-purple-700', 'bg-green-900/50');
                                window.pushTacLog("TAPE DECRYPTED & SAVED TO VAULT", "SUCCESS");
                            };
                            tapeReader.onerror = () => { throw new Error('FileReader failed on decrypted tape'); };
                            tapeReader.readAsDataURL(decryptedBlob);
                            return; // FileReader is async — vault save happens in callback above
                            btn.innerHTML = `<i data-lucide="check" class="w-3 h-3 text-green-400 inline-block mr-1"></i> SENT TO INTEL VAULT`;
                            btn.classList.replace('bg-purple-700', 'bg-green-900/50');
                            window.pushTacLog("ENCRYPTED TAPE DECRYPTED AND SAVED", "SUCCESS");
                        } catch (err) {
                            btn.innerHTML = `<i data-lucide="x" class="w-3 h-3 text-red-400"></i> FAILED`;
                            window.pushTacLog("TAPE DECRYPTION FAILED: " + err.message, "ERROR");
                        }
                    };
                }
            }, 100);
        }

        const isBizCard = msg && (msg.includes('[TRC BIZ CARD]') || msg.includes('TRC BIZ CARD'));
        let bubbleStyle = isMe 
            ? 'background-color: #1e3a8a !important; color: #ffffff !important; border: 1px solid #3b82f6 !important;' 
            : 'background-color: #1f2937 !important; color: #ffffff !important; border: 1px solid #4b5563 !important;';

        if (isBizCard) {
            bubbleStyle = 'background: linear-gradient(135deg, #2e1065 0%, #4c1d95 50%, #0f172a 100%) !important; border: 2px solid #e879f9 !important; box-shadow: 0 0 15px rgba(232,121,249,0.5) !important; color: #ffffff !important; font-family: monospace;';
        }

        entry.innerHTML = `
            <span style="font-size: 8px; font-weight: 900; color: ${isBizCard ? '#f0abfc' : '#9ca3af'}; font-family: monospace; text-transform: uppercase;">${userObj.callsign} [${userObj.role}]</span>
            <div style="${bubbleStyle}" class="px-3 py-2 rounded-lg max-w-[88%] mt-0.5 shadow-md">
                ${contentHtml}
            </div>
        `;
        feed.appendChild(entry);
        feed.scrollTop = feed.scrollHeight;

        // ── AUTO-SAVE INCOMING IMAGES & CARDS TO INTEL VAULT & WORKSTATION ──────────────
        if (!isMe && !(tapeMetadata && tapeMetadata.isPristineImage)) {
            if (imageBase64 || isBizCard || tapeMetadata) {
                const wsCardData = tapeMetadata?.workstationData || (tapeMetadata && ['medevac', 'scorecard', 'logistics', 'roster', 'bragboard', 'officer', 'workstation', 'master_op'].includes(tapeMetadata.type) ? tapeMetadata : null);

                const cardId = tapeMetadata?.id || wsCardData?.id || Date.now();
                const label = (tapeMetadata && (tapeMetadata.label || tapeMetadata.title))
                    ? (tapeMetadata.label || tapeMetadata.title)
                    : (wsCardData ? `WORKSTATION: ${wsCardData.title || wsCardData.type}` : `WIRE_${userObj.callsign || 'CARD'}_${Date.now().toString().slice(-4)}`);

                const cardImage = imageBase64 || (wsCardData ? wsCardData.image : null) || (tapeMetadata ? tapeMetadata.image : null) || '';

                const vaultMeta = Object.assign(
                    {
                        id: cardId,
                        label: label,
                        image: cardImage,
                        timestamp: new Date().toISOString(),
                        source: 'comms_chat',
                        senderCallsign: userObj.callsign,
                        senderRole: userObj.role,
                        type: isBizCard ? 'intel_report' : (wsCardData ? 'workstation' : (tapeMetadata?.type || 'snapshot'))
                    },
                    tapeMetadata || {}
                );
                if (wsCardData && !vaultMeta.workstationData) {
                    vaultMeta.workstationData = wsCardData;
                }

                // 1. Save to intelVault IDB
                if (window.TRC_IDB) {
                    window.TRC_IDB.set('intelVault', cardId.toString(), vaultMeta).then(() => {
                        if (typeof window.refreshVaultGrid === 'function') window.refreshVaultGrid();
                    }).catch(e => console.error("Error auto-saving incoming card to intelVault IDB:", e));
                }

                // 2. Save to vaultCache memory with deduplication check
                if (!window.vaultCache) window.vaultCache = [];
                const existingIdx = window.vaultCache.findIndex(v => v && v.id && (v.id.toString() === cardId.toString() || (v.content && vaultMeta.content && v.content === vaultMeta.content && v.author === vaultMeta.author)));
                if (existingIdx >= 0) {
                    window.vaultCache[existingIdx] = Object.assign({}, window.vaultCache[existingIdx], vaultMeta);
                } else {
                    window.vaultCache.unshift(vaultMeta);
                }
                if (typeof window.refreshVaultGrid === 'function') window.refreshVaultGrid();

                // 3. Save to workstationLibrary IDB if it's a workstation card
                if (wsCardData && window.TRC_IDB) {
                    window.TRC_IDB.set('workstationLibrary', cardId.toString(), wsCardData).then(() => {
                        if (typeof window.renderWorkstationMenu === 'function') window.renderWorkstationMenu();
                    }).catch(e => console.error("Error auto-saving incoming workstation card to library:", e));
                }

                if (window.pushTacLog) window.pushTacLog(`INCOMING WIRE INTEL FROM ${userObj.callsign} → SAVED TO INTEL VAULT & WORKSTATION`, "SUCCESS");
            }
        }
    }

    window.saveCasefileFromChatToVault = async function(chatKey) {
        const data = window.chatPayloadStore ? window.chatPayloadStore[chatKey] : null;
        if (!data) return;
        const cleanName = data.case_number || data.billed_to || 'INVOICE';
        const vaultItem = {
            id: 'case_' + Date.now(),
            timestamp: Date.now(),
            label: `INVOICE: ${cleanName}`,
            image: window.generatePdfThumbnailSvg ? window.generatePdfThumbnailSvg(cleanName) : '',
            type: 'casefile-pdf',
            casefileData: data
        };
        if (typeof vaultCache !== 'undefined') {
            vaultCache.unshift(vaultItem);
            if (window.TRC_IDB) await window.TRC_IDB.set('intelVault', vaultItem.id.toString(), vaultItem);
            if (typeof refreshVaultGrid === 'function') refreshVaultGrid();
        }
        if (window.showToast) window.showToast(`✅ Saved ${cleanName} to Intel Vault!`);
        if (window.pushTacLog) window.pushTacLog(`SAVED CASEFILE FROM CHAT TO VAULT`, 'SUCCESS');
    };

    // COMMS NOTIFICATION SYSTEM
    let chatAlertState = 0; // 0: Off, 1: Flash, 2: Vibrate, 3: Chime
    const chatAlertLabels = ["Alerts: Off", "Alerts: Flash", "Alerts: Vibrate", "Alerts: Chime"];
    const chatAlertIcons = ["bell-off", "zap", "smartphone", "volume-2"];
    
    window.cycleChatAlerts = function() {
        chatAlertState = (chatAlertState + 1) % 4;
        const btn = document.getElementById('chat-alert-toggle');
        if (btn) {
            btn.innerHTML = `<i data-lucide="${chatAlertIcons[chatAlertState]}" class="w-2.5 h-2.5 inline-block"></i> <span>${chatAlertLabels[chatAlertState]}</span>`;
            if (window.lucide) window.lucide.createIcons();
        }
    };

    window.playChatAlert = function() {
        if (chatAlertState === 0) return;
        
        if (chatAlertState === 1) {
            triggerVisualFlash();
        } else if (chatAlertState === 2) {
            if (navigator.vibrate) {
                navigator.vibrate([300, 100, 300]);
            }
        } else if (chatAlertState === 3) {
            playSynthesizedChime();
        }
    };

    function playSynthesizedChime() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            if (!window.globalChimeCtx) window.globalChimeCtx = new AudioContext();
            const ctx = window.globalChimeCtx;
            if (ctx.state === 'suspended') ctx.resume();

            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0, ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
            gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
            
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
        } catch(e) {
            console.log("Audio synthesis failed:", e);
        }
    }

    function triggerVisualFlash() {
        let flash = document.getElementById('tactical-visual-flash');
        if (!flash) {
            flash = document.createElement('div');
            flash.id = 'tactical-visual-flash';
            flash.style.position = 'fixed';
            flash.style.top = '0';
            flash.style.left = '0';
            flash.style.width = '100vw';
            flash.style.height = '100vh';
            flash.style.pointerEvents = 'none';
            flash.style.zIndex = '999999';
            flash.style.transition = 'opacity 0.1s ease-out, box-shadow 0.1s ease-out';
            flash.style.opacity = '0';
            flash.style.boxShadow = 'inset 0 0 150px 30px rgba(16, 185, 129, 0.9)'; // Neon Green border glow
            document.body.appendChild(flash);
        }
        
        // Strobe effect: Double rapid flash
        flash.style.opacity = '1';
        setTimeout(() => {
            flash.style.opacity = '0';
            setTimeout(() => {
                flash.style.opacity = '1';
                setTimeout(() => {
                    flash.style.opacity = '0';
                }, 100);
            }, 100);
        }, 100);
    };

    // PTT LOGIC (WebRTC True Half-Duplex)
    const pttBtn = document.getElementById('ptt-btn');
    if (pttBtn) {
        const startPTT = async (e) => {
            if (e) e.preventDefault();
            if (!commsUser || !commsUser.callsign) { alert("Log into the Comms First Before Operating the Comms"); return; }
            if (!window.activeMicStream) {
                window.pushTacLog('⚠️ PTT AUDIO UNAVAILABLE: Requires HTTPS for voice.', 'ALERT');
                // Do not return; allow visual PTT to transmit
            }
            pttBtn.classList.add('border-emerald-500', 'bg-emerald-950/20', 'shadow-[0_0_20px_rgba(16,185,129,0.3)]');
            
            window.pushTacLog(`TRANSMITTING TO SQUAD`, "SYS");
            const activeSpeaker = document.getElementById('ptt-active-speaker');
            if (activeSpeaker) {
                activeSpeaker.textContent = `TX: ${commsUser.callsign} (${commsUser.role})`;
                activeSpeaker.classList.add('text-emerald-400', 'animate-pulse');
            }

            try {
                // If microphone is not yet armed, acquire it now on direct user gesture
                if (!window.activeMicStream && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    try {
                        window.activeMicStream = await navigator.mediaDevices.getUserMedia({ 
                            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
                        });
                    } catch (e1) {
                        try {
                            window.activeMicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        } catch (e2) {
                            window.activeMicStream = null;
                        }
                    }
                    if (window.activeMicStream) {
                        if (window.attachMicToPeers) window.attachMicToPeers(window.activeMicStream);
                        window.pushTacLog("MICROPHONE ARMED (PTT)", "SUCCESS");
                    }
                }

                // Half-Duplex Rule: Mute incoming remote speakers while transmitting to stop acoustic feedback loops
                document.querySelectorAll('audio[id^="webrtc-audio-"]').forEach(el => { el.muted = true; });

                // Unmute the microphone to start broadcasting
                if (window.activeMicStream && window.activeMicStream.getAudioTracks().length > 0) {
                    window.activeMicStream.getAudioTracks()[0].enabled = true;
                }

                if (commsChannel) {
                    commsChannel.send({
                        type: 'broadcast', event: 'ptt',
                        payload: { data: TacticalCrypto.encrypt({ active: true, user: commsUser }) }
                    }).catch(() => {});
                }
                window.diagTxCount++;
                const diagTx = document.getElementById('diag-tx');
                if (diagTx) diagTx.textContent = `TX: ${window.diagTxCount}`;
            } catch(e) { 
                console.error("PTT Start Error", e); 
                window.pushTacLog(`MIC ERROR`, "ERROR");
            }
        };

        const stopPTT = async (e) => {
            if (e) e.preventDefault();
            if (!commsUser || !commsUser.callsign) return;
            pttBtn.classList.remove('border-emerald-500', 'bg-emerald-950/20', 'shadow-[0_0_20px_rgba(16,185,129,0.3)]');
            
            const activeSpeaker = document.getElementById('ptt-active-speaker');
            if (activeSpeaker) {
                activeSpeaker.textContent = 'STANDBY';
                activeSpeaker.classList.remove('text-emerald-400', 'animate-pulse');
            }

            try {
                // Mute the microphone to stop broadcasting
                if (window.activeMicStream && window.activeMicStream.getAudioTracks().length > 0) {
                    window.activeMicStream.getAudioTracks()[0].enabled = false;
                }

                // Restore remote speakers to hear incoming squad transmissions
                document.querySelectorAll('audio[id^="webrtc-audio-"]').forEach(el => { el.muted = false; });

                if (commsChannel) {
                    commsChannel.send({
                        type: 'broadcast', event: 'ptt',
                        payload: { data: TacticalCrypto.encrypt({ active: false, user: commsUser }) }
                    }).catch(() => {});
                }
            } catch(e) { console.error("PTT Stop error", e); }
        };
        pttBtn.onmousedown = startPTT;
        pttBtn.onmouseup = stopPTT;
        pttBtn.onmouseleave = stopPTT;
        pttBtn.ontouchstart = startPTT;
        pttBtn.ontouchend = stopPTT;
        pttBtn.ontouchcancel = stopPTT;
    }

    // CHAT SEND
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send-btn');
    if (chatSend && chatInput) {
        const send = () => {
            const msg = chatInput.value.trim();
            if (!msg) return;
            if (!commsUser || !commsUser.callsign) { alert("Log into the Comms First Before Operating the Comms"); return; }
            
            try {
                const encrypted = TacticalCrypto.encrypt({ message: msg, user: commsUser, timestamp: Date.now() });
                const msgId = Math.random().toString(36).substring(2, 9);
                window.receivedMsgIds.add(msgId);
                
                // Try P2P first
                let p2pSent = false;
                if (window.dataChannels) {
                    Object.values(window.dataChannels).forEach(dc => {
                        if (dc && dc.readyState === 'open') {
                            try {
                                dc.send(JSON.stringify({ event: 'chat', data: encrypted, msgId }));
                                p2pSent = true;
                            } catch (err) {
                                window.pushTacLog("P2P TX ERR: " + err.message, "ERROR");
                            }
                        }
                    });
                }

                commsChannel.send({
                    type: 'broadcast',
                    event: 'chat',
                    payload: { data: encrypted, msgId }
                }).then(resp => {
                    if (resp !== 'ok') window.pushTacLog(`SUPABASE TX REJECTED: ` + JSON.stringify(resp), "ERROR");
                }).catch(err => {
                    window.pushTacLog(`SUPABASE TX EXCEPTION: ` + err.message, "ERROR");
                });
                window.pushTacLog(`CHAT TX SENT: ${msg} ${p2pSent ? '[P2P ACTIVE]' : ''}`, "SUCCESS");
            } catch (e) {
                window.pushTacLog("TEXT ERROR: SOCKET TRANSMISSION FAILED", "ERROR");
            }
            renderChatMessage(commsUser, msg, true);
            chatInput.value = '';
        };
        chatSend.onclick = send;
        chatInput.onkeydown = (e) => { if (e.key === 'Enter') send(); };
        
        const chatImageUpload = document.getElementById('chat-image-upload');
        if (chatImageUpload) {
            chatImageUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                if (!commsUser || !commsUser.callsign) { alert("Log into the Comms First Before Operating the Comms"); return; }
                const reader = new FileReader();
                reader.onload = function(event) {
                    const img = new Image();
                    img.onload = function() {
                        const canvas = document.createElement('canvas');
                        let width = img.width;
                        let height = img.height;
                        const MAX_SIZE = 1000;
                        if (width > height && width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        } else if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        
                        let quality = 0.85;
                        let currentWidth = width;
                        let currentHeight = height;
                        
                        let finalBase64 = canvas.toDataURL('image/jpeg', quality);
                        let payloadSize = new Blob([finalBase64]).size;
                        
                        while (payloadSize > 120000 && currentWidth > 300) {
                            quality -= 0.15;
                            if (quality < 0.4) {
                                currentWidth *= 0.8;
                                currentHeight *= 0.8;
                                canvas.width = currentWidth;
                                canvas.height = currentHeight;
                                ctx.drawImage(img, 0, 0, currentWidth, currentHeight);
                                quality = 0.75; // reset quality for smaller size
                            }
                            finalBase64 = canvas.toDataURL('image/jpeg', quality);
                            payloadSize = new Blob([finalBase64]).size;
                        }
                        
                        if (payloadSize > 160000) {
                            window.pushTacLog("IMAGE ERROR: " + Math.round(payloadSize/1024) + "KB EXCEEDS ENCRYPTION LIMIT.", "ERROR");
                            return;
                        }
                        
                        try {
                            const encryptedImage = TacticalCrypto.encrypt({ message: '', image: finalBase64, user: commsUser });
                            const msgId = Math.random().toString(36).substring(2, 9);
                            window.receivedMsgIds.add(msgId);
                            
                            // Try P2P First
                            if (window.dataChannels) {
                                Object.values(window.dataChannels).forEach(dc => {
                                    if (dc && dc.readyState === 'open') {
                                        try {
                                            dc.send(JSON.stringify({ event: 'chat', data: encryptedImage, msgId }));
                                        } catch (err) {
                                            window.pushTacLog("P2P IMG ERR: " + err.message, "ERROR");
                                        }
                                    }
                                });
                            }

                            commsChannel.send({
                                type: 'broadcast',
                                event: 'chat',
                                payload: { data: encryptedImage, msgId }
                            });
                            window.pushTacLog(`IMAGE TRANSMISSION SENT (${Math.round(payloadSize/1024)}KB)`, "SYS");
                            renderChatMessage(commsUser, '', true, finalBase64);
                        } catch (e) {
                            window.pushTacLog("IMAGE ERROR: SOCKET TRANSMISSION FAILED", "ERROR");
                        }
                        saveIntelSnapshot("TX_INTEL_SELF", finalBase64);
                    }
                    img.src = event.target.result;
                }
                reader.readAsDataURL(file);
                chatImageUpload.value = '';
            });
        }
    }

    function initCommsMap() {
        if (!commsMapInstance) {
            const container = document.getElementById('comms-map-instance');
            if (container) {
                commsMapInstance = L.map(container, {
                    zoomControl: false,
                    attributionControl: false,
                    dragging: true,
                    tap: true,
                    touchZoom: true
                }).setView([31.9686, -99.9018], 13);
                L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                    crossOrigin: true
                }).addTo(commsMapInstance);
            }
        }
        
        let lastLat = 31.9686;
        let lastLng = -99.9018;
        let hasCentered = false;

        // Start tracking my own location
            if (navigator.geolocation && commsMapInstance) {
            if (geoWatchId) navigator.geolocation.clearWatch(geoWatchId);
            let lastTrackTime = 0;
            const fallbackIpGeo = async () => {
                if (window.location.protocol === 'file:') return;
                try {
                    window.pushTacLog("CONNECTING TO SATELLITE IP GEOLOCATION...", "SYS");
                    const res = await fetch('https://ipapi.co/json/').catch(() => null);
                    if (res && res.ok) {
                        const data = await res.json().catch(() => null);
                        if (data && data.latitude && data.longitude) {
                            lastLat = data.latitude;
                            lastLng = data.longitude;
                            window.myLatestCoords = { lat: lastLat, lng: lastLng };
                            if (commsMapInstance) {
                                commsMapInstance.setView([lastLat, lastLng], 13);
                                hasCentered = true;
                            }
                            if (commsChannel) {
                                commsChannel.track({
                                    online_at: new Date().toISOString(),
                                    location: window.myLatestCoords,
                                    user: commsUser,
                                    distress: window.isDistressActive,
                                    dutyStatus: window.myDutyStatus || ''
                                }).catch(e => {});
                            }
                            window.pushTacLog(`IP-GEOLOCATION SECURED: [${data.city || 'NETWORK'}, ${data.region_code || ''}]`, "SUCCESS");
                            return;
                        }
                    }
                } catch(e) {}
                window.pushTacLog("GPS UN-AVAILABLE - SATELLITE MAP STANDBY", "WARNING");
            };

            const startGeoWatch = (highAcc) => {
                return navigator.geolocation.watchPosition((pos) => {
                    const { latitude, longitude } = pos.coords; window.myLatestCoords = { lat: latitude, lng: longitude };
                    lastLat = latitude;
                    lastLng = longitude;
                    if (!hasCentered) {
                        commsMapInstance.setView([latitude, longitude], 15);
                        hasCentered = true;
                    }
                    
                    // Throttle Presence updates to max 1 per 3 seconds to prevent Supabase Rate Limiting!
                    const now = Date.now();
                    if (now - lastTrackTime > 3000) {
                        lastTrackTime = now;
                        // Update Presence with location
                        if (commsChannel) {
                            commsChannel.track({ 
                                online_at: new Date().toISOString(),
                                location: { lat: latitude, lng: longitude },
                                user: commsUser,
                                distress: window.isDistressActive,
                                dutyStatus: window.myDutyStatus || ''
                            }).catch(e => console.warn("Track rate limit:", e));
                        }
                    }
                }, (err) => {
                    console.warn("Main GPS Error:", err);
                    if (highAcc) {
                        window.pushTacLog("HIGH ACCURACY GPS TIMED OUT. SWITCHING TO NETWORK LOC...", "SYS");
                        if (geoWatchId) navigator.geolocation.clearWatch(geoWatchId);
                        geoWatchId = startGeoWatch(false);
                    } else {
                        fallbackIpGeo();
                    }
                }, { enableHighAccuracy: highAcc, maximumAge: 30000, timeout: highAcc ? 12000 : 20000 });
            };
            geoWatchId = startGeoWatch(true);
        }

        const syncBtn = document.getElementById('comms-map-sync');
        if (syncBtn) {
            syncBtn.onclick = () => {
                commsMapInstance.setView([lastLat, lastLng], 15);
                window.pushTacLog("GPS ALIGNED TO LOCAL COORDINATES", "SYS");
            };
        }

        const sosBtn = document.getElementById('comms-sos-btn');
        const sosToggle = document.getElementById('comms-sos-toggle');
        
        window.isDistressActive = false;
        
        const toggleDistress = () => {
            window.isDistressActive = !window.isDistressActive;
            if (window.isDistressActive) {
                if (sosBtn) sosBtn.classList.remove('hidden');
                if (sosToggle) sosToggle.classList.add('hidden');
                window.pushTacLog("SOS DISTRESS BEACON ACTIVATED", "ALERT");
                
                // Broadcast to all clients to create the big pulsing ring
                if (commsChannel && commsUser) {
                    const msgId = Math.random().toString(36).substring(2, 9);
                    window.receivedMsgIds.add(msgId);
                    
                    // Push via P2P
                    if (window.dataChannels) {
                        Object.values(window.dataChannels).forEach(dc => {
                            if (dc && dc.readyState === 'open') {
                                try {
                                    dc.send(JSON.stringify({ event: 'sos', data: { user: commsUser, coords: window.myLatestCoords || null }, msgId }));
                                } catch (err) {
                                    window.pushTacLog("P2P SOS ERR: " + err.message, "ERROR");
                                }
                            }
                        });
                    }

                    // Push via Supabase
                    commsChannel.send({
                        type: 'broadcast',
                        event: 'sos',
                        payload: { user: commsUser, coords: window.myLatestCoords || null, timestamp: new Date().toISOString(), msgId }
                    }).then(resp => {
                        if (resp !== 'ok') window.pushTacLog(`SUPABASE SOS REJECTED: ` + JSON.stringify(resp), "ERROR");
                    }).catch(err => {
                        window.pushTacLog(`SUPABASE SOS EXCEPTION: ` + err.message, "ERROR");
                    });
                    
                    // Red map marker removed — banner-only SOS indicator
                }
            } else {
                window.isDistressActive = false;
                if (sosBtn) sosBtn.classList.add('hidden');
                if (sosToggle) {
                    sosToggle.classList.remove('hidden');
                    // Fully reset the toggle button back to neutral — wipe any red stuck-state classes
                    sosToggle.classList.remove('bg-red-950', 'border-red-700', 'text-red-400', 'animate-pulse');
                    sosToggle.classList.add('bg-gray-900', 'border-gray-700', 'text-gray-400');
                }
                // Reset the SOS bar container back to neutral — no red background remnants
                const sosBarEl = document.getElementById('comms-sos-bar');
                if (sosBarEl) {
                    sosBarEl.classList.remove('bg-red-950', 'bg-red-900', 'border-red-700', 'border-red-600', 'animate-pulse');
                    sosBarEl.classList.add('bg-gray-950', 'border-gray-800');
                }
                window.pushTacLog("SOS DISTRESS BEACON DEACTIVATED", "SYS");
                
                // Broadcast to all clients to remove the big pulsing ring
                if (commsChannel && commsUser) {
                    const msgId = Math.random().toString(36).substring(2, 9);
                    window.receivedMsgIds.add(msgId);
                    
                    // Push via P2P
                    if (window.dataChannels) {
                        Object.values(window.dataChannels).forEach(dc => {
                            if (dc && dc.readyState === 'open') {
                                try {
                                    dc.send(JSON.stringify({ event: 'cancel_sos', data: { user: commsUser }, msgId }));
                                } catch (err) {
                                    console.error("P2P CANCEL ERR", err);
                                }
                            }
                        });
                    }
                    
                    commsChannel.send({
                        type: 'broadcast',
                        event: 'cancel_sos',
                        payload: { user: commsUser, msgId }
                    });
                    
                    // Cleanup locally
                    if (window.eventMarkers) {
                        window.eventMarkers = window.eventMarkers.filter(marker => {
                            const popup = marker.getPopup();
                            if (popup && popup.getContent() === 'S.O.S.: ' + commsUser.callsign) {
                                if (typeof commsMapInstance !== 'undefined' && commsMapInstance && commsMapInstance.hasLayer(marker)) commsMapInstance.removeLayer(marker);
                                return false;
                            }
                            return true;
                        });
                    }
                    
                    // Force the local Team Tracker marker back to normal immediately
                    if (typeof teamMarkers !== 'undefined' && teamMarkers[commsUser.id]) {
                        teamMarkers[commsUser.id]._isDistress = false;
                        // It will visually update on the next Presence Sync (which we trigger below)
                    }
                }
            }
            
            // Also update Presence so roster and tooltips turn red/normal
            if (window.sosTrackTimeout) clearTimeout(window.sosTrackTimeout);
            window.sosTrackTimeout = setTimeout(() => {
                if (commsChannel && commsUser) {
                    commsChannel.track({ 
                        online_at: new Date().toISOString(),
                        location: window.myLatestCoords || null,
                        user: commsUser,
                        distress: window.isDistressActive,
                        dutyStatus: window.myDutyStatus || null
                    });
                }
            }, 500);
        };

        if (sosBtn) sosBtn.onclick = toggleDistress;
        if (sosToggle) sosToggle.onclick = toggleDistress;
    }

    window.activeSquadRegistry = window.activeSquadRegistry || {};

    window.registerSquadMember = function(userObj, location = null, dutyStatus = '', distress = false) {
        if (!userObj || !userObj.id) return;
        const uid = userObj.id;
        
        const existing = window.activeSquadRegistry[uid] || {};
        window.activeSquadRegistry[uid] = {
            user: userObj,
            location: location || existing.location || null,
            dutyStatus: (dutyStatus !== undefined && dutyStatus !== null && dutyStatus !== '') ? dutyStatus : (existing.dutyStatus || ''),
            distress: distress !== undefined ? distress : (existing.distress || false),
            lastSeen: Date.now()
        };
        updateTeamRoster(window.latestPresenceState || {});
        updateTeamMarkers(window.latestPresenceState || {});
    };

    function updateTeamRoster(state) {
        window.latestPresenceState = state || {};
        const roster = document.getElementById('team-roster');
        if (!roster) return;
        roster.innerHTML = '';
        
        // 1. Ingest all presence records into squad registry keyed by user id
        Object.keys(state || {}).forEach(presenceKey => {
            const presences = state[presenceKey];
            if (presences && presences.length > 0) {
                const sorted = [...presences].sort((a,b) => (new Date(b.online_at).getTime() || 0) - (new Date(a.online_at).getTime() || 0));
                const p = sorted[0];
                if (p && p.user && p.user.id) {
                    const uid = p.user.id;
                    const existing = window.activeSquadRegistry[uid] || {};
                    window.activeSquadRegistry[uid] = {
                        user: p.user,
                        location: p.location || existing.location || null,
                        dutyStatus: p.dutyStatus || existing.dutyStatus || '',
                        distress: p.distress !== undefined ? p.distress : (existing.distress || false),
                        lastSeen: Date.now()
                    };
                }
            }
        });

        // 2. Always ensure local operator is in squad registry
        if (commsUser && commsUser.callsign) {
            const myCall = commsUser.callsign.trim().toUpperCase();
            const existing = window.activeSquadRegistry[myCall] || {};
            window.activeSquadRegistry[myCall] = {
                user: commsUser,
                location: window.myLatestCoords || existing.location || null,
                dutyStatus: window.myDutyStatus || existing.dutyStatus || '',
                distress: window.isDistressActive || false,
                lastSeen: Date.now()
            };
        }

        // 3. Render all active members (retained if seen within last 30 minutes)
        const now = Date.now();
        const seenCallsigns = new Set();
        const myCall = (commsUser?.callsign || '').trim().toUpperCase();
        
        // Local user first, then teammates alphabetically
        const sortedCallsigns = Object.keys(window.activeSquadRegistry).sort((a, b) => {
            if (a === myCall) return -1;
            if (b === myCall) return 1;
            return a.localeCompare(b);
        });

        sortedCallsigns.forEach(callKey => {
            const member = window.activeSquadRegistry[callKey];
            if (member && member.user && (now - (member.lastSeen || 0) < 1800000)) {
                const normCall = (member.user.callsign || callKey).trim().toUpperCase();
                if (!seenCallsigns.has(normCall)) {
                    seenCallsigns.add(normCall);
                    const tag = document.createElement('span');
                    const statusIcon = member.dutyStatus ? ` <span class="font-bold text-amber-300 ml-0.5">${member.dutyStatus}</span>` : '';
                    const roleLabel = member.user.role || 'OP';
                    
                    if (member.distress) {
                        tag.className = 'bg-red-950/80 border border-red-500/50 text-red-400 px-1.5 py-0.5 rounded text-[7px] font-black uppercase flex items-center gap-1 animate-pulse';
                        tag.innerHTML = `<span class="w-1 h-1 rounded-full bg-red-500 animate-pulse"></span> ${normCall} [${roleLabel}]${statusIcon}`;
                    } else {
                        tag.className = 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 px-1.5 py-0.5 rounded text-[7px] font-black uppercase flex items-center gap-1';
                        tag.innerHTML = `<span class="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span> ${normCall} [${roleLabel}]${statusIcon}`;
                    }
                    roster.appendChild(tag);
                }
            }
        });
    }

    function updateTeamMarkers(state) {
        if (!commsMapInstance) return;
        const currentActiveCallsigns = new Set();
        
        // Collect all members with known location
        const membersWithLoc = [];
        const seenLocCallsigns = new Set();

        Object.keys(window.activeSquadRegistry || {}).forEach(callKey => {
            const m = window.activeSquadRegistry[callKey];
            if (m && m.user && m.location && m.location.lat && m.location.lng) {
                const normCall = (m.user.callsign || callKey).trim().toUpperCase();
                if (!seenLocCallsigns.has(normCall)) {
                    seenLocCallsigns.add(normCall);
                    membersWithLoc.push(m);
                }
            }
        });

        // Group members by geographic proximity to detect identical/overlapping coordinates
        const coordGroups = {};
        membersWithLoc.forEach(m => {
            const key = `${m.location.lat.toFixed(4)}_${m.location.lng.toFixed(4)}`;
            if (!coordGroups[key]) coordGroups[key] = [];
            coordGroups[key].push(m);
        });

        membersWithLoc.forEach(m => {
            const normCall = (m.user.callsign || '').trim().toUpperCase();
            currentActiveCallsigns.add(normCall);
            const myCall = (commsUser?.callsign || '').trim().toUpperCase();
            const isMe = normCall === myCall;

            const bgColor = isMe ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-blue-500 shadow-[0_0_10px_#3b82f6]';

            const icon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div class="relative w-3.5 h-3.5 flex items-center justify-center"><div class="absolute w-full h-full rounded-full ${bgColor}"></div><div class="relative w-3.5 h-3.5 ${bgColor} border-2 border-white rounded-full flex items-center justify-center text-[5px] text-white font-black"></div></div>`,
                iconSize: [14, 14]
            });

            const dutyStr = m.dutyStatus ? ` '${m.dutyStatus}'` : '';
            const tooltipText = `${normCall} [${m.user.role || 'OP'}]${dutyStr}`;
            const tooltipClass = 'tactical-tooltip';

            // Jitter / Dispersion offset if teammates are at the exact same location (e.g. testing in the same room)
            let renderLat = m.location.lat;
            let renderLng = m.location.lng;
            const key = `${m.location.lat.toFixed(4)}_${m.location.lng.toFixed(4)}`;
            const group = coordGroups[key] || [];
            if (group.length > 1) {
                const idx = group.findIndex(g => (g.user.callsign || '').trim().toUpperCase() === normCall);
                const angle = idx * (2 * Math.PI / group.length);
                // Offset by ~5 meters so badges and dots do not overlap
                renderLat += 0.000045 * Math.sin(angle);
                renderLng += 0.000055 * Math.cos(angle);
            }

            const latStr = m.location.lat.toFixed(5);
            const lngStr = m.location.lng.toFixed(5);
            const popupHtml = `
                <div class="text-[10px] font-mono text-center bg-slate-900 text-white p-1 rounded border border-slate-700">
                    <b>${normCall}</b><br>
                    <button onclick="alert('GPS: ${latStr}, ${lngStr}')" class="mt-1 bg-blue-900 hover:bg-blue-700 text-blue-200 px-2 py-0.5 rounded border border-blue-500 cursor-pointer">SHOW GPS</button>
                </div>
            `;

            if (!teamMarkers[normCall]) {
                teamMarkers[normCall] = L.marker([renderLat, renderLng], { icon: icon }).addTo(commsMapInstance);
                teamMarkers[normCall].bindTooltip(tooltipText, { permanent: true, direction: 'top', className: tooltipClass, interactive: false });
                teamMarkers[normCall].bindPopup(popupHtml);
            } else {
                teamMarkers[normCall].setLatLng([renderLat, renderLng]);
                teamMarkers[normCall].setTooltipContent(tooltipText);
                teamMarkers[normCall].setPopupContent(popupHtml);
            }
        });

        // Remove markers for disconnected users
        Object.keys(teamMarkers).forEach(callKey => {
            if (!currentActiveCallsigns.has(callKey)) {
                try { commsMapInstance.removeLayer(teamMarkers[callKey]); } catch(e){}
                delete teamMarkers[callKey];
            }
        });
    }

    // HELPER: LOAD NOTE BACK TO EDITOR
    window.loadNoteBackToEditor = function(item) {
        const modal = document.getElementById('remarks-modal');
        const titleInput = document.getElementById('remarks-title-input');
        const textInput = document.getElementById('remarks-input');
        const counter = document.getElementById('remarks-counter');

        if (!modal || !titleInput || !textInput) return;

        titleInput.value = item.remarksTitle || '';
        textInput.value = item.remarksText || '';
        if (counter) counter.textContent = `${textInput.value.length}/500`;

        modal.classList.remove('hidden');
        textInput.focus();
        
        // Ensure user is dropped back to the main dashboard
        document.querySelectorAll('.dash-panel.is-maximized').forEach(el => {
            window.toggleFullscreen(el.id);
        });
        
        window.pushTacLog(`NOTE LOADED: ${item.remarksTitle || 'SECURE NOTE'}`, "INFO");
        if (window.lucide) window.lucide.createIcons();
    };

    // --- REMARKS NOTEPAD LOGIC ---
    {
    // --- FLOATING CALCULATOR LOGIC --- (restored inline; ES module was loading too late)
    {
        const calcModal = document.getElementById('calc-modal');
        const calcCloseBtn = document.getElementById('calc-close-btn');

        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.calc-toggle-btn');
            if (btn && calcModal) {
                e.preventDefault();
                calcModal.classList.toggle('hidden');
            }
        });

        if (calcCloseBtn) {
            calcCloseBtn.addEventListener('click', () => calcModal.classList.add('hidden'));
        }

        let isCalcDragging = false;
        let cStartX, cStartY, cInitialLeft, cInitialTop;
        const calcDragHeader = document.getElementById('calc-drag-header');

        if (calcDragHeader && calcModal) {
            const startDrag = (e) => {
                if (e.target.closest('#calc-close-btn') || e.target.closest('button')) return;
                isCalcDragging = true;
                const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
                const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
                cStartX = clientX; cStartY = clientY;
                const rect = calcModal.getBoundingClientRect();
                cInitialLeft = rect.left; cInitialTop = rect.top;
                document.addEventListener('mousemove', doDrag);
                document.addEventListener('touchmove', doDrag, { passive: false });
                document.addEventListener('mouseup', stopDrag);
                document.addEventListener('touchend', stopDrag);
            };
            const doDrag = (e) => {
                if (!isCalcDragging) return;
                e.preventDefault();
                const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
                const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
                const dx = clientX - cStartX; const dy = clientY - cStartY;
                let newLeft = cInitialLeft + dx; let newTop = cInitialTop + dy;
                if (newTop < 48) newTop = 48;
                const maxLeft = window.innerWidth - calcModal.offsetWidth;
                if (newLeft < 0) newLeft = 0;
                if (newLeft > maxLeft) newLeft = maxLeft;
                const maxTop = window.innerHeight - calcModal.offsetHeight;
                if (newTop > maxTop) newTop = maxTop;
                calcModal.style.left = `${newLeft}px`; calcModal.style.top = `${newTop}px`;
                calcModal.style.right = 'auto'; calcModal.style.bottom = 'auto';
            };
            const stopDrag = () => {
                isCalcDragging = false;
                document.removeEventListener('mousemove', doDrag);
                document.removeEventListener('touchmove', doDrag);
                document.removeEventListener('mouseup', stopDrag);
                document.removeEventListener('touchend', stopDrag);
            };
            calcDragHeader.addEventListener('mousedown', startDrag);
            calcDragHeader.addEventListener('touchstart', startDrag, { passive: false });
        }
    }

    const remarksModal = document.getElementById('remarks-modal');
    const remarksCloseBtn = document.getElementById('remarks-close-btn');
    const remarksTitleInput = document.getElementById('remarks-title-input');
    const remarksInput = document.getElementById('remarks-input');
    const remarksCounter = document.getElementById('remarks-counter');
    const remarksSaveBtn = document.getElementById('remarks-save-btn');

    // Use event delegation for bulletproof button clicks anywhere in the app
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.remarks-toggle-btn');
        if (btn && remarksModal) {
            e.preventDefault();
            remarksModal.classList.toggle('hidden');
            if (!remarksModal.classList.contains('hidden') && remarksInput) {
                remarksInput.focus();
            }
        }
    });

        remarksCloseBtn.addEventListener('click', () => remarksModal.classList.add('hidden'));

        remarksInput.addEventListener('input', () => {
            remarksCounter.textContent = `${remarksInput.value.length}/500`;
        });

        // Initialize Drag and Drop for Remarks Notepad Modal (Mouse & Touch)
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;
        const dragHeader = remarksModal.querySelector('.cursor-move');
        
        if (dragHeader) {
            const startDrag = (e) => {
                if (e.target.closest('#remarks-close-btn') || e.target.closest('input') || e.target.closest('textarea')) return;
                
                isDragging = true;
                const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
                const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
                
                startX = clientX;
                startY = clientY;
                
                const rect = remarksModal.getBoundingClientRect();
                initialLeft = rect.left;
                initialTop = rect.top;
                
                remarksModal.style.right = 'auto';
                remarksModal.style.left = `${initialLeft}px`;
                remarksModal.style.top = `${initialTop}px`;
                
                if (e.type === 'mousedown') {
                    document.addEventListener('mousemove', drag);
                    document.addEventListener('mouseup', stopDrag);
                } else {
                    document.addEventListener('touchmove', drag, { passive: false });
                    document.addEventListener('touchend', stopDrag);
                }
            };
            
            const drag = (e) => {
                if (!isDragging) return;
                if (e.cancelable) e.preventDefault();
                
                const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
                const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
                
                const dx = clientX - startX;
                const dy = clientY - startY;
                
                let newLeft = initialLeft + dx;
                let newTop = initialTop + dy;
                
                // Prevent dragging over the dashboard header (48px height)
                if (newTop < 48) newTop = 48;
                
                // Prevent dragging off screen horizontally
                const maxLeft = window.innerWidth - remarksModal.offsetWidth;
                if (newLeft < 0) newLeft = 0;
                if (newLeft > maxLeft) newLeft = maxLeft;
                
                // Prevent dragging off screen vertically
                const maxTop = window.innerHeight - remarksModal.offsetHeight;
                if (newTop > maxTop) newTop = maxTop;
                
                remarksModal.style.left = `${newLeft}px`;
                remarksModal.style.top = `${newTop}px`;
            };
            
            const stopDrag = () => {
                isDragging = false;
                document.removeEventListener('mousemove', drag);
                document.removeEventListener('mouseup', stopDrag);
                document.removeEventListener('touchmove', drag);
                document.removeEventListener('touchend', stopDrag);
            };
            
            dragHeader.addEventListener('mousedown', startDrag);
            dragHeader.addEventListener('touchstart', startDrag, { passive: true });
        }

        remarksSaveBtn.addEventListener('click', async () => {
            const text = remarksInput.value.trim();
            if (!text) return;
            const title = remarksTitleInput.value.trim().toUpperCase() || 'SECURE NOTE';

            // Render to canvas to create image for Vault
            const canvas = document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 300;
            const ctx = canvas.getContext('2d');

            // Background
            ctx.fillStyle = '#0f172a'; // dark slate
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.textAlign = 'center';

            // Header
            ctx.fillStyle = '#eab308'; // yellow-500
            ctx.font = 'bold 16px monospace';
            ctx.fillText(`ReMarks - ${title}`, 200, 40);
            
            // Timestamp
            ctx.fillStyle = '#64748b'; // slate-500
            ctx.font = '10px monospace';
            ctx.fillText(new Date().toLocaleString(), 200, 60);

            // Divider
            ctx.strokeStyle = '#1e293b';
            ctx.beginPath();
            ctx.moveTo(40, 75);
            ctx.lineTo(360, 75);
            ctx.stroke();

            // Text Wrap & Render
            ctx.textAlign = 'left';
            ctx.fillStyle = '#fef08a'; // yellow-200
            ctx.font = '12px monospace';
            
            let y = 95;
            const maxWidth = 340;
            const x = 30; // Left padding

            const paragraphs = text.split('\n');
            for (let p = 0; p < paragraphs.length; p++) {
                const words = paragraphs[p].split(' ');
                let line = '';
                for (let n = 0; n < words.length; n++) {
                    let word = words[n];
                    
                    // Force-break massive strings that exceed the canvas width on their own
                    while (ctx.measureText(word).width > maxWidth) {
                        let chunk = '';
                        for (let c = 0; c < word.length; c++) {
                            if (ctx.measureText(chunk + word[c] + '-').width > maxWidth) break;
                            chunk += word[c];
                        }
                        if (line !== '') {
                            ctx.fillText(line.trim(), x, y);
                            y += 18;
                            line = '';
                        }
                        ctx.fillText(chunk + '-', x, y);
                        y += 18;
                        word = word.substring(chunk.length);
                    }

                    const testLine = line + word + ' ';
                    if (ctx.measureText(testLine).width > maxWidth && line !== '') {
                        ctx.fillText(line.trim(), x, y);
                        line = word + ' ';
                        y += 18;
                    } else {
                        line = testLine;
                    }
                }
                if (line.trim() !== '') {
                    ctx.fillText(line.trim(), x, y);
                    y += 18;
                }
            }

            const base64Image = canvas.toDataURL('image/jpeg', 0.9);
            
            await saveIntelSnapshot('REMARKS', base64Image, { 
                remarksTitle: title, 
                remarksText: text 
            });
            
            // Auto-load to Active Viewer
            if (vaultCache.length > 0) {
                selectVaultItem(vaultCache[0]);
            }
            
            remarksInput.value = '';
            if (remarksTitleInput) remarksTitleInput.value = '';
            remarksCounter.textContent = '0/500';
            remarksModal.classList.add('hidden');
            window.pushTacLog("REMARKS NOTE SAVED TO VAULT", "SUCCESS");
        });
    }

// ═══════════════════════════════════════════════════════════
// TACTICAL WHITEBOARD — Floating Drawing Board
// ═══════════════════════════════════════════════════════════
(function initWhiteboard() {
    const wbModal = document.getElementById('whiteboard-modal');
    if (!wbModal) return;
    const wbCanvas = document.getElementById('wb-canvas');
    const wbGridCanvas = document.getElementById('wb-grid-canvas');
    const wbTitle = document.getElementById('wb-title');
    const wbNotes = document.getElementById('wb-notes');
    if (!wbCanvas) return;

    const ctx = wbCanvas.getContext('2d');
    let isDrawing = false;
    let currentColor = '#ffffff';
    let currentSize = 4;
    let isEraser = false;
    let strokeHistory = []; // Array of ImageData snapshots for undo
    let gridVisible = false;

    // --- Canvas Sizing ---
    function resizeCanvas() {
        const container = wbCanvas.parentElement;
        const w = container.clientWidth;
        const h = container.clientHeight;
        // Save current drawing
        const imageData = ctx.getImageData(0, 0, wbCanvas.width, wbCanvas.height);
        wbCanvas.width = w;
        wbCanvas.height = h;
        // Restore drawing
        ctx.putImageData(imageData, 0, 0);
        // Resize grid canvas too
        if (wbGridCanvas) {
            wbGridCanvas.width = w;
            wbGridCanvas.height = h;
            if (gridVisible) drawGrid();
        }
    }

    // --- Toggle Visibility ---
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.whiteboard-toggle-btn');
        if (btn) {
            e.preventDefault();
            wbModal.classList.toggle('hidden');
            if (!wbModal.classList.contains('hidden')) {
                setTimeout(() => {
                    resizeCanvas();
                    if (window.lucide) window.lucide.createIcons();
                }, 50);
            }
        }
    });

    // --- Drag Logic ---
    const dragHeader = document.getElementById('wb-drag-header');
    let isDragging = false, startX, startY, initialLeft, initialTop;
    const startDrag = (e) => {
        if (e.target.closest('button, input')) return;
        isDragging = true;
        const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
        startX = clientX; startY = clientY;
        const rect = wbModal.getBoundingClientRect();
        initialLeft = rect.left; initialTop = rect.top;
        wbModal.style.right = 'auto'; wbModal.style.bottom = 'auto';
        wbModal.style.left = initialLeft + 'px'; wbModal.style.top = initialTop + 'px';
        document.addEventListener('mousemove', doDrag);
        document.addEventListener('touchmove', doDrag, { passive: false });
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchend', stopDrag);
    };
    const doDrag = (e) => {
        if (!isDragging) return;
        if (e.cancelable) e.preventDefault();
        const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
        let newLeft = initialLeft + (clientX - startX);
        let newTop = initialTop + (clientY - startY);
        if (newTop < 48) newTop = 48;
        const maxLeft = window.innerWidth - wbModal.offsetWidth;
        if (newLeft < 0) newLeft = 0;
        if (newLeft > maxLeft) newLeft = maxLeft;
        const maxTop = window.innerHeight - wbModal.offsetHeight;
        if (newTop > maxTop) newTop = maxTop;
        wbModal.style.left = newLeft + 'px'; wbModal.style.top = newTop + 'px';
    };
    const stopDrag = () => {
        isDragging = false;
        document.removeEventListener('mousemove', doDrag);
        document.removeEventListener('touchmove', doDrag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('touchend', stopDrag);
    };
    if (dragHeader) {
        dragHeader.addEventListener('mousedown', startDrag);
        dragHeader.addEventListener('touchstart', startDrag, { passive: false });
    }

    // --- Drawing Engine ---
    function getPos(e) {
        const rect = wbCanvas.getBoundingClientRect();
        const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    }
    function saveState() {
        if (strokeHistory.length >= 30) strokeHistory.shift();
        strokeHistory.push(ctx.getImageData(0, 0, wbCanvas.width, wbCanvas.height));
    }
    const onDrawStart = (e) => {
        if (e.target.closest('button, input, textarea, select')) return;
        if (e.cancelable) e.preventDefault();
        isDrawing = true;
        saveState();
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.strokeStyle = isEraser ? '#0f172a' : currentColor; // slate-900 bg for eraser
        ctx.lineWidth = isEraser ? currentSize * 3 : currentSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    };
    const onDrawMove = (e) => {
        if (!isDrawing) return;
        if (e.cancelable) e.preventDefault();
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    };
    const onDrawEnd = () => { isDrawing = false; };
    wbCanvas.addEventListener('mousedown', onDrawStart);
    wbCanvas.addEventListener('mousemove', onDrawMove);
    wbCanvas.addEventListener('mouseup', onDrawEnd);
    wbCanvas.addEventListener('mouseleave', onDrawEnd);
    wbCanvas.addEventListener('touchstart', onDrawStart, { passive: false });
    wbCanvas.addEventListener('touchmove', onDrawMove, { passive: false });
    wbCanvas.addEventListener('touchend', onDrawEnd);
    wbCanvas.addEventListener('touchcancel', onDrawEnd);

    // --- Color Palette ---
    const palette = document.getElementById('wb-color-palette');
    if (palette) {
        palette.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-color]');
            if (!btn) return;
            currentColor = btn.dataset.color;
            isEraser = false;
            document.getElementById('wb-eraser-btn')?.classList.remove('border-cyan-500', 'text-cyan-300');
            palette.querySelectorAll('button').forEach(b => b.style.borderColor = '#475569');
            btn.style.borderColor = '#fff';
        });
    }

    // --- Size Buttons ---
    const sizeBtns = document.getElementById('wb-size-btns');
    if (sizeBtns) {
        sizeBtns.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-size]');
            if (!btn) return;
            currentSize = parseInt(btn.dataset.size);
            sizeBtns.querySelectorAll('button').forEach(b => {
                b.classList.remove('text-cyan-300', 'bg-cyan-950', 'border-cyan-500');
                b.classList.add('text-slate-300', 'bg-slate-800', 'border-slate-600');
            });
            btn.classList.remove('text-slate-300', 'bg-slate-800', 'border-slate-600');
            btn.classList.add('text-cyan-300', 'bg-cyan-950', 'border-cyan-500');
        });
    }

    // --- Undo ---
    document.getElementById('wb-undo-btn')?.addEventListener('click', () => {
        if (strokeHistory.length === 0) return;
        ctx.putImageData(strokeHistory.pop(), 0, 0);
    });

    // --- Clear All ---
    document.getElementById('wb-clear-all-btn')?.addEventListener('click', () => {
        ctx.clearRect(0, 0, wbCanvas.width, wbCanvas.height);
        strokeHistory = [];
        if (wbTitle) wbTitle.value = '';
        if (wbNotes) wbNotes.value = '';
    });

    // --- Eraser Toggle ---
    document.getElementById('wb-eraser-btn')?.addEventListener('click', (e) => {
        isEraser = !isEraser;
        const eraserBtn = e.currentTarget;
        if (isEraser) {
            eraserBtn.classList.add('border-cyan-500', 'text-cyan-300');
            eraserBtn.classList.remove('border-slate-600', 'text-slate-400');
            palette?.querySelectorAll('button').forEach(b => b.style.borderColor = '#475569');
        } else {
            eraserBtn.classList.remove('border-cyan-500', 'text-cyan-300');
            eraserBtn.classList.add('border-slate-600', 'text-slate-400');
        }
    });

    // --- Grid Toggle ---
    function drawGrid() {
        if (!wbGridCanvas) return;
        const gCtx = wbGridCanvas.getContext('2d');
        gCtx.clearRect(0, 0, wbGridCanvas.width, wbGridCanvas.height);
        gCtx.strokeStyle = 'rgba(100,116,139,0.3)';
        gCtx.lineWidth = 0.5;
        const step = 20;
        for (let x = step; x < wbGridCanvas.width; x += step) {
            gCtx.beginPath(); gCtx.moveTo(x, 0); gCtx.lineTo(x, wbGridCanvas.height); gCtx.stroke();
        }
        for (let y = step; y < wbGridCanvas.height; y += step) {
            gCtx.beginPath(); gCtx.moveTo(0, y); gCtx.lineTo(wbGridCanvas.width, y); gCtx.stroke();
        }
    }
    document.getElementById('wb-grid-toggle')?.addEventListener('click', () => {
        gridVisible = !gridVisible;
        if (wbGridCanvas) {
            if (gridVisible) { wbGridCanvas.classList.remove('hidden'); drawGrid(); }
            else { wbGridCanvas.classList.add('hidden'); }
        }
    });

    // --- Composite & Save to Vault ---
    function compositeWhiteboard() {
        const title = wbTitle?.value?.trim() || 'UNTITLED BOARD';
        const notes = wbNotes?.value?.trim() || '';
        // Create composite canvas
        const comp = document.createElement('canvas');
        const headerH = 40;
        const footerH = notes ? 50 : 0;
        comp.width = wbCanvas.width;
        comp.height = wbCanvas.height + headerH + footerH;
        const cCtx = comp.getContext('2d');
        // Header background
        cCtx.fillStyle = '#0c4a6e';
        cCtx.fillRect(0, 0, comp.width, headerH);
        cCtx.fillStyle = '#22d3ee';
        cCtx.font = 'bold 14px monospace';
        cCtx.textBaseline = 'middle';
        cCtx.fillText('⊞ WHITEBOARD: ' + title.toUpperCase(), 10, headerH / 2);
        // Timestamp
        cCtx.fillStyle = '#94a3b8';
        cCtx.font = '10px monospace';
        cCtx.textAlign = 'right';
        cCtx.fillText(new Date().toLocaleString(), comp.width - 10, headerH / 2);
        cCtx.textAlign = 'left';
        // Canvas drawing
        cCtx.drawImage(wbCanvas, 0, headerH);
        // Footer with notes
        if (notes) {
            cCtx.fillStyle = '#1e293b';
            cCtx.fillRect(0, headerH + wbCanvas.height, comp.width, footerH);
            cCtx.fillStyle = '#cbd5e1';
            cCtx.font = '11px monospace';
            cCtx.fillText('📝 ' + notes.substring(0, 120), 10, headerH + wbCanvas.height + 20);
            if (notes.length > 120) cCtx.fillText('   ' + notes.substring(120, 240), 10, headerH + wbCanvas.height + 36);
        }
        return { dataUrl: comp.toDataURL('image/png'), title };
    }

    document.getElementById('wb-save-vault-btn')?.addEventListener('click', async () => {
        const { dataUrl, title } = compositeWhiteboard();
        if (typeof window.saveIntelSnapshot === 'function') {
            await window.saveIntelSnapshot('WHITEBOARD: ' + title, dataUrl, { type: 'whiteboard' });
            window.pushTacLog?.('WHITEBOARD "' + title + '" saved to Intel Vault.', 'INTEL');
            alert('✅ Whiteboard saved to Intel Vault!');
        } else {
            alert('Intel Vault not available.');
        }
    });

    // --- Send to Chat ---
    document.getElementById('wb-send-chat-btn')?.addEventListener('click', async () => {
        const { dataUrl, title } = compositeWhiteboard();
        if (typeof window.saveIntelSnapshot === 'function') {
            const entryId = Date.now();
            await window.saveIntelSnapshot('WHITEBOARD: ' + title, dataUrl, { type: 'whiteboard', id: entryId });
            if (typeof window.sendVaultItemToChat === 'function') {
                await window.sendVaultItemToChat(entryId.toString());
                window.pushTacLog?.('WHITEBOARD "' + title + '" transmitted to team chat.', 'INTEL');
                alert('✅ Whiteboard saved & sent to team chat!');
            } else {
                alert('Comms not connected. Whiteboard saved to Vault only.');
            }
        } else {
            alert('Intel Vault not available.');
        }
    });

    // --- Window resize handler ---
    window.addEventListener('resize', () => {
        if (!wbModal.classList.contains('hidden')) resizeCanvas();
    });
    // --- Regrade from Vault ---
    window.loadWhiteboardImage = function(dataUrl, title) {
        if (!wbModal) return;
        wbModal.classList.remove('hidden');
        setTimeout(() => {
            resizeCanvas();
            if (wbTitle) wbTitle.value = title || 'VAULT IMPORT';
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, wbCanvas.width, wbCanvas.height);
                // Draw the incoming image onto the canvas
                ctx.drawImage(img, 0, 0, wbCanvas.width, wbCanvas.height);
                strokeHistory = []; // Reset undo history for the new import
            };
            img.src = dataUrl;
        }, 50);
    };

})();

    // --- MISSION BRIEFING LOGIC ---
    {
        const modal = document.getElementById('missionBriefingModal');
        const openBtn = document.getElementById('openBriefingModalBtn');
        const closeBtn = document.getElementById('closeBriefingBtn');
        const saveInvBtn = document.getElementById('briefing-save-inventory-btn');
        const clearBtn = document.getElementById('briefing-clear-btn');
        
        const missionNameInput = document.getElementById('briefing-mission-name');
        const commanderInput = document.getElementById('briefing-commander');
        const timestampDisplay = document.getElementById('briefing-timestamp');
        const assignmentInput = document.getElementById('briefing-assignment-text');
        const debriefInput = document.getElementById('briefing-debrief-text');
        
        function getBriefingInventory() {
            return JSON.parse(localStorage.getItem('rangeCardBriefingInventory') || '{}');
        }
        function saveBriefingInventory(inv) {
            localStorage.setItem('rangeCardBriefingInventory', JSON.stringify(inv));
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if(confirm('Clear entire briefing form?')) {
                    missionNameInput.value = '';
                    commanderInput.value = '';
                    assignmentInput.value = '';
                    debriefInput.value = '';
                }
            });
        }
        
        if (openBtn && modal) {
            openBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Set current timestamp
                const now = new Date();
                timestampDisplay.textContent = now.toISOString().replace('T', ' ').substring(0, 19) + 'Z';
                modal.classList.remove('hidden');
                
                if(window.updateBriefingList) window.updateBriefingList();
                
                // Focus assignment block if empty
                if (!assignmentInput.value) assignmentInput.focus();
            });
        }
        
        if (closeBtn && modal) {
            closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
        }
        
        window.loadBriefingBackToEditor = function(item) {
            if (!modal) return;
            missionNameInput.value = item.missionName || '';
            commanderInput.value = item.commander || '';
            assignmentInput.value = item.assignment || '';
            debriefInput.value = item.debrief || '';
            timestampDisplay.textContent = item.formTimestamp || '--:--:--';
            
            modal.classList.remove('hidden');
            debriefInput.focus();
            window.pushTacLog(`MISSION BRIEFING LOADED: ${item.missionName || 'UNKNOWN'}`, "INFO");
            
            // Bring user out of vault and back to HUD
            const panel = document.getElementById('panel-vault');
            if (panel) {
                if (panel.classList.contains('is-maximized')) {
                    window.toggleFullscreen('panel-vault');
                }
                panel.classList.add('hidden');
            }
        };

        window.loadBriefingBackToEditorById = function(id) {
            const item = vaultCache.find(i => i.id == id);
            if(item) window.loadBriefingBackToEditor(item);
        };
        
        window.getVaultItemById = function(id) {
            return vaultCache.find(i => i.id == id);
        };
        
        window.loadNoteBackToEditorById = function(id) {
            const item = vaultCache.find(i => i.id == id);
            if(item) window.loadNoteBackToEditor(item);
        };
        
        window.loadRouteToMapById = function(id) {
            const item = vaultCache.find(i => i.id == id);
            if(item && item.routeTracker) window.loadRouteToMap(item.routeTracker);
        };

        window.loadVideoBackToPlayerById = function(id) {
            const item = vaultCache.find(i => i.id == id);
            if(item) window.loadVideoBackToPlayer(item);
        };

        window.loadSnapshotBackToViewer = function(item) {
            if (!item || !item.image) return;

            const panel = document.getElementById('panel-vault');
            if (panel && panel.classList.contains('is-maximized')) {
                window.toggleFullscreen('panel-vault');
            }

            const videoEl = document.getElementById('surveillance-stream');
            let imgViewer = document.getElementById('surveillance-snapshot-viewer');
            if (!imgViewer) {
                const container = document.getElementById('surveillance-container');
                if (container) {
                    imgViewer = document.createElement('img');
                    imgViewer.id = 'surveillance-snapshot-viewer';
                    imgViewer.className = 'w-full h-full object-contain hidden z-0 absolute inset-0';
                    container.insertBefore(imgViewer, videoEl);
                }
            }

            const placeholder = document.getElementById('surveillance-placeholder');
            const hud = document.getElementById('surveillance-hud');
            const killBtn = document.getElementById('feed-kill-btn');
            const survFooter = document.getElementById('surveillance-footer');
            const recStartBtn = document.getElementById('surveillance-record-start-btn');
            const recStopBtn = document.getElementById('surveillance-record-stop-btn');
            const captureBtn = document.getElementById('surveillance-capture-btn');
            const label = document.getElementById('feed-label-source');

            if (typeof stopFeed === 'function') {
                stopFeed();
            }

            if (imgViewer) {
                imgViewer.src = item.image;
                imgViewer.classList.remove('hidden');
            }
            
            const _survFooter = document.getElementById('surveillance-footer');
            if (_survFooter) _survFooter.classList.remove('hidden');
            
            const _killBtn = document.getElementById('feed-kill-btn');
            if (_killBtn) _killBtn.classList.remove('hidden');

            if (videoEl) {
                videoEl.src = "";
                videoEl.classList.add('hidden');
            }
            if (placeholder) placeholder.classList.add('hidden');
            if (hud) hud.classList.add('hidden');
            
            if(survFooter) survFooter.classList.remove('hidden');
            
            if(captureBtn) captureBtn.classList.add('hidden');
            if(recStartBtn) recStartBtn.classList.add('hidden');
            if(recStopBtn) recStopBtn.classList.add('hidden');
            
            const flipBtn = document.getElementById('feed-switch-cam-btn');
            if(flipBtn) flipBtn.classList.add('hidden');
            
            const hudToggleBtn = document.getElementById('feed-hud-toggle-btn');
            if(hudToggleBtn) hudToggleBtn.classList.add('hidden');

            if(killBtn) {
                killBtn.classList.remove('hidden');
            }
            if(label) label.textContent = `VIEWING INTEL: ${item.label || 'SNAPSHOT'}`;
        };

    function generateTRCCardSVGDataUrl(item) {
        const c = item.contact || {};
        const biz = (c.bizname || 'TACTICAL RANGE CARD').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const author = (item.author || c.author || 'OPERATOR').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const unit = (c.unit || 'FIELD UNIT').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const phone = (c.phone || '--').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const comms = (c.comms || '--').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const web = (c.web || '--').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const details = (c.details || 'OPERATIONAL CONTACT').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        const photoUrl = item.image || c.cardImageUrl || '';
        const cardImgUrl = c.cardImageUrl || '';

        const photoEmbed = photoUrl ? `<image href="${photoUrl}" x="50" y="100" width="380" height="240" preserveAspectRatio="xMidYMid slice" clip-path="url(#photoClip)"/>` : '';
        const cardImgEmbed = (cardImgUrl && cardImgUrl !== photoUrl) ? `<image href="${cardImgUrl}" x="470" y="100" width="380" height="240" preserveAspectRatio="xMidYMid slice" clip-path="url(#photoClip)"/>` : '';

        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="650" viewBox="0 0 900 650">
          <rect width="900" height="650" fill="#090d16"/>
          <defs>
            <pattern id="grid" width="16" height="16" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#a855f7" opacity="0.3"/>
            </pattern>
            <clipPath id="photoClip">
              <rect rx="8" width="380" height="240"/>
            </clipPath>
          </defs>
          <rect width="900" height="650" fill="url(#grid)"/>
          <rect x="20" y="20" width="860" height="610" rx="16" fill="#0b0f19" stroke="#a855f7" stroke-width="3" filter="drop-shadow(0 0 15px rgba(168,85,247,0.5))"/>
          
          <line x1="40" y1="80" x2="860" y2="80" stroke="#a855f7" stroke-width="1.5" opacity="0.5"/>
          <text x="50" y="60" fill="#c084fc" font-family="monospace" font-size="20" font-weight="900" letter-spacing="3">🛡️ TACTICAL RANGE CARD OPERATOR INTEL</text>
          <rect x="710" y="42" width="130" height="26" rx="4" fill="#064e3b" stroke="#10b981" stroke-width="1"/>
          <text x="775" y="60" fill="#34d399" font-family="monospace" font-size="11" font-weight="700" text-anchor="middle">VERIFIED CONTACT</text>
          
          <g transform="translate(0, 0)">
            ${photoEmbed}
            ${cardImgEmbed}
          </g>

          <g transform="translate(0, ${photoUrl ? '350' : '80'})">
            <text x="50" y="40" fill="#e9d5ff" font-family="sans-serif" font-size="26" font-weight="900" letter-spacing="1">${biz}</text>
            <text x="50" y="70" fill="#ffffff" font-family="sans-serif" font-size="20" font-weight="700">${author}</text>
            <text x="50" y="95" fill="#9ca3af" font-family="sans-serif" font-size="14">${unit}</text>
            
            <line x1="40" y1="115" x2="860" y2="115" stroke="#374151" stroke-width="1"/>
            <text x="50" y="145" fill="#9ca3af" font-family="monospace" font-size="14" font-weight="700">PHONE: <tspan fill="#ffffff">${phone}</tspan></text>
            <text x="340" y="145" fill="#9ca3af" font-family="monospace" font-size="14" font-weight="700">COMMS: <tspan fill="#34d399">${comms}</tspan></text>
            <text x="600" y="145" fill="#9ca3af" font-family="monospace" font-size="14" font-weight="700">WEB: <tspan fill="#60a5fa">${web}</tspan></text>
            
            <line x1="40" y1="165" x2="860" y2="165" stroke="#374151" stroke-width="1"/>
            <text x="50" y="195" fill="#d8b4fe" font-family="monospace" font-size="15" font-style="italic">Specialties: "${details}"</text>
          </g>

          <text x="450" y="615" fill="#4b5563" font-family="monospace" font-size="12" text-anchor="middle" letter-spacing="4">TACTICAL RANGE CARD SURVEILLANCE REVIEW • ALL RIGHTS RESERVED</text>
        </svg>`;

        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }

    window.loadSnapshotToViewer = function(item) {
        window.pushTacLog(`RESTORING CAPTURE: ${item.label || 'INTEL'} TO SURVEILLANCE FEED`, "SYS");
        
        const panel = document.getElementById('panel-vault');
        if (panel && panel.classList.contains('is-maximized')) {
            window.toggleFullscreen('panel-vault');
        }
        
        const videoEl = document.getElementById('surveillance-stream');
        const imgViewer = document.getElementById('surveillance-snapshot-viewer');
        const placeholder = document.getElementById('surveillance-placeholder');
        const label = document.getElementById('feed-label-source');
        const hud = document.getElementById('surveillance-hud');
        const captureBtn = document.getElementById('surveillance-capture-btn');
        const cardViewer = document.getElementById('surveillance-card-viewer');
        
        if (videoEl) videoEl.classList.add('hidden');
        if (placeholder) placeholder.classList.add('hidden');
        if (hud) hud.classList.add('hidden');
        if (captureBtn) captureBtn.classList.add('hidden');
        
        const isContactCard = item.contact || item.type === 'intel_report' || item.type === 'contact';
        const isOfficerCard = item.type === 'officer_sitrep' || item.workstationData?.type === 'officer';
        const isCasefile = item.type === 'casefile-pdf' || Boolean(item.casefileData) || (item.workstationData && item.workstationData.type === 'casefile');
        const isWsCard = item.type === 'workstation' || Boolean(item.workstationData) || ['medevac', 'scorecard', 'logistics', 'roster', 'bragboard', 'officer'].includes(item.type);

        if (isOfficerCard && cardViewer && typeof window.generateOfficerCardHTML === 'function') {
            cardViewer.innerHTML = window.generateOfficerCardHTML(item.workstationData || item);
            cardViewer.className = "w-full h-full max-h-full overflow-y-auto custom-scrollbar p-2 relative";
            if (window.lucide) window.lucide.createIcons();
            cardViewer.classList.remove('hidden');
            if (imgViewer) imgViewer.classList.add('hidden');
        } else if (isContactCard && cardViewer) {
            const c = item.contact || {};
            const trophyPhoto = item.image || item.imageUrl || item.post_image || null;
            const cardPhoto = c.cardImageUrl || item.cardImageUrl || (item.contact && item.contact.cardImageUrl) || null;

            const showTrophy = trophyPhoto;
            const showCard = (cardPhoto && cardPhoto !== trophyPhoto) ? cardPhoto : null;

            cardViewer.innerHTML = `
                <div style="background-color: #0b0f19 !important; border: 2px solid #a855f7 !important; box-shadow: 0 0 25px rgba(168,85,247,0.4) !important;" class="w-full h-full rounded-2xl p-3 sm:p-5 flex flex-col justify-between overflow-y-auto custom-scrollbar relative bg-[radial-gradient(#a855f7_0.8px,transparent_0.8px)] [background-size:8px_8px] text-left">
                    <div style="border-bottom: 1px solid rgba(168,85,247,0.4);" class="pb-2 mb-2 flex flex-wrap justify-between items-center gap-2 shrink-0">
                        <span style="color: #c084fc;" class="font-black text-xs sm:text-sm tracking-widest uppercase flex items-center gap-1.5">
                            <i data-lucide="shield-check" class="w-4 h-4 text-purple-400"></i> TACTICAL RANGE CARD OPERATOR INTEL
                        </span>
                        <div class="flex items-center gap-2">
                            <span style="background-color: #064e3b !important; color: #34d399 !important; border: 1px solid #10b981 !important;" class="font-mono text-[9px] sm:text-xs px-2 py-0.5 rounded uppercase font-bold">
                                VERIFIED CONTACT
                            </span>
                            <button onclick="event.stopPropagation(); if(window.toggleFullscreen) window.toggleFullscreen('panel-mainview');" style="background-color: #3b0764 !important; color: #d8b4fe !important; border: 1px solid #a855f7 !important;" class="font-black text-[9px] sm:text-xs px-3 py-1 rounded-full uppercase tracking-wider hover:brightness-125 transition-all flex items-center gap-1 cursor-pointer shadow-md z-30 relative" title="Toggle Maximize / Minimize">
                                <i data-lucide="maximize-2" class="w-3.5 h-3.5 text-purple-300"></i> MAX/MIN
                            </button>
                            <button onclick="event.stopPropagation(); if(window.closeSurveillanceReview) window.closeSurveillanceReview();" style="background-color: #991b1b !important; color: #ffffff !important; border: 1px solid #ef4444 !important;" class="font-black text-[9px] sm:text-xs px-3 py-1 rounded-full uppercase tracking-wider hover:brightness-125 transition-all flex items-center gap-1 cursor-pointer shadow-md z-30 relative">
                                <i data-lucide="x" class="w-3.5 h-3.5 text-white"></i> CLOSE REVIEW
                            </button>
                        </div>
                    </div>

                    ${(showTrophy || showCard) ? `
                    <div class="grid ${(showTrophy && showCard) ? 'grid-cols-2' : 'grid-cols-1'} gap-2 my-1.5 shrink-0">
                        ${showTrophy ? `
                        <div class="w-full h-24 sm:h-44 md:h-56 bg-black rounded-xl overflow-hidden border border-gray-700 flex justify-center shadow-lg">
                            <img src="${showTrophy}" class="w-full h-full object-contain">
                        </div>` : ''}
                        ${showCard ? `
                        <div class="w-full h-24 sm:h-44 md:h-56 bg-black rounded-xl overflow-hidden border border-gray-700 flex justify-center shadow-lg">
                            <img src="${showCard}" class="w-full h-full object-contain">
                        </div>` : ''}
                    </div>` : ''}

                    <div class="space-y-1 my-1 shrink-0">
                        ${c.bizname ? `<div style="color: #e9d5ff;" class="text-base sm:text-xl font-black uppercase tracking-wider">${c.bizname}</div>` : ''}
                        <div style="color: #ffffff;" class="text-sm sm:text-lg font-black uppercase tracking-wider">${item.author || c.author || 'OPERATOR'}</div>
                        ${c.unit ? `<div style="color: #9ca3af;" class="text-xs font-semibold uppercase">${c.unit}</div>` : ''}
                    </div>

                    <div style="border-top: 1px solid rgba(255,255,255,0.15);" class="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs sm:text-sm font-mono pt-2 text-gray-200 shrink-0">
                        <div><span style="color: #9ca3af;" class="font-bold">PHONE:</span> <span style="color: #ffffff;" class="font-bold">${c.phone || '--'}</span></div>
                        <div><span style="color: #9ca3af;" class="font-bold">COMMS:</span> <span style="color: #34d399;" class="font-bold">${c.comms || '--'}</span></div>
                        <div><span style="color: #9ca3af;" class="font-bold">WEB:</span> <a href="${c.web && c.web.startsWith('http') ? c.web : 'https://' + (c.web || '#')}" target="_blank" style="color: #60a5fa;" class="font-bold underline">${c.web || '--'}</a></div>
                    </div>
                    ${c.details ? `<div style="color: #d8b4fe; border-top: 1px solid rgba(255,255,255,0.15);" class="mt-1.5 text-xs sm:text-sm italic pt-1.5 shrink-0">Specialties: "${c.details}"</div>` : ''}
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            cardViewer.classList.remove('hidden');
            if (imgViewer) imgViewer.classList.add('hidden');
        } else if (imgViewer) {
            if (cardViewer) cardViewer.classList.add('hidden');
            imgViewer.src = item.image || item.data;
            imgViewer.classList.remove('hidden');
        }
        
        const survFooter = document.getElementById('surveillance-footer');
        if (survFooter) survFooter.classList.remove('hidden');

            // IMAGE REVIEW MODE: Hide all live-feed controls — image is static, they don't apply
            const _flipSnap = document.getElementById('feed-switch-cam-btn');
            const _hudSnap = document.getElementById('feed-hud-toggle-btn');
            const _recStartSnap = document.getElementById('surveillance-record-start-btn');
            const _recStopSnap = document.getElementById('surveillance-record-stop-btn');
            if (_flipSnap) _flipSnap.classList.add('hidden');
            if (_hudSnap) _hudSnap.classList.add('hidden');
            if (_recStartSnap) _recStartSnap.classList.add('hidden');
            if (_recStopSnap) _recStopSnap.classList.add('hidden');

            const killBtn = document.getElementById('feed-kill-btn');
            if (killBtn) {
                killBtn.classList.remove('hidden');
                killBtn.textContent = '✕  CLOSE REVIEW';
            }

            if (label) label.textContent = `INTEL REVIEW [${item.label || 'SNAPSHOT'}]`;
        };

        window.loadVideoBackToPlayer = function(item) {
            if (!item || !item.image) return;

            const panel = document.getElementById('panel-vault');
            if (panel && panel.classList.contains('is-maximized')) {
                window.toggleFullscreen('panel-vault');
            }

            const videoEl = document.getElementById('surveillance-stream');
            const placeholder = document.getElementById('surveillance-placeholder');
            const hud = document.getElementById('surveillance-hud');
            const killBtn = document.getElementById('feed-kill-btn');
            const survFooter = document.getElementById('surveillance-footer');
            const recStartBtn = document.getElementById('surveillance-record-start-btn');
            const recStopBtn = document.getElementById('surveillance-record-stop-btn');
            const captureBtn = document.getElementById('surveillance-capture-btn');
            const label = document.getElementById('feed-label-source');

            if (typeof stopFeed === 'function') stopFeed();

            const imgViewer = document.getElementById('surveillance-snapshot-viewer');
            if (imgViewer) imgViewer.classList.add('hidden');

            let playUrl;
            if (item.image.startsWith('data:')) {
                const mime = item.image.split(';')[0].replace('data:', '') || 'video/webm';
                const b64 = item.image.includes('base64,') ? item.image.split('base64,')[1] : item.image.substring(item.image.indexOf(',') + 1);
                const byteChars = atob(b64);
                const byteArr = new Uint8Array(byteChars.length);
                for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
                const videoBlob = new Blob([byteArr], { type: mime });
                playUrl = URL.createObjectURL(videoBlob);
            } else {
                playUrl = item.image;
            }

            videoEl.srcObject = null;
            
            videoEl.autoplay = false;
            videoEl.removeAttribute('autoplay');
            
            videoEl.src = playUrl;
            videoEl.load();
            videoEl.controls = true;
            videoEl.muted = false;
            
            videoEl.pause();

            videoEl.classList.remove('hidden');
            placeholder.classList.add('hidden');
            hud.classList.add('hidden');
            
            if(survFooter) survFooter.classList.remove('hidden');
            
            if(captureBtn) captureBtn.classList.add('hidden');
            if(recStartBtn) recStartBtn.classList.add('hidden');
            if(recStopBtn) recStopBtn.classList.add('hidden');
            
            const flipBtn = document.getElementById('feed-switch-cam-btn');
            if(flipBtn) flipBtn.classList.add('hidden');
            
            const hudToggleBtn = document.getElementById('feed-hud-toggle-btn');
            if(hudToggleBtn) hudToggleBtn.classList.add('hidden');

            if(killBtn) {
                killBtn.classList.remove('hidden');
            }
            if(label) label.textContent = `PLAYING INTEL: ${item.label}`;
        };

        let isSavingBriefing = false;
        if (saveInvBtn) {
            saveInvBtn.addEventListener('click', async () => {
                if (isSavingBriefing) return;
                isSavingBriefing = true;
                const tsDisplay = document.getElementById('briefing-timestamp');
                if (tsDisplay) tsDisplay.textContent = new Date().toISOString().replace('T', ' ').slice(0, 19) + 'Z';
                const targetEl = document.getElementById('briefing-snapshot-target');
                const originalText = `<i data-lucide="save" class="w-4 h-4"></i> SAVE TO INVENTORY`;
                saveInvBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin inline-block mr-1"></i> SAVING...`;
                
                try {
                    // Temporarily restyle for snapshot
                    targetEl.style.height = 'auto';
                    targetEl.style.maxHeight = 'none';
                    targetEl.style.overflow = 'visible';
                    targetEl.classList.remove('overflow-y-auto');
                    
                    const canvas = await html2canvas(targetEl, {
                        backgroundColor: '#0f172a', // slate-900
                        scale: Math.max(window.devicePixelRatio || 2, 2),
                        logging: false,
                        onclone: (clonedDoc) => {
                            // Safely copy all textarea values
                            Array.from(targetEl.querySelectorAll('textarea')).forEach(originalTa => {
                                if (!originalTa.id) return;
                                const cloneTa = clonedDoc.getElementById(originalTa.id);
                                if (cloneTa) {
                                    const div = clonedDoc.createElement('div');
                                    div.style.cssText = window.getComputedStyle(cloneTa).cssText;
                                    div.style.whiteSpace = 'pre-wrap';
                                    div.style.wordBreak = 'break-word';
                                    div.style.overflow = 'visible';
                                    div.style.height = 'auto';
                                    div.textContent = originalTa.value;
                                    cloneTa.parentNode.replaceChild(div, cloneTa);
                                }
                            });
                            
                            // Safely copy all input values
                            Array.from(targetEl.querySelectorAll('input[type=text], input:not([type])')).forEach(originalInp => {
                                if (!originalInp.id) return;
                                const cloneInp = clonedDoc.getElementById(originalInp.id);
                                if (cloneInp) {
                                    const div = clonedDoc.createElement('div');
                                    div.style.cssText = window.getComputedStyle(cloneInp).cssText;
                                    div.style.display = 'flex';
                                    div.style.alignItems = 'center';
                                    div.style.paddingTop = '0px';
                                    div.style.paddingBottom = '0px';
                                    div.style.whiteSpace = 'nowrap';
                                    div.style.overflow = 'visible';
                                    div.textContent = originalInp.value;
                                    cloneInp.parentNode.replaceChild(div, cloneInp);
                                }
                            });
                        }
                    });
                    
                    // Reset styles
                    targetEl.style.height = '';
                    targetEl.style.maxHeight = '';
                    targetEl.style.overflow = '';
                    targetEl.classList.add('overflow-y-auto');
                    
                    const imgData = canvas.toDataURL('image/jpeg', 0.95);
                    const timestamp = Date.now();
                    const newItem = {
                        id: timestamp,
                        timestamp: timestamp,
                        image: imgData,
                        type: 'mission_brief',
                        label: missionNameInput.value.trim() || 'TACTICAL BRIEF',
                        missionName: missionNameInput.value.trim(),
                        commander: commanderInput.value.trim(),
                        assignment: assignmentInput.value.trim(),
                        debrief: debriefInput.value.trim(),
                        formTimestamp: timestampDisplay.textContent,
                        status: 'pending'
                    };
                    
                    const inv = getBriefingInventory();
                    inv[timestamp] = newItem;
                    saveBriefingInventory(inv);
                    
                    if(window.updateBriefingList) window.updateBriefingList();
                    
                    // Clear inputs after save (like Ammo Library)
                    missionNameInput.value = '';
                    commanderInput.value = '';
                    assignmentInput.value = '';
                    debriefInput.value = '';
                    
                    saveInvBtn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> SENT TO INTEL VAULT`;
                    window.pushTacLog("MISSION BRIEFING SAVED TO INVENTORY", "SUCCESS");
                    
                    setTimeout(() => { saveInvBtn.innerHTML = originalText; if (window.lucide) window.lucide.createIcons(); }, 2000);
                    
                } catch(e) {
                    console.error("Briefing snapshot error:", e);
                    saveInvBtn.innerHTML = `<i data-lucide="alert-triangle" class="w-4 h-4"></i> ERROR`;
                    alert("Save Error: " + (e.message || "Unknown error occurred."));
                    setTimeout(() => { saveInvBtn.innerHTML = originalText; if (window.lucide) window.lucide.createIcons(); }, 2000);
                } finally {
                    isSavingBriefing = false;
                }
            });
        }

        window.updateBriefingList = function() {
            const listEl = document.getElementById('briefingLibraryList');
            if (!listEl) return;
            listEl.innerHTML = '';
            
            const inv = getBriefingInventory();
            const keys = Object.keys(inv).sort((a, b) => b - a); // newest first
            
            if (keys.length === 0) {
                listEl.innerHTML = `
                    <div class="col-span-1 md:col-span-2 flex flex-col items-center justify-center py-12 text-center text-gray-400 font-mono text-xs uppercase tracking-wider">
                        <i data-lucide="info" class="w-8 h-8 opacity-20 mb-2"></i>
                        No saved briefings found.
                    </div>
                `;
                
                // Hide top buttons
                const reworkBtn = document.getElementById('rework-briefing-btn');
                const vaultBtnTop = document.getElementById('briefing-to-vault-btn-top');
                const vaultBtnBottom = document.getElementById('briefing-to-vault-btn-bottom');
                if (reworkBtn) reworkBtn.classList.add('hidden');
                if (vaultBtnTop) vaultBtnTop.classList.add('hidden');
                if (vaultBtnBottom) vaultBtnBottom.classList.add('hidden');
                if (window.lucide) window.lucide.createIcons();
                return;
            }

            keys.forEach(key => {
                const item = inv[key];
                const card = document.createElement('div');
                card.className = "bg-black border border-emerald-500/30 p-4 rounded-xl flex flex-col justify-between hover:border-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all shadow-md relative group overflow-hidden cursor-pointer";
                card.innerHTML = `
                    <!-- Send to Vault Checkbox -->
                    <div class="absolute top-2 left-2 z-30 bg-black/60 p-1 rounded">
                        <label class="sr-only">Mark Briefing for Vault</label><input name="${item.id}" autocomplete="off" type="checkbox" class="briefing-vault-checkbox w-4 h-4 cursor-pointer bg-black/50 border border-gray-500 rounded text-neon-green focus:ring-neon-green/50 shadow-lg" data-id="${item.id}" title="Mark for Vault" aria-label="Mark Briefing for Vault">
                    </div>
                    
                    <div class="space-y-3 text-left mt-3 pointer-events-none">
                        <div class="flex justify-between items-start border-b border-emerald-500/20 pb-3 mb-2 pointer-events-auto">
                            <div style="padding-left: 48px;">
                                <h4 class="text-white font-black uppercase text-base tracking-widest truncate max-w-[150px] drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]">${item.missionName || item.label || 'TACTICAL BRIEF'}</h4>
                                <span class="text-[10px] text-emerald-400 font-mono uppercase tracking-widest bg-emerald-500/10 px-1.5 py-0.5 rounded-sm">${item.formTimestamp || new Date(item.timestamp).toLocaleString()}</span>
                            </div>
                            <button class="delete-brief-inventory-btn text-emerald-500/50 hover:text-red-500 hover:bg-red-950/40 p-1.5 rounded transition-colors z-30" data-id="${item.id}" title="Delete Briefing">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                        
                        <div class="flex-1 bg-black/40 border border-gray-800 rounded p-1 mb-2">
                            <img src="${item.image}" alt="Briefing Snapshot" class="w-full h-24 object-cover rounded opacity-80 group-hover:opacity-100 transition-opacity">
                        </div>
                    </div>
                `;

                // Checkbox logic delegation on the card (matching Ammo)
                card.addEventListener('click', (e) => {
                    // if they clicked delete, don't trigger checkbox logic
                    if (e.target.closest('.delete-brief-inventory-btn')) return;

                    // toggle checkbox if clicking anywhere on the card, but not if clicking directly on checkbox
                    const cb = card.querySelector('.briefing-vault-checkbox');
                    if (e.target !== cb && !e.target.closest('.briefing-vault-checkbox')) {
                        cb.checked = !cb.checked;
                    }
                    
                    // Update buttons
                    const checkedBoxes = document.querySelectorAll('.briefing-vault-checkbox:checked');
                    
                    const vaultBtnTop = document.getElementById('briefing-to-vault-btn-top');
                    const vaultBtnBottom = document.getElementById('briefing-to-vault-btn-bottom');
                    
                    if (checkedBoxes.length > 0) {
                        if (vaultBtnTop) vaultBtnTop.classList.remove('hidden');
                        if (vaultBtnBottom) vaultBtnBottom.classList.add('hidden');
                    } else {
                        if (vaultBtnTop) vaultBtnTop.classList.add('hidden');
                        if (vaultBtnBottom) vaultBtnBottom.classList.add('hidden');
                    }
                    
                    const reworkBtn = document.getElementById('rework-briefing-btn');
                    if (reworkBtn) {
                        if (checkedBoxes.length === 1) reworkBtn.classList.remove('hidden');
                        else reworkBtn.classList.add('hidden');
                    }
                });

                // Bind delete button
                card.querySelector('.delete-brief-inventory-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    if(confirm("Delete this mission briefing from your Inventory?")) {
                        const id = e.currentTarget.dataset.id;
                        const inv = getBriefingInventory();
                        delete inv[id];
                        saveBriefingInventory(inv);
                        window.updateBriefingList();
                    }
                });

                listEl.appendChild(card);
            });
            
            // Ensure buttons start hidden when list is updated
            const vaultBtnTop = document.getElementById('briefing-to-vault-btn-top');
            const vaultBtnBottom = document.getElementById('briefing-to-vault-btn-bottom');
            if (vaultBtnTop) vaultBtnTop.classList.add('hidden');
            if (vaultBtnBottom) vaultBtnBottom.classList.add('hidden');
            
            const reworkBtn = document.getElementById('rework-briefing-btn');
            if (reworkBtn) reworkBtn.classList.add('hidden');

            if (window.lucide) window.lucide.createIcons();
        };

        const toVaultBtnTop = document.getElementById('briefing-to-vault-btn-top');
        const toVaultBtnBottom = document.getElementById('briefing-to-vault-btn-bottom');
        
        const handleVaultClick = (e, btnElement) => {
            e.stopPropagation();
            let originalText = btnElement.innerHTML; // hoisted so catch{} can reset the button
            try {
                const checkedBoxes = document.querySelectorAll('.briefing-vault-checkbox:checked');
                if (checkedBoxes.length === 0) return;

                btnElement.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin inline-block mr-1"></i> SAVING...`;
                if (window.lucide) window.lucide.createIcons();

                const inv = getBriefingInventory();
                let sentCount = 0;

                checkedBoxes.forEach((cb, i) => {
                    const id = cb.dataset.id;
                    const item = inv[id];
                    if (item) {
                        const { image, ...metadata } = item;
                        metadata.type = 'mission_brief';
                        metadata.timestamp = Date.now();
                        const label = item.missionName || 'TACTICAL BRIEF';
                        
                        setTimeout(() => {
                            if (window.saveIntelSnapshot) {
                                window.saveIntelSnapshot(label, item.image, metadata);
                            }
                        }, i * 50);
                        sentCount++;
                    }
                });
                
                if (sentCount > 0) {
                    if (window.pushTacLog) window.pushTacLog(`TRANSFERRED ${sentCount} BRIEFING(S) TO INTEL VAULT`, "SUCCESS");
                    
                    setTimeout(() => {
                        btnElement.innerHTML = `<i data-lucide="check" class="w-4 h-4 inline-block mr-1"></i> SENT TO INTEL VAULT`;
                        if (window.lucide) window.lucide.createIcons();
                    }, 500);

                    setTimeout(() => {
                        btnElement.innerHTML = originalText;
                        checkedBoxes.forEach(cb => cb.checked = false);
                        if (toVaultBtnTop) toVaultBtnTop.classList.add('hidden');
                        if (toVaultBtnBottom) toVaultBtnBottom.classList.add('hidden');
                        if (window.lucide) window.lucide.createIcons();
                    }, 1500);
                } else {
                }
            } catch (err) {
                console.error('Failed to send to vault:', err);
                btnElement.innerHTML = originalText;
            }
        };

        // -----------------------------------------------------------------------
        // BUG FIX: Wire vault buttons to handleVaultClick (were defined but never bound)
        // -----------------------------------------------------------------------
        if (toVaultBtnTop) {
            toVaultBtnTop.addEventListener('click', (e) => handleVaultClick(e, toVaultBtnTop));
        }
        if (toVaultBtnBottom) {
            toVaultBtnBottom.addEventListener('click', (e) => handleVaultClick(e, toVaultBtnBottom));
        }

        // -----------------------------------------------------------------------
        // SEND VAULT ITEM TO CHAT (called from viewer SEND button & CHATS button)
        // -----------------------------------------------------------------------
        window.sendVaultItemToChat = async function(itemId) {
            try {
                let item = (window.vaultCache || []).find(i => i && (i.id == itemId || (i.id && i.id.toString() === itemId.toString())));
                if (!item && window.TRC_IDB) {
                    try {
                        item = await window.TRC_IDB.get('intelVault', itemId.toString());
                        if (!item) item = await window.TRC_IDB.get('intelVault', parseInt(itemId));
                        if (!item) item = await window.TRC_IDB.get('workstationLibrary', itemId.toString());
                        if (!item) item = await window.TRC_IDB.get('workstationLibrary', parseInt(itemId));
                    } catch(e) {}
                }
                if (!item) {
                    if (window.pushTacLog) window.pushTacLog('VAULT ITEM NOT FOUND IN IDB', 'ERROR');
                    return;
                }

                const userObj = (typeof commsUser !== 'undefined' && commsUser && commsUser.callsign)
                    ? commsUser
                    : { callsign: item.author || 'OPERATOR', role: 'FIELD UNIT', team: 'ALPHA' };

                const compressFn = window.compressBase64Image || (async (img) => img);

                // Helper to safely get or compress image (supports HTTP URLs & Base64 with HD clarity)
                const safeImage = async (imgSrc, maxDim = 1100, q = 0.88) => {
                    if (!imgSrc || typeof imgSrc !== 'string') return '';
                    if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://')) return imgSrc;
                    if (imgSrc.startsWith('data:image/svg+xml')) return imgSrc;
                    if (imgSrc.startsWith('data:image')) return await compressFn(imgSrc, maxDim, q);
                    return '';
                };

                const isVideo = item.image && item.image.startsWith('data:video');

                if (isVideo) {
                    window.pushTacLog("ENCRYPTING SECURE TAPE FOR TRANSMISSION...", "SYS");
                    try {
                        const base64 = item.image.includes('base64,') ? item.image.split('base64,')[1] : item.image.substring(item.image.indexOf(',') + 1);
                        const mimeType = item.image.split(';')[0].replace('data:', '') || 'video/webm';
                        const byteChars = atob(base64);
                        const byteNums = new Array(byteChars.length);
                        for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
                        const videoBlob = new Blob([new Uint8Array(byteNums)], { type: mimeType });

                        if (window.TacticalBinaryCrypto && window.supabaseClient) {
                            window.TacticalBinaryCrypto.encryptBlob(videoBlob).then(encryptedBlob => {
                                const fileName = `secure_tape_${Date.now()}_${Math.random().toString(36).substring(2,7)}.bin`;
                                window.supabaseClient.storage.from('Tactical-media').upload(fileName, encryptedBlob, {
                                    cacheControl: '3600', upsert: false
                                }).then(({ data, error }) => {
                                    if (error) { window.pushTacLog("TAPE UPLOAD FAILED: " + error.message, "ERROR"); return; }
                                    const publicUrl = window.supabaseClient.storage.from('Tactical-media').getPublicUrl(fileName).data.publicUrl;
                                    const metadataObj = Object.assign({}, item);
                                    delete metadataObj.image;
                                    const encryptedMessage = TacticalCrypto.encrypt({
                                        message: "[SECURE_TAPE_INCOMING]",
                                        tapeUrl: publicUrl,
                                        user: userObj,
                                        metadata: Object.assign({}, metadataObj, { mimeType: mimeType })
                                    });
                                    const msgId = Math.random().toString(36).substring(2, 9);
                                    if (window.receivedMsgIds) window.receivedMsgIds.add(msgId);
                                    if (window.dataChannels) {
                                        Object.values(window.dataChannels).forEach(dc => {
                                            if (dc && dc.readyState === 'open') {
                                                try { dc.send(JSON.stringify({ event: 'chat', data: encryptedMessage, msgId })); } catch(e2) {}
                                            }
                                        });
                                    }
                                    if (typeof commsChannel !== 'undefined' && commsChannel) {
                                        try { commsChannel.send({ type: 'broadcast', event: 'chat', payload: { data: encryptedMessage, msgId } }).catch(e=>{}); } catch(e) {}
                                    }
                                    renderChatMessage(userObj, `🎥 SECURE TAPE: ${item.label || 'TAPE'}`, true, null, publicUrl);
                                    window.pushTacLog("SECURE TAPE TRANSMITTED TO TEAM", "SUCCESS");
                                });
                            }).catch(err => window.pushTacLog("TAPE ENCRYPT FAILED: " + err.message, "ERROR"));
                        }
                    } catch(e) {
                        window.pushTacLog("TAPE CONVERSION FAILED: " + e.message, "ERROR");
                    }
                    return;
                }

                // Business Card Handling
                if (item.contact || item.type === 'contact' || (item.type === 'intel_report' && item.contact)) {
                    const c = item.contact || {};
                    const trophyPhoto = await safeImage((item.image && item.image !== c.cardImageUrl) ? item.image : null);
                    const cardPhoto = await safeImage(c.cardImageUrl || (item.image === c.cardImageUrl ? item.image : null));

                    const cardImgHtml = cardPhoto ? `
<div style="margin-top: 8px; max-height: 140px; background-color: #000000; border-radius: 6px; overflow: hidden; border: 1px solid #4b5563; text-align: center;">
    <img src="${cardPhoto}" style="max-height: 140px; width: auto; max-width: 100%; display: inline-block; object-fit: contain;">
</div>` : '';

                    const cardMsg = `<div style="font-family: monospace; font-size: 11px; line-height: 1.5;">
<div style="color: #e879f9; font-weight: 900; letter-spacing: 1px; margin-bottom: 4px; border-bottom: 1px solid rgba(232,121,249,0.4); padding-bottom: 2px;">🎴 [TRC BIZ CARD]</div>
<div><span style="color: #f0abfc; font-weight: 800;">Author:</span> <span style="color: #ffffff; font-weight: 700;">${item.author || c.author || 'OPERATOR'}</span></div>
<div><span style="color: #f0abfc; font-weight: 800;">Company:</span> <span style="color: #67e8f9; font-weight: 800;">${c.bizname || 'N/A'}</span></div>
<div><span style="color: #f0abfc; font-weight: 800;">Unit:</span> <span style="color: #9ca3af; font-weight: 700;">${c.unit || 'N/A'}</span></div>
<div><span style="color: #f0abfc; font-weight: 800;">Phone:</span> <span style="color: #ffffff; font-weight: 700;">${c.phone || '--'}</span></div>
<div><span style="color: #f0abfc; font-weight: 800;">Comms:</span> <span style="color: #34d399; font-weight: 700;">${c.comms || '--'}</span></div>
<div><span style="color: #f0abfc; font-weight: 800;">Web:</span> <span style="color: #60a5fa; font-weight: 700;">${c.web || '--'}</span></div>
<div><span style="color: #f0abfc; font-weight: 800;">Specialties:</span> <span style="color: #f472b6; font-style: italic;">"${c.details || 'None'}"</span></div>
${cardImgHtml}
</div>`;

                    try {
                        if (typeof TacticalCrypto !== 'undefined') {
                            const encrypted = TacticalCrypto.encrypt({
                                message: cardMsg,
                                user: userObj,
                                image: trophyPhoto,
                                timestamp: Date.now(),
                                metadata: item
                            });
                            const msgId = Math.random().toString(36).substring(2, 9);
                            if (typeof window.receivedMsgIds !== 'undefined') window.receivedMsgIds.add(msgId);
                            if (window.dataChannels) {
                                Object.values(window.dataChannels).forEach(dc => {
                                    if (dc && dc.readyState === 'open') {
                                        try { dc.send(JSON.stringify({ event: 'chat', data: encrypted, msgId })); } catch (err) {}
                                    }
                                });
                            }
                            if (typeof commsChannel !== 'undefined' && commsChannel) {
                                try { commsChannel.send({ type: 'broadcast', event: 'chat', payload: { data: encrypted, msgId } }).catch(e=>{}); } catch(e){}
                            }
                        }
                        renderChatMessage(userObj, cardMsg, true, trophyPhoto, null, item);
                        window.pushTacLog(`TRC BUSINESS CARD TRANSMITTED TO MISSION CHAT`, "SUCCESS");
                    } catch (e) {
                        window.pushTacLog("CARD TX ERROR: " + e.message, "ERROR");
                    }
                    return;
                }

                // General Intel / First Responder / Workstation / Blog Report Transmission
                window.pushTacLog("SECURING INTEL FOR TRANSMISSION...", "SYS");

                let compressedImg = await safeImage(item.image, 850, 0.75);
                const itemLabel = item.name || item.label || (item.title ? `WORKSTATION: ${item.title}` : `INTEL REPORT: ${item.category || item.type?.toUpperCase() || 'SNAPSHOT'}`);
                
                // Build clean lightweight metadata payload
                const payloadItem = JSON.parse(JSON.stringify(item));
                delete payloadItem.image; // DO NOT DUPLICATE MAIN IMAGE IN METADATA!
                if (payloadItem.pdfData) delete payloadItem.pdfData; // Strip raw binary PDF so payload stays under WebRTC broadcast limits
                if (payloadItem.snapshot) delete payloadItem.snapshot; // Strip duplicate dope card image
                if (payloadItem.gametagData) delete payloadItem.gametagData.image; // Strip duplicate gametag image
                if (payloadItem.officerCardData) delete payloadItem.officerCardData.image;
                if (payloadItem.exhibitImages) delete payloadItem.exhibitImages;
                if (payloadItem.casefileData) {
                    if (payloadItem.casefileData.exhibitImages) delete payloadItem.casefileData.exhibitImages;
                    if (payloadItem.casefileData.mainAttachedImage) delete payloadItem.casefileData.mainAttachedImage;
                }

                // Compress heavy nested base64 image duplicates to keep payload under limits for broadcast, but DO NOT delete them!
                if (payloadItem.data) {
                    delete payloadItem.data.image; // duplicate
                    if (payloadItem.data.exhibitImages) delete payloadItem.data.exhibitImages;
                    if (payloadItem.data.sketchImage) {
                        payloadItem.data.sketchImage = await safeImage(payloadItem.data.sketchImage, 600, 0.65);
                    }
                    if (payloadItem.data.scenePhotos && payloadItem.data.scenePhotos.length > 0) {
                        payloadItem.data.scenePhotos = await Promise.all(payloadItem.data.scenePhotos.map(p => safeImage(p, 550, 0.60)));
                    }
                }
                if (payloadItem.workstationData) {
                    delete payloadItem.workstationData.image; // duplicate
                    if (payloadItem.workstationData.data) {
                        delete payloadItem.workstationData.data.image; // duplicate
                        if (payloadItem.workstationData.data.exhibitImages) delete payloadItem.workstationData.data.exhibitImages;
                        if (payloadItem.workstationData.data.sketchImage) {
                            payloadItem.workstationData.data.sketchImage = await safeImage(payloadItem.workstationData.data.sketchImage, 600, 0.65);
                        }
                        if (payloadItem.workstationData.data.scenePhotos && payloadItem.workstationData.data.scenePhotos.length > 0) {
                            payloadItem.workstationData.data.scenePhotos = await Promise.all(payloadItem.workstationData.data.scenePhotos.map(p => safeImage(p, 550, 0.60)));
                        }
                    }
                }

                let encryptedImage = "";
                if (typeof TacticalCrypto !== 'undefined') {
                    let cryptoPayload = {
                        message: `[ ${itemLabel} ]`,
                        image: compressedImg,
                        user: userObj,
                        metadata: payloadItem
                    };
                    encryptedImage = TacticalCrypto.encrypt(cryptoPayload);

                    if (new Blob([encryptedImage]).size > 200000) {
                        if (payloadItem.data) delete payloadItem.data.scenePhotos;
                        if (payloadItem.workstationData && payloadItem.workstationData.data) {
                            delete payloadItem.workstationData.data.scenePhotos;
                        }
                        compressedImg = await safeImage(compressedImg, 600, 0.60);
                        cryptoPayload.image = compressedImg;
                        encryptedImage = TacticalCrypto.encrypt(cryptoPayload);
                    }
                    
                    if (new Blob([encryptedImage]).size > 200000) {
                        if (payloadItem.data) delete payloadItem.data.sketchImage;
                        if (payloadItem.workstationData && payloadItem.workstationData.data) {
                            delete payloadItem.workstationData.data.sketchImage;
                        }
                        compressedImg = await safeImage(compressedImg, 450, 0.50);
                        cryptoPayload.image = compressedImg;
                        encryptedImage = TacticalCrypto.encrypt(cryptoPayload);
                    }

                    const msgId = Math.random().toString(36).substring(2, 9);
                    if (window.receivedMsgIds) window.receivedMsgIds.add(msgId);

                    if (window.dataChannels) {
                        Object.values(window.dataChannels).forEach(dc => {
                            if (dc && dc.readyState === 'open') {
                                try { dc.send(JSON.stringify({ event: 'chat', data: encryptedImage, msgId })); } catch(e2) {}
                            }
                        });
                    }
                    if (typeof commsChannel !== 'undefined' && commsChannel) {
                        try {
                            commsChannel.send({ type: 'broadcast', event: 'chat', payload: { data: encryptedImage, msgId } })
                                .catch(err => console.warn("Broadcast send fallback warning:", err));
                        } catch(e){}
                    }
                    if (window.supabase && typeof commsUser !== 'undefined' && commsUser && commsUser.callsign) {
                        try {
                            window.supabase.from('trc_chat').insert([{
                                callsign: commsUser.callsign,
                                flavor: window.flavor || 'blue',
                                message: encryptedImage,
                                is_vault_card: true,
                                timestamp: new Date().toISOString()
                            }]).catch(e => {});
                        } catch(e){}
                    }
                }

                renderChatMessage(userObj, `[ ${itemLabel} ]`, true, compressedImg, null, payloadItem);
                window.pushTacLog(`SECURE INTEL SENT TO COMMS`, "SUCCESS");

            } catch (err) {
                console.error("sendVaultItemToChat Error:", err);
                if (window.pushTacLog) window.pushTacLog("TRANSMISSION ERROR: " + err.message, "ERROR");
            }
        };

        const vaultChatsBtn = document.getElementById('vault-chats-btn');
        if (vaultChatsBtn) {
            vaultChatsBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                
                // Query BOTH Vault checkboxes AND Workstation Library checkboxes
                const checkedBoxes = document.querySelectorAll('.vault-export-checkbox:checked, .ws-library-checkbox:checked');
                if (checkedBoxes.length === 0) {
                    alert("Please check at least one card using the checkbox [✓] before clicking CHATS.");
                    return;
                }

                const selectedIds = Array.from(checkedBoxes).map(cb => cb.dataset.vaultId || cb.value);

                // Build unified library across vaultCache, intelVault IDB AND workstationLibrary IDB
                let allCards = [...(window.vaultCache || [])];
                if (window.TRC_IDB) {
                    try {
                        const vaultCards = await window.TRC_IDB.getAll('intelVault');
                        if (vaultCards) {
                            Object.values(vaultCards).forEach(v => {
                                if (v && !allCards.some(c => c && c.id && v.id && c.id.toString() === v.id.toString())) {
                                    allCards.push(v);
                                }
                            });
                        }
                        const wsCards = await window.TRC_IDB.getAll('workstationLibrary');
                        if (wsCards) {
                            Object.values(wsCards).forEach(w => {
                                if (w && !allCards.some(c => c && c.id && w.id && c.id.toString() === w.id.toString())) {
                                    allCards.push(w);
                                }
                            });
                        }
                    } catch(err){}
                }

                const itemsToSend = allCards.filter(item => item && item.id && selectedIds.includes(item.id.toString()));

                if (itemsToSend.length === 0) {
                    alert("Selected cards could not be loaded from storage. Try refreshing the Intel Vault.");
                    return;
                }

                for (let i = 0; i < itemsToSend.length; i++) {
                    await window.sendVaultItemToChat(itemsToSend[i].id);
                    if (i < itemsToSend.length - 1) {
                        await new Promise(r => setTimeout(r, 600));
                    }
                }

                checkedBoxes.forEach(cb => cb.checked = false);
                if (window.pushTacLog) window.pushTacLog(`TRANSMITTING ${itemsToSend.length} CHECKED CARD(S) TO ENCRYPTED COMMS CHAT`, "SUCCESS");
            });
        }

        const vaultToCardsBtn = document.getElementById('vault-to-cards-btn');
        if (vaultToCardsBtn) {
            vaultToCardsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const checkedBoxes = document.querySelectorAll('.vault-export-checkbox:checked');
                
                if (checkedBoxes.length === 0) {
                    alert("Please select a Business Card or Intel Report to rework using the checkbox.");
                    return;
                }

                const selectedIds = Array.from(checkedBoxes).map(cb => cb.dataset.vaultId);
                const cardToLoad = (window.vaultCache || []).find(item => selectedIds.includes(item.id.toString()) && (item.contact || item.type === 'intel_report' || item.type === 'contact' || item.type === 'blog_post'))
                    || (window.vaultCache || []).find(item => selectedIds.includes(item.id.toString()));

                if (cardToLoad) {
                    if (window.reworkBusinessCard) {
                        window.reworkBusinessCard(cardToLoad);
                    }
                    checkedBoxes.forEach(cb => cb.checked = false);
                    if (window.pushTacLog) window.pushTacLog(`LOADED VAULT CARD BACK TO FORM`, "SUCCESS");
                } else {
                    alert("Could not load the selected card. It may have been removed.");
                }
            });
        }

        const reworkBtn = document.getElementById('rework-briefing-btn');
        if (reworkBtn) {
            reworkBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const checkedBoxes = document.querySelectorAll('.briefing-vault-checkbox:checked');
                if (checkedBoxes.length !== 1) return;

                const id = checkedBoxes[0].dataset.id;
                const inv = getBriefingInventory();
                const item = inv[id];
                
                if (item) {
                    // Populate inputs
                    missionNameInput.value = item.missionName || '';
                    commanderInput.value = item.commander || '';
                    assignmentInput.value = item.assignment || '';
                    debriefInput.value = item.debrief || '';
                    timestampDisplay.textContent = item.formTimestamp || '--:--:--';
                    
                    // Delete from inventory
                    delete inv[id];
                    saveBriefingInventory(inv);
                    window.updateBriefingList();
                    
                    // Focus form
                    assignmentInput.focus();
                }
            });
        }
    }

    // === PERSISTENCE SHIELD: MISSION RECOVERY PROTOCOL ===
    const shieldInputs = [
        'unit-name', 'call-sign', 'location-name', 'mgrs-coords', 'profile-date',
        'rifle-notes', 'wind-notes', 'scope-notes', 'shooting-angle', 'direction-notes', 'lrf-notes', 'compass-range',
        'compass-range-2', 'box-count-input', 'sidebar-bal-input-alt', 'sidebar-bal-input-temp', 'sidebar-bal-input-baro',
        'caliber', 'zero', 'barrel', 'bullet', 'load', 'powder', 'primer', 'col', 'rings',
        'velocity', 'g1', 'weather', 'targetSize', 'groupSize', 'header-notes', 'shooter-name',
        'elevation', 'hold-data', 'final-dope'
    ];
    let autoSaveTimeout;
    function triggerAutoSave() {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(async () => {
            if (!window.TRC_IDB) return;
            const state = {};
            shieldInputs.forEach(id => {
                const el = document.getElementById(id);
                if (el) state[id] = el.value;
            });
            // Capture canvases
            state.holdShots = window.holdManager?.getShots() || [];
            state.shotShots = window.shotManager?.getShots() || [];
            
            await window.TRC_IDB.put('drafts', { id: '___DRAFT_RECOVERY___', data: state, timestamp: Date.now() });
            console.log('[SHIELD] Mission State Synchronized');
        }, 500);
    }

    // Bind auto-save to all inputs
    shieldInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', triggerAutoSave);
    });

    // MISSION RECOVERY: Auto-load draft on startup
    async function recoverMission() {
        if (!window.TRC_IDB) return;
        const recovery = await window.TRC_IDB.get('drafts', '___DRAFT_RECOVERY___');
        if (recovery && recovery.data) {
            const data = recovery.data;
            shieldInputs.forEach(id => {
                const el = document.getElementById(id);
                if (el && data[id] !== undefined) {
                    el.value = data[id];
                    // Trigger sync to cards
                    el.dispatchEvent(new Event('input'));
                }
            });
            if (data.holdShots) window.holdManager?.setShots(data.holdShots);
            if (data.shotShots) window.shotManager?.setShots(data.shotShots);
            window.pushTacLog("MISSION RECOVERY: LAST SESSION RESTORED", "SYS");
        }
    }
    
    // Delayed recovery to ensure IDB is ready
    setTimeout(recoverMission, 1500);

}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTacticalDashboard2);
} else {
    initializeTacticalDashboard2();
}








// --- GLOBAL IMAGE ZOOM MODAL ---
document.addEventListener('DOMContentLoaded', () => {
    const zoomModal = document.getElementById('global-zoom-modal');
    const zoomImg = document.getElementById('global-zoom-image');
    const closeBtn = document.getElementById('close-zoom-modal');
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const resetBtn = document.getElementById('zoom-reset-btn');
    const scrollContainer = document.getElementById('zoom-scroll-container');
    
    let currentScale = 1;
    let isDragging = false;
    let startX, startY, scrollLeft, scrollTop;

    if(!zoomModal || !zoomImg) return;

    // Attach click listeners to all clickable images
    document.body.addEventListener('click', (e) => {
        // Target Intel Vault images, Comms feed images, etc.
        const targetImg = e.target.closest('#intel-vault-grid img, #chat-messages img, #ammoLibraryList img, #briefingLibraryList img, #calendarLibraryList img');
        if(targetImg) {
            e.stopPropagation();
            openZoomModal(targetImg.src);
        }
    });

    function openZoomModal(src) {
        zoomImg.src = src;
        currentScale = 1;
        updateTransform();
        zoomModal.classList.remove('hidden', 'pointer-events-none', 'opacity-0');
        zoomModal.classList.add('flex', 'opacity-100');
        if (window.lucide) window.lucide.createIcons();
    }

    function closeZoomModal() {
        zoomModal.classList.remove('opacity-100');
        zoomModal.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => {
            zoomModal.classList.add('hidden');
            zoomModal.classList.remove('flex');
            zoomImg.src = '';
        }, 300);
    }

    closeBtn.addEventListener('click', closeZoomModal);
    
    // Zoom Controls
    zoomInBtn.addEventListener('click', () => { currentScale = Math.min(currentScale + 0.5, 5); updateTransform(); });
    zoomOutBtn.addEventListener('click', () => { currentScale = Math.max(currentScale - 0.5, 0.5); updateTransform(); });
    resetBtn.addEventListener('click', () => { currentScale = 1; updateTransform(); });

    function updateTransform() {
        zoomImg.style.transform = 'scale(' + currentScale + ')';
    }

    // Drag to pan
    zoomImg.addEventListener('mousedown', (e) => {
        if(currentScale <= 1) return;
        isDragging = true;
        startX = e.pageX - scrollContainer.offsetLeft;
        startY = e.pageY - scrollContainer.offsetTop;
        scrollLeft = scrollContainer.scrollLeft;
        scrollTop = scrollContainer.scrollTop;
    });

    zoomImg.addEventListener('mouseleave', () => isDragging = false);
    zoomImg.addEventListener('mouseup', () => isDragging = false);

    zoomImg.addEventListener('mousemove', (e) => {
        if(!isDragging || currentScale <= 1) return;
        e.preventDefault();
        const x = e.pageX - scrollContainer.offsetLeft;
        const y = e.pageY - scrollContainer.offsetTop;
        const walkX = (x - startX) * 2;
        const walkY = (y - startY) * 2;
        scrollContainer.scrollLeft = scrollLeft - walkX;
        scrollContainer.scrollTop = scrollTop - walkY;
    });
});

// --- MISSION BRIEFING MODAL LOGIC ---
window.openBriefingModal = function() {
    const modal = document.getElementById('missionBriefingModal');
    if (modal) modal.classList.remove('hidden');
    if (modal) modal.classList.add('flex');
    if(window.updateBriefingList) window.updateBriefingList();
};

window.closeBriefingModal = function() {
    const modal = document.getElementById('missionBriefingModal');
    if (modal) modal.classList.add('hidden');
    if (modal) modal.classList.remove('flex');
    localStorage.setItem('trc_has_seen_briefing', 'true');
};

function initializeBriefingModal() {
    // Intentionally empty: removed auto-popup logic for new users/devices
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBriefingModal);
} else {
    initializeBriefingModal();
}

// --- AI SPOTTER VOICE LOGIC (PROTOTYPE) ---
let aiSpotterRecognition = null;
let aiSpotterActive = false;
let aiSpotterState = 'IDLE';

function aiSpeak(text) {
    if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance(text);
        msg.pitch = 0.9;
        msg.rate = 1.1;
        window._activeUtterance = msg; // FIX FOR ANDROID BUG: Prevents the voice from being deleted from memory before it finishes speaking
        window.speechSynthesis.speak(msg);
    }
}

window.toggleAISpotter = function() {
    const btn = document.getElementById('ai-spotter-btn');
    
    if (aiSpotterActive) {
        // Turn off
        aiSpotterActive = false;
        if (aiSpotterRecognition) aiSpotterRecognition.stop();
        btn.classList.remove('text-red-500', 'animate-pulse');
        btn.classList.add('text-gray-400');
        aiSpeak("Spotter standing down.");
        if (window.pushTacLog) window.pushTacLog("AI SPOTTER: OFFLINE", "SYS");
        return;
    }

    // Turn on
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Voice commands are not supported on this browser. Please use Chrome on Android or Desktop.");
        return;
    }

    if (!aiSpotterRecognition) {
        aiSpotterRecognition = new SpeechRecognition();
        aiSpotterRecognition.continuous = true;
        aiSpotterRecognition.interimResults = false;
        aiSpotterRecognition.lang = 'en-US';

        aiSpotterRecognition.onstart = function() {
            btn.classList.remove('text-gray-400');
            btn.classList.add('text-red-500', 'animate-pulse');
            if (window.pushTacLog) window.pushTacLog("AI SPOTTER: LISTENING...", "SUCCESS");
        };

        aiSpotterRecognition.onresult = function(event) {
            // Get the most recent transcript
            let currentTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    currentTranscript += event.results[i][0].transcript;
                }
            }
            
            const command = currentTranscript.trim().toLowerCase();
            if (!command) return;
            
            console.log("Voice Command Heard:", command);
            if (window.pushTacLog) window.pushTacLog(`HEARD: "${command}"`, "INFO");
            
            if (command.includes("spotter") || command.includes("spider") || command.includes("spot") || command.includes("read dope") || command.includes("solution")) {
                let curRange = document.getElementById('bal-input-range')?.value;
                curRange = (curRange && curRange.trim() !== '') ? curRange : "zero";
                
                let curWind = document.getElementById('bal-input-wind')?.value;
                curWind = (curWind && curWind.trim() !== '') ? curWind : "zero";
                
                let curDir = document.getElementById('bal-input-wind-dir')?.value;
                curDir = (curDir && curDir.trim() !== '') ? curDir : "zero";
                
                let elev = document.getElementById('sol-elev-mil')?.innerText || "zero";
                let elevDir = document.getElementById('sol-elev-label-code')?.innerText || "U";
                elevDir = elevDir === 'U' ? "Up" : (elevDir === 'D' ? "Down" : "Up");
                
                let solWind = document.getElementById('sol-wind-mil')?.innerText || "zero";
                let solWindDir = document.getElementById('sol-wind-label-code')?.innerText || "L";
                solWindDir = solWindDir === 'L' ? "Left" : (solWindDir === 'R' ? "Right" : "Hold");
                
                let curDirAim = document.getElementById('bal-input-shot-dir')?.value || "zero";
                
                if (elev !== '--.-') {
                    aiSpeak(`Direction ${curDirAim}. Target ${curRange}, wind ${curWind} from ${curDir}. ${elevDir} ${elev}. ${solWindDir} ${solWind}.`);
                } else {
                    aiSpeak(`Direction ${curDirAim}. Target ${curRange}, wind ${curWind} from ${curDir}. No DOPE available.`);
                }
                
                const panel = document.getElementById('panel-ballistics');
                if (panel && panel.classList.contains('hidden')) window.toggleSection('panel-ballistics');
            } 
            else if (command.includes("range card")) {
                aiSpeak("Yes");
            }
            else if (command.includes("new dope") || command.includes("new target")) {
                aiSpeak("Ready");
                aiSpotterState = 'WAITING_FOR_DOPE';
                window.dopeCommandBuffer = command.substring(command.indexOf("new dope") + 8).trim();
            }
            
            if (aiSpotterState === 'WAITING_FOR_DOPE') {
                if (!command.includes("new dope") && !command.includes("new target")) {
                    window.dopeCommandBuffer = (window.dopeCommandBuffer + " " + command).trim();
                }
                
                const fullCommand = window.dopeCommandBuffer;
                let updated = false;
                
                // 1. Parse Range
                let rMatch = fullCommand.match(/(\d+)\s*(?:yard|yards|meter|meters|y|m)/) || fullCommand.match(/(?:target|range)\s*(\d+)/);
                if (rMatch) {
                    const rInput = document.getElementById('bal-input-range');
                    if (rInput && rInput.value !== rMatch[1]) { rInput.value = rMatch[1]; updated = true; }
                }
                
                // 2. Parse Wind Speed
                let wMatch = fullCommand.match(/wind(?:\s+is)?\s*(\d+)/i) || fullCommand.match(/(\d+)\s*(?:mile|miles|mph)/i);
                if (wMatch) {
                    const wInput = document.getElementById('bal-input-wind');
                    if (wInput && wInput.value !== wMatch[1]) { wInput.value = wMatch[1]; updated = true; }
                }
                
                // Helper for Cardinal Directions
                const parseDirection = (str) => {
                    const s = str.toLowerCase();
                    if (s.includes('north') && s.includes('east')) return '45';
                    if (s.includes('north') && s.includes('west')) return '315';
                    if (s.includes('south') && s.includes('east')) return '135';
                    if (s.includes('south') && s.includes('west')) return '225';
                    if (s.includes('north')) return '0';
                    if (s.includes('east')) return '90';
                    if (s.includes('south')) return '180';
                    if (s.includes('west')) return '270';
                    const num = str.match(/\d+/);
                    return num ? num[0] : null;
                };

                const cardinalRegex = '(\\d+|north\\s*east|north\\s*west|south\\s*east|south\\s*west|north|east|south|west)';

                // 3. Parse Wind Direction
                let wDirMatch = fullCommand.match(new RegExp('from(?:\\s+the)?\\s*' + cardinalRegex, 'i'));
                if (wDirMatch) {
                    const parsed = parseDirection(wDirMatch[1]);
                    const wDirInput = document.getElementById('bal-input-wind-dir');
                    if (wDirInput && parsed && wDirInput.value !== parsed) { wDirInput.value = parsed; updated = true; }
                }

                // 4. Parse Shot Direction
                let dMatch = fullCommand.match(new RegExp('(?:direction|facing|azimuth)(?:\\s+is)?\\s*' + cardinalRegex, 'i'));
                if (dMatch) {
                    const parsed = parseDirection(dMatch[1]);
                    const dInput = document.getElementById('bal-input-shot-dir');
                    if (dInput && parsed && dInput.value !== parsed) { dInput.value = parsed; updated = true; }
                }
                
                if (updated || fullCommand.match(/\d+/)) {
                    if (typeof window.runSolverMatrix === 'function') window.runSolverMatrix();
                    
                    if (window.dopeReadoutTimer) clearTimeout(window.dopeReadoutTimer);
                    
                    // 5-second silence timer to auto-read the result
                    window.dopeReadoutTimer = setTimeout(() => {
                        let elev = document.getElementById('sol-elev-mil')?.innerText || "zero";
                        let elevDir = document.getElementById('sol-elev-label-code')?.innerText || "U";
                        elevDir = elevDir === 'U' ? "Up" : (elevDir === 'D' ? "Down" : "Up");
                        
                        let solWind = document.getElementById('sol-wind-mil')?.innerText || "zero";
                        let solWindDir = document.getElementById('sol-wind-label-code')?.innerText || "L";
                        solWindDir = solWindDir === 'L' ? "Left" : (solWindDir === 'R' ? "Right" : "Hold");
                        
                        const finalDir = document.getElementById('bal-input-shot-dir')?.value || "zero";
                        const finalRange = document.getElementById('bal-input-range')?.value || "unknown";
                        const finalWind = document.getElementById('bal-input-wind')?.value || "zero";
                        const finalWindDir = document.getElementById('bal-input-wind-dir')?.value || "zero";
                        
                        if (elev !== '--.-') {
                            aiSpeak(`Direction ${finalDir}. Target ${finalRange}, wind ${finalWind} from ${finalWindDir}. ${elevDir} ${elev}. ${solWindDir} ${solWind}.`);
                            if (window.pushTacLog) window.pushTacLog(`AI SPOTTER: Dir ${finalDir}, Range ${finalRange}y -> ${elevDir} ${elev}, ${solWindDir} ${solWind}`, "INFO");
                        } else {
                            aiSpeak(`Direction ${finalDir}. Target ${finalRange}. Calculation failed.`);
                            if (window.pushTacLog) window.pushTacLog(`AI SPOTTER: Calc failed`, "SYS");
                        }
                        
                        aiSpotterState = 'IDLE';
                    }, 5000);
                }
            }
        };

        aiSpotterRecognition.onerror = function(event) {
            console.error("Speech Recognition Error:", event.error);
            if (window.pushTacLog) window.pushTacLog(`MIC ERROR: ${event.error}`, "SYS");
            
            if (event.error === 'not-allowed') {
                aiSpotterActive = false;
                btn.classList.remove('text-red-500', 'animate-pulse');
                btn.classList.add('text-gray-400');
                aiSpeak("Microphone access denied.");
            }
        };

        aiSpotterRecognition.onend = function() {
            // Auto-restart if still active (continuous listening loop)
            if (aiSpotterActive) {
                try { aiSpotterRecognition.start(); } catch(e) {}
            }
        };
    }

    aiSpotterActive = true;
    aiSpeak("Spotter online.");
    try { aiSpotterRecognition.start(); } catch(e) {}
};


// --- NEW LOGIC: TACTICAL HINTS & MATRIX GENERATOR ---
window.toggleTacticalHints = function() {
    const modal = document.getElementById('tactical-hints-modal');
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => modal.classList.remove('opacity-0'), 10);
    } else {
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }, 300);
    }
};

window.toggleMatrixGenerator = function() {
    const modal = document.getElementById('matrix-generator-modal');
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => modal.classList.remove('opacity-0'), 10);
    } else {
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }, 300);
    }
};

let matrixIncrement = 50;

// Setup Increment Buttons
document.querySelectorAll('.matrix-inc-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.matrix-inc-btn').forEach(b => {
            b.classList.remove('bg-blue-600', 'text-white');
            b.classList.add('text-gray-400');
        });
        e.target.classList.remove('text-gray-400');
        e.target.classList.add('bg-blue-600', 'text-white');
        matrixIncrement = parseInt(e.target.getAttribute('data-inc'), 10);
    });
});

// Generate Matrix Logic
document.getElementById('btn-generate-matrix').addEventListener('click', () => {
    const rangeInput = document.getElementById('bal-input-range');
    const originalRange = parseFloat(rangeInput.value) || 100;
    
    // We will generate rows up to the current target, or a min of 250y if target is very close
    const maxRange = Math.max(originalRange, 250);
    const tbody = document.getElementById('matrix-tbody');
    tbody.innerHTML = '';
    
    document.getElementById('matrix-empty-state').classList.add('hidden');
    document.getElementById('matrix-table').classList.remove('hidden');
    document.getElementById('btn-matrix-to-vault').classList.remove('hidden');
    
    const opticMode = window.currentOpticMode || 'MIL';
    let isPrevLogThrottle = window.solverLogThrottle;
    window.solverLogThrottle = setTimeout(()=>{}, 99999); // suppress logs temporarily
    
    for (let d = matrixIncrement; d <= maxRange; d += matrixIncrement) {
        // Hijack DOM input
        rangeInput.value = d;
        window.runSolverMatrix(); // calculate synchronous
        
        // Harvest results from the DOM updates
        const elev = document.getElementById('sol-elev-mil')?.textContent || '0.00';
        const elevDir = document.getElementById('sol-elev-label-code')?.textContent || 'U';
        const wind = document.getElementById('sol-wind-mil')?.textContent || '0.00';
        const windDir = document.getElementById('sol-wind-label-code')?.textContent || 'R';
        const vel = document.getElementById('sol-vel')?.textContent || '0';
        const energy = document.getElementById('sol-energy')?.textContent || '0';
        
        // Build row
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="py-1 px-2 border-r border-gray-800 text-emerald-400">${d}</td>
            <td class="py-1 px-2 border-r border-gray-800">${elevDir}${elev} ${opticMode}</td>
            <td class="py-1 px-2 border-r border-gray-800">${windDir}${wind} ${opticMode}</td>
            <td class="py-1 px-2 hidden sm:table-cell text-gray-400 border-r border-gray-800">${vel}</td>
            <td class="py-1 px-2 hidden sm:table-cell text-gray-400">${energy}</td>
        `;
        tbody.appendChild(tr);
    }
    
    // Restore and recalculate
    rangeInput.value = originalRange;
    window.runSolverMatrix();
    clearTimeout(window.solverLogThrottle);
    window.solverLogThrottle = isPrevLogThrottle;
});

// Save to Vault Logic
document.getElementById('btn-matrix-to-vault').addEventListener('click', async (e) => {
    if(e) e.stopPropagation();
    const targetEl = document.getElementById('matrix-snapshot-target');
    const btn = document.getElementById('btn-matrix-to-vault');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin inline-block mr-1"></i> SAVING...`;
    
    try {
        const tbody = document.getElementById('matrix-tbody');
        const origTable = document.getElementById('matrix-table');
        const allRows = Array.from(tbody.querySelectorAll('tr'));
        
        // -------------------------------------------------------------
        // MULTI-COLUMN MAGIC FOR MASSIVE DOPE CARDS
        // We split tall matrices into side-by-side columns on a single card
        // -------------------------------------------------------------
        const MAX_ROWS_PER_COL = 26; 
        const numCols = Math.ceil(allRows.length / MAX_ROWS_PER_COL) || 1;
        
        const origDisplay = origTable.style.display;
        origTable.style.display = 'none'; // hide original table
        
        // Build the physical layout container
        const multiColContainer = document.createElement('div');
        multiColContainer.style.display = 'flex';
        multiColContainer.style.flexDirection = 'row';
        multiColContainer.style.gap = '16px';
        multiColContainer.style.padding = '12px';
        multiColContainer.style.backgroundColor = '#000000';
        multiColContainer.style.width = 'max-content';
        
        for (let i = 0; i < numCols; i++) {
            const newTable = origTable.cloneNode(true);
            newTable.id = ''; 
            newTable.style.display = 'table';
            newTable.style.width = 'max-content'; 
            newTable.style.tableLayout = 'auto';
            newTable.classList.remove('hidden', 'w-full');
            
            const newTbody = newTable.querySelector('tbody');
            newTbody.innerHTML = '';
            
            const chunk = allRows.slice(i * MAX_ROWS_PER_COL, (i + 1) * MAX_ROWS_PER_COL);
            chunk.forEach(row => {
                const rowClone = row.cloneNode(true);
                rowClone.querySelectorAll('td, th').forEach(c => {
                    c.style.whiteSpace = 'nowrap';
                    c.style.fontSize = '12px';
                    c.style.padding = '6px 12px';
                    c.style.border = '1px solid #1f2937'; // gray-800
                });
                newTbody.appendChild(rowClone);
            });
            
            newTable.querySelectorAll('thead th').forEach(th => {
                th.style.whiteSpace = 'nowrap';
                th.style.fontSize = '12px';
                th.style.padding = '6px 12px';
                th.style.border = '1px solid #1f2937';
            });
            
            multiColContainer.appendChild(newTable);
        }
        
        targetEl.appendChild(multiColContainer);
        await new Promise(r => setTimeout(r, 100)); // reflow
        
        const canvas = await html2canvas(multiColContainer, {
            backgroundColor: '#000000',
            scale: Math.max(window.devicePixelRatio || 2, 2),
            logging: false
        });
        
        // Cleanup DOM instantly
        multiColContainer.remove();
        origTable.style.display = origDisplay;
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        
        // Formulate a clean intel record name
        const now = new Date();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const timeStr = `${mm}${dd}-${hh}${min}`;
        
        window.saveIntelSnapshot(`MATRIX-${timeStr}`, imgData);
        
        btn.innerHTML = `<i data-lucide="check" class="w-4 h-4 inline-block mr-1"></i> SENT TO INTEL VAULT`;
        if (window.pushTacLog) window.pushTacLog("BALLISTIC MATRIX SAVED TO INTEL VAULT", "SUCCESS");
        
        setTimeout(() => { btn.innerHTML = originalText; if (window.lucide) window.lucide.createIcons(); }, 2000);
    } catch (e) {
        console.error("Matrix save error", e);
        btn.innerHTML = `<i data-lucide="alert-triangle" class="w-4 h-4"></i> ERROR`;
        setTimeout(() => { btn.innerHTML = originalText; if (window.lucide) window.lucide.createIcons(); }, 2000);
    }
});



// Save Weather to Vault Logic
document.getElementById('btn-weather-to-vault').addEventListener('click', async (e) => {
    if(e) e.stopPropagation();
    const targetEl = document.getElementById('weather-panel-content');
    const btn = document.getElementById('btn-weather-to-vault');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-3 h-3 animate-spin inline-block mr-1"></i> SAVING...`;
    
    try {
        const canvas = await window.html2canvas(targetEl, {
            backgroundColor: '#030712', // Use very dark gray instead of pure black
            scale: Math.max(window.devicePixelRatio || 2, 2),
            logging: false,
            onclone: (clonedDoc) => {
                const clonedTarget = clonedDoc.getElementById('weather-panel-content');
                if (clonedTarget) {
                    clonedTarget.style.height = 'max-content';
                    clonedTarget.style.width = targetEl.offsetWidth + 'px';
                    // Fix Tailwind CSS opacity classes that html2canvas fails to parse
                    const fixClasses = clonedTarget.querySelectorAll('.bg-black\\/50, .bg-black\\/40, .from-black\\/40, .border-gray-800\\/50');
                    fixClasses.forEach(el => {
                        if(el.classList.contains('bg-black/50') || el.classList.contains('bg-black/40')) el.style.backgroundColor = 'rgba(0,0,0,0.5)';
                        if(el.classList.contains('from-black/40')) el.style.backgroundColor = 'rgba(0,0,0,0.4)';
                        if(el.classList.contains('border-gray-800/50')) { el.style.borderColor = 'rgba(31,41,55,0.5)'; el.style.borderWidth = '1px'; }
                        el.style.backgroundImage = 'none'; // remove gradients
                    });
                }
            }
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        
        const now = new Date();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const timeStr = `${mm}${dd}-${hh}${min}`;
        
        await window.saveIntelSnapshot(`WEATHER-${timeStr}`, imgData);
        
        btn.innerHTML = `<i data-lucide="check" class="w-3 h-3 inline-block mr-1"></i> SENT TO INTEL VAULT`;
        if (window.pushTacLog) window.pushTacLog("WEATHER SNAPSHOT SAVED TO INTEL VAULT", "SUCCESS");
        
        setTimeout(() => { btn.innerHTML = originalText; if (window.lucide) window.lucide.createIcons(); }, 2000);
    } catch (e) {
        console.error("Weather save error", e);
        btn.innerHTML = `<i data-lucide="alert-triangle" class="w-3 h-3"></i> ERROR`;
        setTimeout(() => { btn.innerHTML = originalText; if (window.lucide) window.lucide.createIcons(); }, 2000);
    }
});
// Save Ballistic Solver to Vault Logic
const btnBallisticToVault = document.getElementById('btn-ballistic-to-vault');
if (btnBallisticToVault) {
    btnBallisticToVault.addEventListener('click', async (e) => {
        if(e) e.stopPropagation();
        const targetEl = document.getElementById('ballistic-panel-content');
        const originalText = btnBallisticToVault.innerHTML;
        btnBallisticToVault.innerHTML = `<i data-lucide="loader-2" class="w-5 h-5 animate-spin inline-block mr-1"></i> SAVING...`;
        
        try {
            await new Promise(r => setTimeout(r, 50));
            
            const origInputs = targetEl.querySelectorAll('input');
            
            const canvas = await window.html2canvas(targetEl, {
                backgroundColor: '#000000',
                scale: Math.max(window.devicePixelRatio || 2, 2),
                logging: false,
                windowWidth: targetEl.scrollWidth,
                windowHeight: targetEl.scrollHeight,
                onclone: (clonedDoc) => {
                    const clonedTarget = clonedDoc.getElementById('ballistic-panel-content');
                    if (clonedTarget) {
                        clonedTarget.style.height = 'max-content';
                        clonedTarget.style.width = targetEl.offsetWidth + 'px';
                        clonedTarget.style.overflow = 'visible';
                        
                        // Fix Tailwind CSS opacity classes that html2canvas fails to parse
                        const fixClasses = clonedTarget.querySelectorAll('.bg-black\\/50, .bg-gray-800\\/50, .bg-gray-900\\/80, .border-gray-800\\/50');
                        fixClasses.forEach(el => {
                            if(el.classList.contains('bg-black/50')) el.style.backgroundColor = 'rgba(0,0,0,0.5)';
                            if(el.classList.contains('bg-gray-800/50') || el.classList.contains('bg-gray-900/80')) el.style.backgroundColor = 'rgba(17,24,39,0.8)';
                            if(el.classList.contains('border-gray-800/50')) { el.style.borderColor = 'rgba(31,41,55,0.5)'; el.style.borderWidth = '1px'; }
                            el.style.backgroundImage = 'none'; // remove gradients
                        });

                        const scrollDiv = clonedTarget.querySelector('.overflow-y-auto');
                        if (scrollDiv) {
                            scrollDiv.style.height = 'max-content';
                            scrollDiv.style.overflow = 'visible';
                            
                            // Replace all inputs with identical looking divs to fix html2canvas text clipping
                            const cloneInputs = clonedTarget.querySelectorAll('input');
                            origInputs.forEach((inp, idx) => {
                                const cInp = cloneInputs[idx];
                                if(cInp) {
                                    const div = clonedDoc.createElement('div');
                                    div.className = cInp.className;
                                    div.style.display = 'flex';
                                    div.style.alignItems = 'center';
                                    div.style.minHeight = cInp.offsetHeight + 'px';
                                    div.style.padding = '0';
                                    div.style.margin = '0';
                                    div.style.lineHeight = '1';
                                    div.innerText = inp.value || cInp.placeholder || '';
                                    cInp.parentNode.replaceChild(div, cInp);
                                }
                            });
                        }
                    }
                },
                ignoreElements: (element) => {
                    if (element.id === 'matrix-generator-modal') return true;
                    return false;
                }
            });
            
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            
            const now = new Date();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const hh = String(now.getHours()).padStart(2, '0');
            const min = String(now.getMinutes()).padStart(2, '0');
            const timeStr = `${mm}${dd}-${hh}${min}`;
            
            if (window.saveIntelSnapshot) {
                window.saveIntelSnapshot(`SOLVER-${timeStr}`, imgData);
            }
            
            btnBallisticToVault.innerHTML = `<i data-lucide="check" class="w-5 h-5 inline-block mr-1"></i> SENT TO INTEL VAULT`;
            if (window.pushTacLog) window.pushTacLog("SOLVER SNAPSHOT SAVED TO INTEL VAULT", "SUCCESS");
            
            setTimeout(() => { btnBallisticToVault.innerHTML = originalText; if (window.lucide) window.lucide.createIcons(); }, 2000);
        } catch (e) {
            console.error("Ballistic save error", e);
            btnBallisticToVault.innerHTML = `<i data-lucide="alert-triangle" class="w-5 h-5"></i>`;
            setTimeout(() => { btnBallisticToVault.innerHTML = originalText; if (window.lucide) window.lucide.createIcons(); }, 2000);
        }
    });
}


// --- BREADCRUMB ROUTE TRACKER LOGIC ---
let isGeoTracking = false;
let geoTrackData = [];
let geoTrackPolyline = null;
let geoTrackWatchId = null;
let geoTrackLiveDot = null;

let loadedRoutePolyline = null; 
let loadedStartMarker = null;
let loadedEndMarker = null;

window.loadRouteToMap = function(routeData) {
    if (!routeData || routeData.length === 0 || !window.orbitalMap) return;
    
    // Clear any previous loaded route
    if (loadedRoutePolyline) {
        window.orbitalMap.removeLayer(loadedRoutePolyline);
        if (loadedStartMarker) window.orbitalMap.removeLayer(loadedStartMarker);
        if (loadedEndMarker) window.orbitalMap.removeLayer(loadedEndMarker);
    }
    
    // Draw the new route (Yellow)
    loadedRoutePolyline = L.polyline(routeData, {color: 'yellow', weight: 4, opacity: 0.8, dashArray: '5, 10'}).addTo(window.orbitalMap);
    
    // Add Start/End markers
    const startPoint = routeData[0];
    const endPoint = routeData[routeData.length - 1];
    
    loadedStartMarker = L.circleMarker(startPoint, {radius: 6, color: 'green', fillColor: 'green', fillOpacity: 1}).addTo(window.orbitalMap).bindTooltip("ROUTE START", {permanent: true, direction: 'right'});
    loadedEndMarker = L.circleMarker(endPoint, {radius: 6, color: 'red', fillColor: 'red', fillOpacity: 1}).addTo(window.orbitalMap).bindTooltip("ROUTE END", {permanent: true, direction: 'right'});
    
    // Pan to bounds
    window.orbitalMap.fitBounds(loadedRoutePolyline.getBounds(), {padding: [50, 50]});
    
    // Maximize Map
    const panel = document.getElementById('panel-measuring');
    if (panel && !panel.classList.contains('is-maximized')) {
        window.toggleFullscreen('panel-measuring');
    }
    
    window.pushTacLog(`LOADED ROUTE WITH ${routeData.length} WAYPOINTS`, "SUCCESS");
};

// Delay attaching listener just in case DOM isn't fully ready
setTimeout(() => {
    const trackBtn = document.getElementById('geo-track-route-btn');
    if (trackBtn) {
        trackBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!isGeoTracking) {
                // START TRACKING
                if (window.isGhostMode) {
                    alert("Ghost Mode is ACTIVE. Tracking is disabled to hide location.");
                    return;
                }
                if (!navigator.geolocation) {
                    alert("Geolocation is not supported by your browser");
                    return;
                }
                
                if (!window.orbitalMap) {
                    alert("Map is not initialized yet. Please open the Geo Matrix panel first.");
                    return;
                }
                
                isGeoTracking = true;
                geoTrackData = [];
                if (geoTrackPolyline) window.orbitalMap.removeLayer(geoTrackPolyline);
                if (geoTrackLiveDot) window.orbitalMap.removeLayer(geoTrackLiveDot);
                
                geoTrackPolyline = L.polyline([], {color: '#ef4444', weight: 5, opacity: 0.9}).addTo(window.orbitalMap);
                geoTrackLiveDot = L.circleMarker([0,0], {radius: 6, color: '#ffffff', weight: 2, fillColor: '#ef4444', fillOpacity: 1}).addTo(window.orbitalMap);
                
                trackBtn.innerHTML = '<i data-lucide="radio" class="w-3 h-3 animate-pulse"></i> RECORDING';
                trackBtn.classList.replace('bg-indigo-950/80', 'bg-red-900');
                trackBtn.classList.replace('text-indigo-300', 'text-white');
                trackBtn.classList.add('animate-pulse');
                if (window.lucide) window.lucide.createIcons();
                
                window.pushTacLog("ROUTE TRACKER ACTIVATED", "SUCCESS");
                
                // INSTANTLY DROP DOT ON CURRENT MAP CENTER
                const center = window.orbitalMap.getCenter();
                geoTrackData.push([center.lat, center.lng]);
                geoTrackPolyline.addLatLng([center.lat, center.lng]);
                geoTrackLiveDot.setLatLng([center.lat, center.lng]);
                
                geoTrackWatchId = navigator.geolocation.watchPosition((pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    geoTrackData.push([lat, lng]);
                    geoTrackPolyline.addLatLng([lat, lng]);
                    geoTrackLiveDot.setLatLng([lat, lng]);
                    window.orbitalMap.setView([lat, lng]); 
                }, (err) => {
                    console.warn("Tracker GPS error:", err);
                }, { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 });
                
            } else {
                // STOP TRACKING & SAVE
                isGeoTracking = false;
                if (geoTrackWatchId !== null) navigator.geolocation.clearWatch(geoTrackWatchId);
                
                trackBtn.innerHTML = '<i data-lucide="loader-2" class="w-3 h-3 animate-spin inline-block mr-1"></i> SAVING...';
                trackBtn.classList.remove('animate-pulse');
                if (window.lucide) window.lucide.createIcons();
                
                try {
                    const targetEl = document.getElementById('geo-measure-stage');
                    await new Promise(r => setTimeout(r, 500)); 
                    
                    const canvas = await window.html2canvas(targetEl, {
                        backgroundColor: '#030712',
                        useCORS: true,
                        allowTaint: false,
                        scale: 1, 
                        ignoreElements: (element) => element.id === 'geo-toolkit-bar'
                    });
                    
                    const imgData = canvas.toDataURL('image/jpeg', 0.95);
                    const now = new Date();
                    const timeStr = `${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
                    
                    const finalRoute = JSON.parse(JSON.stringify(geoTrackData));
                    
                    if (window.saveIntelSnapshot && finalRoute.length > 0) {
                        let routeName = prompt("Enter a name to save this tracked route:", `ROUTE-${timeStr}`);
                        if (routeName !== null && routeName.trim() !== "") {
                            window.saveIntelSnapshot(routeName.trim(), imgData, { routeTracker: finalRoute });
                            window.pushTacLog(`ROUTE SAVED WITH ${finalRoute.length} WAYPOINTS`, "SUCCESS");
                        } else {
                            window.pushTacLog(`ROUTE SAVE CANCELLED BY USER`, "WARNING");
                        }
                    } else {
                         window.pushTacLog(`ROUTE TRACKER STOPPED (NO MOVEMENT DETECTED)`, "WARNING");
                         alert("Route was not saved because 0 GPS waypoints were collected.");
                    }
                    
                    if (geoTrackPolyline) {
                        window.orbitalMap.removeLayer(geoTrackPolyline);
                        geoTrackPolyline = null;
                    }
                    if (geoTrackLiveDot) {
                        window.orbitalMap.removeLayer(geoTrackLiveDot);
                        geoTrackLiveDot = null;
                    }
                    geoTrackData = [];
                    
                } catch (e) {
                    console.error("Route save error:", e);
                    alert("Failed to save route screenshot.");
                }
                
                // RESET BUTTON
                trackBtn.innerHTML = '<i data-lucide="navigation" class="w-3 h-3"></i> TRACK';
                trackBtn.classList.replace('bg-red-900', 'bg-indigo-950/80');
                trackBtn.classList.replace('text-white', 'text-indigo-300');
                if (window.lucide) window.lucide.createIcons();
            }
        });
    }

    // GHOST MODE LOGIC
    window.isGhostMode = false;
    const ghostBtn = document.getElementById('geo-ghost-mode-btn');
    if (ghostBtn) {
        ghostBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.isGhostMode = !window.isGhostMode;
            if (window.isGhostMode) {
                // ENABLE GHOST MODE
                ghostBtn.classList.replace('bg-gray-800', 'bg-emerald-900');
                ghostBtn.classList.replace('text-gray-400', 'text-emerald-300');
                ghostBtn.innerHTML = '<i data-lucide="ghost" class="w-3 h-3"></i> GHOST: ON';
                if (window.lucide) window.lucide.createIcons();
                
                // Kill all tracking
                if (geoTrackWatchId !== null) {
                    navigator.geolocation.clearWatch(geoTrackWatchId);
                    geoTrackWatchId = null;
                }
                if (window.geoWatchId) {
                    navigator.geolocation.clearWatch(window.geoWatchId);
                    window.geoWatchId = null;
                }
                if (window.hudGeoWatchId) {
                    navigator.geolocation.clearWatch(window.hudGeoWatchId);
                    window.hudGeoWatchId = null;
                }
                
                // Hide tracking dots
                if (geoTrackLiveDot && window.orbitalMap) {
                    window.orbitalMap.removeLayer(geoTrackLiveDot);
                    geoTrackLiveDot = null;
                }
                if (window.commsLiveDot && window.commsMapInstance) {
                    window.commsMapInstance.removeLayer(window.commsLiveDot);
                    window.commsLiveDot = null;
                }
                
                // If route tracking was on, turn it off visually
                if (isGeoTracking) {
                    isGeoTracking = false;
                    const trackBtn = document.getElementById('geo-track-route-btn');
                    if (trackBtn) {
                        trackBtn.innerHTML = '<i data-lucide="navigation" class="w-3 h-3"></i> TRACK';
                        trackBtn.classList.replace('bg-red-900', 'bg-indigo-950/80');
                        trackBtn.classList.replace('text-white', 'text-indigo-300');
                        trackBtn.classList.remove('animate-pulse');
                        if (window.lucide) window.lucide.createIcons();
                    }
                }
                
                window.pushTacLog("GHOST MODE ACTIVATED. LOCATION CLOAKED.", "WARNING");
            } else {
                // DISABLE GHOST MODE
                ghostBtn.classList.replace('bg-emerald-900', 'bg-gray-800');
                ghostBtn.classList.replace('text-emerald-300', 'text-gray-400');
                ghostBtn.innerHTML = '<i data-lucide="ghost" class="w-3 h-3"></i> GHOST';
                if (window.lucide) window.lucide.createIcons();
                window.pushTacLog("GHOST MODE DEACTIVATED. LOCATION VISIBLE.", "SYS");
            }
        });
    }
}, 1000);

// Device Orientation (Compass Spin) for Tactical Map Overlay
let currentCompassHeading = 0;
let lastCompassUpdate = 0;

function computeTrueHeading(alpha, beta, gamma) {
    // Convert degrees to radians
    const dtor = Math.PI / 180;
    const a = (alpha || 0) * dtor;
    const b = (beta || 0) * dtor;
    const g = (gamma || 0) * dtor;

    // Standard 3D Euler to Compass projection
    const cX = Math.cos(a) * Math.sin(b) * Math.sin(g) - Math.sin(a) * Math.cos(g);
    const cY = Math.sin(a) * Math.sin(b) * Math.sin(g) + Math.cos(a) * Math.cos(g);
    
    let heading = Math.atan2(cX, cY) * (180 / Math.PI);
    if (heading < 0) heading += 360;
    
    // The W3C calculation returns clockwise from North, but sometimes it's inverted based on device manufacturer
    return heading;
}

function handleCompass(event) {
    let targetHeading = null;
    
    if (event.webkitCompassHeading !== undefined) {
        // iOS provides a perfectly calibrated heading out of the box
        targetHeading = event.webkitCompassHeading;
    } else if (event.alpha !== null) {
        // Android requires 3D projection if the phone is held upright!
        targetHeading = computeTrueHeading(event.alpha, event.beta, event.gamma);
        
        // Android absolute alpha sometimes varies by manufacturer (fallback inversion)
        // If it's perfectly 180 degrees backward, this standard mathematical projection handles it correctly 
        // by factoring in the beta/gamma tilt.
    }

    if (targetHeading !== null) {
        // Prevent wild spinning: only update 30 times a second max
        const now = Date.now();
        if (now - lastCompassUpdate < 33) return;
        lastCompassUpdate = now;

        // Find shortest path to prevent 360 rewind spinning bug
        let diff = targetHeading - currentCompassHeading;
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;

        // Low pass filter for smoothing (15% per frame)
        currentCompassHeading += diff * 0.15;

        const compass = document.getElementById('compass-overlay');
        if (compass && !compass.classList.contains('hidden')) {
            const ring = compass.querySelector('#compass-rose-group');
            if (ring) {
                ring.style.transformOrigin = '500px 500px';
                ring.style.transform = `rotate(${-currentCompassHeading}deg)`;
                
                // Counter-rotate the cardinal points so text stays upright
                const textElements = ring.querySelectorAll('.compass-text-group text');
                textElements.forEach(textEl => {
                    const x = textEl.getAttribute('x');
                    const y = textEl.getAttribute('y');
                    textEl.style.transformOrigin = `${x}px ${y}px`;
                    textEl.style.transform = `rotate(${currentCompassHeading}deg)`;
                });
            }
        }
    }
}

if (window.DeviceOrientationEvent) {
    if ('ondeviceorientationabsolute' in window) {
        window.addEventListener("deviceorientationabsolute", handleCompass, true);
    } else {
        window.addEventListener("deviceorientation", handleCompass, true);
    }
}


// ==============================================
// MY GPS SYNC & TEAMMATE LOCATOR JUMP LOGIC
// ==============================================
window.geoSyncGPS = function() {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your device browser.");
        return;
    }
    const displayEl = document.getElementById('geo-my-coords-display');
    const badgeEl = document.getElementById('geo-my-coords-badge');
    if (displayEl) displayEl.textContent = "ACQUIRING...";
    if (badgeEl) badgeEl.classList.remove('hidden');

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            window.myLatestCoords = { lat, lng };

            const latStr = lat.toFixed(6);
            const lngStr = lng.toFixed(6);
            const coordText = `${latStr}, ${lngStr}`;

            if (displayEl) displayEl.textContent = coordText;
            const hudLat = document.getElementById('hud-gps-lat');
            const hudLon = document.getElementById('hud-gps-lon');
            if (hudLat) hudLat.textContent = latStr;
            if (hudLon) hudLon.textContent = lngStr;

            if (window.orbitalMap) {
                window.orbitalMap.setView([lat, lng], 17);
                if (window.mySelfPositionMarker) {
                    window.mySelfPositionMarker.setLatLng([lat, lng]);
                } else {
                    const icon = L.divIcon({
                        className: 'custom-div-icon',
                        html: `<div class="relative w-4 h-4 flex items-center justify-center"><div class="absolute w-full h-full rounded-full bg-emerald-500 animate-ping opacity-75"></div><div class="relative w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center text-[5px] text-white font-black">★</div></div>`,
                        iconSize: [16, 16]
                    });
                    window.mySelfPositionMarker = L.marker([lat, lng], { icon }).addTo(window.orbitalMap);
                    window.mySelfPositionMarker.bindTooltip(`MY POSITION: ${coordText}`, { permanent: true, direction: 'top', className: 'tactical-tooltip' });
                }
            }

            if (window.pushTacLog) window.pushTacLog(`MY GPS SYNC COMPLETE: LAT ${latStr} | LON ${lngStr}`, "SUCCESS");
        },
        (err) => {
            console.warn("GPS Sync error:", err);
            if (displayEl) displayEl.textContent = "GPS ERROR / DENIED";
            alert("Could not acquire GPS position. Ensure location services are enabled.");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
};

window.teammateLocatorMarker = null;

window.geoJumpToCoords = function() {
    const input = document.getElementById('geo-coord-jump-input') || document.getElementById('geo-jump-coords');
    if (!input || !input.value.trim()) {
        alert("Please enter teammate coordinates in Lat, Lon format (e.g. 34.123456, -118.654321).");
        return;
    }

    const val = input.value.trim();
    const parts = val.split(/[\s,]+/).filter(Boolean);

    if (parts.length < 2) {
        alert("Invalid coordinate format. Enter Latitude and Longitude separated by comma (e.g. 34.1234, -118.5678).");
        return;
    }

    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        alert("Invalid Latitude/Longitude values. Latitude must be between -90 and 90, Longitude between -180 and 180.");
        return;
    }

    if (!window.orbitalMap) {
        alert("Sat Map is not initialized yet. Open Geo-Matrix panel first.");
        return;
    }

    window.orbitalMap.setView([lat, lng], 17);

    let distanceStr = '';
    let bearingStr = '';
    if (window.myLatestCoords) {
        const R = 6371e3;
        const φ1 = window.myLatestCoords.lat * Math.PI/180;
        const φ2 = lat * Math.PI/180;
        const Δφ = (lat - window.myLatestCoords.lat) * Math.PI/180;
        const Δλ = (lng - window.myLatestCoords.lng) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const meters = R * c;
        const yards = meters * 1.09361;
        distanceStr = `${Math.round(yards)} YDS (${Math.round(meters)}m)`;

        const y = Math.sin(Δλ) * Math.cos(φ2);
        const x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ);
        let brng = Math.atan2(y, x) * 180 / Math.PI;
        brng = (brng + 360) % 360;
        bearingStr = `${Math.round(brng)}°`;
    }

    const icon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="relative w-5 h-5 flex items-center justify-center"><div class="absolute w-full h-full rounded-full bg-cyan-400 animate-ping opacity-90"></div><div class="relative w-4 h-4 bg-cyan-500 border-2 border-white rounded-full flex items-center justify-center text-[7px] text-black font-black">🎯</div></div>`,
        iconSize: [20, 20]
    });

    if (window.teammateLocatorMarker) {
        window.orbitalMap.removeLayer(window.teammateLocatorMarker);
    }

    const labelText = `TEAMMATE LOCATOR: ${lat.toFixed(6)}, ${lng.toFixed(6)}` + (distanceStr ? ` | DIST: ${distanceStr} | BRG: ${bearingStr}` : '');
    window.teammateLocatorMarker = L.marker([lat, lng], { icon }).addTo(window.orbitalMap);
    window.teammateLocatorMarker.bindTooltip(labelText, { permanent: true, direction: 'top', className: 'tactical-tooltip' }).openTooltip();

    if (window.pushTacLog) {
        window.pushTacLog(`TEAMMATE LOCATOR JUMP: LAT ${lat.toFixed(6)}, LON ${lng.toFixed(6)} ${distanceStr ? `(DIST: ${distanceStr}, BRG: ${bearingStr})` : ''}`, "SUCCESS");
    }
};

// ==============================================
// EMERGENCY SIREN DETERRENT
// ==============================================
let sirenContext = null;
let sirenOsc1 = null;
let sirenOsc2 = null;
let sirenGain = null;
let sirenInterval = null;
let isSirenActive = false;

function toggleSiren() {
    const sirenBtn = document.getElementById('siren-deterrent-btn');
    if (isSirenActive) {
        // Stop Siren
        isSirenActive = false;
        clearInterval(sirenInterval);
        if (sirenOsc1) { try { sirenOsc1.stop(); sirenOsc1.disconnect(); } catch(e){} }
        if (sirenOsc2) { try { sirenOsc2.stop(); sirenOsc2.disconnect(); } catch(e){} }
        if (sirenGain) { try { sirenGain.disconnect(); } catch(e){} }
        sirenOsc1 = null;
        sirenOsc2 = null;
        if (sirenBtn) {
            sirenBtn.classList.remove('bg-red-600', 'animate-pulse');
            sirenBtn.classList.add('bg-red-950/30');
        }
        if (window.pushTacLog) window.pushTacLog("EMERGENCY SIREN DEACTIVATED", "SYS");
    } else {
        // Start Siren
        isSirenActive = true;
        try {
            if (!sirenContext) {
                sirenContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (sirenContext.state === 'suspended') {
                sirenContext.resume();
            }
            
            sirenGain = sirenContext.createGain();
            sirenGain.gain.value = 1.0; // Max volume
            sirenGain.connect(sirenContext.destination);
            
            sirenOsc1 = sirenContext.createOscillator();
            sirenOsc1.type = 'square'; // Harsh, loud sound
            sirenOsc1.connect(sirenGain);
            sirenOsc1.start();
            
            sirenOsc2 = sirenContext.createOscillator();
            sirenOsc2.type = 'sawtooth';
            sirenOsc2.connect(sirenGain);
            sirenOsc2.start();

            // Wail effect (Yelp / European Police Siren style)
            let high = true;
            sirenInterval = setInterval(() => {
                if (!isSirenActive) return;
                if (high) {
                    sirenOsc1.frequency.setValueAtTime(1200, sirenContext.currentTime);
                    sirenOsc2.frequency.setValueAtTime(1250, sirenContext.currentTime);
                } else {
                    sirenOsc1.frequency.setValueAtTime(600, sirenContext.currentTime);
                    sirenOsc2.frequency.setValueAtTime(620, sirenContext.currentTime);
                }
                high = !high;
            }, 300); // toggle every 300ms

            if (sirenBtn) {
                sirenBtn.classList.remove('bg-red-950/30');
                sirenBtn.classList.add('bg-red-600', 'animate-pulse');
            }
            if (window.pushTacLog) window.pushTacLog("EMERGENCY SIREN ACTIVATED!", "WARN");
        } catch(err) {
            console.error("Siren failed:", err);
            isSirenActive = false;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const sirenBtn = document.getElementById('siren-deterrent-btn');
    if (sirenBtn) {
        sirenBtn.addEventListener('click', toggleSiren);
    }
});

// ============================================================================
// OPERATIONAL CALENDAR SYSTEM
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Inventory Management
    function getCalendarInventory() {
        return JSON.parse(localStorage.getItem('rangeCardCalendarInventory') || '{}');
    }
    function saveCalendarInventory(inv) {
        localStorage.setItem('rangeCardCalendarInventory', JSON.stringify(inv));
    }

    const modal = document.getElementById('calendarModal');
    const closeBtn = document.getElementById('closeCalendarBtn');
    const prevMonthBtn = document.getElementById('calendar-prev-month');
    const nextMonthBtn = document.getElementById('calendar-next-month');
    const monthYearDisplay = document.getElementById('calendar-month-year');
    const grid = document.getElementById('calendar-grid');
    const clearBtn = document.getElementById('calendar-clear-btn');
    const saveInvBtn = document.getElementById('calendar-save-inventory-btn');
    const libraryList = document.getElementById('calendarLibraryList');
    const vaultBtnTop = document.getElementById('calendar-to-vault-btn-top');
    const reworkBtn = document.getElementById('rework-calendar-btn');

    let currentDate = new Date();
    // Use the first day of the current month
    currentDate.setDate(1);

    // Keep track of what we are reworking
    window.currentReworkCalendarId = null;

    // Temporary store to keep text when switching months
    let monthDataStore = {};

    function getMonthKey(date) {
        return `${date.getFullYear()}-${date.getMonth()}`;
    }

    function saveCurrentGridToStore() {
        if(!grid) return;
        const textareas = grid.querySelectorAll('textarea');
        const key = getMonthKey(currentDate);
        if(!monthDataStore[key]) monthDataStore[key] = {};
        
        textareas.forEach(ta => {
            const day = ta.dataset.day;
            if(day) {
                monthDataStore[key][day] = ta.value;
            }
        });
    }

    function renderCalendar() {
        if(!grid || !monthYearDisplay) return;
        
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
        monthYearDisplay.textContent = `${monthNames[month]} ${year}`;
        
        grid.innerHTML = '';
        
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const key = getMonthKey(currentDate);
        
        // Pad beginning
        for (let i = 0; i < firstDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = "bg-gray-900/30 border border-gray-800/50 rounded p-1 opacity-20 pointer-events-none";
            grid.appendChild(emptyCell);
        }
        
        // Days
        const dayNamesShort = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
        for (let day = 1; day <= daysInMonth; day++) {
            const dayOfWeek = (firstDay + day - 1) % 7;
            const cell = document.createElement('div');
            cell.className = "bg-gray-800/40 border border-gray-700/50 rounded flex flex-col p-1 gap-1 focus-within:border-neon-green/50 transition-colors relative min-h-[60px]";
            
            const isToday = new Date().getFullYear() === year && new Date().getMonth() === month && new Date().getDate() === day;
            const dayHeader = document.createElement('div');
            dayHeader.className = `text-[10px] font-mono font-bold px-1 flex justify-between items-center ${isToday ? 'text-neon-green bg-neon-green/10 rounded' : 'text-gray-400'}`;
            dayHeader.innerHTML = `<span>${day}</span><span class="opacity-40 text-[8px] uppercase tracking-widest">${dayNamesShort[dayOfWeek]}</span>`;
            cell.appendChild(dayHeader);
            
            const ta = document.createElement('textarea');
            
            // Add dynamic header highlighting on focus
            ta.addEventListener('focus', () => {
                const headerParent = document.getElementById('calendar-days-header');
                if (headerParent) {
                    Array.from(headerParent.children).forEach((child, index) => {
                        child.classList.remove('text-gray-400', 'text-neon-green', 'bg-neon-green/20', 'shadow-[0_0_10px_rgba(57,255,20,0.2)]', 'opacity-30', 'scale-110');
                        if (index === dayOfWeek) {
                            child.classList.add('text-neon-green', 'bg-neon-green/20', 'shadow-[0_0_10px_rgba(57,255,20,0.2)]', 'scale-110');
                        } else {
                            child.classList.add('opacity-30');
                        }
                    });
                }
            });
            ta.addEventListener('blur', () => {
                const headerParent = document.getElementById('calendar-days-header');
                if (headerParent) {
                    Array.from(headerParent.children).forEach((child) => {
                        child.classList.remove('text-neon-green', 'bg-neon-green/20', 'shadow-[0_0_10px_rgba(57,255,20,0.2)]', 'opacity-30', 'scale-110');
                        child.classList.add('text-gray-400');
                    });
                }
            });
            // Give it a unique ID for html2canvas
            ta.id = `cal-${year}-${month}-${day}`;
            ta.dataset.day = day;
            ta.className = "flex-1 w-full bg-transparent border-none text-[8px] md:text-[10px] text-gray-300 resize-none outline-none custom-scrollbar p-1 leading-tight h-full font-mono";
            ta.placeholder = "...";
            ta.spellcheck = false;
            
            // Restore from store if exists
            if (monthDataStore[key] && monthDataStore[key][day]) {
                ta.value = monthDataStore[key][day];
            }
            
            cell.appendChild(ta);
            grid.appendChild(cell);
        }
    }

    if(prevMonthBtn) {
        prevMonthBtn.addEventListener('click', (e) => {
            e.preventDefault();
            saveCurrentGridToStore();
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        });
    }

    if(nextMonthBtn) {
        nextMonthBtn.addEventListener('click', (e) => {
            e.preventDefault();
            saveCurrentGridToStore();
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        });
    }

    window.openCalendarModal = function() {
        if(!modal) return;
        modal.classList.remove('hidden');
        renderCalendar();
        window.updateCalendarList();
    };

    if(closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }

    if(clearBtn) {
        clearBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if(confirm('Clear the entire visible month?')) {
                const key = getMonthKey(currentDate);
                monthDataStore[key] = {};
                renderCalendar();
            }
        });
    }

    // Vault Button
    if(vaultBtnTop) {
        vaultBtnTop.addEventListener('click', (e) => {
            e.stopPropagation();
            try {
                const checkedBoxes = document.querySelectorAll('.calendar-vault-checkbox:checked');
                if (checkedBoxes.length === 0) return;

                const originalText = vaultBtnTop.innerHTML;
                vaultBtnTop.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin inline-block mr-1"></i> SAVING...`;
                if (window.lucide) window.lucide.createIcons();

                const inv = getCalendarInventory();
                let sentCount = 0;

                checkedBoxes.forEach((cb, i) => {
                    const id = cb.dataset.vaultId;
                    const item = inv[id];
                    if (item) {
                        const { image, ...metadata } = item;
                        metadata.type = 'operational_calendar';
                        metadata.timestamp = Date.now();
                        const label = item.label || 'O-CALENDAR';
                        
                        setTimeout(() => {
                            if (window.saveIntelSnapshot) {
                                window.saveIntelSnapshot(label, item.image, metadata);
                            }
                        }, i * 50);
                        sentCount++;
                    }
                });
                
                setTimeout(() => {
                    vaultBtnTop.innerHTML = `<i data-lucide="check" class="w-4 h-4 inline-block mr-1"></i> SENT TO INTEL VAULT (${sentCount})`;
                    if (window.pushTacLog) window.pushTacLog(`SENT ${sentCount} CALENDARS TO VAULT`, "SUCCESS");
                    
                    checkedBoxes.forEach(box => box.checked = false);
                    setTimeout(() => {
                        vaultBtnTop.innerHTML = originalText;
                        vaultBtnTop.classList.add('hidden');
                        if (window.lucide) window.lucide.createIcons();
                    }, 2000);
                }, checkedBoxes.length * 50 + 500);

            } catch(e) {
                console.error("Vault Send Error:", e);
                vaultBtnTop.innerHTML = originalText;
                alert("Error sending to vault: " + e.message);
            }
        });
    }

    // Save Logic
    let isSavingCalendar = false;
    if(saveInvBtn) {
        saveInvBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (isSavingCalendar) return;
            isSavingCalendar = true;
            
            // Force save current grid to store first
            saveCurrentGridToStore();
            
            const originalText = saveInvBtn.innerHTML;
            saveInvBtn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> SNAPSHOT...`;
            if (window.lucide) window.lucide.createIcons();
            
            try {
                if(!window.html2canvas && window.loadScript) {
                    await window.loadScript('html2canvas.min.js');
                }
                
                const targetEl = document.getElementById('calendar-snapshot-target');
                if(!targetEl) throw new Error("Snapshot target not found");
                
                // FIX: html2canvas captures position: sticky elements at their scrolled offset.
                // Scroll to 0 first so the header is naturally at the top.
                const scrollParent = targetEl.parentElement;
                const originalScrollTop = scrollParent ? scrollParent.scrollTop : 0;
                if (scrollParent) scrollParent.scrollTop = 0;
                
                const canvas = await window.html2canvas(targetEl, {
                    backgroundColor: '#0f172a', // slate-900
                    scale: Math.max(window.devicePixelRatio || 2, 2),
                    logging: false,
                    windowWidth: targetEl.scrollWidth,
                    windowHeight: targetEl.scrollHeight,
                    onclone: (clonedDoc) => {
                        const clonedTarget = clonedDoc.getElementById('calendar-snapshot-target');
                        if (clonedTarget) {
                            clonedTarget.style.height = 'max-content';
                            clonedTarget.style.width = targetEl.offsetWidth + 'px';
                            clonedTarget.style.overflow = 'visible';
                        }
                        
                        Array.from(targetEl.querySelectorAll('textarea')).forEach(originalTa => {
                            if (!originalTa.id) return;
                            const cloneTa = clonedDoc.getElementById(originalTa.id);
                            if (cloneTa) {
                                const div = clonedDoc.createElement('div');
                                div.style.cssText = window.getComputedStyle(cloneTa).cssText;
                                div.style.whiteSpace = 'pre-wrap';
                                div.style.wordBreak = 'break-word';
                                div.style.overflow = 'visible';
                                div.style.height = 'auto';
                                div.textContent = originalTa.value;
                                cloneTa.parentNode.replaceChild(div, cloneTa);
                            }
                        });
                    }
                });
                
                // Restore scroll
                if (scrollParent) scrollParent.scrollTop = originalScrollTop;
                
                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                const timestamp = Date.now();
                const monthName = monthYearDisplay.innerText;
                
                const newItem = {
                    id: timestamp,
                    timestamp: timestamp,
                    image: imgData,
                    type: 'operational_calendar',
                    label: monthName,
                    storeDump: JSON.parse(JSON.stringify(monthDataStore)) // Deep copy so they can reload it later
                };
                
                const inv = getCalendarInventory();
                
                // If we are reworking, we override the old one
                if (window.currentReworkCalendarId && inv[window.currentReworkCalendarId]) {
                    delete inv[window.currentReworkCalendarId];
                }
                window.currentReworkCalendarId = null;
                if(reworkBtn) reworkBtn.classList.add('hidden');
                
                inv[timestamp] = newItem;
                saveCalendarInventory(inv);
                
                window.updateCalendarList();
                
                saveInvBtn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> SAVED!`;
                if(window.pushTacLog) window.pushTacLog("CALENDAR SAVED TO INVENTORY", "SUCCESS");
                
                setTimeout(() => { saveInvBtn.innerHTML = originalText; if (window.lucide) window.lucide.createIcons(); }, 2000);
            } catch(err) {
                console.error("Calendar snapshot error:", err);
                saveInvBtn.innerHTML = `<i data-lucide="alert-triangle" class="w-4 h-4"></i> ERROR`;
                alert("Save Error: " + (err.message || "Unknown error occurred."));
                setTimeout(() => { saveInvBtn.innerHTML = originalText; if (window.lucide) window.lucide.createIcons(); }, 2000);
            } finally {
                isSavingCalendar = false;
            }
        });
    }

    // List Logic
    window.updateCalendarList = function() {
        if (!libraryList) return;
        libraryList.innerHTML = '';
        
        const inv = getCalendarInventory();
        const keys = Object.keys(inv).sort((a, b) => b - a); // newest first
        
        if (keys.length === 0) {
            libraryList.innerHTML = `<div class="col-span-full text-center py-10 text-gray-400 text-[10px] font-mono tracking-widest uppercase border border-dashed border-gray-800 rounded">No calendars found in inventory.</div>`;
            return;
        }
        
        keys.forEach(key => {
            const item = inv[key];
            const dateStr = new Date(parseInt(item.timestamp)).toLocaleString();
            
            const card = document.createElement('div');
            card.className = "bg-gray-900 border border-gray-700 rounded-lg overflow-hidden flex flex-col group relative";
            
            // Checkbox for Vault export integration
            card.innerHTML = `
                <div class="absolute top-2 left-2 z-30 bg-black/60 p-1 rounded">
                    <input name="${item.id}" autocomplete="off" type="checkbox" class="calendar-vault-checkbox w-4 h-4 bg-black/50 border border-gray-500 rounded text-neon-green focus:ring-neon-green/50 cursor-pointer shadow-lg" data-vault-id="${item.id}" data-type="calendar" aria-label="Select for Export">
                </div>
                <div class="h-32 bg-black relative cursor-pointer" >
                    <img src="${item.image}" class="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="Calendar Snapshot">
                    <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <i data-lucide="zoom-in" class="w-8 h-8 text-white drop-shadow-md"></i>
                    </div>
                </div>
                <div class="p-2 flex flex-col gap-1 border-t border-gray-800 bg-gray-950">
                    <div class="text-[10px] font-black text-white uppercase tracking-wider truncate">${item.label}</div>
                    <div class="text-[8px] text-gray-400 font-mono">${dateStr}</div>
                    <div class="flex gap-2 mt-2">
                        <button class="flex-1 bg-amber-900/40 hover:bg-amber-800 text-amber-500 text-[9px] font-bold py-1.5 rounded border border-amber-700/50 transition-colors uppercase load-cal-btn" data-id="${item.id}">
                            <i data-lucide="wrench" class="w-3 h-3 inline"></i> REWORK
                        </button>
                        <button class="bg-red-900/40 hover:bg-red-800 text-red-500 text-[9px] px-2 rounded border border-red-700/50 transition-colors delete-cal-btn" data-id="${item.id}">
                            <i data-lucide="trash-2" class="w-3 h-3"></i>
                        </button>
                    </div>
                </div>
            `;
            libraryList.appendChild(card);
        });
        
        // Attach events
        libraryList.querySelectorAll('.calendar-vault-checkbox').forEach(cb => {
            cb.addEventListener('change', () => {
                const checkedBoxes = document.querySelectorAll('.calendar-vault-checkbox:checked');
                const vaultBtnTop = document.getElementById('calendar-to-vault-btn-top');
                if(checkedBoxes.length > 0) {
                    if(vaultBtnTop) vaultBtnTop.classList.remove('hidden');
                } else {
                    if(vaultBtnTop) vaultBtnTop.classList.add('hidden');
                }
            });
        });

        libraryList.querySelectorAll('.delete-cal-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if(confirm("Delete this calendar from your Inventory?")) {
                    const id = e.currentTarget.dataset.id;
                    const inv = getCalendarInventory();
                    delete inv[id];
                    saveCalendarInventory(inv);
                    window.updateCalendarList();
                }
            });
        });
        
        libraryList.querySelectorAll('.load-cal-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = e.currentTarget.dataset.id;
                window.loadCalendarBackToEditorById(id);
            });
        });
        
        if (window.lucide) window.lucide.createIcons();
    };

    window.loadCalendarBackToEditorById = function(id) {
        const inv = getCalendarInventory();
        let item = inv[id];
        if(!item && window.getVaultItemById) {
            item = window.getVaultItemById(id);
        }
        if(!item) {
            alert("ERROR: Calendar data could not be found in local memory or vault cache.");
            console.error("Item not found in calendar inventory or vault cache:", id);
            return;
        }
        
        if (!item.storeDump) {
            alert("ERROR: This calendar card does not contain any saved text data (storeDump is missing).");
            return;
        }
        
        if(confirm("Loading this calendar will overwrite your current unsaved calendar text. Proceed?")) {
            monthDataStore = item.storeDump || {};
            window.currentReworkCalendarId = id;
            if(reworkBtn) {
                reworkBtn.classList.remove('hidden');
                // Pulse the button so they know they are editing an existing item
                reworkBtn.classList.add('animate-pulse');
                setTimeout(() => reworkBtn.classList.remove('animate-pulse'), 3000);
            }
            
            // To ensure they see what they just loaded, we could find the first populated month and switch to it.
            // For simplicity, we just trigger a re-render of the current month. If they saved it in July, they might need to flip to July to see the text.
            // Let's be smart: find the first key in the storeDump and parse the date.
            const keys = Object.keys(monthDataStore);
            if(keys.length > 0) {
                const parts = keys[0].split('-');
                if(parts.length === 2) {
                    currentDate = new Date(parseInt(parts[0]), parseInt(parts[1]), 1);
                }
            }
            
            if(modal && modal.classList.contains('hidden')) {
                modal.classList.remove('hidden');
            }
            
            renderCalendar();
            if(window.pushTacLog) window.pushTacLog("CALENDAR DATA LOADED INTO EDITOR", "INFO");
        }
    };
});

// Vault Integration Hook
document.addEventListener('DOMContentLoaded', () => {
    const vaultToCalBtn = document.getElementById('vault-to-cal-btn');
    if (vaultToCalBtn) {
        vaultToCalBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const checkedBoxes = document.querySelectorAll('.vault-export-checkbox:checked');
            
            if (checkedBoxes.length === 1) {
                const id = checkedBoxes[0].dataset.vaultId;
                if (window.loadCalendarBackToEditorById) {
                    window.loadCalendarBackToEditorById(id);
                }
            } else if (checkedBoxes.length > 1) {
                alert("Please select only ONE Calendar to load into the editor.");
                return;
            } else {
                if(window.openCalendarModal) {
                    window.openCalendarModal();
                }
            }
        });
    }
});



// ============================================================================
// GLOBAL TACTICAL ICON SYSTEM
// ============================================================================
window.tacticalIconLayers = [];
window.tacticalIconData = [];
window.activeIconStamp = null;

function initTacticalIconTray() {
    const geoIconTrayBtn = document.getElementById('geo-icons-btn');
    const commsIconTrayBtn = document.getElementById('comms-icons-btn');
    const iconTray = document.getElementById('tactical-icon-tray');
    const closeTrayBtn = document.getElementById('close-icon-tray');
    const stampBtns = document.querySelectorAll('.tactical-stamp-btn');
    const clearIconsBtn = document.getElementById('clear-tactical-icons-btn');

    const toggleTray = (e) => {
        e.stopPropagation();
        if (iconTray.classList.contains('hidden')) {
            iconTray.classList.remove('hidden');
            if(geoIconTrayBtn) {
                geoIconTrayBtn.classList.replace('text-gray-300', 'text-green-400');
                geoIconTrayBtn.classList.replace('border-gray-700', 'border-green-500');
            }
            if(commsIconTrayBtn) {
                commsIconTrayBtn.classList.replace('text-gray-300', 'text-green-400');
            }
        } else {
            iconTray.classList.add('hidden');
            if(geoIconTrayBtn) {
                geoIconTrayBtn.classList.replace('text-green-400', 'text-gray-300');
                geoIconTrayBtn.classList.replace('border-green-500', 'border-gray-700');
            }
            if(commsIconTrayBtn) {
                commsIconTrayBtn.classList.replace('text-green-400', 'text-gray-300');
            }
            deactivateStamp();
        }
    };

    if (geoIconTrayBtn && iconTray) geoIconTrayBtn.addEventListener('click', toggleTray);
    if (commsIconTrayBtn && iconTray) commsIconTrayBtn.addEventListener('click', toggleTray);

    if (closeTrayBtn && iconTray) {
        closeTrayBtn.addEventListener('click', () => {
            iconTray.classList.add('hidden');
            if(geoIconTrayBtn) {
                geoIconTrayBtn.classList.replace('text-green-400', 'text-gray-300');
                geoIconTrayBtn.classList.replace('border-green-500', 'border-gray-700');
            }
            if(commsIconTrayBtn) {
                commsIconTrayBtn.classList.replace('text-green-400', 'text-gray-300');
            }
            deactivateStamp();
        });
    }

    function deactivateStamp() {
        window.activeIconStamp = null;
        stampBtns.forEach(btn => {
            btn.classList.remove('ring-2', 'ring-green-500', 'bg-green-900/50');
        });
        if (window.orbitalMap) {
            window.orbitalMap.getContainer().style.cursor = '';
        }
        if (window.commsMapInstance) {
            window.commsMapInstance.getContainer().style.cursor = '';
        }
    }

    stampBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const icon = btn.getAttribute('data-icon');
            
            if (window.activeIconStamp === icon) {
                deactivateStamp();
            } else {
                deactivateStamp();
                window.activeIconStamp = icon;
                btn.classList.add('ring-2', 'ring-green-500', 'bg-green-900/50');
                if (window.orbitalMap) {
                    window.orbitalMap.getContainer().style.cursor = 'crosshair';
                }
                if (window.commsMapInstance) {
                    window.commsMapInstance.getContainer().style.cursor = 'crosshair';
                }
            }
            
            if (window.innerWidth < 768 && iconTray) {
                iconTray.classList.add('hidden');
                if(geoIconTrayBtn) {
                    geoIconTrayBtn.classList.replace('text-green-400', 'text-gray-300');
                    geoIconTrayBtn.classList.replace('border-green-500', 'border-gray-700');
                }
                if(commsIconTrayBtn) {
                    commsIconTrayBtn.classList.replace('text-green-400', 'text-gray-300');
                }
            }
        });
    });

    window.dropTacticalIcon = function(lat, lng, icon) {
        const createMarker = (mapInstance) => {
            if (!mapInstance) return null;
            return L.marker([lat, lng], {
                icon: L.divIcon({
                    html: `<div style="font-size:32px; filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.8)); text-align:center; transform: translate(-50%, -50%); cursor: default;">${icon}</div>`,
                    className: 'tactical-emoji-marker',
                    iconSize: [40, 40],
                    iconAnchor: [20, 20]
                }),
                interactive: false
            }).addTo(mapInstance);
        };

        const m1 = createMarker(window.orbitalMap);
        const m2 = createMarker(window.commsMapInstance);
        
        if (m1) window.tacticalIconLayers.push(m1);
        if (m2) window.tacticalIconLayers.push(m2);

        window.tacticalIconData.push({ lat, lng, icon });
        saveTacticalIcons();
        if(window.pushTacLog) window.pushTacLog(`TACTICAL ICON [${icon}] STAMPED`, 'SUCCESS');
    };

    if (clearIconsBtn) {
        clearIconsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm("Clear all tactical icons from map?")) {
                window.tacticalIconLayers.forEach(m => m.remove());
                window.tacticalIconLayers = [];
                window.tacticalIconData = [];
                saveTacticalIcons();
                if(window.pushTacLog) window.pushTacLog('TACTICAL ICONS CLEARED', 'WARNING');
            }
        });
    }

    function saveTacticalIcons() {
        localStorage.setItem('tacticalIconsData', JSON.stringify(window.tacticalIconData));
    }
    
    function loadTacticalIcons() {
        try {
            const saved = JSON.parse(localStorage.getItem('tacticalIconsData') || '[]');
            if (saved.length > 0 && window.dropTacticalIcon) {
                saved.forEach(item => {
                    window.dropTacticalIcon(item.lat, item.lng, item.icon);
                });
            }
        } catch(e) {
            console.warn("Failed to load tactical icons", e);
        }
    }

    loadTacticalIcons();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTacticalIconTray);
} else {
    initTacticalIconTray();
}





// ============================================================================
// C2 COMMAND INTEGRATION
// ============================================================================
window.myDutyStatus = null;
document.addEventListener('DOMContentLoaded', () => {
    const c2DutyStatus = document.getElementById('c2-duty-status');
    if (c2DutyStatus) {
        window.myDutyStatus = c2DutyStatus.value || null;
        c2DutyStatus.addEventListener('change', (e) => {
            window.myDutyStatus = e.target.value;
            // Force immediate track update
            if (window.commsChannel && window.commsUser) {
                window.commsChannel.track({
                    online_at: new Date().toISOString(),
                    user: window.commsUser,
                    location: window.myLatestCoords || null,
                    distress: window.isDistressActive || false,
                    dutyStatus: window.myDutyStatus
                }).catch(err => console.warn("C2 status track update failed:", err));
                if (window.pushTacLog) {
                    window.pushTacLog(`DUTY STATUS UPDATED`, 'SUCCESS');
                }
            }
        });
    }

    const c2CopyBtn = document.getElementById('c2-copy-coords-btn');
    if (c2CopyBtn) {
        c2CopyBtn.addEventListener('click', () => {
            let lines = [];
            const state = window.latestPresenceState;
            if (state) {
                Object.keys(state).forEach(userId => {
                    const presences = state[userId];
                    if (presences && presences.length > 0) {
                        const p = presences[0];
                        const cs = p.user?.callsign || 'OPERATOR';
                        const role = p.user?.role || 'UNIT';
                        const st = p.dutyStatus ? ` [${p.dutyStatus}]` : '';
                        const locStr = p.location ? `${p.location.lat.toFixed(6)}, ${p.location.lng.toFixed(6)}` : (window.myLatestCoords ? `${window.myLatestCoords.lat.toFixed(6)}, ${window.myLatestCoords.lng.toFixed(6)}` : 'NO GPS FIX');
                        lines.push(`${cs} [${role}]${st}: ${locStr}`);
                    }
                });
            }
            if (lines.length === 0 && window.myLatestCoords) {
                const callsign = (typeof commsUser !== 'undefined' && commsUser) ? commsUser.callsign : 'OPERATOR';
                const st = window.myDutyStatus ? ` [${window.myDutyStatus}]` : '';
                lines.push(`${callsign}${st}: ${window.myLatestCoords.lat.toFixed(6)}, ${window.myLatestCoords.lng.toFixed(6)}`);
            }

            const fullReport = lines.length > 0 ? lines.join('\n') : 'NO GPS SIGNAL ACQUIRED YET';
            if (navigator.clipboard) {
                navigator.clipboard.writeText(fullReport).then(() => {
                    if (window.pushTacLog) window.pushTacLog(`TEAM GPS COORDS COPIED`, 'SUCCESS');
                }).catch(e => {});
            }
            alert(`📍 TEAMMATES GPS COORDINATES:\n\n${fullReport}`);
        });
    }
});


// GLOBAL FIX: Force Android software keyboards to respect HTML maxlength
document.addEventListener('input', function(e) {
    if (e.target.tagName === 'INPUT' && e.target.type === 'text' && e.target.hasAttribute('maxlength')) {
        const max = parseInt(e.target.getAttribute('maxlength'));
        if (e.target.value.length > max) {
            e.target.value = e.target.value.slice(0, max);
        }
    }
});


// GLOBAL FIX: Prevent html2canvas memory leaks on mobile devices
const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
HTMLCanvasElement.prototype.toDataURL = function() {
    const result = originalToDataURL.apply(this, arguments);
    if (!document.body.contains(this)) {
        setTimeout(() => {
            this.width = 0;
            this.height = 0;
        }, 5000);
    }
    return result;
};

// GLOBAL FIX: Prevent html2canvas 'willReadFrequently' Lighthouse warnings and improve getImageData performance
const originalGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function(type, options) {
    if (type === '2d') {
        options = options || {};
        if (options.willReadFrequently === undefined) {
            options.willReadFrequently = true;
        }
    }
    return originalGetContext.call(this, type, options);
};

