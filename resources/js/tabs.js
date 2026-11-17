let activeTabId = null;

// Initialize Neutralino
Neutralino.init();

document.addEventListener("DOMContentLoaded", () => {
    // Window Controls
    const minimizeBtn = document.getElementById("minimize-btn");
    const maximizeBtn = document.getElementById("maximize-btn");
    const closeBtn = document.getElementById("close-btn");
    const maximizeIcon = document.getElementById("maximize-icon");
    const newTabBtn = document.getElementById("newTabBtn");

    minimizeBtn.addEventListener("click", async () => {
        await Neutralino.window.minimize();
    });

    maximizeBtn.addEventListener("click", async () => {
        const maximized = await Neutralino.window.isMaximized();
        if (maximized) {
            await Neutralino.window.unmaximize();
        } else {
            await Neutralino.window.maximize();
        }
        updateMaximizeIcon();
    });

    closeBtn.addEventListener("click", async () => {
        await Neutralino.app.exit();
    });

    async function updateMaximizeIcon() {
        const maximized = await Neutralino.window.isMaximized();
        if (maximized) {
            maximizeIcon.innerHTML = ` <path d="M8 8h10v10"/> <path d="M6 6h10v10"/> `;
        } else {
            maximizeIcon.innerHTML = ` <rect x="5" y="5" width="14" height="14" rx="1" /> `;
        }
    }

    Neutralino.window.setDraggableRegion("titlebar-drag-area");
    Neutralino.events.on("windowMaximize", updateMaximizeIcon);
    Neutralino.events.on("windowRestore", updateMaximizeIcon);

    // Initial state
    updateMaximizeIcon();

    // Workaround for resize borders
    Neutralino.window.getSize().then(currentSize => {
        Neutralino.window.setSize(currentSize);
    }).catch(e => console.error(e));

    // Theme Management from storage
    function applyShellTheme(theme) {
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else if (theme === 'system') {
            document.documentElement.setAttribute('data-theme',
                window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
        }
    }

    let shellSettings = null;
    Neutralino.storage.getData('yt_dlp_settings').then(data => {
        shellSettings = JSON.parse(data);
        applyShellTheme(shellSettings?.theme);
    }).catch(() => { /* ignore */ });

    // Watch for system theme changes
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
        if (!shellSettings || shellSettings.theme === 'system') applyShellTheme('system');
    });

    // Live theme sync: a tab broadcasts its theme change to the shell,
    // and the shell forwards it to every other open tab
    window.addEventListener('message', (e) => {
        const theme = e.data && e.data.theme;
        if (e.data && e.data.type === 'theme-change' && typeof theme === 'string') {
            applyShellTheme(theme);
            document.querySelectorAll('.tab-iframe').forEach(frame => {
                try { frame.contentWindow.postMessage({ type: 'theme-change', theme: theme }, '*'); } catch (err) { }
            });
        }
    });

    // Tabs Management
    newTabBtn.addEventListener("click", () => createNewTab());

    // Drag and Drop URL onto New Tab Button (+): creates new tab and loads URL
    newTabBtn.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.stopPropagation();
        newTabBtn.classList.add("drag-over-target");
    });

    newTabBtn.addEventListener("dragleave", (e) => {
        e.preventDefault();
        e.stopPropagation();
        newTabBtn.classList.remove("drag-over-target");
    });

    newTabBtn.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        newTabBtn.classList.remove("drag-over-target");
        const data = e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("text/uri-list");
        if (data) {
            const url = data.split("\n")[0].trim();
            if (url) {
                createNewTab(url);
            }
        }
    });

    // Browser Keyboard Shortcuts (customizable, fallback to Ctrl+T / Ctrl+W) on the main shell window
    window.addEventListener("keydown", (e) => {
        const newTabSc = shellSettings?.shortcuts?.newTab || 'Ctrl+KeyT';
        const closeTabSc = shellSettings?.shortcuts?.closeTab || 'Ctrl+KeyW';

        if (typeof matchShortcut === 'function') {
            if (matchShortcut(e, newTabSc)) {
                e.preventDefault();
                createNewTab();
                return;
            }
            if (matchShortcut(e, closeTabSc)) {
                e.preventDefault();
                if (activeTabId) {
                    closeTab(activeTabId);
                }
                return;
            }
        } else {
            // Fallback using physical code
            if (e.ctrlKey || e.metaKey) {
                if (e.code === 'KeyT') {
                    e.preventDefault();
                    createNewTab();
                } else if (e.code === 'KeyW') {
                    e.preventDefault();
                    if (activeTabId) {
                        closeTab(activeTabId);
                    }
                }
            }
        }
    });

    // Create first tab
    createNewTab();
});

