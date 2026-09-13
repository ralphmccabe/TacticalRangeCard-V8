// --- FIELD HARVEST / GAME TAG LOGIC ---
const gameTagModal = document.getElementById('gametag-modal');
const openGameTagBtns = document.querySelectorAll('#openGameTagBtn, #openGameTagBtnHud');
const gametagImageUpload = document.getElementById('gametag-image-upload');
const gametagRenderImg = document.getElementById('gametag-render-img');
const gametagImagePlaceholder = document.getElementById('gametag-render-img-placeholder');

const gametagClearBtn = document.getElementById('gametag-clear-btn');
const gametagSaveInventoryBtn = document.getElementById('gametag-save-inventory-btn');
const reworkGametagBtn = document.getElementById('rework-gametag-btn');
const gametagToVaultBtnTop = document.getElementById('gametag-to-vault-btn-top');

let currentGametagImage = null;
let activeGametagId = null;
let selectedGametagId = null;
let currentGametagType = 'game'; // 'game' or 'fish'

window.closeGameTagModal = function() {
    if (gameTagModal) {
        gameTagModal.classList.add('hidden');
        gameTagModal.classList.remove('flex');
    }
};

window.openGameTagModal = function() {
    gameTagModal.classList.remove('hidden');
    gameTagModal.classList.add('flex');
    clearGametagForm();
    renderGametagLibrary();
    
    // Auto-fill date
    document.getElementById('gametag-input-date').value = new Date().toLocaleString();
    
    // Attempt to auto-fill GPS if allowed
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude.toFixed(5);
            const lon = position.coords.longitude.toFixed(5);
            document.getElementById('gametag-input-gps').value = `${lat}, ${lon}`;
        }, () => {});
    }
};

openGameTagBtns.forEach(btn => {
    btn.addEventListener('click', window.openGameTagModal);
});

window.setGameTagType = function(type) {
    currentGametagType = type;
    const btnGame = document.getElementById('gametag-type-game');
    const btnFish = document.getElementById('gametag-type-fish');
    const fieldsGame = document.getElementById('gametag-fields-game');
    const fieldsFish = document.getElementById('gametag-fields-fish');
    
    if (type === 'game') {
        btnGame.className = 'flex-1 py-2 text-xs font-black uppercase tracking-widest rounded transition-all';
        btnGame.style.backgroundColor = '#f59e0b'; // amber-500
        btnGame.style.color = '#451a03'; // amber-950
        
        btnFish.className = 'flex-1 py-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white rounded transition-all';
        btnFish.style.backgroundColor = 'transparent';
        
        fieldsGame.classList.remove('hidden');
        fieldsFish.classList.add('hidden');
        document.getElementById('gametag-render-type-label').innerText = 'FIELD HARVEST TAG';
    } else {
        btnFish.className = 'flex-1 py-2 text-xs font-black uppercase tracking-widest rounded transition-all';
        btnFish.style.backgroundColor = '#3b82f6'; // blue-500
        btnFish.style.color = 'white';
        
        btnGame.className = 'flex-1 py-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white rounded transition-all';
        btnGame.style.backgroundColor = 'transparent';
        
        fieldsFish.classList.remove('hidden');
        fieldsGame.classList.add('hidden');
        document.getElementById('gametag-render-type-label').innerText = 'FISHING RECORD TAG';
    }
}

if (gametagImageUpload) {
    gametagImageUpload.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if(!file) return;
        
        try {
            const optimized = window.compressAndResizeImage 
                ? await window.compressAndResizeImage(file, 800, 0.8) 
                : await new Promise(r => { const fr = new FileReader(); fr.onload = ev => r(ev.target.result); fr.readAsDataURL(file); });
            currentGametagImage = optimized;
            const previewImg = document.getElementById('gametag-form-preview-img');
            const previewIcon = document.getElementById('gametag-form-preview-icon');
            const previewLabel = document.getElementById('gametag-image-label');
            
            if (previewImg) {
                previewImg.src = currentGametagImage;
                previewImg.classList.remove('hidden');
            }
            if (previewIcon) previewIcon.style.opacity = '0.3';
            if (previewLabel) previewLabel.innerText = 'CHANGE PHOTO';
        } catch(err) {
            console.error("Gametag image process error:", err);
        }
    });
}

