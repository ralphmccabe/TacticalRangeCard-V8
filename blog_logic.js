// blog_logic.js - Full 4-in-1 Tactical Wire, Individualized TRC Business Cards & Rework Logic

function getSupabaseClient() {
    if (window.supabaseClient) return window.supabaseClient;
    const url = window.SUPABASE_URL || 'https://nvnwqcfgpwzheekninle.supabase.co';
    const key = window.SUPABASE_KEY || 'sb_publishable_si9fg-bURw3K5yprgAgifw_Eez79zU0';
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        try {
            window.supabaseClient = window.supabase.createClient(url, key);
            return window.supabaseClient;
        } catch(e) {
            console.error("Supabase client creation error:", e);
        }
    }
    return null;
}

let currentWireCategoryFilter = 'ALL';
let currentPostMode = 'SITREP'; // 'SITREP' or 'STANDALONE_CARD'

// Global Map Coordinate Jump Helper (Geo-Matrix)
window.investigateWireCoords = function(lat, lon, btn) {
    if (isNaN(lat) || isNaN(lon)) return;

    // 1. Close Global Wire modal
    const wireModal = document.getElementById('panel-global-wire');
    if (wireModal) wireModal.classList.add('hidden');

    // 2. Open Satellite Recon Panel in Fullscreen for immersive terrain survey
    const satPanel = document.getElementById('panel-sat-select');
    if (satPanel && typeof toggleFullscreen === 'function') {
        const isFullscreen = satPanel.classList.contains('fullscreen') || satPanel.classList.contains('dash-panel-maximized') || satPanel.style.display === 'flex';
        if (!isFullscreen) {
            toggleFullscreen('panel-sat-select');
        }
    }

    // 3. Center Orbital Map (Geo-Matrix) on Ranch Coordinates
    if (window.orbitalMap && typeof window.orbitalMap.setView === 'function') {
        setTimeout(() => {
            window.orbitalMap.invalidateSize();
            window.orbitalMap.setView([lat, lon], 16, { animate: true });

            // Add High-Visibility Ranch Target Marker
            if (window.L) {
                const marker = L.circleMarker([lat, lon], {
                    radius: 10, color: '#f59e0b', fillColor: '#fbbf24', fillOpacity: 0.8, weight: 3
                }).bindTooltip(`🏕️ RANCH / TARGET: ${lat.toFixed(5)}, ${lon.toFixed(5)}`, { permanent: true, direction: 'top' }).addTo(window.orbitalMap);

                if (!window.wireIntelMarkers) window.wireIntelMarkers = [];
                window.wireIntelMarkers.push(marker);
            }
        }, 300);
    } else {
        alert(`Ranch Coordinates: Lat ${lat.toFixed(5)}, Lon ${lon.toFixed(5)}`);
    }

    if (window.pushTacLog) {
        window.pushTacLog(`SURVEYING RANCH TERRAIN AT: ${lat.toFixed(5)}, ${lon.toFixed(5)}`, "SUCCESS");
    }
};

// Global Wire & Transmissions Guide Modal Helpers
window.openBlogGuideModal = function() {
    const modal = document.getElementById('blog-guide-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('z-index', '100000050', 'important');
        if (window.lucide) window.lucide.createIcons();
    }
};

window.closeBlogGuideModal = function() {
    const modal = document.getElementById('blog-guide-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.setProperty('display', 'none', 'important');
    }
};

