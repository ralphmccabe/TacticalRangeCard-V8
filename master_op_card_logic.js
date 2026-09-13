// =========================================================================
// MASTER OP-PLAN (MISSION COMMAND) LOGIC MODULE
// =========================================================================

let masterOpChecklist = [];

window.openMasterOpForm = function(cardData = null) {
    const container = document.getElementById('ws-top-action-area');
    if (!container) return;

    masterOpChecklist = (cardData && cardData.data && cardData.data.checklist) ? cardData.data.checklist : [];
    
    const id = cardData ? cardData.id : Date.now();
    const isNew = !cardData;
    
    // Header Data
    const opName = (cardData && cardData.data) ? cardData.data.opName || '' : '';
    const teamName = (cardData && cardData.data) ? cardData.data.teamName || '' : '';
    const dateStr = (cardData && cardData.data) ? cardData.data.dateStr || new Date().toLocaleString() : new Date().toLocaleString();
    const location = (cardData && cardData.data) ? cardData.data.location || '' : '';
    
    // 1. OPORD
    const sit = (cardData && cardData.data) ? cardData.data.sit || '' : '';
    const mis = (cardData && cardData.data) ? cardData.data.mis || '' : '';
    const exe = (cardData && cardData.data) ? cardData.data.exe || '' : '';
    const adm = (cardData && cardData.data) ? cardData.data.adm || '' : '';
    const cmd = (cardData && cardData.data) ? cardData.data.cmd || '' : '';
    
    // 2. PACE
    const pacePri = (cardData && cardData.data) ? cardData.data.pacePri || '' : '';
    const paceAlt = (cardData && cardData.data) ? cardData.data.paceAlt || '' : '';
    const paceCon = (cardData && cardData.data) ? cardData.data.paceCon || '' : '';
    const paceEmg = (cardData && cardData.data) ? cardData.data.paceEmg || '' : '';
    
    // 3. Range Card
    const rcTrps = (cardData && cardData.data) ? cardData.data.rcTrps || '' : '';
    const rcLimits = (cardData && cardData.data) ? cardData.data.rcLimits || '' : '';
    const rcNotes = (cardData && cardData.data) ? cardData.data.rcNotes || '' : '';
    
    // 4. Vehicle PMCS
    const vehId = (cardData && cardData.data) ? cardData.data.vehId || '' : '';
    const vehMiles = (cardData && cardData.data) ? cardData.data.vehMiles || '' : '';
    const vehFuel = (cardData && cardData.data) ? cardData.data.vehFuel || '' : '';
    const vehDam = (cardData && cardData.data) ? cardData.data.vehDam || '' : '';
    
    // 5. AAR
    const aarSus = (cardData && cardData.data) ? cardData.data.aarSus || '' : '';
    const aarImp = (cardData && cardData.data) ? cardData.data.aarImp || '' : '';

    container.innerHTML = `
        <div class="h-full flex flex-col w-full max-w-4xl mx-auto relative overflow-hidden bg-slate-950">
            <div class="flex items-center justify-between mb-2 pb-2 border-b border-gray-800 shrink-0 flex-wrap gap-1 sticky top-0 z-30 pt-1 bg-slate-950/95 backdrop-blur">
                <button onclick="renderWorkstationMenu()" style="color: var(--accent-color); border: 1px solid var(--accent-color); background-color: rgba(var(--accent-rgb), 0.15); box-shadow: 0 0 10px rgba(var(--accent-rgb), 0.15);" class="hover:brightness-125 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer">
                    <i data-lucide="chevron-left" class="w-4 h-4"></i> BACK
                </button>
                <div class="flex items-center gap-1.5">
                    <span class="text-xs font-black uppercase text-white tracking-widest flex items-center gap-1.5">
                        <i data-lucide="map" class="w-4 h-4 text-white"></i> MISSION COMMAND (MASTER OP-PLAN)
                    </span>
                </div>
            </div>

            <div class="flex-1 custom-scrollbar pr-1 pb-20 space-y-3">
                
                <!-- HEADER SETTINGS -->
                <div class="bg-slate-900 border border-slate-700 rounded-lg p-3">
                    <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div class="sm:col-span-2">
                            <label class="block text-[9px] font-black uppercase text-amber-500/80 tracking-wider mb-1">Operation / Mission Name</label>
                            <input type="text" id="mop-opname" maxlength="40" value="${opName}" placeholder="e.g. Operation Trident or Saturday Hunt" class="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white uppercase font-bold focus:border-amber-500 focus:outline-none">
                        </div>
                        <div>
                            <label class="block text-[9px] font-black uppercase text-amber-500/80 tracking-wider mb-1">Team Name (Max 20)</label>
                            <input type="text" id="mop-teamname" maxlength="20" value="${teamName}" placeholder="e.g. ALPHA SQUAD" class="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white uppercase font-bold focus:border-amber-500 focus:outline-none">
                        </div>
                        <div>
                            <label class="block text-[9px] font-black uppercase text-amber-500/80 tracking-wider mb-1">Date & Time</label>
                            <input type="text" id="mop-date" maxlength="30" value="${dateStr}" class="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white font-mono focus:border-amber-500 focus:outline-none">
                        </div>
                        <div class="sm:col-span-4">
                            <label class="block text-[9px] font-black uppercase text-amber-500/80 tracking-wider mb-1">Area of Operations (Location)</label>
                            <input type="text" id="mop-location" maxlength="60" value="${location}" placeholder="e.g. Sector 4 / Grid 123456" class="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white uppercase focus:border-amber-500 focus:outline-none">
                        </div>
                    </div>
                </div>

                <!-- 1. OPORD (SMEAC) -->
                <div class="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                    <button onclick="toggleSection('mop-sec-opord')" class="w-full bg-slate-800/50 hover:bg-slate-800 p-2.5 flex items-center justify-between text-left transition-colors">
                        <span class="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                            <i data-lucide="file-text" class="w-4 h-4 text-emerald-400"></i> 1. OPORD & Briefing (SMEAC)
                        </span>
                        <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400"></i>
                    </button>
                    <div id="mop-sec-opord" class="p-3 space-y-3 ${isNew ? '' : 'hidden'}">
                        <div>
                            <div class="flex justify-between items-center mb-1">
                                <label class="text-[9px] font-black uppercase text-emerald-400/80 tracking-wider">Situation (Weather/Tide/Suspects)</label>
                                <span class="text-[9px] font-mono text-slate-500" id="mop-sit-cnt">${sit.length}/1000</span>
                            </div>
                            <textarea id="mop-sit" maxlength="1000" oninput="document.getElementById('mop-sit-cnt').textContent = this.value.length + '/1000'" class="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white h-14 custom-scrollbar focus:border-emerald-500 focus:outline-none">${sit}</textarea>
                        </div>
                        <div>
                            <div class="flex justify-between items-center mb-1">
                                <label class="text-[9px] font-black uppercase text-emerald-400/80 tracking-wider">Mission (Target Species/Objective)</label>
                                <span class="text-[9px] font-mono text-slate-500" id="mop-mis-cnt">${mis.length}/1000</span>
                            </div>
                            <textarea id="mop-mis" maxlength="1000" oninput="document.getElementById('mop-mis-cnt').textContent = this.value.length + '/1000'" class="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white h-14 custom-scrollbar focus:border-emerald-500 focus:outline-none">${mis}</textarea>
                        </div>
                        <div>
                            <div class="flex justify-between items-center mb-1">
                                <label class="text-[9px] font-black uppercase text-emerald-400/80 tracking-wider">Execution (Plan of Action)</label>
                                <span class="text-[9px] font-mono text-slate-500" id="mop-exe-cnt">${exe.length}/1000</span>
                            </div>
                            <textarea id="mop-exe" maxlength="1000" oninput="document.getElementById('mop-exe-cnt').textContent = this.value.length + '/1000'" class="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white h-14 custom-scrollbar focus:border-emerald-500 focus:outline-none">${exe}</textarea>
                        </div>
                        <div>
                            <div class="flex justify-between items-center mb-1">
                                <label class="text-[9px] font-black uppercase text-emerald-400/80 tracking-wider">Administration & Logistics (Gear/Food)</label>
                                <span class="text-[9px] font-mono text-slate-500" id="mop-adm-cnt">${adm.length}/1000</span>
                            </div>
                            <textarea id="mop-adm" maxlength="1000" oninput="document.getElementById('mop-adm-cnt').textContent = this.value.length + '/1000'" class="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white h-14 custom-scrollbar focus:border-emerald-500 focus:outline-none">${adm}</textarea>
                        </div>
                        <div>
                            <div class="flex justify-between items-center mb-1">
                                <label class="text-[9px] font-black uppercase text-emerald-400/80 tracking-wider">Command & Signal (Leadership)</label>
                                <span class="text-[9px] font-mono text-slate-500" id="mop-cmd-cnt">${cmd.length}/1000</span>
                            </div>
                            <textarea id="mop-cmd" maxlength="1000" oninput="document.getElementById('mop-cmd-cnt').textContent = this.value.length + '/1000'" class="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white h-14 custom-scrollbar focus:border-emerald-500 focus:outline-none">${cmd}</textarea>
                        </div>
                    </div>
                </div>

                <!-- 2. PACE COMMS PLAN -->
                <div class="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                    <button onclick="toggleSection('mop-sec-pace')" class="w-full bg-slate-800/50 hover:bg-slate-800 p-2.5 flex items-center justify-between text-left transition-colors">
                        <span class="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                            <i data-lucide="radio" class="w-4 h-4 text-blue-400"></i> 2. PACE Communications Plan
                        </span>
                        <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400"></i>
                    </button>
                    <div id="mop-sec-pace" class="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 hidden">
                        <div><label class="block text-[9px] font-black uppercase text-blue-400/80 tracking-wider mb-1">Primary (P)</label><input type="text" id="mop-pace-pri" maxlength="20" value="${pacePri}" class="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white font-mono focus:border-blue-500 focus:outline-none" placeholder="VHF Ch 1"></div>
                        <div><label class="block text-[9px] font-black uppercase text-blue-400/80 tracking-wider mb-1">Alternate (A)</label><input type="text" id="mop-pace-alt" maxlength="20" value="${paceAlt}" class="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white font-mono focus:border-blue-500 focus:outline-none" placeholder="UHF Ch 3"></div>
                        <div><label class="block text-[9px] font-black uppercase text-blue-400/80 tracking-wider mb-1">Contingency (C)</label><input type="text" id="mop-pace-con" maxlength="20" value="${paceCon}" class="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white font-mono focus:border-blue-500 focus:outline-none" placeholder="Cell Phone"></div>
                        <div><label class="block text-[9px] font-black uppercase text-blue-400/80 tracking-wider mb-1">Emergency (E)</label><input type="text" id="mop-pace-emg" maxlength="20" value="${paceEmg}" class="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white font-mono focus:border-blue-500 focus:outline-none" placeholder="Sat Phone / Flare"></div>
                    </div>
                </div>

                <!-- 3. SECTOR RANGE CARD -->
                <div class="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                    <button onclick="toggleSection('mop-sec-range')" class="w-full bg-slate-800/50 hover:bg-slate-800 p-2.5 flex items-center justify-between text-left transition-colors">
                        <span class="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                            <i data-lucide="crosshair" class="w-4 h-4 text-red-500"></i> 3. Sector Range Card (Overwatch / Blind)
                        </span>
                        <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400"></i>
                    </button>
                    <div id="mop-sec-range" class="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 hidden">
                        <div class="sm:col-span-2"><label class="block text-[9px] font-black uppercase text-red-500/80 tracking-wider mb-1">Left / Right Limits of Fire</label><input type="text" id="mop-rc-limits" maxlength="20" value="${rcLimits}" class="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white focus:border-red-500 focus:outline-none" placeholder="Left: Big Oak, Right: Creek"></div>
                        <div class="sm:col-span-2">
                            <div class="flex justify-between items-center mb-1">
                                <label class="text-[9px] font-black uppercase text-red-500/80 tracking-wider">Target Reference Points (TRPs / Distances)</label>
                                <span class="text-[9px] font-mono text-slate-500" id="mop-rc-trps-cnt">${rcTrps.length}/1000</span>
                            </div>
                            <textarea id="mop-rc-trps" maxlength="1000" oninput="document.getElementById('mop-rc-trps-cnt').textContent = this.value.length + '/1000'" class="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white h-14 custom-scrollbar focus:border-red-500 focus:outline-none" placeholder="TRP1: 400yds (Bunker), TRP2: 800yds (Hill)">${rcTrps}</textarea>
                        </div>
                        <div class="sm:col-span-2"><label class="block text-[9px] font-black uppercase text-red-500/80 tracking-wider mb-1">Windage / Elevation Notes</label><input type="text" id="mop-rc-notes" maxlength="20" value="${rcNotes}" class="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white focus:border-red-500 focus:outline-none" placeholder="Wind 10mph 3-o-clock"></div>
                    </div>
                </div>

                <!-- 4. VEHICLE PMCS -->
                <div class="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                    <button onclick="toggleSection('mop-sec-pmcs')" class="w-full bg-slate-800/50 hover:bg-slate-800 p-2.5 flex items-center justify-between text-left transition-colors">
                        <span class="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                            <i data-lucide="truck" class="w-4 h-4 text-purple-400"></i> 4. Vehicle PMCS & Fleet Log
                        </span>
                        <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400"></i>
                    </button>
                    <div id="mop-sec-pmcs" class="p-3 grid grid-cols-1 sm:grid-cols-3 gap-3 hidden">
                        <div><label class="block text-[9px] font-black uppercase text-purple-400/80 tracking-wider mb-1">Vehicle / Asset ID</label><input type="text" id="mop-veh-id" maxlength="20" value="${vehId}" class="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white focus:border-purple-500 focus:outline-none" placeholder="BearCat 1 / Boat 4"></div>
                        <div><label class="block text-[9px] font-black uppercase text-purple-400/80 tracking-wider mb-1">Fuel / Battery Status</label><input type="text" id="mop-veh-fuel" maxlength="20" value="${vehFuel}" class="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white focus:border-purple-500 focus:outline-none" placeholder="Full / 100%"></div>
                        <div><label class="block text-[9px] font-black uppercase text-purple-400/80 tracking-wider mb-1">Start / End Mileage</label><input type="text" id="mop-veh-miles" maxlength="20" value="${vehMiles}" class="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white focus:border-purple-500 focus:outline-none" placeholder="54,000"></div>
                        <div class="sm:col-span-3"><label class="block text-[9px] font-black uppercase text-purple-400/80 tracking-wider mb-1">Damage / Maintenance Issues</label><input type="text" id="mop-veh-dam" maxlength="20" value="${vehDam}" class="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white focus:border-purple-500 focus:outline-none" placeholder="None observed"></div>
                    </div>
                </div>

                <!-- 5. CHECKLIST (PCC / PCI) -->
                <div class="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                    <button onclick="toggleSection('mop-sec-chk')" class="w-full bg-slate-800/50 hover:bg-slate-800 p-2.5 flex items-center justify-between text-left transition-colors">
                        <span class="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                            <i data-lucide="check-square" class="w-4 h-4 text-cyan-400"></i> 5. Action Items & Gear Checklist (PCC/PCI)
                        </span>
                        <div class="flex items-center gap-2">
                            <span class="text-[9px] text-cyan-500 border border-cyan-500/50 px-1.5 py-0.5 rounded cursor-pointer hover:bg-cyan-900" onclick="event.stopPropagation(); window.addMasterOpChecklistRow();">+ ADD TASK</span>
                            <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400"></i>
                        </div>
                    </button>
                    <div id="mop-sec-chk" class="p-2.5 space-y-2 hidden max-h-80 custom-scrollbar">
                        <div id="mop-checklist-container" class="space-y-1.5"></div>
                    </div>
                </div>

                <!-- 6. AAR (AFTER ACTION REVIEW) -->
                <div class="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                    <button onclick="toggleSection('mop-sec-aar')" class="w-full bg-slate-800/50 hover:bg-slate-800 p-2.5 flex items-center justify-between text-left transition-colors">
                        <span class="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                            <i data-lucide="activity" class="w-4 h-4 text-amber-500"></i> 6. After Action Review (Debrief)
                        </span>
                        <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400"></i>
                    </button>
                    <div id="mop-sec-aar" class="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 hidden">
                        <div>
                            <div class="flex justify-between items-center mb-1">
                                <label class="text-[9px] font-black uppercase text-amber-500/80 tracking-wider">Sustains (What went right)</label>
                                <span class="text-[9px] font-mono text-slate-500" id="mop-aar-sus-cnt">${aarSus.length}/1000</span>
                            </div>
                            <textarea id="mop-aar-sus" maxlength="1000" oninput="document.getElementById('mop-aar-sus-cnt').textContent = this.value.length + '/1000'" class="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white h-20 custom-scrollbar focus:border-amber-500 focus:outline-none" placeholder="Comms were clear, fast insert.">${aarSus}</textarea>
                        </div>
                        <div>
                            <div class="flex justify-between items-center mb-1">
                                <label class="text-[9px] font-black uppercase text-amber-500/80 tracking-wider">Improves (What went wrong)</label>
                                <span class="text-[9px] font-mono text-slate-500" id="mop-aar-imp-cnt">${aarImp.length}/1000</span>
                            </div>
                            <textarea id="mop-aar-imp" maxlength="1000" oninput="document.getElementById('mop-aar-imp-cnt').textContent = this.value.length + '/1000'" class="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white h-20 custom-scrollbar focus:border-amber-500 focus:outline-none" placeholder="Vehicle got stuck, need better recon.">${aarImp}</textarea>
                        </div>
                    </div>
                </div>

            </div>

            <!-- ACTION BUTTONS -->
            <div class="p-3 border-t border-slate-800 flex justify-between bg-slate-950 shrink-0 sticky bottom-0 z-30 flex-wrap gap-2">
                <button type="button" onclick="document.querySelectorAll('input, textarea').forEach(i=>i.value='')" class="text-xs text-slate-400 hover:text-white border border-slate-700 px-4 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-colors">
                    <i data-lucide="trash-2" class="w-4 h-4"></i> CLEAR
                </button>
                <div class="flex items-center gap-2 flex-wrap">
                    <button type="button" onclick="window.saveMasterOpToVault('${id}')" class="bg-amber-900 hover:bg-amber-800 text-amber-200 border border-amber-500/50 font-black text-xs px-4 py-2 rounded-lg uppercase tracking-wider flex items-center gap-1.5 shadow cursor-pointer">
                        <i data-lucide="clipboard-check" class="w-4 h-4 text-amber-400"></i> SAVE TO WORKSTATION
                    </button>

                </div>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    window.renderMasterOpChecklistRows();
};

window.renderMasterOpChecklistRows = function() {
    const container = document.getElementById('mop-checklist-container');
    if (!container) return;

    if (!masterOpChecklist || masterOpChecklist.length === 0) {
        container.innerHTML = `<div class="text-[10px] text-slate-400 italic text-center py-2">No tasks added. Click + ADD TASK.</div>`;
        return;
    }

    container.innerHTML = masterOpChecklist.map((c, idx) => `
        <div class="bg-slate-950 border border-slate-800 rounded p-1.5 flex items-center gap-2">
            <input type="checkbox" ${c.done ? 'checked' : ''} onchange="window.updateMasterOpChecklist(${idx}, 'done', this.checked)" class="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-950">
            <input type="text" value="${c.text}" onchange="window.updateMasterOpChecklist(${idx}, 'text', this.value)" class="flex-1 bg-transparent border-none text-xs text-white focus:outline-none focus:ring-0 ${c.done ? 'line-through text-slate-400' : ''}" placeholder="e.g. Check NODs batteries">
            <button type="button" onclick="window.removeMasterOpChecklistRow(${idx})" class="w-6 h-6 flex items-center justify-center bg-slate-900 text-red-500 rounded hover:bg-slate-800">
                <i data-lucide="x" class="w-3.5 h-3.5"></i>
            </button>
        </div>
    `).join('');
    if (window.lucide) window.lucide.createIcons();
};

window.addMasterOpChecklistRow = function() {
    masterOpChecklist.push({ text: '', done: false });
    window.renderMasterOpChecklistRows();
};

window.removeMasterOpChecklistRow = function(idx) {
    masterOpChecklist.splice(idx, 1);
    window.renderMasterOpChecklistRows();
};

window.updateMasterOpChecklist = function(idx, key, val) {
    if (masterOpChecklist[idx]) {
        masterOpChecklist[idx][key] = val;
        if (key === 'done') window.renderMasterOpChecklistRows(); // Re-render to strike-through
    }
};

window.collectMasterOpData = function(id) {
    const data = {
        opName: document.getElementById('mop-opname')?.value || '',
        teamName: document.getElementById('mop-teamname')?.value || '',
        dateStr: document.getElementById('mop-date')?.value || new Date().toLocaleString(),
        location: document.getElementById('mop-location')?.value || '',
        
        sit: document.getElementById('mop-sit')?.value || '',
        mis: document.getElementById('mop-mis')?.value || '',
        exe: document.getElementById('mop-exe')?.value || '',
        adm: document.getElementById('mop-adm')?.value || '',
        cmd: document.getElementById('mop-cmd')?.value || '',
        
        pacePri: document.getElementById('mop-pace-pri')?.value || '',
        paceAlt: document.getElementById('mop-pace-alt')?.value || '',
        paceCon: document.getElementById('mop-pace-con')?.value || '',
        paceEmg: document.getElementById('mop-pace-emg')?.value || '',
        
        rcLimits: document.getElementById('mop-rc-limits')?.value || '',
        rcTrps: document.getElementById('mop-rc-trps')?.value || '',
        rcNotes: document.getElementById('mop-rc-notes')?.value || '',
        
        vehId: document.getElementById('mop-veh-id')?.value || '',
        vehFuel: document.getElementById('mop-veh-fuel')?.value || '',
        vehMiles: document.getElementById('mop-veh-miles')?.value || '',
        vehDam: document.getElementById('mop-veh-dam')?.value || '',
        
        aarSus: document.getElementById('mop-aar-sus')?.value || '',
        aarImp: document.getElementById('mop-aar-imp')?.value || '',
        
        checklist: masterOpChecklist || []
    };

    return {
        id: id || Date.now(),
        type: 'master_op',
        timestamp: Date.now(),
        data: data
    };
};

window.generateMasterOpHTML = function(card) {
    const data = card.data;
    
    // Format checklist for display
    let checklistHtml = '';
    if (data.checklist && data.checklist.length > 0) {
        checklistHtml = data.checklist.map(c => `
            <div style="display: flex; gap: 8px; margin-bottom: 4px;">
                <span style="color: #22d3ee; font-weight: bold;">[${c.done ? 'X' : ' '}]</span>
                <span style="color: #cbd5e1; ${c.done ? 'text-decoration: line-through; opacity: 0.5;' : ''}">${c.text || 'Empty Task'}</span>
            </div>
        `).join('');
    }

    return `
        <div style="width: 720px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; background-color: #020617; color: #f8fafc; padding: 20px; box-sizing: border-box; border: 4px solid #f59e0b; border-radius: 12px; overflow: hidden; position: relative;">
            
            <!-- WATERMARK / BRANDING -->
            <div style="position: absolute; top: 10px; right: 20px; opacity: 0.1; font-size: 80px; font-weight: 900; letter-spacing: -2px; transform: rotate(15deg); user-select: none; pointer-events: none; color: #f59e0b;">OP-PLAN</div>
            
            <!-- HEADER -->
            <div style="border-bottom: 2px solid rgba(245, 158, 11, 0.5); padding-bottom: 16px; margin-bottom: 16px;">
                <div style="font-size: 10px; font-weight: 900; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center;">
                    <span>MISSION COMMAND (MASTER OP-PLAN)</span>
                    <span style="color: #94a3b8; font-family: monospace;">${data.dateStr}</span>
                </div>
                <div style="font-size: 30px; font-weight: 900; text-transform: uppercase; color: #ffffff; line-height: 1; margin-bottom: 8px;">${data.opName || 'UNNAMED OPERATION'}</div>
                <div style="font-size: 12px; font-weight: bold; color: #cbd5e1; text-transform: uppercase; display: flex; gap: 16px; flex-wrap: wrap;">
                    ${data.teamName ? `<div><span style="color: rgba(245, 158, 11, 0.8); margin-right: 4px;">TEAM:</span> <b style="color: #ffffff;">${data.teamName}</b></div>` : ''}
                    <div><span style="color: rgba(245, 158, 11, 0.8); margin-right: 4px;">AO:</span> ${data.location || 'UNSPECIFIED'}</div>
                </div>
            </div>

            <div style="display: flex; gap: 16px;">
                
                <!-- COL 1 -->
                <div style="flex: 1; display: flex; flex-direction: column; gap: 16px;">
                    <!-- OPORD -->
                    <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 12px;">
                        <div style="font-size: 10px; font-weight: 900; color: #34d399; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid #1e293b; padding-bottom: 4px; margin-bottom: 8px;">1. OPORD (SMEAC)</div>
                        <div style="font-size: 10px; display: flex; flex-direction: column; gap: 8px;">
                            <div><span style="color: rgba(52, 211, 153, 0.8); font-weight: bold; display: block; text-transform: uppercase; font-size: 9px;">Situation</span><div style="color: #cbd5e1; white-space: pre-wrap;">${data.sit || 'N/A'}</div></div>
                            <div><span style="color: rgba(52, 211, 153, 0.8); font-weight: bold; display: block; text-transform: uppercase; font-size: 9px;">Mission</span><div style="color: #ffffff; font-weight: bold; white-space: pre-wrap;">${data.mis || 'N/A'}</div></div>
                            <div><span style="color: rgba(52, 211, 153, 0.8); font-weight: bold; display: block; text-transform: uppercase; font-size: 9px;">Execution</span><div style="color: #cbd5e1; white-space: pre-wrap;">${data.exe || 'N/A'}</div></div>
                            <div><span style="color: rgba(52, 211, 153, 0.8); font-weight: bold; display: block; text-transform: uppercase; font-size: 9px;">Admin / Logistics</span><div style="color: #cbd5e1; white-space: pre-wrap;">${data.adm || 'N/A'}</div></div>
                            <div><span style="color: rgba(52, 211, 153, 0.8); font-weight: bold; display: block; text-transform: uppercase; font-size: 9px;">Command / Signal</span><div style="color: #cbd5e1; white-space: pre-wrap;">${data.cmd || 'N/A'}</div></div>
                        </div>
                    </div>

                    <!-- RANGE CARD -->
                    <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 12px;">
                        <div style="font-size: 10px; font-weight: 900; color: #ef4444; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid #1e293b; padding-bottom: 4px; margin-bottom: 8px;">3. SECTOR RANGE CARD</div>
                        <div style="font-size: 10px; display: flex; flex-direction: column; gap: 8px;">
                            <div><span style="color: rgba(239, 68, 68, 0.8); font-weight: bold; display: block; text-transform: uppercase; font-size: 9px;">Lateral Limits</span><div style="color: #ffffff;">${data.rcLimits || 'N/A'}</div></div>
                            <div><span style="color: rgba(239, 68, 68, 0.8); font-weight: bold; display: block; text-transform: uppercase; font-size: 9px;">Target Ref Points (TRPs)</span><div style="color: #ffffff; white-space: pre-wrap;">${data.rcTrps || 'N/A'}</div></div>
                            <div><span style="color: rgba(239, 68, 68, 0.8); font-weight: bold; display: block; text-transform: uppercase; font-size: 9px;">Windage/Elevation</span><div style="color: #94a3b8;">${data.rcNotes || 'N/A'}</div></div>
                        </div>
                    </div>
                </div>

                <!-- COL 2 -->
                <div style="flex: 1; display: flex; flex-direction: column; gap: 16px;">
                    <!-- PACE -->
                    <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 12px;">
                        <div style="font-size: 10px; font-weight: 900; color: #60a5fa; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid #1e293b; padding-bottom: 4px; margin-bottom: 8px;">2. PACE COMMS PLAN</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 10px;">
                            <div style="background-color: #020617; padding: 6px; border-radius: 4px; border: 1px solid #1e293b;"><span style="color: rgba(96, 165, 250, 0.8); font-weight: bold; display: block; text-transform: uppercase; font-size: 9px;">Primary</span><div style="color: #ffffff; font-weight: bold;">${data.pacePri || 'N/A'}</div></div>
                            <div style="background-color: #020617; padding: 6px; border-radius: 4px; border: 1px solid #1e293b;"><span style="color: rgba(96, 165, 250, 0.8); font-weight: bold; display: block; text-transform: uppercase; font-size: 9px;">Alternate</span><div style="color: #ffffff; font-weight: bold;">${data.paceAlt || 'N/A'}</div></div>
                            <div style="background-color: #020617; padding: 6px; border-radius: 4px; border: 1px solid #1e293b;"><span style="color: rgba(96, 165, 250, 0.8); font-weight: bold; display: block; text-transform: uppercase; font-size: 9px;">Contingency</span><div style="color: #ffffff; font-weight: bold;">${data.paceCon || 'N/A'}</div></div>
                            <div style="background-color: #020617; padding: 6px; border-radius: 4px; border: 1px solid #1e293b;"><span style="color: rgba(96, 165, 250, 0.8); font-weight: bold; display: block; text-transform: uppercase; font-size: 9px;">Emergency</span><div style="color: #f59e0b; font-weight: bold;">${data.paceEmg || 'N/A'}</div></div>
                        </div>
                    </div>

                    <!-- VEHICLE PMCS -->
                    <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 12px;">
                        <div style="font-size: 10px; font-weight: 900; color: #c084fc; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid #1e293b; padding-bottom: 4px; margin-bottom: 8px;">4. VEHICLE PMCS</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; font-size: 10px;">
                            <div><span style="color: rgba(192, 132, 252, 0.8); font-weight: bold; display: block; text-transform: uppercase; font-size: 9px;">ID</span><div style="color: #ffffff;">${data.vehId || 'N/A'}</div></div>
                            <div><span style="color: rgba(192, 132, 252, 0.8); font-weight: bold; display: block; text-transform: uppercase; font-size: 9px;">Fuel</span><div style="color: #ffffff;">${data.vehFuel || 'N/A'}</div></div>
                            <div><span style="color: rgba(192, 132, 252, 0.8); font-weight: bold; display: block; text-transform: uppercase; font-size: 9px;">Miles</span><div style="color: #ffffff;">${data.vehMiles || 'N/A'}</div></div>
                            <div style="grid-column: span 3;"><span style="color: rgba(192, 132, 252, 0.8); font-weight: bold; display: block; text-transform: uppercase; font-size: 9px;">Damage</span><div style="color: #f87171;">${data.vehDam || 'N/A'}</div></div>
                        </div>
                    </div>

                    <!-- CHECKLIST -->
                    ${checklistHtml ? `
                    <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 12px;">
                        <div style="font-size: 10px; font-weight: 900; color: #22d3ee; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid #1e293b; padding-bottom: 4px; margin-bottom: 8px;">5. GEAR / ACTION CHECKLIST</div>
                        <div style="font-size: 9px; font-family: monospace;">
                            ${checklistHtml}
                        </div>
                    </div>
                    ` : ''}
                    
                    <!-- AAR -->
                    <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 12px;">
                        <div style="font-size: 10px; font-weight: 900; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid #1e293b; padding-bottom: 4px; margin-bottom: 8px;">6. AFTER ACTION REVIEW</div>
                        <div style="font-size: 10px; display: flex; flex-direction: column; gap: 8px;">
                            <div><span style="color: rgba(245, 158, 11, 0.8); font-weight: bold; display: block; text-transform: uppercase; font-size: 9px;">Sustains (+)</span><div style="color: #ffffff; white-space: pre-wrap;">${data.aarSus || 'N/A'}</div></div>
                            <div><span style="color: rgba(245, 158, 11, 0.8); font-weight: bold; display: block; text-transform: uppercase; font-size: 9px;">Improves (-)</span><div style="color: #94a3b8; white-space: pre-wrap;">${data.aarImp || 'N/A'}</div></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- FOOTER -->
            <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 8px; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em;">TACTICAL RANGE CARD // MASTER OP-PLAN</div>
                <div style="font-size: 8px; color: #f59e0b; text-transform: uppercase; font-weight: 900; padding: 2px 8px; border: 1px solid #f59e0b; border-radius: 4px;">${new Date(card.timestamp || Date.now()).toISOString()}</div>
            </div>
        </div>
    `;
};

window.saveMasterOpToVault = async function(id) {
    const cardData = window.collectMasterOpData(id);

    // Create temporary offscreen container to render the master card for high-res snapshot
    let cardImageSnapshot = '';
    if (typeof html2canvas !== 'undefined') {
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '0';
        tempDiv.style.width = '720px'; // Render width
        tempDiv.style.backgroundColor = '#020617';
        tempDiv.innerHTML = window.generateMasterOpHTML(cardData);
        document.body.appendChild(tempDiv);

        try {
            const canvas = await html2canvas(tempDiv, {
                backgroundColor: '#020617',
                scale: 2.0, // Scale 2.0 for HD crystal clear text and diagram rendering
                logging: false,
                useCORS: true
            });
            cardImageSnapshot = canvas.toDataURL('image/jpeg', 0.90);
        } catch(e) {
            console.error("Html2Canvas failed for Master Op card snapshot", e);
        }
        document.body.removeChild(tempDiv);
    } else {
        alert("Snapshot engine (html2canvas) not loaded.");
    }

    if (!cardImageSnapshot) {
        alert("Failed to generate visual snapshot.");
        return;
    }

    // Save to Workstation Library (IndexedDB)
    try {
        const cardObj = {
            id: cardData.id,
            timestamp: cardData.timestamp,
            type: cardData.type,
            title: `OP-PLAN: ${cardData.data.opName || 'UNNAMED'}`,
            image: cardImageSnapshot,
            data: cardData.data
        };
        
        await TRC_IDB.set('workstationLibrary', cardData.id, cardObj);
        
        if (window.renderWorkstationLibrary) {
            window.renderWorkstationLibrary();
        }
        
        // Return to main menu
        if (window.renderWorkstationMenu) {
            window.renderWorkstationMenu();
        }
        
        // Add flavor glow effect for feedback
        const btn = document.getElementById('workstation-btn');
        if (btn) {
            btn.classList.add('shadow-[0_0_20px_var(--accent-color)]');
            setTimeout(() => { btn.classList.remove('shadow-[0_0_20px_var(--accent-color)]'); }, 1000);
        }
        
    } catch(e) {
        console.error("Vault save error:", e);
        alert("Failed to save to Workstation Library.");
    }
};

window.blogMasterOpToWire = async function(id) {
    // 1. Ensure it's saved locally first
    await window.saveMasterOpToVault(id);

    // 2. Fetch the raw card data
    const cardData = window.collectMasterOpData(id);
    let vault = [];
    try { vault = await TRC_IDB.get('workstationLibrary') || []; } catch(e){}
    const savedCard = vault.find(v => v.id === id);
    if (!savedCard || !savedCard.image) {
        alert("Could not locate snapshot image. Save to vault first.");
        return;
    }

    // Compress the image before broadcast to ensure it's under payload limits
    let compressedImage = savedCard.image;
    if (window.compressBase64Image) {
        compressedImage = await window.compressBase64Image(savedCard.image, 750, 0.72);
    }

    const payloadItem = {
        type: 'master_op',
        label: `OP-PLAN: ${cardData.data.opName || 'UNNAMED'}`,
        workstationData: cardData,
        image: compressedImage
    };
    const userObj = (typeof commsUser !== 'undefined' && commsUser && commsUser.callsign) ? commsUser : { callsign: 'OPERATOR', role: 'MISSION COMMAND', team: 'ALPHA' };
    const payload = {
        message: `[ OP-PLAN: ${cardData.data.opName || 'UNNAMED'} ]`,
        image: compressedImage,
        user: userObj,
        metadata: payloadItem
    };

    // 1. Broadcast over Encrypted Comms Chat (P2P + Supabase)
    if (typeof commsUser !== 'undefined' && commsUser && commsUser.callsign && typeof TacticalCrypto !== 'undefined') {
        const messageText = payload.message;
        const encrypted = TacticalCrypto.encrypt({
            message: messageText,
            user: commsUser,
            timestamp: Date.now(),
            image: compressedImage,
            metadata: payload
        });
        const msgId = Math.random().toString(36).substring(2, 9);
        if (window.receivedMsgIds) window.receivedMsgIds.add(msgId);

        // Render locally in sender chat
        if (typeof renderChatMessage === 'function') {
            renderChatMessage(commsUser, messageText, true, compressedImage, null, payload);
        }

        // Send over WebRTC P2P DataChannels
        if (window.dataChannels) {
            Object.values(window.dataChannels).forEach(dc => {
                if (dc && dc.readyState === 'open') {
                    try { dc.send(JSON.stringify({ event: 'chat', data: encrypted, msgId })); } catch(e){}
                }
            });
        }

        // Send over Supabase Broadcast channel
        if (typeof commsChannel !== 'undefined' && commsChannel) {
            try {
                commsChannel.send({ type: 'broadcast', event: 'chat', payload: { data: encrypted, msgId } });
            } catch(e) {}
        }

        // Fallback insert to trc_chat
        if (window.supabase) {
            try {
                await window.supabase.from('trc_chat').insert([{
                    callsign: commsUser.callsign,
                    flavor: window.flavor || 'blue',
                    message: encrypted,
                    is_vault_card: true,
                    timestamp: new Date().toISOString()
                }]);
            } catch(err) {
                console.error("Supabase insert error", err);
            }
        }
    }

    // 2. Auto-Blog to Tactical Field Wire (General Operations Category)
    if (window.supabase && typeof commsUser !== 'undefined' && commsUser) {
        try {
            await window.supabase.from('trc_blogs').insert([{
                author: commsUser.callsign,
                flavor: window.flavor || 'blue',
                title: payload.label,
                content: `Attached OP-PLAN Snapshot. Date: ${cardData.data.dateStr}, Location: ${cardData.data.location}`,
                category: 'GENERAL',
                image_data: compressedImage,
                is_vault_card: true
            }]);
        } catch(err) {
            console.error("Supabase Blog insert error", err);
        }
    } else {
        console.warn("Supabase or commsUser not initialized. Skipping Blog broadcast.");
    }

    // Return to menu
    if (window.renderWorkstationMenu) window.renderWorkstationMenu();
    
    // UI Feedback
    const btn = document.getElementById('comms-btn');
    if (btn) {
        btn.classList.add('animate-pulse', 'text-green-400');
        setTimeout(() => { btn.classList.remove('animate-pulse', 'text-green-400'); }, 2000);
    }
};

window.compressBase64Image = function(base64Str, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve) => {
        if (!base64Str) { resolve(base64Str); return; }
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => {
            resolve(base64Str);
        };
    });
};