function clearGametagForm() {
    currentGametagImage = null;
    activeGametagId = null;
    selectedGametagId = null;
    gametagImageUpload.value = '';
    
    const previewImg = document.getElementById('gametag-form-preview-img');
    const previewIcon = document.getElementById('gametag-form-preview-icon');
    const previewLabel = document.getElementById('gametag-image-label');
    
    if (previewImg) {
        previewImg.src = '';
        previewImg.classList.add('hidden');
    }
    if (previewIcon) previewIcon.style.opacity = '1';
    if (previewLabel) previewLabel.innerText = 'TAP TO UPLOAD PHOTO';
    
    document.getElementById('gametag-input-date').value = new Date().toLocaleString();
    document.getElementById('gametag-input-gps').value = '';
    document.getElementById('gametag-input-game-species').value = '';
    document.getElementById('gametag-input-game-sex').value = '';
    document.getElementById('gametag-input-game-weapon').value = '';
    document.getElementById('gametag-input-game-license').value = '';
    document.getElementById('gametag-input-game-points').value = '';
    document.getElementById('gametag-input-game-spread').value = '';
    
    document.getElementById('gametag-input-fish-species').value = '';
    document.getElementById('gametag-input-fish-water').value = '';
    document.getElementById('gametag-input-fish-length').value = '';
    document.getElementById('gametag-input-fish-weight').value = '';
    document.getElementById('gametag-input-fish-bait').value = '';
    
    document.getElementById('gametag-input-notes').value = '';
    
    if(reworkGametagBtn) reworkGametagBtn.classList.add('hidden');
    if(gametagToVaultBtnTop) gametagToVaultBtnTop.classList.add('hidden');
    
    renderGametagLibrary();
}

if (gametagClearBtn) {
    gametagClearBtn.addEventListener('click', clearGametagForm);
}

if (gametagSaveInventoryBtn) {
    gametagSaveInventoryBtn.addEventListener('click', async () => {
        if(!window.TRC_IDB) {
            alert("Database not ready.");
            return;
        }
        
        const data = {
            id: activeGametagId || Date.now().toString(),
            type: currentGametagType,
            timestamp: Date.now(),
            image: currentGametagImage,
            date: document.getElementById('gametag-input-date').value,
            gps: document.getElementById('gametag-input-gps').value,
            notes: document.getElementById('gametag-input-notes').value,
            // Game fields
            game_species: document.getElementById('gametag-input-game-species').value,
            game_sex: document.getElementById('gametag-input-game-sex').value,
            game_weapon: document.getElementById('gametag-input-game-weapon').value,
            game_license: document.getElementById('gametag-input-game-license').value,
            game_points: document.getElementById('gametag-input-game-points').value,
            game_spread: document.getElementById('gametag-input-game-spread').value,
            // Fish fields
            fish_species: document.getElementById('gametag-input-fish-species').value,
            fish_water: document.getElementById('gametag-input-fish-water').value,
            fish_length: document.getElementById('gametag-input-fish-length').value,
            fish_weight: document.getElementById('gametag-input-fish-weight').value,
            fish_bait: document.getElementById('gametag-input-fish-bait').value
        };
        
        try {
            await window.TRC_IDB.set('gameTagLibrary', data.id, data);
            if (window.showToast) window.showToast("Tag Saved to Inventory");
            clearGametagForm();
            renderGametagLibrary();
        } catch(err) {
            console.error("Save Tag failed:", err);
            alert("Database error: Could not save Tag.");
        }
    });
}

