// Download execution (panel system, cancel, copy direct link).
// (extracted from resources/js/main.js — keep in sync with load order in app.html)

let lastDownloadedFilePath = null;

if (el && el.downloadBtn) {
    el.downloadBtn.addEventListener('click', startDownload);
}

function closeModal() {
    if (el && el.modal && el.modal.self) el.modal.self.classList.add('hidden');
    if (el && el.modal && el.modal.log) el.modal.log.textContent = '';
    if (el && el.modal && el.modal.bar) el.modal.bar.style.width = '0%';
    if (el && el.modal && el.modal.close) el.modal.close.classList.add('hidden');
    if (el && el.modal && el.modal.open) el.modal.open.classList.add('hidden');
    if (el && el.modal && el.modal.cancel) el.modal.cancel.classList.add('hidden');

    // Reset view to processing
    if (el && el.modal && el.modal.processing) el.modal.processing.classList.remove('hidden');
    if (el && el.modal && el.modal.success) el.modal.success.classList.add('hidden');

    // Reset reference
    if (typeof currentDownloadProcess !== 'undefined') {
        currentDownloadProcess = null;
    }
}

if (el && el.modal && el.modal.close) {
    el.modal.close.addEventListener('click', closeModal);
}

if (el && el.modal && el.modal.cancel) {
    el.modal.cancel.addEventListener('click', async () => {
        if (typeof currentDownloadProcessPid !== 'undefined' && currentDownloadProcessPid) {
            try {
                // Kill yt-dlp and all child processes
                let killCmd = window.NL_OS === 'Windows'
                    ? `taskkill /F /T /PID ${currentDownloadProcessPid}`
                    : `kill -9 ${currentDownloadProcessPid}`;
                await Neutralino.os.execCommand(killCmd);

                if (el.modal.log) el.modal.log.textContent += '\n\n[CANCELLED] Download cancelled by user.';
                if (el.statusMsg) el.statusMsg.textContent = 'Download cancelled';
                currentDownloadProcess = null;
                currentDownloadProcessPid = null;

                // Show close button
                el.modal.cancel.classList.add('hidden');
                el.modal.close.classList.remove('hidden');
            } catch (err) {
                console.error('Failed to cancel download:', err);
                if (el.modal.log) el.modal.log.textContent += '\n\n[CANCELLED] Download process terminated.';
                currentDownloadProcess = null;
                currentDownloadProcessPid = null;
                el.modal.cancel.classList.add('hidden');
                el.modal.close.classList.remove('hidden');
            }
        }
    });
}

if (el && el.modal && el.modal.open) {
    el.modal.open.addEventListener('click', async () => {
        let target = lastDownloadedFilePath || (settings ? settings.downloadPath : null) || 'Downloads';
        openFileLocation(target);
    });
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

                const destMatch = text.match(/\[download\]\s+Destination:\s+(.+)/) ||
                                  text.match(/\[Merger\]\s+Merging formats into "(.+)"/) ||
                                  text.match(/\[ExtractAudio\]\s+Destination:\s+(.+)/) ||
                                  text.match(/\[download\]\s+(.+?)\s+has already been downloaded/);
                if (destMatch) {
                    let rawDest = destMatch[1].trim().replace(/^"/, '').replace(/"$/, '');
                    if (rawDest) {
                        panelDestination = rawDest;
                        lastDownloadedFilePath = rawDest;
                    }
                }
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

function openFileLocation(targetPath) {
    if (!targetPath) return;

    let resolvedPath = String(targetPath).trim();
    // Check if absolute path (Windows "C:\" or UNC "\\", or Unix "/")
    const isAbsolute = /^(?:[a-zA-Z]:[\\/]|\\\\|[\\/])/.test(resolvedPath);
    if (!isAbsolute && typeof settings !== 'undefined' && settings && settings.downloadPath) {
        const base = String(settings.downloadPath).replace(/[\\/]+$/, '');
        const rel = resolvedPath.replace(/^[\\/]+/, '');
        resolvedPath = `${base}/${rel}`;
    }

    let openCmd = '';
    if (window.NL_OS === 'Windows') {
        let winPath = resolvedPath.replace(/\//g, '\\');
        // If path points to a file, use /select to highlight it
        if (/\.[a-zA-Z0-9]+$/.test(winPath)) {
            openCmd = `explorer /select,"${winPath}"`;
        } else {
            openCmd = `explorer "${winPath}"`;
        }
    } else if (window.NL_OS === 'Darwin') {
        let posixPath = resolvedPath.replace(/\\/g, '/');
        if (/\.[a-zA-Z0-9]+$/.test(posixPath)) {
            openCmd = `open -R "${posixPath}"`;
        } else {
            openCmd = `open "${posixPath}"`;
        }
    } else {
        let posixPath = resolvedPath.replace(/\\/g, '/');
        let dir = posixPath.includes('/') && /\.[a-zA-Z0-9]+$/.test(posixPath)
            ? posixPath.substring(0, posixPath.lastIndexOf('/'))
            : posixPath;
        openCmd = `xdg-open "${dir}"`;
    }
    Neutralino.os.execCommand(openCmd).catch(() => { });
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