// Professional playlist manager (modal, list, languages, concurrent downloads).
// (extracted from resources/js/main.js — keep in sync with load order in app.html)

function escapeCmdArg(arg) {
    if (!arg) return '""';
    return `"${String(arg).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

if (el && el.playlist && el.playlist.closeBtn) {
    el.playlist.closeBtn.addEventListener('click', () => {
        if (el.playlist && el.playlist.modal) el.playlist.modal.classList.add('hidden');
    });
}

function updatePlaylistSelectionInfo() {
    if (el && el.playlist && el.playlist.selectionInfo) {
        const count = (typeof playlistSelection !== 'undefined' && playlistSelection.size) ? playlistSelection.size : 0;
        el.playlist.selectionInfo.textContent = `${count} selected`;
    }
}

function renderPlaylistList() {
    if (!el || !el.playlist || !el.playlist.list || typeof playlistData === 'undefined' || !playlistData) return;
    const container = el.playlist.list;
    const filter = (el.playlist.searchInput && el.playlist.searchInput.value || '').toLowerCase();
    container.innerHTML = '';

    const entries = Array.isArray(playlistData.entries) ? playlistData.entries : [];
    entries.forEach((entry, idx) => {
        if (!entry) return;
        const index = idx + 1;
        const title = entry.title || 'Unknown Title';
        if (filter && !title.toLowerCase().includes(filter)) return;
        const thumb = entry.thumbnail || (entry.thumbnails && entry.thumbnails[0] && entry.thumbnails[0].url) || '';
        const dur = (typeof getDurationSeconds === 'function' && getDurationSeconds(entry))
            ? (typeof formatDuration === 'function' ? formatDuration(getDurationSeconds(entry)) : '')
            : '';
        const isSelected = typeof playlistSelection !== 'undefined' ? playlistSelection.has(index) : false;
        const dl = typeof playlistDownloads !== 'undefined' ? playlistDownloads.get(index) : null;
        const status = dl ? dl.status : 'idle';

        const item = document.createElement('div');
        item.className = 'playlist-item' + (isSelected ? ' selected' : '');
        item.dataset.index = index;

        const safeTitle = typeof escapeHtml === 'function' ? escapeHtml(title) : title;
        const safeDir = typeof getTextDir === 'function' ? getTextDir(title) : 'ltr';

        item.innerHTML = `
            <input type="checkbox" class="playlist-item-check" data-index="${index}" ${isSelected ? 'checked' : ''}>
            <div class="playlist-item-thumb">
                ${thumb ? `<img src="${thumb}" alt="" loading="lazy">` : `<div class="playlist-item-thumb-placeholder"></div>`}
                ${dur ? `<span class="playlist-item-dur">${dur}</span>` : ''}
            </div>
            <div class="playlist-item-info">
                <div class="playlist-item-title" dir="${safeDir}">${safeTitle}</div>
                <div class="playlist-item-meta">
                    <span class="playlist-item-status status-${status}">${statusLabel(status)}</span>
                </div>
            </div>
        `;
        const cb = item.querySelector('.playlist-item-check');
        if (cb) {
            cb.addEventListener('change', (e) => {
                e.stopPropagation();
                if (typeof playlistSelection !== 'undefined') {
                    if (cb.checked) playlistSelection.add(index); else playlistSelection.delete(index);
                }
                item.classList.toggle('selected', cb.checked);
                updatePlaylistSelectionInfo();
            });
        }
        item.addEventListener('click', (e) => {
            if (e.target && e.target.classList && e.target.classList.contains('playlist-item-check')) return;
            if (cb) {
                cb.checked = !cb.checked;
                cb.dispatchEvent(new Event('change', { bubbles: true }));
            }
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
    if (!data) return;
    playlistData = data;
    if (typeof playlistSelection !== 'undefined' && playlistSelection.clear) playlistSelection.clear();
    if (typeof playlistDownloads !== 'undefined' && playlistDownloads.clear) playlistDownloads.clear();
    
    if (el && el.playlist) {
        if (el.playlist.titleEl) el.playlist.titleEl.textContent = data.title || 'Playlist';
        if (el.playlist.countLabel) el.playlist.countLabel.textContent = `${(data.entries || []).length} videos`;
        if (el.playlist.embedMetaCheckbox) el.playlist.embedMetaCheckbox.checked = (typeof settings !== 'undefined' && settings) ? (settings.embedMetadata || false) : false;
        if (el.playlist.embedThumbCheckbox) el.playlist.embedThumbCheckbox.checked = (typeof settings !== 'undefined' && settings) ? (settings.embedThumbnail || false) : false;
    }
    
    (data.entries || []).forEach((_, i) => {
        if (typeof playlistSelection !== 'undefined') playlistSelection.add(i + 1);
    });
    renderPlaylistList();
    if (el && el.playlist && el.playlist.modal) el.playlist.modal.classList.remove('hidden');
    fetchPlaylistLanguages(data);
}

async function fetchPlaylistLanguages(data) {
    if (!el || !el.playlist) return;
    const sel = el.playlist.audioLangSelect;
    if (!sel || !data || !data.entries || data.entries.length === 0) return;

    sel.innerHTML = '<option value="auto">Lang: Original (auto)</option>';
    const entry = data.entries[0];
    const url = entry.url || entry.webpage_url || entry.id;
    const jsRuntimeArg = settings && settings.jsRuntime && settings.jsRuntime !== 'none' ? `--js-runtimes ${escapeCmdArg(settings.jsRuntime)}` : '';
    const cookiesArg = (settings && settings.useCookies && settings.cookiesPath) ? `--cookies ${escapeCmdArg(settings.cookiesPath)}` : '';
    const cmd = `yt-dlp -J --no-playlist --no-check-certificates --no-warnings ${jsRuntimeArg} ${cookiesArg} ${escapeCmdArg(url)}`;
    
    try {
        if (typeof runSpawnalyze !== 'function') return;
        const out = await runSpawnalyze(cmd);
        if (out.exitCode !== 0) return;

        let info;
        try {
            info = JSON.parse(out.stdOut);
        } catch (parseErr) {
            return;
        }

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

if (el && el.playlist && el.playlist.selectAllBtn) {
    el.playlist.selectAllBtn.addEventListener('click', () => {
        if (!playlistData || !Array.isArray(playlistData.entries)) return;
        playlistData.entries.forEach((_, i) => {
            if (typeof playlistSelection !== 'undefined') playlistSelection.add(i + 1);
        });
        renderPlaylistList();
    });
}
if (el && el.playlist && el.playlist.deselectAllBtn) {
    el.playlist.deselectAllBtn.addEventListener('click', () => {
        if (typeof playlistSelection !== 'undefined') playlistSelection.clear();
        renderPlaylistList();
    });
}
if (el && el.playlist && el.playlist.invertBtn) {
    el.playlist.invertBtn.addEventListener('click', () => {
        if (!playlistData || !Array.isArray(playlistData.entries)) return;
        const newSet = new Set();
        playlistData.entries.forEach((_, i) => {
            const idx = i + 1;
            if (typeof playlistSelection !== 'undefined' && !playlistSelection.has(idx)) newSet.add(idx);
        });
        playlistSelection = newSet;
        renderPlaylistList();
    });
}
if (el && el.playlist && el.playlist.searchInput) {
    el.playlist.searchInput.addEventListener('input', () => renderPlaylistList());
}

function buildPlaylistItemCmd(entry, index) {
    if (!entry) return '';
    const url = entry.url || entry.webpage_url || entry.id;
    const path = settings ? settings.downloadPath : '';
    const pathArg = path ? `-P ${escapeCmdArg(path)}` : '';
    const cookiesArg = (settings && settings.useCookies && settings.cookiesPath) ? `--cookies ${escapeCmdArg(settings.cookiesPath)}` : '';
    const jsRuntimeArg = (settings && settings.jsRuntime && settings.jsRuntime !== 'none') ? `--js-runtimes ${escapeCmdArg(settings.jsRuntime)}` : '';

    // Create a subfolder with the sanitized playlist title directly inside output template
    let subFolder = '';
    if (typeof playlistData !== 'undefined' && playlistData && playlistData.title) {
        const clean = playlistData.title.replace(/[\\/:*?"<>|]/g, '_').trim();
        if (clean) subFolder = clean + '/';
    }

    const audioOnly = (el && el.playlist && el.playlist.audioOnlyCheckbox) ? el.playlist.audioOnlyCheckbox.checked : false;
    const vq = (el && el.playlist && el.playlist.videoQualitySelect) ? el.playlist.videoQualitySelect.value : 'best';
    const aq = (el && el.playlist && el.playlist.audioQualitySelect) ? el.playlist.audioQualitySelect.value : 'auto';

    const embedMeta = (el && el.playlist && el.playlist.embedMetaCheckbox) ? el.playlist.embedMetaCheckbox.checked : false;
    const embedThumb = (el && el.playlist && el.playlist.embedThumbCheckbox) ? el.playlist.embedThumbCheckbox.checked : false;

    let vPart = 'bestvideo';
    if (vq !== 'best') vPart = `bestvideo[height<=${vq}]`;

    const lang = (el && el.playlist && el.playlist.audioLangSelect) ? el.playlist.audioLangSelect.value : 'auto';

    let core;
    let convertTo = null;
    switch (aq) {
        case 'opus-best': core = 'bestaudio[acodec^=opus]'; convertTo = 'opus'; break;
        case 'opus-med': core = 'bestaudio[acodec^=opus][abr<=80]'; convertTo = 'opus'; break;
        case 'opus-low': core = 'bestaudio[acodec^=opus][abr<=55]'; convertTo = 'opus'; break;
        case 'm4a-best': core = 'bestaudio[acodec^=mp4a]'; convertTo = 'm4a'; break;
        case 'm4a-low': core = 'bestaudio[acodec^=mp4a][abr<=80]'; convertTo = 'm4a'; break;
        default: core = 'bestaudio'; break;
    }

    const cands = [];
    const addLang = (expr) => (lang !== 'auto') ? `${expr}[language=${lang}]` : null;
    if (core !== 'bestaudio') {
        const l = addLang(core); if (l) cands.push(l);
        cands.push(core);
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
    if (settings && settings.restrictFilenames) flags.push('--restrict-filenames');
    flags.push('--no-overwrites');
    flags.push('--no-post-overwrites');
    flags.push('--no-playlist');
    flags.push('--continue');
    flags.push(`-S "lang,acodec:opus"`);
    flags.push(`-f "${formatStr}"`);
    flags = flags.concat(audioFlags);

    if (audioOnly) {
        flags.push(`-o "${subFolder}%(title)s.%(ext)s"`);
    } else {
        // Output Template Optimization: Include quality tag [1080p] for video items inside subFolder
        flags.push(`-o "${subFolder}%(title)s [%(height)sp].%(ext)s"`);
    }

    if (!audioOnly && vq !== 'best') flags.push('--merge-output-format mp4');

    const parts = ['yt-dlp', flags.join(' '), jsRuntimeArg, cookiesArg, pathArg, escapeCmdArg(url)].filter(Boolean);
    return parts.join(' ').trim();
}

async function downloadPlaylistItems(indices) {
    if (!playlistData || !indices || indices.length === 0) return;
    const queue = [...indices];
    const running = new Set();
    const maxConc = (typeof playlistMaxConcurrent !== 'undefined') ? playlistMaxConcurrent : 3;

    const runOne = async (index) => {
        const entry = playlistData.entries[index - 1];
        if (!entry) return;
        const title = entry.title || 'Download';
        const cmd = buildPlaylistItemCmd(entry, index);
        const dl = { pid: null, panel: null, status: 'queued', cmd };
        
        if (typeof playlistDownloads !== 'undefined') {
            playlistDownloads.set(index, dl);
        }
        renderPlaylistList();

        while (running.size >= maxConc) {
            await new Promise(r => setTimeout(r, 300));
        }
        running.add(index);
        dl.status = 'downloading';
        renderPlaylistList();

        const panelsContainer = document.getElementById('downloadPanels');
        const panel = document.createElement('div');
        panel.className = 'download-panel';
        const safeTitleDisplay = typeof escapeHtml === 'function' ? escapeHtml(title) : title;

        panel.innerHTML = `
            <div class="dp-header">
                <div class="dp-title">${safeTitleDisplay}</div>
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

        if (toggleBtn && logEl) {
            toggleBtn.addEventListener('click', () => {
                logEl.classList.toggle('expanded');
                toggleBtn.textContent = logEl.classList.contains('expanded') ? 'Hide' : 'Details';
            });
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', () => removePanel(panel));
        }
        dl.panel = panel;

        let procPid = null;
        let procId = null;
        let itemDestination = null;

        try {
            const proc = await Neutralino.os.spawnProcess(cmd);
            dl.pid = proc.pid;
            procPid = proc.pid;
            procId = proc.id;

            const onSpawnedItem = (evt) => {
                if (evt.detail.id != procId) return;

                if (evt.detail.action === 'stdOut' || evt.detail.action === 'stdErr') {
                    const text = evt.detail.data;
                    if (logEl) {
                        logEl.textContent += text;
                        logEl.scrollTop = logEl.scrollHeight;
                    }
                    const match = text.match(/(\d+(\.\d+)?)%/);
                    if (match && barFill) barFill.style.width = match[1] + '%';

                    const destMatch = text.match(/\[download\]\s+Destination:\s+(.+)/) ||
                                      text.match(/\[Merger\]\s+Merging formats into "(.+)"/) ||
                                      text.match(/\[ExtractAudio\]\s+Destination:\s+(.+)/) ||
                                      text.match(/\[download\]\s+(.+?)\s+has already been downloaded/);
                    if (destMatch) {
                        let rawDest = destMatch[1].trim().replace(/^"/, '').replace(/"$/, '');
                        if (rawDest) itemDestination = rawDest;
                    }
                }

                if (evt.detail.action === 'exit') {
                    const code = evt.detail.data;
                    if (logEl) logEl.textContent += `\nProcess exited with code ${code}`;

                    try {
                        Neutralino.events.off('spawnedProcess', onSpawnedItem);
                    } catch (e) {}

                    const logContent = logEl ? (logEl.textContent || '') : '';
                    const isAlreadyDownloaded = /has already been downloaded|already in target format/i.test(logContent);

                    let playlistFolder = (playlistData && playlistData.title)
                        ? `${(settings ? settings.downloadPath : '')}/${playlistData.title.replace(/[\\/:*?"<>|]/g, '_').trim()}`
                        : (settings ? settings.downloadPath : null);

                    let openTarget = itemDestination || playlistFolder;

                    if (code === 0 || isAlreadyDownloaded) {
                        if (barFill) barFill.style.width = '100%';
                        dl.status = 'done';
                        if (pauseBtn) pauseBtn.classList.add('hidden');
                        if (resumeBtn) resumeBtn.classList.add('hidden');
                        if (closeBtn) closeBtn.classList.remove('hidden');

                        setTimeout(() => {
                            removePanel(panel);
                            if (typeof playClickSound === 'function') playClickSound();
                            if (isAlreadyDownloaded) {
                                if (typeof showToast === 'function') {
                                    showToast('Already Exists ⚠️', title, {
                                        actionLabel: 'Open File',
                                        onAction: () => {
                                            if (typeof openFileLocation === 'function') openFileLocation(openTarget);
                                        },
                                        duration: 5000
                                    });
                                }
                            } else {
                                if (typeof addNotif === 'function') addNotif(title, openTarget || playlistFolder || (settings ? settings.downloadPath : null));
                                if (typeof showToast === 'function') {
                                    showToast('Download complete', title, {
                                        actionLabel: 'Open File',
                                        onAction: () => {
                                            if (typeof openFileLocation === 'function') openFileLocation(openTarget);
                                        },
                                        duration: 5000
                                    });
                                }
                            }
                        }, 500);
                    } else {
                        if (dl.status !== 'paused') {
                            dl.status = 'failed';
                            if (pauseBtn) pauseBtn.classList.add('hidden');
                            if (resumeBtn) resumeBtn.classList.remove('hidden');
                        }
                    }
                    running.delete(index);
                    renderPlaylistList();
                }
            };

            if (pauseBtn) {
                pauseBtn.addEventListener('click', async () => {
                    if (!procPid) return;
                    try {
                        const killCmd = window.NL_OS === 'Windows' ? `taskkill /F /T /PID ${procPid}` : `kill -9 ${procPid}`;
                        await Neutralino.os.execCommand(killCmd);
                    } catch (e) { console.error(e); }
                    
                    try {
                        Neutralino.events.off('spawnedProcess', onSpawnedItem);
                    } catch (e) {}

                    dl.status = 'paused';
                    pauseBtn.classList.add('hidden');
                    if (resumeBtn) resumeBtn.classList.remove('hidden');
                    renderPlaylistList();
                });
            }

            if (resumeBtn) {
                resumeBtn.addEventListener('click', async () => {
                    resumeBtn.classList.add('hidden');
                    if (pauseBtn) pauseBtn.classList.remove('hidden');
                    dl.status = 'downloading';
                    running.add(index);
                    renderPlaylistList();

                    try {
                        const newProc = await Neutralino.os.spawnProcess(cmd);
                        dl.pid = newProc.pid;
                        procPid = newProc.pid;
                        procId = newProc.id;

                        const onSpawnedResume = (evt) => {
                            if (evt.detail.id != procId) return;

                            if (evt.detail.action === 'stdOut' || evt.detail.action === 'stdErr') {
                                const text = evt.detail.data;
                                if (logEl) {
                                    logEl.textContent += text;
                                    logEl.scrollTop = logEl.scrollHeight;
                                }
                                const match = text.match(/(\d+(\.\d+)?)%/);
                                if (match && barFill) barFill.style.width = match[1] + '%';
                            }
                            if (evt.detail.action === 'exit') {
                                const code = evt.detail.data;
                                try {
                                    Neutralino.events.off('spawnedProcess', onSpawnedResume);
                                } catch (e) {}

                                if (code === 0) {
                                    if (barFill) barFill.style.width = '100%';
                                    dl.status = 'done';
                                    if (pauseBtn) pauseBtn.classList.add('hidden');
                                    if (resumeBtn) resumeBtn.classList.remove('hidden');
                                    if (closeBtn) closeBtn.classList.remove('hidden');
                                    setTimeout(() => {
                                        removePanel(panel);
                                        if (typeof playClickSound === 'function') playClickSound();
                                        if (typeof addNotif === 'function') addNotif(title);
                                        if (typeof showToast === 'function') showToast('Download complete', title, { duration: 5000 });
                                    }, 500);
                                } else {
                                    if (dl.status !== 'paused') {
                                        dl.status = 'failed';
                                        if (pauseBtn) pauseBtn.classList.add('hidden');
                                        if (resumeBtn) resumeBtn.classList.remove('hidden');
                                    }
                                }
                                running.delete(index);
                                renderPlaylistList();
                            }
                        };

                        Neutralino.events.on('spawnedProcess', onSpawnedResume);

                    } catch (e) {
                        console.error(e);
                        dl.status = 'failed';
                        running.delete(index);
                        renderPlaylistList();
                    }
                });
            }

            Neutralino.events.on('spawnedProcess', onSpawnedItem);

        } catch (err) {
            console.error(err);
            dl.status = 'failed';
            running.delete(index);
            renderPlaylistList();
        }
    };

    const workers = [];
    for (let i = 0; i < Math.min(maxConc, queue.length); i++) {
        workers.push((async () => {
            while (queue.length > 0) {
                const idx = queue.shift();
                await runOne(idx);
            }
        })());
    }
    await Promise.all(workers);
}

if (el && el.playlist && el.playlist.downloadAllBtn) {
    el.playlist.downloadAllBtn.addEventListener('click', () => {
        if (!playlistData || !Array.isArray(playlistData.entries)) return;
        const indices = playlistData.entries.map((_, i) => i + 1);
        downloadPlaylistItems(indices);
    });
}

if (el && el.playlist && el.playlist.downloadSelectedBtn) {
    el.playlist.downloadSelectedBtn.addEventListener('click', () => {
        if (typeof playlistSelection === 'undefined' || playlistSelection.size === 0) {
            if (typeof showAlert === 'function') {
                showAlert('Please select at least one video.', 'Selection Required');
            }
            return;
        }
        downloadPlaylistItems(Array.from(playlistSelection));
    });
}

if (el && el.playlist && el.playlist.pauseAllBtn) {
    el.playlist.pauseAllBtn.addEventListener('click', async () => {
        if (typeof playlistDownloads === 'undefined') return;
        for (const [idx, dl] of playlistDownloads.entries()) {
            if (dl && dl.status === 'downloading' && dl.pid) {
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