async function renderGametagLibrary() {
    const listEl = document.getElementById('gametagLibraryList');
    if(!listEl || !window.TRC_IDB) return;
    
    try {
        const tagObj = await window.TRC_IDB.getAll('gameTagLibrary');
        const allTags = Object.values(tagObj || {});
        listEl.innerHTML = '';
        
        if(allTags.length === 0) {
            listEl.innerHTML = '<div class="col-span-full text-center text-gray-400 text-xs py-10 font-bold tracking-widest border border-dashed border-gray-800 rounded-lg">INVENTORY EMPTY</div>';
            return;
        }
        
        allTags.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
        
        allTags.forEach(tag => {
            const dateStr = tag.date || new Date(tag.timestamp).toLocaleString();
            const displayName = tag.type === 'game' ? (tag.game_species || 'UNKNOWN GAME') : (tag.fish_species || 'UNKNOWN FISH');
            const isActive = selectedGametagId === tag.id;
            
            const card = document.createElement('div');
            card.className = `relative p-3 rounded-lg border-2 cursor-pointer transition-all ${isActive ? 'bg-amber-900/30 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-gray-900/50 border-gray-800 hover:border-gray-600'}`;
            
            card.innerHTML = `
                <div class="absolute top-2 left-2 z-30 bg-black/60 p-1 rounded pointer-events-auto">
                    <input type="checkbox" aria-label="Select Game Tag" class="w-4 h-4 cursor-pointer bg-black/50 border border-gray-500 rounded text-amber-500 focus:ring-amber-500/50" ${isActive ? 'checked' : ''} onclick="event.stopPropagation(); window.selectGametag('${tag.id}')">
                </div>
                <div class="flex items-start justify-between mb-2 pointer-events-none">
                    <div style="padding-left: 32px;" class="font-black ${tag.type === 'game' ? 'text-amber-500' : 'text-blue-500'} text-[10px] uppercase tracking-widest truncate max-w-[150px]">${displayName}</div>
                    <div class="text-[8px] text-gray-400 shrink-0">${dateStr}</div>
                </div>
                <div class="flex gap-2 pointer-events-none pl-8">
                    <div class="w-12 h-12 bg-black border border-gray-700 rounded overflow-hidden shrink-0 flex items-center justify-center">
                        ${tag.image ? `<img src="${tag.image}" class="w-full h-full object-cover">` : `<i data-lucide="image" class="w-4 h-4 text-gray-400"></i>`}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="text-[9px] text-gray-300 truncate">${tag.type === 'game' ? (tag.game_sex || '') : (tag.fish_water || '')}</div>
                        <div class="text-[8px] text-gray-400 truncate mt-1">Loc: ${tag.gps || 'N/A'}</div>
                    </div>
                    <div class="flex flex-col gap-1 items-end pointer-events-auto">
                        <button onclick="event.stopPropagation(); window.deleteGametag('${tag.id}')" class="text-gray-400 hover:text-red-500 p-1 bg-black rounded" title="Delete">
                            <i data-lucide="trash" class="w-3 h-3"></i>
                        </button>
                    </div>
                </div>
            `;
            
            // Allow clicking the card body to select as well
            card.onclick = (e) => {
                if (e.target.tagName.toLowerCase() !== 'input' && e.target.tagName.toLowerCase() !== 'button') {
                    window.selectGametag(tag.id);
                }
            };
            
            listEl.appendChild(card);
        });
        
        if (window.lucide) window.lucide.createIcons({root: listEl});
        
    } catch(err) {
        console.error("Load Tags failed:", err);
    }
}

window.deleteGametag = async function(id) {
    if(confirm("Delete this tag permanently?")) {
        await window.TRC_IDB.delete('gameTagLibrary', id);
        if(selectedGametagId === id) {
            selectedGametagId = null;
            if(reworkGametagBtn) reworkGametagBtn.classList.add('hidden');
            if(gametagToVaultBtnTop) gametagToVaultBtnTop.classList.add('hidden');
        }
        if(activeGametagId === id) {
            activeGametagId = null;
        }
        renderGametagLibrary();
    }
};

window.selectGametag = async function(tagId) {
    tagId = String(tagId);
    
    if (selectedGametagId === tagId) {
        // Toggle off
        selectedGametagId = null;
        renderGametagLibrary();
        if(reworkGametagBtn) reworkGametagBtn.classList.add('hidden');
        if(gametagToVaultBtnTop) gametagToVaultBtnTop.classList.add('hidden');
        return;
    }

    const tag = await window.TRC_IDB.get('gameTagLibrary', tagId);
    if (!tag) return;
    
    selectedGametagId = tag.id;
    renderGametagLibrary();
    
    if(reworkGametagBtn) reworkGametagBtn.classList.remove('hidden');
    if(gametagToVaultBtnTop) gametagToVaultBtnTop.classList.remove('hidden');
}

