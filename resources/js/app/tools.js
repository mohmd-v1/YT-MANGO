// yt-dlp / FFmpeg detection, install modal and update.
// (extracted from resources/js/main.js — keep in sync with load order in app.html)

let installTarget = 'ytdlp'; // 'ytdlp' or 'ffmpeg'


// Check YT-DLP Installation and Version
// Global cache helper across iframes/tabs
function getSharedCache() {
    try {
        if (window.parent && window.parent !== window) {
            if (!window.parent._toolCache) {
                window.parent._toolCache = {};
            }
            return window.parent._toolCache;
        }
    } catch (e) { }
    if (!window._toolCache) window._toolCache = {};
    return window._toolCache;
}


// Check Tools Installation
async function ensureToolsInstalled() {
    const hasYtdlp = await checkYtdlp();
    if (!hasYtdlp) {
        showInstallModal('ytdlp');
        return;
    }

    const hasFfmpeg = await checkFfmpeg();
    if (!hasFfmpeg) {
        showInstallModal('ffmpeg');
    }
}

async function checkYtdlp() {
    const cache = getSharedCache();
    if (cache.ytdlpVersion) {
        el.ytdlpVersionText.textContent = cache.ytdlpVersion;
        el.ytdlpVersionText.style.color = 'var(--success)';
        return true;
    }

    try {
        let output = await Neutralino.os.execCommand('yt-dlp --version');
        if (output.exitCode === 0) {
            const ver = `v${output.stdOut.trim()}`;
            el.ytdlpVersionText.textContent = ver;
            el.ytdlpVersionText.style.color = 'var(--success)';
            cache.ytdlpVersion = ver;
            return true;
        }
    } catch (err) { }
    return false;
}

async function checkFfmpeg() {
    const cache = getSharedCache();
    if (cache.ffmpegVersion) {
        el.ffmpegVersionText.textContent = cache.ffmpegVersion;
        el.ffmpegVersionText.style.color = cache.ffmpegVersion === 'Not Found' ? 'var(--danger)' : 'var(--success)';
        return cache.ffmpegVersion !== 'Not Found';
    }

    try {
        let output = await Neutralino.os.execCommand('ffmpeg -version');
        if (output.exitCode === 0) {
            // Parse version from "ffmpeg version 7.0.1..."
            const match = output.stdOut.match(/version\s+([^\s]+)/);
            const version = match ? match[1] : 'Installed';
            el.ffmpegVersionText.textContent = version;
            el.ffmpegVersionText.style.color = 'var(--success)';
            cache.ffmpegVersion = version;
            return true;
        }
    } catch (err) { }
    el.ffmpegVersionText.textContent = 'Not Found';
    el.ffmpegVersionText.style.color = 'var(--danger)';
    cache.ffmpegVersion = 'Not Found';
    return false;
}

function showInstallModal(target) {
    installTarget = target;
    el.install.modal.classList.remove('hidden');
    el.install.promptView.classList.remove('hidden');
    el.install.progressView.classList.add('hidden');

    if (target === 'ytdlp') {
        el.install.title.textContent = 'yt-dlp Required';
        if (window.NL_OS === 'Windows') {
            el.install.desc.textContent = "The core engine (yt-dlp) is missing. It's required to analyze and download videos. Download it now?";
            el.install.startBtn.textContent = "Download Now";
        } else {
            el.install.desc.textContent = "The core engine (yt-dlp) is missing. Automatic installation is only supported on Windows. Click 'Instructions' to see how to install it on " + window.NL_OS + ".";
            el.install.startBtn.textContent = "Instructions";
        }
        el.install.exitBtn.classList.remove('hidden');
        el.install.skipBtn.classList.add('hidden');
    } else {
        el.install.title.textContent = 'FFmpeg Recommended';
        if (window.NL_OS === 'Windows') {
            el.install.desc.textContent = "FFmpeg is missing. It is highly recommended for merging high-quality video and audio. Install it via Winget?";
            el.install.startBtn.textContent = "Install Now";
        } else {
            el.install.desc.textContent = "FFmpeg is missing. Automatic installation is only supported on Windows. Click 'Instructions' to see how to install it on " + window.NL_OS + ".";
            el.install.startBtn.textContent = "Instructions";
        }
        el.install.exitBtn.classList.add('hidden');
        el.install.skipBtn.classList.remove('hidden');
    }
}

// Install Modal Listeners
el.install.exitBtn.addEventListener('click', () => {
    Neutralino.app.exit();
});

el.install.skipBtn.addEventListener('click', () => {
    el.install.modal.classList.add('hidden');
});

el.install.startBtn.addEventListener('click', async () => {
    if (window.NL_OS !== 'Windows') {
        let msg = "";
        if (installTarget === 'ytdlp') {
            msg = window.NL_OS === 'Darwin'
                ? "To install yt-dlp on macOS, open Terminal and run:\n\nbrew install yt-dlp\n\nAfter installing, please restart the app."
                : "To install yt-dlp on Linux, open Terminal and run:\n\nsudo apt install yt-dlp\nor\npip install yt-dlp\n\nAfter installing, please restart the app.";
        } else {
            msg = window.NL_OS === 'Darwin'
                ? "To install FFmpeg on macOS, open Terminal and run:\n\nbrew install ffmpeg\n\nAfter installing, please restart the app."
                : "To install FFmpeg on Linux, open Terminal and run:\n\nsudo apt install ffmpeg\n\nAfter installing, please restart the app.";
        }
        await Neutralino.os.showMessageBox("Installation Instructions", msg, "OK");
        if (installTarget === 'ffmpeg') {
            el.install.modal.classList.add('hidden');
        }
        return;
    }

    el.install.promptView.classList.add('hidden');
    el.install.progressView.classList.remove('hidden');

    if (installTarget === 'ytdlp') {
        await downloadYtdlp();
    } else {
        await installFfmpeg();
    }
});

