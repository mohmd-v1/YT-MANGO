// Settings persistence, UI sync, shortcut recorder and JS-runtime checks.
// (extracted from resources/js/main.js — keep in sync with load order in app.html)

function initShortcutInputs() {
    const shortcutKeys = {
        shortcutAnalyze: 'analyze',
        shortcutQuickAudio: 'quickAudio',
        shortcutPlaylist: 'playlist'
    };

    for (const [id, settingKey] of Object.entries(shortcutKeys)) {
        const input = document.getElementById(id);
        if (!input) continue;

        const updateDisplay = () => {
            const rawVal = settings.shortcuts[settingKey] || '';
            input.value = formatShortcutForDisplay(rawVal);
        };

        if (input._shortcutInitialized) {
            updateDisplay();
            continue;
        }
        input._shortcutInitialized = true;

        input.readOnly = true;
        input.style.cursor = 'pointer';
        input.style.transition = 'all 0.2s ease';

        let originalVal = '';
        let isRecording = false;

        updateDisplay();

        input.addEventListener('focus', () => {
            isRecording = true;
            originalVal = settings.shortcuts[settingKey] || '';
            input.value = 'Press keys...';
            input.style.background = 'rgba(99, 102, 241, 0.15)';
            input.style.borderColor = 'var(--accent, #6366f1)';
            input.style.color = 'var(--accent, #6366f1)';
            input.style.fontWeight = 'bold';
        });

        input.addEventListener('blur', () => {
            isRecording = false;
            input.style.background = 'var(--bg-hover)';
            input.style.borderColor = 'var(--border-light)';
            input.style.color = 'var(--text-primary)';
            input.style.fontWeight = 'normal';
            updateDisplay();
        });

        input.addEventListener('keydown', (e) => {
            if (!isRecording) return;
            e.preventDefault();
            e.stopPropagation();

            const key = e.key;
            const code = e.code;

            const modifierKeys = ['Control', 'Alt', 'Shift', 'Meta'];
            if (modifierKeys.includes(key)) {
                let parts = [];
                if (e.ctrlKey) parts.push('Ctrl');
                if (e.altKey) parts.push('Alt');
                if (e.shiftKey) parts.push('Shift');
                if (e.metaKey) parts.push('Meta');
                input.value = parts.join(' + ') + ' + ...';
                return;
            }

            if (key === 'Escape') {
                input.blur();
                return;
            }

            let parts = [];
            if (e.ctrlKey) parts.push('Ctrl');
            if (e.altKey) parts.push('Alt');
            if (e.shiftKey) parts.push('Shift');
            if (e.metaKey) parts.push('Meta');
            parts.push(code);

            const finalShortcut = parts.join('+');
            settings.shortcuts[settingKey] = finalShortcut;
            saveSettings();

            input.blur();
        });
    }
}

window.addEventListener('keydown', async (e) => {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return; // Don't override default typing/pasting inside inputs
    }

    if (matchShortcut(e, settings.shortcuts?.quickAudio)) {
        e.preventDefault();
        try {
            const data = await Neutralino.clipboard.readText();
            if (data) { el.urlInput.value = data.trim(); quickM4a(); }
            else if (el.urlInput.value.trim()) quickM4a();
        } catch (err) { if (el.urlInput.value.trim()) quickM4a(); }
    } else if (matchShortcut(e, settings.shortcuts?.playlist)) {
        e.preventDefault();
        try {
            const data = await Neutralino.clipboard.readText();
            if (data) { el.urlInput.value = data.trim(); analyzePlaylist(); }
            else if (el.urlInput.value.trim()) analyzePlaylist();
        } catch (err) { if (el.urlInput.value.trim()) analyzePlaylist(); }
    } else if (matchShortcut(e, settings.shortcuts?.analyze)) {
        e.preventDefault();
        try {
            const data = await Neutralino.clipboard.readText();
            if (data) { el.urlInput.value = data.trim(); analyzeUrl(); }
            else if (el.urlInput.value.trim()) analyzeUrl();
        } catch (err) { if (el.urlInput.value.trim()) analyzeUrl(); }
    }
});


// Setting Listeners
el.inputs.browse.addEventListener('click', async () => {
    try {
        let entry = await Neutralino.os.showFolderDialog('Select Download Location');
        if (entry) {
            settings.downloadPath = entry;
            el.inputs.path.value = entry;
            updateCommand();
            saveSettings();
        }
    } catch (err) {
        console.error("Folder dialog error:", err);
    }
});