window.loadGametagBackToEditor = function(tag) {
    if(!tag) return;
    
    setGameTagType(tag.type || 'game');
    
    document.getElementById('gametag-input-date').value = tag.date || '';
    document.getElementById('gametag-input-gps').value = tag.gps || '';
    document.getElementById('gametag-input-notes').value = tag.notes || '';
    
    document.getElementById('gametag-input-game-species').value = tag.game_species || '';
    document.getElementById('gametag-input-game-sex').value = tag.game_sex || '';
    document.getElementById('gametag-input-game-weapon').value = tag.game_weapon || '';
    document.getElementById('gametag-input-game-license').value = tag.game_license || '';
    document.getElementById('gametag-input-game-points').value = tag.game_points || '';
    document.getElementById('gametag-input-game-spread').value = tag.game_spread || '';
    
    document.getElementById('gametag-input-fish-species').value = tag.fish_species || '';
    document.getElementById('gametag-input-fish-water').value = tag.fish_water || '';
    document.getElementById('gametag-input-fish-length').value = tag.fish_length || '';
    document.getElementById('gametag-input-fish-weight').value = tag.fish_weight || '';
    document.getElementById('gametag-input-fish-bait').value = tag.fish_bait || '';
    
    currentGametagImage = tag.image || null;
    const previewImg = document.getElementById('gametag-form-preview-img');
    const previewIcon = document.getElementById('gametag-form-preview-icon');
    const previewLabel = document.getElementById('gametag-image-label');
    
    if(currentGametagImage) {
        if(previewImg) {
            previewImg.src = currentGametagImage;
            previewImg.classList.remove('hidden');
        }
        if(previewIcon) previewIcon.style.opacity = '0.3';
        if(previewLabel) {
            previewLabel.innerText = 'IMAGE UPLOADED';
            previewLabel.classList.remove('text-gray-400');
            previewLabel.classList.add('text-neon-green');
        }
    } else {
        if(previewImg) {
            previewImg.src = '';
            previewImg.classList.add('hidden');
        }
        if(previewIcon) previewIcon.style.opacity = '1';
        if(previewLabel) {
            previewLabel.innerText = 'TAP TO UPLOAD PHOTO';
            previewLabel.classList.remove('text-neon-green');
            previewLabel.classList.add('text-gray-400');
        }
    }
};

if(reworkGametagBtn) {
    reworkGametagBtn.addEventListener('click', async () => {
        if(!selectedGametagId) return;
        const tag = await window.TRC_IDB.get('gameTagLibrary', selectedGametagId);
        if(!tag) return;
        
        window.loadGametagBackToEditor(tag);
        
        selectedGametagId = null;
        activeGametagId = null;
    });
}

