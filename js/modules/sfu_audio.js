// TACTICAL RANGE CARD V8 — LIVEKIT SFU ENGINE + VOICE TRANSCRIPT
// js/modules/sfu_audio.js
// Features: Pre-warmed audio, 0ms PTT, Speech-to-Text transcription with fallback to Audit Log & Chat,
// anti-sticking PTT guard, mobile loudspeaker routing, and solid connection lock.

let currentRoom = null;
let currentFreq  = null;
let localAudioTrack = null;
let isConnecting = false;
let isTalking = false;
let pttWatchdogTimer = null;
let pttStartTime = 0;

// ─── SPEECH RECOGNITION (VOICE-TO-TEXT LOGGING) ──────────────────────────────
const SpeechRecClass = window.SpeechRecognition || window.webkitSpeechRecognition;
let activeRecognition = null;
let transcriptBuffer = '';
let interimBuffer = '';

function startVoiceTranscription() {
    transcriptBuffer = '';
    interimBuffer = '';
    pttStartTime = Date.now();
    if (!SpeechRecClass) return;
    try {
        if (activeRecognition) {
            try { activeRecognition.abort(); } catch(e){}
            activeRecognition = null;
        }
        activeRecognition = new SpeechRecClass();
        activeRecognition.continuous = true;
        activeRecognition.interimResults = true;
        activeRecognition.lang = 'en-US';
        activeRecognition.maxAlternatives = 1;

        activeRecognition.onresult = function(event) {
            let finalPart = '';
            let currentInterim = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalPart += event.results[i][0].transcript + ' ';
                } else {
                    currentInterim += event.results[i][0].transcript;
                }
            }
            if (finalPart) transcriptBuffer += finalPart;
            interimBuffer = currentInterim;
        };

        activeRecognition.onerror = function(e) {
            console.warn('[SPEECH-REC] Notice:', e.error);
        };
        activeRecognition.start();
    } catch(err) {
        console.warn('Speech recognition start note:', err);
    }
}

