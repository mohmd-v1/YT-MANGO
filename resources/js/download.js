// Download execution (panel system, cancel, copy direct link).
// (extracted from resources/js/main.js — keep in sync with load order in app.html)

if (el && el.downloadBtn) {
    el.downloadBtn.addEventListener('click', startDownload);
}

async function startDownload() {
    if (!el || !el.cmdPreview || !el.cmdPreview.value) return;

    // Build header title for process panel with resolution tag if video
    let downloadTitle = 'Downloading...';
    if (typeof currentData !== 'undefined' && currentData && currentData.title) {
        downloadTitle = currentData.title;
        if (typeof selectedVideoId !== 'undefined' && selectedVideoId) {
            let vFmt = (typeof formats !== 'undefined' && formats) ? formats.find(f => f.format_id === selectedVideoId) : null;
            if (vFmt) {
                let res = (typeof getNormalizedResolution === 'function') ? getNormalizedResolution(vFmt) : (vFmt.height ? `${vFmt.height}p` : '');
                if (res && res !== 'Unknown') downloadTitle += ` [${res}]`;
            }
        }
    }

    const panelsContainer = document.getElementById('downloadPanels');
    const panel = document.createElement('div');
    panel.className = 'download-panel';
    panel.innerHTML = `
        <div class="dp-header">
            <div class="dp-title">${typeof escapeHtml === 'function' ? escapeHtml(downloadTitle) : downloadTitle}</div>
            <button class="dp-close" aria-label="Close">×</button>
        </div>
        <div class="dp-bar"><div class="dp-bar-fill"></div></div>
        <div class="dp-actions">
            <button class="dp-toggle secondary-btn">Details</button>
            <button class="dp-cancel secondary-btn">Cancel</button>
        </div>
        <div class="dp-log"></div>
    `;
    if (panelsContainer) panelsContainer.appendChild(panel);
    requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('show')));

    const titleEl = panel.querySelector('.dp-title');
    const barFill = panel.querySelector('.dp-bar-fill');
    const logEl = panel.querySelector('.dp-log');
    const toggleBtn = panel.querySelector('.dp-toggle');
    const cancelBtn = panel.querySelector('.dp-cancel');
    const closeBtn = panel.querySelector('.dp-close');

    let panelDestination = null;
    let procPid = null;
    let procId = null;

    if (toggleBtn && logEl) {
        toggleBtn.addEventListener('click', () => {
            logEl.classList.toggle('expanded');
            toggleBtn.textContent = logEl.classList.contains('expanded') ? 'Hide' : 'Details';
        });
    }
    if (closeBtn) {
        closeBtn.addEventListener('click', () => removePanel(panel));
    }

    if (el && el.statusMsg) el.statusMsg.textContent = 'Downloading...';

    let cmd = el.cmdPreview.value;

    try {
        let proc = await Neutralino.os.spawnProcess(cmd);
        procId = proc.id;
        procPid = proc.pid;
        currentDownloadProcess = proc.id;
        currentDownloadProcessPid = proc.pid;

        const onSpawnedDownload = (evt) => {
            if (evt.detail.id != procId) return;

            if (evt.detail.action == 'stdOut' || evt.detail.action == 'stdErr') {
                const text = evt.detail.data;
                if (logEl) {
                    logEl.textContent += text;
                    logEl.scrollTop = logEl.scrollHeight;
                }

                const match = text.match(/(\d+(\.\d+)?)%/);
                if (match && barFill) barFill.style.width = match[1] + '%';
            }

            if (evt.detail.action == 'exit') {
                const code = evt.detail.data;
                if (logEl) logEl.textContent += `\nProcess exited with code ${code}`;

                // Clean up listener to prevent memory leaks
                try {
                    Neutralino.events.off('spawnedProcess', onSpawnedDownload);
                } catch (e) {}

                const logContent = logEl ? (logEl.textContent || '') : '';
                const isAlreadyDownloaded = /has already been downloaded|already in target format/i.test(logContent);

                // Parse the destination from the complete log (not per chunk):
                // a long non-ASCII path can be split across output chunks.
                panelDestination = extractDestinationPath(logContent) || panelDestination;

                if (code === 0 || isAlreadyDownloaded) {
                    if (barFill) barFill.style.width = '100%';
                    if (cancelBtn) cancelBtn.classList.add('hidden');
                    if (closeBtn) closeBtn.classList.remove('hidden');

                    setTimeout(() => {
                        removePanel(panel);
                        if (typeof playClickSound === 'function') playClickSound();
                        
                        let histTitle = (typeof currentData !== 'undefined' && currentData && currentData.title) ? currentData.title : null;
                        if (histTitle && typeof selectedVideoId !== 'undefined' && selectedVideoId) {
                            let vFmt = (typeof formats !== 'undefined' && formats) ? formats.find(f => f.format_id === selectedVideoId) : null;
                            if (vFmt) {
                                let res = (typeof getNormalizedResolution === 'function') ? getNormalizedResolution(vFmt) : (vFmt.height ? `${vFmt.height}p` : '');
                                if (res && res !== 'Unknown') histTitle += ` [${res}]`;
                            }
                        }

                        if (!histTitle && panelDestination) {
                            const base = panelDestination.replace(/\\/g, '/').split('/').pop() || '';
                            histTitle = base.replace(/\.[^.]+$/, '');
                        }
                        
                        if (isAlreadyDownloaded) {
                            if (typeof showToast === 'function') {
                                showToast('Already Exists ⚠️', `${histTitle || 'File'} is already saved in target folder.`, {
                                    actionLabel: 'Open File',
                                    onAction: () => openFileLocation(panelDestination || (settings ? settings.downloadPath : null)),
                                    duration: 5000
                                });
                            }
                        } else {
                            if (typeof addNotif === 'function') addNotif(histTitle || 'Download', panelDestination || (settings ? settings.downloadPath : null));
                            if (typeof showToast === 'function') {
                                showToast('Download complete', histTitle || 'Your files are ready.', {
                                    actionLabel: 'Open File',
                                    onAction: () => {
                                        let p = panelDestination || (settings ? settings.downloadPath : null) || './Downloads';
                                        openFileLocation(p);
                                    },
                                    duration: 6000
                                });
                            }
                        }
                    }, 500);
                } else {
                    if (cancelBtn) cancelBtn.classList.add('hidden');
                    if (closeBtn) closeBtn.classList.remove('hidden');
                    if (el && el.statusMsg) el.statusMsg.textContent = 'Download failed';
                    if (typeof detectErrorFix === 'function' && detectErrorFix(logContent)) {
                        if (typeof showAlert === 'function') showAlert(logContent, 'Download Failed');
                    }
                }
            }
        };

        if (cancelBtn) {
            cancelBtn.addEventListener('click', async () => {
                if (!procPid) return;
                try {
                    let killCmd = window.NL_OS === 'Windows'
                        ? `taskkill /F /T /PID ${procPid}`
                        : `kill -9 ${procPid}`;
                    await Neutralino.os.execCommand(killCmd);
                    if (logEl) logEl.textContent += '\n\n[CANCELLED] Download cancelled by user.';
                    if (el && el.statusMsg) el.statusMsg.textContent = 'Download cancelled';
                } catch (err) {
                    console.error('Failed to cancel download:', err);
                    if (logEl) logEl.textContent += '\n\n[CANCELLED] Download process terminated.';
                } finally {
                    try {
                        Neutralino.events.off('spawnedProcess', onSpawnedDownload);
                    } catch (e) {}
                    if (cancelBtn) cancelBtn.classList.add('hidden');
                    if (closeBtn) closeBtn.classList.remove('hidden');
                }
            });
        }

        Neutralino.events.on('spawnedProcess', onSpawnedDownload);

    } catch (err) {
        if (logEl) logEl.textContent += `\nError launching process: ${err.message}`;
        if (cancelBtn) cancelBtn.classList.add('hidden');
        if (closeBtn) closeBtn.classList.remove('hidden');
    }
}