async function downloadYtdlp() {
    el.install.progTitle.textContent = 'Downloading yt-dlp...';
    el.install.progDesc.textContent = 'Fetching the latest version from GitHub';
    el.install.status.textContent = 'Starting download...';
    el.install.status.style.color = 'var(--accent-light)';

    const progressBar = document.getElementById('installProgressBar');
    progressBar.style.animation = 'none';
    progressBar.style.width = '0%';

    try {
        const downloadCmd = 'curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe -o yt-dlp.exe';
        let downloadFinished = false;

        const checkProgress = setInterval(async () => {
            if (downloadFinished) { clearInterval(checkProgress); return; }
            try {
                let stats = await Neutralino.filesystem.getStats('./yt-dlp.exe');
                if (stats && stats.size > 0) {
                    const currentMB = (stats.size / (1024 * 1024)).toFixed(2);
                    const percent = Math.min(Math.round((stats.size / (16 * 1024 * 1024)) * 100), 99);
                    el.install.status.textContent = `Downloaded: ${currentMB} MB...`;
                    progressBar.style.width = `${percent}%`;
                }
            } catch (e) { }
        }, 1000);

        let result = await Neutralino.os.execCommand(downloadCmd);
        downloadFinished = true;

        if (result.exitCode === 0) {
            el.install.status.textContent = 'Success! Checking FFmpeg...';
            progressBar.style.width = '100%';
            await checkYtdlpVersion();
            setTimeout(async () => {
                const hasFfmpeg = await checkFfmpeg();
                if (!hasFfmpeg) showInstallModal('ffmpeg');
                else {
                    el.install.modal.classList.add('hidden');
                    let restart = await Neutralino.os.showMessageBox('Restart Required', 'yt-dlp has been successfully installed. The application needs to restart to apply changes. Restart now?', 'YES_NO');
                    if (restart === 'YES') Neutralino.app.restartProcess();
                }
            }, 1500);
        } else {
            throw new Error(result.stdErr || 'Download failed');
        }
    } catch (err) {
        handleInstallError(err.message);
    }
}

async function installFfmpeg() {
    el.install.progTitle.textContent = 'Installing FFmpeg...';
    el.install.progDesc.textContent = 'Using Windows Package Manager (winget)';
    el.install.status.textContent = 'Please wait, this may take a minute...';

    const progressBar = document.getElementById('installProgressBar');
    progressBar.style.animation = 'indeterminate 2s infinite linear';
    progressBar.style.width = '100%';

    try {
        const installCmd = 'winget install "FFmpeg (Essentials Build)" --accept-source-agreements --accept-package-agreements';
        let result = await Neutralino.os.execCommand(installCmd);

        if (result.exitCode === 0) {
            el.install.status.textContent = 'FFmpeg installed successfully!';
            setTimeout(async () => {
                el.install.modal.classList.add('hidden');
                let restart = await Neutralino.os.showMessageBox('Restart Required', 'FFmpeg has been successfully installed. The application needs to restart to apply changes. Restart now?', 'YES_NO');
                if (restart === 'YES') Neutralino.app.restartProcess();
            }, 2000);
        } else {
            throw new Error(result.stdErr || 'Winget failed. You may need to install it manually.');
        }
    } catch (err) {
        handleInstallError(err.message);
    }
}

function handleInstallError(msg) {
    el.install.status.textContent = 'Error: ' + msg;
    el.install.status.style.color = 'var(--danger)';
    setTimeout(() => {
        el.install.progressView.classList.add('hidden');
        el.install.promptView.classList.remove('hidden');
    }, 4000);
}

async function checkYtdlpVersion() {
    try {
        let output = await Neutralino.os.execCommand('yt-dlp --version');
        if (output.exitCode === 0) {
            el.ytdlpVersionText.textContent = `v${output.stdOut.trim()}`;
            el.ytdlpVersionText.style.color = 'var(--success)';
        }
    } catch (err) { }
}

// Update YT-DLP
el.updateYtdlpBtn.addEventListener('click', async () => {
    el.updateYtdlpBtn.disabled = true;
    const originalText = el.updateYtdlpBtn.innerHTML;
    el.updateYtdlpBtn.innerHTML = 'Updating...';
    el.ytdlpVersionText.textContent = 'Downloading update...';
    el.ytdlpVersionText.style.color = 'var(--warning)';

    try {
        let output = await Neutralino.os.execCommand('yt-dlp -U');
        console.log("Update output:", output.stdOut);

        await checkYtdlpVersion(); // re-check after update

        if (output.stdOut.includes('Up to date') || output.stdOut.includes('Updated to')) {
            el.ytdlpVersionText.textContent += ' (Updated!)';
            el.ytdlpVersionText.style.color = 'var(--success)';
        }
    } catch (err) {
        console.error("Failed to update yt-dlp", err);
        el.ytdlpVersionText.textContent = 'Update failed!';
        el.ytdlpVersionText.style.color = 'var(--danger)';
    } finally {
        setTimeout(() => {
            el.updateYtdlpBtn.disabled = false;
            el.updateYtdlpBtn.innerHTML = originalText;
            checkYtdlpVersion(); // reset text to just the version
        }, 3000);
    }
});