function stopAndBroadcastVoiceTranscription(callsign, role, freq) {
    const durationSec = Math.max(1, Math.round((Date.now() - pttStartTime) / 1000));
    if (activeRecognition) {
        try { activeRecognition.stop(); } catch(e){}
    }

    // Allow 400ms for browser speech engine to flush remaining results
    setTimeout(() => {
        let text = (transcriptBuffer.trim() + ' ' + interimBuffer.trim()).trim();
        text = text.replace(/\s+/g, ' ');

        const isFallback = !text || text.length === 0;
        const displayText = isFallback ? `[VOICE TRANSMIT ${durationSec}s]` : `"${text.toUpperCase()}"`;

        // 1. Post to local Tactical System Audit Log
        if (window.pushTacLog) {
            window.pushTacLog(`🎙️ [RADIO] ${callsign}: ${displayText}`, 'SUCCESS');
        }

        // 2. Render into Mission Chat
        if (window.renderChatMessage && window.commsUser) {
            window.renderChatMessage(window.commsUser, `🎙️ [RADIO] ${displayText}`, true);
        }

        // 3. Broadcast to all teammates via Supabase Realtime
        if (window.commsChannel && window.TacticalCrypto && window.commsUser) {
            try {
                window.commsChannel.send({
                    type: 'broadcast',
                    event: 'voice_transcript',
                    payload: {
                        data: window.TacticalCrypto.encrypt({
                            user: window.commsUser,
                            text: displayText,
                            freq: freq,
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        })
                    }
                }).catch(() => {});
            } catch(e){}
        }

        transcriptBuffer = '';
        interimBuffer = '';
        activeRecognition = null;
    }, 400);
}

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
    if (isConnecting) return;
    if (currentRoom && currentFreq === freq && currentRoom.state === 'connected') {
        return; // Already connected to this room!
    }
    isConnecting = true;

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
            el.volume      = 1.0;
            var pttBtnEl   = document.getElementById('ptt-btn');
            el.muted       = isTalking || (pttBtnEl && pttBtnEl.dataset.talking === 'true');
            el.dataset.sfuRx = 'true';
            if (typeof el.setSinkId === 'function') el.setSinkId('default').catch(function(){});
            document.body.appendChild(el);
            window.sfuAudioElements.push(el);



            // Track mute / unmute events from remote
            track.on('unmuted', function() {
                if (room.startAudio) room.startAudio().catch(function(){});
                if (el.paused && !el.muted) el.play().catch(function(){});
            });

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
            if (window.pushTacLog) window.pushTacLog('AUDIO RX: ' + participant.identity, 'SYS');
        });

        room.on(window.LivekitClient.RoomEvent.TrackUnsubscribed, function(track){
            try {
                var els = track.detach();
                els.forEach(function(el) {
                    try { el.remove(); } catch(e){}
                    window.sfuAudioElements = (window.sfuAudioElements || []).filter(function(e){ return e !== el; });
                });
            } catch(e){}

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
            if (isTalking) return;
            var btn      = document.getElementById('ptt-btn');
            var statusEl = document.getElementById('ptt-status');
            var spk      = document.getElementById('ptt-active-speaker');
            if (btn && btn.dataset.busy === 'true') { playTone('error'); return; }
            
            isTalking = true;
            if (btn) {
                btn.dataset.talking = 'true';
                btn.classList.add('border-emerald-500', 'bg-emerald-900/60');
                btn.classList.remove('border-gray-800', 'bg-gray-900');
            }
            if (statusEl) { statusEl.innerText = 'TRANSMITTING'; statusEl.style.color = '#34d399'; }
            if (spk) { spk.innerText = 'TX: ' + callsign; spk.style.color = '#34d399'; }

            playTone('permit');
            startVoiceTranscription();

            // Mute all incoming speakers while transmitting — prevents self-echo
            document.querySelectorAll('audio').forEach(function(el){ el.muted = true; });
            (window.sfuAudioElements || []).forEach(function(el){ el.muted = true; });

            // 15-second safety watchdog to prevent stuck transmissions
            if (pttWatchdogTimer) clearTimeout(pttWatchdogTimer);
            pttWatchdogTimer = setTimeout(function() {
                if (isTalking && window.sfuStopPTT) {
                    console.warn('[PTT] 15s Watchdog auto-released stuck transmission');
                    window.sfuStopPTT();
                }
            }, 15000);

            try {
                if (localAudioTrack) {
                    await localAudioTrack.unmute();
                } else if (currentRoom && currentRoom.localParticipant) {
                    await currentRoom.localParticipant.setMicrophoneEnabled(true);
                    localAudioTrack = currentRoom.localParticipant.getTrackPublication(window.LivekitClient.Track.Source.Microphone)?.track || null;
                }
            } catch(e) {
                console.error("LiveKit mic enable failed:", e);
                isTalking = false;
                if (btn) {
                    btn.dataset.talking = 'false';
                    btn.classList.remove('border-emerald-500', 'bg-emerald-900/60');
                    btn.classList.add('border-gray-800', 'bg-gray-900');
                }
                if (statusEl) { statusEl.innerText = 'STANDBY'; statusEl.style.color = ''; }
                if (spk) { spk.innerText = ''; }
                document.querySelectorAll('audio').forEach(function(el){ el.muted = false; });
                (window.sfuAudioElements || []).forEach(function(el){ el.muted = false; });
                return;
            }

            // CRITICAL RACE-CONDITION GUARD:
            // If user released button while unmute was awaiting, mute immediately!
            if (!isTalking) {
                if (localAudioTrack) {
                    try { await localAudioTrack.mute(); } catch(e){}
                }
                if (btn) {
                    btn.dataset.talking = 'false';
                    btn.classList.remove('border-emerald-500', 'bg-emerald-900/60');
                    btn.classList.add('border-gray-800', 'bg-gray-900');
                }
                if (statusEl) { statusEl.innerText = (btn && btn.dataset.busy === 'true') ? 'CHANNEL BUSY' : 'STANDBY'; statusEl.style.color = ''; }
                if (spk) { spk.innerText = ''; }
                document.querySelectorAll('audio').forEach(function(el){ el.muted = false; });
                (window.sfuAudioElements || []).forEach(function(el){ el.muted = false; });
            }
        };

        window.sfuStopPTT = async function() {
            if (!isTalking) return;
            isTalking = false;
            if (pttWatchdogTimer) { clearTimeout(pttWatchdogTimer); pttWatchdogTimer = null; }

            var btn      = document.getElementById('ptt-btn');
            var statusEl = document.getElementById('ptt-status');
            var spk      = document.getElementById('ptt-active-speaker');

            if (btn) {
                btn.dataset.talking = 'false';
                btn.classList.remove('border-emerald-500', 'bg-emerald-900/60');
                btn.classList.add('border-gray-800', 'bg-gray-900');
            }
            if (statusEl) { statusEl.innerText = (btn && btn.dataset.busy === 'true') ? 'CHANNEL BUSY' : 'STANDBY'; statusEl.style.color = ''; }
            if (spk) { spk.innerText = ''; }

            playTone('roger');
            stopAndBroadcastVoiceTranscription(callsign, role, currentFreq || 'ALPHA');

            try {
                if (localAudioTrack) {
                    await localAudioTrack.mute();
                } else if (currentRoom && currentRoom.localParticipant) {
                    await currentRoom.localParticipant.setMicrophoneEnabled(false);
                }
            } catch(e) {}

            // Restore incoming speakers now that we are done transmitting
            document.querySelectorAll('audio').forEach(function(el){ el.muted = false; });
            (window.sfuAudioElements || []).forEach(function(el){ el.muted = false; });
        };

    } catch (err) {
        console.error('[SFU] Connection error:', err);
        if (window.pushTacLog) window.pushTacLog('SFU FAILED: ' + err.message, 'WARNING');
    } finally {
        isConnecting = false;
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
    isTalking = false;
    isConnecting = false;
    if (pttWatchdogTimer) { clearTimeout(pttWatchdogTimer); pttWatchdogTimer = null; }
};

// Dial change event wiring — only wired ONCE
var _dialWired = false;
var _dialCheck = setInterval(function() {
    var liveFreqEl = document.getElementById('live-freq');
    if (liveFreqEl && !_dialWired) {
        _dialWired = true;
        clearInterval(_dialCheck);
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
}, 500);

export { connectToLiveKit };