// Extract the final output path from a complete yt-dlp log.
// The last matching line wins (Destination → Merger/ExtractAudio/MoveFiles),
// so merged and audio-extracted downloads resolve to the real file.
function extractDestinationPath(logText) {
    if (!logText) return null;
    const patterns = [
        /\[download\]\s+Destination:\s+([^\r\n]+)/g,
        /\[Merger\]\s+Merging formats into "([^"]+)"/g,
        /\[ExtractAudio\]\s+Destination:\s+([^\r\n]+)/g,
        /\[MoveFiles\]\s+Moving file "[^"]+" to "([^"]+)"/g,
        /\[download\]\s+([^\r\n]+?)\s+has already been downloaded/g
    ];
    let best = null;
    patterns.forEach(re => {
        let m;
        while ((m = re.exec(logText))) {
            const p = (m[1] || '').trim().replace(/^"|"$/g, '');
            if (p && (!best || m.index > best.index)) best = { index: m.index, path: p };
        }
    });
    return best ? best.path : null;
}

// Windows: `explorer /select` always spawns a brand-new window, even when the
// folder is already open in Explorer. So we drive Shell.Application through
// PowerShell to reuse an existing window on that folder (selecting the file and
// bringing the window forward) and only fall back to a new window when there is
// none. The script travels as Base64/UTF-16 so Arabic paths survive quoting.
function psSingleQuote(value) {
    return "'" + String(value == null ? '' : value).replace(/'/g, "''") + "'";
}

function encodePowershellScript(script) {
    let binary = '';
    for (let i = 0; i < script.length; i++) {
        const code = script.charCodeAt(i);
        binary += String.fromCharCode(code & 0xff, (code >> 8) & 0xff);
    }
    return btoa(binary);
}

function buildWindowsRevealCommand(filePath, dirPath) {
    const lines = [
        "$ErrorActionPreference='SilentlyContinue'",
        '$d=' + psSingleQuote(dirPath),
        '$t=' + psSingleQuote(filePath || ''),
        '$ok=$false',
        'try{',
        '  $sh=New-Object -ComObject Shell.Application',
        '  foreach($w in $sh.Windows()){',
        '    try{',
        '      $p=$w.Document.Folder.Self.Path',
        "      if($p -and ($p.TrimEnd('\\') -ieq $d.TrimEnd('\\'))){",
        '        $w.Visible=$true',
        '        if($t){try{$i=$w.Document.Folder.ParseName([IO.Path]::GetFileName($t));if($i){$w.Document.SelectItem($i,29)}}catch{}}',
        '        try{Add-Type -AssemblyName Microsoft.VisualBasic;[Microsoft.VisualBasic.Interaction]::AppActivate([int]$w.HWND)|Out-Null}catch{}',
        '        $ok=$true',
        '        break',
        '      }',
        '    }catch{}',
        '  }',
        '}catch{}',
        'if(-not $ok){',
        "  if($t){Start-Process explorer.exe -ArgumentList ('/select,\"'+$t+'\"')}",
        "  else{Start-Process explorer.exe -ArgumentList ('\"'+$d+'\"')}",
        '}'
    ];
    return 'powershell -NoProfile -NonInteractive -WindowStyle Hidden -EncodedCommand '
        + encodePowershellScript(lines.join('\n'));
}

async function openFileLocation(targetPath) {
    if (!targetPath) return;

    const isWindows = window.NL_OS === 'Windows';
    const sep = isWindows ? '\\' : '/';
    const normalize = (p) => {
        const s = String(p || '').trim();
        return isWindows ? s.replace(/\//g, '\\') : s.replace(/\\/g, '/');
    };
    const parentOf = (p) => String(p).replace(/[\\/][^\\/]+$/, '');
    const baseName = (p) => String(p).split(/[\\/]/).pop() || '';

    let resolved = normalize(targetPath);
    const isAbsolute = isWindows
        ? /^(?:[a-zA-Z]:[\\/]|\\\\)/.test(resolved)
        : resolved.startsWith('/');

    const configuredBase = (typeof settings !== 'undefined' && settings && settings.downloadPath)
        ? normalize(settings.downloadPath).replace(/[\\/]+$/, '')
        : '';

    if (!isAbsolute && configuredBase) {
        const baseLabel = baseName(configuredBase);
        let rel = resolved.replace(/^[\\/]+/, '');
        // Avoid "Downloads\Downloads\file" when yt-dlp already reported a path
        // relative to its own output folder.
        if (baseLabel && rel.toLowerCase().startsWith(baseLabel.toLowerCase() + sep)) {
            rel = rel.slice(baseLabel.length + 1);
        }
        resolved = configuredBase + sep + rel;
    }

    const stat = async (p) => {
        try {
            const s = await Neutralino.filesystem.getStats(p);
            return { exists: true, isDir: !!s.isDirectory, isFile: !!s.isFile };
        } catch (e) {
            return { exists: false, isDir: false, isFile: false };
        }
    };

    let filePath = null;
    let dirPath = resolved;
    const info = await stat(resolved);

    if (info.exists && info.isFile) {
        filePath = resolved;
        dirPath = parentOf(resolved);
    } else if (!info.exists) {
        // Stale history entry / renamed file: open the nearest existing folder
        // instead of letting Explorer fall back to "This PC".
        dirPath = parentOf(resolved);
        let guard = 0;
        while (dirPath && guard++ < 8) {
            const d = await stat(dirPath);
            if (d.exists && d.isDir) break;
            const parent = parentOf(dirPath);
            if (!parent || parent === dirPath) { dirPath = ''; break; }
            dirPath = parent;
        }
        if (!dirPath) dirPath = configuredBase;
    }

    if (!dirPath) {
        if (typeof showStatus === 'function') showStatus('Folder not found', 'error');
        return;
    }

    let openCmd = '';
    if (isWindows) {
        // Try to reveal inside an existing Explorer window first.
        let revealed = false;
        try {
            const result = await Neutralino.os.execCommand(buildWindowsRevealCommand(filePath, dirPath));
            revealed = !!(result && result.exitCode === 0);
        } catch (e) {
            revealed = false;
        }
        if (revealed) return;
        openCmd = filePath ? `explorer /select,"${filePath}"` : `explorer "${dirPath}"`;
    } else if (window.NL_OS === 'Darwin') {
        openCmd = filePath ? `open -R "${filePath}"` : `open "${dirPath}"`;
    } else {
        openCmd = `xdg-open "${dirPath}"`;
    }

    try {
        await Neutralino.os.execCommand(openCmd);
    } catch (e) {
        console.warn('Failed to open file location:', e);
        if (typeof showStatus === 'function') showStatus('Could not open folder', 'error');
    }
}

function removePanel(panel) {
    if (!panel || !panel.parentNode) return;
    panel.classList.remove('show');
    setTimeout(() => { try { panel.remove(); } catch (e) { } }, 260);
}

async function copyDirectLink(formatId, btnElement) {
    const rawUrl = el.urlInput ? el.urlInput.value.trim() : '';
    if (!rawUrl) return;

    const spinIcon = `<svg class="svg-icon anim-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>`;
    const checkIcon = `<svg class="svg-icon check-draw" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    const failIcon = `<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

    // Change button state to loading
    const originalHTML = btnElement.innerHTML;
    const originalTitle = btnElement.title;
    btnElement.innerHTML = spinIcon;
    btnElement.title = 'Fetching...';
    btnElement.disabled = true;

    try {
        if (!currentData || !currentData.formats) {
            throw new Error("No data available");
        }

        const fmt = currentData.formats.find(f => f.format_id === formatId);
        if (fmt && fmt.url) {
            await Neutralino.clipboard.writeText(fmt.url);

            // Show success
            btnElement.innerHTML = checkIcon;
            btnElement.title = 'Copied!';
            setTimeout(() => {
                btnElement.innerHTML = originalHTML;
                btnElement.title = originalTitle;
                btnElement.disabled = false;
            }, 2000);
        } else {
            throw new Error("Direct URL not found in metadata");
        }
    } catch (e) {
        console.error("Error copying link from cache:", e);
        // Fallback or show error
        btnElement.innerHTML = failIcon;
        btnElement.title = 'Failed to copy';
        setTimeout(() => {
            btnElement.innerHTML = originalHTML;
            btnElement.title = originalTitle;
            btnElement.disabled = false;
        }, 2000);
    }
}