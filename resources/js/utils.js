// Reusable helpers: badges, toasts, alerts, formatting, custom dropdown factory.
// (extracted from resources/js/main.js — keep in sync with load order in app.html)

function getCodecBadgeHTML(codec) {
    if (!codec || codec === 'none') {
        return '<span class="badge codec-pro badge-codec-default">NONE</span>';
    }

    const vc = String(codec).toLowerCase();

    // Normalize codec name
    let normalizedCodec = String(codec).toUpperCase();
    if (normalizedCodec.length > 20) {
        normalizedCodec = normalizedCodec.substring(0, 17) + '...';
    }
    let colorClass = 'badge-codec-default';

    // AV1: av01 / av1
    if (
        vc.includes('av01') ||
        vc.includes('av1')
    ) {
        normalizedCodec = 'AV1';
        colorClass = 'badge-codec-av1';

        // HEVC: hevc / h265 / h.265 / hvc1 / hev1
    } else if (
        vc.includes('hevc') ||
        vc.includes('h265') ||
        vc.includes('h.265') ||
        vc.includes('hvc1') ||
        vc.includes('hev1')
    ) {
        normalizedCodec = 'HEVC';
        colorClass = 'badge-codec-hevc';

        // H.264: avc / h264 / h.264 / avc1
    } else if (
        vc.includes('avc') ||
        vc.includes('h264') ||
        vc.includes('h.264') ||
        vc.includes('avc1')
    ) {
        normalizedCodec = 'H.264';
        colorClass = 'badge-codec-avc';

        // VP9: vp9 / vp09
    } else if (
        vc.includes('vp9') ||
        vc.includes('vp09')
    ) {
        normalizedCodec = 'VP9';
        colorClass = 'badge-codec-vp9';

        // Audio codecs
    } else if (vc.includes('opus')) {
        normalizedCodec = 'OPUS';
        colorClass = 'badge-codec-opus';

    } else if (
        vc.includes('mp4a') ||
        vc.includes('aac')
    ) {
        normalizedCodec = 'AAC';
        colorClass = 'badge-codec-aac';
    }

    return `<span class="badge codec-pro ${colorClass}">${normalizedCodec}</span>`;
}


function showStatus(text, type = 'info') {
    if (!el || !el.statusMsg) return;
    el.statusMsg.textContent = text;
    el.statusMsg.style.color = 'var(--text-secondary)'; // Default

    if (type === 'success') el.statusMsg.style.color = 'var(--success)';
    else if (type === 'error') el.statusMsg.style.color = 'var(--danger)';
    else if (type === 'warning') el.statusMsg.style.color = 'var(--warning)';
}


