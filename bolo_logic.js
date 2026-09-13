// --- BOLO / MOST WANTED LOGIC ---
const boloModal = document.getElementById('bolo-modal');
const openBoloBtns = document.querySelectorAll('#openBoloBtn, #openBoloBtnHud');
const boloImageUpload = document.getElementById('bolo-image-upload');
const boloRenderImg = document.getElementById('bolo-render-img');
const boloImagePlaceholder = document.getElementById('bolo-render-img-placeholder');

const boloClearBtn = document.getElementById('bolo-clear-btn');
const boloSaveInventoryBtn = document.getElementById('bolo-save-inventory-btn');
const reworkBoloBtn = document.getElementById('rework-bolo-btn');
const boloToVaultBtnTop = document.getElementById('bolo-to-vault-btn-top');

window.currentBoloCaptured = false;

window.markBoloCaptured = function() {
    const stamp1 = document.getElementById('bolo-captured-stamp');
    const stamp2 = document.getElementById('bolo-animal-captured-stamp');
    if (stamp1) stamp1.style.display = 'block';
    if (stamp2) stamp2.style.display = 'block';
    window.currentBoloCaptured = true;
    
    let targetName = document.getElementById('bolo-input-name')?.value || document.getElementById('bolo-input-species')?.value || 'TARGET';
    if (window.broadcastMessage) {
        window.broadcastMessage("BOLO CAPTURED: " + targetName);
    }
};

let currentBoloImage = null;
let activeBoloId = null;
let selectedBoloId = null;
let currentBoloThreatLevel = 'poi';   // 'poi' | 'fugitive' | 'armed'
let currentBoloType = 'person';        // 'person' | 'animal'
let currentBoloSex = 'unknown';
let currentVehType = 'car';
let currentVehFlag = 'stolen';        // 'male' | 'female' | 'unknown'
let currentAnimalThreat = 'nuisance'; // 'nuisance' | 'dangerous' | 'trophy'

// ============================================================
// BOLO TYPE TOGGLE  (Person vs Animal)
// ============================================================
window.setBoloType = function(type) {
    currentBoloType = type;
    const personForm   = document.getElementById('bolo-person-fields');
    const animalForm   = document.getElementById('bolo-animal-fields');
    const vehicleForm  = document.getElementById('bolo-vehicle-fields');
    const btnPerson    = document.getElementById('bolo-type-btn-person');
    const btnAnimal    = document.getElementById('bolo-type-btn-animal');
    const btnVehicle   = document.getElementById('bolo-type-btn-vehicle');
    const photoLabel   = document.getElementById('bolo-photo-label');

    if (personForm) personForm.style.display = (type === 'person') ? '' : 'none';
    if (animalForm) animalForm.style.display = (type === 'animal') ? '' : 'none';
    if (vehicleForm) vehicleForm.style.display = (type === 'vehicle') ? '' : 'none';

    if (btnPerson)  { btnPerson.style.background = (type === 'person') ? '#7f1d1d' : 'transparent'; btnPerson.style.color = (type === 'person') ? '#fca5a5' : '#6b7280'; btnPerson.style.borderColor = (type === 'person') ? '#ef4444' : '#374151'; }
    if (btnAnimal)  { btnAnimal.style.background = (type === 'animal') ? '#374151' : 'transparent'; btnAnimal.style.color = (type === 'animal') ? '#d1d5db' : '#6b7280'; btnAnimal.style.borderColor = (type === 'animal') ? '#9ca3af' : '#374151'; }
    if (btnVehicle) { btnVehicle.style.background = (type === 'vehicle') ? '#1e3a8a' : 'transparent'; btnVehicle.style.color = (type === 'vehicle') ? '#93c5fd' : '#6b7280'; btnVehicle.style.borderColor = (type === 'vehicle') ? '#3b82f6' : '#374151'; }

    if (photoLabel) {
        if (type === 'person') photoLabel.innerText = 'Suspect Photo';
        else if (type === 'animal') photoLabel.innerText = 'Animal Photo';
        else photoLabel.innerText = 'Vehicle Photo';
    }
};

// ============================================================
// SEX TOGGLE (Person)
// ============================================================
window.setBoloSex = function(sex) {
    currentBoloSex = sex;
    // Update PERSON sex buttons
    ['male','female','unknown'].forEach(s => {
        const btn = document.getElementById(`bolo-sex-btn-${s}`);
        if (!btn) return;
        if (s === sex) {
            btn.style.background   = sex === 'male' ? '#1e3a5f' : sex === 'female' ? '#5f1e3a' : '#374151';
            btn.style.color        = sex === 'male' ? '#93c5fd' : sex === 'female' ? '#f9a8d4' : '#d1d5db';
            btn.style.borderColor  = sex === 'male' ? '#3b82f6' : sex === 'female' ? '#ec4899' : '#9ca3af';
        } else {
            btn.style.background  = '';
            btn.style.color       = '#6b7280';
            btn.style.borderColor = '#374151';
        }
    });
    // Update ANIMAL sex buttons (now use bolo-animal-sex-btn-* IDs)
    ['male','female','unknown'].forEach(s => {
        const btn = document.getElementById(`bolo-animal-sex-btn-${s}`);
        if (!btn) return;
        if (s === sex) {
            btn.style.background   = sex === 'male' ? '#1e3a5f' : sex === 'female' ? '#5f1e3a' : '#374151';
            btn.style.color        = sex === 'male' ? '#93c5fd' : sex === 'female' ? '#f9a8d4' : '#d1d5db';
            btn.style.borderColor  = sex === 'male' ? '#3b82f6' : sex === 'female' ? '#ec4899' : '#9ca3af';
        } else {
            btn.style.background  = '';
            btn.style.color       = '#6b7280';
            btn.style.borderColor = '#374151';
        }
    });
};

// ============================================================
// ANIMAL THREAT LEVEL
// ============================================================
window.setAnimalThreat = function(level) {
    currentAnimalThreat = level;
    const configs = {
        nuisance:  { bg: 'rgba(180,83,9,0.35)',  color: '#fbbf24', border: '#b45309' },
        dangerous: { bg: 'rgba(127,29,29,0.45)', color: '#f87171', border: '#dc2626' },
        trophy:    { bg: 'rgba(6,78,59,0.35)',   color: '#6ee7b7', border: '#059669' }
    };
    const off = { bg: '', color: '#6b7280', border: '#374151' };
    ['nuisance','dangerous','trophy'].forEach(lvl => {
        const btn = document.getElementById(`bolo-animal-threat-${lvl}`);
        if (!btn) return;
        const s = lvl === level ? configs[level] : off;
        btn.style.background  = s.bg;
        btn.style.color       = s.color;
        btn.style.borderColor = s.border;
    });
};

