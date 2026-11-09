// Professional playlist manager (modal, list, languages, concurrent downloads).
// (extracted from resources/js/main.js — keep in sync with load order in app.html)

// Playlist Listeners (Professional Playlist Manager)
if (el.playlist.closeBtn) {
    el.playlist.closeBtn.addEventListener('click', () => {
        if (el.playlist.modal) el.playlist.modal.classList.add('hidden');
    });
}

function updatePlaylistSelectionInfo() {
    if (el.playlist.selectionInfo) {
        el.playlist.selectionInfo.textContent = `${playlistSelection.size} selected`;
    }
}

function renderPlaylistList() {
    const container = el.playlist.list;
    if (!container || !playlistData) return;
    const filter = (el.playlist.searchInput && el.playlist.searchInput.value || '').toLowerCase();
    container.innerHTML = '';
    playlistData.entries.forEach((entry, idx) => {
        const index = idx + 1;
        const title = entry.title || 'Unknown Title';
        if (filter && !title.toLowerCase().includes(filter)) return;
        const thumb = entry.thumbnail || (entry.thumbnails && entry.thumbnails[0] && entry.thumbnails[0].url) || '';
        const dur = getDurationSeconds(entry) ? formatDuration(getDurationSeconds(entry)) : '';
        const isSelected = playlistSelection.has(index);
        const dl = playlistDownloads.get(index);
        const status = dl ? dl.status : 'idle';
        const item = document.createElement('div');
        item.className = 'playlist-item' + (isSelected ? ' selected' : '');
        item.dataset.index = index;
        item.innerHTML = `
            <input type="checkbox" class="playlist-item-check" data-index="${index}" ${isSelected ? 'checked' : ''}>
            <div class="playlist-item-thumb">
                ${thumb ? `<img src="${thumb}" alt="" loading="lazy">` : `<div class="playlist-item-thumb-placeholder"></div>`}
                ${dur ? `<span class="playlist-item-dur">${dur}</span>` : ''}
            </div>
            <div class="playlist-item-info">
                <div class="playlist-item-title" dir="${getTextDir(title)}">${escapeHtml(title)}</div>
                <div class="playlist-item-meta">
                    <span class="playlist-item-status status-${status}">${statusLabel(status)}</span>
                </div>
            </div>
        `;
        const cb = item.querySelector('.playlist-item-check');
        cb.addEventListener('change', (e) => {
            e.stopPropagation();
            if (cb.checked) playlistSelection.add(index); else playlistSelection.delete(index);
            item.classList.toggle('selected', cb.checked);
            updatePlaylistSelectionInfo();
        });
        item.addEventListener('click', (e) => {
            if (e.target && e.target.classList && e.target.classList.contains('playlist-item-check')) return;
            cb.checked = !cb.checked;
            cb.dispatchEvent(new Event('change', { bubbles: true }));
        });
        container.appendChild(item);
    });
    updatePlaylistSelectionInfo();
}

function statusLabel(status) {
    switch (status) {
        case 'queued': return 'Queued';
        case 'downloading': return 'Downloading';
        case 'paused': return 'Paused';
        case 'done': return 'Done';
        case 'failed': return 'Failed';
        default: return 'Idle';
    }
}

function populatePlaylistModal(data) {
    playlistData = data;
    playlistSelection.clear();
    playlistDownloads.clear();
    if (el.playlist.titleEl) el.playlist.titleEl.textContent = data.title || 'Playlist';
    if (el.playlist.countLabel) el.playlist.countLabel.textContent = `${(data.entries || []).length} videos`;
    (data.entries || []).forEach((_, i) => playlistSelection.add(i + 1));
    renderPlaylistList();
    if (el.playlist.modal) el.playlist.modal.classList.remove('hidden');
    fetchPlaylistLanguages(data);
}

