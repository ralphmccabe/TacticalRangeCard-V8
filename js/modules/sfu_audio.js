// TACTICAL RANGE CARD V8 — LIVEKIT SFU ENGINE (CLEAN REWRITE)
// js/modules/sfu_audio.js
// Rules:
//   1. No mic track is published until the user physically presses PTT.
//   2. Document-level listeners are added ONCE only, guarded by a flag.
//   3. On disconnect, room is fully torn down before reconnecting.

let currentRoom = null;
let currentFreq  = null;
let docListenersAttached = false;

// ─── TONES ────────────────────────────────────────────────────────────────────
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
            osc.frequency.setValueAtTime(700, t + 0.12);
            gain.gain.setValueAtTime(0.08, t + 0.12);
            gain.gain.linearRampToValueAtTime(0, t + 0.22);
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

// ─── CONNECT ──────────────────────────────────────────────────────────────────
async function connectToLiveKit(missionId, callsign, role, freq) {
    if (currentRoom) {
        try { await currentRoom.disconnect(); } catch (e) {}
        currentRoom = null;
    }
    currentFreq = freq;
    const roomName = `${missionId}-${freq}`;
    try {
        if (window.pushTacLog) window.pushTacLog(`CONNECTING [${freq}]...`, 'SYS');
        const apiKey    = 'APITy5FkUwwNzcw';
        const apiSecret = 'vIlpkOpK11f0jeATaTPz2Oni6UaB6lTkK4LycHudrI2';
        const header  = { alg: 'HS256', typ: 'JWT' };
        const payload = {
            iss: apiKey, sub: callsign, name: callsign,
            exp: Math.floor(Date.now() / 1000) + 43200,
            nbf: Math.floor(Date.now() / 1000) - 10,
            video: { roomJoin: true, room: roomName },
        };
        const token = KJUR.jws.JWS.sign(null, header, payload, { utf8: apiSecret });
        const wsUrl = 'wss://tacticlerangecardv-8-xp5phgeh.livekit.cloud';
        if (!window.LivekitClient) { if (window.pushTacLog) window.pushTacLog('LIVEKIT SDK NOT LOADED', 'WARNING'); return; }

        // Stop old mic stream so AEC context is fresh
        if (window.activeMicStream) {
            window.activeMicStream.getTracks().forEach(t => t.stop());
            window.activeMicStream = null;
        }

        const room = new window.LivekitClient.Room({ adaptiveStream: true, dynacast: true });

        room.on(window.LivekitClient.RoomEvent.TrackSubscribed, (track, _pub, participant) => {
            if (track.kind !== window.LivekitClient.Track.Kind.Audio) return;
            const el = track.attach();
            el.autoplay = true; el.playsInline = true; el.volume = 1.0;
            if (typeof el.setSinkId === 'function') el.setSinkId('default').catch(() => {});
            document.body.appendChild(el);
            const tryPlay = () => el.play().catch(() => {});
            tryPlay();
            document.addEventListener('click',    tryPlay, { once: true });
            document.addEventListener('touchend', tryPlay, { once: true });
            if (window.pushTacLog) window.pushTacLog(`RX: ${participant.identity}`, 'SYS');
        });

        room.on(window.LivekitClient.RoomEvent.TrackUnsubscribed, track => track.detach());

        room.on(window.LivekitClient.RoomEvent.ActiveSpeakersChanged, speakers => {
            const btn      = document.getElementById('ptt-btn');
            const statusEl = document.getElementById('ptt-status');
            const lblEl    = document.getElementById('ptt-active-speaker');
            if (!btn) return;
            const others = speakers.filter(s => s.identity !== callsign);
            const isCmd  = /COMMAND|INSTRUCTOR|LEAD|DISPATCH/i.test(window.commsUser?.role || '');
            if (others.length > 0) {
                if (!isCmd) { btn.dataset.busy = 'true'; if (statusEl && btn.dataset.talking !== 'true') statusEl.innerText = 'CHANNEL BUSY'; }
                if (lblEl) { lblEl.innerText = `RX: ${others[0].identity}`; lblEl.style.color = '#ef4444'; }
            } else {
                btn.dataset.busy = 'false';
                if (statusEl && btn.dataset.talking !== 'true') statusEl.innerText = 'STANDBY';
                if (lblEl) lblEl.innerText = '';
            }
        });

        await room.connect(wsUrl, token);
        if (window.pushTacLog) window.pushTacLog(`LINK SECURED [${freq}] — PTT READY`, 'SUCCESS');
        currentRoom = room;

        // NOTE: We do NOT call setMicrophoneEnabled(false) here.
        // That would publish a muted track on both devices and cause echo.
        // The mic is only published when PTT is pressed.

        hookPTTButton(callsign);

    } catch (err) {
        console.error('[SFU] Connection error:', err);
        if (window.pushTacLog) window.pushTacLog(`SFU FAILED: ${err.message}`, 'WARNING');
    }
}