function detectErrorFix(message) {
    if (!message) return null;
    const msg = String(message).toLowerCase();

    // ── 1. Cookies errors (HIGHEST PRIORITY – check first) ──
    if (msg.includes('cookies') || msg.includes('sign in') || msg.includes('login') || msg.includes('confirm your age') || msg.includes('age-restricted') || msg.includes('members only')) {
        return {
            type: 'cookies',
            btnText: '🔑 Fix: Configure Cookies',
            action: () => {
                if (el && el.settingsModal) el.settingsModal.classList.remove('hidden');
                const runtimeTabBtn = document.querySelector('[data-settings-tab="runtimes"]');
                if (runtimeTabBtn) runtimeTabBtn.click();

                const cookiesInput = document.getElementById('cookiesPath');
                const cookiesCard = cookiesInput ? cookiesInput.closest('.settings-card') : null;
                if (cookiesCard) {
                    cookiesCard.classList.add('glowing-fix-highlight');
                }

                // Remove highlight when cookies toggled/changed
                const useCookiesCheck = document.getElementById('useCookies');
                const removeHighlight = () => {
                    if ((useCookiesCheck && !useCookiesCheck.checked) || (cookiesInput && cookiesInput.value.trim() !== '')) {
                        if (cookiesCard) cookiesCard.classList.remove('glowing-fix-highlight');
                        if (useCookiesCheck) useCookiesCheck.removeEventListener('change', removeHighlight);
                        if (cookiesInput) cookiesInput.removeEventListener('input', removeHighlight);
                    }
                };
                if (useCookiesCheck) useCookiesCheck.addEventListener('change', removeHighlight);
                if (cookiesInput) cookiesInput.addEventListener('input', removeHighlight);
            }
        };
    }

    // ── 2. JS Runtime errors ──
    if (msg.includes('javascript runtime') || msg.includes('js-runtime') || msg.includes('nsig') || msg.includes('n-parameter') || msg.includes('signature-bypassing') || msg.includes('player javascript') || msg.includes('failed to extract signature')) {
        return {
            type: 'runtime',
            btnText: '🔧 Fix: Setup JS Runtime',
            action: () => {
                if (el && el.settingsModal) el.settingsModal.classList.remove('hidden');
                const runtimeTabBtn = document.querySelector('[data-settings-tab="runtimes"]');
                if (runtimeTabBtn) runtimeTabBtn.click();

                const selectEl = document.getElementById('jsRuntimeSelect');
                const checkCard = selectEl ? selectEl.closest('.settings-card') : null;
                if (checkCard) {
                    checkCard.classList.add('glowing-fix-highlight');
                }

                if (selectEl) {
                    const removeHighlight = () => {
                        if (selectEl.value !== 'none') {
                            if (checkCard) checkCard.classList.remove('glowing-fix-highlight');
                            selectEl.removeEventListener('change', removeHighlight);
                        }
                    };
                    selectEl.addEventListener('change', removeHighlight);
                }
            }
        };
    }

    // ── 3. Format/quality errors ──
    if (msg.includes('requested format') || msg.includes('not available') || msg.includes('format is not available')) {
        return {
            type: 'format',
            btnText: '🔧 Fix: Setup JS Runtime',
            action: () => {
                if (el && el.settingsModal) el.settingsModal.classList.remove('hidden');
                const runtimeTabBtn = document.querySelector('[data-settings-tab="runtimes"]');
                if (runtimeTabBtn) runtimeTabBtn.click();

                const selectEl = document.getElementById('jsRuntimeSelect');
                const runtimeCard = selectEl ? selectEl.closest('.settings-card') : null;
                if (runtimeCard) {
                    runtimeCard.classList.add('glowing-fix-highlight');
                }

                if (typeof resetSelection === 'function') resetSelection();
                if (typeof renderGrid === 'function') renderGrid();
                if (typeof updateCommand === 'function') updateCommand();

                if (selectEl) {
                    const removeHighlight = () => {
                        if (selectEl.value !== 'none') {
                            if (runtimeCard) runtimeCard.classList.remove('glowing-fix-highlight');
                            selectEl.removeEventListener('change', removeHighlight);
                        }
                    };
                    selectEl.addEventListener('change', removeHighlight);
                }
            }
        };
    }

    return null;
}


function showAlert(message, title = 'Notice') {
    if (!el || !el.alert || !el.alert.modal) return;
    if (el.alert.title) el.alert.title.textContent = title;
    if (el.alert.msg) el.alert.msg.textContent = message;

    const fixWrapper = document.getElementById('alertFixWrapper');
    const fixBtn = document.getElementById('alertFixBtn');

    const fix = detectErrorFix(message);
    if (fix && fixWrapper && fixBtn) {
        fixBtn.textContent = fix.btnText;
        fixBtn.onclick = () => {
            fix.action();
            el.alert.modal.classList.add('hidden');
        };
        fixWrapper.classList.remove('hidden');
    } else {
        if (fixWrapper) fixWrapper.classList.add('hidden');
    }

    el.alert.modal.classList.remove('hidden');
}

if (typeof el !== 'undefined' && el && el.alert && el.alert.closeBtn) {
    el.alert.closeBtn.addEventListener('click', () => {
        if (el.alert.modal) el.alert.modal.classList.add('hidden');
    });
}


// Helper to parse shortcut
function matchShortcut(e, shortcutStr) {
    if (!e || !shortcutStr) return false;
    let parts = shortcutStr.toLowerCase().split('+').map(p => p.trim());
    let reqCtrl = parts.includes('ctrl');
    let reqAlt = parts.includes('alt');
    let reqShift = parts.includes('shift');
    let reqMeta = parts.includes('meta') || parts.includes('win');
    let codePart = parts.find(p => p !== 'ctrl' && p !== 'alt' && p !== 'shift' && p !== 'meta' && p !== 'win');

    if (e.ctrlKey !== reqCtrl) return false;
    if (e.altKey !== reqAlt) return false;
    if (e.shiftKey !== reqShift) return false;
    if (e.metaKey !== reqMeta) return false;

    if (!codePart) return false;

    return e.code.toLowerCase() === codePart;
}


