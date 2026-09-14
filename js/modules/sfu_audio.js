// TACTICAL RANGE CARD V8 — LIVEKIT SFU ENGINE
// js/modules/sfu_audio.js
// Architecture: sfu_audio exposes window.sfuStartPTT / window.sfuStopPTT
// trc_core.js owns the button DOM — it calls these window functions on press/release.
// No button cloning. No competing addEventListener. Clean separation.

let currentRoom = null;
let currentFreq  = null;

// ─── TONES ───────────────────────────────────────────────────────────────────
function playTone(type) {
    try {
        const AC  = window.AudioContext || window.webkitAudioContext;
        const ctx = window.trcAudioCtx || new AC();
        if (!window.trcAudioCtx) window.trcAudioCtx = ctx;
        if (ctx.state === 'suspended') ctx.resume();
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t = ctx.currentTime;
        if (type === 'permit') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, t);
            osc.frequency.exponentialRampToValueAtTime(1600, t + 0.12);
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
            gain.gain.linearRampToValueAtTime(0, t + 0.12);
            osc.start(t); osc.stop(t + 0.15);
        } else if (type === 'roger') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(700, t);
            gain.gain.setValueAtTime(0.08, t);
            gain.gain.linearRampToValueAtTime(0, t + 0.08);
            osc.start(t); osc.stop(t + 0.25);
        } else if (type === 'error') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, t);
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.linearRampToValueAtTime(0, t + 0.3);
            osc.start(t); osc.stop(t + 0.3);
        }
    } catch (e) {}
}

// ─── CONNECT ─────────────────────────────────────────────────────────────────
async function connectToLiveKit(missionId, callsign, role, freq) {
    // Tear down existing room first
    if (currentRoom) {
        try { await currentRoom.disconnect(); } catch (e) {}
        currentRoom = null;
    }
    // Clear sfuStartPTT/sfuStopPTT so trc_core falls back to visual-only while reconnecting
    window.sfuStartPTT = null;
    window.sfuStopPTT  = null;
    currentFreq = freq;

    const roomName = missionId + '-' + freq;

    try {
        if (window.pushTacLog) window.pushTacLog('CONNECTING [' + freq + ']...', 'SYS');

        // Stop any lingering mic stream so browser AEC context is clean
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

        // Track all incoming audio elements so we can mute them while transmitting
        window.sfuAudioElements = window.sfuAudioElements || [];

        // Incoming audio from other participants
        room.on(window.LivekitClient.RoomEvent.TrackSubscribed, function(track, _pub, participant) {
            if (track.kind !== window.LivekitClient.Track.Kind.Audio) return;

            // NEVER attach your own audio back to yourself — this is the self-echo source
            if (participant.isLocal) return;

            var el = track.attach();
            el.autoplay    = true;
            el.playsInline = true;
            el.volume      = 1.0;
            el.dataset.sfuRx = 'true'; // mark so we can find it later
            if (typeof el.setSinkId === 'function') el.setSinkId('default').catch(function(){});
            document.body.appendChild(el);
            window.sfuAudioElements.push(el);

            el.play().catch(function() {
                var retry = function(){ el.play().catch(function(){}); };
                document.addEventListener('click',    retry, { once: true });
                document.addEventListener('touchend', retry, { once: true });
            });
            if (window.pushTacLog) window.pushTacLog('RX: ' + participant.identity, 'SYS');
        });


        room.on(window.LivekitClient.RoomEvent.TrackUnsubscribed, function(track){ track.detach(); });

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
        if (window.pushTacLog) window.pushTacLog('LINK SECURED [' + freq + '] — PTT READY', 'SUCCESS');

        // ── Expose PTT handlers on window for trc_core to call ──
        // No mic track is published until the user first presses PTT.
        window.sfuStartPTT = async function() {
            var btn      = document.getElementById('ptt-btn');
            var statusEl = document.getElementById('ptt-status');
            if (!btn || btn.dataset.busy === 'true') { playTone('error'); return; }
            if (btn.dataset.talking === 'true') return;
            btn.dataset.talking = 'true';
            playTone('permit');

            // Mute all incoming speakers while transmitting — prevents self-echo
            (window.sfuAudioElements || []).forEach(function(el){ el.muted = true; });

            await currentRoom.localParticipant.setMicrophoneEnabled(true);
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
            if (currentRoom) await currentRoom.localParticipant.setMicrophoneEnabled(false);

            // Restore incoming speakers now that we're done transmitting
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

// ─── BOOT ────────────────────────────────────────────────────────────────────
var _sfuWait = setInterval(function() {
    if (!window.commsChannel || !window.commsUser) return;
    clearInterval(_sfuWait);

    var liveFreqEl = document.getElementById('live-freq');
    if (liveFreqEl) {
        if (window.commsUser.freq) liveFreqEl.value = window.commsUser.freq;
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
            connectToLiveKit(mission, window.commsUser.callsign, window.commsUser.role, newFreq);
        });
    }

    var passEl  = document.getElementById('comms-passcode');
    var mission = passEl ? passEl.value.trim() : 'TRC-MISSION-V8';
    var freq    = window.commsUser.freq || 'ALPHA';
    connectToLiveKit(mission, window.commsUser.callsign, window.commsUser.role, freq);
    console.log('[V8 ENGINE] LiveKit Audio Module loaded.');
}, 500);

export { connectToLiveKit };
