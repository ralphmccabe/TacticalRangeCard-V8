// TACTICAL RANGE CARD V8 - MISSION STATUS BOARD
// js/modules/mission_board.js

let msbChannel = null;
let sitreps = []; // In-memory store for session

function renderFeed() {
    const feed = document.getElementById('mission-status-feed');
    if (!feed) return;
    
    if (sitreps.length === 0) {
        feed.innerHTML = '<div class="text-[8px] text-gray-500 font-mono text-center mt-2">WAITING FOR COMMAND UPDATE...</div>';
        return;
    }

    feed.innerHTML = sitreps.map(r => {
        const time = new Date(r.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
        return `<div class="bg-black/40 border border-gray-800 rounded p-1.5 mb-1.5 shadow-sm">
            <div class="flex justify-between items-center mb-1">
                <span class="text-[7px] font-bold text-yellow-500 bg-yellow-900/30 px-1 rounded">${r.role}</span>
                <span class="text-[6px] text-gray-500 font-mono">${time}</span>
            </div>
            <div class="text-[9px] text-gray-300 font-mono">${r.message}</div>
            <div class="text-[6px] text-gray-600 mt-1 text-right border-t border-gray-800/50 pt-0.5">AUTHOR: ${r.author}</div>
        </div>`;
    }).join('');
    
    // Auto scroll to bottom
    feed.scrollTop = feed.scrollHeight;
}

window.promptMissionStatus = function() {
    const callsign = document.getElementById('comms-callsign')?.value?.toUpperCase() || 'UNKNOWN';
    const role = document.getElementById('comms-role')?.value?.toUpperCase() || 'OPERATOR';
    
    const msg = prompt("Enter Mission SITREP (Status Report):");
    if (!msg || !msg.trim()) return;

    const payload = {
        id: 'MSB-' + Date.now(),
        author: callsign,
        role: role,
        message: msg.trim(),
        timestamp: Date.now()
    };

    // Add locally
    sitreps.push(payload);
    renderFeed();

    // Broadcast
    if (msbChannel) {
        msbChannel.send({
            type: 'broadcast',
            event: 'new_sitrep',
            payload: payload
        });
    }
    
    window.pushTacLog?.(`COMMAND POST: SITREP UPDATED BY ${callsign}`, 'INFO');
};

function enforceRoleUI() {
    const roleInput = document.getElementById('comms-role');
    const postBtn = document.getElementById('msb-post-btn');
    if (!roleInput || !postBtn) return;
    
    const val = roleInput.value.toUpperCase();
    // Only Command, Lead, or IC can post
    if (val.includes('COMMAND') || val.includes('LEAD') || val.includes('IC') || val.includes('HQ') || val.includes('DISPATCH') || val.includes('CMDPST')) {
        postBtn.classList.remove('hidden');
    } else {
        postBtn.classList.add('hidden');
    }
}

export function initMissionBoard() {
    console.log('[V8 ENGINE] Mission Status Board starting...');
    
    // Poll for Supabase and Role changes
    const wait = setInterval(() => {
        const sb = window.supabaseClient;
        const linkBtn = document.getElementById('comms-connect-btn');
        
        // Enforce UI on typing in the role box
        const roleInput = document.getElementById('comms-role');
        if (roleInput && !roleInput.dataset.msbBound) {
            roleInput.addEventListener('input', enforceRoleUI);
            roleInput.dataset.msbBound = 'true';
        }

        if (sb && linkBtn) {
            clearInterval(wait);
            
            // Re-check role when link is clicked
            linkBtn.addEventListener('click', enforceRoleUI);

            msbChannel = sb.channel('trc-mission-board');
            msbChannel
                .on('broadcast', {event: 'new_sitrep'}, ({payload}) => {
                    sitreps.push(payload);
                    renderFeed();
                    window.pushTacLog?.(`COMMAND POST: NEW SITREP RECEIVED`, 'INFO');
                })
                .on('broadcast', {event: 'sync_request'}, () => {
                    // If we have history, send it to the new guy
                    if (sitreps.length > 0) {
                        msbChannel.send({
                            type: 'broadcast',
                            event: 'sync_response',
                            payload: sitreps
                        });
                    }
                })
                .on('broadcast', {event: 'sync_response'}, ({payload}) => {
                    // Merge remote history if ours is empty
                    if (sitreps.length === 0 && Array.isArray(payload)) {
                        sitreps = payload;
                        renderFeed();
                    }
                })
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        // Ask others for history
                        msbChannel.send({ type: 'broadcast', event: 'sync_request' });
                    }
                });
                
            console.log('[V8 ENGINE] Mission Board Channel live.');
        }
    }, 500);
}