// ============================================================
// THREAT LEVEL (Person)
// ============================================================
window.setBoloThreatLevel = function(level) {
    currentBoloThreatLevel = level;
    const hiddenInput = document.getElementById('bolo-input-threat');
    if (hiddenInput) hiddenInput.value = level;

    const configs = {
        poi:      { border: '#3b82f6', bg: 'rgba(29,78,216,0.4)',  color: '#93c5fd', shadow: '0 0 10px rgba(59,130,246,0.6)'  },
        fugitive: { border: '#f97316', bg: 'rgba(194,65,12,0.4)',  color: '#fb923c', shadow: '0 0 10px rgba(249,115,22,0.6)'  },
        armed:    { border: '#dc2626', bg: 'rgba(127,29,29,0.5)',  color: '#f87171', shadow: '0 0 12px rgba(220,38,38,0.6)'  }
    };
    const off = { border: '#374151', bg: '#111827', color: '#6b7280', shadow: 'none' };

    ['poi','fugitive','armed'].forEach(lvl => {
        const btn = document.getElementById(`bolo-threat-btn-${lvl}`);
        if (!btn) return;
        const s = lvl === level ? configs[level] : off;
        btn.style.borderColor     = s.border;
        btn.style.backgroundColor = s.bg;
        btn.style.color           = s.color;
        btn.style.boxShadow       = s.shadow;
    });
};

// ============================================================
// OPEN / CLOSE
// ============================================================
window.closeBoloModal = function() {
    if (boloModal) {
        boloModal.classList.add('hidden');
        boloModal.classList.remove('flex');
    }
};

window.openBoloModal = function() {
    boloModal.classList.remove('hidden');
    boloModal.classList.add('flex');
    clearBoloForm();
    renderBoloLibrary();
};

openBoloBtns.forEach(btn => {
    btn.addEventListener('click', window.openBoloModal);
});

// ============================================================
// CLEAR FORM
// ============================================================
function clearBoloForm() {
    // Person fields
    const personInputs = [
        'bolo-input-name','bolo-input-reason','bolo-input-agency','bolo-input-case',
        'bolo-input-dob','bolo-input-build','bolo-input-height','bolo-input-weight',
        'bolo-input-hair','bolo-input-eye','bolo-input-features',
        'bolo-input-lastseen','bolo-input-reward','bolo-input-warning','bolo-input-contact'
    ];
    personInputs.forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });

    // Animal fields
    const animalInputs = [
        'bolo-input-species','bolo-input-animal-weight','bolo-input-animal-marks',
        'bolo-input-animal-territory','bolo-input-animal-reward','bolo-input-animal-contact'
    ];
    animalInputs.forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });

    // Image
    currentBoloImage = null;
    if(boloRenderImg) { boloRenderImg.src = ''; boloRenderImg.style.display = 'none'; }
    if(boloImagePlaceholder) boloImagePlaceholder.style.display = 'block';
    const formPreviewImg  = document.getElementById('bolo-form-preview-img');
    const formPreviewIcon = document.getElementById('bolo-form-preview-icon');
    if(formPreviewImg)  { formPreviewImg.src = ''; formPreviewImg.classList.add('hidden'); }
    if(formPreviewIcon) formPreviewIcon.style.opacity = '1';
    if(boloImageUpload) boloImageUpload.value = '';
    const label = document.getElementById('bolo-image-label');
    if(label) { label.innerText = 'TAP TO UPLOAD PHOTO'; label.classList.remove('text-neon-green'); label.classList.add('text-gray-400'); }

    // State resets
    activeBoloId = null;
    if(reworkBoloBtn)    reworkBoloBtn.classList.add('hidden');
    if(boloToVaultBtnTop) boloToVaultBtnTop.classList.add('hidden');

    currentBoloThreatLevel = 'poi';
    window.setBoloThreatLevel('poi');
    window.setBoloSex('unknown');
    window.setAnimalThreat('nuisance');
    
    window.currentBoloCaptured = false;
    const stamp1 = document.getElementById('bolo-captured-stamp');
    const stamp2 = document.getElementById('bolo-animal-captured-stamp');
    const previewStamp = document.getElementById('bolo-preview-captured-stamp');
    if (stamp1) stamp1.style.display = 'none';
    if (stamp2) stamp2.style.display = 'none';
    if (previewStamp) previewStamp.classList.add('hidden');
    // Keep type — don't reset it, preserve user's last mode

    const notesInput   = document.getElementById('bolo-input-notes');
    const notesCounter = document.getElementById('bolo-notes-counter');
    if(notesInput)   notesInput.value = '';
    if(notesCounter) notesCounter.innerText = '0 / 1000';

    renderBoloLibrary();
}

if(boloClearBtn) boloClearBtn.addEventListener('click', clearBoloForm);

// ============================================================
// IMAGE UPLOAD
// ============================================================
if (boloImageUpload) {
    boloImageUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const optimized = window.compressAndResizeImage 
                ? await window.compressAndResizeImage(file, 800, 0.8) 
                : await new Promise(r => { const fr = new FileReader(); fr.onload = ev => r(ev.target.result); fr.readAsDataURL(file); });
            currentBoloImage = optimized;
            if(boloRenderImg) { boloRenderImg.src = currentBoloImage; boloRenderImg.style.display = 'block'; }
            if(boloImagePlaceholder) boloImagePlaceholder.style.display = 'none';
            const previewImg  = document.getElementById('bolo-form-preview-img');
            const previewIcon = document.getElementById('bolo-form-preview-icon');
            if(previewImg)  { previewImg.src = currentBoloImage; previewImg.classList.remove('hidden'); }
            if(previewIcon) previewIcon.style.opacity = '0.3';
            const lbl = document.getElementById('bolo-image-label');
            if(lbl) { lbl.innerText = 'IMAGE UPLOADED'; lbl.classList.remove('text-gray-400'); lbl.classList.add('text-neon-green'); }
        } catch(err) {
            console.error("BOLO image process error:", err);
        }
    });
}

// ============================================================

