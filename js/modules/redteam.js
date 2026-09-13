// TACTICAL RANGE CARD V8 - RED TEAM MODULE
// js/modules/redteam.js
const hostiles = {};
window.rtHostiles = hostiles;
let redTeamChannel = null;

function makeHostileIcon(threatLevel) {
    const colors = { LOW:'#fbbf24', MED:'#f97316', HIGH:'#ef4444', CRITICAL:'#dc2626' };
    const clr = colors[threatLevel] || '#f97316';
    const pulse = threatLevel === 'CRITICAL'
        ? '<circle cx="12" cy="12" r="10" fill="none" stroke="' + clr + '" stroke-width="2"><animate attributeName="r" values="8;14;8" dur="1.2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.8;0;0.8" dur="1.2s" repeatCount="indefinite"/></circle>'
        : '';
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24">' + pulse + '<polygon points="12,2 22,12 12,22 2,12" fill="' + clr + '" stroke="#0f172a" stroke-width="1.5"/><text x="12" y="16" text-anchor="middle" font-size="10" font-weight="bold" fill="#fff">H</text></svg>';
    return L.divIcon({ html: svg, className: '', iconSize:[26,26], iconAnchor:[13,13], popupAnchor:[0,-15] });
}

function buildPopup(d) {
    const tc = d.threatLevel==='CRITICAL'?'#dc2626':d.threatLevel==='HIGH'?'#ef4444':d.threatLevel==='MED'?'#f97316':'#fbbf24';
    return '<div style="font-family:monospace;font-size:11px;background:#1e1e2e;color:#f87171;padding:6px 8px;border-radius:4px;min-width:140px;">'
        + '<div style="color:#ef4444;font-weight:bold;font-size:13px;">H: ' + (d.callsign||'HOSTILE') + '</div>'
        + '<div style="color:#94a3b8;margin-top:2px;">THREAT: <span style="color:' + tc + ';font-weight:bold;">' + d.threatLevel + '</span></div>'
        + (d.notes ? '<div style="color:#cbd5e1;margin-top:3px;">' + d.notes + '</div>' : '')
        + '<div style="color:#475569;font-size:9px;margin-top:4px;">' + new Date(d.timestamp).toLocaleTimeString() + '</div>'
        + '<button onclick="window.removeHostile(\'' + d.id + '\')" style="margin-top:5px;background:#7f1d1d;color:#fca5a5;border:1px solid #ef4444;border-radius:3px;padding:2px 8px;font-size:9px;cursor:pointer;width:100%;">REMOVE</button>'
        + '</div>';
}

function upsertHostile(data) {
    const map = window.commsMapInstance;
    if (!map) return;
    const icon = makeHostileIcon(data.threatLevel);
    if (hostiles[data.id]) {
        hostiles[data.id].marker.setLatLng([data.lat,data.lng]).setIcon(icon).setPopupContent(buildPopup(data));
        hostiles[data.id].data = data;
    } else {
        const marker = L.marker([data.lat,data.lng],{icon}).addTo(map).bindPopup(buildPopup(data));
        hostiles[data.id] = { marker, data };
    }
}

window.removeHostile = function(id) {
    if (hostiles[id]) { hostiles[id].marker.remove(); delete hostiles[id]; }
    if (redTeamChannel) redTeamChannel.send({type:'broadcast',event:'hostile_remove',payload:{id}});
    renderHostileList();
};

function renderHostileList() {
    const list = document.getElementById('rt-hostile-list');
    if (!list) return;
    const ids = Object.keys(hostiles);
    if (!ids.length) { list.innerHTML = '<div style="color:#475569;font-size:10px;text-align:center;padding:8px;">NO HOSTILES TRACKED</div>'; return; }
    const tc = t => t==='CRITICAL'?'#dc2626':t==='HIGH'?'#ef4444':t==='MED'?'#f97316':'#fbbf24';
    list.innerHTML = ids.map(id => {
        const d = hostiles[id].data;
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 6px;border-bottom:1px solid #1e293b;gap:4px;">'
            + '<span style="color:' + tc(d.threatLevel) + ';font-weight:bold;font-size:10px;flex:1;">H: ' + (d.callsign||'?') + '</span>'
            + '<span style="color:#94a3b8;font-size:9px;">' + d.threatLevel + '</span>'
            + '<button onclick="if(window.commsMapInstance){window.commsMapInstance.flyTo([' + d.lat + ',' + d.lng + '],14);setTimeout(()=>window.rtHostiles[\''+id+'\']&&window.rtHostiles[\''+id+'\'].marker.openPopup(),400);}" style="background:#1e293b;color:#f87171;border:1px solid #7f1d1d;border-radius:2px;padding:1px 5px;font-size:9px;cursor:pointer;">LOCATE</button>'
            + '</div>';
    }).join('');
}

