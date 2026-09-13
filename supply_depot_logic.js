/**
 * ============================================================
 * TRC CUSTOM DESIGN STUDIOS (v4.1)
 * Mobile Proportional UI, 10-Shape Sticker Studio,
 * Custom Target Maker & Uploader, and 25 Truly Distinct Calibration Targets
 * ============================================================
 */

(function() {
    'use strict';

    // Global Keydown Handler (Esc to close any modal)
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' || e.keyCode === 27) {
            closeAllDepotModals();
        }
    });

    function closeAllDepotModals() {
        ['supply-inspect-modal', 'trc-sticker-studio-modal', 'trc-target-studio-modal', 'supply-depot-modal'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });
    }
    window.closeAllDepotModals = closeAllDepotModals;

    // Helper: Get user's active TRC Flavor color
    function getActiveFlavorColor() {
        const hex = getComputedStyle(document.documentElement).getPropertyValue('--accent-color')?.trim();
        return hex || '#00f5ff';
    }

    // Procedural SVG Graphics Generator for Showroom
    function generateTacticalSvgDataUrl(type, title, accentColor = '#f59e0b') {
        const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260" width="100%" height="100%">
            <defs>
                <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#090d16" />
                    <stop offset="100%" stop-color="#020617" />
                </linearGradient>
                <pattern id="hexGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 20 5 L 20 15 L 10 20 L 0 15 L 0 5 Z" fill="none" stroke="#1e293b" stroke-width="0.8" opacity="0.4" />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#bgGrad)" />
            <rect width="100%" height="100%" fill="url(#hexGrid)" />
            <rect x="10" y="10" width="380" height="240" rx="8" fill="none" stroke="${accentColor}" stroke-width="1.5" stroke-opacity="0.4" stroke-dasharray="6,4" />
            
            ${type === 'shield' ? `
                <path d="M 200 35 L 275 65 L 275 140 Q 200 205 200 205 Q 125 140 125 65 Z" fill="#0f172a" stroke="${accentColor}" stroke-width="3" />
                <path d="M 200 50 L 260 74 L 260 132 Q 200 186 200 186 Q 140 132 140 74 Z" fill="none" stroke="#38bdf8" stroke-width="1.2" />
                <text x="200" y="120" fill="#f8fafc" font-family="sans-serif" font-weight="900" font-size="20" text-anchor="middle">TRC</text>
                <text x="200" y="142" fill="${accentColor}" font-family="monospace" font-weight="bold" font-size="9" text-anchor="middle">VERIFIED</text>
            ` : ''}

            ${type === 'target' ? `
                <rect x="135" y="40" width="130" height="160" rx="4" fill="#ffffff" stroke="#000000" stroke-width="2" />
                <circle cx="200" cy="120" r="45" fill="none" stroke="#ef4444" stroke-width="2" />
                <circle cx="200" cy="120" r="22" fill="none" stroke="#ef4444" stroke-width="1" />
                <polygon points="200,98 218,120 200,142 182,120" fill="#ef4444" />
                <line x1="145" y1="120" x2="255" y2="120" stroke="#000000" stroke-width="1.5" />
                <line x1="200" y1="65" x2="200" y2="175" stroke="#000000" stroke-width="1.5" />
                <text x="200" y="190" fill="#000000" font-family="monospace" font-size="8" font-weight="bold" text-anchor="middle">100Y MOA ZERO</text>
            ` : ''}

            <text x="20" y="235" fill="#64748b" font-family="monospace" font-size="9" font-weight="bold">${title.toUpperCase()}</text>
            <text x="380" y="235" fill="${accentColor}" font-family="monospace" font-size="9" font-weight="bold" text-anchor="end">TRC-STUDIO</text>
        </svg>`;
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }

    const SUPPLY_CATALOG = [
        {
            id: 'trc-studio-stickers',
            dept: 'studio',
            badge: '🎨 10-SHAPE STICKER STUDIO',
            badgeColor: 'bg-amber-950 text-amber-300 border-amber-500/80 animate-pulse',
            name: 'TRC Custom Sticker Maker Studio',
            tagline: '10 Die-Cut Shapes, Drag & Drop Art, Textures, Morale Stamps & 8.5"x11" Sheet Tiling',
            price: 'FREE STUDIO',
            rating: '5.0 ★ (300 DPI Multi-Pack)',
            image: generateTacticalSvgDataUrl('shield', 'Sticker Studio', '#f59e0b'),
            isStickerStudio: true
        },
        {
            id: 'trc-studio-targets',
            dept: 'studio',
            badge: '🎯 25 TARGETS & UPLOADER',
            badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-500/80 animate-pulse',
            name: 'TRC Precision Target Builder (25 Styles)',
            tagline: 'Military E-Type, USPSA, SWAT T-Zone, B-8, KYL, Dot Torture, Hunting Vitals & Custom Uploader',
            price: 'FREE STUDIO',
            rating: '5.0 ★ (Printable 8.5" x 11")',
            image: generateTacticalSvgDataUrl('target', 'Target Builder', '#10b981'),
            isTargetStudio: true
        }
    ];

    // ============================================================
    // MAIN STUDIO SELECTION MODAL (MOBILE RESPONSIVE)
    // ============================================================
    window.openSupplyDepotModal = function() {
        closeAllDepotModals();

        const modal = document.createElement('div');
        modal.id = 'supply-depot-modal';
        modal.setAttribute('style', 'position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 2147483640 !important; background: rgba(2, 6, 23, 0.98) !important; backdrop-filter: blur(14px) !important; display: flex !important; flex-direction: column !important; overflow: hidden !important; color: #f8fafc;');
        
        modal.innerHTML = `
            <!-- MOBILE-OPTIMIZED PROPORTIONAL HEADER -->
            <div class="shrink-0 bg-slate-950 border-b-2 border-amber-500/80 px-3 py-2.5 sm:px-4 sm:py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 shadow-2xl z-50">
                <div class="flex items-center gap-2 min-w-0">
                    <div class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0"></div>
                    <div class="flex flex-col min-w-0">
                        <div class="flex items-center gap-1.5">
                            <span class="text-xs sm:text-sm font-black tracking-wider text-amber-400 uppercase truncate">
                                TRC DESIGN STUDIOS
                            </span>
                            <span class="text-[7.5px] bg-amber-950 text-amber-300 border border-amber-600/50 px-1 py-0.2 rounded font-mono font-bold shrink-0">v4.1</span>
                        </div>
                        <span class="text-[7.5px] text-slate-400 uppercase font-mono tracking-wider truncate hidden xs:block sm:block">10-Shape Sticker Studio &bull; 25 Target Builders</span>
                    </div>
                </div>

                <div class="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
                    <button onclick="window.openCustomStickerStudio()" class="font-black text-[9px] sm:text-[10.5px] px-2.5 sm:px-3 py-1.5 rounded-lg uppercase tracking-wider flex items-center gap-1 cursor-pointer whitespace-nowrap" style="background: rgba(var(--accent-rgb, 0, 245, 255), 0.2); border: 1.5px solid var(--accent-color, #00f5ff); color: var(--accent-color, #00f5ff); text-shadow: 0 0 6px rgba(var(--accent-rgb, 0, 245, 255), 0.8);">
                        <i data-lucide="sparkles" class="w-3.5 h-3.5"></i> STICKERS
                    </button>
                    <button onclick="window.openTargetBuilderStudio()" class="font-black text-[9px] sm:text-[10.5px] px-2.5 sm:px-3 py-1.5 rounded-lg uppercase tracking-wider flex items-center gap-1 cursor-pointer whitespace-nowrap" style="background: rgba(var(--accent-rgb, 0, 245, 255), 0.2); border: 1.5px solid var(--accent-color, #00f5ff); color: var(--accent-color, #00f5ff); text-shadow: 0 0 6px rgba(var(--accent-rgb, 0, 245, 255), 0.8);">
                        <i data-lucide="target" class="w-3.5 h-3.5"></i> 25 TARGETS
                    </button>
                    <button onclick="window.closeAllDepotModals()" title="Close" class="bg-red-950 hover:bg-red-900 border border-red-600 text-red-200 hover:text-white text-[9px] sm:text-[10px] font-black px-2.5 sm:px-3 py-1.5 rounded-lg uppercase tracking-wider flex items-center gap-1 cursor-pointer whitespace-nowrap">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>

            <!-- STUDIO SHOWROOM GRID -->
            <div id="supply-catalog-container" class="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-8 flex items-center justify-center pb-28">
                <!-- Injected via renderSupplyGrid -->
            </div>
        `;

        document.body.appendChild(modal);
        if (window.lucide) window.lucide.createIcons({ root: modal });
        window.renderSupplyGrid();
        if (window.pushTacLog) window.pushTacLog('TRC DESIGN STUDIOS: ACCESSED', 'SYS');
    };

    window.renderSupplyGrid = function() {
        const gridEl = document.getElementById('supply-catalog-container');
        if (!gridEl) return;

        let html = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-4xl w-full mx-auto">
        `;

        SUPPLY_CATALOG.forEach(item => {
            let actionBtn = '';
            let clickHandler = ``;

            if (item.isStickerStudio) {
                clickHandler = `window.openCustomStickerStudio()`;
                actionBtn = `
                    <button onclick="window.openCustomStickerStudio()" class="w-full font-black text-xs py-2.5 sm:py-3 px-4 rounded-xl uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer" style="background: rgba(var(--accent-rgb, 0, 245, 255), 0.2); border: 2px solid var(--accent-color, #00f5ff); color: var(--accent-color, #00f5ff); text-shadow: 0 0 8px rgba(var(--accent-rgb, 0, 245, 255), 0.8); box-shadow: 0 0 16px rgba(var(--accent-rgb, 0, 245, 255), 0.4);">
                        <i data-lucide="sparkles" class="w-4 h-4"></i> 🎨 LAUNCH STICKER STUDIO
                    </button>
                `;
            } else {
                clickHandler = `window.openTargetBuilderStudio()`;
                actionBtn = `
                    <button onclick="window.openTargetBuilderStudio()" class="w-full font-black text-xs py-2.5 sm:py-3 px-4 rounded-xl uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer" style="background: rgba(var(--accent-rgb, 0, 245, 255), 0.2); border: 2px solid var(--accent-color, #00f5ff); color: var(--accent-color, #00f5ff); text-shadow: 0 0 8px rgba(var(--accent-rgb, 0, 245, 255), 0.8); box-shadow: 0 0 16px rgba(var(--accent-rgb, 0, 245, 255), 0.4);">
                        <i data-lucide="target" class="w-4 h-4"></i> 🎯 BUILD CUSTOM TARGETS (25)
                    </button>
                `;
            }

            html += `
                <div class="bg-slate-900/95 border-2 rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all group relative shadow-2xl" style="border-color: rgba(var(--accent-rgb, 0, 245, 255), 0.4);">
                    <div>
                        <div class="flex items-center justify-between gap-1 mb-2.5">
                            <span class="text-[8px] sm:text-[8.5px] font-black uppercase tracking-wider px-2 sm:px-2.5 py-0.5 sm:py-1 rounded border font-mono" style="background: rgba(var(--accent-rgb, 0, 245, 255), 0.15); border-color: var(--accent-color, #00f5ff); color: var(--accent-color, #00f5ff);">
                                ${item.badge}
                            </span>
                            <span class="text-[9px] sm:text-[10px] font-mono font-bold" style="color: var(--accent-color, #00f5ff);">${item.price}</span>
                        </div>

                        <div class="w-full h-40 sm:h-48 bg-black rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center relative mb-3 sm:mb-4 cursor-pointer hover:border-[var(--accent-color,#00f5ff)] transition-colors" onclick="${clickHandler}">
                            <img src="${item.image}" alt="${item.name}" class="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300">
                            <div class="absolute bottom-2 left-3 text-[8px] sm:text-[8.5px] font-mono text-slate-300 bg-black/80 px-2 py-0.5 rounded border border-slate-700">${item.rating}</div>
                        </div>

                        <h4 class="text-xs sm:text-base font-black text-white uppercase leading-snug tracking-wider group-hover:text-[var(--accent-color,#00f5ff)] transition-colors cursor-pointer" onclick="${clickHandler}">
                            ${item.name}
                        </h4>
                        <p class="text-[9px] sm:text-[10px] text-slate-300 font-mono mt-1 sm:mt-1.5 leading-relaxed">
                            ${item.tagline}
                        </p>
                    </div>

                    <div class="mt-4 pt-3 sm:mt-5 sm:pt-4 border-t border-slate-800">
                        ${actionBtn}
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        gridEl.innerHTML = html;
        if (window.lucide) window.lucide.createIcons({ root: gridEl });
    };

    // ============================================================
    // 🎨 COMPREHENSIVE CUSTOM TRC STICKER STUDIO
    // ============================================================
    let uploadedCustomStickerImg = null;
    window.currentStickerShape = 'shield';
    window.currentStickerTexture = 'matte_stealth';
    window.stickerImgZoom = 1.0;
    window.stickerSheetMode = 'single';

    window.openCustomStickerStudio = function() {
        let studioModal = document.getElementById('trc-sticker-studio-modal');
        if (studioModal) studioModal.remove();

        const activeFlavorHex = getActiveFlavorColor();

        studioModal = document.createElement('div');
        studioModal.id = 'trc-sticker-studio-modal';
        studioModal.setAttribute('style', 'position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 2147483646 !important; background: rgba(2, 6, 23, 0.98) !important; backdrop-filter: blur(16px) !important; display: flex !important; flex-direction: column !important; overflow: hidden !important; color: #f8fafc;');

        studioModal.innerHTML = `
            <!-- HEADER -->
            <div class="shrink-0 bg-slate-950 border-b-2 border-amber-500/80 px-3 py-2 sm:px-4 sm:py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 shadow-2xl">
                <div class="flex items-center gap-2 min-w-0">
                    <i data-lucide="sparkles" class="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0"></i>
                    <div class="min-w-0">
                        <h3 class="text-xs sm:text-sm font-black text-amber-400 uppercase tracking-wider truncate">
                            TRC STICKER MAKER STUDIO
                        </h3>
                        <span class="text-[7.5px] text-slate-400 uppercase font-mono hidden xs:block">10 Shapes &bull; Textures &bull; 8.5"x11" Sheet</span>
                    </div>
                </div>

                <div class="flex items-center gap-2 ml-auto sm:ml-0">
                    <div class="bg-black/90 border border-slate-700 rounded-lg p-0.5 flex items-center shrink-0">
                        <button onclick="window.setStickerSheetMode('single')" id="stk-mode-single" style="background: #f59e0b; color: #000000; font-weight: 900;" class="px-2.5 py-1 text-[9px] uppercase rounded transition-all cursor-pointer">
                            SINGLE
                        </button>
                        <button onclick="window.setStickerSheetMode('sheet_85x11')" id="stk-mode-sheet" style="background: #1e293b; color: #e2e8f0; border: 1px solid #475569; font-weight: 700;" class="px-2.5 py-1 text-[9px] uppercase rounded transition-all cursor-pointer hover:text-white">
                            8.5"x11" SHEET
                        </button>
                    </div>

                    <button onclick="window.resetStickerStudioForm()" style="background: #1e293b; color: #fde047; border: 1px solid rgba(245, 158, 11, 0.6); font-weight: 900;" class="text-[9.5px] px-3 py-1.5 rounded uppercase tracking-wider flex items-center gap-1.5 cursor-pointer hover:bg-slate-700">
                        <i data-lucide="rotate-ccw" class="w-3.5 h-3.5 text-amber-400"></i> CLEAR FORM
                    </button>
                    <button onclick="window.downloadCustomStickerPng()" style="background: #f59e0b; color: #000000; box-shadow: 0 0 12px rgba(245, 158, 11, 0.6); font-weight: 900;" class="text-[9.5px] px-3.5 py-1.5 rounded uppercase tracking-wider flex items-center gap-1.5 cursor-pointer hover:brightness-110">
                        <i data-lucide="download" class="w-3.5 h-3.5 text-black"></i> SAVE PNG
                    </button>
                    <button onclick="document.getElementById('trc-sticker-studio-modal')?.remove()" title="Close" style="background: #7f1d1d; color: #ffffff; border: 1px solid #dc2626; font-weight: 900;" class="text-[9.5px] px-2.5 py-1.5 rounded uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:bg-red-800">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>

            <!-- STUDIO WORKSPACE -->
            <div class="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 max-w-7xl mx-auto w-full pb-24">
                <!-- CONTROLS COLUMN (5 COLS) -->
                <div class="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-5 flex flex-col space-y-3.5 shadow-xl">
                    <div class="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <h4 class="text-xs font-black text-amber-300 uppercase tracking-widest flex items-center gap-1.5">
                            <i data-lucide="sliders" class="w-4 h-4 text-amber-400"></i> 1. SELECT DIE-CUT SHAPE (10 AVAILABLE)
                        </h4>
                        <button type="button" onclick="window.resetStickerStudioForm()" class="text-[8px] font-mono text-amber-400 hover:text-amber-300 underline cursor-pointer">RESET ALL</button>
                    </div>

                    <!-- 10 SHAPES SELECTOR GRID -->
                    <div class="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto custom-scrollbar p-0.5">
                        <button type="button" onclick="window.setStickerShape('shield')" id="stk-shape-shield" class="stk-shape-btn p-1.5 rounded-lg border-2 border-amber-500 bg-amber-950/40 text-amber-300 font-bold text-[8.5px] uppercase text-left transition-all">
                            🛡️ <b>TACTICAL SHIELD</b><br><span class="text-[7px] text-slate-400">3" x 3.5" Crest</span>
                        </button>
                        <button type="button" onclick="window.setStickerShape('hexagon')" id="stk-shape-hexagon" class="stk-shape-btn p-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-300 font-bold text-[8.5px] uppercase text-left transition-all">
                            ⬡ <b>TACTICAL HEXAGON</b><br><span class="text-[7px] text-slate-400">3" x 3" Hardcases</span>
                        </button>
                        <button type="button" onclick="window.setStickerShape('strip_4x2')" id="stk-shape-strip_4x2" class="stk-shape-btn p-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-300 font-bold text-[8.5px] uppercase text-left transition-all">
                            🏷️ <b>4" x 2" CALLSIGN STRIP</b><br><span class="text-[7px] text-slate-400">Stocks & Bumpers</span>
                        </button>
                        <button type="button" onclick="window.setStickerShape('circle_3x3')" id="stk-shape-circle_3x3" class="stk-shape-btn p-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-300 font-bold text-[8.5px] uppercase text-left transition-all">
                            ⭕ <b>3" x 3" ROUND BADGE</b><br><span class="text-[7px] text-slate-400">Magazines & Ammo</span>
                        </button>
                        <button type="button" onclick="window.setStickerShape('triangle_hazard')" id="stk-shape-triangle_hazard" class="stk-shape-btn p-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-300 font-bold text-[8.5px] uppercase text-left transition-all">
                            🔺 <b>HAZARD TRIANGLE</b><br><span class="text-[7px] text-slate-400">3.5" x 3" Warning</span>
                        </button>
                        <button type="button" onclick="window.setStickerShape('diamond_ranger')" id="stk-shape-diamond_ranger" class="stk-shape-btn p-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-300 font-bold text-[8.5px] uppercase text-left transition-all">
                            ⯁ <b>RANGER DIAMOND</b><br><span class="text-[7px] text-slate-400">3" x 3" Diamond</span>
                        </button>
                        <button type="button" onclick="window.setStickerShape('placard_ammo')" id="stk-shape-placard_ammo" class="stk-shape-btn p-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-300 font-bold text-[8.5px] uppercase text-left transition-all">
                            📦 <b>AMMO CAN PLACARD</b><br><span class="text-[7px] text-slate-400">3.5" x 2.5" Box</span>
                        </button>
                        <button type="button" onclick="window.setStickerShape('dogtag')" id="stk-shape-dogtag" class="stk-shape-btn p-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-300 font-bold text-[8.5px] uppercase text-left transition-all">
                            🏷️ <b>TACTICAL DOG TAG</b><br><span class="text-[7px] text-slate-400">3.5" x 2" Cut</span>
                        </button>
                        <button type="button" onclick="window.setStickerShape('coffin')" id="stk-shape-coffin" class="stk-shape-btn p-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-300 font-bold text-[8.5px] uppercase text-left transition-all">
                            💀 <b>OPERATOR COFFIN</b><br><span class="text-[7px] text-slate-400">3" x 3.5" Morale</span>
                        </button>
                        <button type="button" onclick="window.setStickerShape('crosshair_star')" id="stk-shape-crosshair_star" class="stk-shape-btn p-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-300 font-bold text-[8.5px] uppercase text-left transition-all">
                            ⚡ <b>BENCH STARBURST</b><br><span class="text-[7px] text-slate-400">3" x 3" Precision</span>
                        </button>
                    </div>

                    <!-- 2. BACKGROUND TEXTURE SELECTOR -->
                    <div>
                        <label class="text-[9px] font-black text-slate-300 uppercase tracking-wider block mb-1">2. Tactical Background Finish</label>
                        <div class="grid grid-cols-3 gap-1">
                            <button type="button" onclick="window.setStickerTexture('matte_stealth')" class="stk-tex-btn p-1 rounded bg-black border border-amber-500 text-[8px] font-bold text-amber-300">⬛ Stealth</button>
                            <button type="button" onclick="window.setStickerTexture('carbon_fiber')" class="stk-tex-btn p-1 rounded bg-slate-950 border border-slate-700 text-[8px] font-bold text-slate-300">🛡️ Carbon</button>
                            <button type="button" onclick="window.setStickerTexture('brushed_steel')" class="stk-tex-btn p-1 rounded bg-slate-950 border border-slate-700 text-[8px] font-bold text-slate-300">🪙 Steel</button>
                            <button type="button" onclick="window.setStickerTexture('woodland_camo')" class="stk-tex-btn p-1 rounded bg-slate-950 border border-slate-700 text-[8px] font-bold text-slate-300">🌲 Camo</button>
                            <button type="button" onclick="window.setStickerTexture('holographic')" class="stk-tex-btn p-1 rounded bg-slate-950 border border-slate-700 text-[8px] font-bold text-slate-300">🌈 Holo</button>
                            <button type="button" onclick="window.setStickerTexture('fde_desert')" class="stk-tex-btn p-1 rounded bg-slate-950 border border-slate-700 text-[8px] font-bold text-slate-300">🪖 FDE</button>
                        </div>
                    </div>

                    <!-- 3. DRAG & DROP OR UPLOAD ARTWORK -->
                    <div id="stk-dropzone" class="p-2.5 bg-slate-950 rounded-xl border-2 border-dashed border-slate-700 hover:border-amber-500 transition-colors text-center cursor-pointer" onclick="document.getElementById('stk-upload-input').click()">
                        <input type="file" id="stk-upload-input" accept="image/*" onchange="window.handleCustomStickerUpload(event)" class="hidden">
                        <div class="flex flex-col items-center justify-center gap-0.5">
                            <i data-lucide="upload-cloud" class="w-4 h-4 text-amber-400"></i>
                            <span class="text-[9px] font-black text-white uppercase">DRAG & DROP ARTWORK / LOGO</span>
                            <span class="text-[7.5px] text-slate-500 font-mono">PNG, JPG, WebP transparent art</span>
                        </div>
                    </div>

                    <!-- IMAGE ZOOM & CLEAR -->
                    <div class="grid grid-cols-2 gap-2 bg-black/50 p-1.5 rounded-lg border border-slate-800 items-center">
                        <div>
                            <label class="text-[7.5px] font-bold text-slate-400 uppercase block mb-0.5">Art Zoom / Scale</label>
                            <input type="range" min="0.4" max="2.0" step="0.05" value="1.0" id="stk-img-zoom" oninput="window.updateStickerZoom(this.value)" class="w-full accent-amber-400 cursor-pointer">
                        </div>
                        <div class="flex justify-end">
                            <button type="button" onclick="window.clearUploadedStickerArt()" class="bg-red-950 hover:bg-red-900 text-red-300 text-[8px] font-black py-1 px-2.5 rounded border border-red-800 cursor-pointer">
                                ✕ CLEAR ART
                            </button>
                        </div>
                    </div>

                    <!-- 4. CUSTOM OPERATOR TEXT -->
                    <div class="space-y-1.5">
                        <div>
                            <label class="text-[8.5px] font-black uppercase tracking-wider block mb-0.5" style="color: ${activeFlavorHex};">CALL SIGN / TITLE</label>
                            <input type="text" id="stk-callsign" placeholder="e.g. CALL SIGN" maxlength="24" oninput="window.updateStickerLivePreview()" class="w-full bg-black text-white text-xs p-1.5 rounded-lg font-mono" style="border: 1.5px solid ${activeFlavorHex};">
                        </div>
                        <div class="grid grid-cols-2 gap-1.5">
                            <div>
                                <label class="text-[8.5px] font-black uppercase tracking-wider block mb-0.5" style="color: ${activeFlavorHex};">CALIBER</label>
                                <input type="text" id="stk-caliber" placeholder="e.g. 6.5 CREEDMOOR" maxlength="18" oninput="window.updateStickerLivePreview()" class="w-full bg-black text-white text-xs p-1.5 rounded-lg font-mono" style="border: 1.5px solid ${activeFlavorHex};">
                            </div>
                            <div>
                                <label class="text-[8.5px] font-black uppercase tracking-wider block mb-0.5" style="color: ${activeFlavorHex};">BLOOD TYPE</label>
                                <input type="text" id="stk-blood" placeholder="e.g. O+ POS" maxlength="10" oninput="window.updateStickerLivePreview()" class="w-full bg-black text-white text-xs p-1.5 rounded-lg font-mono" style="border: 1.5px solid ${activeFlavorHex};">
                            </div>
                        </div>
                        <div>
                            <label class="text-[8.5px] font-black uppercase tracking-wider block mb-0.5" style="color: ${activeFlavorHex};">SLOGAN / CUSTOM MOTTO</label>
                            <input type="text" id="stk-motto" placeholder="e.g. SUB-MOA ALL DAY • NO COMPROMISE" maxlength="36" oninput="window.updateStickerLivePreview()" class="w-full bg-black text-white text-xs p-1.5 rounded-lg font-mono" style="border: 1.5px solid ${activeFlavorHex};">
                        </div>
                    </div>
                </div>

                <!-- LIVE PREVIEW COLUMN (7 COLS) -->
                <div class="lg:col-span-7 bg-slate-950 border-2 border-slate-800 rounded-2xl p-3 sm:p-6 flex flex-col items-center justify-between shadow-2xl">
                    <div class="w-full flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                        <span class="text-[10px] sm:text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-1">
                            <i data-lucide="eye" class="w-3.5 h-3.5"></i> LIVE CANVAS PREVIEW
                        </span>
                        <span id="stk-preview-dimensions" class="text-[8.5px] font-mono text-slate-400">300 DPI Vector Grade</span>
                    </div>

                    <div class="flex-1 flex items-center justify-center p-1 w-full max-h-[460px] overflow-hidden">
                        <canvas id="trc-sticker-canvas" class="max-w-full max-h-[420px] object-contain rounded-xl shadow-2xl border-2 border-slate-800 bg-[#020617]"></canvas>
                    </div>

                    <div class="w-full mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
                        <span class="text-[7.5px] text-slate-400 font-mono">🛡️ Ready for vinyl print at home.</span>
                        <button onclick="window.downloadCustomStickerPng()" style="background: #f59e0b; color: #000000; box-shadow: 0 0 12px rgba(245, 158, 11, 0.6); font-weight: 900;" class="text-[9.5px] sm:text-[10px] px-3.5 py-1.5 rounded-lg uppercase tracking-wider flex items-center gap-1.5 cursor-pointer hover:brightness-110">
                            <i data-lucide="download" class="w-3.5 h-3.5 text-black"></i> SAVE HIGH-RES PNG
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(studioModal);
        if (window.lucide) window.lucide.createIcons({ root: studioModal });
        
        const dropzone = document.getElementById('stk-dropzone');
        if (dropzone) {
            ['dragenter', 'dragover'].forEach(name => {
                dropzone.addEventListener(name, (e) => { e.preventDefault(); dropzone.classList.add('border-amber-400'); }, false);
            });
            ['dragleave', 'drop'].forEach(name => {
                dropzone.addEventListener(name, (e) => { e.preventDefault(); dropzone.classList.remove('border-amber-400'); }, false);
            });
            dropzone.addEventListener('drop', (e) => {
                const dt = e.dataTransfer;
                const files = dt.files;
                if (files && files.length) {
                    window.handleCustomStickerUpload({ target: { files: files } });
                }
            }, false);
        }

        window.updateStickerLivePreview();
    };

    window.setStickerShape = function(shapeKey) {
        window.currentStickerShape = shapeKey;
        document.querySelectorAll('.stk-shape-btn').forEach(btn => {
            btn.className = 'stk-shape-btn p-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-300 font-bold text-[8.5px] uppercase text-left transition-all';
        });
        const activeBtn = document.getElementById(`stk-shape-${shapeKey}`);
        if (activeBtn) {
            activeBtn.className = 'stk-shape-btn p-1.5 rounded-lg border-2 border-amber-500 bg-amber-950/40 text-amber-300 font-bold text-[8.5px] uppercase text-left transition-all';
        }
        window.updateStickerLivePreview();
    };

    window.setStickerTexture = function(textureKey) {
        window.currentStickerTexture = textureKey;
        window.updateStickerLivePreview();
    };

    window.setStickerSheetMode = function(mode) {
        window.stickerSheetMode = mode;
        const singleBtn = document.getElementById('stk-mode-single');
        const sheetBtn = document.getElementById('stk-mode-sheet');
        if (mode === 'sheet_85x11') {
            if (sheetBtn) {
                sheetBtn.style.background = '#f59e0b';
                sheetBtn.style.color = '#000000';
                sheetBtn.style.border = 'none';
                sheetBtn.style.fontWeight = '900';
            }
            if (singleBtn) {
                singleBtn.style.background = '#1e293b';
                singleBtn.style.color = '#e2e8f0';
                singleBtn.style.border = '1px solid #475569';
                singleBtn.style.fontWeight = '700';
            }
        } else {
            if (singleBtn) {
                singleBtn.style.background = '#f59e0b';
                singleBtn.style.color = '#000000';
                singleBtn.style.border = 'none';
                singleBtn.style.fontWeight = '900';
            }
            if (sheetBtn) {
                sheetBtn.style.background = '#1e293b';
                sheetBtn.style.color = '#e2e8f0';
                sheetBtn.style.border = '1px solid #475569';
                sheetBtn.style.fontWeight = '700';
            }
        }
        window.updateStickerLivePreview();
    };

    window.updateStickerZoom = function(val) {
        window.stickerImgZoom = parseFloat(val) || 1.0;
        window.updateStickerLivePreview();
    };

    window.handleCustomStickerUpload = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            const img = new Image();
            img.onload = function() {
                uploadedCustomStickerImg = img;
                window.updateStickerLivePreview();
                if (window.showToast) window.showToast('✅ Artwork uploaded into sticker canvas!');
            };
            img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
    };

    window.clearUploadedStickerArt = function() {
        uploadedCustomStickerImg = null;
        const input = document.getElementById('stk-upload-input');
        if (input) input.value = '';
        window.updateStickerLivePreview();
    };

    window.resetStickerStudioForm = function() {
        uploadedCustomStickerImg = null;
        const input = document.getElementById('stk-upload-input');
        if (input) input.value = '';

        const cs = document.getElementById('stk-callsign'); if (cs) cs.value = '';
        const cal = document.getElementById('stk-caliber'); if (cal) cal.value = '';
        const bld = document.getElementById('stk-blood'); if (bld) bld.value = '';
        const mt = document.getElementById('stk-motto'); if (mt) mt.value = '';

        window.setStickerShape('shield');
        window.setStickerTexture('matte_stealth');
        window.setStickerSheetMode('single');
        const zoomInput = document.getElementById('stk-img-zoom');
        if (zoomInput) zoomInput.value = 1.0;
        window.stickerImgZoom = 1.0;

        window.updateStickerLivePreview();
        if (window.showToast) window.showToast('🔄 Sticker Studio Form Cleared!');
    };

    function applyStickerBackgroundTexture(ctx, w, h, textureKey) {
        if (textureKey === 'carbon_fiber') {
            ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 4;
            for (let i = -w; i < w + h; i += 16) {
                ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(i, h); ctx.lineTo(i + h, 0); ctx.stroke();
            }
        } else if (textureKey === 'brushed_steel') {
            const grad = ctx.createLinearGradient(0, 0, w, h);
            grad.addColorStop(0, '#1e293b'); grad.addColorStop(0.5, '#475569'); grad.addColorStop(1, '#0f172a');
            ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
        } else if (textureKey === 'woodland_camo') {
            ctx.fillStyle = '#1c281e'; ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#2d3b2d';
            ctx.beginPath(); ctx.arc(w * 0.3, h * 0.3, 140, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(w * 0.7, h * 0.7, 160, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#3f301d';
            ctx.beginPath(); ctx.arc(w * 0.6, h * 0.3, 110, 0, Math.PI * 2); ctx.fill();
        } else if (textureKey === 'holographic') {
            const grad = ctx.createLinearGradient(0, 0, w, h);
            grad.addColorStop(0, '#00f5ff'); grad.addColorStop(0.25, '#bf00ff');
            grad.addColorStop(0.5, '#ff007f'); grad.addColorStop(0.75, '#ffe600'); grad.addColorStop(1, '#00ff41');
            ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = 'rgba(2, 6, 23, 0.75)'; ctx.fillRect(0, 0, w, h);
        } else if (textureKey === 'fde_desert') {
            ctx.fillStyle = '#785b3a'; ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#543d25'; ctx.fillRect(50, 50, 120, 120); ctx.fillRect(w - 200, h - 200, 150, 150);
        } else {
            ctx.fillStyle = '#050811'; ctx.fillRect(0, 0, w, h);
        }
    }

    function drawFittedText(ctx, text, cx, cy, baseSize, fontFam, maxW, color) {
        let size = baseSize;
        ctx.font = `bold ${size}px ${fontFam}`;
        while (ctx.measureText(text).width > maxW && size > 9) {
            size -= 1;
            ctx.font = `bold ${size}px ${fontFam}`;
        }
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 4;
        ctx.fillText(text, cx, cy);
        ctx.shadowBlur = 0;
    }

    function drawSingleSticker(ctx, ox, oy, scale, shape, callsign, caliber, blood, motto, flavorColor, textureKey) {
        ctx.save();
        ctx.translate(ox, oy);
        ctx.scale(scale, scale);

        const w = 900;
        const h = shape === 'strip_4x2' ? 450 : (shape === 'shield' || shape === 'coffin' ? 1000 : 900);

        // Die-Cut Path
        ctx.save();
        ctx.beginPath();
        if (shape === 'shield') {
            ctx.moveTo(450, 40); ctx.lineTo(840, 150); ctx.lineTo(840, 520);
            ctx.bezierCurveTo(840, 800, 450, 960, 450, 960);
            ctx.bezierCurveTo(450, 960, 60, 800, 60, 520);
            ctx.lineTo(60, 150);
        } else if (shape === 'hexagon') {
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI / 3) * i - Math.PI / 6;
                const x = 450 + 400 * Math.cos(a), y = 450 + 400 * Math.sin(a);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
        } else if (shape === 'triangle_hazard') {
            ctx.moveTo(450, 60); ctx.lineTo(840, 820); ctx.lineTo(60, 820);
        } else if (shape === 'diamond_ranger') {
            ctx.moveTo(450, 50); ctx.lineTo(850, 450); ctx.lineTo(450, 850); ctx.lineTo(50, 450);
        } else if (shape === 'placard_ammo') {
            ctx.roundRect(40, 60, 820, 780, [30]);
        } else if (shape === 'dogtag') {
            ctx.roundRect(80, 60, 740, 780, [150]);
        } else if (shape === 'coffin') {
            ctx.moveTo(450, 40); ctx.lineTo(800, 260); ctx.lineTo(680, 940); ctx.lineTo(220, 940); ctx.lineTo(100, 260);
        } else if (shape === 'crosshair_star') {
            ctx.arc(450, 450, 390, 0, Math.PI * 2);
        } else if (shape === 'strip_4x2') {
            ctx.roundRect(10, 10, 880, 430, [20]);
        } else {
            ctx.arc(450, 450, 390, 0, Math.PI * 2);
        }
        ctx.closePath();
        ctx.clip();

        applyStickerBackgroundTexture(ctx, w, h, textureKey);

        // Center Artwork / Reticle Positioning per Shape
        let artCx = 450, artCy = 370, artSize = 180;
        if (shape === 'strip_4x2') { artCx = 710; artCy = 225; artSize = 180; }
        else if (shape === 'diamond_ranger') { artCx = 450; artCy = 420; artSize = 140; }
        else if (shape === 'triangle_hazard') { artCx = 450; artCy = 460; artSize = 160; }
        else if (shape === 'coffin') { artCx = 450; artCy = 390; artSize = 180; }
        else if (shape === 'placard_ammo') { artCx = 450; artCy = 350; artSize = 210; }

        if (uploadedCustomStickerImg) {
            const zoom = window.stickerImgZoom || 1.0;
            const iw = (artSize * 1.5) * zoom, ih = (artSize * 1.1) * zoom;
            ctx.drawImage(uploadedCustomStickerImg, artCx - iw / 2, artCy - ih / 2, iw, ih);
        } else {
            ctx.strokeStyle = flavorColor;
            ctx.lineWidth = 5;
            const r = artSize / 2;
            ctx.beginPath(); ctx.arc(artCx, artCy, r, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(artCx, artCy - r - 15); ctx.lineTo(artCx, artCy + r + 15);
            ctx.moveTo(artCx - r - 15, artCy); ctx.lineTo(artCx + r + 15, artCy); ctx.stroke();
        }
        ctx.restore();

        // Outer Border Stroke
        ctx.beginPath();
        if (shape === 'shield') {
            ctx.moveTo(450, 40); ctx.lineTo(840, 150); ctx.lineTo(840, 520);
            ctx.bezierCurveTo(840, 800, 450, 960, 450, 960);
            ctx.bezierCurveTo(450, 960, 60, 800, 60, 520);
            ctx.lineTo(60, 150);
        } else if (shape === 'hexagon') {
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI / 3) * i - Math.PI / 6;
                const x = 450 + 400 * Math.cos(a), y = 450 + 400 * Math.sin(a);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
        } else if (shape === 'triangle_hazard') {
            ctx.moveTo(450, 60); ctx.lineTo(840, 820); ctx.lineTo(60, 820);
        } else if (shape === 'diamond_ranger') {
            ctx.moveTo(450, 50); ctx.lineTo(850, 450); ctx.lineTo(450, 850); ctx.lineTo(50, 450);
        } else if (shape === 'placard_ammo') {
            ctx.roundRect(40, 60, 820, 780, [30]);
        } else if (shape === 'dogtag') {
            ctx.roundRect(80, 60, 740, 780, [150]);
        } else if (shape === 'coffin') {
            ctx.moveTo(450, 40); ctx.lineTo(800, 260); ctx.lineTo(680, 940); ctx.lineTo(220, 940); ctx.lineTo(100, 260);
        } else if (shape === 'strip_4x2') {
            ctx.roundRect(10, 10, 880, 430, [20]);
        } else {
            ctx.arc(450, 450, 390, 0, Math.PI * 2);
        }
        ctx.closePath();
        ctx.strokeStyle = flavorColor;
        ctx.lineWidth = 18;
        ctx.stroke();

        // EXACT PER-SHAPE TEXT PLACEMENT (GUARANTEED BOUNDS)
        if (shape === 'strip_4x2') {
            ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 18px monospace'; ctx.textAlign = 'left';
            ctx.fillText('TACTICAL RANGE CARD // DECAL', 50, 65);

            drawFittedText(ctx, callsign.toUpperCase(), 300, 140, 52, 'sans-serif', 500, '#ffffff');
            drawFittedText(ctx, `CAL: ${caliber.toUpperCase()} • ${blood.toUpperCase()}`, 300, 210, 26, 'monospace', 500, flavorColor);
            drawFittedText(ctx, motto.toUpperCase(), 300, 278, 22, 'monospace', 500, '#38bdf8');
            drawFittedText(ctx, '★ TRC OPERATOR ARMORY // VERIFIED ★', 300, 348, 18, 'monospace', 500, '#10b981');

        } else if (shape === 'diamond_ranger') {
            drawFittedText(ctx, 'TACTICAL RANGE CARD', 450, 280, 24, 'sans-serif', 340, '#ffffff');
            drawFittedText(ctx, callsign.toUpperCase(), 450, 545, 38, 'sans-serif', 450, flavorColor);
            drawFittedText(ctx, `CAL: ${caliber.toUpperCase()} • ${blood.toUpperCase()}`, 450, 598, 20, 'monospace', 380, '#10b981');
            drawFittedText(ctx, motto.toUpperCase(), 450, 645, 16, 'monospace', 300, '#94a3b8');
            drawFittedText(ctx, 'POWERED BY TRC // VERIFIED', 450, 690, 13, 'monospace', 230, flavorColor);

        } else if (shape === 'triangle_hazard') {
            drawFittedText(ctx, 'TACTICAL RANGE CARD', 450, 310, 24, 'sans-serif', 320, '#ffffff');
            drawFittedText(ctx, callsign.toUpperCase(), 450, 590, 42, 'sans-serif', 480, flavorColor);
            drawFittedText(ctx, `CAL: ${caliber.toUpperCase()} • ${blood.toUpperCase()}`, 450, 650, 24, 'monospace', 540, '#10b981');
            drawFittedText(ctx, motto.toUpperCase(), 450, 705, 20, 'monospace', 580, '#94a3b8');
            drawFittedText(ctx, 'POWERED BY TRC // RANGE VERIFIED', 450, 755, 16, 'monospace', 600, flavorColor);

        } else if (shape === 'coffin') {
            drawFittedText(ctx, 'TACTICAL RANGE CARD', 450, 230, 28, 'sans-serif', 420, '#ffffff');
            drawFittedText(ctx, callsign.toUpperCase(), 450, 550, 44, 'sans-serif', 520, flavorColor);
            drawFittedText(ctx, `CAL: ${caliber.toUpperCase()} • ${blood.toUpperCase()}`, 450, 615, 24, 'monospace', 460, '#10b981');
            drawFittedText(ctx, motto.toUpperCase(), 450, 675, 19, 'monospace', 420, '#94a3b8');
            drawFittedText(ctx, 'POWERED BY TRC // VERIFIED', 450, 730, 15, 'monospace', 380, flavorColor);

        } else if (shape === 'placard_ammo') {
            drawFittedText(ctx, 'TACTICAL RANGE CARD', 450, 150, 38, 'sans-serif', 680, '#ffffff');
            drawFittedText(ctx, callsign.toUpperCase(), 450, 535, 48, 'sans-serif', 700, flavorColor);
            drawFittedText(ctx, `CAL: ${caliber.toUpperCase()} • ${blood.toUpperCase()}`, 450, 600, 26, 'monospace', 680, '#10b981');
            drawFittedText(ctx, motto.toUpperCase(), 450, 660, 20, 'monospace', 680, '#94a3b8');
            drawFittedText(ctx, 'POWERED BY TRC // RANGE VERIFIED', 450, 715, 16, 'monospace', 680, flavorColor);

        } else {
            // Shield, Hexagon, Dogtag, Circle, Starburst
            const isShield = shape === 'shield';
            const topY = shape === 'dogtag' ? 180 : 190;
            drawFittedText(ctx, 'TACTICAL RANGE CARD', 450, topY, 34, 'sans-serif', 540, '#ffffff');
            drawFittedText(ctx, callsign.toUpperCase(), 450, 545, 46, 'sans-serif', 560, flavorColor);
            drawFittedText(ctx, `CAL: ${caliber.toUpperCase()} • ${blood.toUpperCase()}`, 450, 608, 25, 'monospace', 520, '#10b981');
            drawFittedText(ctx, motto.toUpperCase(), 450, 665, 19, 'monospace', 460, '#94a3b8');
            drawFittedText(ctx, 'POWERED BY TRC // RANGE VERIFIED', 450, isShield ? 725 : 718, 15, 'monospace', 400, flavorColor);
        }

        ctx.restore();
    }

    window.updateStickerLivePreview = function() {
        const canvas = document.getElementById('trc-sticker-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const shape = window.currentStickerShape || 'shield';
        const texture = window.currentStickerTexture || 'matte_stealth';
        const callsign = document.getElementById('stk-callsign')?.value?.trim() || 'CALL SIGN';
        const caliber = document.getElementById('stk-caliber')?.value?.trim() || '6.5 CREEDMOOR';
        const blood = document.getElementById('stk-blood')?.value?.trim() || 'O+ POS';
        const motto = document.getElementById('stk-motto')?.value?.trim() || 'SUB-MOA ALL DAY • NO COMPROMISE';
        const flavorColor = getActiveFlavorColor();
        const mode = window.stickerSheetMode || 'single';

        if (mode === 'sheet_85x11') {
            canvas.width = 1700; canvas.height = 2200;
            ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#000000'; ctx.font = 'bold 36px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('TRC TACTICAL STICKER SHEET (8.5" x 11" PRINT AT HOME)', 850, 70);
            ctx.font = '18px monospace';
            ctx.fillText(`OPERATOR: ${callsign.toUpperCase()} | CAL: ${caliber.toUpperCase()} | CUT ALONG DOTTED LINES ✂️`, 850, 110);

            const positions = [
                { x: 70, y: 150 },  { x: 880, y: 150 },
                { x: 70, y: 820 },  { x: 880, y: 820 },
                { x: 70, y: 1490 }, { x: 880, y: 1490 }
            ];

            positions.forEach(pos => {
                ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
                ctx.strokeRect(pos.x, pos.y, 750, 630); ctx.setLineDash([]);
                ctx.fillStyle = '#64748b'; ctx.font = '16px monospace';
                ctx.fillText('✂️ CUT', pos.x + 40, pos.y + 25);
                drawSingleSticker(ctx, pos.x + 375 - (450 * 0.65), pos.y + 315 - (450 * 0.65), 0.65, shape, callsign, caliber, blood, motto, flavorColor, texture);
            });
        } else {
            canvas.width = 900;
            canvas.height = shape === 'strip_4x2' ? 450 : (shape === 'shield' || shape === 'coffin' ? 1000 : 900);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawSingleSticker(ctx, 0, 0, 1.0, shape, callsign, caliber, blood, motto, flavorColor, texture);
        }
    };

    window.downloadCustomStickerPng = function() {
        const canvas = document.getElementById('trc-sticker-canvas');
        if (!canvas) return;
        const callsign = document.getElementById('stk-callsign')?.value?.trim() || 'TRC_STICKER';
        const mode = window.stickerSheetMode || 'single';
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `TRC-Sticker-${mode === 'sheet_85x11' ? 'Sheet85x11' : 'DieCut'}-${callsign.replace(/\s+/g, '_')}-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();

        if (window.showToast) window.showToast('💾 High-Res Sticker PNG Saved!');
        if (window.pushTacLog) window.pushTacLog(`STICKER EXPORTED: [${callsign}] (${mode})`, 'SUCCESS');
    };

    // ============================================================
    // 🎯 PRECISION PAPER TARGET BUILDER & UPLOADER (25 DISTINCT TARGETS)
    // ============================================================
    let uploadedCustomTargetImg = null;
    window.targetGridDensity = '1moa'; // '1moa', '0.5moa', '0.1mil', 'none'

    window.openTargetBuilderStudio = function() {
        let targetModal = document.getElementById('trc-target-studio-modal');
        if (targetModal) targetModal.remove();

        const activeFlavorHex = getActiveFlavorColor();

        targetModal = document.createElement('div');
        targetModal.id = 'trc-target-studio-modal';
        targetModal.setAttribute('style', 'position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 2147483646 !important; background: rgba(2, 6, 23, 0.98) !important; backdrop-filter: blur(16px) !important; display: flex !important; flex-direction: column !important; overflow: hidden !important; color: #f8fafc;');

        targetModal.innerHTML = `
            <!-- HEADER -->
            <div class="shrink-0 bg-slate-950 border-b-2 border-emerald-500/80 px-3 py-2 sm:px-4 sm:py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 shadow-2xl">
                <div class="flex items-center gap-2 min-w-0">
                    <i data-lucide="target" class="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0"></i>
                    <div class="min-w-0">
                        <h3 class="text-xs sm:text-sm font-black text-emerald-400 uppercase tracking-wider truncate">
                            TRC TARGET BUILDER & UPLOADER
                        </h3>
                        <span class="text-[7.5px] text-slate-400 uppercase font-mono hidden xs:block">25 Distinct Geometries &bull; Upload Own Targets &bull; Print 8.5"x11"</span>
                    </div>
                </div>

                <div class="flex items-center gap-2 ml-auto sm:ml-0">
                    <button onclick="window.resetTargetBuilderForm()" style="background: #1e293b; color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.6); font-weight: 900;" class="text-[9.5px] px-3 py-1.5 rounded uppercase tracking-wider flex items-center gap-1.5 cursor-pointer hover:bg-slate-700">
                        <i data-lucide="rotate-ccw" class="w-3.5 h-3.5 text-emerald-400"></i> CLEAR FORM
                    </button>
                    <button onclick="window.downloadCustomTargetPng()" style="background: #10b981; color: #000000; box-shadow: 0 0 12px rgba(16, 185, 129, 0.6); font-weight: 900;" class="text-[9.5px] px-3.5 py-1.5 rounded uppercase tracking-wider flex items-center gap-1.5 cursor-pointer hover:brightness-110">
                        <i data-lucide="download" class="w-3.5 h-3.5 text-black"></i> SAVE PNG
                    </button>
                    <button onclick="document.getElementById('trc-target-studio-modal')?.remove()" title="Close" style="background: #7f1d1d; color: #ffffff; border: 1px solid #dc2626; font-weight: 900;" class="text-[9.5px] px-2.5 py-1.5 rounded uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:bg-red-800">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>

            <!-- WORKSPACE -->
            <div class="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 max-w-7xl mx-auto w-full pb-24">
                <!-- TARGET CONTROLS (5 COLS) -->
                <div class="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-5 flex flex-col space-y-3.5 shadow-xl">
                    <div class="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <h4 class="text-xs font-black text-emerald-400 uppercase tracking-widest">
                            TARGET CALIBRATION & UPLOADER
                        </h4>
                        <button type="button" onclick="window.resetTargetBuilderForm()" class="text-[8px] font-mono text-emerald-400 hover:text-emerald-300 underline cursor-pointer">RESET ALL</button>
                    </div>

                    <!-- UPLOAD CUSTOM TARGET OR LOGO -->
                    <div id="tgt-dropzone" class="p-2.5 bg-slate-950 rounded-xl border-2 border-dashed border-emerald-500/50 hover:border-emerald-400 transition-colors text-center cursor-pointer" onclick="document.getElementById('tgt-upload-input').click()">
                        <input type="file" id="tgt-upload-input" accept="image/*" onchange="window.handleCustomTargetUpload(event)" class="hidden">
                        <div class="flex flex-col items-center justify-center gap-0.5">
                            <i data-lucide="upload-cloud" class="w-4 h-4 text-emerald-400"></i>
                            <span class="text-[9px] font-black text-white uppercase">UPLOAD CUSTOM TARGET / ARTWORK</span>
                            <span class="text-[7.5px] text-slate-400 font-mono">Overlay precision MOA grid onto any uploaded target</span>
                        </div>
                    </div>

                    <div id="tgt-clear-art-container" class="hidden flex justify-between items-center bg-black/60 p-1.5 rounded-lg border border-emerald-500/40">
                        <span class="text-[8px] text-emerald-300 font-mono">Custom Target Image Active</span>
                        <button type="button" onclick="window.clearUploadedTargetArt()" class="bg-red-950 hover:bg-red-900 text-red-300 text-[8px] font-black py-0.5 px-2 rounded border border-red-800 cursor-pointer">✕ CLEAR ART</button>
                    </div>

                    <!-- 25 TARGET STYLES SELECTOR -->
                    <div>
                        <label class="text-[9px] font-black text-slate-300 uppercase tracking-wider block mb-1">Target Style (25 Truly Distinct Geometries)</label>
                        <select id="tgt-style" onchange="window.handleTargetStyleChange(this.value)" class="w-full bg-black border border-slate-700 text-white text-xs p-2 rounded-lg font-mono">
                            <optgroup label="── 🎯 SIGHT-IN & ZEROING ──">
                                <option value="diamonds_5">1. 5-Diamond Precision MOA Zero (1" Grid)</option>
                                <option value="cold_bore_ladder">2. Cold Bore 10-Shot Precision Ladder w/ Logs</option>
                                <option value="single_bullseye">3. Master Concentric Red 10-Ring Bullseye</option>
                                <option value="dot_matrix_12">4. Sub-MOA 1/2-Inch Dot Matrix (12 Test Dots)</option>
                                <option value="grid_16sq">5. 1-Inch Square Sight-In Grid (16 Checkers)</option>
                                <option value="reticle_level">6. Optic Plumb Lines & Reticle Cant Crosshairs</option>
                            </optgroup>
                            <optgroup label="── 🏆 COMPETITION & DRILLS ──">
                                <option value="nra_b8">7. Official NRA B-8 25Y Bullseye Target</option>
                                <option value="dot_torture">8. Dot Torture 50-Round Marksmanship Matrix</option>
                                <option value="kyl_circles">9. KYL Decreasing Circles (2.0" to 0.25")</option>
                                <option value="speed_double">10. Double-Tap Speed Transition Drill (Dual 8")</option>
                                <option value="bill_drill">11. Bill Drill 6-Shot Heart Calibration Target</option>
                                <option value="mozambique">12. Mozambique / Failure-To-Stop (Chest + Head)</option>
                                <option value="texas_star">13. Texas Star 5-Plate Spinner Array</option>
                                <option value="duel_tree">14. Duel Tree 6-Paddle Speed Target</option>
                            </optgroup>
                            <optgroup label="── 🛡️ MILITARY & LAW ENFORCEMENT ──">
                                <option value="m16_etype">15. M16/M4 Military E-Type Silhouette</option>
                                <option value="uspsa_metric">16. USPSA/IPSC Metric Silhouette (A/C/D Zones)</option>
                                <option value="fbi_q">17. FBI Qualification "Q" Bottle Target</option>
                                <option value="hostage_tzone">18. SWAT Sniper Hostage Scenario (2" T-Zone)</option>
                            </optgroup>
                            <optgroup label="── 🔭 LONG RANGE & PRS ──">
                                <option value="mil_ladder">19. MIL-Grid Holdover Step (0.0 to 4.0 MIL)</option>
                                <option value="elr_1000y">20. ELR 1000-Yard Ultra-Fine Sub-MOA Grid</option>
                                <option value="wind_drift">21. Long-Range Wind Drift Ladder (5 - 25 MPH)</option>
                                <option value="prs_barricade">22. PRS Positional Barricade Shapes Ladder</option>
                            </optgroup>
                            <optgroup label="── 🦌 HUNTING & VITAL ZONES ──">
                                <option value="varmint_vital">23. Predator / Coyote Heart Vitals Target</option>
                                <option value="hog_vital">24. Wild Boar / Feral Hog Shield Vitals Target</option>
                                <option value="deer_vital">25. Big Game / Whitetail Chest Vitals Target</option>
                            </optgroup>
                        </select>
                    </div>

                    <!-- SHOOTER INPUTS -->
                    <div class="space-y-1.5">
                        <div>
                            <label class="text-[8.5px] font-black uppercase tracking-wider block mb-0.5" style="color: ${activeFlavorHex};">CALL SIGN / RIFLE MODEL</label>
                            <input type="text" id="tgt-shooter" placeholder="e.g. CALL SIGN // RIFLE MODEL" oninput="window.updateTargetLivePreview()" class="w-full bg-black text-white text-xs p-1.5 rounded-lg font-mono" style="border: 1.5px solid ${activeFlavorHex};">
                        </div>
                        <div class="grid grid-cols-2 gap-1.5">
                            <div>
                                <label class="text-[8.5px] font-black uppercase tracking-wider block mb-0.5" style="color: ${activeFlavorHex};">CALIBER & BULLET</label>
                                <input type="text" id="tgt-bullet" placeholder="e.g. 6.5CM 140gr ELD-M" oninput="window.updateTargetLivePreview()" class="w-full bg-black text-white text-xs p-1.5 rounded-lg font-mono" style="border: 1.5px solid ${activeFlavorHex};">
                            </div>
                            <div>
                                <label class="text-[8.5px] font-black uppercase tracking-wider block mb-0.5" style="color: ${activeFlavorHex};">DISTANCE (YARDS)</label>
                                <input type="text" id="tgt-dist" placeholder="e.g. 100 YARDS" oninput="window.updateTargetLivePreview()" class="w-full bg-black text-white text-xs p-1.5 rounded-lg font-mono" style="border: 1.5px solid ${activeFlavorHex};">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- TARGET LIVE PREVIEW (7 COLS) -->
                <div class="lg:col-span-7 bg-white rounded-2xl p-3 sm:p-6 flex flex-col items-center justify-between shadow-2xl">
                    <div class="flex-1 flex items-center justify-center p-1 w-full max-h-[460px] overflow-hidden">
                        <canvas id="trc-target-canvas" class="max-w-full max-h-[420px] object-contain shadow border border-slate-300 bg-white"></canvas>
                    </div>
                    <div class="w-full mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-black">
                        <span class="text-[8px] sm:text-[9px] font-mono font-bold text-slate-600">Standard 8.5" x 11" Paper &bull; 100% Scale</span>
                        <button onclick="window.downloadCustomTargetPng()" style="background: #10b981; color: #000000; box-shadow: 0 0 10px rgba(16, 185, 129, 0.4); font-weight: 900;" class="text-[9.5px] sm:text-[10px] px-3.5 py-1.5 rounded uppercase tracking-wider flex items-center gap-1.5 cursor-pointer hover:brightness-110">
                            <i data-lucide="printer" class="w-3.5 h-3.5 text-black"></i> PRINT TARGET
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(targetModal);
        if (window.lucide) window.lucide.createIcons({ root: targetModal });
        
        const dropzone = document.getElementById('tgt-dropzone');
        if (dropzone) {
            ['dragenter', 'dragover'].forEach(name => {
                dropzone.addEventListener(name, (e) => { e.preventDefault(); dropzone.classList.add('border-emerald-400'); }, false);
            });
            ['dragleave', 'drop'].forEach(name => {
                dropzone.addEventListener(name, (e) => { e.preventDefault(); dropzone.classList.remove('border-emerald-400'); }, false);
            });
            dropzone.addEventListener('drop', (e) => {
                const dt = e.dataTransfer;
                const files = dt.files;
                if (files && files.length) {
                    window.handleCustomTargetUpload({ target: { files: files } });
                }
            }, false);
        }

        window.updateTargetLivePreview();
    };

    window.handleCustomTargetUpload = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            const img = new Image();
            img.onload = function() {
                uploadedCustomTargetImg = img;
                const clearCont = document.getElementById('tgt-clear-art-container');
                if (clearCont) clearCont.classList.remove('hidden');
                window.updateTargetLivePreview();
                if (window.showToast) window.showToast('🎯 Custom target image loaded into canvas!');
            };
            img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
    };

    window.clearUploadedTargetArt = function() {
        uploadedCustomTargetImg = null;
        const input = document.getElementById('tgt-upload-input');
        if (input) input.value = '';
        const clearCont = document.getElementById('tgt-clear-art-container');
        if (clearCont) clearCont.classList.add('hidden');
        window.updateTargetLivePreview();
    };

    window.handleTargetStyleChange = function(newStyle) {
        if (uploadedCustomTargetImg) {
            uploadedCustomTargetImg = null;
            const input = document.getElementById('tgt-upload-input');
            if (input) input.value = '';
            const clearCont = document.getElementById('tgt-clear-art-container');
            if (clearCont) clearCont.classList.add('hidden');
            if (window.showToast) window.showToast('🎯 Switched to Built-in Target Design!');
        }
        window.updateTargetLivePreview();
    };

    window.resetTargetBuilderForm = function() {
        uploadedCustomTargetImg = null;
        const input = document.getElementById('tgt-upload-input');
        if (input) input.value = '';
        const clearCont = document.getElementById('tgt-clear-art-container');
        if (clearCont) clearCont.classList.add('hidden');

        const sh = document.getElementById('tgt-shooter'); if (sh) sh.value = '';
        const bl = document.getElementById('tgt-bullet'); if (bl) bl.value = '';
        const ds = document.getElementById('tgt-dist'); if (ds) ds.value = '';

        const styleSel = document.getElementById('tgt-style');
        if (styleSel) styleSel.value = 'diamonds_5';

        window.updateTargetLivePreview();
        if (window.showToast) window.showToast('🔄 Target Builder Form Cleared!');
    };

    window.updateTargetLivePreview = function() {
        const canvas = document.getElementById('trc-target-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        canvas.width = 1700;  // 8.5" @ 200 DPI
        canvas.height = 2200; // 11" @ 200 DPI

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const shooter = document.getElementById('tgt-shooter')?.value?.trim() || 'CALL SIGN // RIFLE MODEL';
        const bullet = document.getElementById('tgt-bullet')?.value?.trim() || 'CALIBER & BULLET';
        const dist = document.getElementById('tgt-dist')?.value?.trim() || '100 YARDS';
        const style = document.getElementById('tgt-style')?.value || 'diamonds_5';
        const flavorColor = getActiveFlavorColor();

        // Master Header
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 42px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('TRC PRECISION CALIBRATION TARGET', canvas.width / 2, 70);

        ctx.strokeStyle = flavorColor;
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(100, 85); ctx.lineTo(1600, 85); ctx.stroke();

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 22px monospace';
        ctx.fillText(`SHOOTER: ${shooter.toUpperCase()} | CAL: ${bullet.toUpperCase()} | DIST: ${dist.toUpperCase()}`, canvas.width / 2, 120);
        
        ctx.fillStyle = flavorColor === '#e9ecef' ? '#475569' : flavorColor;
        ctx.font = 'bold 18px monospace';
        ctx.fillText('1 GRID SQUARE = 1.047" (1 MOA @ 100 YDS) • 1/4 MOA CLICK = 4 CLICKS PER SQUARE', canvas.width / 2, 148);

        // Draw Uploaded Custom Target (If present)
        if (uploadedCustomTargetImg) {
            ctx.drawImage(uploadedCustomTargetImg, 150, 200, 1400, 1850);
        }

        // 1-Inch Grid Lines
        const noGridStyles = ['reticle_level', 'tactical_torso', 'uspsa_metric', 'fbi_q', 'hostage_tzone', 'varmint_vital', 'hog_vital', 'deer_vital', 'm16_etype'];
        if (!uploadedCustomTargetImg && !noGridStyles.includes(style)) {
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1.5;
            for (let x = 100; x <= 1600; x += 100) {
                ctx.beginPath(); ctx.moveTo(x, 170); ctx.lineTo(x, 2100); ctx.stroke();
            }
            for (let y = 170; y <= 2100; y += 100) {
                ctx.beginPath(); ctx.moveTo(100, y); ctx.lineTo(1600, y); ctx.stroke();
            }
        }

        const targetAccent = (flavorColor === '#e9ecef' || flavorColor === '#ffffff') ? '#ef4444' : flavorColor;

        // If custom uploaded image without built-in geometry, stop here so user's image with MOA grid is clean
        if (uploadedCustomTargetImg) return;

        // ==========================================
        // 25 TRULY DISTINCT TARGET GEOMETRIES
        // ==========================================
        if (style === 'diamonds_5') {
            // 1. 5-Diamond Precision MOA Zero
            const centers = [
                { x: 850, y: 1100, r: 160, isMain: true },
                { x: 400, y: 500, r: 110, isMain: false },
                { x: 1300, y: 500, r: 110, isMain: false },
                { x: 400, y: 1700, r: 110, isMain: false },
                { x: 1300, y: 1700, r: 110, isMain: false }
            ];
            centers.forEach(c => {
                ctx.strokeStyle = '#000000'; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.stroke();
                ctx.fillStyle = c.isMain ? targetAccent : '#000000';
                ctx.beginPath(); ctx.moveTo(c.x, c.y - c.r / 2); ctx.lineTo(c.x + c.r / 2, c.y); ctx.lineTo(c.x, c.y + c.r / 2); ctx.lineTo(c.x - c.r / 2, c.y); ctx.closePath(); ctx.fill();
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(c.x - c.r / 2, c.y); ctx.lineTo(c.x + c.r / 2, c.y); ctx.moveTo(c.x, c.y - c.r / 2); ctx.lineTo(c.x, c.y + c.r / 2); ctx.stroke();
            });

        } else if (style === 'cold_bore_ladder') {
            // 2. Cold Bore 10-Shot Precision Ladder w/ Logs
            for (let i = 0; i < 10; i++) {
                const col = i < 5 ? 0 : 1, row = i % 5;
                const cx = col === 0 ? 450 : 1250, cy = 340 + (row * 350);
                ctx.strokeStyle = '#000000'; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.arc(cx, cy, 110, 0, Math.PI * 2); ctx.stroke();
                ctx.fillStyle = i === 0 ? targetAccent : '#000000';
                ctx.beginPath(); ctx.arc(cx, cy, 40, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#000000'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(cx - 130, cy); ctx.lineTo(cx + 130, cy); ctx.moveTo(cx, cy - 130); ctx.lineTo(cx, cy + 130); ctx.stroke();
                ctx.fillStyle = '#000000'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'left';
                ctx.fillText(`SHOT #${i + 1} ${i === 0 ? '[COLD BORE]' : ''}`, cx - 135, cy - 125);
                ctx.font = 'bold 15px monospace';
                ctx.fillText('LOAD: _________  VEL: _____ FPS', cx - 135, cy + 138);
                ctx.fillText('ELEV: _____  WIND: _____  CLICKS: _____', cx - 135, cy + 160);
            }

        } else if (style === 'single_bullseye') {
            // 3. Master Concentric Red 10-Ring Bullseye
            const cx = 850, cy = 1100;
            [450, 360, 270, 180, 90].forEach((r, idx) => {
                ctx.strokeStyle = '#000000'; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
                ctx.fillStyle = '#000000'; ctx.font = 'bold 24px sans-serif';
                ctx.fillText(`${10 - idx}`, cx + r - 30, cy - 10);
            });
            ctx.fillStyle = targetAccent; ctx.beginPath(); ctx.arc(cx, cy, 45, 0, Math.PI * 2); ctx.fill();

        } else if (style === 'dot_matrix_12') {
            // 4. Sub-MOA 1/2-Inch Dot Matrix (12 Test Dots)
            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 3; c++) {
                    const cx = 350 + (c * 500), cy = 360 + (r * 450);
                    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
                    ctx.strokeRect(cx - 150, cy - 150, 300, 300);
                    ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(cx, cy, 40, 0, Math.PI * 2); ctx.fill();
                    ctx.strokeStyle = targetAccent; ctx.lineWidth = 3;
                    ctx.beginPath(); ctx.moveTo(cx - 70, cy); ctx.lineTo(cx + 70, cy); ctx.moveTo(cx, cy - 70); ctx.lineTo(cx, cy + 70); ctx.stroke();
                    ctx.fillStyle = '#000000'; ctx.font = 'bold 18px monospace'; ctx.textAlign = 'center';
                    ctx.fillText(`GROUP #${r * 3 + c + 1} (3-SHOT)`, cx, cy - 165);
                    ctx.font = 'bold 14px monospace';
                    ctx.fillText('LOAD: _______  VEL: ____ FPS', cx, cy + 115);
                    ctx.fillText('CLICKS: ____  GROUP: ____"', cx, cy + 138);
                }
            }

        } else if (style === 'grid_16sq') {
            // 5. 1-Inch Square Sight-In Grid Target (16 Checkers)
            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 4; c++) {
                    const cx = 275 + (c * 380), cy = 350 + (r * 440);
                    ctx.fillStyle = '#000000'; ctx.fillRect(cx - 80, cy - 80, 160, 160);
                    ctx.fillStyle = targetAccent; ctx.fillRect(cx - 30, cy - 30, 60, 60);
                    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.moveTo(cx - 80, cy); ctx.lineTo(cx + 80, cy); ctx.moveTo(cx, cy - 80); ctx.lineTo(cx, cy + 80); ctx.stroke();
                    ctx.fillStyle = '#000000'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center';
                    ctx.fillText(`BOX #${r * 4 + c + 1}`, cx, cy - 95);
                }
            }

        } else if (style === 'reticle_level') {
            // 6. Optic Plumb Lines & Reticle Cant Crosshairs
            ctx.strokeStyle = '#000000'; ctx.lineWidth = 6;
            ctx.beginPath(); ctx.moveTo(850, 100); ctx.lineTo(850, 2100); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(100, 1100); ctx.lineTo(1600, 1100); ctx.stroke();
            for (let y = 200; y <= 2000; y += 100) {
                ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(820, y); ctx.lineTo(880, y); ctx.stroke();
            }
            for (let x = 200; x <= 1500; x += 100) {
                ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, 1070); ctx.lineTo(x, 1130); ctx.stroke();
            }
            ctx.fillStyle = targetAccent; ctx.beginPath(); ctx.arc(850, 1100, 20, 0, Math.PI * 2); ctx.fill();

        } else if (style === 'nra_b8') {
            // 7. Official NRA B-8 25Y Bullseye Target
            const cx = 850, cy = 1100;
            ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(cx, cy, 380, 0, Math.PI * 2); ctx.fill();
            [380, 300, 220, 150, 80].forEach((r, idx) => {
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
                ctx.fillStyle = '#ffffff'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center';
                if (idx < 4) ctx.fillText(`${7 + idx}`, cx, cy - r + 35);
            });
            ctx.fillStyle = targetAccent; ctx.beginPath(); ctx.arc(cx, cy, 40, 0, Math.PI * 2); ctx.fill();

        } else if (style === 'dot_torture') {
            // 8. Dot Torture 50-Round Marksmanship Matrix
            const dotTasks = [
                'DOT 1: 5 Shots Slow Fire', 'DOT 2: 1 Shot Draw (5x)', 'DOT 3-4: 1 Shot Each (4x)',
                'DOT 5: 5 Shots Strong Hand', 'DOT 6-7: 2 Shots Each Draw', 'DOT 8: 5 Shots Support Hand',
                'DOT 9-10: 1 Shot Each + Reload', 'DOT BONUS: 5 Shots Rapid'
            ];
            for (let i = 0; i < 8; i++) {
                const col = i % 2, row = Math.floor(i / 2);
                const cx = col === 0 ? 450 : 1250, cy = 350 + (row * 420);
                ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(cx, cy, 100, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = targetAccent; ctx.beginPath(); ctx.arc(cx, cy, 35, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#000000'; ctx.font = 'bold 18px monospace'; ctx.textAlign = 'center';
                ctx.fillText(dotTasks[i], cx, cy + 135);
            }

        } else if (style === 'kyl_circles') {
            // 9. KYL Decreasing Circles (2.0" to 0.25")
            const sizes = [160, 120, 90, 70, 50, 35, 20];
            const labels = ['2.0"', '1.5"', '1.25"', '1.0"', '0.75"', '0.50"', '0.25"'];
            sizes.forEach((radius, idx) => {
                const cy = 300 + (idx * 260), cx = 850;
                ctx.strokeStyle = '#000000'; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke();
                ctx.fillStyle = idx >= 4 ? targetAccent : '#000000';
                ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#000000'; ctx.font = 'bold 24px monospace'; ctx.textAlign = 'left';
                ctx.fillText(`STAGE #${idx + 1} [${labels[idx]}]`, cx - 380, cy + 10);
            });

        } else if (style === 'speed_double') {
            // 10. Double-Tap Speed Transition Drill
            [650, 1550].forEach((cy, idx) => {
                const cx = 850;
                ctx.strokeStyle = '#000000'; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.arc(cx, cy, 320, 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.arc(cx, cy, 180, 0, Math.PI * 2); ctx.stroke();
                ctx.fillStyle = targetAccent; ctx.beginPath(); ctx.arc(cx, cy, 50, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#000000'; ctx.font = 'bold 26px monospace'; ctx.textAlign = 'center';
                ctx.fillText(`DOUBLE-TAP TARGET #${idx + 1} (2-SHOT SPEED)`, cx, cy - 340);
            });

        } else if (style === 'bill_drill') {
            // 11. Bill Drill 6-Shot Heart Calibration Target
            const cx = 850, cy = 1100;
            ctx.strokeStyle = '#000000'; ctx.lineWidth = 6;
            ctx.beginPath(); ctx.arc(cx, cy, 400, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(cx, cy, 200, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = targetAccent; ctx.beginPath(); ctx.arc(cx, cy, 60, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#000000'; ctx.font = 'bold 30px monospace'; ctx.textAlign = 'center';
            ctx.fillText('BILL DRILL 6-SHOT ZONE (7 YARDS / SUB-2.0s GOAL)', 850, 240);

        } else if (style === 'mozambique') {
            // 12. Mozambique / Failure-To-Stop (Chest + Head)
            ctx.strokeStyle = '#000000'; ctx.lineWidth = 6;
            ctx.strokeRect(650, 300, 400, 300); // Head Box
            ctx.fillStyle = targetAccent; ctx.fillRect(750, 380, 200, 120); // 3x5" Head Box
            ctx.strokeStyle = '#000000'; ctx.lineWidth = 6;
            ctx.beginPath(); ctx.arc(850, 1200, 320, 0, Math.PI * 2); ctx.stroke(); // Chest 8"
            ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(850, 1200, 160, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = targetAccent; ctx.beginPath(); ctx.arc(850, 1200, 50, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#000000'; ctx.font = 'bold 30px monospace'; ctx.textAlign = 'center';
            ctx.fillText('MOZAMBIQUE DRILL (2 CHEST + 1 HEAD)', 850, 230);

        } else if (style === 'texas_star') {
            // 13. Texas Star 5-Plate Spinner Array
            const cx = 850, cy = 1150;
            ctx.strokeStyle = '#64748b'; ctx.lineWidth = 8;
            for (let i = 0; i < 5; i++) {
                const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
                const px = cx + 420 * Math.cos(angle), py = cy + 420 * Math.sin(angle);
                ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();
                ctx.fillStyle = targetAccent; ctx.beginPath(); ctx.arc(px, py, 90, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#000000'; ctx.lineWidth = 4; ctx.stroke();
            }
            ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(cx, cy, 50, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#000000'; ctx.font = 'bold 30px monospace'; ctx.textAlign = 'center';
            ctx.fillText('TEXAS STAR 5-PLATE SPINNER TARGET', 850, 230);

        } else if (style === 'duel_tree') {
            // 14. Duel Tree 6-Paddle Speed Target
            ctx.fillStyle = '#334155'; ctx.fillRect(820, 320, 60, 1600); // Center Post
            for (let i = 0; i < 6; i++) {
                const isLeft = i % 2 === 0;
                const py = 450 + (i * 240);
                const px = isLeft ? 600 : 1100;
                ctx.fillStyle = isLeft ? targetAccent : '#000000';
                ctx.beginPath(); ctx.arc(px, py, 110, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#000000'; ctx.lineWidth = 4; ctx.stroke();
                ctx.fillStyle = '#ffffff'; ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText(`${i + 1}`, px, py + 10);
            }
            ctx.fillStyle = '#000000'; ctx.font = 'bold 30px monospace'; ctx.textAlign = 'center';
            ctx.fillText('DUELING TREE 6-PADDLE SPEED TARGET', 850, 240);

        } else if (style === 'm16_etype') {
            // 15. M16/M4 Military E-Type Silhouette
            ctx.strokeStyle = '#000000'; ctx.lineWidth = 6; ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.moveTo(650, 320); ctx.lineTo(1050, 320); ctx.lineTo(1050, 520);
            ctx.lineTo(1350, 720); ctx.lineTo(1350, 1950); ctx.lineTo(350, 1950);
            ctx.lineTo(350, 720); ctx.lineTo(650, 520); ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.strokeStyle = targetAccent; ctx.lineWidth = 4;
            ctx.strokeRect(650, 850, 400, 650);
            ctx.fillStyle = targetAccent; ctx.font = 'bold 36px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('E-TYPE CENTER MASS', 850, 1180);

        } else if (style === 'uspsa_metric') {
            // 16. USPSA/IPSC Metric Silhouette (A/C/D Zones)
            ctx.strokeStyle = '#000000'; ctx.lineWidth = 5;
            ctx.strokeRect(600, 280, 500, 350); ctx.strokeRect(400, 630, 900, 1300);
            ctx.strokeStyle = targetAccent; ctx.lineWidth = 4;
            ctx.strokeRect(650, 850, 400, 600);
            ctx.fillStyle = targetAccent; ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('A-ZONE', 850, 1150);
            ctx.fillStyle = '#64748b'; ctx.font = 'bold 28px sans-serif';
            ctx.fillText('C-ZONE', 850, 750); ctx.fillText('D-ZONE', 850, 1750);

        } else if (style === 'fbi_q') {
            // 17. FBI Qualification "Q" Bottle Target
            ctx.strokeStyle = '#000000'; ctx.lineWidth = 6;
            ctx.beginPath(); ctx.roundRect(450, 320, 800, 1600, [150]); ctx.stroke();
            ctx.strokeStyle = targetAccent; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(850, 950, 220, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = targetAccent; ctx.beginPath(); ctx.arc(850, 950, 50, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#000000'; ctx.font = 'bold 32px monospace'; ctx.textAlign = 'center';
            ctx.fillText('FBI QUALIFICATION "Q" BOTTLE TARGET', 850, 250);

        } else if (style === 'hostage_tzone') {
            // 18. SWAT Sniper Hostage Scenario (2" T-Zone)
            ctx.strokeStyle = '#000000'; ctx.lineWidth = 5;
            ctx.strokeRect(550, 350, 600, 800);
            ctx.fillStyle = targetAccent; ctx.fillRect(650, 650, 400, 80); ctx.fillRect(810, 650, 80, 240);
            ctx.strokeStyle = '#000000'; ctx.lineWidth = 3;
            ctx.strokeRect(650, 650, 400, 80); ctx.strokeRect(810, 650, 80, 240);
            ctx.fillStyle = '#000000'; ctx.font = 'bold 32px monospace'; ctx.textAlign = 'center';
            ctx.fillText('SNIPER T-ZONE // HOSTAGE PROTOCOL', 850, 280);

        } else if (style === 'mil_ladder') {
            // 19. MIL-Grid Holdover Step Target
            const cx = 850;
            [
                { y: 350, mil: '0.0 MIL (CENTER ZERO)', r: 60, col: targetAccent },
                { y: 650, mil: '+1.0 MIL HOLDOVER', r: 50, col: '#000000' },
                { y: 1000, mil: '+2.0 MIL HOLDOVER', r: 45, col: '#000000' },
                { y: 1400, mil: '+3.0 MIL HOLDOVER', r: 40, col: '#000000' },
                { y: 1850, mil: '+4.0 MIL HOLDOVER', r: 35, col: '#000000' }
            ].forEach(s => {
                ctx.fillStyle = s.col; ctx.beginPath(); ctx.arc(cx, s.y, s.r, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#000000'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center';
                ctx.fillText(s.mil, cx, s.y - s.r - 15);
            });

        } else if (style === 'elr_1000y') {
            // 20. ELR 1000-Yard Ultra-Fine Sub-MOA Grid
            const cx = 850, cy = 1100;
            for (let r = 500; r >= 50; r -= 50) {
                ctx.strokeStyle = (r === 250 || r === 500) ? targetAccent : '#94a3b8';
                ctx.lineWidth = (r === 250 || r === 500) ? 3 : 1;
                ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
            }
            ctx.fillStyle = targetAccent; ctx.beginPath(); ctx.arc(cx, cy, 25, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#000000'; ctx.font = 'bold 30px monospace'; ctx.textAlign = 'center';
            ctx.fillText('ELR 1000-YARD SUB-MOA CALIBRATION GRID', 850, 220);

        } else if (style === 'wind_drift') {
            // 21. Long-Range Wind Drift Ladder
            [5, 10, 15, 20, 25].forEach((mph, idx) => {
                const cy = 350 + (idx * 350);
                ctx.fillStyle = targetAccent; ctx.beginPath(); ctx.arc(450 + (idx * 160), cy, 40, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#000000'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(150, cy); ctx.lineTo(1550, cy); ctx.stroke();
                ctx.fillStyle = '#000000'; ctx.font = 'bold 20px monospace'; ctx.textAlign = 'left';
                ctx.fillText(`${mph} MPH CROSSWIND DRIFT HOLD`, 160, cy - 20);
            });

        } else if (style === 'prs_barricade') {
            // 22. PRS Positional Barricade Shapes Ladder
            const shapes = [
                { name: 'POS 1: STANDING (DIAMOND)', type: 'diamond', cy: 450 },
                { name: 'POS 2: KNEELING (HEXAGON)', type: 'hexagon', cy: 850 },
                { name: 'POS 3: SEATED (CIRCLE)', type: 'circle', cy: 1250 },
                { name: 'POS 4: PRONE (SQUARE)', type: 'square', cy: 1650 }
            ];
            shapes.forEach(s => {
                const cx = 850;
                ctx.fillStyle = targetAccent;
                if (s.type === 'diamond') {
                    ctx.beginPath(); ctx.moveTo(cx, s.cy - 80); ctx.lineTo(cx + 80, s.cy); ctx.lineTo(cx, s.cy + 80); ctx.lineTo(cx - 80, s.cy); ctx.closePath(); ctx.fill();
                } else if (s.type === 'hexagon') {
                    ctx.beginPath();
                    for (let i = 0; i < 6; i++) {
                        const a = (Math.PI / 3) * i;
                        const x = cx + 80 * Math.cos(a), y = s.cy + 80 * Math.sin(a);
                        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                    }
                    ctx.closePath(); ctx.fill();
                } else if (s.type === 'circle') {
                    ctx.beginPath(); ctx.arc(cx, s.cy, 75, 0, Math.PI * 2); ctx.fill();
                } else {
                    ctx.fillRect(cx - 70, s.cy - 70, 140, 140);
                }
                ctx.fillStyle = '#000000'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center';
                ctx.fillText(s.name, cx, s.cy - 105);
            });

        } else if (style === 'varmint_vital') {
            // 23. Predator / Coyote Heart Vitals Target
            const cx = 850, cy = 1100;
            ctx.strokeStyle = '#000000'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.ellipse(cx, cy, 450, 250, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = targetAccent;
            ctx.beginPath(); ctx.moveTo(cx, cy - 100); ctx.lineTo(cx + 100, cy); ctx.lineTo(cx, cy + 100); ctx.lineTo(cx - 100, cy); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('KILL ZONE', cx, cy + 8);

        } else if (style === 'hog_vital') {
            // 24. Wild Boar / Feral Hog Shield Vitals Target
            const cx = 850, cy = 1100;
            ctx.strokeStyle = '#000000'; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.ellipse(cx, cy, 550, 320, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = targetAccent; ctx.beginPath(); ctx.arc(cx - 120, cy - 20, 110, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('HOG VITALS', cx - 120, cy - 20);

        } else {
            // 25. Big Game / Whitetail Chest Vitals Target
            const cx = 850, cy = 1100;
            ctx.strokeStyle = '#000000'; ctx.lineWidth = 5;
            ctx.strokeRect(350, 600, 1000, 800);
            ctx.fillStyle = targetAccent; ctx.beginPath(); ctx.ellipse(cx - 80, cy - 40, 180, 240, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff'; ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('HEART / LUNGS', cx - 80, cy - 40);
        }
    };

    window.downloadCustomTargetPng = function() {
        const canvas = document.getElementById('trc-target-canvas');
        if (!canvas) return;
        const style = document.getElementById('tgt-style')?.value || 'Target';
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `TRC-${style}-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
        if (window.showToast) window.showToast('🎯 Precision Target downloaded!');
    };

})();