window.setBoloVehType = function(type) {
    currentVehType = type;
    const btns = ['car', 'truck', 'moto'];
    btns.forEach(b => {
        const el = document.getElementById('bolo-veh-btn-' + b);
        if(!el) return;
        if(b === type) {
            el.style.background = '#1e3a8a'; el.style.color = '#93c5fd'; el.style.borderColor = '#3b82f6';
        } else {
            el.style.background = 'transparent'; el.style.color = '#6b7280'; el.style.borderColor = '#374151';
        }
    });
};

window.setBoloVehFlag = function(flag) {
    currentVehFlag = flag;
    const btns = ['stolen', 'felony', 'armed'];
    btns.forEach(b => {
        const el = document.getElementById('bolo-veh-flag-' + b);
        if(!el) return;
        if(b === flag) {
            el.style.background = 'rgba(59,130,246,0.4)'; el.style.color = '#60a5fa'; el.style.borderColor = '#3b82f6';
            el.style.boxShadow = '0 0 8px rgba(59,130,246,0.3)';
        } else {
            el.style.background = 'transparent'; el.style.color = '#6b7280'; el.style.borderColor = '#374151';
            el.style.boxShadow = 'none';
        }
    });
};

// SAVE TO INVENTORY
// ============================================================
if(boloSaveInventoryBtn) {
    boloSaveInventoryBtn.addEventListener('click', async () => {
        if(!window.TRC_IDB) { alert('Database not ready.'); return; }

        const isPerson = currentBoloType === 'person';
        const data = {
            bolo_type:   currentBoloType,
            timestamp:   new Date().toISOString(),
            image:       currentBoloImage,
            notes:       (document.getElementById('bolo-input-notes') || {}).value || '',
            threat_level: currentBoloThreatLevel,
            captured:    window.currentBoloCaptured,
        };

        if (isPerson) {
            data.name         = document.getElementById('bolo-input-name').value    || '';
            data.reason       = document.getElementById('bolo-input-reason').value  || '';
            data.agency       = document.getElementById('bolo-input-agency').value  || '';
            data.case_num     = document.getElementById('bolo-input-case').value    || '';
            data.sex          = currentBoloSex;
            data.dob          = document.getElementById('bolo-input-dob').value     || '';
            data.build        = document.getElementById('bolo-input-build').value   || '';
            data.height       = document.getElementById('bolo-input-height').value  || '';
            data.weight       = document.getElementById('bolo-input-weight').value  || '';
            data.hair         = document.getElementById('bolo-input-hair').value    || '';
            data.eye          = document.getElementById('bolo-input-eye').value     || '';
            data.features     = document.getElementById('bolo-input-features').value|| '';
            data.lastseen     = document.getElementById('bolo-input-lastseen').value|| '';
            data.reward       = document.getElementById('bolo-input-reward').value  || '';
            data.warning      = document.getElementById('bolo-input-warning').value || '';
            data.contact      = document.getElementById('bolo-input-contact').value || '';
            if (!data.name && !data.reason && !data.image) { alert('Fill out at least a Name or Charges.'); return; }
        } else if (currentBoloType === 'vehicle') {
            data.veh_type     = currentVehType;
            data.veh_flag     = currentVehFlag;
            data.veh_make     = document.getElementById('bolo-veh-make').value      || '';
            data.veh_color    = document.getElementById('bolo-veh-color').value     || '';
            data.veh_plate    = document.getElementById('bolo-veh-plate').value     || '';
            data.veh_state    = document.getElementById('bolo-veh-state').value     || '';
            data.veh_vin      = document.getElementById('bolo-veh-vin').value       || '';
            data.veh_features = document.getElementById('bolo-veh-features').value  || '';
            data.veh_owner    = document.getElementById('bolo-veh-owner').value     || '';
            data.veh_reason   = document.getElementById('bolo-veh-reason').value    || '';
            data.agency       = document.getElementById('bolo-input-agency').value  || '';
            data.case_num     = document.getElementById('bolo-input-case').value    || '';
        } else {
            data.agency          = document.getElementById('bolo-input-agency').value           || '';
            data.case_num        = document.getElementById('bolo-input-case').value             || '';
            data.species         = document.getElementById('bolo-input-species').value          || '';
            data.animal_sex      = currentBoloSex;
            data.animal_weight   = document.getElementById('bolo-input-animal-weight').value    || '';
            data.animal_marks    = document.getElementById('bolo-input-animal-marks').value     || '';
            data.animal_territory= document.getElementById('bolo-input-animal-territory').value || '';
            data.animal_reward   = document.getElementById('bolo-input-animal-reward').value    || '';
            data.animal_contact  = document.getElementById('bolo-input-animal-contact').value   || '';
            data.animal_threat   = currentAnimalThreat;
            if (!data.species && !data.image) { alert('Fill out at least a Species.'); return; }
        }

        data.captured = window.currentBoloCaptured || false;

        const id = Date.now().toString();
        data.id = id;
        await window.TRC_IDB.set('boloLibrary', id, data);
        if (window.showToast) window.showToast('BOLO Saved to Inventory');
        clearBoloForm();
        renderBoloLibrary();
    });
}