// ─── PTT BUTTON ───────────────────────────────────────────────────────────────
function hookPTTButton(callsign) {
    const oldBtn = document.getElementById('ptt-btn');
    if (!oldBtn) return;
    // Clone wipes stale inline listeners from previous sessions
    const btn = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(btn, oldBtn);

    let isTouching = false;

    const startPTT = async (e) => {
        if (e.type === 'touchstart') isTouching = true;
        if (e.type === 'mousedown'  && isTouching) return; // prevent double-fire on touch devices
        if (e.cancelable) e.preventDefault();
        if (btn.dataset.busy === 'true') { playTone('error'); return; }
        if (btn.dataset.talking === 'true') return;
        if (!currentRoom) return;
        btn.dataset.talking = 'true';
        playTone('permit');
        await currentRoom.localParticipant.setMicrophoneEnabled(true);
        btn.classList.remove('bg-slate-900','border-slate-700','text-slate-400');
        btn.classList.add('bg-emerald-900','border-emerald-400','text-emerald-100');
        const icon = btn.querySelector('i');
        if (icon) { icon.classList.remove('text-slate-600'); icon.classList.add('text-emerald-300'); }
        const st = document.getElementById('ptt-status');
        if (st) { st.innerText = 'TRANSMITTING'; st.classList.replace('text-gray-400','text-emerald-400'); }
    };

    const stopPTT = async (e) => {
        if (e.type === 'touchend') isTouching = false;
        if (btn.dataset.talking !== 'true') return;
        btn.dataset.talking = 'false';
        playTone('roger');
        if (currentRoom) await currentRoom.localParticipant.setMicrophoneEnabled(false);
        btn.classList.add('bg-slate-900','border-slate-700','text-slate-400');
        btn.classList.remove('bg-emerald-900','border-emerald-400','text-emerald-100');
        const icon = btn.querySelector('i');
        if (icon) { icon.classList.add('text-slate-600'); icon.classList.remove('text-emerald-300'); }
        const st = document.getElementById('ptt-status');
        if (st) { st.innerText = btn.dataset.busy === 'true' ? 'CHANNEL BUSY' : 'STANDBY'; st.classList.replace('text-emerald-400','text-gray-400'); }
    };

    btn.addEventListener('mousedown',  startPTT);
    btn.addEventListener('touchstart', startPTT, { passive: false });

    // Add document listeners ONCE only to prevent stacking across reconnects
    if (!docListenersAttached) {
        document.addEventListener('mouseup',  stopPTT);
        document.addEventListener('touchend', stopPTT);
        docListenersAttached = true;
    }
}

// ─── BOOT ─────────────────────────────────────────────────────────────────────
const _sfuWait = setInterval(() => {
    if (!window.commsChannel || !window.commsUser) return;
    clearInterval(_sfuWait);

    const liveFreqEl = document.getElementById('live-freq');
    if (liveFreqEl) {
        if (window.commsUser.freq) liveFreqEl.value = window.commsUser.freq;
        liveFreqEl.addEventListener('change', e => {
            const newFreq = e.target.value;
            if (window.commsUser) window.commsUser.freq = newFreq;
            if (window.commsChannel) window.commsChannel.track({
                online_at: new Date().toISOString(), location: window.myLatestCoords || null,
                user: window.commsUser, distress: window.isDistressActive || false,
                dutyStatus: window.myDutyStatus || '',
            }).catch(() => {});
            const passEl  = document.getElementById('comms-passcode');
            const mission = passEl ? passEl.value.trim() : 'TRC-MISSION-V8';
            connectToLiveKit(mission, window.commsUser.callsign, window.commsUser.role, newFreq);
        });
    }

    const passEl  = document.getElementById('comms-passcode');
    const mission = passEl ? passEl.value.trim() : 'TRC-MISSION-V8';
    const freq    = window.commsUser.freq || 'ALPHA';
    connectToLiveKit(mission, window.commsUser.callsign, window.commsUser.role, freq);
    console.log('[V8 ENGINE] LiveKit Audio Module loaded.');
}, 500);

export { connectToLiveKit };
