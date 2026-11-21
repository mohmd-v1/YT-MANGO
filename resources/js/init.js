// App bootstrap: Neutralino init, protocol handler, shortcuts, drag & drop.
// (extracted from resources/js/main.js — keep in sync with load order in app.html)

// Init
// Event Listeners
Neutralino.events.on("windowClose", () => {
    Neutralino.app.exit();
});

// Protocol Handler Logic (Moved here to ensure registration before init if possible, but init should be last)
Neutralino.events.on("ready", async () => {
    // Focus the window when app becomes ready
    try {
        await Neutralino.window.focus();
    } catch (e) { }

    if (window.NL_ARGS && window.NL_ARGS.length > 0) {
        for (const arg of window.NL_ARGS) {

            if (arg.startsWith("ytdlp://")) {

                let url = arg
                    .replace("ytdlp://", "")
                    .replace("ytdlp:", "");

                // Decode URL
                try {
                    url = decodeURIComponent(url);
                } catch (e) { }

                if (url) {
                    el.urlInput.value = url;
                    await analyzeUrl();
                }
            }
        }
    }

    await loadSettings();

    // Tools must be checked after the (single) settings load so the install
    // modal and version labels use the persisted configuration.
    await ensureToolsInstalled();
});

// Listen for external URL load requests (e.g. from tab drag & drop or new tab creations)
window.addEventListener('message', async (e) => {
    if (e.data && e.data.type === 'LOAD_URL' && e.data.url) {
        if (el && el.urlInput) {
            el.urlInput.value = e.data.url.trim();
            if (typeof analyzeUrl === 'function') {
                await analyzeUrl();
            }
        }
    }
});

window.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    document.body.classList.add('drag-active');

    // Remove specific highlight from both
    el.analyzePlaylistBtn.classList.remove('drag-over-target');
    el.quickM4aBtn.classList.remove('drag-over-target');

    if (e.target.closest('#analyzePlaylistBtn')) {
        el.analyzePlaylistBtn.classList.add('drag-over-target');
    } else if (e.target.closest('#quickM4aBtn')) {
        el.quickM4aBtn.classList.add('drag-over-target');
    }
});

window.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.relatedTarget === null || e.relatedTarget === document.documentElement) {
        document.body.classList.remove('drag-active');
        el.analyzePlaylistBtn.classList.remove('drag-over-target');
        el.quickM4aBtn.classList.remove('drag-over-target');
    }
});

window.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();

    document.body.classList.remove('drag-active');
    el.analyzePlaylistBtn.classList.remove('drag-over-target');
    el.quickM4aBtn.classList.remove('drag-over-target');

    const data = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text/uri-list');
    if (data) {
        const lines = data.split('\n');
        const url = lines[0].trim();

        if (url) {
            el.urlInput.value = url;

            if (e.target.closest('#quickM4aBtn')) {
                quickM4a();
            } else if (e.target.closest('#analyzePlaylistBtn')) {
                analyzePlaylist();
            } else {
                analyzeUrl();
            }
        }
    }
});


// Call init at the end or here
Neutralino.init();


// Event Listeners
el.analyzeBtn.addEventListener('click', () => analyzeUrl());
el.analyzePlaylistBtn.addEventListener('click', () => analyzePlaylist());
el.quickM4aBtn.addEventListener('click', quickM4a);
el.urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') analyzeUrl();
});

el.tabs.forEach(btn => {
    btn.addEventListener('click', () => {
        el.tabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeTab = btn.dataset.tab;

        // Show/hide view containers
        if (activeTab === 'combined') {
            el.dualView.classList.remove('hidden');
            el.standardView.classList.add('hidden');
        } else {
            el.dualView.classList.add('hidden');
            el.standardView.classList.remove('hidden');
        }

        renderGrid();
    });
});

el.toggleSettings.addEventListener('click', () => {
    el.settingsModal.classList.toggle('hidden');
});

el.closeSettingsBtn.addEventListener('click', () => {
    el.settingsModal.classList.add('hidden');
});

el.toggleCommand.addEventListener('click', () => {
    el.commandModal.classList.toggle('hidden');
});

el.closeCommandBtn.addEventListener('click', () => {
    el.commandModal.classList.add('hidden');
});

