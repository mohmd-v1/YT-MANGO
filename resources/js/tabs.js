let tabCount = 0;
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
    const titlebarDragArea = document.getElementById("titlebar-drag-area");

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
    Neutralino.storage.getData('yt_dlp_settings').then(data => {
        const settings = JSON.parse(data);
        if (settings.theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else if (settings.theme === 'system') {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
                document.documentElement.setAttribute('data-theme', 'light');
            }
        }
    }).catch(() => { /* ignore */ });

    // Tabs Management
    newTabBtn.addEventListener("click", () => createNewTab());

    // Create first tab
    createNewTab();
});

function createNewTab() {
    tabCount++;
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

    // Event Listeners
    tabBtn.addEventListener("click", (e) => {
        if (!e.target.closest('.browser-tab-close')) {
            switchToTab(tabId);
        }
    });

    const closeBtn = tabBtn.querySelector(".browser-tab-close");
    closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeTab(tabId);
    });

    // Append elements
    tabsList.appendChild(tabBtn);
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
        const nextTab = tabBtn.nextElementSibling || tabBtn.previousElementSibling;
        if (nextTab) {
            const nextTabId = nextTab.id.replace('btn-', '');
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

// Allow the iframe to update the tab title
window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'UPDATE_TAB_TITLE') {
        // Find which iframe sent this
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
    }
});