// Migrate older settings shortcuts (e.g. 'Ctrl+V' -> 'Ctrl+KeyV')
function migrateShortcut(s) {
    if (!s) return s;
    let parts = String(s).split('+').map(p => p.trim());
    let last = parts[parts.length - 1];
    if (last && last.length === 1) {
        if (/[a-zA-Z]/.test(last)) {
            parts[parts.length - 1] = 'Key' + last.toUpperCase();
        } else if (/[0-9]/.test(last)) {
            parts[parts.length - 1] = 'Digit' + last;
        }
    }
    return parts.join('+');
}

// Format shortcut string for display in UI (e.g. 'Ctrl+KeyV' -> 'Ctrl + V')
function formatShortcutForDisplay(shortcutStr) {
    if (!shortcutStr) return '';
    return String(shortcutStr)
        .replace(/Key([A-Z])/g, '$1')
        .replace(/Digit([0-9])/g, '$1')
        .replace(/\+/g, ' + ');
}


function createCustomSelect(options, selectedValue, onChange, placeholder = 'Select...') {
    const container = document.createElement('div');
    container.className = 'custom-select-container';

    const safeOptions = Array.isArray(options) ? options : [];
    const selectedOption = safeOptions.find(o => o.value === selectedValue) || safeOptions[0];

    container.innerHTML = `
        <button type="button" class="custom-select-trigger" aria-haspopup="listbox" aria-expanded="false">
            <span class="trigger-label">${selectedOption ? selectedOption.label : placeholder}</span>
            <svg class="trigger-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
        </button>
        <div class="custom-options custom-scrollbar" role="listbox">
            ${safeOptions.map(o => `
                <div class="custom-option ${o.value === selectedValue ? 'selected' : ''}" data-value="${o.value}" role="option" aria-selected="${o.value === selectedValue}">
                    <span class="option-text">${o.full !== undefined ? o.full : o.label}</span>
                    <svg class="check-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
            `).join('')}
        </div>
    `;

    const trigger = container.querySelector('.custom-select-trigger');
    const optionsMenu = container.querySelector('.custom-options');

    // Function to calculate smart popover position (flip up if near bottom edge)
    const updatePosition = () => {
        if (!container.classList.contains('active')) return;
        const rect = container.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;

        if (spaceBelow < 220 && spaceAbove > spaceBelow) {
            container.classList.add('pop-up');
        } else {
            container.classList.remove('pop-up');
        }
    };

    if (trigger) {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const wasActive = container.classList.contains('active');
            document.querySelectorAll('.custom-select-container.active').forEach(s => {
                if (s !== container) {
                    s.classList.remove('active');
                    const tr = s.querySelector('.custom-select-trigger');
                    if (tr) tr.setAttribute('aria-expanded', 'false');
                }
            });

            if (!wasActive) {
                container.classList.add('active');
                trigger.setAttribute('aria-expanded', 'true');
                updatePosition();
            } else {
                container.classList.remove('active');
                trigger.setAttribute('aria-expanded', 'false');
            }
        });
    }

    container.querySelectorAll('.custom-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            const value = opt.dataset.value;
            container.classList.remove('active');
            if (trigger) trigger.setAttribute('aria-expanded', 'false');
            if (value !== selectedValue && typeof onChange === 'function') {
                onChange(value);
            }
        });
    });

    return container;
}

// Global click to close selects
document.addEventListener('click', () => {
    document.querySelectorAll('.custom-select-container.active').forEach(s => s.classList.remove('active'));
});


// Helpers
function setLoading(isLoading) {
    if (!el || !el.loadingOverlay) return;
    if (isLoading) el.loadingOverlay.classList.remove('hidden');
    else el.loadingOverlay.classList.add('hidden');
}

function getTextDir(text) {
    if (!text) return 'ltr';
    return /[\u0600-\u06FF]/.test(text) ? 'rtl' : 'ltr';
}