// ============================================================
// RENDER LIBRARY
// ============================================================
async function renderBoloLibrary() {
    const listEl = document.getElementById('boloLibraryList');
    if(!listEl || !window.TRC_IDB) return;
    try {
        const boloObj  = await window.TRC_IDB.getAll('boloLibrary');
        const allBolos = Object.values(boloObj || {});
        listEl.innerHTML = '';
        if(allBolos.length === 0) {
            listEl.innerHTML = '<div class="col-span-full text-center text-gray-600 text-xs py-10 font-bold tracking-widest border border-dashed border-gray-800 rounded-lg">INVENTORY EMPTY</div>';
            return;
        }
        allBolos.sort((a,b) => Number(b.id) - Number(a.id));
        allBolos.forEach(bolo => {
                        const isVehicle   = bolo.bolo_type === 'vehicle';
            const isAnimal    = bolo.bolo_type === 'animal';
            const isPerson    = !isVehicle && !isAnimal;
            const isActive    = selectedBoloId === bolo.id;
            const dateStr     = new Date(bolo.timestamp).toLocaleString();
            
            let displayName = 'UNKNOWN';
            if (isPerson) displayName = bolo.name || 'UNKNOWN';
            else if (isAnimal) displayName = bolo.species || 'UNKNOWN ANIMAL';
            else if (isVehicle) displayName = bolo.veh_plate ? (bolo.veh_plate + ' (' + (bolo.veh_state||'') + ')') : (bolo.veh_make || 'UNKNOWN VEHICLE');
            
            let displaySub = 'WANTED';
            if (isPerson) displaySub = bolo.reason || 'WANTED';
            else if (isAnimal) displaySub = bolo.animal_territory || bolo.animal_threat || 'NUISANCE ANIMAL';
            else if (isVehicle) displaySub = bolo.veh_reason || bolo.veh_color || 'NO DETAILS';
            
            const accentColor = isPerson ? '#ef4444' : (isVehicle ? '#3b82f6' : '#9ca3af');
            const cardBorder  = isActive ? (isPerson ? 'border-red-500' : (isVehicle ? 'border-blue-500' : 'border-gray-400')) : 'border-gray-800';
            const cardBg      = isActive ? (isPerson ? 'bg-red-900/30' : (isVehicle ? 'bg-blue-900/30' : 'bg-gray-700/30')) : 'bg-gray-900/50';
            const typeLabel   = isPerson ? '🚨 PERSON' : (isVehicle ? '🚗 VEHICLE' : '🐾 ANIMAL');

            const card = document.createElement('div');
            card.className = `relative p-3 rounded-lg border-2 cursor-pointer transition-all ${cardBg} ${cardBorder} hover:border-gray-600`;
            card.innerHTML = `
                <div class="absolute top-2 left-2 z-30 bg-black/60 p-1 rounded pointer-events-auto">
                    <input type="checkbox" aria-label="Select BOLO" class="w-4 h-4 cursor-pointer bg-black/50 border border-gray-500 rounded text-red-500 focus:ring-red-500/50" ${isActive ? 'checked' : ''} onclick="event.stopPropagation(); window.selectBolo('${bolo.id}')">
                </div>
                ${bolo.captured ? '<div class="absolute top-2 right-2 bg-blue-600 text-white font-black text-[8px] px-1.5 py-0.5 rounded shadow-[0_0_5px_rgba(37,99,235,0.8)] border border-blue-400 rotate-3 uppercase tracking-widest z-20">CAPTURED</div>' : ''}
                <div class="flex items-start justify-between mb-2 pointer-events-none">
                    <div class="font-black text-[10px] uppercase tracking-widest truncate max-w-[150px]" style="color:${accentColor}; padding-left: 32px;">${displayName}</div>
                    <div class="flex gap-1 items-center shrink-0">
                        <span class="text-[8px] font-bold px-1 py-0.5 rounded" style="background:rgba(255,255,255,0.07);color:${accentColor}">${typeLabel}</span>
                    </div>
                </div>
                <div class="flex gap-2 pointer-events-none pl-8">
                    <div class="w-12 h-12 bg-black border border-gray-700 rounded overflow-hidden shrink-0 flex items-center justify-center relative">
                        ${bolo.image ? `<img src="${bolo.image}" class="w-full h-full object-cover">` : `<i data-lucide="${isPerson ? 'user' : (isVehicle ? 'car' : 'paw-print')}" class="w-4 h-4 text-gray-600"></i>`}
                        ${bolo.captured ? `
                        <div class="absolute inset-0 bg-red-950/75 flex items-center justify-center z-10">
                            <span class="text-[6px] font-black text-red-400 border border-red-500 px-0.5 rounded rotate-[-12deg] tracking-tighter uppercase">CAPTURED</span>
                        </div>
                        ` : ''}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="text-[9px] text-gray-300 truncate">${displaySub}</div>
                        <div class="text-[8px] text-gray-400 truncate mt-1">${dateStr}</div>
                    </div>
                    <button class="text-gray-600 hover:text-red-500 p-1 bg-black rounded self-center pointer-events-auto" onclick="event.stopPropagation(); deleteBolo('${bolo.id}')" title="Delete">
                        <i data-lucide="trash" class="w-3 h-3"></i>
                    </button>
                </div>
                
                <!-- Quick Actions Toolbar -->
                <div class="mt-3 pt-2 border-t border-gray-800/80 pointer-events-auto">
                    <div class="flex gap-1 mb-1">
                        <button onclick="event.stopPropagation(); window.loadBoloBackToEditorById('${bolo.id}')" class="flex-1 text-[8px] font-black bg-amber-950/50 hover:bg-amber-900 text-amber-500 hover:text-white px-2 py-1 rounded border border-amber-800/50 transition-all uppercase tracking-wider" title="Edit/Rework"><i data-lucide="wrench" class="w-2 h-2 inline-block mr-0.5"></i> REWORK</button>
                        <button onclick="event.stopPropagation(); window.sendBoloToVaultById('${bolo.id}')" class="flex-1 text-[8px] font-black bg-purple-950/50 hover:bg-purple-900 text-purple-400 hover:text-white px-2 py-1 rounded border border-purple-800/50 transition-all uppercase tracking-wider" title="Save to Intel Vault"><i data-lucide="archive" class="w-2 h-2 inline-block mr-0.5"></i> VAULT</button>
                    </div>
                    <button onclick="event.stopPropagation(); window.toggleBoloCapturedById('${bolo.id}')" class="w-full text-[9px] font-black py-1.5 rounded border-2 transition-all uppercase tracking-widest ${bolo.captured ? 'bg-emerald-900 text-emerald-300 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-black/50 hover:bg-emerald-950 text-emerald-600 hover:text-emerald-300 border-emerald-900 hover:border-emerald-600'}" title="Toggle Capture Status"><i data-lucide="${bolo.captured ? 'unlock' : 'crosshair'}" class="w-2.5 h-2.5 inline-block mr-1"></i> ${bolo.captured ? '✓ CAPTURED — TAP TO RELEASE' : '⊕ MARK AS CAPTURED'}</button>
                </div>
            `;
            card.onclick = (e) => {
                if (e.target.tagName.toLowerCase() !== 'input' && e.target.tagName.toLowerCase() !== 'button') {
                    window.selectBolo(bolo.id);
                }
            };
            listEl.appendChild(card);
        });
        if(window.lucide) window.lucide.createIcons();
    } catch(e) { console.error('Failed to render bolo library', e); }
}

window.deleteBolo = async function(id) {
    if(confirm('Delete this BOLO card?')) {
        await window.TRC_IDB.delete('boloLibrary', id);
        if (selectedBoloId === id) {
            selectedBoloId = null;
            if (reworkBoloBtn) reworkBoloBtn.classList.add('hidden');
            if (boloToVaultBtnTop) boloToVaultBtnTop.classList.add('hidden');
        }
        if (activeBoloId === id) {
            activeBoloId = null;
        }
        renderBoloLibrary();
    }
};

