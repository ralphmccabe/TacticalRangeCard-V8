// --- HUNTING / FISHING LICENSE & ID LOGIC ---
const licenseModal = document.getElementById('license-modal');
const openLicenseBtns = document.querySelectorAll('#openLicenseBtn, #openLicenseBtnHud');
const licenseImageUpload = document.getElementById('license-image-upload');

const licenseClearBtn = document.getElementById('license-clear-btn');
const licenseSaveInventoryBtn = document.getElementById('license-save-inventory-btn');
const licenseSaveVaultBtn = document.getElementById('license-save-vault-btn');
const reworkLicenseBtn = document.getElementById('rework-license-btn');
const licenseToVaultBtnTop = document.getElementById('license-to-vault-btn-top');

let currentLicenseImage = null;
let activeLicenseId = null;
let selectedLicenseId = null;
let currentLicenseType = 'hunting'; // 'hunting' | 'fishing' | 'both' | 'id'

// ============================================================
// CONFIGURATIONS FOR EACH DOCUMENT TYPE
// ============================================================
const LICENSE_TYPE_CONFIGS = {
    hunting: {
        title: 'HUNTING LICENSE',
        headerIcon: 'shield-check',
        accentColor: '#22c55e',
        activeColors: { bg: '#15803d', text: '#ffffff', border: '#22c55e' },
        photoLabel: 'HUNTING LICENSE / TAG PHOTO',
        nameLabel: 'FULL NAME / HUNTER NAME',
        namePlaceholder: 'John A. Doe',
        numberLabel: 'HUNTING LICENSE / TAG #',
        numberPlaceholder: 'e.g. AZ-HNT-998811',
        expiryLabel: 'EXPIRATION / SEASON END DATE',
        expiryPlaceholder: 'e.g. 2026-12-31',
        stateLabel: 'ISSUING STATE / WILDLIFE DEPT',
        statePlaceholder: 'e.g. Arizona Game & Fish',
        notesLabel: 'NOTES / HUNT UNIT / TAGGED SPECIES',
        notesPlaceholder: 'e.g. Unit 42 Elk, Bull Tag, Archery Only, Tags: 2',
        saveBtnText: 'SAVE HUNTING LICENSE',
        inventoryTitle: 'HUNTING LICENSES',
        renderType: 'HUNTING LICENSE',
        renderNameLbl: 'HUNTER NAME',
        renderNumLbl: 'HUNTING LIC / TAG #',
        renderNotesLbl: 'NOTES / SPECIES / HUNT UNITS',
        renderNotice: 'CARRY THIS LICENSE WHILE IN THE FIELD<br>SUBJECT TO INSPECTION BY AUTHORITIES',
        posterBg: '#0d1a0d',
        posterBorder: '#22c55e'
    },
    fishing: {
        title: 'FISHING LICENSE / PERMIT',
        headerIcon: 'anchor',
        accentColor: '#3b82f6',
        activeColors: { bg: '#1d4ed8', text: '#ffffff', border: '#3b82f6' },
        photoLabel: 'FISHING LICENSE / PERMIT PHOTO',
        nameLabel: 'FULL NAME / ANGLER NAME',
        namePlaceholder: 'John A. Doe',
        numberLabel: 'FISHING LICENSE / PERMIT #',
        numberPlaceholder: 'e.g. AZ-FSH-448201',
        expiryLabel: 'EXPIRATION DATE',
        expiryPlaceholder: 'e.g. 2026-12-31',
        stateLabel: 'ISSUING STATE / WILDLIFE AGENCY',
        statePlaceholder: 'e.g. Arizona Game & Fish / DWR',
        notesLabel: 'NOTES / ENDORSEMENTS / WATER BODY',
        notesPlaceholder: 'e.g. Trout Stamp, 2-Pole Permit, Lake Pleasant',
        saveBtnText: 'SAVE FISHING LICENSE',
        inventoryTitle: 'FISHING LICENSES',
        renderType: 'FISHING LICENSE',
        renderNameLbl: 'ANGLER NAME',
        renderNumLbl: 'FISHING PERMIT #',
        renderNotesLbl: 'WATERS / STAMPS / ENDORSEMENTS',
        renderNotice: 'CARRY THIS PERMIT WHILE ANGLING<br>SUBJECT TO INSPECTION BY AUTHORITIES',
        posterBg: '#071a2e',
        posterBorder: '#3b82f6'
    },
    both: {
        title: 'COMBINED HUNT & FISH LICENSE',
        headerIcon: 'shield-check',
        accentColor: '#f59e0b',
        activeColors: { bg: '#d97706', text: '#ffffff', border: '#fbbf24' },
        photoLabel: 'COMBO LICENSE / PERMIT PHOTO',
        nameLabel: 'FULL NAME / LICENSEE',
        namePlaceholder: 'John A. Doe',
        numberLabel: 'COMBO LICENSE #',
        numberPlaceholder: 'e.g. AZ-CMB-883920',
        expiryLabel: 'EXPIRATION DATE',
        expiryPlaceholder: 'e.g. 2026-12-31',
        stateLabel: 'ISSUING STATE / AUTHORITY',
        statePlaceholder: 'e.g. Arizona Game & Fish',
        notesLabel: 'NOTES / UNITS / SPECIES / STAMPS',
        notesPlaceholder: 'e.g. Elk Tag & Trout Stamp, Units 42/43',
        saveBtnText: 'SAVE COMBO LICENSE',
        inventoryTitle: 'COMBO LICENSES',
        renderType: 'HUNT & FISH LICENSE',
        renderNameLbl: 'LICENSEE NAME',
        renderNumLbl: 'COMBO LICENSE #',
        renderNotesLbl: 'TAGS / STAMPS / ZONES',
        renderNotice: 'CARRY THIS LICENSE WHILE IN THE FIELD<br>SUBJECT TO INSPECTION BY AUTHORITIES',
        posterBg: '#261905',
        posterBorder: '#f59e0b'
    },
    id: {
        title: 'IDENTIFICATION DOCUMENT / ID',
        headerIcon: 'id-card',
        accentColor: '#06b6d4',
        activeColors: { bg: '#0891b2', text: '#ffffff', border: '#06b6d4' },
        photoLabel: 'ID / DRIVER\'S LICENSE PHOTO',
        nameLabel: 'LEGAL FULL NAME',
        namePlaceholder: 'John A. Doe',
        numberLabel: 'ID / DRIVER\'S LICENSE #',
        numberPlaceholder: 'e.g. DL-12345678 or ID-998822',
        expiryLabel: 'EXPIRATION DATE',
        expiryPlaceholder: 'e.g. 2028-06-15',
        stateLabel: 'ISSUING STATE / JURISDICTION / AGENCY',
        statePlaceholder: 'e.g. State DMV / Dept of State',
        notesLabel: 'NOTES / ENDORSEMENTS / RESTRICTIONS / CLASS',
        notesPlaceholder: 'e.g. Class D, Corrective Lenses, Organ Donor',
        saveBtnText: 'SAVE ID DOCUMENT',
        inventoryTitle: 'IDENTIFICATION DOCUMENTS',
        renderType: 'IDENTIFICATION DOCUMENT',
        renderNameLbl: 'LEGAL FULL NAME',
        renderNumLbl: 'ID / DOCUMENT #',
        renderNotesLbl: 'ENDORSEMENTS / RESTRICTIONS / CLASS',
        renderNotice: 'OFFICIAL IDENTIFICATION DOCUMENT<br>TRC SECURE INTEL SYSTEM',
        posterBg: '#0b1329',
        posterBorder: '#06b6d4'
    }
};

