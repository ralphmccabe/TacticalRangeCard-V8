// ==========================================
// OPERATORS WORKSTATION LOGIC (v1.0)
// ==========================================

// STORES is defined globally in idb_helper.js

// Currency input formatter: $ only, decimals, max $1,000,000.00
window.formatCurrencyInput = function(val) {
    // Strip everything except digits and decimal
    let raw = val.replace(/[^0-9.]/g, '');
    // Allow only one decimal point
    const parts = raw.split('.');
    if (parts.length > 2) raw = parts[0] + '.' + parts.slice(1).join('');
    // Limit to 2 decimal places
    if (parts.length === 2 && parts[1].length > 2) {
        raw = parts[0] + '.' + parts[1].substring(0, 2);
    }
    // Cap at 1,000,000.00
    const num = parseFloat(raw);
    if (num > 1000000) raw = '1000000.00';
    // Return with $ prefix (or empty if cleared)
    if (raw === '' || raw === '.') return '';
    return '$ ' + raw;
};

// Parse currency string back to float
window.parseCurrencyValue = function(val) {
    if (!val) return 0;
    return parseFloat(String(val).replace(/[^0-9.]/g, '')) || 0;
};

// Helper to rework checked workstation card from the library
window.reworkCheckedWsCard = async function() {
    const checkedBoxes = document.querySelectorAll('.ws-library-checkbox:checked');
    if (checkedBoxes.length === 0) {
        alert("Please check a card in the library using the checkbox [✓] before clicking REWORK CARD.");
        return;
    }
    const firstId = checkedBoxes[0].value;
    window.loadWorkstationCard(firstId);
};

// Helper to send checked workstation cards to the Intel Vault
window.sendCheckedWsCardsToVault = async function() {
    const checkedBoxes = document.querySelectorAll('.ws-library-checkbox:checked');
    if (checkedBoxes.length === 0) {
        alert("Please check at least one card in the library using the checkbox [✓] before clicking SEND TO INTEL VAULT.");
        return;
    }
    const selectedIds = Array.from(checkedBoxes).map(cb => cb.value);
    let count = 0;
    if (window.TRC_IDB) {
        try {
            const cards = await window.TRC_IDB.getAll('workstationLibrary');
            for (const card of Object.values(cards)) {
                if (selectedIds.includes(card.id.toString())) {
                    let vaultMetadata = {
                        id: card.id,
                        timestamp: card.timestamp,
                        image: card.image || '',
                        label: card.title || card.type,
                        type: card.type === 'casefile' ? 'casefile-pdf' : 'workstation',
                        workstationData: card,
                        casefileData: card.type === 'casefile' ? card.data : null
                    };
                    await window.TRC_IDB.set('intelVault', card.id.toString(), vaultMetadata);
                    if (window.vaultCache) {
                        window.vaultCache = window.vaultCache.filter(v => v && v.id?.toString() !== card.id.toString() && v.label !== `WORKSTATION: ${card.title}` && v.label !== card.title);
                        window.vaultCache.unshift(vaultMetadata);
                    }
                    count++;
                }
            }
        } catch(e) {
            console.error("Error saving workstation cards to vault:", e);
        }
    }
    checkedBoxes.forEach(cb => cb.checked = false);
    if (typeof refreshVaultGrid === 'function') refreshVaultGrid();
    if (window.pushTacLog) window.pushTacLog(`SENT ${count} WORKSTATION CARD(S) TO INTEL VAULT`, "SUCCESS");
    if (window.showToast) window.showToast(`📁 ${count} Card(s) synced to Intel Vault.`);
};