window.selectBolo = function(boloId) {
    if (selectedBoloId === boloId) {
        selectedBoloId = null;
        renderBoloLibrary();
        if(reworkBoloBtn)    reworkBoloBtn.classList.add('hidden');
        if(boloToVaultBtnTop) boloToVaultBtnTop.classList.add('hidden');
        return;
    }
    selectedBoloId = boloId;
    renderBoloLibrary();
    if(reworkBoloBtn)    reworkBoloBtn.classList.remove('hidden');
    if(boloToVaultBtnTop) boloToVaultBtnTop.classList.remove('hidden');
};

// ============================================================
// LOAD BACK TO EDITOR
// ============================================================
window.loadBoloBackToEditor = function(bolo) {
    if(!bolo) return;
    const isPerson = (bolo.bolo_type || 'person') === 'person';

    // Set type first (shows/hides correct form sections)
    window.setBoloType(bolo.bolo_type || 'person');

    window.currentBoloCaptured = bolo.captured || false;
    const stamp1 = document.getElementById('bolo-captured-stamp');
    const stamp2 = document.getElementById('bolo-animal-captured-stamp');
    const previewStamp = document.getElementById('bolo-preview-captured-stamp');
    if (stamp1) stamp1.style.display = window.currentBoloCaptured ? 'block' : 'none';
    if (stamp2) stamp2.style.display = window.currentBoloCaptured ? 'block' : 'none';
    if (previewStamp) previewStamp.classList.toggle('hidden', !window.currentBoloCaptured);

    if (isPerson) {
        const set = (id, val) => { const el = document.getElementById(id); if(el) el.value = val || ''; };
        set('bolo-input-name',     bolo.name);
        set('bolo-input-reason',   bolo.reason);
        set('bolo-input-agency',   bolo.agency);
        set('bolo-input-case',     bolo.case_num);
        set('bolo-input-dob',      bolo.dob);
        set('bolo-input-build',    bolo.build);
        set('bolo-input-height',   bolo.height);
        set('bolo-input-weight',   bolo.weight);
        set('bolo-input-hair',     bolo.hair);
        set('bolo-input-eye',      bolo.eye);
        set('bolo-input-features', bolo.features);
        set('bolo-input-lastseen', bolo.lastseen);
        set('bolo-input-reward',   bolo.reward);
        set('bolo-input-warning',  bolo.warning);
        set('bolo-input-contact',  bolo.contact);
        window.setBoloThreatLevel(bolo.threat_level || 'poi');
        window.setBoloSex(bolo.sex || 'unknown');
    } else {
        const set = (id, val) => { const el = document.getElementById(id); if(el) el.value = val || ''; };
        set('bolo-input-agency',           bolo.agency);
        set('bolo-input-case',             bolo.case_num);
        set('bolo-input-species',          bolo.species);
        set('bolo-input-animal-weight',    bolo.animal_weight);
        set('bolo-input-animal-marks',     bolo.animal_marks);
        set('bolo-input-animal-territory', bolo.animal_territory);
        set('bolo-input-animal-reward',    bolo.animal_reward);
        set('bolo-input-animal-contact',   bolo.animal_contact);
        window.setAnimalThreat(bolo.animal_threat || 'nuisance');
        window.setBoloSex(bolo.animal_sex || 'unknown');
    }

    // Notes
    const notesInput   = document.getElementById('bolo-input-notes');
    const notesCounter = document.getElementById('bolo-notes-counter');
    if(notesInput)   { notesInput.value = bolo.notes || ''; }
    if(notesCounter) { notesCounter.innerText = (bolo.notes || '').length + ' / 1000'; }

    // Image
    currentBoloImage = bolo.image || null;
    const formPreviewImg  = document.getElementById('bolo-form-preview-img');
    const formPreviewIcon = document.getElementById('bolo-form-preview-icon');
    const lbl = document.getElementById('bolo-image-label');
    if(bolo.image) {
        if(formPreviewImg)  { formPreviewImg.src = bolo.image; formPreviewImg.classList.remove('hidden'); }
        if(formPreviewIcon) formPreviewIcon.style.opacity = '0.3';
        if(boloRenderImg)   { boloRenderImg.src = bolo.image; boloRenderImg.style.display = 'block'; }
        if(boloImagePlaceholder) boloImagePlaceholder.style.display = 'none';
        if(lbl) { lbl.innerText = 'CHANGE PHOTO'; lbl.classList.remove('text-gray-400'); lbl.classList.add('text-neon-green'); }
    } else {
        if(formPreviewImg)  { formPreviewImg.src = ''; formPreviewImg.classList.add('hidden'); }
        if(formPreviewIcon) formPreviewIcon.style.opacity = '1';
        if(boloRenderImg)   boloRenderImg.style.display = 'none';
        if(boloImagePlaceholder) boloImagePlaceholder.style.display = 'block';
        if(lbl) { lbl.innerText = 'TAP TO UPLOAD PHOTO'; lbl.classList.remove('text-neon-green'); lbl.classList.add('text-gray-400'); }
    }

    if(boloModal) { boloModal.classList.remove('hidden'); boloModal.classList.add('flex'); }
    const vaultPanel = document.getElementById('panel-vault');
    if(vaultPanel) {
        if(vaultPanel.classList.contains('is-maximized') && window.toggleFullscreen) window.toggleFullscreen('panel-vault');
        vaultPanel.classList.add('hidden');
    }
    if(window.pushTacLog) window.pushTacLog(`BOLO LOADED: ${bolo.name || bolo.species || 'UNKNOWN'}`, 'INFO');
};

if(reworkBoloBtn) {
    reworkBoloBtn.addEventListener('click', async () => {
        if(!selectedBoloId) return;
        const bolo = await window.TRC_IDB.get('boloLibrary', selectedBoloId);
        if(!bolo) return;
        window.loadBoloBackToEditor(bolo);
        if(window.showToast) window.showToast('BOLO loaded for rework.');
        selectedBoloId = null;
        activeBoloId = null;
        if(reworkBoloBtn)    reworkBoloBtn.classList.add('hidden');
        if(boloToVaultBtnTop) boloToVaultBtnTop.classList.add('hidden');
        renderBoloLibrary();
    });
}