function dropHostile(lat, lng) {
    const map = window.commsMapInstance;
    if (!map) { alert('Open the Geo Matrix map first.'); return; }
    const center = map.getCenter();
    const hostile = {
        id: 'H-' + Date.now(),
        lat: (lat !== undefined) ? lat : center.lat,
        lng: (lng !== undefined) ? lng : center.lng,
        callsign: (document.getElementById('rt-callsign')?.value || 'HOSTILE').toUpperCase().trim(),
        threatLevel: document.getElementById('rt-threat')?.value || 'MED',
        notes: document.getElementById('rt-notes')?.value?.trim() || '',
        timestamp: Date.now()
    };
    upsertHostile(hostile);
    renderHostileList();
    if (redTeamChannel) redTeamChannel.send({type:'broadcast',event:'hostile_update',payload:hostile});
    window.pushTacLog?.('RED TEAM: ' + hostile.callsign + ' [' + hostile.threatLevel + '] marked.', 'WARN');
    if (document.getElementById('rt-callsign')) document.getElementById('rt-callsign').value = '';
    if (document.getElementById('rt-notes')) document.getElementById('rt-notes').value = '';
}
window.dropHostileBtn = dropHostile;

function initMapLongPress() {
    const map = window.commsMapInstance;
    if (!map) return;
    let t = null;
    map.on('mousedown', (e) => { if (e.originalEvent.button !== 0) return; t = setTimeout(() => dropHostile(e.latlng.lat, e.latlng.lng), 700); });
    map.on('mouseup mouseleave', () => clearTimeout(t));
    map.on('touchstart', (e) => { t = setTimeout(() => { const ll = map.mouseEventToLatLng(e.originalEvent.touches[0]); dropHostile(ll.lat, ll.lng); }, 700); }, {passive:true});
    map.on('touchend touchcancel', () => clearTimeout(t));
}

function initRedTeamChannel() {
    const sb = window.TRC_SUPABASE_CLIENT || window.supabase || window._supabase;
    if (!sb) { console.warn('[RED TEAM] No Supabase - offline only.'); return; }
    redTeamChannel = sb.channel('trc-redteam-v8');
    redTeamChannel
        .on('broadcast', {event:'hostile_update'}, ({payload}) => { upsertHostile(payload); renderHostileList(); })
        .on('broadcast', {event:'hostile_remove'}, ({payload}) => {
            if (hostiles[payload.id]) { hostiles[payload.id].marker.remove(); delete hostiles[payload.id]; renderHostileList(); }
        })
        .subscribe();
    console.log('[RED TEAM] Channel live.');
}

