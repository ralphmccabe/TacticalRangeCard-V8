// TACTICAL RANGE CARD V8 - LIVEKIT SFU ENGINE
// js/modules/sfu_audio.js

let currentRoom = null;
let currentFreq = null;
let micTrack = null;

const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function playTone(type) {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'permit') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1600, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'roger') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime + 0.05);
        osc.frequency.setValueAtTime(600, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
    } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    }
}

async function connectToLiveKit(missionId, callsign, role, freq) {
    if (currentRoom) {
        await currentRoom.disconnect();
        currentRoom = null;
    }
    currentFreq = freq;
    
    const roomName = `${missionId}-${freq}`;
    
    try {
        window.pushTacLog(`CONNECTING SECURE COMM LINK [${freq}]...`, "SYS");
        
        const res = await fetch(`/livekit-token?room=${encodeURIComponent(roomName)}&user=${encodeURIComponent(callsign)}`);
        if (!res.ok) throw new Error("Failed to get LiveKit token");
        
        const data = await res.json();
        const token = data.token;
        const wsUrl = "wss://tacticlerangecardv-8-xp5phgeh.livekit.cloud";
        
        if (!window.LivekitClient) {
            console.error("LiveKit Client SDK not loaded.");
            return;
        }
        
        const room = new window.LivekitClient.Room({
            adaptiveStream: true,
            dynacast: true,
        });
        
        room.on(window.LivekitClient.RoomEvent.TrackSubscribed, (track, publication, participant) => {
            if (track.kind === window.LivekitClient.Track.Kind.Audio) {
                const element = track.attach();
                document.body.appendChild(element);
            }
        });
        
        room.on(window.LivekitClient.RoomEvent.TrackUnsubscribed, (track) => {
            track.detach();
        });
        
        room.on(window.LivekitClient.RoomEvent.ActiveSpeakersChanged, (speakers) => {
            const pttBtn = document.getElementById('ptt-btn');
            const speakerLabel = document.getElementById('ptt-active-speaker');
            
            const otherSpeakers = speakers.filter(s => s.identity !== callsign);
            
            if (otherSpeakers.length > 0) {
                const isCommand = (window.commsUser?.role||'').toUpperCase().includes('COMMAND') || (window.commsUser?.role||'').toUpperCase().includes('INSTRUCTOR');
                
                if (!isCommand && pttBtn) {
                    pttBtn.classList.remove('bg-slate-900', 'border-slate-700', 'text-slate-400');
                    pttBtn.classList.add('bg-red-900', 'border-red-500', 'text-red-200');
                    pttBtn.dataset.busy = "true";
                    document.getElementById('ptt-status').innerText = "CHANNEL BUSY";
                }
                if (speakerLabel) {
                    speakerLabel.innerText = `RX: ${otherSpeakers[0].identity}`;
                    speakerLabel.style.color = '#ef4444';
                }
            } else {
                if (pttBtn) {
                    pttBtn.classList.add('bg-slate-900', 'border-slate-700', 'text-slate-400');
                    pttBtn.classList.remove('bg-red-900', 'border-red-500', 'text-red-200');
                    pttBtn.dataset.busy = "false";
                    
                    if (pttBtn.dataset.talking !== "true") {
                        document.getElementById('ptt-status').innerText = "STANDBY";
                    }
                }
                if (speakerLabel) {
                    speakerLabel.innerText = "";
                }
            }
        });
        
        await room.connect(wsUrl, token);
        window.pushTacLog(`SFU AUDIO LINK SECURED: ${freq}`, "SUCCESS");
        currentRoom = room;
        
        const localTracks = await window.LivekitClient.createLocalTracks({ audio: true, video: false });
        micTrack = localTracks[0];
        await room.localParticipant.publishTrack(micTrack);
        await room.localParticipant.setMicrophoneEnabled(false);
        
        hookPTTButton();
        
    } catch (err) {
        console.error("LiveKit connection error:", err);
        window.pushTacLog(`SFU AUDIO LINK FAILED: ${err.message}`, "WARNING");
    }
}

