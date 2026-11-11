// App bootstrap: Neutralino init, protocol handler, shortcuts, drag & drop.
// (extracted from resources/js/main.js — keep in sync with load order in app.html)

// Init
// Event Listeners
Neutralino.events.on("windowClose", () => {
    Neutralino.app.exit();
});

// Protocol Handler Logic (Moved here to ensure registration before init if possible, but init should be last)
Neutralino.events.on("ready", async () => {

    // ==========================================
    // Windows Scaling Fix
    // ==========================================
    try {
        const baseWidth = 920;
        const baseHeight = 700;

        // Windows display scaling
        const scale = window.devicePixelRatio || 1;

        // Calculate window size according to scaling
        const targetWidth = Math.round(baseWidth * scale);
        const targetHeight = Math.round(baseHeight * scale);

        await Neutralino.window.setSize({
            width: targetWidth,
            height: targetHeight
        });

        console.log(
            `Windows Scaling: ${Math.round(scale * 100)}%`
        );

        console.log(
            `Window Size: ${targetWidth}x${targetHeight}`
        );

    } catch (error) {
        console.error("Scaling fix failed:", error);
    }


    // Focus the window when app becomes ready
    await Neutralino.window.focus();

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


// Float tabs on scroll
window.addEventListener('scroll', () => {
    const tabs = document.querySelector('.tabs');
    if (!tabs) return;

    // Check scroll position. 200px is roughly below the search input and video info
    if (window.scrollY > 700) {
        tabs.classList.add('tabs-floating');
    } else {
        tabs.classList.remove('tabs-floating');
    }
});


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