// Rework / Re-edit Business Card from Vault back to Form
window.reworkBusinessCard = function(itemData) {
    const postModal = document.getElementById('modal-new-post');
    if (!postModal) return;

    const authorInput = document.getElementById('post-author');
    const biznameInput = document.getElementById('post-contact-bizname');
    const unitInput = document.getElementById('post-contact-unit');
    const phoneInput = document.getElementById('post-contact-phone');
    const commsInput = document.getElementById('post-contact-comms');
    const webInput = document.getElementById('post-contact-web');
    const detailsInput = document.getElementById('post-contact-details');
    const facebookInput = document.getElementById('post-contact-facebook');
    const twitterInput = document.getElementById('post-contact-twitter');
    const youtubeInput = document.getElementById('post-contact-youtube');
    const contentInput = document.getElementById('post-content');

    const contactContainer = document.getElementById('contact-fields-container');
    const contactChevron = document.getElementById('contact-chevron');

    const c = itemData.contact || itemData;

    if (authorInput) authorInput.value = itemData.author || c.author || '';
    if (biznameInput) biznameInput.value = c.bizname || '';
    if (unitInput) unitInput.value = c.unit || '';
    if (phoneInput) phoneInput.value = c.phone || '';
    if (commsInput) commsInput.value = c.comms || '';
    if (webInput) webInput.value = c.web || '';
    if (detailsInput) detailsInput.value = c.details || '';
    const shootingRangesInput = document.getElementById('post-contact-shooting-ranges');
    if (shootingRangesInput) shootingRangesInput.value = c.shootingRanges || '';
    if (contentInput && itemData.content) contentInput.value = itemData.content;

    // Expand Contact Form
    if (contactContainer) {
        contactContainer.classList.remove('hidden');
        contactContainer.classList.add('flex');
        if (contactChevron) contactChevron.classList.add('rotate-180');
    }

    // Switch mode depending on if it's a blog post or business card
    if (itemData.type === 'blog_post' || itemData.content) {
        const modeBtnPost = document.getElementById('mode-btn-post');
        if (modeBtnPost) modeBtnPost.click();
    } else {
        const modeBtnCard = document.getElementById('mode-btn-card');
        if (modeBtnCard) modeBtnCard.click();
    }

    // Close the Intel Vault if it's open so we can see the blogger
    const vaultModal = document.getElementById('vault-modal');
    if (vaultModal) vaultModal.classList.add('hidden');

    // Open Modal
    postModal.classList.remove('hidden');

    // Dispatch input events to refresh live preview
    [authorInput, biznameInput, unitInput, phoneInput, commsInput, webInput, detailsInput].forEach(inp => {
        if (inp) inp.dispatchEvent(new Event('input'));
    });
};

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Background Image Upload with Canvas Compression ---
    const bgUpload = document.getElementById('wire-bg-upload');
    const bgContainer = document.getElementById('wire-bg-container');
    
    if (bgContainer) {
        const savedBg = localStorage.getItem('globalWireBg');
        if (savedBg) {
            bgContainer.style.backgroundImage = `url('${savedBg}')`;
        }
    }

    if (bgUpload && bgContainer) {
        bgUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const maxDim = 1280;
                    if (width > maxDim || height > maxDim) {
                        if (width > height) {
                            height = Math.round((height * maxDim) / width);
                            width = maxDim;
                        } else {
                            width = Math.round((width * maxDim) / height);
                            height = maxDim;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    ctx.drawImage(img, 0, 0, width, height);
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);

                    try {
                        localStorage.setItem('globalWireBg', compressedBase64);
                        bgContainer.style.backgroundImage = `url('${compressedBase64}')`;
                    } catch (err) {
                        alert("Image too large to save locally. Try a smaller photo.");
                    }
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // --- 2. Initialize Supabase & Category Filters ---
    const openBtn = document.getElementById('openGlobalBlogBtn');
    if (openBtn) {
        openBtn.addEventListener('click', async () => {
            const modal = document.getElementById('panel-global-wire');
            if (modal) modal.classList.remove('hidden');
            
            // Default filter to ALL POSTS when opened
            currentWireCategoryFilter = 'ALL';
            highlightActiveFilterButton('ALL POSTS');
            if (window._startWireSubscription) window._startWireSubscription();
            await fetchWirePosts();
        });
    }

    // Observe #panel-global-wire visibility changes to trigger fetch automatically
    const wirePanel = document.getElementById('panel-global-wire');
    if (wirePanel) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    const isHidden = wirePanel.classList.contains('hidden');
                    if (!isHidden) {
                        if (window._startWireSubscription) window._startWireSubscription();
                        fetchWirePosts();
                    }
                }
            });
        });
        observer.observe(wirePanel, { attributes: true });
    }

    function highlightActiveFilterButton(activeLabel) {
        const filterContainer = document.getElementById('wire-filters');
        if (!filterContainer) return;
        filterContainer.querySelectorAll('button').forEach(b => {
            const bText = b.textContent.trim().toUpperCase();
            if (bText === activeLabel.toUpperCase()) {
                b.classList.add('ring-4', 'ring-white', 'scale-105', 'shadow-lg');
            } else {
                b.classList.remove('ring-4', 'ring-white', 'scale-105', 'shadow-lg');
            }
        });
    }

    const filterContainer = document.getElementById('wire-filters');
    if (filterContainer) {
        filterContainer.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const filterText = btn.textContent.trim().toUpperCase();
                highlightActiveFilterButton(filterText);
                
                if (filterText.includes('HOTSPOT')) currentWireCategoryFilter = 'HOTSPOTS';
                else if (filterText.includes('TROPHY')) currentWireCategoryFilter = 'TROPHIES';
                else if (filterText.includes('WARNING')) currentWireCategoryFilter = 'WARNINGS';
                else if (filterText.includes('GENERAL')) currentWireCategoryFilter = 'GENERAL';
                else if (filterText.includes('CONTACT')) currentWireCategoryFilter = 'CONTACTS';
                else if (filterText.includes('LISTING')) currentWireCategoryFilter = 'LISTINGS';
                else if (filterText.includes('GUIDED') || filterText.includes('LODGING')) currentWireCategoryFilter = 'GUIDED_HUNTS';
                else if (filterText.includes('HUNTING')) currentWireCategoryFilter = 'HUNTING';
                else if (filterText.includes('FISHING')) currentWireCategoryFilter = 'FISHING';
                else if (filterText.includes('BUSINESS')) currentWireCategoryFilter = 'BUSINESS';
                else if (filterText.includes('MISC')) currentWireCategoryFilter = 'MISC';
                else if (filterText.includes('MATCH') || filterText.includes('RANGE')) currentWireCategoryFilter = 'MATCHES_RANGES';
                else if (filterText.includes('FLAGGED')) currentWireCategoryFilter = 'FLAGGED';
                else currentWireCategoryFilter = 'ALL';

                fetchWirePosts();
            });
        });
    }


    // DEFERRED: Initial wire fetch now only runs when panel is opened by the user.
    // The MutationObserver above (lines 172-185) handles fetching when panel becomes visible.
    // This prevents the 262KB Supabase call from firing on every page load.

    // Global Wire Realtime Feed Subscription — only start when panel first opens
    let _wireSubStarted = false;
    function _startWireSubscription() {
        if (_wireSubStarted || window.globalWireSubscription) return;
        _wireSubStarted = true;
        const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : window.supabaseClient;
        if (!client) return;
        window.globalWireSubscription = client
            .channel('global-wire-channel')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'global_wire' }, payload => {
                // Update main feed if open
                const panel = document.getElementById('panel-global-wire');
                if (panel && !panel.classList.contains('hidden') && window.fetchWirePosts) {
                    window.fetchWirePosts();
                }
                // Also update comm link (live comments) if open
                if (payload.new && payload.new.category === 'COMM_CHAT' && window.fetchCommLinkFeed) {
                    const sidebar = document.getElementById('comm-link-sidebar');
                    if (sidebar && sidebar.style.transform === 'translateX(0px)') {
                        window.fetchCommLinkFeed();
                    }
                }
            })
            .subscribe();
    }
    // Expose so the panel open handlers can trigger the subscription lazily
    window._startWireSubscription = _startWireSubscription;

    // --- 3. Mode Switch (INTEL SITREP vs STANDALONE TRC BUSINESS CARD) ---
    const modeBtnSitrep = document.getElementById('mode-btn-sitrep');
    const modeBtnCard = document.getElementById('mode-btn-card');
    const submitBtn = document.getElementById('post-submit-btn') || document.getElementById('submit-post-btn');
    const contactContainer = document.getElementById('contact-fields-container');
    const contactChevron = document.getElementById('contact-chevron');
    const categorySelect = document.getElementById('post-category');

    if (modeBtnSitrep && modeBtnCard) {
        modeBtnSitrep.addEventListener('click', () => {
            currentPostMode = 'SITREP';
            modeBtnSitrep.className = "flex-1 bg-emerald-500 text-black font-black text-xs py-2.5 rounded-lg uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(16,185,129,0.5)] border-2 border-emerald-400";
            modeBtnCard.className = "flex-1 bg-slate-950 text-slate-400 font-bold text-xs py-2.5 rounded-lg uppercase tracking-wider flex items-center justify-center gap-1.5 border border-slate-700 hover:border-purple-400 hover:text-purple-300 transition-all";
            
            if (submitBtn) submitBtn.innerHTML = `<i data-lucide="radio" class="w-4 h-4"></i> BROADCAST INTEL REPORT`;
            if (window.lucide) window.lucide.createIcons();
        });

        modeBtnCard.addEventListener('click', () => {
            currentPostMode = 'STANDALONE_CARD';
            modeBtnCard.className = "flex-1 bg-purple-600 text-white font-black text-xs py-2.5 rounded-lg uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(168,85,247,0.5)] border-2 border-purple-400";
            modeBtnSitrep.className = "flex-1 bg-slate-950 text-slate-400 font-bold text-xs py-2.5 rounded-lg uppercase tracking-wider flex items-center justify-center gap-1.5 border border-slate-700 hover:border-emerald-400 hover:text-emerald-300 transition-all";

            // Automatically expand business card form
            if (contactContainer) {
                contactContainer.classList.remove('hidden');
                contactContainer.classList.add('flex');
                if (contactChevron) contactChevron.classList.add('rotate-180');
            }

            if (categorySelect) categorySelect.value = 'CONTACT';
            if (submitBtn) submitBtn.innerHTML = `<i data-lucide="contact" class="w-4 h-4"></i> BROADCAST TRC BUSINESS CARD`;
            if (window.lucide) window.lucide.createIcons();
            updateLiveCardPreview();
        });
    }

    // --- 4. Live Business Card Preview, Auto-Fill & Clear Form ---
    const authorInput = document.getElementById('post-author');
    const biznameInput = document.getElementById('post-contact-bizname');
    const unitInput = document.getElementById('post-contact-unit');
    const phoneInput = document.getElementById('post-contact-phone');
    const commsInput = document.getElementById('post-contact-comms');
    const webInput = document.getElementById('post-contact-web');
    const detailsInput = document.getElementById('post-contact-details');
    const lodgeGpsInput = document.getElementById('post-lodge-gps');
    const lodgeGpsBtn = document.getElementById('post-lodge-gps-btn');
    const creatorPinInput = document.getElementById('post-creator-pin');
    const facebookInput = document.getElementById('post-contact-facebook');
    const twitterInput = document.getElementById('post-contact-twitter');
    const youtubeInput = document.getElementById('post-contact-youtube');

    const prevBizname = document.getElementById('preview-card-bizname');
    const prevAuthor = document.getElementById('preview-card-author');
    const prevUnit = document.getElementById('preview-card-unit');
    const prevPhone = document.getElementById('preview-card-phone');
    const prevComms = document.getElementById('preview-card-comms');
    const prevWeb = document.getElementById('preview-card-web');
    const prevDetails = document.getElementById('preview-card-details');
    const prevGps = document.getElementById('preview-card-gps');
    const prevGpsText = document.getElementById('preview-card-gps-text');
    const clearBizcardBtn = document.getElementById('clear-bizcard-btn');

    function updateLiveCardPreview() {
        const bizname = (biznameInput ? biznameInput.value.trim() : '') || 'BUSINESS / COMPANY NAME';
        const author = (authorInput ? authorInput.value.trim() : '') || 'CALLSIGN';
        const unit = (unitInput ? unitInput.value.trim() : '') || 'Unit / Organization';
        const phone = (phoneInput ? phoneInput.value.trim() : '') || '--';
        const comms = (commsInput ? commsInput.value.trim() : '') || '--';
        const web = (webInput ? webInput.value.trim() : '') || '--';
        const details = (detailsInput ? detailsInput.value.trim() : '') || '--';
        const lodgeGps = (lodgeGpsInput ? lodgeGpsInput.value.trim() : '') || '';

        if (prevBizname) prevBizname.textContent = bizname;
        if (prevAuthor) prevAuthor.textContent = author;
        if (prevUnit) prevUnit.textContent = unit;
        if (prevPhone) prevPhone.innerHTML = `<span class="text-slate-400">PHONE:</span> <span class="text-white font-bold">${phone}</span>`;
        if (prevComms) prevComms.innerHTML = `<span class="text-slate-400">COMMS:</span> <span class="text-emerald-400 font-bold">${comms}</span>`;
        if (prevWeb) prevWeb.innerHTML = `<span class="text-slate-400">WEB:</span> <span class="text-blue-400 font-bold">${web}</span>`;
        if (prevDetails) prevDetails.textContent = `Specialties: ${details}`;
        const shootRangesPreview = document.getElementById('preview-card-shooting-ranges');
        const shootRangesVal = document.getElementById('post-contact-shooting-ranges')?.value?.trim() || '';
        if (shootRangesPreview) {
            if (shootRangesVal) { shootRangesPreview.textContent = '🎯 Ranges: ' + shootRangesVal; shootRangesPreview.classList.remove('hidden'); }
            else { shootRangesPreview.classList.add('hidden'); }
        }
        if (prevGps && prevGpsText) {
            if (lodgeGps) {
                prevGps.classList.remove('hidden');
                prevGpsText.textContent = `RANCH GPS: ${lodgeGps}`;
            } else {
                prevGps.classList.add('hidden');
            }
        }
    }
    window.updateLiveCardPreview = updateLiveCardPreview;

    // Grab Lodge GPS Button Handler
    if (lodgeGpsBtn && lodgeGpsInput) {
        lodgeGpsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const lbl = document.getElementById('post-lodge-gps-btn-label');
            const orig = lbl ? lbl.textContent : "GRAB GPS";
            if (lbl) lbl.textContent = "ACQUIRING...";
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition((pos) => {
                    const lat = pos.coords.latitude.toFixed(5);
                    const lon = pos.coords.longitude.toFixed(5);
                    lodgeGpsInput.value = `${lat}, ${lon}`;
                    if (lbl) lbl.textContent = "CAPTURED!";
                    updateLiveCardPreview();
                    setTimeout(() => { if (lbl) lbl.textContent = orig; }, 2000);
                }, (err) => {
                    alert("GPS signal unavailable or location permission denied.");
                    if (lbl) lbl.textContent = "FAILED";
                    setTimeout(() => { if (lbl) lbl.textContent = orig; }, 2000);
                }, { enableHighAccuracy: true, timeout: 10000 });
            } else {
                alert("Geolocation not supported on this browser.");
            }
        });
    }

    // Clear Business Card Form Handler
    if (clearBizcardBtn) {
        clearBizcardBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (biznameInput) biznameInput.value = '';
            if (unitInput) unitInput.value = '';
            if (phoneInput) phoneInput.value = '';
            if (commsInput) commsInput.value = '';
            if (webInput) webInput.value = '';
            if (detailsInput) detailsInput.value = '';
            const shootRangesField = document.getElementById('post-contact-shooting-ranges');
            if (shootRangesField) shootRangesField.value = '';
            if (lodgeGpsInput) lodgeGpsInput.value = '';

            const bizcardUpload = document.getElementById('post-bizcard-upload');
            const bizcardLabel = document.getElementById('post-bizcard-label');
            const bizcardThumbContainer = document.getElementById('post-bizcard-thumb-container');
            if (bizcardUpload) bizcardUpload.value = '';
            if (bizcardLabel) {
                bizcardLabel.textContent = "SNAP / UPLOAD";
                bizcardLabel.classList.remove("text-emerald-400");
            }
            if (bizcardThumbContainer) {
                bizcardThumbContainer.classList.add('hidden');
                bizcardThumbContainer.classList.remove('flex');
            }

            try { localStorage.removeItem('myTacticalBusinessCard'); } catch(err) {}

            updateLiveCardPreview();

            clearBizcardBtn.innerHTML = `<i data-lucide="check" class="w-3 h-3 text-green-400"></i> CLEARED!`;
            setTimeout(() => {
                clearBizcardBtn.innerHTML = `<i data-lucide="eraser" class="w-3 h-3 text-red-400"></i> CLEAR CARD FORM`;
                if (window.lucide) window.lucide.createIcons();
            }, 1800);
        });
    }

    // Load saved business card and Creator PIN from LocalStorage
    try {
        const savedCard = JSON.parse(localStorage.getItem('myTacticalBusinessCard') || '{}');
        const savedPin = localStorage.getItem('trc_operator_pin') || '';
        if (savedPin && creatorPinInput && !creatorPinInput.value) {
            creatorPinInput.value = savedPin;
        }

        if (savedCard) {
            if (savedCard.author && authorInput && !authorInput.value) authorInput.value = savedCard.author;
            if (savedCard.bizname && biznameInput) biznameInput.value = savedCard.bizname;
            if (savedCard.unit && unitInput) unitInput.value = savedCard.unit;
            if (savedCard.phone && phoneInput) phoneInput.value = savedCard.phone;
            if (savedCard.comms && commsInput) commsInput.value = savedCard.comms;
            if (savedCard.web && webInput) webInput.value = savedCard.web;
            if (savedCard.details && detailsInput) detailsInput.value = savedCard.details;
            if (savedCard.shootingRanges) { const sr = document.getElementById('post-contact-shooting-ranges'); if (sr) sr.value = savedCard.shootingRanges; }
            if (savedCard.gps && lodgeGpsInput) lodgeGpsInput.value = savedCard.gps;
            if (savedCard.pin && creatorPinInput && !creatorPinInput.value) creatorPinInput.value = savedCard.pin;
            updateLiveCardPreview();
        }
    } catch(e) {}

    [authorInput, biznameInput, unitInput, phoneInput, commsInput, webInput, detailsInput, lodgeGpsInput].forEach(inp => {
        if (inp) {
            inp.addEventListener('input', updateLiveCardPreview);
        }
    });

    // --- 5. Collapsible Field Contact / Business Card Form ---
    const toggleContactBtn = document.getElementById('toggle-contact-btn');
    let isContactFormOpen = false;

    if (toggleContactBtn && contactContainer) {
        toggleContactBtn.addEventListener('click', () => {
            isContactFormOpen = !isContactFormOpen;
            if (isContactFormOpen) {
                contactContainer.classList.remove('hidden');
                contactContainer.classList.add('flex');
                if (contactChevron) contactChevron.classList.add('rotate-180');
                updateLiveCardPreview();
            } else {
                contactContainer.classList.add('hidden');
                contactContainer.classList.remove('flex');
                if (contactChevron) contactChevron.classList.remove('rotate-180');
            }
        });
    }

    // --- 6. Live Thumbnail Previews & Attachment Handlers ---
    const imageUpload = document.getElementById('post-image-upload');
    const imageLabel = document.getElementById('post-image-label');
    const imageThumbContainer = document.getElementById('post-image-thumb-container');
    const imageThumb = document.getElementById('post-image-thumb');
    const clearPostImageBtn = document.getElementById('clear-post-image-btn');

    const bizcardUpload = document.getElementById('post-bizcard-upload');
    const bizcardLabel = document.getElementById('post-bizcard-label');
    const bizcardThumbContainer = document.getElementById('post-bizcard-thumb-container');
    const bizcardThumb = document.getElementById('post-bizcard-thumb');
    const clearBizcardPhotoBtn = document.getElementById('clear-bizcard-photo-btn');
    const loadCardBtn = document.getElementById('post-load-card-btn');

    // Live Thumbnail Preview for Main Blog Photo
    if (imageUpload && imageThumbContainer && imageThumb) {
        imageUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    imageThumb.src = ev.target.result;
                    imageThumbContainer.classList.remove('hidden');
                    imageThumbContainer.classList.add('flex');
                    if (imageLabel) {
                        imageLabel.textContent = "ATTACHED";
                        imageLabel.classList.add("text-emerald-400");
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (clearPostImageBtn && imageUpload && imageThumbContainer) {
        clearPostImageBtn.addEventListener('click', (e) => {
            e.preventDefault();
            imageUpload.value = '';
            pendingVaultImageBase64 = null;
            imageThumbContainer.classList.add('hidden');
            imageThumbContainer.classList.remove('flex');
            if (imageLabel) {
                imageLabel.textContent = "Photo";
                imageLabel.classList.remove("text-emerald-400");
            }
            const vLabel = document.getElementById('post-vault-label');
            if (vLabel) {
                vLabel.textContent = "Vault";
                vLabel.classList.remove("text-green-400");
            }
        });
    }

    // Live Thumbnail Preview for Paper Business Card Photo
    if (bizcardUpload && bizcardThumbContainer && bizcardThumb) {
        bizcardUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    bizcardThumb.src = ev.target.result;
                    bizcardThumbContainer.classList.remove('hidden');
                    bizcardThumbContainer.classList.add('flex');
                    if (bizcardLabel) {
                        bizcardLabel.textContent = "ATTACHED";
                        bizcardLabel.classList.add("text-emerald-400");
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (clearBizcardPhotoBtn && bizcardUpload && bizcardThumbContainer) {
        clearBizcardPhotoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            bizcardUpload.value = '';
            bizcardThumbContainer.classList.add('hidden');
            bizcardThumbContainer.classList.remove('flex');
            if (bizcardLabel) {
                bizcardLabel.textContent = "SNAP / UPLOAD";
                bizcardLabel.classList.remove("text-emerald-400");
            }
        });
    }

    // Load Saved Business Card into Main Post Photo
    if (loadCardBtn) {
        loadCardBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const savedCard = JSON.parse(localStorage.getItem('myTacticalBusinessCard') || '{}');
            if (savedCard && (savedCard.bizname || savedCard.author)) {
                // Open and fill business card form
                window.reworkBusinessCard(savedCard);
                loadCardBtn.classList.add('text-purple-400', 'border-purple-400');
            } else {
                alert("No saved Business Card found in storage. Fill out the card form below first!");
            }
        });
    }

    // --- 7. Main Transmission Form Elements & Submission ---
    const newPostBtn = document.getElementById('openNewPostBtn');
    const postModal = document.getElementById('modal-new-post');
    const contentInput = document.getElementById('post-content');
    const charCount = document.getElementById('post-char-count');
    const coordBtn = document.getElementById('post-coord-btn');
    const vaultLabel = document.getElementById('post-vault-label');

    window.openNewPostModal = function() {
        const pModal = document.getElementById('modal-new-post');
        if (pModal) {
            pModal.style.setProperty('display', 'flex', 'important');
            pModal.style.setProperty('z-index', '9999999', 'important');
            pModal.classList.remove('hidden');
        }
        if (window.updateLiveCardPreview) window.updateLiveCardPreview();
    };

    window.closeNewPostModal = function() {
        const pModal = document.getElementById('modal-new-post');
        if (pModal) {
            pModal.style.setProperty('display', 'none', 'important');
            pModal.classList.add('hidden');
        }
    };

    window.clearTransmissionForm = function() {
        // Clear main intel fields
        const author = document.getElementById('post-author');
        if(author) author.value = '';
        const cat = document.getElementById('post-category');
        if(cat) cat.value = 'GENERAL';
        const content = document.getElementById('post-content');
        if(content) content.value = '';
        
        // Clear attachments & files
        if(window.clearPostImage) window.clearPostImage();
        if(window.clearBizCardPhoto) window.clearBizCardPhoto();
        
        // Clear card fields
        const fields = ['bizname', 'unit', 'phone', 'comms', 'web', 'details', 'shooting-ranges', 'facebook', 'twitter', 'youtube'];
        fields.forEach(f => {
            const el = document.getElementById('post-contact-' + f);
            if(el) el.value = '';
        });
        
        // Clear vault logic if exists
        window.pendingVaultImageBase64 = null;
        window.pendingVaultCardData = null;
        
        // Update Live Preview & UI
        if(window.updateLiveCardPreview) window.updateLiveCardPreview();
        const charCount = document.getElementById('post-char-count');
        if(charCount) charCount.textContent = '0/500';
    };

    // Backdrop click to close modal & Escape key listener
    if (postModal) {
        postModal.addEventListener('click', (e) => {
            if (e.target === postModal) {
                window.closeNewPostModal();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (postModal && !postModal.classList.contains('hidden')) {
                window.closeNewPostModal();
            }
        }
    });

    // Open Modal
    if (newPostBtn) {
        newPostBtn.addEventListener('click', () => {
            window.openNewPostModal();
        });
    }

    // Character Counter
    if (contentInput && charCount) {
        contentInput.addEventListener('input', () => {
            charCount.textContent = `${contentInput.value.length}/500`;
        });
    }

    let pendingVaultImageBase64 = null;

    // Vault Integration Modal Logic
    const vaultBtn = document.getElementById('post-vault-btn');
    const vaultModal = document.getElementById('modal-vault-picker');
    const vaultGrid = document.getElementById('vault-picker-grid');

    if (vaultBtn && vaultModal && vaultGrid) {
        vaultBtn.addEventListener('click', () => {
            vaultGrid.innerHTML = '';
            if (!window.vaultCache || window.vaultCache.length === 0) {
                vaultGrid.innerHTML = `<div class="col-span-2 text-gray-400 font-bold text-center text-xs py-10 uppercase tracking-widest">Intel Vault Empty</div>`;
            } else {
                const images = window.vaultCache.filter(item => item.data || item.image);
                images.forEach((item) => {
                    const imgData = item.data || item.image;
                    const itemName = item.name || item.label || 'UNKNOWN INTEL';
                    const itemDate = item.date || item.timestamp || '';
                    const lat = item.targetLat || item.centerLat;
                    const lon = item.targetLon || item.centerLng;
                    
                    const el = document.createElement('div');
                    el.className = "bg-black border-2 border-gray-700 rounded overflow-hidden cursor-pointer hover:border-green-400 transition-colors flex flex-col";
                    el.innerHTML = `
                        <div class="h-24 bg-gray-900 relative overflow-hidden flex items-center justify-center border-b-2 border-gray-700">
                            <img src="${imgData}" class="w-full h-full object-contain">
                        </div>
                        <div class="p-2">
                            <div class="text-[9px] font-black text-white truncate uppercase">${itemName}</div>
                            <div class="text-[8px] font-black text-gray-400 uppercase mt-1">${itemDate}</div>
                        </div>
                    `;
                    el.addEventListener('click', () => {
                        pendingVaultImageBase64 = imgData;
                        if (vaultLabel) {
                            vaultLabel.textContent = "VAULT (1)";
                            vaultLabel.classList.add("text-green-400");
                        }
                        
                        if (imageUpload) imageUpload.value = '';
                        if (imageThumb && imageThumbContainer) {
                            imageThumb.src = imgData;
                            imageThumbContainer.classList.remove('hidden');
                            imageThumbContainer.classList.add('flex');
                        }
                        if (imageLabel) {
                            imageLabel.textContent = 'VAULT ATTACHED';
                            imageLabel.classList.add('text-emerald-400');
                        }
                        
                        if (lat && lon && contentInput) {
                            const coordString = `\n\n[COORD: ${parseFloat(lat).toFixed(5)}, ${parseFloat(lon).toFixed(5)}]`;
                            if (!contentInput.value.includes(coordString)) {
                                contentInput.value += coordString;
                            }
                            if (charCount) charCount.textContent = `${contentInput.value.length}/500`;
                        }
                        
                        vaultModal.classList.add('hidden');
                    });
                    vaultGrid.appendChild(el);
                });
                
                if (images.length === 0) {
                    vaultGrid.innerHTML = `<div class="col-span-2 text-gray-400 font-bold text-center text-xs py-10 uppercase tracking-widest">No Media in Vault</div>`;
                }
            }
            vaultModal.classList.remove('hidden');
        });
    }

    // Grab Coordinates (GPS / MGRS)
    if (coordBtn) {
        coordBtn.addEventListener('click', () => {
            const coordLabel = document.getElementById('post-coord-label');
            const originalText = coordLabel ? coordLabel.textContent : "GPS";
            if (coordLabel) coordLabel.textContent = "ACQUIRING...";
            
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition((position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    let locationString = `COORD: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
                    
                    if (window.geodesy_mgrs_LatLon && window.geodesy_mgrs_Mgrs) {
                        try {
                            const p = new window.geodesy_mgrs_LatLon(lat, lon);
                            const mgrsStr = p.toUtm().toMgrs().toString();
                            locationString = `MGRS: ${mgrsStr} (COORD: ${lat.toFixed(5)}, ${lon.toFixed(5)})`;
                        } catch(e) { console.warn("MGRS Conversion Failed", e); }
                    }

                    const currentText = contentInput.value;
                    contentInput.value = currentText + (currentText ? '\n\n' : '') + `[${locationString}]`;
                    if (charCount) charCount.textContent = `${contentInput.value.length}/500`;
                    
                    if (coordLabel) coordLabel.textContent = "CAPTURED";
                    coordBtn.classList.add('text-emerald-400');
                    setTimeout(() => {
                        if (coordLabel) coordLabel.textContent = originalText;
                        coordBtn.classList.remove('text-emerald-400');
                    }, 2000);
                }, (error) => {
                    alert("GPS Signal Lost or Denied.");
                    if (coordLabel) coordLabel.textContent = "FAILED";
                }, { enableHighAccuracy: true, timeout: 10000 });
            } else {
                alert("Geolocation not supported on this device.");
            }
        });
    }

    // Submit Post Handler
    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            const client = getSupabaseClient();
            if (!client) {
                alert("Supabase Cloud Client is not ready. Please try again.");
                return;
            }

            const author = (authorInput ? authorInput.value.trim() : '') || 'ANONYMOUS';
            const category = categorySelect ? categorySelect.value : 'GENERAL';
            let intelText = (contentInput ? contentInput.value.trim() : '');
            const file = imageUpload && imageUpload.files ? imageUpload.files[0] : null;

            // Grab Contact Card Fields
            const bizname = biznameInput ? biznameInput.value.trim() : '';
            const unit = unitInput ? unitInput.value.trim() : '';
            const phone = phoneInput ? phoneInput.value.trim() : '';
            const comms = commsInput ? commsInput.value.trim() : '';
            const web = webInput ? webInput.value.trim() : '';
            let details = detailsInput ? detailsInput.value.trim() : '';
            const lodgeGps = lodgeGpsInput ? lodgeGpsInput.value.trim() : '';
            const shootingRanges = document.getElementById('post-contact-shooting-ranges') ? document.getElementById('post-contact-shooting-ranges').value.trim() : '';
            const creatorPin = (creatorPinInput ? creatorPinInput.value.trim() : '') || localStorage.getItem('trc_operator_pin') || '';
            let facebook = facebookInput ? facebookInput.value.trim() : '';
            let twitter = twitterInput ? twitterInput.value.trim() : '';
            let youtube = youtubeInput ? youtubeInput.value.trim() : '';
            const bizFile = bizcardUpload && bizcardUpload.files ? bizcardUpload.files[0] : null;

            // Remember Creator PIN & Callsign for Ownership Management
            if (creatorPin) {
                try { localStorage.setItem('trc_operator_pin', creatorPin); } catch(e) {}
            }
            if (author && author !== 'ANONYMOUS') {
                try { localStorage.setItem('my_tactical_callsign', author); } catch(e) {}
            }

            // Parse Lodge GPS Coordinates if supplied
            let lodgeLat = null, lodgeLon = null;
            if (lodgeGps) {
                const parts = lodgeGps.split(',');
                if (parts.length === 2 && !isNaN(parseFloat(parts[0])) && !isNaN(parseFloat(parts[1]))) {
                    lodgeLat = parseFloat(parts[0].trim());
                    lodgeLon = parseFloat(parts[1].trim());
                }
            }

            const isStandaloneCard = (currentPostMode === 'STANDALONE_CARD');
            const hasContactFields = !!(bizname || unit || phone || comms || web || details || lodgeGps || facebook || twitter || youtube || bizFile);
            const isAttachingContact = isStandaloneCard || (isContactFormOpen && hasContactFields);

            if (!intelText && !isAttachingContact) {
                alert("Intel Report or TRC Business Card fields cannot be empty.");
                return;
            }

            // Auto-append [COORD: lat, lon] tag if coordinates were entered in the Ranch GPS field and not already in text
            if (lodgeLat !== null && lodgeLon !== null && !intelText.includes('[COORD:')) {
                intelText = intelText + (intelText ? '\n\n' : '') + `[COORD: ${lodgeLat.toFixed(5)}, ${lodgeLon.toFixed(5)}]`;
            }

            submitBtn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> TRANSMITTING...`;
            submitBtn.disabled = true;

            let publicImageUrl = null;
            let bizcardImageUrl = null;

            try {
                // 1. Upload Main Photo
                if (file) {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `wire_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                    
                    const { data, error } = await client.storage
                        .from('Tactical-media')
                        .upload(fileName, file, { cacheControl: '3600', upsert: false });

                    if (error) throw new Error("Image Upload Failed: " + error.message);
                    
                    const { data: pubData } = client.storage
                        .from('Tactical-media')
                        .getPublicUrl(fileName);
                        
                    publicImageUrl = pubData.publicUrl;
                } else if (pendingVaultImageBase64) {
                    publicImageUrl = pendingVaultImageBase64;
                }

                // 2. Upload Physical Business Card Photo (if attached)
                if (bizFile) {
                    const bExt = bizFile.name.split('.').pop();
                    const bName = `bizcard_${Date.now()}_${Math.random().toString(36).substring(7)}.${bExt}`;
                    
                    const { data: bData, error: bErr } = await client.storage
                        .from('Tactical-media')
                        .upload(bName, bizFile, { cacheControl: '3600', upsert: false });

                    if (!bErr && bData) {
                        const { data: bPub } = client.storage
                            .from('Tactical-media')
                            .getPublicUrl(bName);
                        bizcardImageUrl = bPub.publicUrl;
                    }
                }

                // Auto-save business card to LocalStorage for future posts
                if (isAttachingContact) {
                    try {
                        localStorage.setItem('myTacticalBusinessCard', JSON.stringify({
                            author: author,
                            bizname: bizname,
                            unit: unit,
                            phone: phone,
                            comms: comms,
                            web: web,
                            details: details,
                            shootingRanges: shootingRanges,
                            gps: lodgeGps,
                            pin: creatorPin
                        }));
                    } catch(e) {}
                }

                // 3. Format final payload
                let finalContent = intelText;
                if (isAttachingContact) {
                    const payload = {
                        intelText: intelText,
                        creatorPin: creatorPin,
                        contact: {
                            bizname: bizname,
                            unit: unit,
                            phone: phone,
                            comms: comms,
                            web: web,
                            details: details,
                            shootingRanges: shootingRanges,
                            gps: lodgeGps,
                            lat: lodgeLat,
                            lon: lodgeLon,
                            creatorPin: creatorPin,
                            facebook: facebook,
                            twitter: twitter,
                            youtube: youtube,
                            cardImageUrl: bizcardImageUrl
                        }
                    };
                    finalContent = JSON.stringify(payload);
                } else if (creatorPin) {
                    const payload = {
                        intelText: intelText,
                        creatorPin: creatorPin
                    };
                    finalContent = JSON.stringify(payload);
                }

                const insertedCategory = isStandaloneCard ? 'CONTACTS' : (category || 'GENERAL');

                // 4. Insert into Database
                const { data: insertedData, error: insertError } = await client
                    .from('global_wire')
                    .insert([
                        {
                            author: author,
                            category: insertedCategory,
                            content: finalContent,
                            image_url: publicImageUrl,
                            upvotes: 0
                        }
                    ])
                    .select();

                if (insertError) throw new Error("Database Insert Failed: " + insertError.message);

                // 5. Track My Created Post IDs Locally
                const newPostId = (insertedData && insertedData[0]) ? insertedData[0].id : Date.now();
                try {
                    let myPosts = JSON.parse(localStorage.getItem('my_created_post_ids') || '[]');
                    if (!myPosts.includes(newPostId)) {
                        myPosts.push(newPostId);
                        localStorage.setItem('my_created_post_ids', JSON.stringify(myPosts));
                    }
                } catch(pe) {}
                const vaultEntry = {
                    id: 'wire_' + newPostId,
                    name: (author || 'INTEL REPORT') + ' - ' + insertedCategory,
                    type: 'intel_report',
                    timestamp: Date.now(),
                    date: new Date().toLocaleDateString(),
                    author: author,
                    category: insertedCategory,
                    content: intelText,
                    image: publicImageUrl,
                    contact: isAttachingContact ? {
                        bizname: bizname,
                        unit: unit,
                        phone: phone,
                        comms: comms,
                        web: web,
                        details: details,
                        gps: lodgeGps,
                        lat: lodgeLat,
                        lon: lodgeLon,
                        facebook: facebook,
                        twitter: twitter,
                        youtube: youtube,
                        cardImageUrl: bizcardImageUrl
                    } : null
                };

                if (!window.vaultCache) window.vaultCache = [];
                window.vaultCache = window.vaultCache.filter(v => v && v.id && v.id.toString() !== vaultEntry.id.toString() && !(v.content && vaultEntry.content && v.content === vaultEntry.content && v.author === vaultEntry.author));
                window.vaultCache.unshift(vaultEntry);

                if (window.TRC_IDB) {
                    try {
                        await window.TRC_IDB.set('intelVault', vaultEntry.id.toString(), vaultEntry);
                    } catch(ve) { console.warn("Auto-vault save IDB error", ve); }
                }

                if (typeof window.refreshVaultGrid === 'function') window.refreshVaultGrid();

                // Reset transmission text & photo attachments
                if (contentInput) contentInput.value = '';
                if (imageUpload) imageUpload.value = '';
                if (imageThumbContainer) {
                    imageThumbContainer.classList.add('hidden');
                    imageThumbContainer.classList.remove('flex');
                }
                if (imageLabel) {
                    imageLabel.textContent = "Photo";
                    imageLabel.classList.remove("text-emerald-400");
                }
                if (vaultLabel) {
                    vaultLabel.textContent = "Vault";
                    vaultLabel.classList.remove("text-green-400");
                }
                if (bizcardUpload) bizcardUpload.value = '';
                if (bizcardThumbContainer) {
                    bizcardThumbContainer.classList.add('hidden');
                    bizcardThumbContainer.classList.remove('flex');
                }
                if (bizcardLabel) {
                    bizcardLabel.textContent = "SNAP / UPLOAD";
                    bizcardLabel.classList.remove("text-emerald-400");
                }
                
                isContactFormOpen = false;
                if (contactContainer) {
                    contactContainer.classList.add('hidden');
                    contactContainer.classList.remove('flex');
                    if (contactChevron) contactChevron.classList.remove('rotate-180');
                }

                pendingVaultImageBase64 = null;
                if (charCount) charCount.textContent = '0/500';

                // Reset category filter to ALL so the user immediately sees all posts!
                currentWireCategoryFilter = 'ALL';
                highlightActiveFilterButton('ALL POSTS');
                
                // Close modal and refresh feed
                if (postModal) {
                    postModal.classList.add('hidden');
                    postModal.style.display = 'none';
                }
                await fetchWirePosts();

            } catch (err) {
                console.error("Submission Error:", err);
                alert("Transmission Error: " + err.message);
            } finally {
                submitBtn.innerHTML = isStandaloneCard ? `<i data-lucide="contact" class="w-4 h-4"></i> BROADCAST TRC BUSINESS CARD` : `<i data-lucide="radio" class="w-4 h-4"></i> BROADCAST INTEL REPORT`;
                submitBtn.disabled = false;
                if (window.lucide) window.lucide.createIcons();
            }
        });
    }
});

async function fetchWirePosts(retryCount = 0) {
    const feedContainer = document.getElementById('wire-feed-container');
    if (!feedContainer) return;

    let client = getSupabaseClient();
    if (!client && retryCount < 5) {
        feedContainer.innerHTML = `<div class="w-full text-center mt-12 text-black font-black uppercase tracking-widest flex items-center justify-center gap-3">
            <i data-lucide="loader" class="w-6 h-6 animate-spin"></i> CONNECTING TO WIRE...
        </div>`;
        if (window.lucide) window.lucide.createIcons();
        setTimeout(() => fetchWirePosts(retryCount + 1), 350);
        return;
    }
    if (!client) {
        feedContainer.innerHTML = `<div class="text-black bg-amber-100 p-4 font-bold border-2 border-amber-600 w-full max-w-2xl text-center mx-auto rounded-lg shadow">
            CONNECTING TO GLOBAL SATELLITE NETWORK...
            <div class="mt-2"><button onclick="fetchWirePosts()" class="bg-black hover:bg-slate-800 text-white text-xs px-4 py-1.5 rounded uppercase font-bold cursor-pointer">RETRY CONNECTION</button></div>
        </div>`;
        return;
    }

    // Show loading state
    feedContainer.innerHTML = `<div class="w-full text-center mt-12 text-black font-black uppercase tracking-widest flex items-center justify-center gap-3">
        <i data-lucide="loader" class="w-6 h-6 animate-spin"></i> INTERROGATING SATELLITE...
    </div>`;
try {
        let query = client
            .from('global_wire')
            .select('*')
            .not('category', 'like', 'RCARD_%')
            .order('created_at', { ascending: false })
            .limit(50);

        if (currentWireCategoryFilter && currentWireCategoryFilter !== 'ALL' && currentWireCategoryFilter !== 'FLAGGED') {
            // CONTACTS filter: match both CONTACTS and CONTACT (legacy) posts
            if (currentWireCategoryFilter === 'CONTACTS') {
                query = query.or('category.eq.CONTACTS,category.eq.CONTACT');
            } else if (currentWireCategoryFilter === 'GUIDED_HUNTS') {
                query = query.or('category.ilike.%GUIDED%,category.ilike.%LODGING%');
            } else if (currentWireCategoryFilter === 'MATCHES_RANGES') {
                query = query.or('category.ilike.%MATCH%,category.ilike.%RANGE%');
            } else {
                // Use ilike to catch both singular/plural variants in DB (HOTSPOT or HOTSPOTS)
                query = query.ilike('category', `%${currentWireCategoryFilter.replace(/S$/, '')}%`);
            }
        }

        const { data: posts, error } = await query;

        if (error) throw error;

        // Filter out COMM_CHAT messages from the main feed
        const filteredData = posts ? posts.filter(post => post.category !== 'COMM_CHAT') : [];

        window.fetchedWirePosts = filteredData;
        if (typeof window.updateBlogBookDisplay === 'function') window.updateBlogBookDisplay();

        const isMasterAdmin = sessionStorage.getItem('trc_is_master_admin') === 'true';
        const reportedPosts = JSON.parse(localStorage.getItem('trc_reported_posts') || '[]');
        const reportedLog = JSON.parse(localStorage.getItem('trc_reported_posts_log') || '{}');

        let visibleData = [];
        if (currentWireCategoryFilter === 'FLAGGED') {
            visibleData = (filteredData || []).filter(p => reportedPosts.includes(p.id.toString()) || reportedPosts.includes(p.id) || p.status === 'suspended' || p.status === 'flagged');
        } else if (isMasterAdmin) {
            visibleData = filteredData || [];
        } else {
            visibleData = (filteredData || []).filter(p => !reportedPosts.includes(p.id.toString()) && !reportedPosts.includes(p.id));
        }

        feedContainer.innerHTML = '';

        if (!visibleData || visibleData.length === 0) {
            feedContainer.innerHTML = `
                <div class="text-center py-20 px-4 border-4 border-dashed border-slate-700 rounded-xl bg-slate-900/50">
                    <h3 class="text-slate-400 font-black text-sm uppercase tracking-widest mb-3">NO TRANSMISSIONS FOUND IN "${currentWireCategoryFilter}".</h3>
                    <button onclick="window.currentWireCategoryFilter='ALL'; window.fetchWirePosts();" class="bg-blue-600 text-white font-black text-[10px] px-6 py-2.5 rounded hover:bg-blue-500 uppercase tracking-widest transition-colors shadow-lg">SHOW ALL POSTS</button>
                </div>
            `;
            return;
        }

        visibleData.forEach(post => {
            // Unpack content JSON if contact card is attached
            let intelText = post.content || '';
            let contactData = null;
            let postContentObj = null;

            if (post.content && post.content.startsWith('{')) {
                try {
                    const parsed = JSON.parse(post.content);
                    postContentObj = parsed;
                    if (parsed.intelText !== undefined) {
                        intelText = parsed.intelText;
                        contactData = parsed.contact || null;
                    }
                } catch(e) {}
            }

            const postIdStr = post.id ? post.id.toString() : '';
            const reportMeta = reportedLog[postIdStr] || reportedLog[post.id] || null;
            const isPostReported = reportedPosts.includes(postIdStr) || reportedPosts.includes(post.id) || post.status === 'suspended' || post.status === 'flagged' || Boolean(reportMeta);

            const card = document.createElement('div');
            card.id = `wire-post-${post.id}`;
            card.dataset.postId = post.id;
            card.className = `w-full max-w-2xl bg-white ${isPostReported ? 'border-4 border-red-600 shadow-[8px_8px_0_rgba(220,38,38,1)]' : 'border-4 border-black shadow-[8px_8px_0_rgba(0,0,0,1)]'} rounded-sm overflow-hidden flex flex-col mx-auto relative mb-6 transition-all duration-300`;

            // Format date
            const dateObj = new Date(post.created_at);
            const timeAgo = Math.floor((new Date() - dateObj) / 60000);
            let timeStr = timeAgo < 60 ? `${timeAgo} MINS AGO` : `${Math.floor(timeAgo/60)} HOURS AGO`;
            if (timeAgo > 1440) timeStr = `${Math.floor(timeAgo/1440)} DAYS AGO`;

            // Category colors & High-Contrast Badges with Inline Styles
            const rawCat = (post.category || 'GENERAL').toString().trim().toUpperCase();
            let displayCatName = rawCat.length > 0 ? rawCat : 'GENERAL';
            let catBadgeStyle = 'background-color: #2563eb !important; color: #ffffff !important; border: 1px solid #000 !important; font-weight: 900 !important;';

            if (rawCat.includes('HOTSPOT')) {
                catBadgeStyle = 'background-color: #f97316 !important; color: #000000 !important; border: 1px solid #000 !important; font-weight: 900 !important;';
                displayCatName = '🔥 HOTSPOT';
            } else if (rawCat.includes('TROPHY')) {
                catBadgeStyle = 'background-color: #10b981 !important; color: #000000 !important; border: 1px solid #000 !important; font-weight: 900 !important;';
                displayCatName = '🏆 TROPHY';
            } else if (rawCat.includes('WARNING')) {
                catBadgeStyle = 'background-color: #ef4444 !important; color: #ffffff !important; border: 1px solid #000 !important; font-weight: 900 !important;';
                displayCatName = '⚠️ WARNING';
            } else if (rawCat.includes('CONTACT') || rawCat.includes('BUSINESS')) {
                catBadgeStyle = 'background-color: #a855f7 !important; color: #ffffff !important; border: 1px solid #000 !important; font-weight: 900 !important;';
                displayCatName = '🎴 OUTFITTER';
            } else if (rawCat.includes('LODGING') || rawCat.includes('GUIDED')) {
                catBadgeStyle = 'background-color: #f59e0b !important; color: #000000 !important; border: 1px solid #000 !important; font-weight: 900 !important;';
                displayCatName = '🏕️ GUIDED/LODGE';
            } else if (rawCat.includes('MATCH') || rawCat.includes('RANGE')) {
                catBadgeStyle = 'background-color: #e11d48 !important; color: #ffffff !important; border: 1px solid #000 !important; font-weight: 900 !important;';
                displayCatName = '🎯 MATCHES & RANGES';
            } else if (rawCat.includes('FISHING')) {
                catBadgeStyle = 'background-color: #06b6d4 !important; color: #000000 !important; border: 1px solid #000 !important; font-weight: 900 !important;';
                displayCatName = '🎣 FISHING';
            }

            const catBadge = `<span style="${catBadgeStyle}" class="text-[10px] px-2 py-0.5 rounded uppercase tracking-wider shrink-0 shadow-sm inline-block">${displayCatName}</span>`;

            // Parse for coordinates in content (e.g., [COORD: 32.7767, -96.7970]) or contactData.gps
            let extractedLat = null;
            let extractedLon = null;
            const coordMatch = intelText.match(/\[(?:COORD|MGRS):?\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)\]/i);
            if (coordMatch) {
                extractedLat = parseFloat(coordMatch[1]);
                extractedLon = parseFloat(coordMatch[2]);
            } else if (contactData && contactData.lat && contactData.lon) {
                extractedLat = parseFloat(contactData.lat);
                extractedLon = parseFloat(contactData.lon);
            } else if (contactData && contactData.gps) {
                const parts = contactData.gps.split(',');
                if (parts.length === 2 && !isNaN(parseFloat(parts[0])) && !isNaN(parseFloat(parts[1]))) {
                    extractedLat = parseFloat(parts[0].trim());
                    extractedLon = parseFloat(parts[1].trim());
                }
            }

            const upvotes = post.upvotes || 0;

            // Unpack media & contact info
            const trophyPhotoUrl = post.image_url || post.imageUrl || post.image || null;
            const personalBizCardUrl = (contactData && contactData.cardImageUrl) ? contactData.cardImageUrl : null;
            const hasTRCDigitalCard = contactData && (contactData.bizname || contactData.unit || contactData.phone || contactData.comms || contactData.web || contactData.details || contactData.gps);

            // Determine Post Ownership & Authorization
            const myPostIds = JSON.parse(localStorage.getItem('my_created_post_ids') || '[]');
            const mySavedPin = (localStorage.getItem('trc_operator_pin') || '').trim();
            const myCallsign = (localStorage.getItem('my_tactical_callsign') || '').trim().toLowerCase();
            const postPin = (contactData && (contactData.creatorPin || contactData.pin)) || (postContentObj && postContentObj.creatorPin) || post.creator_pin || null;

            const isOwner = myPostIds.includes(post.id) || (postPin && mySavedPin && postPin.toString() === mySavedPin.toString()) || (myCallsign && post.author && post.author.trim().toLowerCase() === myCallsign && myCallsign !== 'anonymous');

            let formattedTxId = 'TX-#';
            if (post.id) {
                const rawId = post.id.toString();
                if (rawId.length > 8) {
                    formattedTxId = 'TX-#' + rawId.replace(/-/g, '').slice(-6).toUpperCase();
                } else {
                    formattedTxId = 'TX-#' + rawId.padStart(5, '0');
                }
            }

            card.innerHTML = `
                <div class="p-2.5 sm:p-3 border-b-2 border-black ${isPostReported ? 'bg-red-100' : 'bg-gray-100'} flex items-center justify-between gap-1.5 w-full flex-wrap">
                    <div class="flex items-center gap-2 min-w-0 flex-1">
                        <span class="bg-black text-amber-300 font-mono font-black text-[10px] px-1.5 py-0.5 rounded border border-gray-700 shrink-0">${formattedTxId}</span>
                        ${isPostReported ? `<span class="bg-red-700 text-white font-black text-[9px] px-1.5 py-0.5 rounded uppercase shrink-0">⚠️ FLAGGED</span>` : ''}
                        <i data-lucide="user" class="w-4 h-4 text-gray-700 shrink-0"></i>
                        <span class="font-black text-black uppercase tracking-wider text-xs sm:text-sm truncate max-w-[90px] sm:max-w-[180px]">${post.author || 'ANONYMOUS'}</span>
                        <span class="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase truncate shrink-0">${timeStr}</span>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0 flex-wrap">
                        ${catBadge}
                        ${(isMasterAdmin && isPostReported) ? `
                        <button onclick="window.masterRestorePost('${post.id}')" style="background-color: #047857 !important; color: #ffffff !important; border: 2px solid #064e3b !important;" class="font-black text-[10px] px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer shadow uppercase hover:brightness-125 transition-all" title="Master Admin: Restore Post">
                            <i data-lucide="check-circle" class="w-3.5 h-3.5 text-white pointer-events-none"></i> <span>RESTORE</span>
                        </button>
                        ` : ''}
                        ${isMasterAdmin ? `
                        <button onclick="window.masterDeletePost('${post.id}')" style="background-color: #dc2626 !important; color: #ffffff !important; border: 2px solid #7f1d1d !important;" class="font-black text-[10px] px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer shadow uppercase hover:brightness-125 transition-all" title="Master Commander: Delete Post">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5 text-white pointer-events-none"></i> <span>DELETE</span>
                        </button>
                        <button onclick="window.masterPurgeBanPost('${post.id}', '${(post.author || 'ANONYMOUS').replace(/'/g, "\\'")}')" style="background-color: #b91c1c !important; color: #ffffff !important; border: 2px solid #7f1d1d !important;" class="font-black text-[10px] px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer shadow uppercase hover:brightness-125 transition-all" title="Master Admin: Ban & Purge">
                            <i data-lucide="slash" class="w-3.5 h-3.5 text-white pointer-events-none"></i> <span>BAN</span>
                        </button>
                        ` : ''}
                        ${(isOwner && !isMasterAdmin) ? `
                        <button class="wire-delete-btn bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border border-red-800 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all shrink-0 cursor-pointer shadow-sm" data-id="${post.id}" data-pin="${postPin || ''}" title="Delete My Transmission" aria-label="Delete My Transmission">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5 text-white pointer-events-none"></i> <span>DELETE</span>
                        </button>
                        ` : ''}
                        <button class="wire-report-btn bg-slate-900 hover:bg-red-950 active:bg-red-900 text-red-400 border border-red-800/80 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all shrink-0 cursor-pointer shadow-sm" data-id="${post.id}" title="Report Inappropriate Content (UGC Policy)" aria-label="Report Inappropriate Content">
                            <i data-lucide="flag" class="w-3 h-3 text-red-400 pointer-events-none"></i> <span>REPORT</span>
                        </button>
                    </div>
                </div>

                <!-- MODERATION AUDIT BANNER (Visible on Flagged Transmissions) -->
                ${isPostReported ? `
                <div class="bg-red-950 border-b-2 border-red-700 p-2.5 sm:p-3 flex items-center justify-between gap-2 flex-wrap">
                    <div class="flex items-center gap-2 text-xs font-black text-red-200">
                        <i data-lucide="alert-triangle" class="w-4 h-4 text-red-400 shrink-0"></i>
                        <span>MODERATION AUDIT: <span class="text-red-300 font-normal">"${reportMeta ? reportMeta.reason : 'User Reported'}"</span></span>
                    </div>
                    <div class="text-[10px] font-mono font-bold text-red-400 bg-red-900/60 px-2 py-0.5 rounded border border-red-700/80">
                        REPORTED: ${reportMeta ? new Date(reportMeta.timestamp).toLocaleString() : 'PENDING REVIEW'}
                    </div>
                </div>
                ` : ''}

                <!-- SECTION 1: Trophy / Main Field Photo -->
                ${trophyPhotoUrl ? `
                <div class="w-full max-w-full max-h-[60vh] bg-black border-b-2 border-black relative overflow-hidden flex items-center justify-center">
                    <img src="${trophyPhotoUrl}" class="w-full max-w-full max-h-[60vh] object-contain block">
                </div>
                ` : ''}

                <div class="p-4 bg-white text-black max-w-full overflow-hidden">
                    <!-- SECTION 1 (Notes & Intel Text) -->
                    ${intelText ? `<p class="font-medium text-sm leading-relaxed mb-4 whitespace-pre-wrap break-words">${intelText}</p>` : ''}
                    
                    <!-- SECTION 2: Personal Business Card Photo -->
                    ${personalBizCardUrl ? `
                    <div class="my-3 border-2 border-purple-400 rounded-lg overflow-hidden bg-black p-2.5 shadow-md max-w-full">
                        <div class="text-[10px] font-black text-purple-300 uppercase tracking-widest mb-2 flex items-center gap-1.5 border-b border-purple-500/30 pb-1">
                            <i data-lucide="image" class="w-3.5 h-3.5 text-purple-400"></i> PERSONAL BUSINESS CARD PHOTO
                        </div>
                        <div class="w-full max-w-full max-h-56 flex justify-center items-center bg-black/60 rounded overflow-hidden">
                            <img src="${personalBizCardUrl}" class="max-w-full max-h-56 object-contain rounded border border-slate-800 block">
                        </div>
                    </div>
                    ` : ''}

                    <!-- SECTION 3: TRC Digital Business Card Form Box -->
                    ${hasTRCDigitalCard ? `
                    <div style="background-color: #0b0f19 !important; color: #ffffff !important; border: 2px solid #a855f7 !important; box-shadow: 0 0 25px rgba(168,85,247,0.4) !important;" class="mt-2 mb-4 rounded-xl p-4 relative overflow-hidden bg-[radial-gradient(#a855f7_0.8px,transparent_0.8px)] [background-size:8px_8px]">
                        <div style="border-bottom: 1px solid rgba(168,85,247,0.4);" class="pb-2 mb-3 flex flex-wrap justify-between items-center gap-2">
                            <span style="color: #c084fc;" class="font-black text-xs tracking-widest uppercase flex items-center gap-1.5 shrink-0">
                                <i data-lucide="contact" class="w-4 h-4 text-purple-400"></i> TACTICAL RANGE CARD OPERATOR
                            </span>
                            <div class="flex items-center gap-2 shrink-0">
                                ${isOwner ? `
                                <button style="background-color: #9333ea !important; color: #ffffff !important; border: 2px solid #000000 !important;" class="wire-rework-post-card-btn font-black text-[11px] px-3.5 py-1.5 rounded-lg uppercase tracking-wider hover:brightness-125 transition-all shadow-[0_0_12px_rgba(168,85,247,0.8)] flex items-center gap-1.5 cursor-pointer" title="Edit your business card">
                                    <i data-lucide="wrench" class="w-4 h-4 text-white"></i> EDIT CARD
                                </button>
                                ` : `
                                <button style="background-color: #0d9488 !important; color: #ffffff !important; border: 2px solid #000000 !important;" class="wire-save-contact-btn font-black text-[11px] px-3.5 py-1.5 rounded-lg uppercase tracking-wider hover:brightness-125 transition-all shadow-[0_0_12px_rgba(13,148,136,0.8)] flex items-center gap-1.5 cursor-pointer" title="Save this outfitter contact to your local Intel Vault">
                                    <i data-lucide="contact" class="w-4 h-4 text-white"></i> SAVE CONTACT
                                </button>
                                `}
                                <span style="background-color: #064e3b !important; color: #34d399 !important; border: 1px solid #10b981 !important;" class="font-mono text-[9px] px-2.5 py-1 rounded uppercase font-bold">
                                    VERIFIED CONTACT
                                </span>
                            </div>
                        </div>
                        <div class="flex items-start justify-between mb-3">
                            <div>
                                ${contactData.bizname ? `<div style="color: #e9d5ff;" class="text-base font-black uppercase tracking-wider mb-0.5">${contactData.bizname}</div>` : ''}
                                <div style="color: #ffffff;" class="text-sm font-black uppercase tracking-wider">${post.author || 'OPERATOR'}</div>
                                ${contactData.unit ? `<div style="color: #9ca3af;" class="text-xs font-semibold uppercase mt-0.5">${contactData.unit}</div>` : ''}
                            </div>
                            <i data-lucide="shield-check" class="w-7 h-7 text-purple-400 shrink-0"></i>
                        </div>
                        <div style="border-top: 1px solid rgba(255,255,255,0.1);" class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono pt-3 text-gray-200">
                            <div><span style="color: #9ca3af;" class="font-bold">PHONE:</span> <span style="color: #ffffff;" class="font-bold">${contactData.phone || '--'}</span></div>
                            <div><span style="color: #9ca3af;" class="font-bold">COMMS:</span> <span style="color: #34d399;" class="font-bold">${contactData.comms || '--'}</span></div>
                            <div><span style="color: #9ca3af;" class="font-bold">WEB:</span> <a href="${contactData.web && contactData.web.startsWith('http') ? contactData.web : 'https://' + (contactData.web || '#')}" target="_blank" style="color: #60a5fa;" class="font-bold underline">${contactData.web || '--'}</a></div>
                        </div>
                        ${(contactData.facebook || contactData.twitter || contactData.youtube) ? `
                        <div style="border-top: 1px solid rgba(255,255,255,0.1);" class="flex gap-4 pt-3 mt-2 text-xs">
                            ${contactData.facebook ? `<a href="${contactData.facebook.startsWith('http') ? contactData.facebook : 'https://' + contactData.facebook}" target="_blank" class="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-bold"><i data-lucide="facebook" class="w-3.5 h-3.5"></i> FB</a>` : ''}
                            ${contactData.twitter ? `<a href="${contactData.twitter.startsWith('http') ? contactData.twitter : 'https://' + contactData.twitter}" target="_blank" class="flex items-center gap-1 text-slate-300 hover:text-white font-bold"><i data-lucide="twitter" class="w-3.5 h-3.5"></i> X (TWITTER)</a>` : ''}
                            ${contactData.youtube ? `<a href="${contactData.youtube.startsWith('http') ? contactData.youtube : 'https://' + contactData.youtube}" target="_blank" class="flex items-center gap-1 text-red-500 hover:text-red-400 font-bold"><i data-lucide="youtube" class="w-3.5 h-3.5"></i> YT</a>` : ''}
                        </div>
                        ` : ''}
                        ${contactData.details ? `<div style="color: #d8b4fe; border-top: 1px solid rgba(255,255,255,0.1);" class="mt-2 text-xs italic pt-2">Specialties: "${contactData.details}"</div>` : ''}
                        ${contactData.shootingRanges ? `
                        <div style="color: #fda4af; border-top: 1px solid rgba(255,255,255,0.1);" class="mt-2 text-xs pt-2 font-mono flex items-center gap-1.5">
                            <span style="color: #fb7185;">🎯</span> <b>MATCHES / RANGES:</b> ${contactData.shootingRanges}
                        </div>` : ''}
                        ${(contactData && (contactData.gps || (extractedLat !== null && !isNaN(extractedLat) && extractedLon !== null && !isNaN(extractedLon)))) ? `
                        <div style="border-top: 1px solid rgba(255,255,255,0.1);" class="mt-2 text-xs font-mono pt-2 flex flex-wrap items-center justify-between gap-1 text-amber-300">
                            <span class="flex items-center gap-1.5"><i data-lucide="map-pin" class="w-3.5 h-3.5 text-amber-400"></i> RANCH GPS: <b class="text-amber-200">${contactData.gps || ((extractedLat !== null && extractedLon !== null) ? (extractedLat.toFixed(5) + ', ' + extractedLon.toFixed(5)) : '--')}</b></span>
                            <span style="background-color: #78350f !important; color: #fde68a !important; border: 1px solid #d97706 !important;" class="text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                                🛰️ SATELLITE PLOTTED
                            </span>
                        </div>
                        ` : ''}
                    </div>
                    ` : ''}

                    <div class="flex flex-wrap gap-2 border-t-2 border-gray-200 pt-3">
                        <button class="wire-verify-btn flex-1 bg-blue-100 text-blue-700 font-bold text-xs py-2 border-2 border-blue-700 rounded flex items-center justify-center gap-1.5 hover:bg-blue-200 transition-colors uppercase" data-id="${post.id}" data-votes="${upvotes}">
                            <i data-lucide="shield-check" class="w-4 h-4"></i> VERIFY (${upvotes})
                        </button>
                        
                        <button class="wire-save-vault-btn flex-1 bg-purple-100 text-purple-800 font-bold text-xs py-2 border-2 border-purple-700 rounded flex items-center justify-center gap-1.5 hover:bg-purple-200 transition-colors uppercase" data-id="${post.id}">
                            <i data-lucide="folder-plus" class="w-4 h-4 text-purple-700"></i> INTEL VAULT
                        </button>

                        ${(extractedLat !== null && !isNaN(extractedLat) && extractedLon !== null && !isNaN(extractedLon)) ? `
                        <button class="wire-investigate-btn flex-1 ${(rawCat.includes('GUIDED') || rawCat.includes('LODGING')) ? 'bg-amber-400 hover:bg-amber-300 text-black border-2 border-black shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'bg-green-100 hover:bg-green-200 text-green-800 border-2 border-green-700'} font-black text-xs py-2 px-3 rounded flex items-center justify-center gap-1.5 transition-all uppercase cursor-pointer" data-lat="${extractedLat}" data-lon="${extractedLon}" title="Survey Ranch Terrain on Satellite Map">
                            <i data-lucide="${(rawCat.includes('GUIDED') || rawCat.includes('LODGING')) ? 'satellite' : 'crosshair'}" class="w-4 h-4 text-black"></i> ${(rawCat.includes('GUIDED') || rawCat.includes('LODGING')) ? '🛰️ SURVEY RANCH ON MAP' : '🛰️ SURVEY TERRAIN'}
                        </button>
                        ` : ''}
                    </div>
                </div>
            `;

            // Attach Save to Vault handler
            const saveBtn = card.querySelector('.wire-save-vault-btn');
            if (saveBtn) {
                saveBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    saveBtn.disabled = true;
                    saveBtn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin text-purple-700"></i> SAVING...`;
                    if (window.lucide) window.lucide.createIcons();

                    const vaultEntry = {
                        id: 'wire_' + post.id,
                        name: (post.author || 'WIRE INTEL') + ' - ' + (post.category || 'INTEL'),
                        type: 'intel_report',
                        timestamp: Date.now(),
                        date: new Date().toLocaleDateString(),
                        author: post.author || 'ANONYMOUS',
                        category: post.category || 'GENERAL',
                        content: intelText,
                        image: post.image_url || post.imageUrl || post.cardImageUrl || (contactData ? contactData.cardImageUrl : null) || null,
                        contact: contactData,
                        targetLat: extractedLat,
                        targetLon: extractedLon
                    };

                    try {
                        if (!window.vaultCache) window.vaultCache = [];
                        window.vaultCache = window.vaultCache.filter(v => v && v.id && v.id.toString() !== vaultEntry.id.toString() && !(v.content && vaultEntry.content && v.content === vaultEntry.content && v.author === vaultEntry.author));
                        window.vaultCache.unshift(vaultEntry);

                        if (window.TRC_IDB) {
                            await window.TRC_IDB.set('intelVault', vaultEntry.id.toString(), vaultEntry);
                        }

                        if (typeof window.refreshVaultGrid === 'function') window.refreshVaultGrid();

                        saveBtn.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4 text-purple-900"></i> VAULT SAVED`;
                        saveBtn.classList.replace('bg-purple-100', 'bg-purple-300');
                    } catch(err) {
                        console.error("Vault save error:", err);
                        alert("Failed to save to Intel Vault.");
                        saveBtn.disabled = false;
                        saveBtn.innerHTML = `<i data-lucide="folder-plus" class="w-4 h-4"></i> INTEL VAULT`;
                    }
                    if (window.lucide) window.lucide.createIcons();
                });
            }

            // Attach Save Contact handler (For Customers)
            const saveContactBtn = card.querySelector('.wire-save-contact-btn');
            if (saveContactBtn) {
                saveContactBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    saveContactBtn.disabled = true;
                    saveContactBtn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin text-teal-700"></i> SAVING...`;
                    if (window.lucide) window.lucide.createIcons();

                    const contactEntry = {
                        id: 'contact_' + post.id,
                        name: (contactData.bizname || post.author || 'OUTFITTER') + ' [CONTACT]',
                        type: 'intel_report',
                        timestamp: Date.now(),
                        date: new Date().toLocaleDateString(),
                        author: post.author || 'OPERATOR',
                        category: 'CONTACTS',
                        content: intelText || `Verified Outfitter Contact: ${contactData.bizname || post.author}`,
                        image: personalBizCardUrl || trophyPhotoUrl || null,
                        contact: contactData,
                        targetLat: extractedLat,
                        targetLon: extractedLon
                    };

                    try {
                        if (!window.vaultCache) window.vaultCache = [];
                        window.vaultCache = window.vaultCache.filter(v => v && v.id && v.id.toString() !== contactEntry.id.toString());
                        window.vaultCache.unshift(contactEntry);

                        if (window.TRC_IDB) {
                            await window.TRC_IDB.set('intelVault', contactEntry.id.toString(), contactEntry);
                        }
                        if (typeof window.refreshVaultGrid === 'function') window.refreshVaultGrid();
                        alert(`✅ ${contactData.bizname || post.author || 'Outfitter'} contact successfully saved to your offline Intel Vault!`);
                        saveContactBtn.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4 text-emerald-300"></i> SAVED`;
                    } catch(err) {
                        console.error("Save Contact Error:", err);
                        alert("Failed to save contact: " + err.message);
                        saveContactBtn.innerHTML = `<i data-lucide="contact" class="w-4 h-4 text-white"></i> SAVE CONTACT`;
                    } finally {
                        setTimeout(() => {
                            saveContactBtn.disabled = false;
                            saveContactBtn.innerHTML = `<i data-lucide="contact" class="w-4 h-4 text-white"></i> SAVE CONTACT`;
                            if (window.lucide) window.lucide.createIcons();
                        }, 2500);
                    }
                });
            }

            // Attach Rework / Edit Card handler (For Post Owner)
            const reworkPostCardBtn = card.querySelector('.wire-rework-post-card-btn');
            if (reworkPostCardBtn) {
                reworkPostCardBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.reworkBusinessCard({
                        author: post.author,
                        contact: contactData,
                        content: intelText
                    });
                });
            }

            // Attach Delete handler (For Post Owner with PIN protection)
            const deleteBtn = card.querySelector('.wire-delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const postId = deleteBtn.getAttribute('data-id');
                    const requiredPin = (deleteBtn.getAttribute('data-pin') || '').trim();
                    const localSavedPin = (localStorage.getItem('trc_operator_pin') || '').trim();

                    // PIN Verification check if post has a PIN and local PIN doesn't match
                    if (requiredPin && requiredPin !== '' && requiredPin !== localSavedPin) {
                        const enteredPin = prompt("Enter your 4-Digit Creator PIN to delete this transmission:");
                        if (enteredPin === null) return;
                        if (enteredPin.trim() !== requiredPin) {
                            alert("⛔ ACCESS DENIED: Incorrect Creator Security PIN.");
                            return;
                        }
                    } else {
                        if (!confirm("Are you sure you want to permanently delete this transmission?")) return;
                    }

                    deleteBtn.disabled = true;
                    deleteBtn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin text-red-600"></i>`;
                    if (window.lucide) window.lucide.createIcons();

                    try {
                        const { error } = await client
                            .from('global_wire')
                            .delete()
                            .eq('id', postId);

                        if (error) throw error;

                        try {
                            let myPosts = JSON.parse(localStorage.getItem('my_created_post_ids') || '[]');
                            myPosts = myPosts.filter(id => id.toString() !== postId.toString());
                            localStorage.setItem('my_created_post_ids', JSON.stringify(myPosts));
                        } catch(pe) {}

                        card.remove();
                    } catch (err) {
                        console.error("Delete post error:", err);
                        alert("Failed to delete post: " + err.message);
                        deleteBtn.disabled = false;
                        deleteBtn.innerHTML = `<i data-lucide="trash-2" class="w-4 h-4 text-white pointer-events-none"></i>`;
                        if (window.lucide) window.lucide.createIcons();
                    }
                });
            }

            // Attach Report / Flag handler (For UGC Safety & Google Play Compliance)
            const reportBtn = card.querySelector('.wire-report-btn');
            if (reportBtn) {
                reportBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const postId = reportBtn.getAttribute('data-id');
                    if (!postId) return;
                    const reason = prompt("Tactical Range Card UGC Moderation:\nPlease specify the reason for reporting this transmission (e.g. Inappropriate Content, Spam, Harassment, Violation):");
                    if (reason && reason.trim()) {
                        const postIdStr = postId.toString();
                        const reported = JSON.parse(localStorage.getItem('trc_reported_posts') || '[]');
                        if (!reported.includes(postIdStr)) reported.push(postIdStr);
                        localStorage.setItem('trc_reported_posts', JSON.stringify(reported));

                        const reportLog = JSON.parse(localStorage.getItem('trc_reported_posts_log') || '{}');
                        reportLog[postIdStr] = {
                            reason: reason.trim(),
                            timestamp: new Date().toISOString(),
                            reportedBy: localStorage.getItem('my_tactical_callsign') || 'ANONYMOUS'
                        };
                        localStorage.setItem('trc_reported_posts_log', JSON.stringify(reportLog));

                        try {
                            const client = window.getSupabaseClient();
                            if (client) {
                                const { error: updateErr } = await client.from('global_wire').update({ status: 'flagged' }).eq('id', postId);
                                if (updateErr) console.warn("Supabase update post error:", updateErr);

                                const { error: insertErr } = await client.from('global_wire_reports').insert([{
                                    post_id: postId,
                                    reporter_callsign: localStorage.getItem('my_tactical_callsign') || 'ANONYMOUS',
                                    reason: reason.trim()
                                }]);
                                if (insertErr) console.warn("Supabase insert report error:", insertErr);
                            }
                        } catch(se) {
                            console.error("Supabase report log error:", se);
                        }

                        alert(`✅ Report filed: "${reason.trim()}".\nThis transmission has been flagged for review.`);
                        fetchWirePosts();
                    }
                });
            }

            feedContainer.appendChild(card);
        });
        
        // Attach click handlers to dynamically created VERIFY buttons
        document.querySelectorAll('.wire-verify-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                if (btn.disabled) return;
                btn.disabled = true;
                
                const postId = btn.getAttribute('data-id');
                const currentVotes = parseInt(btn.getAttribute('data-votes')) || 0;
                const newVotes = currentVotes + 1;
                
                btn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin text-blue-700"></i> VERIFYING...`;
                if (window.lucide) window.lucide.createIcons();
                
                try {
                    const { error } = await client
                        .from('global_wire')
                        .update({ upvotes: newVotes })
                        .eq('id', postId);
                        
                    if (error) throw error;
                    
                    btn.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4 text-green-700"></i> VERIFIED (${newVotes})`;
                    btn.classList.replace('bg-blue-100', 'bg-green-100');
                    btn.classList.replace('text-blue-700', 'text-green-800');
                    btn.classList.replace('border-blue-700', 'border-green-700');
                    btn.setAttribute('data-votes', newVotes);
                    if (window.lucide) window.lucide.createIcons();
                } catch (err) {
                    console.error("Failed to verify intel:", err);
                    btn.disabled = false;
                    btn.innerHTML = `<i data-lucide="shield-check" class="w-4 h-4"></i> VERIFY (${currentVotes})`;
                    if (window.lucide) window.lucide.createIcons();
                }
            });
        });

        // Attach click handlers to dynamically created INVESTIGATE buttons
        document.querySelectorAll('.wire-investigate-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const lat = parseFloat(btn.getAttribute('data-lat'));
                const lon = parseFloat(btn.getAttribute('data-lon'));
                if (!isNaN(lat) && !isNaN(lon) && typeof window.investigateWireCoords === 'function') {
                    window.investigateWireCoords(lat, lon, btn);
                }
            });
        });

        if (window.lucide) window.lucide.createIcons();

        // Check if a jump to a specific post was requested
        if (window.targetPostIdToScroll) {
            const targetId = window.targetPostIdToScroll;
            window.targetPostIdToScroll = null;
            setTimeout(() => {
                const targetCard = document.getElementById(`wire-post-${targetId}`) || document.querySelector(`[data-post-id="${targetId}"]`);
                if (targetCard) {
                    const scrollParent = targetCard.closest('.overflow-y-auto') || targetCard.parentElement;
                    if (scrollParent) {
                        const parentRect = scrollParent.getBoundingClientRect();
                        const cardRect = targetCard.getBoundingClientRect();
                        const relativeTop = cardRect.top - parentRect.top;
                        scrollParent.scrollTo({
                            top: Math.max(0, scrollParent.scrollTop + relativeTop - 30),
                            behavior: 'smooth'
                        });
                    } else {
                        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    targetCard.classList.add('ring-8', 'ring-amber-400', 'scale-[1.02]', 'shadow-[0_0_40px_rgba(251,191,36,0.9)]');
                    setTimeout(() => {
                        targetCard.classList.remove('ring-8', 'ring-amber-400', 'scale-[1.02]', 'shadow-[0_0_40px_rgba(251,191,36,0.9)]');
                    }, 3500);
                }
            }, 200);
        }

    } catch (error) {
        console.error("Supabase Fetch Error:", error);
        feedContainer.innerHTML = `<div class="text-black bg-red-200 p-4 font-bold border-2 border-red-700 w-full max-w-2xl text-center mx-auto">
            ERROR FETCHING INTEL: ${error.message}
        </div>`;
    }
}