function buildRedTeamPanel() {
    if (document.getElementById('redteam-modal')) return;
    const el = document.createElement('div');
    el.id = 'redteam-modal';
    el.setAttribute('style','display:none;position:fixed;z-index:100055;top:70px;right:10px;width:95vw;max-width:280px;min-width:220px;background:#020617;border:2px solid rgba(220,38,38,0.8);border-radius:12px;box-shadow:0 0 30px rgba(220,38,38,0.25);');
    el.innerHTML = '<div id="rt-drag-header" style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;background:rgba(127,29,29,0.75);border-radius:10px 10px 0 0;cursor:move;user-select:none;"><span style="color:#f87171;font-family:monospace;font-weight:bold;font-size:11px;letter-spacing:1px;">RED TEAM TRACKER</span><button id="rt-close-btn" style="color:#f87171;background:none;border:none;font-size:15px;cursor:pointer;padding:0 2px;">X</button></div>'
        + '<div style="padding:8px;display:flex;flex-direction:column;gap:5px;">'
        + '<input id="rt-callsign" placeholder="HOSTILE CALLSIGN" maxlength="12" style="background:#0f172a;color:#fca5a5;border:1px solid #7f1d1d;border-radius:4px;padding:4px 7px;font-family:monospace;font-size:10px;width:100%;box-sizing:border-box;"/>'
        + '<select id="rt-threat" style="background:#0f172a;color:#fca5a5;border:1px solid #7f1d1d;border-radius:4px;padding:4px 7px;font-family:monospace;font-size:10px;width:100%;box-sizing:border-box;"><option value="LOW">LOW THREAT</option><option value="MED" selected>MED THREAT</option><option value="HIGH">HIGH THREAT</option><option value="CRITICAL">CRITICAL</option></select>'
        + '<input id="rt-notes" placeholder="Notes (optional)" maxlength="60" style="background:#0f172a;color:#cbd5e1;border:1px solid #334155;border-radius:4px;padding:4px 7px;font-family:monospace;font-size:10px;width:100%;box-sizing:border-box;"/>'
        + '<button onclick="window.dropHostileBtn()" style="background:#7f1d1d;color:#fca5a5;border:1px solid #ef4444;border-radius:4px;padding:5px;font-family:monospace;font-size:10px;font-weight:bold;cursor:pointer;letter-spacing:1px;">DROP AT MAP CENTER</button>'
        + '<div style="color:#475569;font-size:8px;font-family:monospace;text-align:center;">-- or long-press on map to drop --</div>'
        + '<div style="border-top:1px solid #1e293b;padding-top:4px;"><div style="color:#f87171;font-family:monospace;font-size:9px;font-weight:bold;margin-bottom:3px;">ACTIVE HOSTILES</div><div id="rt-hostile-list" style="max-height:130px;overflow-y:auto;"></div></div>'
        + '<button onclick="Object.keys(window.rtHostiles||{}).forEach(id=>window.removeHostile(id))" style="background:#0f172a;color:#64748b;border:1px solid #334155;border-radius:4px;padding:3px;font-family:monospace;font-size:9px;cursor:pointer;">CLEAR ALL HOSTILES</button>'
        + '</div>';
    document.body.appendChild(el);
    document.getElementById('rt-close-btn').addEventListener('click', () => { el.style.display='none'; });

    let dr=false,sx,sy,il,it;
    const hdr = document.getElementById('rt-drag-header');
    const startDrag = (e) => {
        if (e.target.closest('button,input,select')) return;
        dr=true;
        const cx=e.type.startsWith('touch')?e.touches[0].clientX:e.clientX;
        const cy=e.type.startsWith('touch')?e.touches[0].clientY:e.clientY;
        sx=cx; sy=cy; const r=el.getBoundingClientRect(); il=r.left; it=r.top;
        document.addEventListener('mousemove',doDrag);
        document.addEventListener('touchmove',doDrag,{passive:false});
        document.addEventListener('mouseup',stopDrag);
        document.addEventListener('touchend',stopDrag);
    };
    const doDrag = (e) => {
        if (!dr) return;
        if (e.cancelable) e.preventDefault();
        const cx=e.type.startsWith('touch')?e.touches[0].clientX:e.clientX;
        const cy=e.type.startsWith('touch')?e.touches[0].clientY:e.clientY;
        let nl=il+(cx-sx), nt=it+(cy-sy);
        if (nt<48) nt=48;
        const ml=window.innerWidth-el.offsetWidth;
        if (nl<0) nl=0; if (nl>ml) nl=ml;
        el.style.left=nl+'px'; el.style.top=nt+'px'; el.style.right='auto';
    };
    const stopDrag = () => {
        dr=false;
        document.removeEventListener('mousemove',doDrag);
        document.removeEventListener('touchmove',doDrag);
        document.removeEventListener('mouseup',stopDrag);
        document.removeEventListener('touchend',stopDrag);
    };
    hdr.addEventListener('mousedown', startDrag);
    hdr.addEventListener('touchstart', startDrag, {passive:false});
    const bringFront = () => {
        let hz=100055;
        ['calc-modal','remarks-modal','whiteboard-modal','redteam-modal'].forEach(id=>{
            const m=document.getElementById(id);
            if(m) hz=Math.max(hz,parseInt(m.style.zIndex||0));
        });
        el.style.zIndex=hz+1;
    };
    el.addEventListener('mousedown', bringFront);
    el.addEventListener('touchstart', bringFront, {passive:true});
    renderHostileList();
}


// Check for stale hostiles every 30 seconds
setInterval(() => {
    const now = Date.now();
    let updated = false;
    Object.keys(hostiles).forEach(id => {
        const h = hostiles[id];
        // 10 minutes = 600000 ms
        if (!h.data.isStale && (now - h.data.timestamp > 600000)) {
            h.data.isStale = true;
            // Add STALE warning to popup
            h.data.notes = '⚠️ [STALE INTEL] ' + (h.data.notes || '');
            h.marker.setPopupContent(buildPopup(h.data));
            // Dim the icon slightly by resetting it (we could make a stale icon, but let's just update popup and list for now)
            updated = true;
        }
    });
    if (updated) renderHostileList();
}, 30000);

export function initRedTeam() {
    console.log('[V8 ENGINE] Red Team module starting...');
    buildRedTeamPanel();
    document.addEventListener('click', (e) => {
        if (e.target.closest('#redteam-toggle-btn')) {
            const p = document.getElementById('redteam-modal');
            if (!p) return;
            p.style.display = (!p.style.display || p.style.display==='none') ? 'block' : 'none';
        }
    });
    const wait = setInterval(() => {
        if (window.commsMapInstance) {
            clearInterval(wait);
            initMapLongPress();
            initRedTeamChannel();
            console.log('[V8 ENGINE] Red Team map hooks active.');
        }
    }, 300);
}
