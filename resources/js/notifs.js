// Download history (bell), badge and cross-tab BroadcastChannel sync.

const NOTIF_KEY = 'download-history';
let notifHistory = [];
let notifUnread = 0;

function loadNotifHistory() {
    try {
        const raw = localStorage.getItem(NOTIF_KEY);
        notifHistory = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(notifHistory)) notifHistory = [];
    } catch (e) { 
        notifHistory = []; 
    }
    notifUnread = 0;
    updateNotifBadge();
    renderNotifPanel();
}

function saveNotifHistory() {
    try { 
        if (Array.isArray(notifHistory)) {
            localStorage.setItem(NOTIF_KEY, JSON.stringify(notifHistory.slice(0, 30))); 
        }
    } catch (e) { }
}

function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatNotifTime(ts) {
    try {
        const d = new Date(ts);
        return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return ''; }
}

function updateNotifBadge() {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    if (notifUnread > 0) {
        badge.textContent = notifUnread > 9 ? '9+' : String(notifUnread);
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function renderNotifPanel() {
    const list = document.getElementById('notifList');
    if (!list) return;
    if (!Array.isArray(notifHistory) || !notifHistory.length) {
        list.innerHTML = '<div class="notif-empty">No downloads yet.</div>';
        return;
    }
    list.innerHTML = notifHistory.map((n, idx) => `
        <div class="notif-item" data-idx="${idx}">
            <div class="notif-item-icon">✓</div>
            <div class="notif-item-body">
                <div class="notif-item-title" title="${escapeHtml(n.title)}">${escapeHtml(n.title || 'Download')}</div>
                <div class="notif-item-time">${formatNotifTime(n.time)}</div>
            </div>
            <button class="notif-item-open" data-idx="${idx}">Open</button>
        </div>
    `).join('');
    list.querySelectorAll('.notif-item-open').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.idx, 10);
            const item = notifHistory[idx];
            const target = (item && item.path) ? item.path : (typeof settings !== 'undefined' && settings ? settings.downloadPath : null);
            if (typeof openFileLocation === 'function' && target) {
                openFileLocation(target);
            } else {
                const elOpen = document.getElementById('openFolderBtn');
                if (elOpen) elOpen.click();
            }
        });
    });
}

function addNotif(title, targetPath = null) {
    if (!Array.isArray(notifHistory)) notifHistory = [];
    const entry = { title: title || 'Download', time: Date.now(), path: targetPath };
    notifHistory.unshift(entry);
    if (notifHistory.length > 30) notifHistory = notifHistory.slice(0, 30);
    saveNotifHistory();
    notifUnread += 1;
    updateNotifBadge();
    renderNotifPanel();
    try { 
        if (window.__bc) window.__bc.postMessage({ type: 'notif', sender: window.__tabId, payload: entry }); 
    } catch (e) { }
}

function clearNotifHistory() {
    notifHistory = [];
    notifUnread = 0;
    saveNotifHistory();
    updateNotifBadge();
    renderNotifPanel();
}

function toggleNotifPanel() {
    const panel = document.getElementById('notifPanel');
    if (!panel) return;
    const willShow = panel.classList.contains('hidden');
    if (willShow) {
        panel.classList.remove('hidden');
        notifUnread = 0;
        updateNotifBadge();
    } else {
        panel.classList.add('hidden');
    }
}

// Wire up bell UI
const notifBtn = document.getElementById('notifBtn');
if (notifBtn) {
    notifBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleNotifPanel(); });
}

const notifClearBtn = document.getElementById('notifClearBtn');
if (notifClearBtn) {
    notifClearBtn.addEventListener('click', (e) => { e.stopPropagation(); clearNotifHistory(); });
}

document.addEventListener('click', (e) => {
    const panel = document.getElementById('notifPanel');
    const wrap = document.querySelector('.notif-wrap');
    if (panel && wrap && !wrap.contains(e.target)) {
        panel.classList.add('hidden');
    }
});

loadNotifHistory();

const toggleLogBtn = document.getElementById('toggleLogBtn');
if (toggleLogBtn) {
    toggleLogBtn.addEventListener('click', () => {
        const log = document.getElementById('progressLog');
        if (!log) return;
        log.classList.toggle('expanded');
        toggleLogBtn.textContent = log.classList.contains('expanded') ? 'Hide' : 'Details';
    });
}

// Cross-tab sync (settings + download history)
window.__tabId = 'tab_' + Math.random().toString(36).slice(2);
try {
    if (typeof BroadcastChannel !== 'undefined') {
        window.__bc = new BroadcastChannel('yt-dlp-gui');
        window.__bc.onmessage = (e) => {
            const msg = e.data;
            if (!msg || msg.sender === window.__tabId) return;
            if (msg.type === 'settings' && msg.payload) {
                if (typeof settings !== 'undefined') {
                    settings = msg.payload;
                }
                if (typeof syncSettingsUI === 'function') {
                    syncSettingsUI();
                }
                if (settings && settings.shortcuts && typeof migrateShortcut === 'function') {
                    settings.shortcuts.analyze = migrateShortcut(settings.shortcuts.analyze || 'Ctrl+KeyV');
                    settings.shortcuts.quickAudio = migrateShortcut(settings.shortcuts.quickAudio || 'Alt+Digit1');
                    settings.shortcuts.playlist = migrateShortcut(settings.shortcuts.playlist || 'Alt+Digit2');
                }
            }
            if (msg.type === 'notif' && msg.payload) {
                const n = msg.payload;
                if (!Array.isArray(notifHistory)) notifHistory = [];
                if (!notifHistory.some(x => x.time === n.time && x.title === n.title)) {
                    notifHistory.unshift(n);
                    if (notifHistory.length > 30) notifHistory = notifHistory.slice(0, 30);
                    saveNotifHistory();
                    notifUnread += 1;
                    updateNotifBadge();
                    renderNotifPanel();
                }
            }
        };
    }
} catch (e) { 
    window.__bc = null; 
}