// ============================================================
// OPEN / CLOSE
// ============================================================
window.closeLicenseModal = function() {
    if (licenseModal) {
        licenseModal.classList.add('hidden');
        licenseModal.classList.remove('flex');
    }
};

window.openLicenseModal = function() {
    if (!licenseModal) return;
    licenseModal.classList.remove('hidden');
    licenseModal.classList.add('flex');
    clearLicenseForm();
    renderLicenseLibrary();
};

openLicenseBtns.forEach(btn => {
    btn.addEventListener('click', window.openLicenseModal);
});

// ============================================================
// DYNAMIC TYPE SELECTOR (HUNTING / FISHING / BOTH / ID)
// ============================================================
window.setLicenseType = function(type) {
    currentLicenseType = type;
    const cfg = LICENSE_TYPE_CONFIGS[type] || LICENSE_TYPE_CONFIGS.hunting;
    const types = ['hunting', 'fishing', 'both', 'id'];

    // 1. Selector Buttons Appearance
    types.forEach(t => {
        const btn = document.getElementById(`license-type-${t}`);
        if (!btn) return;
        
        btn.className = 'flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded border transition-all';
        
        if (t === type) {
            btn.style.backgroundColor = cfg.activeColors.bg;
            btn.style.color = cfg.activeColors.text;
            btn.style.borderColor = cfg.activeColors.border;
            btn.style.boxShadow = `0 0 12px ${cfg.accentColor}55`;
        } else {
            btn.style.backgroundColor = 'transparent';
            btn.style.color = '#6b7280'; // gray-500
            btn.style.borderColor = 'transparent';
            btn.style.boxShadow = 'none';
        }
        
        btn.onmouseenter = () => { if (currentLicenseType !== t) btn.style.color = 'white'; };
        btn.onmouseleave = () => { if (currentLicenseType !== t) btn.style.color = '#6b7280'; };
    });

    // 2. Modal Frame & Header Accent Tinting
    const modalBox = document.getElementById('license-modal-box');
    const modalHeader = document.getElementById('license-modal-header');
    const modalTitle = document.getElementById('license-modal-title');
    const modalIcon = document.getElementById('license-modal-icon');

    if (modalBox) {
        modalBox.style.borderColor = cfg.accentColor;
        modalBox.style.boxShadow = `0 0 35px ${cfg.accentColor}44`;
    }
    if (modalHeader) {
        modalHeader.style.borderColor = cfg.accentColor;
    }
    if (modalTitle) {
        modalTitle.innerText = cfg.title;
    }
    if (modalIcon) {
        modalIcon.setAttribute('data-lucide', cfg.headerIcon);
        modalIcon.style.color = cfg.accentColor;
    }

    // 3. Dynamic Form Field Labels & Placeholders
    const setLbl = (id, text) => { const el = document.getElementById(id); if (el) el.innerText = text; };
    const setPlh = (id, plh) => { const el = document.getElementById(id); if (el) el.placeholder = plh; };

    setLbl('license-label-photo', cfg.photoLabel);
    setLbl('license-label-name', cfg.nameLabel);
    setLbl('license-label-number', cfg.numberLabel);
    setLbl('license-label-expiry', cfg.expiryLabel);
    setLbl('license-label-state', cfg.stateLabel);
    setLbl('license-label-notes', cfg.notesLabel);

    setPlh('license-input-name', cfg.namePlaceholder);
    setPlh('license-input-number', cfg.numberPlaceholder);
    setPlh('license-input-expiry', cfg.expiryPlaceholder);
    setPlh('license-input-state', cfg.statePlaceholder);
    setPlh('license-input-notes', cfg.notesPlaceholder);

    // 4. Dynamic Save Button
    const saveBtnText = document.getElementById('license-save-btn-text');
    if (saveBtnText) saveBtnText.innerText = cfg.saveBtnText;
    if (licenseSaveInventoryBtn) {
        licenseSaveInventoryBtn.style.backgroundColor = cfg.activeColors.bg;
        licenseSaveInventoryBtn.style.boxShadow = `0 0 15px ${cfg.accentColor}55`;
    }

    // 5. Dynamic Inventory Drawer Title
    const invTitle = document.getElementById('license-inventory-title');
    if (invTitle) {
        invTitle.innerHTML = `<i data-lucide="archive" class="w-4 h-4" style="color: ${cfg.accentColor};"></i> ${cfg.inventoryTitle}`;
    }

    // 6. Dynamic Poster Preview Zone
    const typeEl = document.getElementById('license-render-type');
    if (typeEl) typeEl.innerText = cfg.renderType;
    setLbl('license-render-lbl-name', cfg.renderNameLbl);
    setLbl('license-render-lbl-number', cfg.renderNumLbl);
    setLbl('license-render-lbl-notes', cfg.renderNotesLbl);
    const noticeEl = document.getElementById('license-render-footer-notice');
    if (noticeEl) noticeEl.innerHTML = cfg.renderNotice;

    const renderZone = document.getElementById('license-poster-render-zone');
    if (renderZone) {
        renderZone.style.backgroundColor = cfg.posterBg;
    }

    if (window.lucide) window.lucide.createIcons();
};