async function fetchPlaylistLanguages(data) {
    const sel = el.playlist.audioLangSelect;
    if (!sel || !data || !data.entries || data.entries.length === 0) return;
    // reset to original
    sel.innerHTML = '<option value="auto">Lang: Original (auto)</option>';
    const entry = data.entries[0];
    const url = entry.url || entry.webpage_url || entry.id;
    const jsRuntimeArg = settings.jsRuntime && settings.jsRuntime !== 'none' ? `--js-runtimes ${settings.jsRuntime}` : '';
    const cookiesArg = (settings.useCookies && settings.cookiesPath) ? `--cookies \"${settings.cookiesPath}\"` : '';
    const cmd = `yt-dlp -J --no-playlist --no-check-certificates --no-warnings ${jsRuntimeArg} ${cookiesArg} \"${url}\"`;
    try {
        const out = await runSpawnalyze(cmd);
        if (out.exitCode !== 0) return;
        const info = JSON.parse(out.stdOut);
        const langs = new Map();
        (info.formats || []).forEach(f => {
            const ac = f.acodec; const vc = f.vcodec;
            if (ac && ac !== 'none' && (vc === 'none' || !vc)) {
                const code = f.language;
                if (code && !langs.has(code)) {
                    const name = f.format_note ? (f.format_note.split(',')[0].trim()) : code;
                    langs.set(code, name);
                }
            }
        });
        // sort: original (language_preference high) first; then alphabetical
        const sorted = [...langs.entries()].sort((a, b) => a[0].localeCompare(b[0]));
        sorted.forEach(([code, name]) => {
            const opt = document.createElement('option');
            opt.value = code;
            opt.textContent = `Lang: ${name} (${code})`;
            sel.appendChild(opt);
        });
    } catch (e) {
        // ignore; keep auto
    }
}

if (el.playlist.selectAllBtn) {
    el.playlist.selectAllBtn.addEventListener('click', () => {
        if (!playlistData) return;
        playlistData.entries.forEach((_, i) => playlistSelection.add(i + 1));
        renderPlaylistList();
    });
}
if (el.playlist.deselectAllBtn) {
    el.playlist.deselectAllBtn.addEventListener('click', () => {
        playlistSelection.clear();
        renderPlaylistList();
    });
}
if (el.playlist.invertBtn) {
    el.playlist.invertBtn.addEventListener('click', () => {
        if (!playlistData) return;
        const newSet = new Set();
        playlistData.entries.forEach((_, i) => {
            const idx = i + 1;
            if (!playlistSelection.has(idx)) newSet.add(idx);
        });
        playlistSelection = newSet;
        renderPlaylistList();
    });
}
if (el.playlist.searchInput) {
    el.playlist.searchInput.addEventListener('input', () => renderPlaylistList());
}

function buildPlaylistItemCmd(entry, index) {
    const url = entry.url || entry.webpage_url || entry.id;
    const path = settings.downloadPath;
    const pathArg = path ? `-P "${path}"` : '';
    const cookiesArg = (settings.useCookies && settings.cookiesPath) ? `--cookies "${settings.cookiesPath}"` : '';
    const jsRuntimeArg = settings.jsRuntime && settings.jsRuntime !== 'none' ? `--js-runtimes ${settings.jsRuntime}` : '';

    const audioOnly = el.playlist.audioOnlyCheckbox ? el.playlist.audioOnlyCheckbox.checked : false;
    const vq = el.playlist.videoQualitySelect ? el.playlist.videoQualitySelect.value : 'best';
    const aq = el.playlist.audioQualitySelect ? el.playlist.audioQualitySelect.value : 'auto';

    const embedMeta = el.playlist.embedMetaCheckbox ? el.playlist.embedMetaCheckbox.checked : true;
    const embedThumb = el.playlist.embedThumbCheckbox ? el.playlist.embedThumbCheckbox.checked : true;

    let vPart = 'bestvideo';
    if (vq !== 'best') vPart = `bestvideo[height<=${vq}]`;

    const lang = el.playlist.audioLangSelect ? el.playlist.audioLangSelect.value : 'auto';

    // Comprehensive (no fixed IDs): select by codec + abr range.
    let core; // single format filter (no fallbacks)
    let convertTo = null;
    let isOpus = false;
    switch (aq) {
        case 'opus-best': core = 'bestaudio[acodec^=opus]'; convertTo = 'opus'; isOpus = true; break;
        case 'opus-med': core = 'bestaudio[acodec^=opus][abr<=80]'; convertTo = 'opus'; isOpus = true; break;
        case 'opus-low': core = 'bestaudio[acodec^=opus][abr<=55]'; convertTo = 'opus'; isOpus = true; break;
        case 'm4a-best': core = 'bestaudio[acodec^=mp4a]'; convertTo = 'm4a'; break;
        case 'm4a-low': core = 'bestaudio[acodec^=mp4a][abr<=80]'; convertTo = 'm4a'; break;
        default: core = 'bestaudio'; break;
    }

    // Build fallback chain with language preference
    const cands = [];
    const addLang = (expr) => (lang !== 'auto') ? `${expr}[language=${lang}]` : null;
    if (core !== 'bestaudio') {
        const l = addLang(core); if (l) cands.push(l);
        cands.push(core);
        // codec-level fallback
        const codecPrefix = core.startsWith('bestaudio[acodec^=opus]') ? 'bestaudio[acodec^=opus]' :
            (core.startsWith('bestaudio[acodec^=mp4a]') ? 'bestaudio[acodec^=mp4a]' : null);
        if (codecPrefix) {
            const l2 = addLang(codecPrefix); if (l2) cands.push(l2);
            cands.push(codecPrefix);
        }
    }
    if (lang !== 'auto') {
        const l3 = addLang('bestaudio'); if (l3) cands.push(l3);
    }
    cands.push('bestaudio');
    const uniq = [...new Set(cands)];
    const audioSelector = uniq.join('/');

    let formatStr;
    let audioFlags = [];
    if (audioOnly) {
        formatStr = audioSelector;
        if (convertTo) {
            audioFlags.push('-x', '--audio-format', convertTo);
        }
    } else {
        formatStr = `${vPart}+(${audioSelector})/${vPart}+bestaudio/best`;
    }

    let flags = [];
    if (embedMeta) flags.push('--embed-metadata');
    if (embedThumb) flags.push('--embed-thumbnail');
    if (settings.restrictFilenames) flags.push('--restrict-filenames');
    flags.push('--no-playlist');
    flags.push('--continue');
    flags.push(`-S "lang,acodec:opus"`);
    flags.push(`-f "${formatStr}"`);
    flags = flags.concat(audioFlags);
    flags.push('-o "%(title)s.%(ext)s"');
    if (!audioOnly && vq !== 'best') flags.push('--merge-output-format mp4');

    const parts = ['yt-dlp', flags.join(' '), jsRuntimeArg, cookiesArg, pathArg, `"${url}"`].filter(Boolean);
    return parts.join(' ').trim();
}

