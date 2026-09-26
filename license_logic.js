// --- HUNTING / FISHING LICENSE & ID LOGIC ---
const licenseModal = document.getElementById('license-modal');
const openLicenseBtns = document.querySelectorAll('#openLicenseBtn, #openLicenseBtnHud');
const licenseImageUpload = document.getElementById('license-image-upload');

const licenseClearBtn = document.getElementById('license-clear-btn');
const licenseSaveInventoryBtn = document.getElementById('license-save-inventory-btn');
const reworkLicenseBtn = document.getElementById('rework-license-btn');
const licenseToVaultBtnTop = document.getElementById('license-to-vault-btn-top');

let currentLicenseImage = null;
let activeLicenseId = null;
let selectedLicenseId = null;
let currentLicenseType = 'hunting'; // 'hunting' | 'fishing' | 'both' | 'id'

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
// TYPE SELECTOR
// ============================================================
window.setLicenseType = function(type) {
    currentLicenseType = type;
    const types = ['hunting', 'fishing', 'both', 'id'];
    const activeColors = {
        hunting: { bg: '#15803d', text: 'white', border: '#22c55e' }, // green
        fishing: { bg: '#1d4ed8', text: 'white', border: '#3b82f6' }, // blue
        both:    { bg: '#d97706', text: 'white', border: '#fbbf24' }, // amber
        id:      { bg: '#4b5563', text: 'white', border: '#9ca3af' }  // gray
    };

    types.forEach(t => {
        const btn = document.getElementById(`license-type-${t}`);
        if (!btn) return;
        
        btn.className = 'flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded border transition-all';
        
        if (t === type) {
            btn.style.backgroundColor = activeColors[type].bg;
            btn.style.color = activeColors[type].text;
            btn.style.borderColor = activeColors[type].border;
            btn.style.boxShadow = '0 0 10px rgba(255,255,255,0.1)';
        } else {
            btn.style.backgroundColor = 'transparent';
            btn.style.color = '#6b7280'; // gray-500
            btn.style.borderColor = 'transparent';
            btn.style.boxShadow = 'none';
        }
        
        // Add hover effect via mouse events
        btn.onmouseenter = () => { if (currentLicenseType !== t) btn.style.color = 'white'; };
        btn.onmouseleave = () => { if (currentLicenseType !== t) btn.style.color = '#6b7280'; };
    });

    // Update the hidden render zone type label
    const labels = { hunting: 'HUNTING LICENSE', fishing: 'FISHING LICENSE', both: 'HUNT & FISH LICENSE', id: 'IDENTIFICATION DOCUMENT' };
    const typeEl = document.getElementById('license-render-type');
    if (typeEl) typeEl.innerText = labels[type] || 'LICENSE';
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

    window.setLicenseType('hunting');
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
// SAVE TO INVENTORY
// ============================================================
if (licenseSaveInventoryBtn) {
    licenseSaveInventoryBtn.addEventListener('click', async () => {
        if (!window.TRC_IDB) { alert('Database not ready.'); return; }

        const name   = document.getElementById('license-input-name').value || '';
        const number = document.getElementById('license-input-number').value || '';

        if (!name && !number && !currentLicenseImage) {
            alert('Fill out at least a Name or License Number first.');
            return;
        }

        const data = {
            id:        activeLicenseId || Date.now().toString(),
            type:      currentLicenseType,
            timestamp: Date.now(),
            image:     currentLicenseImage,
            name:      name,
            number:    number,
            expiry:    document.getElementById('license-input-expiry').value || '',
            state:     document.getElementById('license-input-state').value || '',
            notes:     document.getElementById('license-input-notes').value || ''
        };

        try {
            await window.TRC_IDB.set('licenseLibrary', data.id, data);
            if (window.showToast) window.showToast('License Saved to Inventory');
            clearLicenseForm();
            renderLicenseLibrary();
        } catch(err) {
            console.error('Save License failed:', err);
            alert('Database error: Could not save License.');
        }
    });
}

// ============================================================
// RENDER LIBRARY
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
        const typeColor = { hunting: 'text-green-400', fishing: 'text-blue-400', both: 'text-amber-400', id: 'text-gray-400' };
        const typeBorder = { hunting: 'border-green-700', fishing: 'border-blue-700', both: 'border-amber-700', id: 'border-gray-700' };

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
                            : `<i data-lucide="id-card" class="w-4 h-4 text-gray-400"></i>`}
                    </div>
                    <div class="flex-1 min-w-0 flex flex-col justify-center">
                        <div class="text-[9px] text-gray-300 truncate font-bold">${lic.number || 'No # on file'}</div>
                        <div class="text-[8px] text-gray-400 truncate">Exp: ${lic.expiry || 'N/A'}</div>
                        <div class="text-[8px] text-gray-400 truncate">${lic.state || ''}</div>
                    </div>
                    <button onclick="event.stopPropagation(); window.deleteLicense('${lic.id}')"
                        class="text-gray-400 hover:text-red-500 p-1 bg-black rounded self-center pointer-events-auto shrink-0" title="Delete">
                        <i data-lucide="trash" class="w-3 h-3"></i>
                    </button>
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
    if (confirm('Delete this license/ID permanently?')) {
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

    // Show the modal directly — do NOT call openLicenseModal() as it would clear everything
    if (licenseModal) {
        licenseModal.classList.remove('hidden');
        licenseModal.classList.add('flex');
    }
    // Close vault panel if open
    const vaultPanel = document.getElementById('panel-vault');
    if (vaultPanel) {
        if (vaultPanel.classList.contains('is-maximized') && window.toggleFullscreen) window.toggleFullscreen('panel-vault');
        vaultPanel.classList.add('hidden');
    }
    if (window.pushTacLog) window.pushTacLog(`LICENSE LOADED: ${lic.name || 'UNKNOWN'}`, 'INFO');
};