// Main menu renderer
window.renderWorkstationMenu = async function() {
    const container = document.getElementById('workstation-container');
    if (!container) return;

    // Fetch existing workstation intel to show in the library at the bottom
    let savedCardsHtml = '';
    if (window.TRC_IDB) {
        try {
            const cards = await window.TRC_IDB.getAll('workstationLibrary');
            const cardArray = Object.values(cards || {}).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            if (cardArray.length > 0) {
                savedCardsHtml = `
                    <div class="w-full border-t-2 border-slate-800 pt-2 mt-2 flex flex-col">
                        <div class="flex items-center justify-between mb-2 shrink-0 flex-wrap gap-1">
                            <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><i data-lucide="archive" class="w-4 h-4 text-cyan-400"></i> Saved Operations Intel Library (${cardArray.length})</h3>
                            <div class="flex items-center gap-1.5 flex-wrap">
                                <button id="ws-rework-btn" onclick="window.reworkCheckedWsCard()" class="bg-cyan-900/90 hover:bg-cyan-800 text-cyan-200 text-[9px] font-black px-2.5 py-1 rounded border border-cyan-500/60 uppercase flex items-center gap-1 cursor-pointer shadow">
                                    <i data-lucide="refresh-cw" class="w-3 h-3 text-cyan-300"></i> 🔄 REWORK CARD
                                </button>
                                <button id="ws-to-vault-btn" onclick="window.sendCheckedWsCardsToVault()" class="bg-purple-900/90 hover:bg-purple-800 text-purple-200 text-[9px] font-black px-2.5 py-1 rounded border border-purple-500/60 uppercase flex items-center gap-1 cursor-pointer shadow">
                                    <i data-lucide="folder-plus" class="w-3 h-3 text-purple-300"></i> 📁 SEND TO INTEL VAULT
                                </button>
                                <button id="ws-brag-btn" onclick="window.openWorkstationForm('bragboard')" class="hidden bg-purple-600 text-white text-[9px] font-black px-2.5 py-1 rounded hover:bg-purple-500 transition-all shadow-[0_0_10px_rgba(147,51,234,0.5)] items-center gap-1">
                                    <i data-lucide="camera" class="w-3 h-3"></i> BRAG BOARD (<span id="ws-brag-count">0</span>)
                                </button>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 p-1 pb-4 ">`;
                
                cardArray.forEach(card => {
                    let icon = 'monitor';
                    let color = 'text-blue-500';
                    if (card.type === 'medevac') { icon = 'activity'; color = 'text-red-500'; }
                    else if (card.type === 'scorecard') { icon = 'crosshair'; color = 'text-yellow-500'; }
                    else if (card.type === 'logistics') { icon = 'clipboard-list'; color = 'text-emerald-500'; }
                    else if (card.type === 'roster') { icon = 'users'; color = 'text-blue-500'; }
                    else if (card.type === 'bragboard') { icon = 'camera'; color = 'text-purple-500'; }
                    else if (card.type === 'officer') { icon = 'shield-alert'; color = 'text-cyan-400'; }
                    else if (card.type === 'casefile') { icon = 'file-check-2'; color = 'text-slate-300'; }
                    else if (card.type === 'journal') { icon = 'book-open'; color = 'text-indigo-500'; }

                    const thumbHtml = card.image 
                        ? `<img src="${card.image}" class="w-10 h-10 object-cover rounded border border-slate-700 shrink-0">`
                        : `<div class="w-10 h-10 rounded border border-slate-700 bg-slate-900 shrink-0 flex items-center justify-center"><i data-lucide="${icon}" class="w-4 h-4 ${color} opacity-80"></i></div>`;

                    savedCardsHtml += `
                        <div class="bg-slate-950/90 border border-slate-800 rounded-lg p-2 flex flex-row items-center gap-2.5 hover:border-cyan-500/50 transition-colors group relative shadow-sm shrink-0">
                            <input type="checkbox" class="ws-library-checkbox w-4 h-4 rounded bg-slate-900 border-slate-600 text-purple-600 focus:ring-purple-600 cursor-pointer shrink-0" value="${card.id}" onchange="window.checkWsCheckboxes()">
                            ${thumbHtml}
                            <div class="flex-1 min-w-0 cursor-pointer" onclick="loadWorkstationCard('${card.id}')">
                                <div class="flex items-center gap-1 mb-0.5">
                                    <i data-lucide="${icon}" class="w-3 h-3 ${color} shrink-0"></i>
                                    <span class="text-[10px] font-black ${color} truncate uppercase tracking-widest">${card.title || card.type}</span>
                                </div>
                                <div class="text-[8px] text-slate-400 font-mono">${new Date(card.timestamp).toLocaleString()}</div>
                            </div>
                            <button onclick="window.deleteWorkstationCard('${card.id}')" class="p-1.5 rounded bg-slate-900 hover:bg-red-900/80 transition-all border border-slate-800 hover:border-red-500 shrink-0" title="Delete Saved Card">
                                <i data-lucide="trash-2" class="w-3 h-3 text-red-400"></i>
                            </button>
                        </div>
                    `;
                });
                
                savedCardsHtml += `</div></div>`;
            }
        } catch(e) {
            console.error("Failed to load workstation library", e);
        }
    }

    container.innerHTML = `
        <div class="w-full flex flex-col max-w-4xl mx-auto p-1 pb-16">
            <!-- STATIONARY TOP ACTION AREA -->
            <div id="ws-top-action-area" class="w-full shrink-0">
                <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 w-full mt-1">
                    <!-- 1. MEDEVAC / INCIDENT -->
                    <button onclick="window.openWorkstationForm('medevac')" class="bg-slate-900/90 border border-red-500/50 rounded-lg p-2.5 flex flex-col items-center justify-center gap-1.5 hover:bg-slate-800 hover:border-red-500 transition-all group cursor-pointer">
                        <i data-lucide="activity" class="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform"></i>
                        <div class="text-center">
                            <div class="text-[9px] font-black text-white uppercase leading-tight">9-Line MEDEVAC</div>
                            <div class="text-[6.5px] text-slate-400 uppercase mt-0.5">Incident Report</div>
                        </div>
                    </button>

                    <!-- 2. SCORECARD -->
                    <button onclick="window.openWorkstationForm('scorecard')" class="bg-slate-900/90 border border-yellow-500/50 rounded-lg p-2.5 flex flex-col items-center justify-center gap-1.5 hover:bg-slate-800 hover:border-yellow-500 transition-all group cursor-pointer">
                        <i data-lucide="crosshair" class="w-5 h-5 text-yellow-500 group-hover:scale-110 transition-transform"></i>
                        <div class="text-center">
                            <div class="text-[9px] font-black text-white uppercase leading-tight">Scorecard</div>
                            <div class="text-[6.5px] text-slate-400 uppercase mt-0.5">Match & Drill Log</div>
                        </div>
                    </button>

                    <!-- 3. LOGISTICS -->
                    <button onclick="window.openWorkstationForm('logistics')" class="bg-slate-900/90 border border-emerald-500/50 rounded-lg p-2.5 flex flex-col items-center justify-center gap-1.5 hover:bg-slate-800 hover:border-emerald-500 transition-all group cursor-pointer">
                        <i data-lucide="clipboard-list" class="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform"></i>
                        <div class="text-center">
                            <div class="text-[9px] font-black text-white uppercase leading-tight">Logistics</div>
                            <div class="text-[6.5px] text-slate-400 uppercase mt-0.5">Expense Wrap-up</div>
                        </div>
                    </button>

                    <!-- 4. ACCOUNTABILITY -->
                    <button onclick="window.openWorkstationForm('roster')" class="bg-slate-900/90 border border-blue-500/50 rounded-lg p-2.5 flex flex-col items-center justify-center gap-1.5 hover:bg-slate-800 hover:border-blue-500 transition-all group cursor-pointer">
                        <i data-lucide="users" class="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform"></i>
                        <div class="text-center">
                            <div class="text-[9px] font-black text-white uppercase leading-tight">Accountability</div>
                            <div class="text-[6.5px] text-slate-400 uppercase mt-0.5">Squad Status</div>
                        </div>
                    </button>

                    <!-- 5. BRAG BOARD -->
                    <button onclick="window.openWorkstationForm('bragboard')" class="bg-slate-900/90 border border-purple-500/50 rounded-lg p-2.5 flex flex-col items-center justify-center gap-1.5 hover:bg-slate-800 hover:border-purple-500 transition-all group cursor-pointer">
                        <i data-lucide="camera" class="w-5 h-5 text-purple-500 group-hover:scale-110 transition-transform"></i>
                        <div class="text-center">
                            <div class="text-[9px] font-black text-white uppercase leading-tight">Media Summary</div>
                            <div class="text-[6.5px] text-slate-400 uppercase mt-0.5">Brag Board</div>
                        </div>
                    </button>

                    <!-- 6. OFFICER SITREP (FIRST RESPONDER) -->
                    <button onclick="window.openWorkstationForm('officer')" class="bg-blue-950/80 border-2 border-cyan-400 rounded-lg p-2.5 flex flex-col items-center justify-center gap-1.5 hover:bg-blue-900/90 hover:border-cyan-300 transition-all group shadow-[0_0_15px_rgba(56,189,248,0.3)] cursor-pointer">
                        <i data-lucide="shield-alert" class="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform animate-pulse"></i>
                        <div class="text-center">
                            <div class="text-[9px] font-black text-cyan-300 uppercase leading-tight">OFFICER SITREP</div>
                            <div class="text-[6.5px] font-bold text-cyan-400/80 uppercase tracking-wider mt-0.5">First Responder</div>
                        </div>
                    </button>

                    <!-- 7. TACTICAL JOURNAL -->
                    <button onclick="window.openWorkstationForm('journal')" style="border-color: var(--accent-color, #6366f1); box-shadow: 0 0 15px rgba(0,0,0,0.3);" onmouseover="this.style.boxShadow='0 0 15px var(--accent-color, #6366f1)';" onmouseout="this.style.boxShadow='0 0 15px rgba(0,0,0,0.3)';" class="bg-slate-900/90 border-2 rounded-lg p-2.5 flex flex-col items-center justify-center gap-1.5 hover:bg-slate-800 transition-all group cursor-pointer">
                        <i data-lucide="book-open" style="color: var(--accent-color, #6366f1);" class="w-5 h-5 group-hover:scale-110 transition-transform"></i>
                        <div class="text-center">
                            <div class="text-[9px] font-black uppercase leading-tight" style="color: var(--accent-color, #6366f1);">TACTICAL JOURNAL</div>
                            <div class="text-[6.5px] text-slate-400 uppercase mt-0.5">Daily / Weekly Log</div>
                        </div>
                    </button>

                    <!-- 8. MASTER OP-PLAN -->
                    <button onclick="window.openMasterOpForm ? window.openMasterOpForm() : (window.openWorkstationForm ? window.openWorkstationForm('master_op') : alert('Master Op-Plan module not loaded.'))" class="bg-amber-950/80 border-2 border-amber-500 rounded-lg p-2.5 flex flex-col items-center justify-center gap-1.5 hover:bg-amber-900/90 hover:border-amber-400 transition-all group shadow-[0_0_15px_rgba(245,158,11,0.3)] cursor-pointer">
                        <i data-lucide="map" class="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform animate-pulse"></i>
                        <div class="text-center">
                            <div class="text-[9px] font-black text-amber-400 uppercase leading-tight">OP-PLAN</div>
                            <div class="text-[6.5px] font-bold text-amber-500/80 uppercase tracking-wider mt-0.5">Mission Command</div>
                        </div>
                    </button>
                </div>
                
                <!-- 9. EXECUTIVE CASE FILE & 10. TRC SUPPLY DEPOT -->
                <div class="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                    <button onclick="window.openWorkstationForm('casefile')" class="w-full bg-slate-900 border-2 border-slate-700 rounded-lg p-3 flex items-center justify-center gap-3 hover:bg-slate-800 hover:border-slate-400 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] group cursor-pointer">
                        <i data-lucide="file-check-2" class="w-6 h-6 text-slate-300 group-hover:scale-110 transition-transform"></i>
                        <div class="text-left">
                            <div class="text-[12px] font-black text-white uppercase leading-tight tracking-widest">EXECUTIVE CASE FILE</div>
                            <div class="text-[8px] text-slate-400 uppercase mt-0.5 tracking-wider">Final PDF Invoice &amp; Intel Report</div>
                        </div>
                    </button>
                    <button onclick="if(window.openSupplyDepotModal) window.openSupplyDepotModal()" class="w-full bg-amber-950/90 border-2 border-amber-500 rounded-lg p-3 flex items-center justify-center gap-3 hover:bg-amber-900 hover:border-amber-400 transition-all shadow-[0_0_20px_rgba(245,158,11,0.25)] group cursor-pointer">
                        <i data-lucide="shopping-bag" class="w-6 h-6 text-amber-400 group-hover:scale-110 transition-transform animate-pulse"></i>
                        <div class="text-left">
                            <div class="text-[12px] font-black text-amber-300 uppercase leading-tight tracking-widest">SUPPLY DEPOT &amp; ARMORY</div>
                            <div class="text-[8px] text-amber-400/80 uppercase mt-0.5 tracking-wider font-bold">Dropship Gear, Merch &amp; Free DIY Stickers</div>
                        </div>
                    </button>
                </div>
            </div>

            <!-- UNRESTRICTED SCROLLABLE BOTTOM LIBRARY AREA -->
            <div id="ws-bottom-library-area" class="w-full flex-1 flex flex-col mt-2">
                ${savedCardsHtml}
            </div>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();
};

window.openWorkstationForm = function(type, rawCardData = null) {
    try {
        console.log('[TRC-WS] Opening form:', type);
        if (window.pushTacLog) window.pushTacLog(`WORKSTATION: OPENING [${(type || 'FORM').toUpperCase()}]`, 'SYS');
        if (window.showToast) window.showToast(`🛠️ Opening ${(type || 'Card').toUpperCase()}...`);

        const container = document.getElementById('workstation-container');
        if (!container) {
            console.error('[TRC-WS] workstation-container not found in DOM');
            if (window.pushTacLog) window.pushTacLog('ERROR: WORKSTATION CONTAINER NOT FOUND', 'ERROR');
            return;
        }

        // Normalize cardData unwrapping if passed from vaultCache / intelVault wrapper
        const cardData = (rawCardData && rawCardData.workstationData) ? rawCardData.workstationData : rawCardData;

    if (type === 'officer' || type === 'first_responder' || type === 'sitrep') {
        if (typeof window.renderOfficerForm === 'function') {
            window.renderOfficerForm(cardData);
            return;
        }
    }
    if (type === 'master_op' || type === 'master_op_card' || type === 'op_plan') {
        if (typeof window.openMasterOpForm === 'function') {
            window.openMasterOpForm(cardData);
            return;
        }
    }
    if (type === 'blog' || type === 'intel_report' || type === 'contact') {
        if (typeof window.reworkBusinessCard === 'function') {
            window.reworkBusinessCard(cardData);
            return;
        }
    }

    let headerIcon, headerColor, headerTitle;
    let formFields = '';

    const id = cardData ? cardData.id : Date.now();
    const existingImage = cardData?.data?.attachedPhoto || cardData?.data?.mainAttachedImage || cardData?.casefileData?.mainAttachedImage || '';

    if (type === 'medevac') {
        headerIcon = 'activity'; headerColor = 'text-red-500'; headerTitle = '9-LINE MEDEVAC / INCIDENT REPORT';
        formFields = `
            <div class="grid grid-cols-2 gap-4">
                <div><label class="text-[10px] text-gray-400">Location</label><input type="text" id="ws-loc" value="${cardData?.data?.loc || ''}" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded"></div>
                <div><label class="text-[10px] text-gray-400">Frequency/Callsign</label><input type="text" id="ws-freq" value="${cardData?.data?.freq || ''}" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded"></div>
                <div><label class="text-[10px] text-gray-400">Patients by Precedence</label><input type="text" id="ws-prec" value="${cardData?.data?.prec || ''}" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded"></div>
                <div><label class="text-[10px] text-gray-400">Special Equipment</label><input type="text" id="ws-equip" value="${cardData?.data?.equip || ''}" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded"></div>
                <div class="col-span-2"><label class="text-[10px] text-gray-400">Incident Details</label><textarea id="ws-details" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded h-20">${cardData?.data?.details || ''}</textarea></div>
            </div>`;
    } else if (type === 'scorecard') {
        headerIcon = 'crosshair'; headerColor = 'text-yellow-500'; headerTitle = 'COMPETITION SCORECARD';
        formFields = `
            <div class="grid grid-cols-2 gap-4">
                <div><label class="text-[10px] text-gray-400">Match/Stage Name</label><input type="text" id="ws-match" value="${cardData?.data?.match || ''}" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded"></div>
                <div><label class="text-[10px] text-gray-400">Total Time</label><input type="text" id="ws-time" value="${cardData?.data?.time || ''}" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded"></div>
                <div><label class="text-[10px] text-gray-400">Hits / Points</label><input type="text" id="ws-hits" value="${cardData?.data?.hits || ''}" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded"></div>
                <div><label class="text-[10px] text-gray-400">Penalties</label><input type="text" id="ws-penalties" value="${cardData?.data?.penalties || ''}" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded"></div>
                <div class="col-span-2"><label class="text-[10px] text-gray-400">Stage Notes / Takeaways</label><textarea id="ws-notes" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded h-20">${cardData?.data?.notes || ''}</textarea></div>
            </div>`;
    } else if (type === 'casefile') {
        headerIcon = 'file-check-2'; headerColor = 'text-slate-300'; headerTitle = 'EXECUTIVE CASE FILE & INVOICE';
        const cData = cardData?.data || cardData?.casefileData || cardData?.workstationData?.data || cardData?.workstationData?.casefileData || cardData || {};
        const invoiceNotesVal = cData.invoice_notes || '';
        const servicesPerformedVal = cData.services_performed || '';
        const isPaid = cData.is_paid === true || cData.status === 'PAID';
        const isUnpaid = cData.is_paid === false || cData.status === 'UNPAID' || !cData.status;

        formFields = `
              <div class="grid grid-cols-2 gap-4 mb-4">
                  <div>
                      <label class="text-[10px] text-blue-400 uppercase tracking-widest font-black">Operator Name / Callsign</label>
                      <input type="text" id="ws-op_name" maxlength="30" value="${cData.op_name || window.commsUser?.callsign || window.userObj?.callsign || ''}" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded focus:border-slate-400 mt-1" placeholder="e.g. John Doe / GHOST_01">
                  </div>
                  <div>
                      <label class="text-[10px] text-blue-400 uppercase tracking-widest font-black">Agency / Company</label>
                      <input type="text" id="ws-op_agency" maxlength="40" value="${cData.op_agency || ''}" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded focus:border-slate-400 mt-1" placeholder="e.g. Apex Tactical Recovery LLC">
                  </div>
                  <div>
                      <label class="text-[10px] text-blue-400 uppercase tracking-widest font-black">License / ID Number</label>
                      <input type="text" id="ws-op_license" maxlength="30" value="${cData.op_license || ''}" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded focus:border-slate-400 mt-1" placeholder="e.g. BEA-559281">
                  </div>
                  <div>
                      <label class="text-[10px] text-blue-400 uppercase tracking-widest font-black">Qualifications</label>
                      <input type="text" id="ws-op_quals" maxlength="40" value="${cData.op_quals || ''}" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded focus:border-slate-400 mt-1" placeholder="e.g. Bail Enforcement Agent">
                  </div>
              </div>
              
              <div class="grid grid-cols-2 gap-4 border-t border-slate-700 pt-4 mb-4">
                  <div>
                      <label class="text-[10px] text-amber-400 uppercase tracking-widest font-black">Billed To (Client / Agency / Unit)</label>
                      <input type="text" id="ws-billed_to" maxlength="60" value="${cData.billed_to || ''}" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded focus:border-amber-400 mt-1" placeholder="e.g. Continental Surety / District Court">
                  </div>
                  <div>
                      <label class="text-[10px] text-emerald-400 uppercase tracking-widest font-black">Paid By (Payer Name / Method)</label>
                      <input type="text" id="ws-paid_by" maxlength="60" value="${cData.paid_by || ''}" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded focus:border-emerald-400 mt-1" placeholder="e.g. Direct Wire / Corporate Card / ACH">
                  </div>
              </div>

              <div class="grid grid-cols-2 gap-4 border-t border-slate-700 pt-4 mb-4">
                  <div>
                      <label class="text-[10px] text-blue-400 uppercase tracking-widest font-black">Case / Invoice Number</label>
                      <input type="text" id="ws-case_number" maxlength="30" value="${cData.case_number || ''}" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded focus:border-slate-400 mt-1" placeholder="e.g. INV-2026-04821">
                  </div>
                  <div>
                      <label class="text-[10px] text-blue-400 uppercase tracking-widest font-black">Invoice For (Subject / Purpose)</label>
                      <input type="text" id="ws-invoice_type" maxlength="40" value="${cData.invoice_type || ''}" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded focus:border-slate-400 mt-1" placeholder="e.g. Guided Outfitting / Asset Recovery">
                  </div>
                  <div class="col-span-2">
                      <label class="text-[10px] text-purple-400 uppercase tracking-widest font-black">Services Performed (Scope of Work)</label>
                      <textarea id="ws-services_performed" maxlength="800" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded focus:border-purple-400 mt-1 h-16" placeholder="e.g. 3-day guided long-range reconnaissance, ballistic telemetry mapping, and field logistics.">${servicesPerformedVal}</textarea>
                  </div>
              </div>

              <!-- Payment Status Checkboxes -->
              <div class="border-t border-slate-700 pt-4 mb-4 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <label class="text-[10px] text-gray-300 uppercase tracking-widest font-black block mb-2">Invoice Payment Status</label>
                  <div class="flex items-center gap-6">
                      <label class="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="ws_casefile_status" id="ws-status-paid" value="PAID" ${isPaid ? 'checked' : ''} class="w-4 h-4 accent-emerald-500 cursor-pointer">
                          <span class="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1"><i data-lucide="check-circle" class="w-3.5 h-3.5"></i> PAID</span>
                      </label>
                      <label class="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="ws_casefile_status" id="ws-status-unpaid" value="UNPAID" ${isUnpaid ? 'checked' : ''} class="w-4 h-4 accent-red-500 cursor-pointer">
                          <span class="text-xs font-black uppercase text-red-400 tracking-wider flex items-center gap-1"><i data-lucide="clock" class="w-3.5 h-3.5"></i> UNPAID / PENDING</span>
                      </label>
                  </div>
              </div>
              
              <div class="grid grid-cols-2 gap-4 border-t border-slate-700 pt-4">
                  <div>
                      <label class="text-[10px] text-gray-400 uppercase tracking-widest font-black">Job Amount / Bounty ($)</label>
                      <input type="text" inputmode="decimal" id="ws-bounty" value="${cData.bounty || ''}" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded focus:border-slate-400 mt-1" placeholder="$ 0.00" oninput="this.value = window.formatCurrencyInput(this.value)">
                  </div>
                  <div>
                      <label class="text-[10px] text-gray-400 uppercase tracking-widest font-black">Expenses / Fuel ($)</label>
                      <input type="text" inputmode="decimal" id="ws-expenses" value="${cData.expenses || ''}" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded focus:border-slate-400 mt-1" placeholder="$ 0.00" oninput="this.value = window.formatCurrencyInput(this.value)">
                  </div>
                  <div class="col-span-2">
                        <div class="flex justify-between items-end mb-1">
                          <label class="text-[10px] text-gray-400 uppercase tracking-widest font-black">Additional Invoice Notes / Payment Terms</label>
                          <span id="ws-invoice-notes-counter" class="text-[9px] font-mono text-slate-400">${invoiceNotesVal.length} / 1000</span>
                      </div>
                      <textarea id="ws-invoice_notes" maxlength="1000" oninput="document.getElementById('ws-invoice-notes-counter').textContent = this.value.length + ' / 1000'" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded h-16 focus:border-slate-400 mt-1" placeholder="e.g. Due upon receipt. Make checks payable to...">${invoiceNotesVal}</textarea>
                                <!-- INTEL VAULT EXHIBITS SELECTOR -->
                   <div class="col-span-2 border-t border-slate-700 pt-3 mt-1">
                       <div class="flex justify-between items-center mb-2 flex-wrap gap-1">
                           <label class="text-[10px] text-cyan-400 uppercase tracking-widest font-black flex items-center gap-1.5">
                               <i data-lucide="archive" class="w-4 h-4 text-cyan-400"></i> ATTACHED INTEL VAULT EXHIBITS &amp; EVIDENCE
                           </label>
                           <div class="flex items-center gap-2">
                               <button type="button" onclick="window.selectAllCasefileExhibits()" class="text-[8px] text-blue-400 hover:text-blue-300 uppercase font-mono font-bold cursor-pointer">[SELECT ALL]</button>
                               <button type="button" onclick="window.clearAllCasefileExhibits()" class="text-[8px] text-slate-400 hover:text-slate-300 uppercase font-mono font-bold cursor-pointer">[CLEAR ALL]</button>
                               <button type="button" onclick="window.deleteSelectedCasefileExhibits()" class="text-[8px] text-amber-400 hover:text-amber-300 uppercase font-mono font-bold cursor-pointer flex items-center gap-1 bg-amber-950/60 border border-amber-800/80 px-1.5 py-0.5 rounded"><i data-lucide="link-2-off" class="w-2.5 h-2.5"></i> [DETACH SELECTED]</button>
                           </div>
                       </div>
                       <div id="ws-casefile-exhibits-list" class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1.5 bg-black/50 border border-slate-800 rounded-lg">
                           <div class="col-span-full py-2 text-center text-slate-500 font-mono text-[9px]">Loading Intel Vault evidence...</div>
                       </div>
                   </div>               </div>
                  </div>
              </div>`;
    } else if (type === 'logistics') {
        headerIcon = 'clipboard-list'; headerColor = 'text-emerald-500'; headerTitle = 'LOGISTICS & EXPENSES';
        formFields = `
            <div class="grid grid-cols-2 gap-4">
                <div><label class="text-[10px] text-gray-400">Ammo Expended</label><input type="text" id="ws-ammo" value="${cardData?.data?.ammo || ''}" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded"></div>
                <div><label class="text-[10px] text-gray-400">Gear Damaged/Lost</label><input type="text" id="ws-gear" value="${cardData?.data?.gear || ''}" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded"></div>
                <div><label class="text-[10px] text-gray-400">Total Cost Estimate</label><input type="text" id="ws-cost" value="${cardData?.data?.cost || ''}" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded"></div>
                <div><label class="text-[10px] text-gray-400">Resupply Needed</label><input type="text" id="ws-resupply" value="${cardData?.data?.resupply || ''}" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded"></div>
            </div>`;
    } else if (type === 'roster') {
        headerIcon = 'users'; headerColor = 'text-blue-500'; headerTitle = 'SQUAD ACCOUNTABILITY ROSTER';
        formFields = `
            <div class="grid grid-cols-1 gap-4">
                <div><label class="text-[10px] text-gray-400">Squad / Element Name</label><input type="text" id="ws-squad" value="${cardData?.data?.squad || ''}" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded"></div>
                <div><label class="text-[10px] text-gray-400">Personnel Status (Present, Missing, WIA)</label><textarea id="ws-personnel" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded h-24 placeholder-gray-500" placeholder="Alpha 1: Green&#10;Bravo 2: Green">${cardData?.data?.personnel || ''}</textarea></div>
            </div>`;
    } else if (type === 'bragboard') {
        headerIcon = 'camera'; headerColor = 'text-purple-500'; headerTitle = 'MEDIA / BRAG BOARD';
        formFields = `
            <div class="grid grid-cols-1 gap-4">
                <div><label class="text-[10px] text-gray-400">Event / Achievement</label><input type="text" id="ws-event" value="${cardData?.data?.event || ''}" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded"></div>
                <div><label class="text-[10px] text-gray-400">Trophy / Summary</label><textarea id="ws-summary" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded h-24 placeholder-gray-500" placeholder="1000 yard impact on first round cold bore...">${cardData?.data?.summary || ''}</textarea></div>
            </div>`;
    } else if (type === 'journal') {
        headerIcon = 'book-open'; headerColor = 'text-indigo-500'; headerTitle = 'TACTICAL JOURNAL';
        const dNow = new Date().toLocaleString();
        formFields = `
            <div class="grid grid-cols-2 gap-4">
                <div><label class="text-[10px] text-gray-400">Date & Time</label><input type="text" id="ws-j-date" value="${cardData?.data?.date || dNow}" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded"></div>
                <div>
                    <label class="text-[10px] text-gray-400">Entry Type</label>
                    <select id="ws-j-type" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded">
                        <option value="DAILY" ${cardData?.data?.type === 'DAILY' ? 'selected' : ''}>DAILY LOG</option>
                        <option value="WEEKLY" ${cardData?.data?.type === 'WEEKLY' ? 'selected' : ''}>WEEKLY WRAP-UP</option>
                        <option value="MONTHLY" ${cardData?.data?.type === 'MONTHLY' ? 'selected' : ''}>MONTHLY REPORT</option>
                        <option value="AD-HOC" ${cardData?.data?.type === 'AD-HOC' ? 'selected' : ''}>AD-HOC ENTRY</option>
                    </select>
                </div>
                <div class="col-span-2"><label class="text-[10px] text-gray-400">Subject / Title</label><input type="text" id="ws-j-subject" value="${cardData?.data?.subject || ''}" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded"></div>
                <div class="col-span-2"><label class="text-[10px] text-gray-400">Summary (Short)</label><input type="text" id="ws-j-summary" value="${cardData?.data?.summary || ''}" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded"></div>
                <div class="col-span-2"><label class="text-[10px] text-gray-400">Full Entry</label><textarea id="ws-j-entry" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded h-32">${cardData?.data?.entry || ''}</textarea></div>
                <div class="col-span-2"><label class="text-[10px] text-gray-400">Action Items / Follow-ups</label><textarea id="ws-j-action" class="w-full bg-black border border-gray-700 text-white text-xs p-2 rounded h-16">${cardData?.data?.action || ''}</textarea></div>
            </div>`;
    }

    container.innerHTML = `
        <div class="h-full flex flex-col w-full max-w-4xl mx-auto relative overflow-hidden">
            <div class="flex items-center justify-between mb-3 pb-2 border-b border-gray-800 shrink-0 flex-wrap gap-1 bg-slate-950/95 sticky top-0 z-30 pt-1">
                <button type="button" onclick="window.renderWorkstationMenu()" style="color: var(--accent-color, #38bdf8);" class="hover:brightness-150 flex items-center gap-1 text-[10px] uppercase font-bold transition-all cursor-pointer">
                    <i data-lucide="chevron-left" class="w-4 h-4"></i> BACK
                </button>
                <div class="flex items-center gap-1.5">
                    <i data-lucide="${headerIcon}" class="w-4 h-4 ${headerColor}"></i>
                    <h2 class="text-[10px] md:text-xs font-black text-white uppercase tracking-widest truncate">${headerTitle}</h2>
                </div>
                <div class="w-12"></div> <!-- spacer for centering -->
            </div>

            <!-- FORM SCROLL AREA -->
            <div class="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-28">
                <div class="space-y-4">
                    ${formFields}

                    ${type === 'bragboard' ? `
                    <!-- 4-SLOT DUAL-SOURCE BRAG BOARD GRID -->
                    <div class="mt-4 pt-4 border-t border-purple-900/60">
                        <label class="text-[10px] text-purple-400 block mb-2 font-black uppercase tracking-wider flex items-center gap-1.5">
                            <i data-lucide="grid" class="w-4 h-4 text-purple-400"></i> BRAG BOARD COMPOSITE SLOTS (UP TO 4 CARDS / PHOTOS)
                        </label>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            ${[1, 2, 3, 4].map(num => {
                                const slotVal = cardData?.data?.[`slot${num}`] || (num === 1 ? existingImage : '');
                                return `
                                <div class="bg-slate-900 border border-slate-700 rounded-lg p-2.5 flex flex-col justify-between items-center relative shadow">
                                    <span class="text-[9px] font-black text-purple-300 uppercase tracking-widest self-start mb-1">SLOT ${num}</span>
                                    <div id="brag-slot-${num}-preview" class="w-full h-24 bg-black rounded border border-slate-800 overflow-hidden flex items-center justify-center mb-2">
                                        ${slotVal ? `<img src="${slotVal}" class="w-full h-full object-contain">` : `<span class="text-[9px] text-slate-600 font-mono">EMPTY SLOT ${num}</span>`}
                                    </div>
                                    <div class="flex items-center gap-1 w-full flex-wrap">
                                        <button type="button" onclick="window.pickBragVaultCard(${num})" class="flex-1 bg-purple-950 hover:bg-purple-900 border border-purple-600/60 text-purple-200 text-[8px] font-black py-1 px-1.5 rounded uppercase flex items-center justify-center gap-1 cursor-pointer">
                                            <i data-lucide="folder" class="w-3 h-3 text-purple-400"></i> VAULT
                                        </button>
                                        <label class="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-[8px] font-black py-1 px-1.5 rounded uppercase flex items-center justify-center gap-1 cursor-pointer">
                                            <i data-lucide="camera" class="w-3 h-3 text-slate-300"></i> UPLOAD
                                            <input type="file" accept="image/*" class="hidden" onchange="window.handleBragFileUpload(${num}, event)">
                                        </label>
                                        <button type="button" onclick="window.clearBragSlot(${num})" class="bg-red-950 hover:bg-red-900 border border-red-800 text-red-400 text-[8px] font-black p-1 rounded cursor-pointer" title="Clear Slot ${num}">
                                            <i data-lucide="x" class="w-3 h-3"></i>
                                        </button>
                                    </div>
                                    <input type="hidden" id="brag-slot-${num}-data" value="${slotVal}">
                                </div>`;
                            }).join('')}
                        </div>
                    </div>
                    ` : `
                    <!-- Standard Image Attachment UI for non-bragboard forms -->
                    <div class="mt-4 pt-4 border-t border-gray-800">
                        <label class="text-[10px] text-gray-400 block mb-2 font-bold uppercase tracking-wider">Attach Intel Photo</label>
                        <div class="flex items-center gap-4">
                            <label class="cursor-pointer bg-gray-900 border border-gray-700 px-4 py-2 rounded text-xs font-bold text-gray-300 hover:bg-gray-800 hover:text-white transition-colors flex items-center gap-2 shadow">
                                <i data-lucide="camera" class="w-4 h-4"></i> BROWSE
                                <input type="file" accept="image/*" class="hidden" id="ws-image-upload">
                            </label>
                            <div id="ws-image-preview-container" class="${existingImage ? 'block' : 'hidden'} relative w-24 h-24 border border-gray-700 rounded overflow-hidden shadow">
                                <img id="ws-image-preview" ${existingImage ? `src="${existingImage}"` : ''} class="w-full h-full object-cover">
                                <button onclick="clearWsImage()" class="absolute top-1 right-1 bg-red-600 rounded-full p-1 hover:bg-red-500"><i data-lucide="x" class="w-3 h-3 text-white"></i></button>
                            </div>
                        </div>
                        <input type="hidden" id="ws-image-data" value="${existingImage || ''}">
                    </div>
                    `}
                </div>
            </div>

            <!-- STICKY ALWAYS-VISIBLE BOTTOM ACTION BAR -->
            <div class="pt-2.5 pb-3 border-t border-gray-800 grid grid-cols-2 sm:flex sm:justify-between items-center shrink-0 gap-2 bg-slate-950/95 sticky bottom-0 z-30 px-1">
                <button onclick="window.clearWorkstationForm()" class="w-full sm:w-auto bg-red-950/80 hover:bg-red-900 text-red-400 font-black text-[9.5px] sm:text-[10px] uppercase tracking-widest px-3 py-2 rounded transition-all border border-red-800 flex items-center justify-center gap-1.5 cursor-pointer shadow">
                    <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> CLEAR FORM
                </button>
                ${type === 'casefile' ? `
                <button onclick="window.transmitCurrentCaseFileToComms()" class="w-full sm:w-auto bg-purple-950/90 hover:bg-purple-900 border border-purple-500/60 text-purple-300 font-black text-[9.5px] sm:text-[10px] uppercase tracking-widest px-3 py-2 rounded transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow">
                    <i data-lucide="radio" class="w-3.5 h-3.5 text-purple-400"></i> TRANSMIT
                </button>
                <button onclick="window.generateCaseFilePdf()" class="w-full sm:w-auto bg-slate-700 hover:bg-slate-600 text-white font-black text-[9.5px] sm:text-[10px] uppercase tracking-widest px-3 py-2 rounded shadow-[0_0_10px_rgba(255,255,255,0.2)] transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                    <i data-lucide="printer" class="w-3.5 h-3.5"></i> PDF PREVIEW
                </button>
                ` : ''}
                <button onclick="window.saveWorkstationCard('${type}', '${id}')" class="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-black text-[9.5px] sm:text-[10px] uppercase tracking-widest px-4 py-2 rounded shadow-[0_0_10px_rgba(37,99,235,0.5)] transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                    <i data-lucide="save" class="w-3.5 h-3.5"></i> 💾 SAVE CARD
                </button>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    // Attach image upload listener
    const fileInput = document.getElementById('ws-image-upload');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    document.getElementById('ws-image-data').value = ev.target.result;
                    document.getElementById('ws-image-preview').src = ev.target.result;
                    document.getElementById('ws-image-preview-container').classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (type === 'casefile') {
        const cData = cardData?.data || cardData?.casefileData || cardData?.workstationData?.data || cardData?.workstationData?.casefileData || cardData || {};
        window.renderCasefileExhibitsSelector(cData.attachedExhibits);
    }
    } catch(err) {
        console.error('[TRC-WS] Error inside openWorkstationForm:', err);
        if (window.showToast) window.showToast('Error opening form: ' + err.message);
    }
};