if (gametagToVaultBtnTop) {
    gametagToVaultBtnTop.addEventListener('click', async () => {
        if(!selectedGametagId) {
            alert("Please select a field harvest tag from your inventory list below first.");
            return;
        }
        let tag = await window.TRC_IDB.get('gameTagLibrary', selectedGametagId);
        if(!tag) tag = await window.TRC_IDB.get('gameTagLibrary', String(selectedGametagId));
        if(!tag) tag = await window.TRC_IDB.get('gameTagLibrary', Number(selectedGametagId));
        if(!tag) return;
        
        const originalBtnHtml = gametagToVaultBtnTop.innerHTML;
        gametagToVaultBtnTop.disabled = true;
        gametagToVaultBtnTop.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin inline-block mr-1"></i> SAVING...';
        if (window.lucide) window.lucide.createIcons();
        
        document.getElementById('gametag-render-date').innerText = tag.date || 'YYYY-MM-DD';
        document.getElementById('gametag-render-gps').innerText = tag.gps || 'N/A';
        document.getElementById('gametag-render-notes').innerText = tag.notes || 'No notes provided.';
        
        const stat1Lbl = document.getElementById('gametag-render-stat1-label');
        const stat1Val = document.getElementById('gametag-render-stat1');
        const stat2Lbl = document.getElementById('gametag-render-stat2-label');
        const stat2Val = document.getElementById('gametag-render-stat2');
        const sexLbl = document.getElementById('gametag-render-sex-label');
        const sexVal = document.getElementById('gametag-render-sex');
        const speciesVal = document.getElementById('gametag-render-species');
        const licenseLbl = document.getElementById('gametag-render-license-label');
        const licenseVal = document.getElementById('gametag-render-license');
        
        const borderBg = document.getElementById('gametag-render-border-bg');
        const headerBg = document.getElementById('gametag-render-header-bg');
        const holeBg = document.getElementById('gametag-render-hole-bg');
        const typeLbl = document.getElementById('gametag-render-type-label');
        const contentBg = document.getElementById('gametag-render-content-bg');
        const titleLbl = document.getElementById('gametag-render-title');

        if (tag.type === 'game') {
            // ── HUNTING THEME: Military green ──
            const zone = document.getElementById('gametag-poster-render-zone');
            const headerStrip = document.getElementById('gametag-render-header-strip');
            const titleBar = document.getElementById('gametag-render-title-bar');
            const subtitle = document.getElementById('gametag-render-subtitle');
            const dot = document.getElementById('gametag-render-dot');
            if (zone)        { zone.style.background = '#2d3b24'; zone.style.borderColor = '#1a2314'; }
            if (headerStrip) { headerStrip.style.background = '#1a2314'; headerStrip.style.borderBottomColor = '#4a6030'; }
            if (titleBar)    { titleBar.style.background = '#1e2d18'; titleBar.style.borderBottomColor = '#3a4a2a'; }
            if (subtitle)    { subtitle.color = '#8ab040'; subtitle.innerText = 'FIELD TAG \u2014 WILDLIFE DOCUMENTATION'; }
            if (dot)         { dot.style.background = '#8ab040'; dot.style.boxShadow = '0 0 6px rgba(138,176,64,0.6)'; }
            if (typeLbl)     typeLbl.innerText = 'FIELD HARVEST TAG';
            if (titleLbl)    titleLbl.innerText = 'OFFICIAL HARVEST RECORD';

            speciesVal.innerText = tag.game_species || 'UNKNOWN';
            sexLbl.innerText = 'SEX / CLASS';
            sexVal.innerText = tag.game_sex || 'N/A';
            stat1Lbl.innerText = 'ANTLER POINTS (L/R)';
            stat1Val.innerText = tag.game_points || 'N/A';
            stat2Lbl.innerText = 'INSIDE SPREAD';
            stat2Val.innerText = tag.game_spread || 'N/A';
            licenseLbl.innerText = 'LICENSE / TAG #';
            licenseVal.innerText = tag.game_license || 'N/A';
        } else {
            // ── FISHING THEME: Deep ocean blue/teal ──
            const zone = document.getElementById('gametag-poster-render-zone');
            const headerStrip = document.getElementById('gametag-render-header-strip');
            const titleBar = document.getElementById('gametag-render-title-bar');
            const subtitle = document.getElementById('gametag-render-subtitle');
            const dot = document.getElementById('gametag-render-dot');
            if (zone)        { zone.style.background = '#0c1f2e'; zone.style.borderColor = '#071521'; }
            if (headerStrip) { headerStrip.style.background = '#071521'; headerStrip.style.borderBottomColor = '#0e4d6b'; }
            if (titleBar)    { titleBar.style.background = '#0a1c2a'; titleBar.style.borderBottomColor = '#0e4d6b'; }
            if (subtitle)    { subtitle.color = '#38bdf8'; subtitle.innerText = 'CATCH RECORD \u2014 AQUATIC DOCUMENTATION'; }
            if (dot)         { dot.style.background = '#38bdf8'; dot.style.boxShadow = '0 0 6px rgba(56,189,248,0.7)'; }
            if (typeLbl)     typeLbl.innerText = 'FISHING RECORD TAG';
            if (titleLbl)    titleLbl.innerText = 'OFFICIAL CATCH RECORD';

            speciesVal.innerText = tag.fish_species || 'UNKNOWN';
            sexLbl.innerText = 'WATER BODY';
            sexVal.innerText = tag.fish_water || 'N/A';
            stat1Lbl.innerText = 'LENGTH (IN)';
            stat1Val.innerText = tag.fish_length || 'N/A';
            stat2Lbl.innerText = 'WEIGHT (LBS)';
            stat2Val.innerText = tag.fish_weight || 'N/A';
            licenseLbl.innerText = 'LURE / BAIT';
            licenseVal.innerText = tag.fish_bait || 'N/A';
        }

        const qrImg = document.getElementById('gametag-render-qr');
        if (qrImg) {
            const isGame = tag.type === 'game';
            const tagDate = tag.date
                ? new Date(tag.date).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' })
                : new Date().toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
            
            const qrData = isGame
                ? `TRC FIELD TAG\nDate: ${tagDate}\nSpecies: ${tag.game_species || 'UNKNOWN'}\nSex: ${tag.game_sex || 'N/A'}\nLic/Tag: ${tag.game_license || 'N/A'}`
                : `TRC CATCH REC\nDate: ${tagDate}\nSpecies: ${tag.fish_species || 'UNKNOWN'}\nWater: ${tag.fish_water || 'N/A'}\nLure: ${tag.fish_bait || 'N/A'}`;
            
            try {
                if (window.qrcodegen) {
                    const qr = window.qrcodegen.QrCode.encodeText(qrData, window.qrcodegen.QrCode.Ecc.MEDIUM);
                    qrImg.src = qrToDataURL(qr, 4, '#ffffff', '#000000');
                }
            } catch (err) {
                console.warn("Could not generate Gametag QR", err);
            }
        }

        const renderImg = document.getElementById('gametag-render-img');
        const imgIcon = document.getElementById('gametag-render-img-icon');
        if (tag.image) {
            if (renderImg) {
                renderImg.src = tag.image;
                renderImg.classList.remove('hidden');
            }
            if (imgIcon) imgIcon.classList.add('hidden');
        } else {
            if (renderImg) renderImg.classList.add('hidden');
            if (imgIcon) imgIcon.classList.remove('hidden');
        }
        
        const renderZone = document.getElementById('gametag-poster-render-zone');
        if (!renderZone) return;
        
        const originalParent = renderZone.parentNode;
        const originalNextSibling = renderZone.nextSibling;
        const originalPosition = renderZone.style.position;
        const originalLeft = renderZone.style.left;
        const originalTop = renderZone.style.top;
        const originalZIndex = renderZone.style.zIndex;
        
        try {
            renderZone.style.position = 'fixed';
            renderZone.style.left = '0';
            renderZone.style.top = '0';
            renderZone.style.zIndex = '99999';
            renderZone.style.opacity = '1';
            renderZone.style.pointerEvents = 'none';
            document.body.appendChild(renderZone);
            
            await new Promise(r => setTimeout(r, 200));
            
            if (!window.html2canvas) {
                if (typeof window.ensureHtml2Canvas === 'function') {
                    await window.ensureHtml2Canvas();
                } else if (window.loadScript) {
                    await window.loadScript('html2canvas.min.js');
                }
            }
            
            if (!window.html2canvas) {
                throw new Error('html2canvas library not loaded');
            }

            const html2canvasPromise = window.html2canvas(renderZone, {
                backgroundColor: '#3E4A35',
                scale: 1.5, 
                logging: false,
                useCORS: true,
                allowTaint: true,
                imageTimeout: 8000,
                removeContainer: true,
                onclone: (clonedDoc) => {
                    const clonedZone = clonedDoc.getElementById('gametag-render-zone');
                    if (clonedZone) {
                        clonedZone.style.opacity = '1';
                        clonedZone.style.visibility = 'visible';
                        clonedZone.style.display = 'block';
                    }
                }
            });
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('html2canvas render timed out')), 15000)
            );
            
            const canvas = await Promise.race([html2canvasPromise, timeoutPromise]);
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            canvas.width = 0;
            canvas.height = 0;
            
            if (window.saveIntelSnapshot) {
                // Strip heavy image from gametagData — snapshot already has the visual
                const tagLite = { ...tag };
                delete tagLite.image;
                
                await window.saveIntelSnapshot('HARVEST: ' + speciesVal.innerText, dataUrl, {
                    type: 'gametag-card',
                    isAmmo: false,
                    gametagData: tagLite
                });
                
                if (window.showToast) window.showToast("✅ Field Tag Saved to Intel Vault!");
                
                gametagToVaultBtnTop.innerHTML = '<i data-lucide="check" class="w-4 h-4 inline-block mr-1"></i> SENT TO INTEL VAULT';
                if (window.lucide) window.lucide.createIcons();
                
                setTimeout(() => {
                    gametagToVaultBtnTop.disabled = false;
                    gametagToVaultBtnTop.innerHTML = originalBtnHtml;
                    if (window.lucide) window.lucide.createIcons();
                }, 2000);
            }
        } catch (error) {
            console.error("Tag Capture failed: ", error);
            if (window.showToast) window.showToast('⚠️ Capture failed: ' + error.message);
            else alert("Capture failed: " + error.message);
            gametagToVaultBtnTop.disabled = false;
            gametagToVaultBtnTop.innerHTML = originalBtnHtml;
            if (window.lucide) window.lucide.createIcons();
        } finally {
            if (originalParent) {
                originalParent.insertBefore(renderZone, originalNextSibling);
            }
            renderZone.style.position = originalPosition;
            renderZone.style.left = originalLeft;
            renderZone.style.top = originalTop;
            renderZone.style.zIndex = originalZIndex;
        }
    });
}