window.fetchWirePosts = fetchWirePosts;
window.fetchGlobalWirePosts = fetchWirePosts;

// =========================================================================
// 3D OPEN BOOK BLOG FLIPBOOK LOGIC
// =========================================================================
let currentBlogBookIndex = 0;

window.updateBlogBookDisplay = function() {
    const posts = window.fetchedWirePosts || [];
    const spreadEl = document.getElementById('blogBookSpread');
    const badgeEl = document.getElementById('blogBookPageBadge');
    const categoryEl = document.getElementById('blogBookCategory');
    const thumbEl = document.getElementById('blogBookThumb');
    const titleEl = document.getElementById('blogBookTitle');
    const authorDateEl = document.getElementById('blogBookAuthorDate');
    const snippetEl = document.getElementById('blogBookSnippet');

    if (!spreadEl) return;

    if (!posts || posts.length === 0) {
        if (badgeEl) badgeEl.textContent = 'PAGE 1 / 1';
        if (categoryEl) {
            categoryEl.textContent = 'TACTICAL WIRE';
            categoryEl.className = 'text-[8px] font-black text-amber-400 uppercase tracking-wider truncate';
        }
        if (thumbEl) thumbEl.innerHTML = `<i data-lucide="book-open" class="w-8 h-8 text-amber-400/80"></i>`;
        if (titleEl) titleEl.textContent = 'GLOBAL INTEL WIRE';
        if (authorDateEl) authorDateEl.textContent = 'TRC SYSTEM • READY';
        if (snippetEl) snippetEl.textContent = 'Tap to open full satellite wire transmissions and publish intel...';
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    if (currentBlogBookIndex >= posts.length) currentBlogBookIndex = 0;
    if (currentBlogBookIndex < 0) currentBlogBookIndex = posts.length - 1;

    const post = posts[currentBlogBookIndex];
    const total = posts.length;

    if (badgeEl) badgeEl.textContent = `PAGE ${currentBlogBookIndex + 1} / ${total}`;
    
    // Category styling
    const cat = (post.category || post.type || 'INTEL').toString();
    if (categoryEl) {
        categoryEl.textContent = cat.toUpperCase();
        if (cat.toUpperCase().includes('HOTSPOT')) categoryEl.className = 'text-[8px] font-black text-orange-400 uppercase tracking-wider truncate';
        else if (cat.toUpperCase().includes('WARNING')) categoryEl.className = 'text-[8px] font-black text-red-400 uppercase tracking-wider truncate';
        else if (cat.toUpperCase().includes('TROPHY')) categoryEl.className = 'text-[8px] font-black text-emerald-400 uppercase tracking-wider truncate';
        else if (cat.toUpperCase().includes('CONTACT')) categoryEl.className = 'text-[8px] font-black text-purple-400 uppercase tracking-wider truncate';
        else if (cat.toUpperCase().includes('MATCH') || cat.toUpperCase().includes('RANGE')) categoryEl.className = 'text-[8px] font-black text-rose-400 uppercase tracking-wider truncate';
        else categoryEl.className = 'text-[8px] font-black text-blue-400 uppercase tracking-wider truncate';
    }

    // Unpack content JSON & media
    let contactData = null;
    let textContent = post.content || '';

    if (post.content && typeof post.content === 'string' && post.content.startsWith('{')) {
        try {
            const parsed = JSON.parse(post.content);
            if (parsed.intelText !== undefined) textContent = parsed.intelText;
            if (parsed.contact) contactData = parsed.contact;
        } catch (e) {}
    }

    const trophyPhoto = post.image_url || post.imageUrl || post.image || post.data || null;
    const personalBizCardPhoto = (contactData && contactData.cardImageUrl) ? contactData.cardImageUrl : null;
    const hasTRCDigitalCard = contactData && (contactData.bizname || contactData.unit || contactData.phone || contactData.comms || contactData.web || contactData.details);

    // Left page thumbnail prioritizes Trophy/Field photo, then Personal Biz Card photo
    const mainThumb = trophyPhoto || personalBizCardPhoto;

    if (thumbEl) {
        if (mainThumb) {
            thumbEl.innerHTML = `<img src="${mainThumb}" class="w-full h-full object-cover rounded border border-slate-700">`;
        } else {
            thumbEl.innerHTML = `<i data-lucide="book-open" class="w-8 h-8 text-amber-400/80"></i>`;
        }
    }

    if (titleEl) {
        titleEl.textContent = post.name || (contactData && contactData.bizname ? contactData.bizname : null) || post.author || 'INTEL REPORT';
    }

    if (authorDateEl) {
        const dateStr = post.created_at ? new Date(post.created_at).toLocaleDateString() : (post.date || 'RECENT');
        authorDateEl.textContent = `${post.author || 'OPERATOR'} • ${dateStr}`;
    }

    if (snippetEl) {
        let attachmentBadges = [];
        if (trophyPhoto) attachmentBadges.push('🏆 PHOTO');
        if (personalBizCardPhoto) attachmentBadges.push('🎴 BIZ CARD');
        if (hasTRCDigitalCard) attachmentBadges.push('🪪 TRC CARD');

        const badgePrefix = attachmentBadges.length > 0 ? `[${attachmentBadges.join(' • ')}]\n` : '';
        snippetEl.textContent = badgePrefix + (textContent || 'Tap to view full transmission details in Intel Wire...');
    }

    if (window.lucide) window.lucide.createIcons();
};

window.nextBlogBookPage = function() {
    const posts = window.fetchedWirePosts || [];
    if (posts.length === 0) return;
    
    const spreadEl = document.getElementById('blogBookSpread');
    if (spreadEl) {
        spreadEl.style.transition = 'transform 0.25s ease-in-out, opacity 0.25s ease';
        spreadEl.style.transform = 'rotateY(-18deg) scale(0.96)';
        spreadEl.style.opacity = '0.7';
        setTimeout(() => {
            currentBlogBookIndex++;
            window.updateBlogBookDisplay();
            spreadEl.style.transform = 'rotateY(0deg) scale(1)';
            spreadEl.style.opacity = '1';
        }, 130);
    } else {
        currentBlogBookIndex++;
        window.updateBlogBookDisplay();
    }
};

window.prevBlogBookPage = function() {
    const posts = window.fetchedWirePosts || [];
    if (posts.length === 0) return;
    
    const spreadEl = document.getElementById('blogBookSpread');
    if (spreadEl) {
        spreadEl.style.transition = 'transform 0.25s ease-in-out, opacity 0.25s ease';
        spreadEl.style.transform = 'rotateY(18deg) scale(0.96)';
        spreadEl.style.opacity = '0.7';
        setTimeout(() => {
            currentBlogBookIndex--;
            window.updateBlogBookDisplay();
            spreadEl.style.transform = 'rotateY(0deg) scale(1)';
            spreadEl.style.opacity = '1';
        }, 130);
    } else {
        currentBlogBookIndex--;
        window.updateBlogBookDisplay();
    }
};

window.openBlogWireToActivePost = async function() {
    const posts = window.fetchedWirePosts || [];
    if (!posts || posts.length === 0) {
        const panel = document.getElementById('panel-global-wire');
        if (panel) panel.classList.remove('hidden');
        if (window.fetchWirePosts) await window.fetchWirePosts();
        return;
    }

    if (currentBlogBookIndex >= posts.length) currentBlogBookIndex = 0;
    if (currentBlogBookIndex < 0) currentBlogBookIndex = 0;

    const activePost = posts[currentBlogBookIndex];
    if (!activePost) return;

    // Store target post ID for automatic scrolling right after render
    window.targetPostIdToScroll = activePost.id;

    // Reset category filter if active filter would hide our target post
    if (typeof currentWireCategoryFilter !== 'undefined' && currentWireCategoryFilter !== 'ALL') {
        currentWireCategoryFilter = 'ALL';
        if (typeof highlightActiveFilterButton === 'function') highlightActiveFilterButton('ALL POSTS');
    }

    const panel = document.getElementById('panel-global-wire');
    if (panel) panel.classList.remove('hidden');

    if (window.fetchWirePosts) {
        await window.fetchWirePosts();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof window.updateBlogBookDisplay === 'function') {
            window.updateBlogBookDisplay();
        }
    }, 500);
});

