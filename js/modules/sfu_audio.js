// TACTICAL RANGE CARD V8 — LIVEKIT SFU ENGINE
// js/modules/sfu_audio.js
// Architecture: Pre-warmed audio track, instant mute/unmute PTT, mobile autoplay unlocking.

let currentRoom = null;
let currentFreq  = null;
let localAudioTrack = null;

// ─── TONES (Guaranteed AudioContext resumption) ───────────────────────────────
function playTone(type) {
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!window.trcAudioCtx || window.trcAudioCtx.state === 'closed') {
            window.trcAudioCtx = new AC();
        }
        const ctx = window.trcAudioCtx;

        const executeTone = function() {
            try {
                const t = ctx.currentTime;
                if (type === 'permit') {
                    // Crisp military radio chirp (950Hz -> 1250Hz)
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(950, t);
                    osc.frequency.exponentialRampToValueAtTime(1250, t + 0.08);
                    gain.gain.setValueAtTime(0.25, t);
                    gain.gain.linearRampToValueAtTime(0.001, t + 0.12);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(t);
                    osc.stop(t + 0.13);
                } else if (type === 'roger') {
                    // Motorola style Roger double-beep
                    const osc1 = ctx.createOscillator();
                    const gain1 = ctx.createGain();
                    osc1.type = 'square';
                    osc1.frequency.setValueAtTime(880, t);
                    gain1.gain.setValueAtTime(0.12, t);
                    gain1.gain.linearRampToValueAtTime(0.001, t + 0.06);
                    osc1.connect(gain1);
                    gain1.connect(ctx.destination);
                    osc1.start(t);
                    osc1.stop(t + 0.07);

                    const osc2 = ctx.createOscillator();
                    const gain2 = ctx.createGain();
                    osc2.type = 'square';
                    osc2.frequency.setValueAtTime(660, t + 0.08);
                    gain2.gain.setValueAtTime(0.12, t + 0.08);
                    gain2.gain.linearRampToValueAtTime(0.001, t + 0.15);
                    osc2.connect(gain2);
                    gain2.connect(ctx.destination);
                    osc2.start(t + 0.08);
                    osc2.stop(t + 0.16);
                } else if (type === 'error') {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(200, t);
                    gain.gain.setValueAtTime(0.2, t);
                    gain.gain.linearRampToValueAtTime(0.001, t + 0.25);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(t);
                    osc.stop(t + 0.26);
                }
            } catch(e) {
                console.warn('Tone play error:', e);
            }
        };

        if (ctx.state === 'suspended') {
            ctx.resume().then(executeTone).catch(executeTone);
        } else {
            executeTone();
        }
    } catch(e) {}
}