window.renderCasefileExhibitsSelector = async function(preselectedIds = null) {
    const listEl = document.getElementById('ws-casefile-exhibits-list');
    if (!listEl) return;

    let vaultItems = [];
    if (window.vaultCache && Array.isArray(window.vaultCache) && window.vaultCache.length > 0) {
        vaultItems = [...window.vaultCache];
    } else if (window.TRC_IDB) {
        try {
            const items = await window.TRC_IDB.getAll('intelVault');
            vaultItems = Object.values(items || {});
        } catch(e) {}
    }

    // Filter out recursive generic PDF placeholders without real image content
    const eligibleItems = vaultItems.filter(v => v && (v.image || v.cardImageUrl || v.imageUrl) && v.type !== 'casefile-pdf');

    if (eligibleItems.length === 0) {
        listEl.innerHTML = `
            <div class="col-span-full py-3 px-2 text-center text-slate-500 font-mono text-[9px] border border-dashed border-slate-800 rounded">
                NO SAVED CARDS / EVIDENCE IN INTEL VAULT (WINDOW #4).<br>
                <span class="text-slate-400">Save Range Cards, Dope Cards, or Snapshots to attach them as Exhibits.</span>
            </div>
        `;
        return;
    }

    listEl.innerHTML = eligibleItems.map((item, idx) => {
        const isChecked = (Array.isArray(preselectedIds) && preselectedIds.length > 0) ? preselectedIds.includes(item.id.toString()) : true;
        const thumb = item.image || item.cardImageUrl || item.imageUrl || '';
        return `
            <div class="bg-slate-900/90 border ${isChecked ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_12px_rgba(6,182,212,0.35)]' : 'border-slate-800'} hover:border-cyan-500 rounded p-2 flex items-center gap-3 transition-all shadow overflow-hidden" style="max-height: 62px;">
                <input type="checkbox" class="ws-casefile-exhibit-checkbox w-4 h-4 accent-cyan-500 rounded cursor-pointer shrink-0" value="${item.id}" ${isChecked ? 'checked' : ''} onchange="this.parentElement.classList.toggle('border-cyan-400', this.checked); this.parentElement.classList.toggle('bg-cyan-950/40', this.checked); this.parentElement.classList.toggle('shadow-[0_0_12px_rgba(6,182,212,0.35)]', this.checked);">
                ${thumb ? `<img src="${thumb}" style="width: 46px !important; height: 46px !important; min-width: 46px !important; min-height: 46px !important; max-width: 46px !important; max-height: 46px !important; object-fit: cover !important; border-radius: 4px; flex-shrink: 0;" class="bg-black border border-slate-700">` : `<div style="width: 46px; height: 46px; min-width: 46px;" class="rounded bg-black border border-slate-700 flex items-center justify-center text-[7px] text-slate-500 shrink-0">NO IMG</div>`}
                <div class="flex-1 min-w-0 cursor-pointer" onclick="const cb = this.parentElement.querySelector('.ws-casefile-exhibit-checkbox'); cb.checked = !cb.checked; cb.dispatchEvent(new Event('change'));">
                    <div class="text-[10px] font-bold text-slate-200 truncate uppercase flex items-center gap-1.5">
                        <span class="text-cyan-400">●</span> ${item.label || item.type || ('EXHIBIT ' + (idx + 1))}
                    </div>
                    <div class="text-[8px] text-slate-400 font-mono">${new Date(item.timestamp || Date.now()).toLocaleDateString()}</div>
                </div>
                <button type="button" onclick="event.stopPropagation(); window.deleteCasefileExhibit('${item.id}')" class="p-1.5 rounded bg-slate-950 hover:bg-amber-900/90 text-amber-400 hover:text-amber-200 border border-slate-800 hover:border-amber-500 transition-all shrink-0 ml-auto cursor-pointer" title="Detach Exhibit">
                    <i data-lucide="link-2-off" class="w-3.5 h-3.5 text-amber-400"></i>
                </button>
            </div>
        `;
    }).join('');
    if (window.lucide) window.lucide.createIcons({ root: listEl });
};