// ==========================================
// LIVE COMM-LINK (GLOBAL CHAT) LOGIC
// ==========================================
let commLinkSubscription = null;

window.toggleCommLink = function() {
    const sidebar = document.getElementById('comm-link-sidebar');
    if (!sidebar) return;
    
    const isOpen = sidebar.style.transform === 'translateX(0px)';
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : window.supabaseClient;
    
    if (!isOpen) {
        sidebar.classList.remove('translate-x-full');
        sidebar.style.transform = 'translateX(0)';
        
        const authorInput = document.getElementById('comm-link-author');
        if (authorInput && !authorInput.value) {
            authorInput.value = (localStorage.getItem('my_tactical_callsign') || '').substring(0, 20);
        }
        
        window.fetchCommLinkFeed();
        if (client && !commLinkSubscription) {
            commLinkSubscription = client
                .channel('global_wire_chat')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'global_wire', filter: 'category=eq.COMM_CHAT' }, payload => {
                    window.fetchCommLinkFeed();
                })
                .subscribe();
        }
    } else {
        sidebar.classList.add('translate-x-full');
        sidebar.style.transform = 'translateX(100%)';
        if (commLinkSubscription) {
            if (client) client.removeChannel(commLinkSubscription);
            commLinkSubscription = null;
        }
    }
};