function createNewTab(initialUrl = '') {
    const tabId = `tab-${Date.now()}`;

    // Create Tab Button
    const tabsList = document.getElementById("tabsList");
    const tabBtn = document.createElement("div");
    tabBtn.className = "browser-tab";
    tabBtn.id = `btn-${tabId}`;
    tabBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"/>
            <polygon fill="currentColor" points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>
        </svg>
        <span class="browser-tab-title">New Tab</span>
        <div class="browser-tab-close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </div>
    `;

    // Create Iframe
    const iframesContainer = document.getElementById("tabIframes");
    const iframe = document.createElement("iframe");
    iframe.src = "app.html";
    iframe.className = "tab-iframe";
    iframe.id = `iframe-${tabId}`;

    // If an initial URL is passed, send it to the iframe once it finishes loading
    if (initialUrl) {
        iframe.addEventListener("load", () => {
            try {
                iframe.contentWindow.postMessage({ type: 'LOAD_URL', url: initialUrl }, '*');
            } catch (err) { }
        }, { once: true });
    }

    // Drag-over Tab behavior: dragging a link onto a tab immediately activates it!
    tabBtn.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.stopPropagation();
        tabBtn.classList.add("drag-over-target");
        // Automatically switch to this tab when hovering with a dragged item
        switchToTab(tabId);
    });

    tabBtn.addEventListener("dragleave", (e) => {
        e.preventDefault();
        e.stopPropagation();
        tabBtn.classList.remove("drag-over-target");
    });

    tabBtn.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        tabBtn.classList.remove("drag-over-target");
        const data = e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("text/uri-list");
        if (data) {
            const url = data.split("\n")[0].trim();
            if (url) {
                switchToTab(tabId);
                try {
                    iframe.contentWindow.postMessage({ type: 'LOAD_URL', url }, '*');
                } catch (err) { }
            }
        }
    });

    // Event Listeners
    tabBtn.addEventListener("click", (e) => {
        if (!e.target.closest('.browser-tab-close')) {
            switchToTab(tabId);
        }
    });

    // Middle-click (scroll-wheel click) to close tab
    tabBtn.addEventListener("auxclick", (e) => {
        if (e.button === 1) { // 1 = middle mouse button
            e.preventDefault();
            e.stopPropagation();
            closeTab(tabId);
        }
    });

    const closeBtn = tabBtn.querySelector(".browser-tab-close");
    closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeTab(tabId);
    });

    // Append elements (insert tab before the new tab button)
    const newTabButton = document.getElementById("newTabBtn");
    tabsList.insertBefore(tabBtn, newTabButton);
    iframesContainer.appendChild(iframe);

    // Switch to new tab
    switchToTab(tabId);
}

function switchToTab(tabId) {
    if (activeTabId === tabId) return;

    // Deactivate current
    if (activeTabId) {
        const currBtn = document.getElementById(`btn-${activeTabId}`);
        const currIframe = document.getElementById(`iframe-${activeTabId}`);
        if (currBtn) currBtn.classList.remove("active");
        if (currIframe) currIframe.classList.remove("active");
    }

    // Activate new
    const newBtn = document.getElementById(`btn-${tabId}`);
    const newIframe = document.getElementById(`iframe-${tabId}`);
    if (newBtn) newBtn.classList.add("active");
    if (newIframe) newIframe.classList.add("active");

    activeTabId = tabId;
}

function closeTab(tabId) {
    const tabBtn = document.getElementById(`btn-${tabId}`);
    const tabIframe = document.getElementById(`iframe-${tabId}`);

    if (!tabBtn || !tabIframe) return;

    // Determine which tab to switch to if we're closing the active one
    if (activeTabId === tabId) {
        let fallbackTab = tabBtn.previousElementSibling;
        if (!fallbackTab || !fallbackTab.classList.contains('browser-tab')) {
            fallbackTab = tabBtn.nextElementSibling;
        }
        if (fallbackTab && fallbackTab.classList.contains('browser-tab')) {
            const nextTabId = fallbackTab.id.replace('btn-', '');
            switchToTab(nextTabId);
        } else {
            activeTabId = null; // No tabs left
        }
    }

    tabBtn.remove();
    tabIframe.remove();

    // If all tabs are closed, maybe open a new one or close the app
    const remainingTabs = document.querySelectorAll('.browser-tab');
    if (remainingTabs.length === 0) {
        Neutralino.app.exit();
    }
}

// Message Handler (Title updates, Tab commands from inside iframes)
window.addEventListener('message', (e) => {
    if (!e.data) return;

    if (e.data.type === 'UPDATE_TAB_TITLE') {
        const iframes = document.querySelectorAll('.tab-iframe');
        iframes.forEach(iframe => {
            if (iframe.contentWindow === e.source) {
                const tabId = iframe.id.replace('iframe-', '');
                const titleEl = document.querySelector(`#btn-${tabId} .browser-tab-title`);
                if (titleEl) {
                    titleEl.textContent = e.data.title || 'YT-DLP';
                }
            }
        });
    } else if (e.data.type === 'NEW_TAB') {
        createNewTab(e.data.url || '');
    } else if (e.data.type === 'CLOSE_TAB') {
        if (activeTabId) {
            closeTab(activeTabId);
        }
    } else if (e.data.type === 'SYNC_SHORTCUTS' && e.data.shortcuts) {
        if (!shellSettings) shellSettings = {};
        shellSettings.shortcuts = e.data.shortcuts;
    }
});