window.deleteCasefileExhibit = function(id) {
    if (!id) return;
    // ONLY uncheck and visually detach the exhibit from this casefile — do NOT delete from IDB
    const cb = document.querySelector(`.ws-casefile-exhibit-checkbox[value="${id}"]`);
    if (cb) {
        cb.checked = false;
        const cardEl = cb.closest('[class*="bg-slate-900"]') || cb.parentElement;
        if (cardEl) {
            cardEl.classList.remove('border-cyan-400', 'bg-cyan-950/40');
            cardEl.classList.add('border-slate-800', 'opacity-40');
        }
    }
    if (window.showToast) window.showToast("Exhibit detached from this invoice.");
};

window.deleteSelectedCasefileExhibits = function() {
    const checked = Array.from(document.querySelectorAll('.ws-casefile-exhibit-checkbox:checked'));
    if (checked.length === 0) {
        if (window.showToast) window.showToast("No exhibits checked to detach.");
        return;
    }
    
    // Only uncheck and dim — do NOT delete from any IDB store
    checked.forEach(cb => {
        cb.checked = false;
        const cardEl = cb.closest('[class*="bg-slate-900"]') || cb.parentElement;
        if (cardEl) {
            cardEl.classList.remove('border-cyan-400', 'bg-cyan-950/40');
            cardEl.classList.add('border-slate-800', 'opacity-40');
        }
    });

    if (window.showToast) window.showToast(`${checked.length} exhibit(s) detached from this invoice.`);
};

window.selectAllCasefileExhibits = function() {
    const cbs = document.querySelectorAll('.ws-casefile-exhibit-checkbox');
    cbs.forEach(c => c.checked = true);
    if (window.showToast) window.showToast(`Selected all ${cbs.length} exhibits.`);
};

window.clearAllCasefileExhibits = function() {
    const cbs = document.querySelectorAll('.ws-casefile-exhibit-checkbox');
    cbs.forEach(c => c.checked = false);
    if (window.showToast) window.showToast(`Cleared all exhibits.`);
};

window.clearWsImage = function() {
    const dataInput = document.getElementById('ws-image-data');
    const prevImg = document.getElementById('ws-image-preview');
    const container = document.getElementById('ws-image-preview-container');
    const uploadInput = document.getElementById('ws-image-upload');
    if (dataInput) dataInput.value = '';
    if (prevImg) prevImg.src = '';
    if (container) container.classList.add('hidden');
    if (uploadInput) uploadInput.value = '';
};