window.fetchCommLinkFeed = async function() {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : window.supabaseClient;
    if (!client) return;
    const feed = document.getElementById('comm-link-feed');
    if(!feed) return;
    
    feed.innerHTML = '<div class="text-center text-purple-400 text-xs animate-pulse font-mono py-4">RECEIVING...</div>';
    
    try {
        const { data, error } = await client
            .from('global_wire')
            .select('*')
            .eq('category', 'COMM_CHAT')
            .order('created_at', { ascending: false })
            .limit(100);
            
        if (error) throw error;
        
        feed.innerHTML = '';
        if (!data || data.length === 0) {
            feed.innerHTML = '<div class="text-slate-400 text-xs text-center font-mono py-4">NO TRAFFIC ON THIS FREQUENCY.</div>';
            return;
        }
        
        data.reverse().forEach(msg => {
            const date = new Date(msg.created_at);
            const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const msgEl = document.createElement('div');
            msgEl.className = 'bg-black/40 backdrop-blur-sm border-2 rounded p-2 text-xs font-mono shadow-md';
            msgEl.style.borderColor = 'rgba(var(--accent-rgb), 0.3)';
            msgEl.innerHTML = `
                <div class="flex justify-between items-start mb-1 border-b pb-1" style="border-color: rgba(var(--accent-rgb), 0.3);">
                    <span class="font-black uppercase text-ellipsis overflow-hidden whitespace-nowrap max-w-[180px]" style="color: var(--accent-color);">${(msg.author || 'UNKNOWN').substring(0, 20)}</span>
                    <span class="text-[9px] shrink-0" style="color: rgba(var(--accent-rgb), 0.7);">${timeStr}</span>
                </div>
                <div class="drop-shadow-md whitespace-pre-wrap break-words font-medium" style="color: rgba(255,255,255,0.9);">${msg.content}</div>
            `;
            feed.appendChild(msgEl);
        });
        
        feed.scrollTop = feed.scrollHeight;
        
    } catch (err) {
        console.error('Error fetching comm-link:', err);
        feed.innerHTML = '<div class="text-red-400 text-xs text-center font-mono py-4">CONNECTION LOST.</div>';
    }
};