// ============================================================
// CLEAR FORM
// ============================================================
function clearLicenseForm() {
    currentLicenseImage = null;
    activeLicenseId = null;
    selectedLicenseId = null;
    if (licenseImageUpload) licenseImageUpload.value = '';

    const previewImg   = document.getElementById('license-form-preview-img');
    const previewIcon  = document.getElementById('license-form-preview-icon');
    const previewLabel = document.getElementById('license-image-label');
    if (previewImg)   { previewImg.src = ''; previewImg.classList.add('hidden'); }
    if (previewIcon)  previewIcon.style.opacity = '1';
    if (previewLabel) previewLabel.innerText = 'TAP TO UPLOAD PHOTO';

    ['license-input-name', 'license-input-number', 'license-input-expiry',
     'license-input-state', 'license-input-notes'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    // Default expiry to end of current year
    const expiryEl = document.getElementById('license-input-expiry');
    if (expiryEl) expiryEl.value = new Date().getFullYear() + '-12-31';

    if (reworkLicenseBtn)    reworkLicenseBtn.classList.add('hidden');
    if (licenseToVaultBtnTop) licenseToVaultBtnTop.classList.add('hidden');

    window.setLicenseType(currentLicenseType || 'hunting');
    renderLicenseLibrary();
}

if (licenseClearBtn) {
    licenseClearBtn.addEventListener('click', clearLicenseForm);
}

// ============================================================
// IMAGE UPLOAD
// ============================================================
if (licenseImageUpload) {
    licenseImageUpload.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const optimized = window.compressAndResizeImage 
                ? await window.compressAndResizeImage(file, 800, 0.8) 
                : await new Promise(r => { const fr = new FileReader(); fr.onload = ev => r(ev.target.result); fr.readAsDataURL(file); });
            currentLicenseImage = optimized;
            const previewImg   = document.getElementById('license-form-preview-img');
            const previewIcon  = document.getElementById('license-form-preview-icon');
            const previewLabel = document.getElementById('license-image-label');
            if (previewImg)   { previewImg.src = currentLicenseImage; previewImg.classList.remove('hidden'); }
            if (previewIcon)  previewIcon.style.opacity = '0.3';
            if (previewLabel) previewLabel.innerText = 'CHANGE PHOTO';
        } catch(err) {
            console.error("License image process error:", err);
        }
    });
}