// Brag Board Dual-Source Slot Handlers (Vault Picker & Device Upload)
window.pickBragVaultCard = async function(slotNum) {
    // 1. Synchronously launch modal overlay ON TOP of everything (z-index: 2147483647)
    let modalOverlay = document.getElementById('brag-vault-picker-modal');
    if (modalOverlay) modalOverlay.remove();

    modalOverlay = document.createElement('div');
    modalOverlay.id = 'brag-vault-picker-modal';
    modalOverlay.setAttribute('style', 'position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 2147483647 !important; background: rgba(2, 6, 23, 0.95) !important; backdrop-filter: blur(12px) !important; display: flex !important; align-items: center !important; justify-content: center !important; padding: 1rem !important; pointer-events: auto !important;');
    
    modalOverlay.innerHTML = `
        <div class="bg-slate-950 border-2 border-purple-500 rounded-xl p-4 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl relative" style="z-index: 2147483647;">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2 mb-3 shrink-0">
                <h3 class="text-xs font-black text-purple-300 uppercase tracking-widest flex items-center gap-1.5">
                    <i data-lucide="folder" class="w-4 h-4 text-purple-400"></i> SELECT CARD FOR BRAG SLOT ${slotNum}
                </h3>
                <button onclick="document.getElementById('brag-vault-picker-modal').remove()" class="bg-red-950 hover:bg-red-900 text-red-400 border border-red-800 text-[10px] font-black px-2.5 py-1 rounded uppercase flex items-center gap-1 cursor-pointer">
                    <i data-lucide="x" class="w-3.5 h-3.5"></i> CLOSE
                </button>
            </div>
            <div id="brag-vault-grid-content" class="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 font-mono text-xs">
                <div class="animate-pulse flex flex-col items-center gap-2">
                    <i data-lucide="loader" class="w-8 h-8 text-purple-400 animate-spin"></i>
                    <span>SCANNING INTEL VAULT & WORKSTATION LIBRARIES...</span>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modalOverlay);
    if (window.lucide) window.lucide.createIcons();

    // 2. Gather items safely across all sources
    let vaultItems = [];

    if (window.vaultCache && Array.isArray(window.vaultCache)) {
        vaultItems = [...window.vaultCache];
    }

    const db = window.TRC_IDB || window.idb;
    if (db && typeof db.getAll === 'function') {
        const storesToQuery = ['intelVault', 'workstationLibrary', 'boloLibrary', 'rangeCardProfiles', 'gameTagLibrary', 'licenseLibrary'];
        for (const storeName of storesToQuery) {
            try {
                const storePromise = db.getAll(storeName);
                const timeoutPromise = new Promise(res => setTimeout(() => res(null), 800));
                const storeData = await Promise.race([storePromise, timeoutPromise]);
                if (storeData) {
                    const items = Object.values(storeData);
                    items.forEach(c => {
                        if (c && (c.image || c.imageUrl || c.cardImageUrl || c.workstationData)) {
                            if (!vaultItems.some(v => (v.id && c.id && v.id.toString() === c.id.toString()))) {
                                vaultItems.push(c);
                            }
                        }
                    });
                }
            } catch(e1) {}
        }
    }

    if (typeof getBriefingInventory === 'function') {
        try {
            const briefs = getBriefingInventory();
            if (briefs) {
                Object.values(briefs).forEach(b => {
                    if (b && b.image && !vaultItems.some(v => v.id && b.id && v.id.toString() === b.id.toString())) {
                        vaultItems.push(b);
                    }
                });
            }
        } catch(e2) {}
    }

    const gridContentEl = document.getElementById('brag-vault-grid-content');
    if (!gridContentEl) return;

    if (!vaultItems || vaultItems.length === 0) {
        gridContentEl.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 text-center text-slate-400 font-mono text-xs uppercase space-y-2">
                <i data-lucide="alert-triangle" class="w-8 h-8 text-amber-500 opacity-60"></i>
                <div class="text-white font-bold text-sm">NO SAVED CARDS FOUND IN VAULT</div>
                <div class="text-[10px] text-slate-400 max-w-xs">Save or export cards from Window #6 forms (MEDEVAC, Scorecard, Roster) or Intel Vault first to pick them here!</div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    window.tempBragVaultItems = vaultItems;

    const itemsGridHtml = vaultItems.map((v, idx) => {
        const thumb = v.image || v.imageUrl || v.cardImageUrl || (v.workstationData ? v.workstationData.image : '');
        const label = v.label || v.title || v.name || v.missionName || (v.workstationData ? v.workstationData.title : 'INTEL CARD');
        return `
            <div onclick="window.selectBragVaultCardByIndex(${slotNum}, ${idx})" class="bg-slate-900 border border-slate-700 hover:border-purple-500 rounded-lg p-2 flex flex-col items-center gap-1.5 cursor-pointer hover:bg-slate-800 transition-all group shadow shrink-0">
                <div class="w-full h-24 bg-black rounded overflow-hidden flex items-center justify-center border border-slate-800 pointer-events-none">
                    ${thumb ? `<img src="${thumb}" class="w-full h-full object-contain">` : `<div class="flex flex-col items-center justify-center text-purple-400 p-1"><i data-lucide="image" class="w-6 h-6 mb-1 opacity-60"></i><span class="text-[8px] font-mono text-slate-400">NO PREVIEW</span></div>`}
                </div>
                <span class="text-[9px] font-black text-purple-300 truncate w-full text-center uppercase tracking-wider pointer-events-none">${label}</span>
            </div>
        `;
    }).join('');

    gridContentEl.className = "grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto custom-scrollbar p-1 flex-1";
    gridContentEl.innerHTML = itemsGridHtml;
    if (window.lucide) window.lucide.createIcons();
};

window.selectBragVaultCardByIndex = function(slotNum, idx) {
    const item = window.tempBragVaultItems ? window.tempBragVaultItems[idx] : null;
    if (!item) return;

    const imgSrc = item.image || item.imageUrl || item.cardImageUrl || (item.workstationData ? item.workstationData.image : '');
    if (!imgSrc) {
        alert("Selected item has no visual image snapshot.");
        return;
    }

    const inputData = document.getElementById(`brag-slot-${slotNum}-data`);
    const previewContainer = document.getElementById(`brag-slot-${slotNum}-preview`);

    if (inputData) inputData.value = imgSrc;
    if (previewContainer) {
        previewContainer.innerHTML = `<img src="${imgSrc}" class="w-full h-full object-contain">`;
    }

    const modal = document.getElementById('brag-vault-picker-modal');
    if (modal) modal.remove();

    if (window.pushTacLog) window.pushTacLog(`LOADED INTEL TO BRAG SLOT ${slotNum}`, "SUCCESS");
};

window.selectBragVaultCard = window.selectBragVaultCardByIndex;

window.handleBragFileUpload = function(slotNum, event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const imgSrc = ev.target.result;
            const inputData = document.getElementById(`brag-slot-${slotNum}-data`);
            const previewContainer = document.getElementById(`brag-slot-${slotNum}-preview`);

            if (inputData) inputData.value = imgSrc;
            if (previewContainer) {
                previewContainer.innerHTML = `<img src="${imgSrc}" class="w-full h-full object-contain">`;
            }
        };
        reader.readAsDataURL(file);
    }
};

window.clearBragSlot = function(slotNum) {
    const inputData = document.getElementById(`brag-slot-${slotNum}-data`);
    const previewContainer = document.getElementById(`brag-slot-${slotNum}-preview`);

    if (inputData) inputData.value = '';
    if (previewContainer) {
        previewContainer.innerHTML = `<span class="text-[9px] text-slate-600 font-mono">EMPTY SLOT ${slotNum}</span>`;
    }
};

// Canvas 2D Composite Visual Range Card Generator (Bakes form text fields + attached photo into 1 complete snapshot)
window.generateWorkstationCompositeCard = async function(type, title, data, attachedPhotoUrl) {
    return new Promise(async (resolve) => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 1200;
            canvas.height = 700;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            let accentColor = '#3b82f6';
            if (type === 'medevac') accentColor = '#ef4444';
            else if (type === 'scorecard') accentColor = '#eab308';
            else if (type === 'casefile') accentColor = '#cbd5e1';
            else if (type === 'logistics') accentColor = '#10b981';
            else if (type === 'roster') accentColor = '#3b82f6';
            else if (type === 'bragboard') accentColor = '#a855f7';
            else if (type === 'journal') accentColor = '#6366f1';

            // Background & Border
            ctx.fillStyle = '#090d16';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = accentColor;
            ctx.lineWidth = 6;
            ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);

            // Header Banner
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(6, 6, canvas.width - 12, 50);
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(6, 56); ctx.lineTo(canvas.width - 6, 56); ctx.stroke();

            ctx.fillStyle = accentColor;
            ctx.font = 'bold 20px monospace';
            ctx.fillText((title || type).toUpperCase(), 20, 38);

            const timestampStr = new Date().toLocaleString();
            ctx.fillStyle = '#94a3b8';
            ctx.font = '12px monospace';
            ctx.fillText(timestampStr, canvas.width - 230, 36);

            // Check attached photo presence
            const hasPhoto = Boolean(attachedPhotoUrl && typeof attachedPhotoUrl === 'string' && attachedPhotoUrl.startsWith('data:image'));
            
            let y = 85;
            const drawField = (label, val) => {
                if (y > canvas.height - 30) return;
                ctx.fillStyle = accentColor;
                ctx.font = 'bold 12px monospace';
                ctx.fillText(label.toUpperCase(), 20, y);
                y += 18;

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 15px sans-serif';
                const lines = String(val || 'N/A').split('\n');
                lines.forEach(l => {
                    if (y > canvas.height - 20) return;
                    ctx.fillText(l.slice(0, hasPhoto ? 35 : 65), 20, y);
                    y += 22;
                });
                y += 10;
            };

            if (type === 'medevac') {
                drawField('Location', data.loc);
                drawField('Freq / Callsign', data.freq);
                drawField('Patients by Precedence', data.prec);
                drawField('Special Equipment', data.equip);
                drawField('Incident Details', data.details);
            } else if (type === 'scorecard') {
                drawField('Match / Stage Name', data.match);
                drawField('Total Time', data.time);
                drawField('Hits / Points', data.hits);
                drawField('Penalties', data.penalties);
                drawField('Stage Notes', data.notes);
            } else if (type === 'casefile') {
                // Top Status Stamp
                const isPaid = data.status === 'PAID' || data.is_paid === true;
                ctx.fillStyle = isPaid ? '#10b981' : '#f59e0b';
                ctx.font = 'black 14px monospace';
                ctx.fillText(`STATUS: [${isPaid ? '✔ PAID IN FULL' : '⏳ UNPAID / PENDING'}]`, 20, y);
                y += 24;

                drawField('Case / Invoice #', data.case_number || 'INV-PENDING');
                drawField('Billed To (Client)', data.billed_to);
                drawField('Paid By (Method)', data.paid_by);
                drawField('Lead Operator', `${data.op_name || 'N/A'} [${data.op_agency || 'APEX TACTICAL'}]`);
                drawField('Services Performed', data.services_performed);
                
                const bVal = window.parseCurrencyValue(data.bounty);
                const eVal = window.parseCurrencyValue(data.expenses);
                const tVal = (bVal + eVal).toFixed(2);
                drawField('Financial Balance', `Bounty: $${bVal.toFixed(2)} | Exp: $${eVal.toFixed(2)} | TOTAL: $${tVal}`);
                drawField('Payment Notes', data.invoice_notes);
            } else if (type === 'logistics') {
                drawField('Ammo Expended', data.ammo);
                drawField('Gear Damaged/Lost', data.gear);
                drawField('Total Cost Estimate', data.cost);
                drawField('Resupply Needed', data.resupply);
            } else if (type === 'roster') {
                drawField('Squad / Element Name', data.squad);
                drawField('Personnel Status', data.personnel);
            } else if (type === 'bragboard') {
                drawField('Event / Achievement', data.event);
                drawField('Trophy Summary', data.summary);
            } else if (type === 'journal') {
                drawField('Date & Time', data.date);
                drawField('Entry Type', data.type);
                drawField('Subject / Title', data.subject);
                drawField('Summary', data.summary);
                drawField('Full Entry', data.entry);
                drawField('Action Items', data.action);
            }

            if (type === 'bragboard') {
                const slotImgs = [
                    data.slot1, data.slot2, data.slot3, data.slot4
                ].filter(s => Boolean(s && typeof s === 'string' && s.startsWith('data:image')));

                if (slotImgs.length > 0) {
                    const loadedImages = await Promise.all(slotImgs.map(src => new Promise(res => {
                        const img = new Image();
                        img.crossOrigin = 'Anonymous';
                        img.onload = () => res(img);
                        img.onerror = () => res(null);
                        img.src = src;
                    })));

                    const validImgs = loadedImages.filter(Boolean);
                    if (validImgs.length > 0) {
                        const px = 430, py = 75, pw = 350, ph = 490;
                        ctx.fillStyle = '#020617';
                        ctx.fillRect(px, py, pw, ph);
                        ctx.strokeStyle = '#1e293b';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(px, py, pw, ph);

                        ctx.fillStyle = '#c084fc';
                        ctx.font = 'bold 11px monospace';
                        ctx.fillText(`MEDIA BRAG BOARD (${validImgs.length} CARDS/PHOTOS)`, px + 15, py + 22);

                        if (validImgs.length === 1) {
                            const img = validImgs[0];
                            const ratio = Math.min((pw - 20) / img.width, (ph - 40) / img.height);
                            const nw = img.width * ratio, nh = img.height * ratio;
                            ctx.drawImage(img, px + 10 + ((pw - 20) - nw)/2, py + 30 + ((ph - 40) - nh)/2, nw, nh);
                        } else if (validImgs.length === 2) {
                            const subH = (ph - 45) / 2;
                            validImgs.forEach((img, idx) => {
                                const sy = py + 30 + idx * (subH + 5);
                                const ratio = Math.min((pw - 20) / img.width, subH / img.height);
                                const nw = img.width * ratio, nh = img.height * ratio;
                                ctx.drawImage(img, px + 10 + ((pw - 20) - nw)/2, sy + (subH - nh)/2, nw, nh);
                            });
                        } else {
                            const subW = (pw - 25) / 2;
                            const subH = (ph - 45) / 2;
                            validImgs.slice(0, 4).forEach((img, idx) => {
                                const col = idx % 2;
                                const row = Math.floor(idx / 2);
                                const sx = px + 10 + col * (subW + 5);
                                const sy = py + 30 + row * (subH + 5);
                                const ratio = Math.min(subW / img.width, subH / img.height);
                                const nw = img.width * ratio, nh = img.height * ratio;
                                ctx.drawImage(img, sx + (subW - nw)/2, sy + (subH - nh)/2, nw, nh);
                            });
                        }
                        resolve(canvas.toDataURL('image/jpeg', 0.85));
                        return;
                    }
                }
            }

            if (type === 'casefile') {
                let exhibitImgs = [];
                if (Array.isArray(data.exhibitImages) && data.exhibitImages.length > 0) {
                    exhibitImgs = [...data.exhibitImages];
                }
                const attachedIds = Array.isArray(data.attachedExhibits) ? data.attachedExhibits : [];

                if (window.vaultCache && exhibitImgs.length < attachedIds.length) {
                    attachedIds.forEach(id => {
                        const found = window.vaultCache.find(v => v && (v.id == id || v.id == id.toString()));
                        const src = found?.image || found?.cardImageUrl || found?.imageUrl;
                        if (src && typeof src === 'string' && (src.startsWith('data:image') || src.startsWith('blob:') || src.startsWith('http')) && !exhibitImgs.includes(src)) {
                            exhibitImgs.push(src);
                        }
                    });
                }

                if (window.TRC_IDB && exhibitImgs.length < attachedIds.length) {
                    const stores = ['intelVault', 'gameTagLibrary', 'licenseLibrary', 'boloLibrary', 'workstationLibrary'];
                    for (const id of attachedIds) {
                        for (const s of stores) {
                            try {
                                const item = await window.TRC_IDB.get(s, id.toString()) || await window.TRC_IDB.get(s, parseInt(id));
                                const src = item?.image || item?.cardImageUrl || item?.imageUrl;
                                if (src && typeof src === 'string' && (src.startsWith('data:image') || src.startsWith('blob:') || src.startsWith('http')) && !exhibitImgs.includes(src)) {
                                    exhibitImgs.push(src);
                                }
                            } catch(eDb) {}
                        }
                    }
                }

                if (hasPhoto && !exhibitImgs.includes(attachedPhotoUrl)) {
                    exhibitImgs.unshift(attachedPhotoUrl);
                }

                if (exhibitImgs.length > 0) {
                    const loadedImages = await Promise.all(exhibitImgs.slice(0, 4).map(src => new Promise(res => {
                        const img = new Image();
                        img.crossOrigin = 'Anonymous';
                        img.onload = () => res(img);
                        img.onerror = () => res(null);
                        img.src = src;
                    })));

                    const validImgs = loadedImages.filter(Boolean);
                    if (validImgs.length > 0) {
                        const px = 430, py = 75, pw = 350, ph = 490;
                        ctx.fillStyle = '#020617';
                        ctx.fillRect(px, py, pw, ph);
                        ctx.strokeStyle = '#38bdf8';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(px, py, pw, ph);

                        ctx.fillStyle = '#38bdf8';
                        ctx.font = 'bold 11px monospace';
                        ctx.fillText(`ATTACHED EVIDENCE EXHIBIT (${validImgs.length})`, px + 15, py + 22);

                        if (validImgs.length === 1) {
                            const img = validImgs[0];
                            const ratio = Math.min((pw - 20) / img.width, (ph - 40) / img.height);
                            const nw = img.width * ratio, nh = img.height * ratio;
                            ctx.drawImage(img, px + 10 + ((pw - 20) - nw)/2, py + 30 + ((ph - 40) - nh)/2, nw, nh);
                        } else if (validImgs.length === 2) {
                            const subH = (ph - 45) / 2;
                            validImgs.forEach((img, idx) => {
                                const sy = py + 30 + idx * (subH + 5);
                                const ratio = Math.min((pw - 20) / img.width, subH / img.height);
                                const nw = img.width * ratio, nh = img.height * ratio;
                                ctx.drawImage(img, px + 10 + ((pw - 20) - nw)/2, sy + (subH - nh)/2, nw, nh);
                            });
                        } else {
                            const subW = (pw - 25) / 2;
                            const subH = (ph - 45) / 2;
                            validImgs.slice(0, 4).forEach((img, idx) => {
                                const col = idx % 2;
                                const row = Math.floor(idx / 2);
                                const sx = px + 10 + col * (subW + 5);
                                const sy = py + 30 + row * (subH + 5);
                                const ratio = Math.min(subW / img.width, subH / img.height);
                                const nw = img.width * ratio, nh = img.height * ratio;
                                ctx.drawImage(img, sx + (subW - nw)/2, sy + (subH - nh)/2, nw, nh);
                            });
                        }
                        resolve(canvas.toDataURL('image/jpeg', 0.85));
                        return;
                    }
                }
            }

            if (hasPhoto) {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => {
                    try {
                        const px = 450, py = 75, pw = 330, ph = 490;
                        ctx.fillStyle = '#020617';
                        ctx.fillRect(px, py, pw, ph);
                        ctx.strokeStyle = '#1e293b';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(px, py, pw, ph);

                        ctx.fillStyle = '#64748b';
                        ctx.font = 'bold 11px monospace';
                        ctx.fillText('ATTACHED INTEL PHOTO', px + 15, py + 22);

                        let iw = img.width || 300, ih = img.height || 200;
                        const maxW = pw - 20, maxH = ph - 40;
                        const ratio = Math.min(maxW / iw, maxH / ih);
                        const nw = iw * ratio, nh = ih * ratio;
                        const nx = px + 10 + (maxW - nw) / 2;
                        const ny = py + 30 + (maxH - nh) / 2;

                        ctx.drawImage(img, nx, ny, nw, nh);
                    } catch(e) {}
                    resolve(canvas.toDataURL('image/jpeg', 0.85));
                };
                img.onerror = () => resolve(canvas.toDataURL('image/jpeg', 0.85));
                img.src = attachedPhotoUrl;
            } else {
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            }
        } catch(e) {
            resolve(attachedPhotoUrl || '');
        }
    });
};

window.saveWorkstationCard = async function(type, id) {
    let data = {};
    let title = '';

    if (type === 'medevac') {
        data = {
            loc: document.getElementById('ws-loc')?.value || '',
            freq: document.getElementById('ws-freq')?.value || '',
            prec: document.getElementById('ws-prec')?.value || '',
            equip: document.getElementById('ws-equip')?.value || '',
            details: document.getElementById('ws-details')?.value || ''
        };
        title = "MEDEVAC: " + (data.loc || 'UNTITLED');
    } else if (type === 'scorecard') {
        data = {
            match: document.getElementById('ws-match')?.value || '',
            time: document.getElementById('ws-time')?.value || '',
            hits: document.getElementById('ws-hits')?.value || '',
            penalties: document.getElementById('ws-penalties')?.value || '',
            notes: document.getElementById('ws-notes')?.value || ''
        };
        title = "SCORECARD: " + (data.match || 'UNTITLED');
    } else if (type === 'casefile') {
        const isPaidChecked = document.getElementById('ws-status-paid')?.checked;
        let checkedExhibits = Array.from(document.querySelectorAll('.ws-casefile-exhibit-checkbox:checked')).map(cb => cb.value);
        if (checkedExhibits.length === 0) {
            checkedExhibits = Array.from(document.querySelectorAll('.ws-casefile-exhibit-checkbox')).map(cb => cb.value);
        }
        let exhibitImages = [];
        if (window.vaultCache) {
            checkedExhibits.forEach(eid => {
                const found = window.vaultCache.find(v => v && (v.id == eid || v.id == eid.toString()));
                const src = found?.image || found?.cardImageUrl || found?.imageUrl;
                if (src && typeof src === 'string') exhibitImages.push(src);
            });
        }
        if (window.TRC_IDB && exhibitImages.length < checkedExhibits.length) {
            const stores = ['intelVault', 'gameTagLibrary', 'licenseLibrary', 'boloLibrary', 'workstationLibrary'];
            for (const eid of checkedExhibits) {
                for (const s of stores) {
                    try {
                        const item = await window.TRC_IDB.get(s, eid.toString()) || await window.TRC_IDB.get(s, parseInt(eid));
                        const src = item?.image || item?.cardImageUrl || item?.imageUrl;
                        if (src && typeof src === 'string' && !exhibitImages.includes(src)) exhibitImages.push(src);
                    } catch(e) {}
                }
            }
        }

        data = {
            op_name: document.getElementById('ws-op_name')?.value || '',
            op_agency: document.getElementById('ws-op_agency')?.value || '',
            op_license: document.getElementById('ws-op_license')?.value || '',
            op_quals: document.getElementById('ws-op_quals')?.value || '',
            billed_to: document.getElementById('ws-billed_to')?.value || '',
            paid_by: document.getElementById('ws-paid_by')?.value || '',
            case_number: document.getElementById('ws-case_number')?.value || '',
            invoice_type: document.getElementById('ws-invoice_type')?.value || '',
            services_performed: document.getElementById('ws-services_performed')?.value || '',
            status: isPaidChecked ? 'PAID' : 'UNPAID',
            is_paid: !!isPaidChecked,
            bounty: document.getElementById('ws-bounty')?.value || '',
            expenses: document.getElementById('ws-expenses')?.value || '',
            invoice_notes: document.getElementById('ws-invoice_notes')?.value || '',
            mainAttachedImage: document.getElementById('ws-image-data')?.value || '',
            attachedExhibits: checkedExhibits,
            exhibitImages: exhibitImages
        };
        title = "INVOICE / CASE: " + (data.case_number || data.billed_to || data.op_name || 'UNTITLED');
    } else if (type === 'logistics') {
        data = {
            ammo: document.getElementById('ws-ammo')?.value || '',
            gear: document.getElementById('ws-gear')?.value || '',
            cost: document.getElementById('ws-cost')?.value || '',
            resupply: document.getElementById('ws-resupply')?.value || ''
        };
        title = "LOGISTICS: " + new Date().toLocaleDateString();
    } else if (type === 'roster') {
        data = {
            squad: document.getElementById('ws-squad')?.value || '',
            personnel: document.getElementById('ws-personnel')?.value || ''
        };
        title = "ROSTER: " + (data.squad || 'UNTITLED');
    } else if (type === 'bragboard') {
        data = {
            event: document.getElementById('ws-event')?.value || '',
            summary: document.getElementById('ws-summary')?.value || '',
            slot1: document.getElementById('brag-slot-1-data')?.value || '',
            slot2: document.getElementById('brag-slot-2-data')?.value || '',
            slot3: document.getElementById('brag-slot-3-data')?.value || '',
            slot4: document.getElementById('brag-slot-4-data')?.value || ''
        };
        title = "BRAG BOARD: " + (data.event || 'UNTITLED');
    } else if (type === 'journal') {
        data = {
            date: document.getElementById('ws-j-date')?.value || '',
            type: document.getElementById('ws-j-type')?.value || 'DAILY',
            subject: document.getElementById('ws-j-subject')?.value || '',
            summary: document.getElementById('ws-j-summary')?.value || '',
            entry: document.getElementById('ws-j-entry')?.value || '',
            action: document.getElementById('ws-j-action')?.value || ''
        };
        title = "JOURNAL (" + data.type + "): " + (data.subject || 'UNTITLED');
    }

    // Generate full high-contrast composite visual Range Card snapshot combining text fields AND attached photo
    const attachedPhoto = document.getElementById('ws-image-data')?.value || '';
    if (data) data.attachedPhoto = attachedPhoto;
    const compositeImage = await window.generateWorkstationCompositeCard(type, title, data, attachedPhoto);

    const cardData = {
        id: id,
        type: type,
        title: title,
        timestamp: new Date().toISOString(),
        data: data,
        image: compositeImage
    };

    try {
        await window.TRC_IDB.set('workstationLibrary', cardData.id, cardData);

        // Auto-sync into Intel Vault (Window #4)
        const vaultMetadata = {
            id: cardData.id,
            timestamp: Date.now(),
            label: cardData.title,
            image: cardData.image || '',
            type: type === 'casefile' ? 'casefile-pdf' : 'workstation',
            workstationData: cardData,
            casefileData: type === 'casefile' ? cardData.data : null
        };
        await window.TRC_IDB.set('intelVault', cardData.id.toString(), vaultMetadata);
        if (typeof vaultCache !== 'undefined' && Array.isArray(vaultCache)) {
            vaultCache = vaultCache.filter(v => v && v.id?.toString() !== cardData.id.toString() && v.label !== cardData.title && v.label !== `WORKSTATION: ${cardData.title}`);
            vaultCache.unshift(vaultMetadata);
            if (typeof refreshVaultGrid === 'function') refreshVaultGrid();
        }

        window.pushTacLog("WORKSTATION CARD SAVED & SYNCED TO VAULT", "SUCCESS");
        if (window.showToast) window.showToast('💾 Card Saved & Synced to Intel Vault!');
        renderWorkstationMenu();
    } catch (e) {
        console.error("Failed to save workstation card:", e);
        alert('Failed to save card. See console for details.');
    }
};

window.loadWorkstationCard = async function(id) {
    if (!id) return;
    try {
        let card = null;
        if (window.TRC_IDB) {
            const intId = parseInt(id);
            if (!isNaN(intId)) card = await window.TRC_IDB.get('workstationLibrary', intId);
            if (!card) card = await window.TRC_IDB.get('workstationLibrary', id.toString());
        }
        if (!card && window.vaultCache) {
            const vaultItem = window.vaultCache.find(v => v.id == id || v.id == parseInt(id) || v.id == id.toString());
            if (vaultItem) card = vaultItem.workstationData || vaultItem;
        }
        if (!card && window.TRC_IDB) {
            const vaultCard = await window.TRC_IDB.get('intelVault', id.toString());
            if (vaultCard) card = vaultCard.workstationData || vaultCard;
        }
        if (card) {
            const actualCard = card.workstationData || card;
            const cardType = actualCard.type || 'medevac';
            openWorkstationForm(cardType, actualCard);
        } else {
            console.warn("Card not found in workstationLibrary or intelVault for ID:", id);
        }
    } catch(e) {
        console.error("Failed to load card", e);
    }
};

window.loadWorkstationBackToEditorById = async function(id) {
    if (typeof window.toggleFullscreen === 'function') {
        const panel = document.getElementById('panel-workstation');
        if (panel && !panel.classList.contains('is-maximized')) {
            window.toggleFullscreen('panel-workstation');
        }
    }
    const vaultModal = document.getElementById('vault-modal-overlay');
    if (vaultModal) vaultModal.classList.add('hidden');
    
    const checkedBoxes = document.querySelectorAll('.vault-export-checkbox:checked');
    checkedBoxes.forEach(cb => cb.checked = false);

    await window.loadWorkstationCard(id);
};

window.clearWorkstationForm = function() {
    const container = document.getElementById('workstation-container');
    if (!container) return;
    const textInputs = container.querySelectorAll('input[type="text"], input[inputmode="decimal"], textarea, select');
    textInputs.forEach(input => input.value = '');
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = false;
        if (cb.parentElement) {
            cb.parentElement.classList.remove('border-cyan-400', 'bg-cyan-950/40', 'shadow-[0_0_12px_rgba(6,182,212,0.35)]');
        }
    });
    const unpaidRadio = document.getElementById('ws-status-unpaid');
    if (unpaidRadio) unpaidRadio.checked = true;
    const paidRadio = document.getElementById('ws-status-paid');
    if (paidRadio) paidRadio.checked = false;
    const counter = document.getElementById('ws-invoice-notes-counter');
    if (counter) counter.textContent = '0 / 1000';
    if (typeof window.clearWsImage === 'function') window.clearWsImage();
    if (window.renderCasefileExhibitsSelector) window.renderCasefileExhibitsSelector([]);
    if (window.showToast) window.showToast('🧹 Form completely cleared!');
};

window.deleteWorkstationCard = async function(id) {
    if (!confirm('Are you sure you want to permanently delete this card?')) return;
    
    if (window.TRC_IDB) {
        await window.TRC_IDB.delete('workstationLibrary', parseInt(id));
        await window.TRC_IDB.delete('workstationLibrary', id.toString());
        await window.TRC_IDB.delete('intelVault', parseInt(id));
        await window.TRC_IDB.delete('intelVault', id.toString());
    }

    if (typeof vaultCache !== 'undefined' && Array.isArray(vaultCache)) {
        const vaultIdx = vaultCache.findIndex(v => v && (v.id == id || v.id == id.toString()));
        if (vaultIdx !== -1) {
            vaultCache.splice(vaultIdx, 1);
            if (typeof refreshVaultGrid === 'function') refreshVaultGrid();
        }
    }
    
    window.renderWorkstationMenu();
    if (window.showToast) window.showToast('🗑️ Card permanently deleted.');
};

window.checkWsCheckboxes = function() {
    const checked = document.querySelectorAll('.ws-library-checkbox:checked');
    const btn = document.getElementById('ws-brag-btn');
    const countSpan = document.getElementById('ws-brag-count');
    
    if (checked.length > 0) {
        if(btn) {
            btn.classList.remove('hidden');
            btn.classList.add('flex');
        }
        if (countSpan) countSpan.textContent = checked.length;
    } else {
        if(btn) {
            btn.classList.add('hidden');
            btn.classList.remove('flex');
        }
    }
};

window.openBragBoardStudio = async function() {
    const checked = document.querySelectorAll('.ws-library-checkbox:checked');
    if (checked.length === 0) return;
    if (checked.length > 4) {
        alert("Maximum 4 cards allowed for Brag Board collage.");
        return;
    }
    
    const selectedIds = Array.from(checked).map(cb => parseInt(cb.value));
    
    let selectedCards = [];
    if (window.TRC_IDB) {
        for (const id of selectedIds) {
            const card = await window.TRC_IDB.get('workstationLibrary', id);
            if (card) selectedCards.push(card);
        }
    }
    
    checked.forEach(cb => cb.checked = false);
    window.checkWsCheckboxes();
    
    const container = document.getElementById('workstation-container');
    if (!container) return;
    
    let collageHtml = '';
    const count = selectedCards.length;
    
    if (count === 1) {
        collageHtml = `<div class="w-full h-[300px] bg-black rounded overflow-hidden">${selectedCards[0].image ? `<img src="${selectedCards[0].image}" class="w-full h-full object-contain">` : `<div class="w-full h-full flex items-center justify-center text-gray-700 font-bold">${selectedCards[0].title || 'NO IMAGE'}</div>`}</div>`;
    } else if (count === 2) {
        collageHtml = `
            <div class="grid grid-cols-2 gap-1 w-full h-[300px] bg-black p-1 rounded overflow-hidden">
                <div class="bg-gray-900 h-full flex items-center justify-center">${selectedCards[0].image ? `<img src="${selectedCards[0].image}" class="w-full h-full object-cover">` : '<span class="text-xs text-gray-600 font-bold">NO IMAGE</span>'}</div>
                <div class="bg-gray-900 h-full flex items-center justify-center">${selectedCards[1].image ? `<img src="${selectedCards[1].image}" class="w-full h-full object-cover">` : '<span class="text-xs text-gray-600 font-bold">NO IMAGE</span>'}</div>
            </div>`;
    } else if (count === 3) {
        collageHtml = `
            <div class="grid grid-rows-2 gap-1 w-full h-[350px] bg-black p-1 rounded overflow-hidden">
                <div class="bg-gray-900 w-full h-full flex items-center justify-center">${selectedCards[0].image ? `<img src="${selectedCards[0].image}" class="w-full h-full object-cover">` : '<span class="text-xs text-gray-600 font-bold">NO IMAGE</span>'}</div>
                <div class="grid grid-cols-2 gap-1 w-full h-full">
                    <div class="bg-gray-900 h-full flex items-center justify-center">${selectedCards[1].image ? `<img src="${selectedCards[1].image}" class="w-full h-full object-cover">` : '<span class="text-xs text-gray-600 font-bold">NO IMAGE</span>'}</div>
                    <div class="bg-gray-900 h-full flex items-center justify-center">${selectedCards[2].image ? `<img src="${selectedCards[2].image}" class="w-full h-full object-cover">` : '<span class="text-xs text-gray-600 font-bold">NO IMAGE</span>'}</div>
                </div>
            </div>`;
    } else if (count === 4) {
        collageHtml = `
            <div class="grid grid-cols-2 grid-rows-2 gap-1 w-full h-[400px] bg-black p-1 rounded overflow-hidden">
                <div class="bg-gray-900 h-full flex items-center justify-center">${selectedCards[0].image ? `<img src="${selectedCards[0].image}" class="w-full h-full object-cover">` : '<span class="text-xs text-gray-600 font-bold">NO IMAGE</span>'}</div>
                <div class="bg-gray-900 h-full flex items-center justify-center">${selectedCards[1].image ? `<img src="${selectedCards[1].image}" class="w-full h-full object-cover">` : '<span class="text-xs text-gray-600 font-bold">NO IMAGE</span>'}</div>
                <div class="bg-gray-900 h-full flex items-center justify-center">${selectedCards[2].image ? `<img src="${selectedCards[2].image}" class="w-full h-full object-cover">` : '<span class="text-xs text-gray-600 font-bold">NO IMAGE</span>'}</div>
                <div class="bg-gray-900 h-full flex items-center justify-center">${selectedCards[3].image ? `<img src="${selectedCards[3].image}" class="w-full h-full object-cover">` : '<span class="text-xs text-gray-600 font-bold">NO IMAGE</span>'}</div>
            </div>`;
    }

    container.innerHTML = `
        <div class="h-full flex flex-col w-full max-w-4xl mx-auto">
            <div class="flex items-center justify-between mb-4 pb-2 border-b border-gray-800 shrink-0">
                <button type="button" onclick="window.renderWorkstationMenu()" class="text-gray-400 hover:text-white flex items-center gap-1 text-[10px] uppercase font-bold transition-colors cursor-pointer">
                    <i data-lucide="chevron-left" class="w-4 h-4"></i> BACK
                </button>
                <div class="flex items-center gap-2">
                    <i data-lucide="camera" class="w-5 h-5 text-purple-500"></i>
                    <h2 class="text-[10px] md:text-sm font-black text-white uppercase tracking-widest">BRAG BOARD COMPILER</h2>
                </div>
                <div class="w-16"></div>
            </div>

            <div class="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col items-center">
                <div id="brag-board-preview-container" class="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-[0_0_30px_rgba(0,0,0,0.8)] relative">
                    <div class="absolute top-0 right-0 p-2 opacity-50"><i data-lucide="crosshair" class="w-10 h-10 text-white"></i></div>
                    
                    <!-- Header -->
                    <div class="flex items-end justify-between mb-3 pb-2 border-b border-gray-700">
                        <div>
                            <div class="text-[10px] text-gray-400 font-bold tracking-[0.2em] mb-1">TACTICAL BRAG BOARD</div>
                            <div class="text-sm font-black text-purple-400 uppercase"><i data-lucide="user" class="w-4 h-4 inline pb-0.5"></i> ${window.userObj?.callsign || 'OPERATOR'}</div>
                        </div>
                        <div class="text-[10px] text-gray-400 text-right">${new Date().toLocaleString()}</div>
                    </div>
                    
                    <!-- Dynamic Collage -->
                    ${collageHtml}

                    <!-- User Summary Input Overlay -->
                    <div class="mt-3">
                        <textarea id="brag-board-summary-input" class="w-full bg-black/50 border border-gray-800 rounded text-xs text-gray-300 p-3 h-24 focus:border-purple-500 focus:outline-none transition-colors placeholder-gray-500" placeholder="Type your AAR, notes, or master summary here..."></textarea>
                    </div>
                </div>
            </div>

            <div class="mt-4 pt-4 border-t border-gray-800 flex justify-end shrink-0 gap-3">
                <button onclick="window.saveBragBoardToVault()" id="btn-save-bragboard" class="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest px-6 py-2.5 rounded shadow-[0_0_10px_rgba(37,99,235,0.5)] transition-all flex items-center gap-2">
                    <i data-lucide="save" class="w-4 h-4"></i> SNAPSHOT TO VAULT
                </button>
            </div>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();
};