async function downloadPlaylistItems(indices) {
    if (!playlistData || !indices || indices.length === 0) return;
    const queue = [...indices];
    const running = new Set();
    const runOne = async (index) => {
        const entry = playlistData.entries[index - 1];
        if (!entry) return;
        const title = entry.title || 'Download';
        const cmd = buildPlaylistItemCmd(entry, index);
        const dl = { pid: null, panel: null, status: 'queued', cmd };
        playlistDownloads.set(index, dl);
        renderPlaylistList();
        while (running.size >= playlistMaxConcurrent) {
            await new Promise(r => setTimeout(r, 300));
        }
        running.add(index);
        dl.status = 'downloading';
        renderPlaylistList();
        const panelsContainer = document.getElementById('downloadPanels');
        const panel = document.createElement('div');
        panel.className = 'download-panel';
        panel.innerHTML = `
            <div class="dp-header">
                <div class="dp-title">${escapeHtml(title)}</div>
                <button class="dp-close" aria-label="Close">×</button>
            </div>
            <div class="dp-bar"><div class="dp-bar-fill"></div></div>
            <div class="dp-actions">
                <button class="dp-toggle secondary-btn">Details</button>
                <button class="dp-pause secondary-btn">Pause</button>
                <button class="dp-resume secondary-btn hidden">Resume</button>
            </div>
            <div class="dp-log"></div>
        `;
        if (panelsContainer) panelsContainer.appendChild(panel);
        requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('show')));
        const barFill = panel.querySelector('.dp-bar-fill');
        const logEl = panel.querySelector('.dp-log');
        const toggleBtn = panel.querySelector('.dp-toggle');
        const pauseBtn = panel.querySelector('.dp-pause');
        const resumeBtn = panel.querySelector('.dp-resume');
        const closeBtn = panel.querySelector('.dp-close');
        toggleBtn.addEventListener('click', () => {
            logEl.classList.toggle('expanded');
            toggleBtn.textContent = logEl.classList.contains('expanded') ? 'Hide' : 'Details';
        });
        closeBtn.addEventListener('click', () => removePanel(panel));
        dl.panel = panel;

        let procPid = null;
        try {
            const proc = await Neutralino.os.spawnProcess(cmd);
            dl.pid = proc.pid;
            procPid = proc.pid;
            Neutralino.events.on('spawnedProcess', (evt) => {
                if (evt.detail.id != proc.id) return;
                if (evt.detail.action === 'stdOut' || evt.detail.action === 'stdErr') {
                    const text = evt.detail.data;
                    logEl.textContent += text;
                    logEl.scrollTop = logEl.scrollHeight;
                    const match = text.match(/(\\d+(\\.\\d+)?)%/);
                    if (match) barFill.style.width = match[1] + '%';
                }
                if (evt.detail.action === 'exit') {
                    const code = evt.detail.data;
                    logEl.textContent += `\\nProcess exited with code ${code}`;
                    if (code === 0) {
                        barFill.style.width = '100%';
                        dl.status = 'done';
                        pauseBtn.classList.add('hidden');
                        resumeBtn.classList.add('hidden');
                        closeBtn.classList.remove('hidden');
                        setTimeout(() => {
                            removePanel(panel);
                            playClickSound();
                            addNotif(title);
                            showToast('Download complete', title, { duration: 5000 });
                        }, 500);
                    } else {
                        if (dl.status !== 'paused') {
                            dl.status = 'failed';
                            pauseBtn.classList.add('hidden');
                            resumeBtn.classList.remove('hidden');
                        }
                    }
                    running.delete(index);
                    renderPlaylistList();
                }
            });
            pauseBtn.addEventListener('click', async () => {
                if (!procPid) return;
                try {
                    const killCmd = window.NL_OS === 'Windows' ? `taskkill /F /T /PID ${procPid}` : `kill -9 ${procPid}`;
                    await Neutralino.os.execCommand(killCmd);
                } catch (e) { console.error(e); }
                dl.status = 'paused';
                pauseBtn.classList.add('hidden');
                resumeBtn.classList.remove('hidden');
                renderPlaylistList();
            });
            resumeBtn.addEventListener('click', async () => {
                resumeBtn.classList.add('hidden');
                pauseBtn.classList.remove('hidden');
                dl.status = 'downloading';
                running.add(index);
                renderPlaylistList();
                try {
                    const newProc = await Neutralino.os.spawnProcess(cmd);
                    dl.pid = newProc.pid;
                    procPid = newProc.pid;
                    Neutralino.events.on('spawnedProcess', (evt) => {
                        if (evt.detail.id != newProc.id) return;
                        if (evt.detail.action === 'stdOut' || evt.detail.action === 'stdErr') {
                            const text = evt.detail.data;
                            logEl.textContent += text;
                            logEl.scrollTop = logEl.scrollHeight;
                            const match = text.match(/(\\d+(\\.\\d+)?)%/);
                            if (match) barFill.style.width = match[1] + '%';
                        }
                        if (evt.detail.action === 'exit') {
                            const code = evt.detail.data;
                            if (code === 0) {
                                barFill.style.width = '100%';
                                dl.status = 'done';
                                pauseBtn.classList.add('hidden');
                                resumeBtn.classList.add('hidden');
                                closeBtn.classList.remove('hidden');
                                setTimeout(() => { removePanel(panel); playClickSound(); addNotif(title); showToast('Download complete', title, { duration: 5000 }); }, 500);
                            } else {
                                if (dl.status !== 'paused') {
                                    dl.status = 'failed';
                                    pauseBtn.classList.add('hidden');
                                    resumeBtn.classList.remove('hidden');
                                }
                            }
                            running.delete(index);
                            renderPlaylistList();
                        }
                    });
                } catch (e) {
                    console.error(e);
                    dl.status = 'failed';
                    renderPlaylistList();
                }
            });
        } catch (err) {
            console.error(err);
            dl.status = 'failed';
            running.delete(index);
            renderPlaylistList();
        }
    };
    const workers = [];
    for (let i = 0; i < Math.min(playlistMaxConcurrent, queue.length); i++) {
        workers.push((async () => {
            while (queue.length > 0) {
                const idx = queue.shift();
                await runOne(idx);
            }
        })());
    }
    await Promise.all(workers);
}

if (el.playlist.downloadAllBtn) {
    el.playlist.downloadAllBtn.addEventListener('click', () => {
        if (!playlistData) return;
        const indices = playlistData.entries.map((_, i) => i + 1);
        downloadPlaylistItems(indices);
    });
}
if (el.playlist.downloadSelectedBtn) {
    el.playlist.downloadSelectedBtn.addEventListener('click', () => {
        if (playlistSelection.size === 0) { alert('Please select at least one video.'); return; }
        downloadPlaylistItems(Array.from(playlistSelection));
    });
}
if (el.playlist.pauseAllBtn) {
    el.playlist.pauseAllBtn.addEventListener('click', async () => {
        for (const [idx, dl] of playlistDownloads.entries()) {
            if (dl.status === 'downloading' && dl.pid) {
                try {
                    const killCmd = window.NL_OS === 'Windows' ? `taskkill /F /T /PID ${dl.pid}` : `kill -9 ${dl.pid}`;
                    await Neutralino.os.execCommand(killCmd);
                } catch (e) { }
                dl.status = 'paused';
            }
        }
        renderPlaylistList();
    });
}

