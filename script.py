import re

with open('js/modules/scanner_module.js', 'r', encoding='utf-8') as f:
    content = f.read()

start_str = "    renderDeck(container) {"
end_str = "if (window.lucide) window.lucide.createIcons();\n    }"

start_idx = content.find(start_str)
end_idx = content.find(end_str, start_idx) + len(end_str)

if start_idx == -1 or end_idx < len(end_str):
    print("Could not find bounds")
    exit(1)

new_render_deck = """    renderDeck(container) {
        if (!container) return;

        // Preserve any user-entered form values so inputs never wipe
        const curFreqInput = document.getElementById('custom-ch-freq');
        const curNameInput = document.getElementById('custom-ch-name');
        const curUrlInput  = document.getElementById('custom-ch-url');

        if (curFreqInput && curFreqInput.value) this.customFormDraft.freq = curFreqInput.value;
        if (curNameInput && curNameInput.value) this.customFormDraft.name = curNameInput.value;
        if (curUrlInput  && curUrlInput.value)  this.customFormDraft.url  = curUrlInput.value;

        const draftFreq = this.customFormDraft?.freq || '';
        const draftName = this.customFormDraft?.name || '';
        const draftUrl  = this.customFormDraft?.url || '';

        const isLive = this.isPlaying && (!this.audioEl?.paused || this.synthActive);
        const currentFreq = this.currentChannel ? this.currentChannel.freq : '162.400 MHz';
        const currentName = this.currentChannel ? this.currentChannel.name : 'NOAA Weather Radio (NWS)';
        const currentBand = this.currentChannel ? this.currentChannel.band : 'VHF-NWS';

        const backlightClass = this.backlightOn === false 
            ? 'w-full h-32 bg-[#0a100a] border-4 border-gray-700 rounded-xl p-2 flex flex-col relative shadow-[inset_0_0_30px_rgba(0,0,0,0.9)] overflow-hidden transition-colors duration-300 opacity-70' 
            : 'w-full h-32 bg-[#1a2f1c] border-4 border-gray-700 rounded-xl p-2 flex flex-col relative shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] overflow-hidden transition-colors duration-300';
            
        const textClass = this.backlightOn === false ? 'text-[#1b3b22]' : 'text-[#4ade80]';

        container.innerHTML = `
            <div id="trc-scanner-deck-container" class="w-full flex flex-col items-center justify-center p-2 pb-16 space-y-4">
                
                <!-- RETURN BAR -->
                <div class="w-full max-w-sm flex items-center justify-between mb-2 px-2">
                    <button onclick="window.renderWorkstationMenu ? window.renderWorkstationMenu() : null" class="bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded text-[10px] font-black uppercase flex items-center gap-1.5 transition-colors shadow-md">
                        <i data-lucide="arrow-left" class="w-3 h-3"></i> WORKSTATION
                    </button>
                    <span class="text-[9px] font-mono text-cyan-500 font-bold tracking-widest uppercase">TRC-V8 TACTICAL RX</span>
                </div>

                <!-- THE HANDHELD RADIO -->
                <div class="relative w-72 flex flex-col items-center select-none drop-shadow-2xl mx-auto">
                    <!-- Antenna & Knob (Top) -->
                    <div class="w-full flex justify-between items-end px-6 -mb-2 relative z-0">
                        <!-- Antenna (Left) -->
                        <div class="w-4 h-28 bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 rounded-t-full border-2 border-gray-950 shadow-inner"></div>
                        <!-- Power/Volume Knob (Right) -->
                        <div class="w-10 h-8 bg-gradient-to-t from-gray-900 to-gray-700 rounded-t-sm border-2 border-gray-900 shadow-md cursor-pointer flex flex-col justify-between items-center py-1 group" onclick="window.TacticalScanner.toggleBacklight()" title="Toggle Screen Backlight">
                            <div class="w-full h-0.5 bg-gray-500/30 group-hover:bg-cyan-500/50"></div>
                            <div class="w-full h-0.5 bg-gray-500/30 group-hover:bg-cyan-500/50"></div>
                            <div class="w-full h-0.5 bg-gray-500/30 group-hover:bg-cyan-500/50"></div>
                        </div>
                    </div>

                    <!-- Radio Body -->
                    <div class="w-full bg-gradient-to-b from-gray-800 to-gray-950 rounded-[2rem] border-4 border-gray-900 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative z-10 flex flex-col p-4 box-border">
                        
                        <!-- Side PTT Button (Sticking out left) -->
                        <div class="absolute -left-3 top-24 w-4 h-16 bg-orange-600 rounded-l-md border-2 border-r-0 border-orange-800 shadow-md cursor-pointer active:scale-95 active:bg-orange-700 flex items-center justify-center" onclick="window.TacticalScanner.togglePlayback()" title="PTT / LISTEN">
                            <div class="h-8 w-1 bg-orange-800/50 rounded"></div>
                        </div>

                        <!-- Brand / Speaker Grille -->
                        <div class="flex justify-between items-center w-full mb-3 px-2">
                            <span class="text-[10px] font-black text-gray-500 tracking-widest italic">TRC-COMMS</span>
                            <div class="flex gap-1">
                                <div class="w-1.5 h-1.5 rounded-full ${isLive ? 'bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]' : 'bg-red-950 opacity-50'}"></div>
                                <div class="w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]' : 'bg-emerald-950 opacity-50'}"></div>
                            </div>
                        </div>

                        <!-- LCD Screen -->
                        <div id="tac-scanner-lcd-screen" class="${backlightClass}">
                            <!-- LCD Content -->
                            <div class="flex justify-between items-start text-[8px] font-mono ${textClass} font-bold opacity-80 mb-1">
                                <span id="tac-scanner-deck-status-badge">${isLive ? 'RX' : 'STANDBY'}</span>
                                <span id="tac-scanner-deck-band-badge">${currentBand}</span>
                                <span>BATT ■■■</span>
                            </div>
                            
                            <div id="tac-scanner-deck-freq-display" class="font-mono text-3xl font-black ${textClass} tracking-wider text-center mt-1 drop-shadow-[0_0_5px_rgba(74,222,128,0.3)]">
                                ${currentFreq}
                            </div>
                            
                            <div id="tac-scanner-deck-name-display" class="text-[9px] font-bold ${textClass} text-center uppercase tracking-wider truncate px-1 opacity-90 mt-1">
                                ${currentName}
                            </div>

                            <!-- Mini LCD Terminal for 2 lines -->
                            <div id="diag-terminal-body" class="mt-auto h-6 font-mono text-[6.5px] leading-tight ${textClass} opacity-80 overflow-hidden flex flex-col justify-end">
                                <!-- Populated by renderDiagnosticTerminalEntries -->
                            </div>
                            
                            <!-- LCD Scanline Overlay -->
                            <div class="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none rounded-lg opacity-50"></div>
                        </div>

                        <!-- Main Function Keys -->
                        <div class="flex justify-between w-full mt-5 px-1 gap-2">
                            <button id="tac-scanner-deck-play-btn" onclick="window.TacticalScanner.togglePlayback()" class="${isLive ? 'bg-orange-600 border-orange-800 hover:bg-orange-500' : 'bg-emerald-600 border-emerald-800 hover:bg-emerald-500'} flex-1 py-2 rounded border-b-4 text-[10px] font-black text-white uppercase tracking-wider active:border-b-0 active:translate-y-1 transition-all">
                                ${isLive ? 'STOP RX' : 'LISTEN'}
                            </button>
                            <button onclick="window.TacticalScanner.autoLocateLocalGps()" class="bg-cyan-700 border-cyan-900 hover:bg-cyan-600 flex-1 py-2 rounded border-b-4 text-[10px] font-black text-white uppercase tracking-wider active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-1">
                                <i data-lucide="crosshair" class="w-3 h-3 ${this.isDetectingGps ? 'animate-spin' : ''}"></i> GPS SCAN
                            </button>
                        </div>

                        <!-- Keypad Grid -->
                        <div class="grid grid-cols-3 gap-3 mt-5 px-2">
                            ${[1,2,3,4,5,6,7,8,9,'*',0,'#'].map(num => `
                                <button onclick="window.TacticalScanner.playRadioBurst(0.05)" class="bg-gray-800 border-2 border-gray-900 hover:bg-gray-700 rounded-md py-1.5 text-sm font-black text-gray-300 shadow-sm active:scale-95 transition-all text-center select-none">
                                    ${num}
                                </button>
                            `).join('')}
                        </div>

                        <!-- Speaker Grille Pattern -->
                        <div class="w-full flex justify-center gap-1.5 mt-6 px-4 pb-2">
                            <div class="w-1.5 h-10 bg-gray-950 rounded-full shadow-inner"></div>
                            <div class="w-1.5 h-10 bg-gray-950 rounded-full shadow-inner"></div>
                            <div class="w-1.5 h-10 bg-gray-950 rounded-full shadow-inner"></div>
                            <div class="w-1.5 h-10 bg-gray-950 rounded-full shadow-inner"></div>
                            <div class="w-1.5 h-10 bg-gray-950 rounded-full shadow-inner"></div>
                        </div>
                    </div>
                </div>

                <!-- QUICK MANUAL INPUT PANEL (BELOW RADIO) -->
                <div class="w-full max-w-sm mt-4 bg-slate-950/80 border border-slate-800 rounded-xl p-4 shadow-lg relative z-20">
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="text-[9px] font-black uppercase text-cyan-500 flex items-center gap-1.5">
                            <i data-lucide="edit-3" class="w-3 h-3"></i> QUICK-ENTRY PROGRAMMING
                        </h3>
                        <button onclick="window.TacticalScanner.clearCustomForm()" class="text-[8px] text-gray-500 hover:text-white uppercase font-bold tracking-wider">CLEAR</button>
                    </div>
                    
                    <div id="custom-stream-warning" class="hidden mb-3 p-2 bg-red-950/90 border border-red-500 rounded text-[9px] font-mono text-red-200 leading-relaxed"></div>
                    
                    <form onsubmit="event.preventDefault(); window.TacticalScanner.handleCustomSubmit(true);" class="space-y-2">
                        <div class="grid grid-cols-2 gap-2">
                            <input type="text" id="custom-ch-freq" value="${draftFreq}" oninput="window.TacticalScanner.updateFormDraft('freq', this.value)" placeholder="FREQ (154.280)" required class="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-[10px] text-white font-mono uppercase focus:border-cyan-500 outline-none w-full">
                            <input type="text" id="custom-ch-name" value="${draftName}" oninput="window.TacticalScanner.updateFormDraft('name', this.value)" placeholder="NAME (FIRE NET)" required class="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-[10px] text-white font-mono uppercase focus:border-cyan-500 outline-none w-full">
                        </div>
                        <input type="text" id="custom-ch-url" value="${draftUrl}" oninput="window.TacticalScanner.updateFormDraft('url', this.value)" placeholder="STREAM URL (.mp3 / Icecast)" required class="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-[10px] text-white font-mono focus:border-cyan-500 outline-none w-full">
                        
                        <input type="hidden" id="custom-ch-cat" value="custom">

                        <button type="submit" class="w-full mt-2 bg-cyan-700 hover:bg-cyan-600 text-white font-black py-2 rounded text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5">
                            <i data-lucide="upload" class="w-3 h-3"></i> PROGRAM & TUNE RADIO
                        </button>
                    </form>
                    
                    <div class="mt-3 flex gap-2">
                        <button onclick="window.TacticalScanner.loadTestFeed('rail', true)" class="flex-1 bg-slate-900 border border-slate-700 hover:border-slate-500 text-gray-400 hover:text-white py-1.5 rounded text-[8px] font-bold uppercase tracking-wider">LOAD RAILROAD</button>
                        <button onclick="window.TacticalScanner.loadTestFeed('synth', true)" class="flex-1 bg-slate-900 border border-slate-700 hover:border-slate-500 text-gray-400 hover:text-white py-1.5 rounded text-[8px] font-bold uppercase tracking-wider">LOAD SYNTH</button>
                        <button onclick="window.TacticalScanner.openCountyDirectoryModal()" class="flex-1 bg-slate-900 border border-slate-700 hover:border-slate-500 text-gray-400 hover:text-white py-1.5 rounded text-[8px] font-bold uppercase tracking-wider" title="Open County Intel Roster">INTEL</button>
                    </div>
                </div>

            </div>
        `;

        if (window.lucide) window.lucide.createIcons();
        this.renderDiagnosticTerminalEntries();
    }"""

new_content = content[:start_idx] + new_render_deck + content[end_idx:]

with open('js/modules/scanner_module.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Replaced successfully.")