// ============================================================
// EXPORT POSTER TO INTEL VAULT
// ============================================================
window.exportLicenseToVault = async function(lic, triggerBtn = null) {
    if (!lic) return null;
    const cfg = LICENSE_TYPE_CONFIGS[lic.type] || LICENSE_TYPE_CONFIGS.hunting;
    const el = (id) => document.getElementById(id);

    let originalHtml = '';
    if (triggerBtn) {
        originalHtml = triggerBtn.innerHTML;
        triggerBtn.disabled = true;
        triggerBtn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin inline-block mr-1"></i> SAVING...';
        if (window.lucide) window.lucide.createIcons();
    }

    // Populate render zone
    if (el('license-render-type'))   el('license-render-type').innerText   = cfg.renderType;
    if (el('license-render-name'))   el('license-render-name').innerText   = lic.name   || 'UNKNOWN';
    if (el('license-render-number')) el('license-render-number').innerText = lic.number || 'N/A';
    if (el('license-render-expiry')) el('license-render-expiry').innerText = lic.expiry || 'N/A';
    if (el('license-render-state'))  el('license-render-state').innerText  = lic.state  || 'N/A';
    if (el('license-render-notes'))  el('license-render-notes').innerText  = lic.notes  || '—';

    if (el('license-render-lbl-name')) el('license-render-lbl-name').innerText = cfg.renderNameLbl;
    if (el('license-render-lbl-number')) el('license-render-lbl-number').innerText = cfg.renderNumLbl;
    if (el('license-render-lbl-notes')) el('license-render-lbl-notes').innerText = cfg.renderNotesLbl;
    if (el('license-render-footer-notice')) el('license-render-footer-notice').innerHTML = cfg.renderNotice;

    const renderPhoto   = el('license-render-photo');
    const renderNoPhoto = el('license-render-nophoto');
    if (lic.image) {
        if (renderPhoto)   { renderPhoto.src = lic.image; renderPhoto.style.display = 'block'; }
        if (renderNoPhoto) renderNoPhoto.style.display = 'none';
    } else {
        if (renderPhoto)   renderPhoto.style.display = 'none';
        if (renderNoPhoto) renderNoPhoto.style.display = 'block';
    }

    const renderZone = el('license-poster-render-zone');
    if (!renderZone) {
        if (triggerBtn) { triggerBtn.disabled = false; triggerBtn.innerHTML = originalHtml; }
        return null;
    }
    renderZone.style.backgroundColor = cfg.posterBg;

    const originalParent      = renderZone.parentNode;
    const originalNextSibling = renderZone.nextSibling;
    document.body.appendChild(renderZone);
    renderZone.style.position = 'fixed';
    renderZone.style.left = '0';
    renderZone.style.top  = '0';
    renderZone.style.zIndex = '99999';
    renderZone.style.opacity = '1';
    renderZone.style.pointerEvents = 'none';

    try {
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

        await new Promise(r => setTimeout(r, 400));
        
        const html2canvasPromise = window.html2canvas(renderZone, {
            backgroundColor: cfg.posterBg,
            scale:   1.5,
            logging: false,
            useCORS: true,
            allowTaint: true,
            foreignObjectRendering: false,
            imageTimeout: 15000,
            removeContainer: true,
            onclone: (clonedDoc) => {
                const clonedZone = clonedDoc.getElementById('license-poster-render-zone');
                if (clonedZone) {
                    clonedZone.style.opacity = '1';
                    clonedZone.style.visibility = 'visible';
                    clonedZone.style.display = 'block';
                }
            }
        });
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('html2canvas render timed out')), 30000)
        );
        
        const canvas = await Promise.race([html2canvasPromise, timeoutPromise]);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        canvas.width = 0;
        canvas.height = 0;

        if (window.saveIntelSnapshot) {
            // Strip heavy image from licenseData — snapshot already contains visual
            const licLite = { ...lic };
            delete licLite.image;
            
            await window.saveIntelSnapshot(
                cfg.renderType + ': ' + (lic.name || 'UNKNOWN'),
                dataUrl,
                { type: 'license-card', isAmmo: false, licenseData: licLite }
            );
            
            if (triggerBtn) {
                triggerBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4 inline-block mr-1"></i> SENT TO INTEL VAULT';
                if (window.lucide) window.lucide.createIcons();
                setTimeout(() => {
                    triggerBtn.disabled = false;
                    triggerBtn.innerHTML = originalHtml;
                    if (window.lucide) window.lucide.createIcons();
                }, 2000);
            }
            
            if (window.showToast) window.showToast(`✅ ${cfg.renderType} Saved to Intel Vault!`);
            else if (window.pushTacLog) window.pushTacLog(`${cfg.renderType} SENT TO INTEL VAULT`, 'SUCCESS');
        }
        return dataUrl;
    } catch(err) {
        console.error('License capture failed:', err);
        if (window.showToast) window.showToast('⚠️ Capture failed: ' + err.message);
        else alert('Capture failed: ' + err.message);
        if (triggerBtn) {
            triggerBtn.disabled  = false;
            triggerBtn.innerHTML = originalHtml;
            if (window.lucide) window.lucide.createIcons();
        }
        return null;
    } finally {
        if (originalParent) originalParent.insertBefore(renderZone, originalNextSibling);
        renderZone.style.position = 'fixed';
        renderZone.style.top      = '-9999px';
        renderZone.style.zIndex   = '-9999';
    }
};