// Image Viewer Modal Listeners
if (el.thumbnailWrapper) {
    el.thumbnailWrapper.addEventListener('click', () => {
        if (!currentData || el.thumbnailWrapper.classList.contains('no-thumb')) return;
        const best = (typeof getHighestResThumbnail === 'function')
            ? getHighestResThumbnail(currentData)
            : { url: currentData.thumbnail, label: 'HD' };

        if (!best.url) return;

        if (el.imageViewerImg) el.imageViewerImg.src = best.url;
        if (el.imageViewerResBadge) el.imageViewerResBadge.textContent = best.label || 'HD';
        if (el.imageViewerModal) el.imageViewerModal.classList.remove('hidden');
    });
}

if (el.closeImageViewerBtn) {
    el.closeImageViewerBtn.addEventListener('click', () => {
        if (el.imageViewerModal) el.imageViewerModal.classList.add('hidden');
    });
}

if (el.imageViewerModal) {
    el.imageViewerModal.addEventListener('click', (e) => {
        if (e.target === el.imageViewerModal) {
            el.imageViewerModal.classList.add('hidden');
        }
    });
}

if (el.downloadThumbnailBtn) {
    el.downloadThumbnailBtn.addEventListener('click', async () => {
        if (!currentData) return;
        const best = (typeof getHighestResThumbnail === 'function')
            ? getHighestResThumbnail(currentData)
            : { url: currentData.thumbnail };

        if (!best.url) {
            showAlert('No thumbnail image available to download.', 'Download Error');
            return;
        }

        const safeTitle = (currentData.title || 'thumbnail').replace(/[\\/:*?"<>|]/g, '_').substring(0, 80);
        let ext = 'jpg';
        if (best.url.includes('.webp')) ext = 'webp';
        else if (best.url.includes('.png')) ext = 'png';

        const defaultFileName = `${safeTitle}_thumbnail.${ext}`;

        try {
            const savePath = await Neutralino.os.showSaveDialog('Save Thumbnail Image', {
                defaultPath: defaultFileName,
                filters: [
                    { name: 'Image Files', extensions: [ext, 'jpg', 'png', 'webp'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });

            if (!savePath) return; // User cancelled

            const origHtml = el.downloadThumbnailBtn.innerHTML;
            el.downloadThumbnailBtn.disabled = true;
            el.downloadThumbnailBtn.innerHTML = `Downloading...`;

            // Download using powershell / curl safely
            const cmd = window.NL_OS === 'Windows'
                ? `powershell -Command "Invoke-WebRequest -Uri '${best.url}' -OutFile ${escapeCmdArg(savePath)}"`
                : `curl -s -L -o ${escapeCmdArg(savePath)} "${best.url}"`;

            const res = await Neutralino.os.execCommand(cmd);

            el.downloadThumbnailBtn.disabled = false;
            el.downloadThumbnailBtn.innerHTML = origHtml;

            if (res.exitCode === 0) {
                if (typeof showToast === 'function') {
                    showToast('Thumbnail saved successfully!', 'success');
                } else {
                    showAlert('Thumbnail saved successfully!', 'Saved');
                }
            } else {
                showAlert('Failed to download thumbnail: ' + (res.stdErr || 'Unknown error'), 'Error');
            }
        } catch (err) {
            console.error('Save thumbnail error:', err);
            if (el.downloadThumbnailBtn) {
                el.downloadThumbnailBtn.disabled = false;
            }
        }
    });
}

const openGithubBtn = document.getElementById('openGithubBtn');
if (openGithubBtn) {
    openGithubBtn.addEventListener('click', () => {
        Neutralino.os.open('https://github.com/mohmd-v1/yt-dlp-gui');
    });
}

if (el && el.openGithubAboutBtn) {
    el.openGithubAboutBtn.addEventListener('click', () => {
        Neutralino.os.open('https://github.com/mohmd-v1/yt-dlp-gui');
    });
}


/* =========================================================
   CUSTOM WINDOW CONTROLS (Handled by tabs shell now)
========================================================= */
// Instead of managing minimize/maximize here, we just update the tab title
function updateTabTitle(title) {
    if (window.parent !== window) {
        window.parent.postMessage({ type: 'UPDATE_TAB_TITLE', title: title }, '*');
    }
}

/* =========================================================
   DRAG AND DROP SUPPORT FOR URLs
========================================================= */
document.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (el.emptyState && !el.emptyState.classList.contains("hidden")) {
        el.emptyState.style.opacity = "0.7";
    }
});

document.addEventListener("dragleave", (e) => {
    e.preventDefault();
    if (el.emptyState) el.emptyState.style.opacity = "1";
});

// Settings are loaded exactly once, from the Neutralino "ready" handler above,
// right before ensureToolsInstalled() runs.