window.submitCommLinkMessage = async function() {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : window.supabaseClient;
    if (!client) return;
    
    const authorInput = document.getElementById('comm-link-author');
    const msgInput = document.getElementById('comm-link-input');
    
    let author = (authorInput && authorInput.value ? authorInput.value.trim() : '') || localStorage.getItem('my_tactical_callsign') || 'OPERATOR';
    if (author.length > 20) author = author.substring(0, 20);

    let msg = msgInput ? msgInput.value.trim() : '';
    if (msg.length > 500) msg = msg.substring(0, 500);
    
    if (!msg) return;

    if (author && author !== 'OPERATOR') {
        try { localStorage.setItem('my_tactical_callsign', author); } catch(e) {}
    }
    
    msgInput.value = '';
    const charCountEl = document.getElementById('comm-link-char-count');
    if (charCountEl) charCountEl.textContent = '0/500';
    
    try {
        const { error } = await client
            .from('global_wire')
            .insert([
                {
                    author: author,
                    category: 'COMM_CHAT',
                    content: msg,
                    upvotes: 0
                }
            ]);
            
        if (error) throw error;
        window.fetchCommLinkFeed();
        
    } catch (err) {
        console.error('Error sending message:', err);
        alert('Failed to transmit message: ' + err.message);
        msgInput.value = msg;
        if (charCountEl) charCountEl.textContent = `${msg.length}/500`;
    }
};