// ─── CONNECT TO LIVEKIT ───────────────────────────────────────────────────────
async function connectToLiveKit(missionId, callsign, role, freq) {
    if (currentRoom) {
        try { await currentRoom.disconnect(); } catch (e) {}
        currentRoom = null;
    }
    window.sfuStartPTT = null;
    window.sfuStopPTT  = null;
    currentFreq = freq;
    localAudioTrack = null;

    const roomName = missionId + '-' + freq;

    try {
        if (window.pushTacLog) window.pushTacLog('CONNECTING [' + freq + ']...', 'SYS');

        // Stop legacy getUserMedia tracks so AEC has a fresh context
        if (window.activeMicStream) {
            window.activeMicStream.getTracks().forEach(function(t){ t.stop(); });
            window.activeMicStream = null;
        }

        const apiKey    = 'APITy5FkUwwNzcw';
        const apiSecret = 'vIlpkOpK11f0jeATaTPz2Oni6UaB6lTkK4LycHudrI2';
        const header  = { alg: 'HS256', typ: 'JWT' };
        const payload = {
            iss: apiKey, sub: callsign, name: callsign,
            exp: Math.floor(Date.now() / 1000) + 43200,
            nbf: Math.floor(Date.now() / 1000) - 10,
            video: { roomJoin: true, room: roomName },
        };
        var token = KJUR.jws.JWS.sign(null, header, payload, { utf8: apiSecret });
        var wsUrl = 'wss://tacticlerangecardv-8-xp5phgeh.livekit.cloud';

        if (!window.LivekitClient) {
            if (window.pushTacLog) window.pushTacLog('LIVEKIT SDK NOT LOADED', 'WARNING');
            return;
        }

        var room = new window.LivekitClient.Room({ adaptiveStream: true, dynacast: true });

        window.sfuAudioElements = window.sfuAudioElements || [];

        // Incoming audio from remote participants
        room.on(window.LivekitClient.RoomEvent.TrackSubscribed, function(track, _pub, participant) {
            if (track.kind !== window.LivekitClient.Track.Kind.Audio) return;
            if (participant.isLocal) return;

            var el = track.attach();
            el.setAttribute('playsinline', 'true');
            el.setAttribute('webkit-playsinline', 'true');
            el.autoplay    = true;
            el.playsInline = true;
            var pttBtnEl = document.getElementById('ptt-btn');
            el.muted       = (pttBtnEl && pttBtnEl.dataset.talking === 'true');
            el.dataset.sfuRx = 'true';
            if (typeof el.setSinkId === 'function') el.setSinkId('default').catch(function(){});
            document.body.appendChild(el);
            window.sfuAudioElements.push(el);

            // Unlock audio playback immediately on mobile
            if (room.startAudio) room.startAudio().catch(function(){});
            var p = el.play();
            if (p && p.catch) {
                p.catch(function() {
                    const unlock = function() {
                        if (room.startAudio) room.startAudio().catch(function(){});
                        el.play().catch(function(){});
                        document.removeEventListener('click', unlock);
                        document.removeEventListener('touchend', unlock);
                    };
                    document.addEventListener('click', unlock, { once: true });
                    document.addEventListener('touchend', unlock, { once: true });
                });
            }
            if (window.pushTacLog) window.pushTacLog('RX: ' + participant.identity, 'SYS');
        });

        room.on(window.LivekitClient.RoomEvent.TrackUnsubscribed, function(track){
            try { track.detach(); } catch(e){}
        });

        // Channel-busy indicator
        room.on(window.LivekitClient.RoomEvent.ActiveSpeakersChanged, function(speakers) {
            var btn      = document.getElementById('ptt-btn');
            var statusEl = document.getElementById('ptt-status');
            var lblEl    = document.getElementById('ptt-active-speaker');
            if (!btn) return;
            var others = speakers.filter(function(s){ return s.identity !== callsign; });
            var isCmd  = /COMMAND|INSTRUCTOR|LEAD|DISPATCH/i.test((window.commsUser && window.commsUser.role) || '');
            if (others.length > 0) {
                if (!isCmd) { btn.dataset.busy = 'true'; if (statusEl && btn.dataset.talking !== 'true') statusEl.innerText = 'CHANNEL BUSY'; }
                if (lblEl) { lblEl.innerText = 'RX: ' + others[0].identity; lblEl.style.color = '#ef4444'; }
            } else {
                btn.dataset.busy = 'false';
                if (statusEl && btn.dataset.talking !== 'true') statusEl.innerText = 'STANDBY';
                if (lblEl) lblEl.innerText = '';
            }
        });

        await room.connect(wsUrl, token);
        currentRoom = room;
        window.sfuRoom = room;

        // Auto-unlock audio engine on connect
        if (room.startAudio) room.startAudio().catch(function(){});

        // Pre-warm local microphone track on login so PTT is instant (0ms delay)
        try {
            localAudioTrack = await window.LivekitClient.createLocalAudioTrack({
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: false,
                voiceIsolation: true
            });
            await room.localParticipant.publishTrack(localAudioTrack);
            await localAudioTrack.mute(); // Muted by default until PTT is pressed
        } catch(micErr) {
            console.warn('[SFU] Pre-warm mic deferred until PTT press:', micErr);
        }

        if (window.pushTacLog) window.pushTacLog('LINK SECURED [' + freq + '] — PTT READY', 'SUCCESS');

        // ── Expose PTT handlers on window for trc_core to call ──
        window.sfuStartPTT = async function() {
            var btn      = document.getElementById('ptt-btn');
            var statusEl = document.getElementById('ptt-status');
            if (!btn || btn.dataset.busy === 'true') { playTone('error'); return; }
            if (btn.dataset.talking === 'true') return;
            btn.dataset.talking = 'true';
            playTone('permit');

            // Mute all incoming speakers while transmitting — prevents self-echo
            document.querySelectorAll('audio').forEach(function(el){ el.muted = true; });
            (window.sfuAudioElements || []).forEach(function(el){ el.muted = true; });

            try {
                if (localAudioTrack) {
                    await localAudioTrack.unmute();
                } else if (currentRoom && currentRoom.localParticipant) {
                    await currentRoom.localParticipant.setMicrophoneEnabled(true);
                    localAudioTrack = currentRoom.localParticipant.getTrackPublication(window.LivekitClient.Track.Source.Microphone)?.track || null;
                }
            } catch(e) {
                console.error("LiveKit mic enable failed:", e);
                if (window.pushTacLog) window.pushTacLog("MIC ERROR: " + e.message, "ERROR");
                btn.dataset.talking = 'false';
                (window.sfuAudioElements || []).forEach(function(el){ el.muted = false; });
                return;
            }

            btn.classList.add('border-emerald-500', 'bg-emerald-900/60');
            if (statusEl) { statusEl.innerText = 'TRANSMITTING'; statusEl.style.color = '#34d399'; }
            var spk = document.getElementById('ptt-active-speaker');
            if (spk) { spk.innerText = 'TX: ' + callsign; spk.style.color = '#34d399'; }
        };

        window.sfuStopPTT = async function() {
            var btn      = document.getElementById('ptt-btn');
            var statusEl = document.getElementById('ptt-status');
            if (!btn || btn.dataset.talking !== 'true') return;
            btn.dataset.talking = 'false';
            playTone('roger');

            try {
                if (localAudioTrack) {
                    await localAudioTrack.mute();
                } else if (currentRoom && currentRoom.localParticipant) {
                    await currentRoom.localParticipant.setMicrophoneEnabled(false);
                }
            } catch(e) {}

            // Restore incoming speakers now that we're done transmitting
            document.querySelectorAll('audio').forEach(function(el){ el.muted = false; });
            (window.sfuAudioElements || []).forEach(function(el){ el.muted = false; });

            btn.classList.remove('border-emerald-500', 'bg-emerald-900/60');
            if (statusEl) { statusEl.innerText = btn.dataset.busy === 'true' ? 'CHANNEL BUSY' : 'STANDBY'; statusEl.style.color = ''; }
            var spk = document.getElementById('ptt-active-speaker');
            if (spk) { spk.innerText = ''; }
        };

    } catch (err) {
        console.error('[SFU] Connection error:', err);
        if (window.pushTacLog) window.pushTacLog('SFU FAILED: ' + err.message, 'WARNING');
    }
}