function applySmartDir(element, text) {
    if (element) {
        element.setAttribute('dir', getTextDir(text));
    }
}

function resetSelection() {
    selectedVideoId = null;
    selectedAudioId = null;
    selectedSubtitles = [];
    currentData = null;
    formats = [];
    if (el && el.contentArea) el.contentArea.classList.add('hidden');
    if (el && el.gridBody) el.gridBody.innerHTML = '';
}

function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// ---------- Toast notifications + subtle click sound ----------
function playClickSound() {
    try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 740;
        gain.gain.setValueAtTime(0.07, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.09);
        osc.onended = () => { try { ctx.close(); } catch (e) { } };
    } catch (e) { }
}

function removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    clearTimeout(toast._timer);
    toast.classList.remove('show');
    setTimeout(() => { try { toast.remove(); } catch (e) { } }, 260);
}

function showToast(title, message, opts) {
    opts = opts || {};
    const container = document.getElementById('toastContainer');
    if (!container) return null;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML =
        '<div class="toast-icon">✓</div>' +
        '<div class="toast-body">' +
        '<div class="toast-title"></div>' +
        (message ? '<div class="toast-msg"></div>' : '') +
        '</div>' +
        (opts.actionLabel ? '<button class="toast-action"></button>' : '') +
        '<button class="toast-close" aria-label="Close">×</button>';
    toast.querySelector('.toast-title').textContent = title || '';
    if (message) toast.querySelector('.toast-msg').textContent = message;
    if (opts.actionLabel) {
        const ab = toast.querySelector('.toast-action');
        if (ab) {
            ab.textContent = opts.actionLabel;
            if (typeof opts.onAction === 'function') {
                ab.addEventListener('click', (e) => { e.stopPropagation(); try { opts.onAction(); } catch (err) { console.error(err); } });
            }
        }
    }
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => removeToast(toast));
    }
    container.appendChild(toast);
    requestAnimationFrame(() => { requestAnimationFrame(() => toast.classList.add('show')); });
    toast._timer = setTimeout(() => removeToast(toast), opts.duration || 5000);
    return toast;
}