// ============================================================
// SAVE BUTTON 1: INVENTORY ONLY
// ============================================================
if (licenseSaveInventoryBtn) {
    licenseSaveInventoryBtn.addEventListener('click', async () => {
        if (!window.TRC_IDB) { alert('Database not ready.'); return; }

        const name   = (document.getElementById('license-input-name').value || '').trim();
        const number = (document.getElementById('license-input-number').value || '').trim();
        const expiry = (document.getElementById('license-input-expiry').value || '').trim();
        const state  = (document.getElementById('license-input-state').value || '').trim();
        const notes  = (document.getElementById('license-input-notes').value || '').trim();

        if (!name && !number && !currentLicenseImage && !notes && !state) {
            alert('Please fill out at least a Name, Number, or upload a photo.');
            return;
        }

        const data = {
            id:        activeLicenseId || Date.now().toString(),
            type:      currentLicenseType,
            timestamp: Date.now(),
            image:     currentLicenseImage,
            name:      name || 'UNKNOWN',
            number:    number,
            expiry:    expiry,
            state:     state,
            notes:     notes
        };

        try {
            await window.TRC_IDB.set('licenseLibrary', data.id, data);
            if (window.showToast) window.showToast('Card Saved to Inventory');
            clearLicenseForm();
            renderLicenseLibrary();
        } catch(err) {
            console.error('Save License failed:', err);
            alert('Database error: Could not save License.');
        }
    });
}

// ============================================================
// SAVE BUTTON 2: ONE-CLICK SAVE & SEND TO INTEL VAULT
// ============================================================
if (licenseSaveVaultBtn) {
    licenseSaveVaultBtn.addEventListener('click', async () => {
        if (!window.TRC_IDB) { alert('Database not ready.'); return; }

        const name   = (document.getElementById('license-input-name').value || '').trim();
        const number = (document.getElementById('license-input-number').value || '').trim();
        const expiry = (document.getElementById('license-input-expiry').value || '').trim();
        const state  = (document.getElementById('license-input-state').value || '').trim();
        const notes  = (document.getElementById('license-input-notes').value || '').trim();

        if (!name && !number && !currentLicenseImage && !notes && !state) {
            alert('Please fill out at least a Name, Number, or upload a photo.');
            return;
        }

        const data = {
            id:        activeLicenseId || Date.now().toString(),
            type:      currentLicenseType,
            timestamp: Date.now(),
            image:     currentLicenseImage,
            name:      name || 'UNKNOWN',
            number:    number,
            expiry:    expiry,
            state:     state,
            notes:     notes
        };

        try {
            await window.TRC_IDB.set('licenseLibrary', data.id, data);
            await window.exportLicenseToVault(data, licenseSaveVaultBtn);
            clearLicenseForm();
            renderLicenseLibrary();
        } catch(err) {
            console.error('Save & Vault failed:', err);
            alert('Database error: Could not save card to Vault.');
        }
    });
}