function hookPTTButton() {
    const pttBtn = document.getElementById('ptt-btn');
    if (!pttBtn) return;
    
    // Replace element to wipe old event listeners
    const newBtn = pttBtn.cloneNode(true);
    pttBtn.parentNode.replaceChild(newBtn, pttBtn);
    const finalBtn = document.getElementById('ptt-btn');
    
    const startPTT = async (e) => {
        if (e) e.preventDefault();
        if (e.type === 'touchstart' && e.cancelable) e.preventDefault(); // prevent double fire with mousedown
        
        if (finalBtn.dataset.busy === "true") {
            playTone('error');
            return;
        }
        
        if (currentRoom && micTrack) {
            playTone('permit');
            await currentRoom.localParticipant.setMicrophoneEnabled(true);
            
            finalBtn.dataset.talking = "true";
            finalBtn.classList.remove('bg-slate-900', 'border-slate-700', 'text-slate-400', 'text-emerald-400', 'border-emerald-500', 'bg-emerald-900/30');
            finalBtn.classList.add('bg-emerald-900', 'border-emerald-400', 'text-emerald-100', 'shadow-[0_0_15px_rgba(16,185,129,0.5)]', 'scale-[0.98]');
            
            const icon = finalBtn.querySelector('i');
            if(icon) {
                icon.classList.remove('text-slate-600');
                icon.classList.add('text-emerald-300', 'drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]');
            }
            document.getElementById('ptt-status').innerText = "TRANSMITTING";
            document.getElementById('ptt-status').classList.replace('text-gray-400', 'text-emerald-400');
        }
    };
    
    const stopPTT = async (e) => {
        if (e) e.preventDefault();
        
        if (finalBtn.dataset.talking === "true") {
            playTone('roger');
            if (currentRoom) {
                await currentRoom.localParticipant.setMicrophoneEnabled(false);
            }
            
            finalBtn.dataset.talking = "false";
            finalBtn.classList.remove('bg-emerald-900', 'border-emerald-400', 'text-emerald-100', 'shadow-[0_0_15px_rgba(16,185,129,0.5)]', 'scale-[0.98]');
            finalBtn.classList.add('bg-slate-900', 'border-slate-700', 'text-slate-400');
            
            const icon = finalBtn.querySelector('i');
            if(icon) {
                icon.classList.remove('text-emerald-300', 'drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]');
                icon.classList.add('text-slate-600');
            }
            document.getElementById('ptt-status').innerText = finalBtn.dataset.busy === "true" ? "CHANNEL BUSY" : "STANDBY";
            document.getElementById('ptt-status').classList.replace('text-emerald-400', 'text-gray-400');
        }
    };
    
    // Bind robustly
    finalBtn.addEventListener('mousedown', startPTT);
    document.addEventListener('mouseup', stopPTT); // catch release outside
    finalBtn.addEventListener('touchstart', startPTT, {passive: false});
    document.addEventListener('touchend', stopPTT);
}

const waitCore = setInterval(() => {
    if (window.commsChannel && window.commsUser) {
        clearInterval(waitCore);
        
        const liveFreqEl = document.getElementById('live-freq');
        if (liveFreqEl) {
            if (window.commsUser && window.commsUser.freq) {
                liveFreqEl.value = window.commsUser.freq;
            }
            liveFreqEl.addEventListener('change', (e) => {
                const newFreq = e.target.value;
                if (window.commsUser) window.commsUser.freq = newFreq;
                
                if (window.commsChannel) {
                    window.commsChannel.track({
                        online_at: new Date().toISOString(),
                        location: window.myLatestCoords || null,
                        user: window.commsUser,
                        distress: window.isDistressActive || false,
                        dutyStatus: window.myDutyStatus || ''
                    }).catch(err => {});
                }
                
                if (window.commsUser && window.commsUser.callsign) {
                    const passEl = document.getElementById('comms-passcode');
                    const mission = passEl ? passEl.value.trim() : 'TRC-MISSION-V8';
                    connectToLiveKit(
                        mission,
                        window.commsUser.callsign,
                        window.commsUser.role,
                        newFreq
                    );
                }
            });
        }
        
        // Initial connection
        const passEl = document.getElementById('comms-passcode');
        const mission = passEl ? passEl.value.trim() : 'TRC-MISSION-V8';
        const freq = window.commsUser.freq || 'ALPHA';
        connectToLiveKit(mission, window.commsUser.callsign, window.commsUser.role, freq);
        
        console.log('[V8 ENGINE] LiveKit Audio Module loaded.');
    }
}, 500);

export { connectToLiveKit };