window.saveBragBoardToVault = async function() {
    const summary = document.getElementById('brag-board-summary-input').value;
    const container = document.getElementById('brag-board-preview-container');
    const btn = document.getElementById('btn-save-bragboard');
    
    if (typeof html2canvas !== 'undefined' && container) {
        if(btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> SAVING...'; }
        try {
            // Need to momentarily un-focus the textarea so cursor doesn't capture
            document.activeElement.blur();
            // Optional: style textarea to look like flat text for the screenshot
            const ta = document.getElementById('brag-board-summary-input');
            if (ta) {
                ta.style.border = 'none';
                ta.style.backgroundColor = 'transparent';
                ta.style.resize = 'none';
            }

            const canvas = await html2canvas(container, {
                backgroundColor: '#111827',
                scale: 1.5,
                logging: false,
                useCORS: true
            });
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            
            const cardData = {
                id: Date.now(),
                timestamp: Date.now(),
                type: 'bragboard',
                title: 'BRAG BOARD',
                image: dataUrl,
                data: {
                    event: 'Brag Board Compilation',
                    summary: summary
                }
            };
            
            // Save to Workstation Library
            if (window.TRC_IDB) {
                await window.TRC_IDB.set('workstationLibrary', cardData.id, cardData);
            }
            
            // Save to Vault
            let vaultMetadata = {
                id: cardData.id,
                timestamp: cardData.timestamp,
                image: cardData.image || '',
                label: `WORKSTATION: ${cardData.title}`,
                type: 'workstation',
                workstationData: cardData
            };
            
            if (typeof vaultCache !== 'undefined') {
                vaultCache.unshift(vaultMetadata);
                if (window.TRC_IDB) await window.TRC_IDB.set('intelVault', vaultMetadata.id.toString(), vaultMetadata);
                if (typeof refreshVaultGrid === 'function') refreshVaultGrid();
            }
            
            if (typeof pushTacLog === 'function') pushTacLog(`BRAG BOARD SECURED IN VAULT`, 'SUCCESS');
            window.renderWorkstationMenu();
            
        } catch (e) {
            console.error("Html2Canvas failed for brag board", e);
            if (typeof pushTacLog === 'function') pushTacLog(`BRAG BOARD SNAPSHOT FAILED`, 'ERROR');
            if(btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> SNAPSHOT TO VAULT'; }
        }
    } else {
        alert("Html2canvas is not loaded. Cannot snapshot Brag Board.");
    }
};



// ============================================================
// EXECUTIVE CASE FILE PDF GENERATOR
// ============================================================
window.generateCaseFilePdf = async function() {
    try {

    // 1. Gather form data
    const op_name = document.getElementById('ws-op_name')?.value || 'UNKNOWN';
    const op_agency = document.getElementById('ws-op_agency')?.value || 'N/A';
    const op_license = document.getElementById('ws-op_license')?.value || 'N/A';
    const op_quals = document.getElementById('ws-op_quals')?.value || 'N/A';
    const billed_to = document.getElementById('ws-billed_to')?.value || 'N/A';
    const paid_by = document.getElementById('ws-paid_by')?.value || 'N/A';
    const case_number = document.getElementById('ws-case_number')?.value || 'N/A';
    const invoice_type = document.getElementById('ws-invoice_type')?.value || 'N/A';
    const services_performed = document.getElementById('ws-services_performed')?.value || '';
    const isPaidChecked = document.getElementById('ws-status-paid')?.checked;
    const status = isPaidChecked ? 'PAID' : 'UNPAID';
    const bountyStr = document.getElementById('ws-bounty')?.value || '0';
    const expensesStr = document.getElementById('ws-expenses')?.value || '0';
    const invoiceNotes = document.getElementById('ws-invoice_notes')?.value || '';
    const mainAttachedImage = document.getElementById('ws-image-data')?.value || '';
    
    const bounty = window.parseCurrencyValue(bountyStr);
    const expenses = window.parseCurrencyValue(expensesStr);
    const total = bounty + expenses;

    // 2. Fetch Attached Exhibits & Evidence
    let vaultItems = [];
    const wsCheckedBoxes = document.querySelectorAll('.ws-casefile-exhibit-checkbox:checked');
    const selectedIds = Array.from(wsCheckedBoxes).map(cb => cb.value);

    if (window.vaultCache && window.vaultCache.length > 0) {
        vaultItems = window.vaultCache.filter(v => v && selectedIds.includes(v.id?.toString()));
    }
    if (window.TRC_IDB && vaultItems.length < selectedIds.length) {
        const stores = ['intelVault', 'gameTagLibrary', 'licenseLibrary', 'boloLibrary', 'workstationLibrary'];
        for (const sid of selectedIds) {
            for (const s of stores) {
                try {
                    const item = await window.TRC_IDB.get(s, sid) || await window.TRC_IDB.get(s, parseInt(sid));
                    if (item && !vaultItems.some(v => v && v.id == item.id)) vaultItems.push(item);
                } catch(e) {}
            }
        }
    }
    
    // Sort vault items by timestamp
    vaultItems.sort((a,b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
    const exhibitImages = vaultItems.map(v => v.image || v.cardImageUrl || v.imageUrl).filter(Boolean);
    
    // Store full casefile data for rework / export
    window.currentCaseFileData = {
        op_name, op_agency, op_license, op_quals,
        billed_to, paid_by, case_number, invoice_type,
        services_performed, status, is_paid: !!isPaidChecked,
        bounty: bountyStr, expenses: expensesStr,
        invoice_notes: invoiceNotes,
        mainAttachedImage,
        attachedExhibits: selectedIds,
        exhibitImages: exhibitImages.slice(0, 4)
    };
    
    // 3. Build HTML
    const dateStr = new Date().toLocaleString();
    
    let html = `
        <!-- TRC_CASEFILE_DATA_START: ${encodeURIComponent(JSON.stringify(window.currentCaseFileData))} :TRC_CASEFILE_DATA_END -->
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #111; max-width: 800px; margin: 0 auto; line-height: 1.4;">
            
            <!-- HEADER WITH TRC LOGO & INVOICE STATUS -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 4px solid #111; padding-bottom: 14px; margin-bottom: 20px; page-break-inside: avoid; break-inside: avoid;">
                <div style="display: flex; align-items: center; gap: 14px;">
                    <!-- OFFICIAL TRC CREST LOGO -->
                    <div style="width: 48px; height: 48px; background: #0f172a; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 2px solid #22c55e; flex-shrink: 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="22" y1="12" x2="18" y2="12"></line>
                            <line x1="6" y1="12" x2="2" y2="12"></line>
                            <line x1="12" y1="6" x2="12" y2="2"></line>
                            <line x1="12" y1="22" x2="12" y2="18"></line>
                            <circle cx="12" cy="12" r="4"></circle>
                            <circle cx="12" cy="12" r="1" fill="#22c55e"></circle>
                        </svg>
                    </div>
                    <div>
                        <h1 style="margin: 0; font-size: 22px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; color: #0f172a;">TACTICAL RANGE CARD</h1>
                        <h2 style="margin: 2px 0 0; font-size: 12px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.8px;">EXECUTIVE CASE FILE &bull; OFFICIAL INVOICE</h2>
                        <p style="margin: 2px 0 0; font-size: 10px; color: #64748b; font-family: monospace;">DATE GENERATED: ${dateStr}</p>
                    </div>
                </div>
                <div style="text-align: right; border-left: 2px solid #cbd5e1; padding-left: 18px;">
                    <div style="display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; ${status === 'PAID' ? 'background: #dcfce7; color: #15803d; border: 1.5px solid #22c55e;' : 'background: #fee2e2; color: #b91c1c; border: 1.5px solid #ef4444;'}">
                        ${status === 'PAID' ? '✔ PAID IN FULL' : '⏳ UNPAID / PENDING'}
                    </div>
                    <div style="font-size: 11px; margin-top: 6px;">Job Amount: <b>$${bounty.toFixed(2)}</b></div>
                    <div style="font-size: 11px; margin-top: 2px;">Expenses: <b>$${expenses.toFixed(2)}</b></div>
                    <div style="font-size: 16px; font-weight: 900; margin-top: 6px; border-top: 2px solid #111; padding-top: 4px; color: #0f172a;">TOTAL: $${total.toFixed(2)}</div>
                </div>
            </div>
            
            <!-- CLIENT & BILLING DETAILS -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px; page-break-inside: avoid; break-inside: avoid;">
                <div style="border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: #ffffff;">
                    <div style="font-size: 11px; font-weight: 900; background: #0f172a; color: #f59e0b; padding: 5px 10px; text-transform: uppercase; letter-spacing: 0.05em;">
                        BILLED TO (CLIENT / UNIT)
                    </div>
                    <div style="padding: 10px; font-size: 12px; line-height: 1.5; color: #1e293b;">
                        <b>${billed_to}</b>
                    </div>
                </div>
                <div style="border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: #ffffff;">
                    <div style="font-size: 11px; font-weight: 900; background: #0f172a; color: #10b981; padding: 5px 10px; text-transform: uppercase; letter-spacing: 0.05em;">
                        PAYMENT DETAILS / PAID BY
                    </div>
                    <div style="padding: 10px; font-size: 12px; line-height: 1.5; color: #1e293b;">
                        <b>${paid_by}</b>
                    </div>
                </div>
            </div>

            <!-- OFFICER & CASE INFO -->
            <div style="margin-bottom: 18px; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; page-break-inside: avoid; break-inside: avoid;">
                <div style="font-size: 11px; font-weight: 900; background: #0f172a; color: #ffffff; padding: 5px 10px; text-transform: uppercase; letter-spacing: 0.05em;">
                    LEAD OPERATOR / CASE DETAILS
                </div>
                <div style="display: flex; gap: 20px; padding: 12px; background: #ffffff;">
                    <div style="flex: 1; font-size: 11.5px; line-height: 1.7;">
                        <div><b>Operator / Callsign:</b> <span style="text-transform: uppercase;">${op_name}</span></div>
                        <div><b>Agency / Company:</b> ${op_agency}</div>
                        <div><b>License / ID:</b> <span style="font-family: monospace;">${op_license}</span></div>
                        <div><b>Qualifications:</b> ${op_quals}</div>
                        <div><b>Case Number:</b> <span style="font-family: monospace; font-weight: bold;">${case_number}</span></div>
                        <div><b>Invoice For:</b> ${invoice_type}</div>
                    </div>
                    ${mainAttachedImage ? `
                    <div style="width: 140px; text-align: center; border: 1px solid #e2e8f0; border-radius: 4px; padding: 4px; background: #f8fafc; flex-shrink: 0;">
                        <img src="${mainAttachedImage}" style="max-width: 100%; max-height: 110px; object-fit: contain; display: block; margin: 0 auto;">
                        <div style="font-size: 8px; color: #64748b; margin-top: 4px; font-weight: bold; text-transform: uppercase;">PRIMARY PHOTO</div>
                    </div>
                    ` : ''}
                </div>
            </div>

            <!-- SERVICES PERFORMED -->
            ${services_performed ? `
            <div style="margin-bottom: 18px; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; page-break-inside: avoid; break-inside: avoid;">
                <div style="font-size: 11px; font-weight: 900; background: #0f172a; color: #c084fc; padding: 5px 10px; text-transform: uppercase; letter-spacing: 0.05em;">
                    SERVICES PERFORMED &bull; SCOPE OF WORK
                </div>
                <div style="padding: 10px 12px; background: #f8fafc; font-size: 11.5px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">${services_performed}</div>
            </div>
            ` : ''}
            <!-- INVOICE NOTES & TERMS -->
            ${invoiceNotes ? `
            <div style="margin-bottom: 18px; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; page-break-inside: avoid; break-inside: avoid;">
                <div style="font-size: 11px; font-weight: 900; background: #0f172a; color: #ffffff; padding: 5px 10px; text-transform: uppercase; letter-spacing: 0.05em;">
                    INVOICE NOTES & TERMS
                </div>
                <div style="padding: 10px 12px; background: #f8fafc; font-size: 11.5px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">${invoiceNotes}</div>
            </div>
            ` : ''}
            
            <!-- EVIDENCE & INTEL EXHIBITS -->
            <div style="margin-bottom: 30px;">
                <div style="font-size: 12px; font-weight: 900; background: #0f172a; color: #ffffff; padding: 6px 12px; text-transform: uppercase; letter-spacing: 0.05em; border-radius: 6px 6px 0 0; margin-bottom: 12px;">
                    CHRONOLOGICAL EVIDENCE & VAULT EXHIBITS (${vaultItems.length})
                </div>
    `;
    
    if (vaultItems.length === 0) {
        html += `
            <div style="padding: 20px; text-align: center; color: #64748b; border: 1px dashed #cbd5e1; border-radius: 6px; font-size: 12px;">
                No Intel Vault records attached to this operation.
            </div>
        `;
    } else {
        vaultItems.forEach((v, idx) => {
            const time = new Date(v.timestamp).toLocaleTimeString();
            const date = new Date(v.timestamp).toLocaleDateString();
            const attachedImg = v.image || v.data || (v.contact ? v.contact.cardImageUrl : null);
            
            html += `
                <div style="page-break-inside: avoid; break-inside: avoid; margin-bottom: 16px; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: #ffffff;">
                    <div style="background: #f1f5f9; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #cbd5e1; font-size: 11px;">
                        <div>
                            <span style="font-weight: 900; color: #0f172a; text-transform: uppercase;">EXHIBIT ${idx + 1}: ${v.label || 'UNTITLED RECORD'}</span>
                            <span style="color: #64748b; margin-left: 8px; font-weight: bold; text-transform: uppercase;">[${(v.type || 'EVIDENCE').replace('-', ' ')}]</span>
                        </div>
                        <div style="color: #475569; font-family: monospace; font-size: 10px;">
                            ${date} ${time}
                        </div>
                    </div>
                    <div style="padding: 12px;">
                        ${v.notes ? `<div style="font-size: 11px; color: #334155; margin-bottom: 8px; font-style: italic;">"${v.notes}"</div>` : ''}
                        ${attachedImg ? `
                        <div style="text-align: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px; margin-top: 4px;">
                            <img src="${attachedImg}" style="max-width: 100%; max-height: 360px; object-fit: contain; display: inline-block; border-radius: 3px;">
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });
    }
    
    html += `
            </div>
            
            <!-- DIGITAL SIGNATURE BLOCK -->
            <div style="margin-top: 40px; display: flex; justify-content: space-between; page-break-inside: avoid; break-inside: avoid; gap: 30px;">
                <div style="flex: 1; text-align: center;">
                    <div id="sig-operator" onclick="window.openSignaturePad('sig-operator', 'Operator / Agent Signature')" class="print:border-none" style="border-bottom: 2px solid #0f172a; height: 60px; margin-bottom: 6px; cursor: pointer; display: flex; align-items: flex-end; justify-content: center; background: #f8fafc; border-radius: 4px 4px 0 0;" title="Click to sign">
                        <span class="print:hidden" style="color: #94a3b8; font-size: 9px; padding-bottom: 5px; font-weight: bold;">[ CLICK TO E-SIGN ]</span>
                    </div>
                    <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #0f172a; letter-spacing: 0.05em;">Operator / Agent Signature</div>
                </div>
                <div style="flex: 1; text-align: center;">
                    <div id="sig-notary" onclick="window.openSignaturePad('sig-notary', 'Authorizing Official / Notary')" class="print:border-none" style="border-bottom: 2px solid #0f172a; height: 60px; margin-bottom: 6px; cursor: pointer; display: flex; align-items: flex-end; justify-content: center; background: #f8fafc; border-radius: 4px 4px 0 0;" title="Click to sign">
                        <span class="print:hidden" style="color: #94a3b8; font-size: 9px; padding-bottom: 5px; font-weight: bold;">[ CLICK TO E-SIGN ]</span>
                    </div>
                    <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #0f172a; letter-spacing: 0.05em;">Authorizing Official / Notary</div>
                </div>
            </div>
            
            <div style="margin-top: 40px; padding-top: 12px; border-top: 1px solid #cbd5e1; text-align: center; font-size: 8px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; page-break-inside: avoid; break-inside: avoid;">
                OFFICIAL COURT & EXECUTIVE RECORD &bull; GENERATED BY TACTICAL RANGE CARD SYSTEM
            </div>
        </div>
    `;
    
    const container = document.getElementById('casefile-printable-area');
    if (container) {
        container.innerHTML = html;
        document.getElementById('modal-casefile-preview').style.display = 'flex';
        if(window.lucide) window.lucide.createIcons();
    }

    } catch (e) {
        console.error("PDF GEN FATAL ERROR", e);
        alert("PDF GEN ERROR: " + e.message);
        if (window.pushTacLog) window.pushTacLog("PDF GENERATION FAILED", "ERROR");
    }
};



// ==========================================
// E-SIGNATURE PAD LOGIC
// ==========================================
let sigCanvas, sigCtx, isSigning = false, currentSigTarget = null;

window.openSignaturePad = function(targetId, title) {
    document.getElementById('sig-pad-title').innerText = title;
    currentSigTarget = targetId;
    const modal = document.getElementById('modal-signature-pad');
    modal.style.display = 'flex';
    
    if(!sigCanvas) {
        sigCanvas = document.getElementById('sig-canvas');
        sigCtx = sigCanvas.getContext('2d', { willReadFrequently: true });
        
        // Resize canvas correctly to its CSS bounds
        const rect = sigCanvas.parentElement.getBoundingClientRect();
        sigCanvas.width = rect.width;
        sigCanvas.height = rect.height;
        
        const getPos = (e) => {
            const r = sigCanvas.getBoundingClientRect();
            if(e.touches) return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
            return { x: e.clientX - r.left, y: e.clientY - r.top };
        };

        const start = (e) => { e.preventDefault(); isSigning = true; const p = getPos(e); sigCtx.beginPath(); sigCtx.moveTo(p.x, p.y); };
        const move = (e) => { e.preventDefault(); if(!isSigning) return; const p = getPos(e); sigCtx.lineTo(p.x, p.y); sigCtx.stroke(); };
        const end = (e) => { e.preventDefault(); isSigning = false; };
        
        sigCanvas.addEventListener('mousedown', start);
        sigCanvas.addEventListener('mousemove', move);
        sigCanvas.addEventListener('mouseup', end);
        sigCanvas.addEventListener('touchstart', start, {passive:false});
        sigCanvas.addEventListener('touchmove', move, {passive:false});
        sigCanvas.addEventListener('touchend', end);
    }
    
    // Clear and reset context
    sigCtx.clearRect(0,0,sigCanvas.width, sigCanvas.height);
    sigCtx.lineWidth = 4;
    sigCtx.strokeStyle = '#000000';
    sigCtx.lineCap = 'round';
    sigCtx.lineJoin = 'round';
};

window.clearSignature = function() {
    if(sigCtx && sigCanvas) sigCtx.clearRect(0,0,sigCanvas.width, sigCanvas.height);
};

window.closeSignaturePad = function() {
    const modal = document.getElementById('modal-signature-pad');
    if (modal) modal.style.display = 'none';
};

window.saveSignature = function() {
    if(!sigCanvas) return;
    const dataUrl = sigCanvas.toDataURL('image/png');
    window.closeSignaturePad();
    
    const targetDiv = document.getElementById(currentSigTarget);
    if(targetDiv) {
        targetDiv.innerHTML = `<img src="${dataUrl}" style="height: 55px; width: auto; max-width: 100%; object-fit: contain; margin: 0 auto; display: block; mix-blend-mode: multiply;">`;
        targetDiv.style.background = 'transparent';
    }
};

window.printCaseFileDoc = function() {
    const printableContent = document.getElementById('casefile-printable-area');
    if (!printableContent) return;

    let printFrame = document.getElementById('trc-print-iframe');
    if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.id = 'trc-print-iframe';
        printFrame.style.position = 'fixed';
        printFrame.style.top = '-99999px';
        printFrame.style.left = '-99999px';
        printFrame.style.width = '1000px';
        printFrame.style.height = '1000px';
        printFrame.style.border = 'none';
        document.body.appendChild(printFrame);
    }

    const doc = printFrame.contentWindow.document;
    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Executive Case File - Tactical Range Card</title>
            <style>
                @page { margin: 12mm; size: portrait; }
                body { 
                    margin: 0; 
                    padding: 0; 
                    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
                    background: #ffffff; 
                    color: #111111; 
                }
                * { box-sizing: border-box; }
                img { max-width: 100%; height: auto; }
            </style>
        </head>
        <body>
            ${printableContent.innerHTML}
        </body>
        </html>
    `);
    doc.close();

    setTimeout(() => {
        try {
            printFrame.contentWindow.focus();
            printFrame.contentWindow.print();
        } catch(e) {
            console.error("Iframe print error, falling back to window.print()", e);
            window.print();
        }
    }, 350);
};

// ============================================================
// LOAD CASE FILE / INVOICE BACK TO WORKSTATION (REWORK)
// ============================================================
window.loadCaseFileBackToEditor = function(rawInput) {
    if (!rawInput) return;
    
    // Normalize caseData from any nesting level (vaultItem, workstationData, or direct data)
    let caseData = rawInput;
    if (rawInput.casefileData) caseData = rawInput.casefileData;
    else if (rawInput.workstationData && rawInput.workstationData.data) caseData = rawInput.workstationData.data;
    else if (rawInput.workstationData && rawInput.workstationData.casefileData) caseData = rawInput.workstationData.casefileData;
    else if (rawInput.data && rawInput.data.casefileData) caseData = rawInput.data.casefileData;
    else if (rawInput.data) caseData = rawInput.data;
    
    // Close Surveillance review if open
    if (typeof window.closeSurveillanceReview === 'function') {
        window.closeSurveillanceReview();
    }

    // Maximize / Open Workstation Panel
    if (typeof window.toggleFullscreen === 'function') {
        const wsPanel = document.getElementById('panel-workstation');
        if (wsPanel && !wsPanel.classList.contains('is-maximized')) {
            window.toggleFullscreen('panel-workstation');
        }
    }
    
    // Open Casefile Form with restored data
    window.openWorkstationForm('casefile', { data: caseData });
    
    // Populate form fields
    setTimeout(() => {
        if (document.getElementById('ws-op_name')) document.getElementById('ws-op_name').value = caseData.op_name || '';
        if (document.getElementById('ws-op_agency')) document.getElementById('ws-op_agency').value = caseData.op_agency || '';
        if (document.getElementById('ws-op_license')) document.getElementById('ws-op_license').value = caseData.op_license || '';
        if (document.getElementById('ws-op_quals')) document.getElementById('ws-op_quals').value = caseData.op_quals || '';
        if (document.getElementById('ws-billed_to')) document.getElementById('ws-billed_to').value = caseData.billed_to || '';
        if (document.getElementById('ws-paid_by')) document.getElementById('ws-paid_by').value = caseData.paid_by || '';
        if (document.getElementById('ws-case_number')) document.getElementById('ws-case_number').value = caseData.case_number || '';
        if (document.getElementById('ws-invoice_type')) document.getElementById('ws-invoice_type').value = caseData.invoice_type || '';
        if (document.getElementById('ws-services_performed')) document.getElementById('ws-services_performed').value = caseData.services_performed || '';
        if (document.getElementById('ws-bounty')) document.getElementById('ws-bounty').value = caseData.bounty || '';
        if (document.getElementById('ws-expenses')) document.getElementById('ws-expenses').value = caseData.expenses || '';
        if (document.getElementById('ws-invoice_notes')) {
            document.getElementById('ws-invoice_notes').value = caseData.invoice_notes || '';
            const counter = document.getElementById('ws-invoice-notes-counter');
            if (counter) counter.textContent = (caseData.invoice_notes || '').length + ' / 1000';
        }
        
        const isPaid = caseData.status === 'PAID' || caseData.is_paid === true;
        if (document.getElementById('ws-status-paid')) document.getElementById('ws-status-paid').checked = isPaid;
        if (document.getElementById('ws-status-unpaid')) document.getElementById('ws-status-unpaid').checked = !isPaid;
        
        const mainImg = caseData.mainAttachedImage || '';
        if (mainImg && document.getElementById('ws-image-data')) {
            document.getElementById('ws-image-data').value = mainImg;
            const prev = document.getElementById('ws-image-preview');
            if (prev) prev.src = mainImg;
            const prevContainer = document.getElementById('ws-image-preview-container');
            if (prevContainer) prevContainer.classList.remove('hidden');
        }

        if (window.renderCasefileExhibitsSelector) {
            window.renderCasefileExhibitsSelector(caseData.attachedExhibits);
        }
    }, 120);

    // Close Vault Panel if open
    const vaultPanel = document.getElementById('panel-vault');
    if (vaultPanel) vaultPanel.classList.add('hidden');
    
    if (window.pushTacLog) window.pushTacLog(`CASE FILE LOADED FOR REWORK: ${caseData.case_number || caseData.billed_to || 'INVOICE'}`, 'SUCCESS');
    if (window.showToast) window.showToast('📋 Case File loaded for Rework.');
};

window.transmitCurrentCaseFileToComms = async function() {
    const isPaidChecked = document.getElementById('ws-status-paid')?.checked;
    const caseData = {
        op_name: document.getElementById('ws-op_name')?.value || window.commsUser?.callsign || window.userObj?.callsign || 'OPERATOR',
        op_agency: document.getElementById('ws-op_agency')?.value || 'N/A',
        op_license: document.getElementById('ws-op_license')?.value || 'N/A',
        op_quals: document.getElementById('ws-op_quals')?.value || 'N/A',
        billed_to: document.getElementById('ws-billed_to')?.value || 'N/A',
        paid_by: document.getElementById('ws-paid_by')?.value || 'N/A',
        case_number: document.getElementById('ws-case_number')?.value || ('INV-' + Date.now().toString().slice(-6)),
        invoice_type: document.getElementById('ws-invoice_type')?.value || 'Executive Case File',
        services_performed: document.getElementById('ws-services_performed')?.value || '',
        status: isPaidChecked ? 'PAID' : 'UNPAID',
        is_paid: !!isPaidChecked,
        bounty: document.getElementById('ws-bounty')?.value || '0.00',
        expenses: document.getElementById('ws-expenses')?.value || '0.00',
        invoice_notes: document.getElementById('ws-invoice_notes')?.value || '',
        mainAttachedImage: document.getElementById('ws-image-data')?.value || '',
        attachedExhibits: Array.from(document.querySelectorAll('.ws-casefile-exhibit-checkbox:checked')).map(cb => cb.value)
    };

    if (window.broadcastCommsMessage) {
        window.broadcastCommsMessage({
            type: 'casefile',
            casefileData: caseData,
            text: `📄 [EXECUTIVE INVOICE / CASE]: ${caseData.case_number} | Billed to: ${caseData.billed_to} | Status: ${caseData.status}`
        });
        if (window.pushTacLog) window.pushTacLog(`TRANSMITTED INVOICE ${caseData.case_number} TO SQUAD COMMS`, 'SUCCESS');
        if (window.showToast) window.showToast(`📡 Transmitted Invoice ${caseData.case_number} to Team Comms!`);
    } else if (window.sendCommsMessage) {
        window.sendCommsMessage({
            type: 'casefile',
            casefileData: caseData,
            text: `📄 [EXECUTIVE INVOICE / CASE]: ${caseData.case_number} | Billed to: ${caseData.billed_to} | Status: ${caseData.status}`
        });
        if (window.pushTacLog) window.pushTacLog(`TRANSMITTED INVOICE ${caseData.case_number} TO SQUAD COMMS`, 'SUCCESS');
        if (window.showToast) window.showToast(`📡 Transmitted Invoice ${caseData.case_number} to Team Comms!`);
    } else {
        if (window.showToast) window.showToast(`⚠️ Please connect to Window 5 Comms to broadcast.`);
        else alert("Please connect to Window 5 Comms first.");
    }
};

function initWorkstation() {
    if (typeof window.renderWorkstationMenu === 'function') {
        window.renderWorkstationMenu();
    }
    const vaultToWorkstationBtn = document.getElementById('vault-to-workstation-btn');
    if (vaultToWorkstationBtn && !vaultToWorkstationBtn._bound) {
        vaultToWorkstationBtn._bound = true;
        vaultToWorkstationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof toggleFullscreen === 'function') {
                toggleFullscreen('panel-workstation');
            }
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWorkstation);
} else {
    initWorkstation();
}
setTimeout(initWorkstation, 100);
setTimeout(initWorkstation, 500);
setTimeout(initWorkstation, 1200);