// Global unlock on any user tap anywhere
const unlockAllAudio = function() {
    if (currentRoom && currentRoom.startAudio) {
        currentRoom.startAudio().catch(function(){});
    }
    if (window.trcAudioCtx && window.trcAudioCtx.state === 'suspended') {
        window.trcAudioCtx.resume().catch(function(){});
    }
    (window.sfuAudioElements || []).forEach(function(el) {
        if (el.paused && !el.muted) el.play().catch(function(){});
    });
};
document.addEventListener('click', unlockAllAudio, { passive: true });
document.addEventListener('touchend', unlockAllAudio, { passive: true });

// Expose functions globally
window.connectToLiveKit = connectToLiveKit;
window._sfuDisconnect = async function() {
    if (currentRoom) {
        try { await currentRoom.disconnect(); } catch(e) {}
        currentRoom = null;
        window.sfuRoom = null;
    }
    localAudioTrack = null;
    window.sfuStartPTT = null;
    window.sfuStopPTT = null;
};

// ─── BOOT & DIAL WATCHER ─────────────────────────────────────────────────────
var _dialWired = false;
setInterval(function() {
    var liveFreqEl = document.getElementById('live-freq');
    if (liveFreqEl && !_dialWired) {
        _dialWired = true;
        liveFreqEl.addEventListener('change', function(e) {
            var newFreq = e.target.value;
            if (window.commsUser) window.commsUser.freq = newFreq;
            if (window.commsChannel) window.commsChannel.track({
                online_at: new Date().toISOString(), location: window.myLatestCoords || null,
                user: window.commsUser, distress: window.isDistressActive || false,
                dutyStatus: window.myDutyStatus || '',
            }).catch(function(){});
            var passEl  = document.getElementById('comms-passcode');
            var mission = passEl ? passEl.value.trim() : 'TRC-MISSION-V8';
            if (window.commsUser && window.commsUser.callsign) {
                connectToLiveKit(mission, window.commsUser.callsign, window.commsUser.role, newFreq);
            }
        });
    }

    // Auto-connect if user is logged in but LiveKit room is not yet connected
    if (window.commsChannel && window.commsUser && !currentRoom && !window.isIntentionalDisconnect) {
        var passEl  = document.getElementById('comms-passcode');
        var mission = passEl ? passEl.value.trim() : 'TRC-MISSION-V8';
        var freq    = window.commsUser.freq || 'ALPHA';
        connectToLiveKit(mission, window.commsUser.callsign, window.commsUser.role, freq);
    }
}, 800);

export { connectToLiveKit };