function getDurationSeconds(obj) {
    if (!obj) return 0;
    let d = obj.duration;
    if (typeof d === 'number' && d > 0) return d;
    if (typeof d === 'string' && d.trim() !== '' && !isNaN(Number(d))) {
        const n = Number(d);
        if (n > 0) return n;
    }
    const ds = obj.duration_string || obj.durationString || obj.durationStr;
    if (typeof ds === 'string' && ds.trim()) {
        const parts = ds.trim().split(':').map(p => parseInt(p, 10));
        if (parts.length && parts.every(n => !isNaN(n))) {
            while (parts.length < 3) parts.unshift(0);
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
    }
    return 0;
}


// Robust size helpers to parse and format values returned by yt-dlp (which can be strings or numbers)
function formatSizeValue(val) {
    if (val === undefined || val === null || val === '') return '';
    if (typeof val === 'string') {
        const valClean = val.trim();
        if (/[a-zA-Z]+$/.test(valClean)) {
            return valClean;
        }
        const num = parseFloat(valClean);
        if (!isNaN(num)) {
            return formatBytes(num);
        }
        return valClean;
    }
    if (typeof val === 'number') {
        return formatBytes(val);
    }
    return String(val);
}

function getFormatDisplaySize(fmt) {
    if (!fmt) return '--';

    const possibleSize = fmt.filesize || fmt.filesize_approx || fmt.filesize_approximate || fmt.size || fmt.file_size;
    if (possibleSize !== undefined && possibleSize !== null && possibleSize !== '') {
        const sizeStr = formatSizeValue(possibleSize);
        const isApprox = !fmt.filesize && (fmt.filesize_approx || fmt.filesize_approximate);
        if (isApprox && sizeStr && !sizeStr.startsWith('~') && !sizeStr.startsWith('≈')) {
            return '~' + sizeStr;
        }
        return sizeStr;
    }

    const bitrate = fmt.tbr || fmt.vbr || fmt.abr || 0;
    const duration = (typeof currentData !== 'undefined' && currentData) ? getDurationSeconds(currentData) : 0;
    if (bitrate > 0 && duration > 0) {
        const estimatedBytes = ((bitrate * 1024) / 8) * duration;
        return '≈' + formatBytes(estimatedBytes);
    }

    return '--';
}

function parseSizeToBytes(val) {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    let str = String(val).replace(/[~≈\s]/g, '').trim().toLowerCase();
    const num = parseFloat(str);
    if (isNaN(num)) return 0;
    let multiplier = 1;
    if (str.endsWith('tib') || str.endsWith('tb')) multiplier = Math.pow(1024, 4);
    else if (str.endsWith('gib') || str.endsWith('gb')) multiplier = Math.pow(1024, 3);
    else if (str.endsWith('mib') || str.endsWith('mb')) multiplier = Math.pow(1024, 2);
    else if (str.endsWith('kib') || str.endsWith('kb') || str.endsWith('k')) multiplier = 1024;
    return num * multiplier;
}


function formatBytes(bytes, decimals = 1) {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'K', 'M', 'G', 'T'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Extract optimal small/medium thumbnail for UI cards & background (fast, lightweight, strictly 16:9 widescreen)
function getOptimalThumbnail(data, targetWidth = 320) {
    if (!data) return '';
    const thumbs = data.thumbnails;
    if (Array.isArray(thumbs) && thumbs.length > 0) {
        // 1. YouTube specific: mqdefault.jpg is explicitly 320x180 (16:9 widescreen, ~15KB tiny size, no black bars!)
        const mqThumb = thumbs.find(t => t.url && (t.url.includes('/mqdefault.jpg') || t.url.includes('/mqdefault.webp')));
        if (mqThumb && mqThumb.url) return mqThumb.url;

        // 2. Filter 16:9 widescreen thumbnails (~1.77 ratio) and pick the smallest one around 240px - 400px
        const sized = thumbs.filter(t => t && t.width && t.height && t.url);
        const widescreen = sized.filter(t => {
            const ratio = t.width / t.height;
            return ratio >= 1.7 && ratio <= 1.85;
        });

        if (widescreen.length > 0) {
            widescreen.sort((a, b) => a.width - b.width);
            // Pick smallest that is >= targetWidth, or the first/smallest available
            const match = widescreen.find(t => t.width >= targetWidth) || widescreen[0];
            if (match && match.url) return match.url;
        }

        // 3. Fallback: pick any sized thumbnail between 200px and 480px
        const medium = sized.filter(t => t.width >= 200 && t.width <= 480);
        if (medium.length > 0) {
            medium.sort((a, b) => a.width - b.width);
            return medium[0].url;
        }

        if (sized.length > 0) {
            sized.sort((a, b) => a.width - b.width);
            return sized[0].url; // Pick the smallest one available!
        }

        if (thumbs[0] && thumbs[0].url) return thumbs[0].url;
    }
    return data.thumbnail || '';
}

// Extract highest resolution thumbnail available for full-size inspection & download
function getHighestResThumbnail(data) {
    if (!data) return { url: '', width: 0, height: 0, label: 'Standard' };
    const thumbs = data.thumbnails;
    if (Array.isArray(thumbs) && thumbs.length > 0) {
        const sized = thumbs.filter(t => t && t.width && t.width > 0 && t.url);
        if (sized.length > 0) {
            sized.sort((a, b) => (b.width * (b.height || 1)) - (a.width * (a.height || 1)));
            const best = sized[0];
            const label = best.width >= 1920 ? '1080p FHD' : (best.width >= 1280 ? '720p HD' : `${best.width}p`);
            return { url: best.url, width: best.width, height: best.height, label };
        }

        // Prefer maxresdefault or sddefault
        const maxRes = thumbs.find(t => t.url && (t.url.includes('maxresdefault') || t.url.includes('sddefault')));
        if (maxRes && maxRes.url) {
            return { url: maxRes.url, width: 1280, height: 720, label: 'HD' };
        }

        const last = thumbs[thumbs.length - 1];
        if (last && last.url) {
            return { url: last.url, width: last.width || 0, height: last.height || 0, label: 'Max' };
        }
    }
    return { url: data.thumbnail || '', width: 0, height: 0, label: 'Standard' };
}