// ============================================================
// REWORK BUTTON
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
        if (window.showToast) window.showToast('License loaded for rework.');
    });
}

// ============================================================
// INTEL VAULT EXPORT
// ============================================================
if (licenseToVaultBtnTop) {
    licenseToVaultBtnTop.addEventListener('click', async () => {
        if (!selectedLicenseId) {
            alert("Please select a license from the inventory list below first.");
            return;
        }
        let lic = await window.TRC_IDB.get('licenseLibrary', selectedLicenseId);
        if (!lic) lic = await window.TRC_IDB.get('licenseLibrary', String(selectedLicenseId));
        if (!lic) lic = await window.TRC_IDB.get('licenseLibrary', Number(selectedLicenseId));
        if (!lic) return;

        const originalHtml = licenseToVaultBtnTop.innerHTML;
        licenseToVaultBtnTop.disabled = true;
        licenseToVaultBtnTop.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin inline-block mr-1"></i> SAVING...';
        if (window.lucide) window.lucide.createIcons();

        // Populate render zone
        const typeLabels = { hunting: 'HUNTING LICENSE', fishing: 'FISHING LICENSE', both: 'HUNT & FISH LICENSE', id: 'IDENTIFICATION DOCUMENT' };
        const el = (id) => document.getElementById(id);

        if (el('license-render-type'))   el('license-render-type').innerText   = typeLabels[lic.type] || 'LICENSE';
        if (el('license-render-name'))   el('license-render-name').innerText   = lic.name   || 'UNKNOWN';
        if (el('license-render-number')) el('license-render-number').innerText = lic.number || 'N/A';
        if (el('license-render-expiry')) el('license-render-expiry').innerText = lic.expiry || 'N/A';
        if (el('license-render-state'))  el('license-render-state').innerText  = lic.state  || 'N/A';
        if (el('license-render-notes'))  el('license-render-notes').innerText  = lic.notes  || '—';

        const renderPhoto   = el('license-render-photo');
        const renderNoPhoto = el('license-render-nophoto');
        if (lic.image) {
            if (renderPhoto)   { renderPhoto.src = lic.image; renderPhoto.style.display = 'block'; }
            if (renderNoPhoto) renderNoPhoto.style.display = 'none';
        } else {
            if (renderPhoto)   renderPhoto.style.display = 'none';
            if (renderNoPhoto) renderNoPhoto.style.display = 'block';
        }

        // Set background color in render zone based on type
        const typeBgColors = { hunting: '#162b12', fishing: '#0d2035', both: '#2c1f00', id: '#161625' };
        const renderZone = el('license-poster-render-zone');
        if (!renderZone) { licenseToVaultBtnTop.disabled = false; licenseToVaultBtnTop.innerHTML = originalHtml; return; }
        renderZone.style.backgroundColor = typeBgColors[lic.type] || '#162b12';

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
                backgroundColor: typeBgColors[lic.type] || '#162b12',
                scale:   1.5,
                logging: false,
                useCORS: true,
                allowTaint: true,
                foreignObjectRendering: false,
                imageTimeout: 15000,
                removeContainer: true,
                onclone: (clonedDoc) => {
                    const clonedZone = clonedDoc.getElementById('license-render-zone');
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
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            canvas.width = 0;
            canvas.height = 0;

            if (window.saveIntelSnapshot) {
                // Strip heavy image from licenseData — snapshot already has the visual
                const licLite = { ...lic };
                delete licLite.image;
                
                await window.saveIntelSnapshot(
                    (typeLabels[lic.type] || 'LICENSE') + ': ' + (lic.name || 'UNKNOWN'),
                    dataUrl,
                    { type: 'license-card', isAmmo: false, licenseData: licLite }
                );
                
                licenseToVaultBtnTop.innerHTML = '<i data-lucide="check" class="w-4 h-4 inline-block mr-1"></i> SENT TO INTEL VAULT';
                if (window.lucide) window.lucide.createIcons();
                
                setTimeout(() => {
                    licenseToVaultBtnTop.disabled = false;
                    licenseToVaultBtnTop.innerHTML = originalHtml;
                    if (window.lucide) window.lucide.createIcons();
                }, 2000);
                
                if (window.showToast) window.showToast('✅ License Saved to Intel Vault!');
                else if (window.pushTacLog) window.pushTacLog('LICENSE SENT TO INTEL VAULT', 'SUCCESS');
                // Stay in the form — user can save another license immediately

            }
        } catch(err) {
            console.error('License capture failed:', err);
            if (window.showToast) window.showToast('⚠️ Capture failed: ' + err.message);
            else alert('Capture failed: ' + err.message);
            licenseToVaultBtnTop.disabled  = false;
            licenseToVaultBtnTop.innerHTML = originalHtml;
            if (window.lucide) window.lucide.createIcons();
        } finally {
            if (originalParent) originalParent.insertBefore(renderZone, originalNextSibling);
            renderZone.style.position = 'fixed';
            renderZone.style.top      = '-9999px';
            renderZone.style.zIndex   = '-9999';
        }
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
            // No selection — just open a fresh license editor
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

        // If this is a saved license card, load it back fully
        if (item.type === 'license-card' && item.licenseData) {
            if (!item.licenseData.image) item.licenseData.image = item.image;
            window.loadLicenseBackToEditor(item.licenseData);
            return;
        }

        // If it's a plain photo, pre-load the image and open fresh
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

        alert('Select a License card or a photo snapshot to load into the License editor.');
    });
}