el.inputs.browseCookies.addEventListener('click', async () => {
    try {
        let entry = await Neutralino.os.showOpenDialog('Select Cookies File', {
            filters: [
                { name: 'Text Files', extensions: ['txt'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        if (entry && entry.length > 0) {
            settings.cookiesPath = entry[0];
            el.inputs.cookiesPath.value = entry[0];
            updateCommand();
            saveSettings();
        }
    } catch (err) {
        console.error("File dialog error:", err);
    }
});

el.inputs.clearCookies.addEventListener('click', () => {
    settings.cookiesPath = '';
    el.inputs.cookiesPath.value = '';
    updateCommand();
    saveSettings();
});

const checkboxes = [
    'embedMeta', 'embedThumb', 'restrict', 'noPlaylist', 'writeSubs', 'ignoreErrors', 'useCookies'
];

// Main-page quick toggles for embed options
['mainEmbedMeta', 'mainEmbedThumb'].forEach(key => {
    const cb = el[key];
    if (cb) {
        cb.addEventListener('change', () => {
            settings.embedMetadata = el.mainEmbedMeta ? el.mainEmbedMeta.checked : settings.embedMetadata;
            settings.embedThumbnail = el.mainEmbedThumb ? el.mainEmbedThumb.checked : settings.embedThumbnail;
            if (el.inputs.embedMeta) el.inputs.embedMeta.checked = settings.embedMetadata;
            if (el.inputs.embedThumb) el.inputs.embedThumb.checked = settings.embedThumbnail;
            updateCommand();
            saveSettings();
        });
    }
});
checkboxes.forEach(key => {
    const checkbox = el.inputs[key];
    if (checkbox) {
        checkbox.addEventListener('change', () => {
            // Update all settings from DOM to be safe
            settings.embedMetadata = el.inputs.embedMeta.checked;
            settings.embedThumbnail = el.inputs.embedThumb.checked;
            settings.restrictFilenames = el.inputs.restrict.checked;
            settings.noPlaylist = el.inputs.noPlaylist.checked;
            settings.writeSubs = el.inputs.writeSubs.checked;
            settings.ignoreErrors = el.inputs.ignoreErrors.checked;
            settings.useCookies = el.inputs.useCookies.checked;
            toggleCookiesWarning();
            updateCommand();
            syncSettingsUI();
            saveSettings();
        });
    }
});

if (el.inputs.concurrentFragments) {
    el.inputs.concurrentFragments.addEventListener('input', () => {
        let val = parseInt(el.inputs.concurrentFragments.value);
        if (isNaN(val) || val < 1) val = 1;
        settings.concurrentFragments = val;
        updateCommand();
        saveSettings();
    });
}

if (el.inputs.quickAudioFormat) {
    el.inputs.quickAudioFormat.addEventListener('change', () => {
        settings.quickAudioFormat = el.inputs.quickAudioFormat.value;
        if (el.quickAudioLabel) {
            el.quickAudioLabel.textContent = settings.quickAudioFormat.toUpperCase();
        }
        saveSettings();
    });
}

if (el.inputs.themeSelect) {
    el.inputs.themeSelect.addEventListener('change', () => {
        settings.theme = el.inputs.themeSelect.value;
        applyTheme(settings.theme);
        saveSettings();
        // Broadcast to the browser shell (tab strip) and to sibling tabs via the shell
        try {
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'theme-change', theme: settings.theme }, '*');
            }
        } catch (e) { /* not running inside the multi-tab shell */ }
    });
}

if (el.inputs.jsRuntimeSelect) {
    el.inputs.jsRuntimeSelect.addEventListener('change', () => {
        settings.jsRuntime = el.inputs.jsRuntimeSelect.value;
        toggleCookiesWarning();
        updateCommand();
        saveSettings();
    });
}

// Shortcut inputs are managed interactively by initShortcutInputs() using keydown listeners


async function loadSettings() {
    try {
        const data = await Neutralino.storage.getData('settings');
        if (data) {
            const saved = JSON.parse(data);
            settings = { ...settings, ...saved };
        }
    } catch (err) {
        // No settings saved yet, ignore
    }

    // Strict Path Logic: If 'Downloads' (default) or empty, resolve absolute system path.
    if (settings.downloadPath === 'Downloads' || !settings.downloadPath) {
        try {
            settings.downloadPath = await Neutralino.os.getPath('downloads');
        } catch (e) {
            console.error("Could not get system downloads path:", e);
            // Fallback to explicit ./Downloads if all else fails, but we want strictness.
        }
    }

    // Sync UI - Make sure cookies path is displayed
    syncSettingsUI();

    // Migrate older shortcuts if any
    if (settings.shortcuts) {
        settings.shortcuts.analyze = migrateShortcut(settings.shortcuts.analyze || 'Ctrl+KeyV');
        settings.shortcuts.quickAudio = migrateShortcut(settings.shortcuts.quickAudio || 'Alt+Digit1');
        settings.shortcuts.playlist = migrateShortcut(settings.shortcuts.playlist || 'Alt+Digit2');
    }

    // Initialize/sync interactive shortcut inputs
    initShortcutInputs();

    // Initialize External JS Runtime Managers and checking systems
    initRuntimeManagers();

    applyTheme(settings.theme || 'system');

    if (el.quickAudioLabel) {
        el.quickAudioLabel.textContent = (settings.quickAudioFormat || 'm4a').toUpperCase();
    }

    // Log cookies status for debugging
    if (settings.cookiesPath) {
        console.log("Cookies file loaded:", settings.cookiesPath);
    }

    updateCommand();
}

function syncSettingsUI() {
    if (el.inputs && el.inputs.path) el.inputs.path.value = settings.downloadPath;
    if (el.inputs && el.inputs.useCookies) el.inputs.useCookies.checked = settings.useCookies || false;
    if (el.inputs && el.inputs.cookiesPath) el.inputs.cookiesPath.value = settings.cookiesPath || '';
    if (el.inputs && el.inputs.embedMeta) el.inputs.embedMeta.checked = settings.embedMetadata;
    if (el.inputs && el.inputs.embedThumb) el.inputs.embedThumb.checked = settings.embedThumbnail;
    if (el.inputs && el.inputs.restrict) el.inputs.restrict.checked = settings.restrictFilenames;
    if (el.inputs && el.inputs.noPlaylist) el.inputs.noPlaylist.checked = settings.noPlaylist;
    if (el.inputs && el.inputs.writeSubs) el.inputs.writeSubs.checked = settings.writeSubs;
    if (el.inputs && el.inputs.ignoreErrors) el.inputs.ignoreErrors.checked = settings.ignoreErrors;
    if (el.inputs && el.inputs.concurrentFragments) el.inputs.concurrentFragments.value = settings.concurrentFragments || 1;
    if (el.inputs && el.inputs.quickAudioFormat) el.inputs.quickAudioFormat.value = settings.quickAudioFormat || 'm4a';
    if (el.inputs && el.inputs.jsRuntimeSelect) el.inputs.jsRuntimeSelect.value = settings.jsRuntime || 'none';
    if (el.inputs && el.inputs.themeSelect) el.inputs.themeSelect.value = settings.theme || 'system';
    applyTheme(settings.theme || 'system');
    if (el.quickAudioLabel) el.quickAudioLabel.textContent = (settings.quickAudioFormat || 'm4a').toUpperCase();
    if (el.mainEmbedMeta) el.mainEmbedMeta.checked = settings.embedMetadata;
    if (el.mainEmbedThumb) el.mainEmbedThumb.checked = settings.embedThumbnail;
}

async function saveSettings() {
    try {
        await Neutralino.storage.setData('settings', JSON.stringify(settings));
        showStatus('Settings Saved', 'success');
        setTimeout(() => showStatus('Ready'), 2000);
        // Broadcast to other tabs
        try { if (window.__bc) window.__bc.postMessage({ type: 'settings', sender: window.__tabId, payload: settings }); } catch (e) { }
    } catch (err) {
        console.error("Failed to save settings:", err);
    }
}


// Check if a specific JS runtime command is available on the machine
async function checkRuntime(name, force = false) {
    const cache = getSharedCache();
    if (!cache.runtimes) cache.runtimes = {};

    if (!force && cache.runtimes[name] !== undefined) {
        return cache.runtimes[name];
    }

    let cmd = '';
    if (name === 'node') cmd = 'node -v';
    else if (name === 'deno') cmd = 'deno --version';
    else if (name === 'bun') cmd = 'bun --version';
    else if (name === 'quickjs') cmd = 'qjs --version';

    if (!cmd) return false;

    try {
        let output = await Neutralino.os.execCommand(cmd);
        const exists = output.exitCode === 0;
        cache.runtimes[name] = exists;
        return exists;
    } catch (e) {
        cache.runtimes[name] = false;
        return false;
    }
}

// Handle Check button click and update status
async function handleCheckRuntime(name) {
    const statusSpan = document.getElementById(`status-${name}`);
    if (!statusSpan) return;

    statusSpan.textContent = 'Checking...';
    statusSpan.style.color = 'var(--text-muted)';

    const exists = await checkRuntime(name, true); // force re-check on manual click
    if (exists) {
        statusSpan.textContent = 'Installed ✔️';
        statusSpan.style.color = '#4caf50';
        installedRuntimes.add(name);
    } else {
        statusSpan.textContent = 'Missing ❌';
        statusSpan.style.color = '#f44336';
        installedRuntimes.delete(name);
    }
    rebuildRuntimeSelect();
}

// Track which runtimes are installed
let installedRuntimes = new Set();

// Rebuild jsRuntimeSelect dropdown based on detected runtimes
function rebuildRuntimeSelect() {
    const select = document.getElementById('jsRuntimeSelect');
    if (!select) return;
    const currentVal = settings.jsRuntime || 'none';
    select.innerHTML = '<option value="none">None (Default)</option>';
    const runtimeLabels = { node: 'Node.js', deno: 'Deno', bun: 'Bun', quickjs: 'QuickJS' };
    installedRuntimes.forEach(rt => {
        const opt = document.createElement('option');
        opt.value = rt;
        opt.textContent = runtimeLabels[rt] || rt;
        select.appendChild(opt);
    });
    // Restore selection if still available, else fallback to 'none'
    if (installedRuntimes.has(currentVal)) {
        select.value = currentVal;
    } else {
        select.value = 'none';
        if (currentVal !== 'none') {
            settings.jsRuntime = 'none';
            saveSettings();
        }
    }
}

// Check all runtimes on settings page load (uses shared cache across tabs)
function checkAllRuntimes(force = false) {
    const runtimes = ['node', 'deno', 'bun', 'quickjs'];
    const cache = getSharedCache();
    if (!cache.runtimes) cache.runtimes = {};

    let completed = 0;
    runtimes.forEach(rt => {
        checkRuntime(rt, force).then(exists => {
            const statusSpan = document.getElementById(`status-${rt}`);
            if (statusSpan) {
                if (exists) {
                    statusSpan.textContent = 'Installed ✔️';
                    statusSpan.style.color = '#4caf50';
                    installedRuntimes.add(rt);
                } else {
                    statusSpan.textContent = 'Missing ❌';
                    statusSpan.style.color = '#f44336';
                    installedRuntimes.delete(rt);
                }
            }
            completed++;
            if (completed === runtimes.length) {
                rebuildRuntimeSelect();
            }
        });
    });
}

// Dynamic display of warnings/notices about runtime requirements for cookies
function toggleCookiesWarning() {
    const warningEl = document.getElementById('cookiesRuntimeWarning');
    if (!warningEl) return;

    const useCookies = el.inputs.useCookies ? el.inputs.useCookies.checked : false;
    const jsRuntime = el.inputs.jsRuntimeSelect ? el.inputs.jsRuntimeSelect.value : 'none';

    if (useCookies && jsRuntime === 'none') {
        warningEl.classList.remove('hidden');
        warningEl.style.display = 'flex';
    } else {
        warningEl.classList.add('hidden');
        warningEl.style.display = 'none';
    }
}

// Initialize runtime download and check listeners
function initRuntimeManagers() {
    // Bind click events on check buttons
    document.querySelectorAll('.check-rt-btn').forEach(btn => {
        const rt = btn.getAttribute('data-runtime');
        if (rt) {
            btn.onclick = () => handleCheckRuntime(rt);
        }
    });

    // Bind click events on download buttons → open the official download page
    document.querySelectorAll('.dl-rt-btn').forEach(btn => {
        const url = btn.getAttribute('data-url');
        if (url) {
            btn.onclick = () => Neutralino.os.open(url);
        }
    });

    // Display cookies warning if needed
    toggleCookiesWarning();

    // Initialize tabbed settings panel navigation
    initSettingsTabs();

    // Bind informational links
    const cookiesLink = document.getElementById('cookiesTutorialLink');
    if (cookiesLink) {
        cookiesLink.onclick = (e) => {
            e.preventDefault();
            Neutralino.os.open('https://youtu.be/Lr9eoIXukpY');
        };
    }
    const jsRuntimeLink = document.getElementById('jsRuntimeWikiLink');
    if (jsRuntimeLink) {
        jsRuntimeLink.onclick = (e) => {
            e.preventDefault();
            Neutralino.os.open('https://github.com/yt-dlp/yt-dlp/wiki/EJS');
        };
    }
}

function initSettingsTabs() {
    document.querySelectorAll('.settings-tab-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.settings-pane').forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const tabName = btn.getAttribute('data-settings-tab');
            const pane = document.getElementById(`settings-pane-${tabName}`);
            if (pane) pane.classList.add('active');

            if (tabName === 'runtimes') {
                checkAllRuntimes();
            }
        };
    });
}