// ============================================================
// RENDER LIBRARY (DRAWER)
// ============================================================
async function renderLicenseLibrary() {
    const listEl = document.getElementById('licenseLibraryList');
    if (!listEl || !window.TRC_IDB) return;

    try {
        const licObj = await window.TRC_IDB.getAll('licenseLibrary');
        const all    = Object.values(licObj || {});
        listEl.innerHTML = '';

        if (all.length === 0) {
            listEl.innerHTML = '<div class="text-center text-gray-400 text-xs py-10 font-bold tracking-widest border border-dashed border-gray-800 rounded-lg">INVENTORY EMPTY</div>';
            return;
        }

        all.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

        const typeText  = { hunting: 'HUNTING', fishing: 'FISHING', both: 'HUNT+FISH', id: 'ID' };
        const typeColor = { hunting: 'text-green-400', fishing: 'text-blue-400', both: 'text-amber-400', id: 'text-cyan-400' };
        const typeBorder = { hunting: 'border-green-700', fishing: 'border-blue-700', both: 'border-amber-700', id: 'border-cyan-700' };

        all.forEach(lic => {
            const isActive   = selectedLicenseId === lic.id;
            const tColor  = typeColor[lic.type]  || 'text-green-400';
            const tBorder = typeBorder[lic.type] || 'border-green-700';

            const card = document.createElement('div');
            card.className = `relative p-3 rounded-lg border-2 cursor-pointer transition-all ${isActive
                ? 'bg-green-900/30 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                : 'bg-gray-900/50 border-gray-800 hover:border-gray-600'}`;

            card.innerHTML = `
                <div class="absolute top-2 left-2 z-30 bg-black/60 p-1 rounded pointer-events-auto">
                    <input type="checkbox" aria-label="Select License" class="w-4 h-4 cursor-pointer accent-green-500"
                           ${isActive ? 'checked' : ''} onclick="event.stopPropagation(); window.selectLicense('${lic.id}')">
                </div>
                <div class="pl-8 flex items-center justify-between mb-2 pointer-events-none">
                    <div class="font-black ${tColor} text-[10px] uppercase tracking-widest truncate max-w-[130px]">${lic.name || 'NO NAME'}</div>
                    <span class="text-[8px] font-bold ${tColor} border ${tBorder} px-1.5 py-0.5 rounded bg-black/40">${typeText[lic.type] || 'LIC'}</span>
                </div>
                <div class="pl-8 flex gap-2 pointer-events-none">
                    <div class="w-12 h-12 bg-black border border-gray-700 rounded overflow-hidden shrink-0 flex items-center justify-center">
                        ${lic.image
                            ? `<img src="${lic.image}" class="w-full h-full object-cover">`
                            : `<i data-lucide="${lic.type === 'id' ? 'id-card' : (lic.type === 'fishing' ? 'anchor' : 'shield-check')}" class="w-4 h-4 text-gray-400"></i>`}
                    </div>
                    <div class="flex-1 min-w-0 flex flex-col justify-center">
                        <div class="text-[9px] text-gray-300 truncate font-bold font-mono">${lic.number || 'No # on file'}</div>
                        <div class="text-[8px] text-gray-400 truncate">Exp: ${lic.expiry || 'N/A'}</div>
                        <div class="text-[8px] text-gray-400 truncate">${lic.state || ''}</div>
                    </div>
                    <div class="flex flex-col gap-1 items-end pointer-events-auto shrink-0 justify-center">
                        <div class="flex gap-1">
                            <button onclick="event.stopPropagation(); window.sendLicenseToVaultById('${lic.id}')"
                                class="text-purple-400 hover:text-purple-300 p-1 bg-black/80 hover:bg-purple-950/80 rounded transition" title="Send to Intel Vault">
                                <i data-lucide="archive" class="w-3.5 h-3.5"></i>
                            </button>
                            <button onclick="event.stopPropagation(); window.loadLicenseBackToEditorById('${lic.id}')"
                                class="text-blue-400 hover:text-blue-300 p-1 bg-black/80 hover:bg-blue-950/80 rounded transition" title="Edit / Rework">
                                <i data-lucide="wrench" class="w-3.5 h-3.5"></i>
                            </button>
                            <button onclick="event.stopPropagation(); window.deleteLicense('${lic.id}')"
                                class="text-gray-400 hover:text-red-500 p-1 bg-black/80 hover:bg-red-950/80 rounded transition" title="Delete">
                                <i data-lucide="trash" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;

            card.onclick = (e) => {
                if (e.target.tagName.toLowerCase() !== 'input' && e.target.tagName.toLowerCase() !== 'button') {
                    window.selectLicense(lic.id);
                }
            };
            listEl.appendChild(card);
        });

        if (window.lucide) window.lucide.createIcons({ root: listEl });
    } catch(err) {
        console.error('Render license library failed:', err);
    }
}

// ============================================================
// SELECT / DELETE
// ============================================================
window.selectLicense = async function(licId) {
    licId = String(licId);
    if (selectedLicenseId === licId) {
        selectedLicenseId = null;
        renderLicenseLibrary();
        if (reworkLicenseBtn)    reworkLicenseBtn.classList.add('hidden');
        if (licenseToVaultBtnTop) licenseToVaultBtnTop.classList.add('hidden');
        return;
    }
    const lic = await window.TRC_IDB.get('licenseLibrary', licId);
    if (!lic) return;
    selectedLicenseId = lic.id;
    renderLicenseLibrary();
    if (reworkLicenseBtn)    reworkLicenseBtn.classList.remove('hidden');
    if (licenseToVaultBtnTop) licenseToVaultBtnTop.classList.remove('hidden');
};

window.deleteLicense = async function(id) {
    if (confirm('Delete this card permanently?')) {
        await window.TRC_IDB.delete('licenseLibrary', id);
        if (selectedLicenseId === id) {
            selectedLicenseId = null;
            if (reworkLicenseBtn)    reworkLicenseBtn.classList.add('hidden');
            if (licenseToVaultBtnTop) licenseToVaultBtnTop.classList.add('hidden');
        }
        if (activeLicenseId === id) {
            activeLicenseId = null;
        }
        renderLicenseLibrary();
    }
};

// ============================================================
// LOAD BACK TO EDITOR (from Vault or Rework)
// ============================================================
window.loadLicenseBackToEditor = function(lic) {
    if (!lic) return;

    activeLicenseId = lic.id || null;
    window.setLicenseType(lic.type || 'hunting');
    
    document.getElementById('license-input-name').value   = lic.name   || '';
    document.getElementById('license-input-number').value = lic.number || '';
    document.getElementById('license-input-expiry').value = lic.expiry || '';
    document.getElementById('license-input-state').value  = lic.state  || '';
    document.getElementById('license-input-notes').value  = lic.notes  || '';

    currentLicenseImage = lic.image || null;
    const previewImg   = document.getElementById('license-form-preview-img');
    const previewIcon  = document.getElementById('license-form-preview-icon');
    const previewLabel = document.getElementById('license-image-label');

    if (lic.image) {
        if (previewImg)   { previewImg.src = lic.image; previewImg.classList.remove('hidden'); }
        if (previewIcon)  previewIcon.style.opacity = '0.3';
        if (previewLabel) { previewLabel.innerText = 'CHANGE PHOTO'; }
    } else {
        if (previewImg)   { previewImg.src = ''; previewImg.classList.add('hidden'); }
        if (previewIcon)  previewIcon.style.opacity = '1';
        if (previewLabel) previewLabel.innerText = 'TAP TO UPLOAD PHOTO';
    }

    if (licenseModal) {
        licenseModal.classList.remove('hidden');
        licenseModal.classList.add('flex');
    }
    const vaultPanel = document.getElementById('panel-vault');
    if (vaultPanel) {
        if (vaultPanel.classList.contains('is-maximized') && window.toggleFullscreen) window.toggleFullscreen('panel-vault');
        vaultPanel.classList.add('hidden');
    }
    if (window.pushTacLog) window.pushTacLog(`CARD LOADED: ${lic.name || 'UNKNOWN'}`, 'INFO');
};

window.loadLicenseBackToEditorById = async function(licId) {
    licId = String(licId);
    let lic = await window.TRC_IDB.get('licenseLibrary', licId);
    if (!lic) lic = await window.TRC_IDB.get('licenseLibrary', Number(licId));
    if (lic) {
        window.loadLicenseBackToEditor(lic);
        selectedLicenseId = lic.id;
        renderLicenseLibrary();
    }
};

window.sendLicenseToVaultById = async function(licId) {
    licId = String(licId);
    let lic = await window.TRC_IDB.get('licenseLibrary', licId);
    if (!lic) lic = await window.TRC_IDB.get('licenseLibrary', Number(licId));
    if (lic) {
        if (window.showToast) window.showToast("⚡ Sending card to Intel Vault...");
        await window.exportLicenseToVault(lic);
    }
};

// ============================================================
// GLOBAL REWORK WRAPPERS (Invoked by Intel Vault buttons)
// ============================================================
window.reworkLicense = async function(id) {
    id = String(id);
    let lic = null;
    if (window.vaultCache && Array.isArray(window.vaultCache)) {
        const vItem = window.vaultCache.find(x => String(x.id) === id);
        if (vItem) lic = vItem.licenseData || vItem;
    }
    if (!lic && window.TRC_IDB) {
        lic = await window.TRC_IDB.get('licenseLibrary', id);
        if (!lic) {
            const v = await window.TRC_IDB.get('intelVault', id);
            if (v) lic = v.licenseData || v;
        }
    }
    if (lic) {
        window.loadLicenseBackToEditor(lic);
        if (window.showToast) window.showToast('Card loaded into editor.');
    } else {
        alert('Could not find card data to rework.');
    }
};

window.reworkGameTag = async function(id) {
    id = String(id);
    let tag = null;
    if (window.vaultCache && Array.isArray(window.vaultCache)) {
        const vItem = window.vaultCache.find(x => String(x.id) === id);
        if (vItem) tag = vItem.gametagData || vItem;
    }
    if (!tag && window.TRC_IDB) {
        tag = await window.TRC_IDB.get('gameTagLibrary', id);
        if (!tag) {
            const v = await window.TRC_IDB.get('intelVault', id);
            if (v) tag = v.gametagData || v;
        }
    }
    if (tag && window.loadGametagBackToEditor) {
        window.loadGametagBackToEditor(tag);
        if (window.showToast) window.showToast('Field Harvest Tag loaded into editor.');
    } else {
        alert('Could not find harvest tag data to rework.');
    }
};

window.reworkBolo = async function(id) {
    id = String(id);
    let bolo = null;
    if (window.vaultCache && Array.isArray(window.vaultCache)) {
        const vItem = window.vaultCache.find(x => String(x.id) === id);
        if (vItem) bolo = vItem.boloData || vItem;
    }
    if (!bolo && window.TRC_IDB) {
        bolo = await window.TRC_IDB.get('boloLibrary', id);
        if (!bolo) {
            const v = await window.TRC_IDB.get('intelVault', id);
            if (v) bolo = v.boloData || v;
        }
    }
    if (bolo && window.loadBoloBackToEditor) {
        window.loadBoloBackToEditor(bolo);
        if (window.showToast) window.showToast('BOLO Alert loaded into editor.');
    } else {
        alert('Could not find BOLO alert data to rework.');
    }
};

// ============================================================
// TOP REWORK BUTTON (Selected inventory card)
// ============================================================
if (reworkLicenseBtn) {
    reworkLicenseBtn.addEventListener('click', async () => {
        if (!selectedLicenseId) return;
        const lic = await window.TRC_IDB.get('licenseLibrary', selectedLicenseId);
        if (!lic) return;
        window.loadLicenseBackToEditor(lic);
        selectedLicenseId = null;
        activeLicenseId = null;
        renderLicenseLibrary();
        if (window.showToast) window.showToast('Card loaded for rework.');
    });
}

// ============================================================
// TOP INTEL VAULT EXPORT BUTTON (Selected inventory card)
// ============================================================
if (licenseToVaultBtnTop) {
    licenseToVaultBtnTop.addEventListener('click', async () => {
        if (!selectedLicenseId) {
            alert("Please select a card from the inventory list below first.");
            return;
        }
        let lic = await window.TRC_IDB.get('licenseLibrary', selectedLicenseId);
        if (!lic) lic = await window.TRC_IDB.get('licenseLibrary', String(selectedLicenseId));
        if (!lic) lic = await window.TRC_IDB.get('licenseLibrary', Number(selectedLicenseId));
        if (!lic) return;

        await window.exportLicenseToVault(lic, licenseToVaultBtnTop);
    });
}

// ============================================================
// VAULT → EDITOR (back button in vault header)
// ============================================================
const vaultToLicenseBtn = document.getElementById('vault-to-license-btn');
if (vaultToLicenseBtn) {
    vaultToLicenseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const checkedBoxes = document.querySelectorAll('.vault-export-checkbox:checked');

        if (checkedBoxes.length === 0) {
            window.openLicenseModal();
            return;
        }
        if (checkedBoxes.length > 1) {
            alert('Please select only ONE snapshot to send to the License editor.');
            return;
        }

        const id   = checkedBoxes[0].dataset.vaultId;
        const item = window.vaultCache && window.vaultCache.find(i => String(i.id) === String(id));
        if (!item) return;

        if (item.type === 'license-card' && item.licenseData) {
            if (!item.licenseData.image) item.licenseData.image = item.image;
            window.loadLicenseBackToEditor(item.licenseData);
            return;
        }

        if (!item.type || item.type === 'photo') {
            window.openLicenseModal();
            currentLicenseImage = item.image;
            const previewImg   = document.getElementById('license-form-preview-img');
            const previewIcon  = document.getElementById('license-form-preview-icon');
            const previewLabel = document.getElementById('license-image-label');
            if (previewImg)   { previewImg.src = item.image; previewImg.classList.remove('hidden'); }
            if (previewIcon)  previewIcon.style.opacity = '0.3';
            if (previewLabel) previewLabel.innerText = 'CHANGE PHOTO';
            return;
        }

        alert('Select a License/ID card or photo snapshot to load into the editor.');
    });
}
