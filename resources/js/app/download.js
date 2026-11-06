// Download execution (panel system, cancel, copy direct link).
// (extracted from resources/js/main.js — keep in sync with load order in app.html)


el.downloadBtn.addEventListener('click', startDownload);

function closeModal() {
    el.modal.self.classList.add('hidden');
    el.modal.log.textContent = '';
    el.modal.bar.style.width = '0%';
    el.modal.close.classList.add('hidden');
    el.modal.open.classList.add('hidden');
    el.modal.cancel.classList.add('hidden');

    // Reset view to processing
    el.modal.processing.classList.remove('hidden');
    el.modal.success.classList.add('hidden');

    // Kill process if still running
    if (currentDownloadProcess) {
        currentDownloadProcess = null;
    }
}

el.modal.close.addEventListener('click', closeModal);

el.modal.cancel.addEventListener('click', async () => {
    if (currentDownloadProcessPid) {
        try {
            // Kill yt-dlp and all child processes
            let killCmd = window.NL_OS === 'Windows'
                ? `taskkill /F /T /PID ${currentDownloadProcessPid}`
                : `kill -9 ${currentDownloadProcessPid}`;
            await Neutralino.os.execCommand(killCmd);

            el.modal.log.textContent += '\n\n[CANCELLED] Download cancelled by user.';
            el.statusMsg.textContent = 'Download cancelled';
            currentDownloadProcess = null;
            currentDownloadProcessPid = null;

            // Show close button
            el.modal.cancel.classList.add('hidden');
            el.modal.close.classList.remove('hidden');
        } catch (err) {
            console.error('Failed to cancel download:', err);
            // Even if taskkill fails, still update UI
            el.modal.log.textContent += '\n\n[CANCELLED] Download process terminated.';
            currentDownloadProcess = null;
            currentDownloadProcessPid = null;
            el.modal.cancel.classList.add('hidden');
            el.modal.close.classList.remove('hidden');
        }
    }
});

el.modal.open.addEventListener('click', async () => {
    let path = settings.downloadPath;
    if (!path || path === 'Downloads') {
        try {
            path = await Neutralino.os.getPath('downloads');
        } catch (e) {
            path = './Downloads';
        }
    }
    try {
        let openCmd = '';
        if (window.NL_OS === 'Windows') {
            let winPath = path.replace(/\//g, '\\');
            openCmd = `explorer "${winPath}"`;
        } else if (window.NL_OS === 'Darwin') {
            openCmd = `open "${path}"`;
        } else {
            openCmd = `xdg-open "${path}"`;
        }
        await Neutralino.os.execCommand(openCmd);
    } catch (err) {
        console.error("Failed to open folder:", err);
    }
});

async function startDownload() {
    if (!el.cmdPreview.value) return;

    const panelsContainer = document.getElementById('downloadPanels');
    const panel = document.createElement('div');
    panel.className = 'download-panel';
    panel.innerHTML = `
        <div class="dp-header">
            <div class="dp-title">Downloading...</div>
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

    toggleBtn.addEventListener('click', () => {
        logEl.classList.toggle('expanded');
        toggleBtn.textContent = logEl.classList.contains('expanded') ? 'Hide' : 'Details';
    });
    closeBtn.addEventListener('click', () => removePanel(panel));

    el.statusMsg.textContent = 'Downloading...';

    let cmd = el.cmdPreview.value;

    try {
        let proc = await Neutralino.os.spawnProcess(cmd);
        currentDownloadProcess = proc.id;
        currentDownloadProcessPid = proc.pid;
        procPid = proc.pid;

        cancelBtn.addEventListener('click', async () => {
            if (!procPid) return;
            try {
                let killCmd = window.NL_OS === 'Windows'
                    ? `taskkill /F /T /PID ${procPid}`
                    : `kill -9 ${procPid}`;
                await Neutralino.os.execCommand(killCmd);
                logEl.textContent += '\n\n[CANCELLED] Download cancelled by user.';
                el.statusMsg.textContent = 'Download cancelled';
            } catch (err) {
                console.error('Failed to cancel download:', err);
                logEl.textContent += '\n\n[CANCELLED] Download process terminated.';
            } finally {
                cancelBtn.classList.add('hidden');
                closeBtn.classList.remove('hidden');
            }
        });

        Neutralino.events.on('spawnedProcess', (evt) => {
            if (evt.detail.id != proc.id) return;
            if (evt.detail.action == 'stdOut' || evt.detail.action == 'stdErr') {
                const text = evt.detail.data;
                logEl.textContent += text;
                logEl.scrollTop = logEl.scrollHeight;

                const match = text.match(/(\d+(\.\d+)?)%/);
                if (match) barFill.style.width = match[1] + '%';

                const destMatch = text.match(/\[download\]\s+Destination:\s+(.+)/);
                if (destMatch) panelDestination = destMatch[1].trim();
            }
            if (evt.detail.action == 'exit') {
                const code = evt.detail.data;
                logEl.textContent += `\nProcess exited with code ${code}`;

                if (code === 0) {
                    barFill.style.width = '100%';
                    cancelBtn.classList.add('hidden');
                    closeBtn.classList.remove('hidden');

                    setTimeout(() => {
                        removePanel(panel);
                        playClickSound();
                        let histTitle = (typeof currentData !== 'undefined' && currentData && currentData.title) ? currentData.title : null;
                        if (!histTitle && panelDestination) {
                            const base = panelDestination.replace(/\\/g, '/').split('/').pop() || '';
                            histTitle = base.replace(/\.[^.]+$/, '');
                        }
                        addNotif(histTitle || 'Download');
                        showToast('Download complete', histTitle || 'Your files are ready.', {
                            actionLabel: 'Open Folder',
                            onAction: () => {
                                let p = settings.downloadPath;
                                if (!p || p === 'Downloads') {
                                    Neutralino.os.getPath('downloads').then(x => { p = x; }).catch(() => { p = './Downloads'; });
                                }
                                let openCmd = '';
                                if (window.NL_OS === 'Windows') openCmd = `explorer "${String(p).replace(/\//g, '\\')}"`;
                                else if (window.NL_OS === 'Darwin') openCmd = `open "${p}"`;
                                else openCmd = `xdg-open "${p}"`;
                                Neutralino.os.execCommand(openCmd).catch(() => {});
                            },
                            duration: 6000
                        });
                    }, 500);
                } else {
                    cancelBtn.classList.add('hidden');
                    closeBtn.classList.remove('hidden');
                    el.statusMsg.textContent = 'Download failed';
                    const logContent = logEl.textContent || '';
                    const hasFix = detectErrorFix(logContent);
                    if (hasFix) showAlert(logContent, 'Download Failed');
                }
            }
        });
    } catch (err) {
        logEl.textContent += `\nError launching process: ${err.message}`;
        cancelBtn.classList.add('hidden');
        closeBtn.classList.remove('hidden');
    }
}

function removePanel(panel) {
    if (!panel || !panel.parentNode) return;
    panel.classList.remove('show');
    setTimeout(() => { try { panel.remove(); } catch (e) { } }, 260);
}

async function copyDirectLink(formatId, btnElement) {
    const url = el.urlInput.value.trim();
    if (!url) return;

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
        // Since we used -J, all formats with their direct URLs are already in currentData
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