window.clearCommLinkFeed = function() {
    const feed = document.getElementById('comm-link-feed');
    if (feed) {
        feed.innerHTML = '<div class="text-center text-slate-400 text-[10px] font-mono py-4">LOCAL FEED CLEARED.</div>';
    }
};

// Setup Live Character Counters for Comms Link
(function initCommLinkCounters() {
    function setupCounters() {
        const authorInput = document.getElementById('comm-link-author');
        const authorCount = document.getElementById('comm-link-author-count');
        const msgInput = document.getElementById('comm-link-input');
        const msgCount = document.getElementById('comm-link-char-count');

        if (authorInput && authorCount) {
            authorInput.addEventListener('input', () => {
                authorCount.textContent = `${authorInput.value.length}/20`;
            });
        }

        if (msgInput && msgCount) {
            msgInput.addEventListener('input', () => {
                msgCount.textContent = `${msgInput.value.length}/500`;
                if (msgInput.value.length >= 480) {
                    msgCount.classList.add('text-amber-400');
                } else {
                    msgCount.classList.remove('text-amber-400');
                }
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupCounters);
    } else {
        setupCounters();
    }
})();

// ==========================================
// MASTER ADMIN SECRETS & MODERATION PORTAL
// ==========================================
window.toggleMasterAdminPortal = function() {
    const isMaster = sessionStorage.getItem('trc_is_master_admin') === 'true';
    if (isMaster) {
        const choice = confirm("👑 MASTER COMMANDER SESSION ACTIVE\n\nClick OK to Logout of Master Admin Mode, or Cancel to remain logged in.");
        if (choice) {
            sessionStorage.removeItem('trc_is_master_admin');
            alert("Master Admin Mode Deactivated.");
            const badge = document.getElementById('master-admin-badge');
            if (badge) badge.innerText = "ADMIN";
            fetchWirePosts();
        }
        return;
    }

    const enteredPin = prompt("🔐 ENTER MASTER COMMANDER SECURITY PIN:");
    if (!enteredPin) return;

    const savedMasterPin = (localStorage.getItem('trc_master_admin_pin') || '8420').trim();
    if (enteredPin.trim() === savedMasterPin) {
        sessionStorage.setItem('trc_is_master_admin', 'true');
        alert("👑 ACCESS GRANTED: Welcome, Master Commander.\nUniversal Moderation & Enforcement Controls are now active.");
        const badge = document.getElementById('master-admin-badge');
        if (badge) badge.innerText = "COMMANDER";
        fetchWirePosts();
    } else {
        alert("⛔ ACCESS DENIED: Invalid Master Security PIN.");
    }
};

window.masterRestorePost = async function(postId) {
    const postIdStr = postId ? postId.toString() : '';
    if (!confirm(`Restore Transmission TX-#${postIdStr.slice(-6).toUpperCase()} to live public feed?`)) return;
    try {
        const client = window.getSupabaseClient();
        if (client) {
            await client.from('global_wire').update({ status: 'published', report_count: 0 }).eq('id', postId);
            await client.from('global_wire_reports').delete().eq('post_id', postId);
        }
        let reported = JSON.parse(localStorage.getItem('trc_reported_posts') || '[]');
        reported = reported.filter(id => id.toString() !== postIdStr);
        localStorage.setItem('trc_reported_posts', JSON.stringify(reported));

        let reportLog = JSON.parse(localStorage.getItem('trc_reported_posts_log') || '{}');
        delete reportLog[postIdStr];
        localStorage.setItem('trc_reported_posts_log', JSON.stringify(reportLog));

        alert(`✅ Transmission restored to active public feed and unmuted.`);
        fetchWirePosts();
    } catch(err) {
        console.error("Restore error:", err);
        alert("Restore failed: " + err.message);
    }
};

window.masterDeletePost = async function(postId) {
    const postIdStr = postId ? postId.toString() : '';
    if (!confirm(`👑 MASTER COMMANDER OVERRIDE:\nAre you sure you want to permanently delete Transmission TX-#${postIdStr.slice(-6).toUpperCase()} from the database?`)) return;
    try {
        const client = window.getSupabaseClient();
        if (client) {
            const { error } = await client.from('global_wire').delete().eq('id', postId);
            if (error) throw error;
            await client.from('global_wire_reports').delete().eq('post_id', postId);
        }
        let reported = JSON.parse(localStorage.getItem('trc_reported_posts') || '[]');
        reported = reported.filter(id => id.toString() !== postIdStr);
        localStorage.setItem('trc_reported_posts', JSON.stringify(reported));

        let reportLog = JSON.parse(localStorage.getItem('trc_reported_posts_log') || '{}');
        delete reportLog[postIdStr];
        localStorage.setItem('trc_reported_posts_log', JSON.stringify(reportLog));

        alert(`🗑️ Transmission TX-#${postIdStr.slice(-6).toUpperCase()} permanently deleted from network.`);
        fetchWirePosts();
    } catch(err) {
        console.error("Master delete error:", err);
        alert("Delete failed: " + err.message);
    }
};

window.masterPurgeBanPost = async function(postId, author) {
    if (!confirm(`🚫 PERMANENT PURGE & BAN:\nAre you sure you want to permanently ban author "${author}" and purge TX-#${String(postId).slice(-6).toUpperCase()}?`)) return;
    try {
        const client = window.getSupabaseClient();
        if (client) {
            await client.from('global_wire').update({ status: 'banned' }).eq('id', postId);
        }
        let bannedAuthors = JSON.parse(localStorage.getItem('trc_banned_authors') || '[]');
        if (author && !bannedAuthors.includes(author.toLowerCase())) {
            bannedAuthors.push(author.toLowerCase());
            localStorage.setItem('trc_banned_authors', JSON.stringify(bannedAuthors));
        }
        alert(`🚫 Author "${author}" blacklisted and transmission permanently banned from network.`);
        fetchWirePosts();
    } catch(err) {
        console.error("Ban error:", err);
        alert("Ban failed: " + err.message);
    }
};