window.loadPhotoToGametag = function(imageUri) {
    if (typeof openGameTagModal === 'function') openGameTagModal();
    currentGametagImage = imageUri;
    const previewImg = document.getElementById('gametag-form-preview-img');
    const previewIcon = document.getElementById('gametag-form-preview-icon');
    const previewLabel = document.getElementById('gametag-image-label');
    if(previewImg) {
        previewImg.src = imageUri;
        previewImg.classList.remove('hidden');
    }
    if(previewIcon) previewIcon.style.opacity = '0.3';
    if(previewLabel) previewLabel.innerText = 'CHANGE PHOTO';
    activeGametagId = null;
    renderGametagLibrary();
};
const vaultToGametagBtn = document.getElementById('vault-to-gametag-btn');
if (vaultToGametagBtn) {
    vaultToGametagBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const checkedBoxes = document.querySelectorAll('.vault-export-checkbox:checked');
        if (checkedBoxes.length === 0) {
            if (typeof openGameTagModal === 'function') openGameTagModal();
            return;
        }
        if (checkedBoxes.length > 1) {
            alert('Please select only ONE snapshot to send to Field Tag.');
            return;
        }
        const id = checkedBoxes[0].dataset.vaultId;
        const item = window.vaultCache.find(i => i.id == id);
        if (!item) return;
        
        if (item.type === 'gametag-card' && item.gametagData) {
            if (gameTagModal) {
                gameTagModal.classList.remove('hidden');
                gameTagModal.classList.add('flex');
            }
            if (window.loadGametagBackToEditor) {
                if (!item.gametagData.image) item.gametagData.image = item.image;
                window.loadGametagBackToEditor(item.gametagData);
            }
            const vaultModal = document.getElementById('vault-modal-overlay');
            if (vaultModal) vaultModal.classList.add('hidden');
            const checkedBoxes = document.querySelectorAll('.vault-export-checkbox:checked');
            checkedBoxes.forEach(cb => cb.checked = false);
            return;
        }
        
        if (item.type && item.type !== 'photo') {
            alert('This is not a standard photo. Please select an imported photo or chat image to create a Field Tag.');
            return;
        }
        window.loadPhotoToGametag(item.image);
        
        const panel = document.getElementById('panel-vault');
        if (panel && panel.classList.contains('is-maximized')) {
            if (typeof window.toggleFullscreen === 'function') window.toggleFullscreen('panel-vault');
        }
        if (panel) panel.classList.add('hidden');
    });
}