window.loadPhotoToBolo = function(imgSrc) {
    window.openBoloModal();
    currentBoloImage = imgSrc;
    if(boloRenderImg) { boloRenderImg.src = imgSrc; boloRenderImg.style.display = 'block'; }
    if(boloImagePlaceholder) boloImagePlaceholder.style.display = 'none';
    const previewImg  = document.getElementById('bolo-form-preview-img');
    const previewIcon = document.getElementById('bolo-form-preview-icon');
    if(previewImg)  { previewImg.src = imgSrc; previewImg.classList.remove('hidden'); }
    if(previewIcon) previewIcon.style.opacity = '0.3';
    const lbl = document.getElementById('bolo-image-label');
    if(lbl) { lbl.innerText = 'CHANGE PHOTO'; lbl.classList.remove('text-gray-400'); lbl.classList.add('text-neon-green'); }
}// ============================================================
// INTEL VAULT EXPORT (REUSABLE FUNCTION)
// ============================================================
window.exportBoloToVault = async function(bolo, btnElement = null) {
    if (!bolo) return null;
    
    let originalHtml = '';
    if (btnElement) {
        originalHtml = btnElement.innerHTML;
        btnElement.disabled = true;
        btnElement.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin inline-block mr-1"></i> SAVING...';
        if(window.lucide) window.lucide.createIcons();
    }
    
    const isPerson = (bolo.bolo_type || 'person') === 'person';
    const renderZoneId = (bolo.bolo_type === 'vehicle') ? 'bolo-veh-poster-render-zone' : (bolo.bolo_type === 'animal' ? 'bolo-animal-render-zone' : 'bolo-poster-render-zone');
    const renderZone   = document.getElementById(renderZoneId);
    if(!renderZone) {
        if (btnElement) {
            btnElement.disabled = false;
            btnElement.innerHTML = originalHtml;
        }
        throw new Error('Render zone not found.');
    }

    // Populate poster fields
    if (isPerson) {
        const el = id => document.getElementById(id);
        el('bolo-render-agency').innerText  = bolo.agency   || 'TACTICAL RANGE CARD';
        el('bolo-render-case').innerText    = bolo.case_num || 'N/A';
        el('bolo-render-name').innerText    = bolo.name     || 'UNKNOWN SUSPECT';
        el('bolo-render-reason').innerText  = bolo.reason   || 'WANTED FOR QUESTIONING';
        el('bolo-render-sex').innerText     = bolo.sex === 'male' ? ' MALE' : bolo.sex === 'female' ? ' FEMALE' : ' UNKNOWN';
        el('bolo-render-dob').innerText     = bolo.dob      || 'N/A';
        el('bolo-render-build').innerText   = bolo.build    || 'N/A';
        el('bolo-render-height').innerText  = bolo.height   || 'N/A';
        el('bolo-render-weight').innerText  = bolo.weight   || 'N/A';
        el('bolo-render-hair').innerText    = bolo.hair     || 'N/A';
        el('bolo-render-eye').innerText     = bolo.eye      || 'N/A';
        el('bolo-render-features').innerText= bolo.features || 'None noted.';
        el('bolo-render-lastseen').innerText= bolo.lastseen || 'Unknown location.';
        el('bolo-render-reward').innerText  = bolo.reward   || 'No reward offered.';
        el('bolo-render-warning').innerText = bolo.warning  || 'Approach with caution.';
        el('bolo-render-contact').innerText = bolo.contact  || 'CONTACT LOCAL AUTHORITIES';

        const threatConfig = {
            poi:      { bg: '#1d4ed8', text: '\u26A0  PERSON OF INTEREST  \u2014  APPROACH WITH CAUTION  \u26A0' },
            fugitive: { bg: '#ea580c', text: '\u26A0  FUGITIVE / AT LARGE  \u2014  DO NOT APPROACH  \u26A0' },
            armed:    { bg: '#cc0000', text: '\u26A0  ARMED & DANGEROUS  \u2014  EXERCISE EXTREME CAUTION  \u26A0' }
        };
        const tCfg = threatConfig[bolo.threat_level || 'poi'];
        const bannerEl  = el('bolo-render-threat-banner');
        const bannerTxt = el('bolo-render-threat-text');
        if(bannerEl)  bannerEl.style.background = tCfg.bg;
        if(bannerTxt) bannerTxt.innerText = tCfg.text;

        const notesSec = el('bolo-render-notes-section');
        const notesEl  = el('bolo-render-notes');
        if(bolo.notes && bolo.notes.trim()) {
            if(notesSec) notesSec.style.display = 'block';
            if(notesEl)  notesEl.innerText = bolo.notes;
        } else {
            if(notesSec) notesSec.style.display = 'none';
        }
        const bImg = el('bolo-render-img');
        const bPh = el('bolo-render-img-placeholder');
        if(bImg) { bImg.src = bolo.image || ''; bImg.style.display = bolo.image ? 'block' : 'none'; }
        if(bPh) bPh.style.display = bolo.image ? 'none' : 'block';
        
        // Show CAPTURED stamp on output poster if captured
        const stamp = el('bolo-captured-stamp');
        if (stamp) stamp.style.display = bolo.captured ? 'block' : 'none';
    } else if (bolo.bolo_type === 'vehicle') {
        const el = id => document.getElementById(id);
        const setTxt = (id, val) => { const e = el(id); if(e) e.innerText = val; };
        
        setTxt('bolo-veh-render-agency',   bolo.agency || 'TACTICAL RANGE CARD');
        setTxt('bolo-veh-render-case',     bolo.case_num || 'N/A');
        setTxt('bolo-veh-render-species',   (bolo.veh_make || 'UNKNOWN VEHICLE').toUpperCase());
        setTxt('bolo-veh-render-sex',       (bolo.veh_type || 'UNKNOWN').toUpperCase());
        setTxt('bolo-veh-render-weight',    bolo.veh_plate || 'N/A');
        setTxt('bolo-veh-render-marks',     bolo.veh_features || 'None noted.');
        setTxt('bolo-veh-render-territory', bolo.veh_state || 'Unknown area.');
        setTxt('bolo-veh-render-reward',    bolo.veh_vin || 'N/A');
        setTxt('bolo-veh-render-contact',   bolo.veh_reason || 'CONTACT LOCAL AUTHORITIES');
        setTxt('bolo-veh-render-type-label', 'VEHICLE BOLO');

        const bannerEl  = el('bolo-veh-render-banner');
        const bannerTxt = el('bolo-veh-render-banner-text');
        
        const flagColors = {
            stolen: { bg: '#92400e', text: '⚠  STOLEN VEHICLE  ⚠' },
            felony: { bg: '#7f1d1d', text: '⚠  FELONY VEHICLE  ⚠' },
            occupants: { bg: '#1d4ed8', text: '⚠  WANTED OCCUPANTS  ⚠' }
        };
        const vCfg = flagColors[bolo.veh_flag || 'stolen'] || flagColors.stolen;
        
        if(bannerEl)  bannerEl.style.background = vCfg.bg;
        if(bannerTxt) bannerTxt.innerText = vCfg.text;

        const notesEl = el('bolo-veh-render-notes');
        const notesSec = el('bolo-veh-render-notes-section');
        if(bolo.notes && bolo.notes.trim()) {
            if(notesSec) notesSec.style.display = 'block';
            if(notesEl)  notesEl.innerText = bolo.notes;
        } else {
            if(notesSec) notesSec.style.display = 'none';
        }

        const vehImg = el('bolo-veh-render-img');
        const vehPh  = el('bolo-veh-render-placeholder');
        if(bolo.image) {
            if(vehImg) { vehImg.src = bolo.image; vehImg.style.display = 'block'; }
            if(vehPh)  vehPh.style.display = 'none';
        } else {
            if(vehImg) vehImg.style.display = 'none';
            if(vehPh)  vehPh.style.display = 'block';
        }
        
        const stamp = el('bolo-veh-captured-stamp');
        if (stamp) stamp.style.display = bolo.captured ? 'block' : 'none';
        
    } else {
        const el = id => document.getElementById(id);
        const threatLabels = { nuisance: 'NUISANCE ANIMAL', dangerous: 'DANGEROUS / AT LARGE', trophy: 'TROPHY ANIMAL' };
        const threatBannerCfg = {
            nuisance:  { bg: '#92400e', text: '\u26A0  NUISANCE ANIMAL  \u2014  REPORT TO RANCH OWNER  \u26A0' },
            dangerous: { bg: '#7f1d1d', text: '\u26A0  DANGEROUS ANIMAL  \u2014  DO NOT APPROACH  \u26A0' },
            trophy:    { bg: '#064e3b', text: '\u2605  TROPHY ANIMAL  \u2014  CONTACT RANCH OWNER  \u2605' }
        };
        const aCfg = threatBannerCfg[bolo.animal_threat || 'nuisance'];
        const sexLabel = bolo.animal_sex === 'male' ? ' MALE' : bolo.animal_sex === 'female' ? ' FEMALE' : ' UNKNOWN';

        const setTxt = (id, val) => { const e = el(id); if(e) e.innerText = val; };
        setTxt('bolo-animal-render-agency',   bolo.agency || 'TACTICAL RANGE CARD');
        setTxt('bolo-animal-render-case',     bolo.case_num || 'N/A');
        setTxt('bolo-animal-render-species',   (bolo.species || 'UNKNOWN SPECIES').toUpperCase());
        setTxt('bolo-animal-render-sex',       sexLabel);
        setTxt('bolo-animal-render-weight',    bolo.animal_weight   || 'Est. Unknown');
        setTxt('bolo-animal-render-marks',     bolo.animal_marks    || 'None noted.');
        setTxt('bolo-animal-render-territory', bolo.animal_territory|| 'Unknown area.');
        setTxt('bolo-animal-render-reward',    bolo.animal_reward   || 'No reward posted.');
        setTxt('bolo-animal-render-contact',   bolo.animal_contact  || 'CONTACT RANCH / WILDLIFE OFFICER');
        setTxt('bolo-animal-render-type-label',threatLabels[bolo.animal_threat || 'nuisance']);

        const bannerEl  = el('bolo-animal-render-banner');
        const bannerTxt = el('bolo-animal-render-banner-text');
        if(bannerEl)  bannerEl.style.background = aCfg.bg;
        if(bannerTxt) bannerTxt.innerText = aCfg.text;

        const notesEl = el('bolo-animal-render-notes');
        const notesSec = el('bolo-animal-render-notes-section');
        if(bolo.notes && bolo.notes.trim()) {
            if(notesSec) notesSec.style.display = 'block';
            if(notesEl)  notesEl.innerText = bolo.notes;
        } else {
            if(notesSec) notesSec.style.display = 'none';
        }

        const animalImg = el('bolo-animal-render-img');
        const animalPh  = el('bolo-animal-render-placeholder');
        if(bolo.image) {
            if(animalImg) { animalImg.src = bolo.image; animalImg.style.display = 'block'; }
            if(animalPh)  animalPh.style.display = 'none';
        } else {
            if(animalImg) animalImg.style.display = 'none';
            if(animalPh)  animalPh.style.display = 'block';
        }
        
        // Show CAPTURED stamp on output poster if captured
        const stamp = el('bolo-animal-captured-stamp');
        if (stamp) stamp.style.display = bolo.captured ? 'block' : 'none';
    }

    const originalParent      = renderZone.parentNode;
    const originalNextSibling = renderZone.nextSibling;
    document.body.appendChild(renderZone);
    renderZone.style.position = 'fixed';
    renderZone.style.left = '0';
    renderZone.style.top  = '0';
    renderZone.style.zIndex = '99999';
    renderZone.style.opacity = '1';
    renderZone.style.pointerEvents = 'none';

    let newVaultEntry = null;

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

        await new Promise(r => setTimeout(r, 200));
        const bgColor = isPerson ? '#080808' : '#1a1a1a';
        
        const html2canvasPromise = window.html2canvas(renderZone, {
            backgroundColor: bgColor,
            scale: 1.5,
            logging: false,
            useCORS: true,
            allowTaint: true,
            imageTimeout: 8000,
            removeContainer: true,
            onclone: (clonedDoc) => {
                const clonedZone = clonedDoc.getElementById('bolo-poster-render-zone');
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        canvas.width = 0;
        canvas.height = 0;
        if(window.saveIntelSnapshot) {
            let label = 'BOLO';
            if (isPerson) label = 'BOLO: ' + (bolo.name || 'UNKNOWN SUSPECT');
            else if (bolo.bolo_type === 'animal') label = 'ANIMAL BOLO: ' + (bolo.species || 'UNKNOWN').toUpperCase();
            else if (bolo.bolo_type === 'vehicle') label = 'VEHICLE BOLO: ' + (bolo.veh_make || bolo.veh_plate || 'UNKNOWN').toUpperCase();
            
            // Build the entry object
            const activeDistEl = document.getElementById('live-map-dist');
            const activeDist = (activeDistEl && activeDistEl.textContent !== "--.--") ? activeDistEl.textContent : null;
            newVaultEntry = {
                id: Date.now(),
                label: label,
                timestamp: new Date().toISOString(),
                image: dataUrl,
                distance: activeDist,
                type: 'bolo-card',
                isAmmo: false,
                boloData: bolo
            };
            
            window.vaultCache.unshift(newVaultEntry);
            if (window.TRC_IDB) {
                await TRC_IDB.set('intelVault', newVaultEntry.id.toString(), newVaultEntry);
            }
            if (window.refreshVaultGrid) window.refreshVaultGrid();
            
            if(window.showToast) window.showToast('✅ BOLO Saved to Intel Vault!');
            
            if (btnElement) {
                btnElement.innerHTML = '<i data-lucide="check" class="w-4 h-4 inline-block mr-1"></i> SENT TO INTEL VAULT';
                if(window.lucide) window.lucide.createIcons();
                setTimeout(() => {
                    btnElement.disabled = false;
                    btnElement.innerHTML = originalHtml;
                    if(window.lucide) window.lucide.createIcons();
                }, 2000);
            }
        }
    } catch(err) {
        console.error('BOLO Capture failed:', err);
        if(window.showToast) window.showToast('⚠️ Capture failed: ' + err.message);
        else alert('Capture failed: ' + err.message);
        if (btnElement) {
            btnElement.disabled = false;
            btnElement.innerHTML = originalHtml;
            if(window.lucide) window.lucide.createIcons();
        }
    } finally {
        if(originalParent) originalParent.insertBefore(renderZone, originalNextSibling);
        renderZone.style.position = 'fixed';
        renderZone.style.top      = '-9999px';
        renderZone.style.left     = '-9999px';
        renderZone.style.zIndex   = '-9999';
    }
    
    return newVaultEntry;
};

if (boloToVaultBtnTop) {
    boloToVaultBtnTop.addEventListener('click', async () => {
        if(!selectedBoloId) {
            alert("Please select a BOLO card from your inventory list below first.");
            return;
        }
        let bolo = await window.TRC_IDB.get('boloLibrary', selectedBoloId);
        if(!bolo) bolo = await window.TRC_IDB.get('boloLibrary', String(selectedBoloId));
        if(!bolo) bolo = await window.TRC_IDB.get('boloLibrary', Number(selectedBoloId));
        if(!bolo) return;
        await window.exportBoloToVault(bolo, boloToVaultBtnTop);
    });
}

// ============================================================
// CARD QUICK ACTION HANDLERS
// ============================================================
window.loadBoloBackToEditorById = async function(boloId) {
    const bolo = await window.TRC_IDB.get('boloLibrary', boloId);
    if (bolo) {
        window.loadBoloBackToEditor(bolo);
        selectedBoloId = boloId;
        renderBoloLibrary();
        if(window.showToast) window.showToast("🔓 Loaded BOLO back to form!");
    }
};

window.sendBoloToVaultById = async function(boloId) {
    const bolo = await window.TRC_IDB.get('boloLibrary', boloId);
    if (bolo) {
        if(window.showToast) window.showToast("⚡ Saving BOLO to Intel Vault...");
        await window.exportBoloToVault(bolo);
    }
};

window.sendBoloToCommsById = async function(boloId) {
    if (!window.commsChannel) {
        if (window.showToast) window.showToast("⚠️ Connect to Tactical Comms first!");
        else alert("Connect to Tactical Comms first!");
        return;
    }
    
    // 1. Check if already in vault
    let vaultItems = [];
    if (window.TRC_IDB) {
        vaultItems = Object.values(await window.TRC_IDB.getAll('intelVault') || {});
    }
    
    let existingItem = vaultItems.find(item => item.type === 'bolo-card' && item.boloData && item.boloData.id === boloId);
    if (existingItem) {
        window.sendVaultItemToChat(existingItem.id);
        if (window.showToast) window.showToast("📤 BOLO Card sent to Comms Chat!");
        return;
    }
    
    // 2. If not in vault, export it first
    if (window.showToast) window.showToast("⚡ Saving to Vault before sending...");
    const bolo = await window.TRC_IDB.get('boloLibrary', boloId);
    if (!bolo) return;
    
    const newVaultItem = await window.exportBoloToVault(bolo);
    if (newVaultItem) {
        window.sendVaultItemToChat(newVaultItem.id);
        if (window.showToast) window.showToast("📤 BOLO Card sent to Comms Chat!");
    }
};

window.toggleBoloCapturedById = async function(boloId) {
    const bolo = await window.TRC_IDB.get('boloLibrary', boloId);
    if (bolo) {
        bolo.captured = !bolo.captured;
        await window.TRC_IDB.set('boloLibrary', boloId, bolo);
        
        // If we are currently editing this BOLO, keep status synchronized in editor
        if (selectedBoloId === boloId) {
            window.currentBoloCaptured = bolo.captured;
            const stamp1 = document.getElementById('bolo-captured-stamp');
            const stamp2 = document.getElementById('bolo-animal-captured-stamp');
            const previewStamp = document.getElementById('bolo-preview-captured-stamp');
            if (stamp1) stamp1.style.display = bolo.captured ? 'block' : 'none';
            if (stamp2) stamp2.style.display = bolo.captured ? 'block' : 'none';
            if (previewStamp) previewStamp.classList.toggle('hidden', !bolo.captured);
        }
        
        renderBoloLibrary();
        
        const displayName = (bolo.bolo_type === 'person') ? (bolo.name || 'UNKNOWN') : (bolo.bolo_type === 'vehicle' ? (bolo.veh_make || 'UNKNOWN VEHICLE') : (bolo.species || 'UNKNOWN').toUpperCase());
        if (bolo.captured) {
            if (window.showToast) window.showToast(`🎯 Marked ${displayName} as CAPTURED!`);
            if (window.broadcastMessage) {
                window.broadcastMessage("BOLO CAPTURED: " + displayName);
            }
        } else {
            if (window.showToast) window.showToast(`🔓 Released ${displayName} status.`);
        }
    }
};
