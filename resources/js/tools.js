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
        if (el && el.ytdlpVersionText) {
            el.ytdlpVersionText.textContent = cache.ytdlpVersion;
            el.ytdlpVersionText.style.color = 'var(--success)';
        }
        return true;
    }

    try {
        let output = await Neutralino.os.execCommand('yt-dlp --version');
        if (output && output.exitCode === 0) {
            const ver = `v${(output.stdOut || '').trim()}`;
            if (el && el.ytdlpVersionText) {
                el.ytdlpVersionText.textContent = ver;
                el.ytdlpVersionText.style.color = 'var(--success)';
            }
            cache.ytdlpVersion = ver;
            return true;
        }
    } catch (err) { }
    return false;
}

async function checkFfmpeg() {
    const cache = getSharedCache();
    if (cache.ffmpegVersion) {
        if (el && el.ffmpegVersionText) {
            el.ffmpegVersionText.textContent = cache.ffmpegVersion;
            el.ffmpegVersionText.style.color = cache.ffmpegVersion === 'Not Found' ? 'var(--danger)' : 'var(--success)';
        }
        return cache.ffmpegVersion !== 'Not Found';
    }

    try {
        let output = await Neutralino.os.execCommand('ffmpeg -version');
        if (output && output.exitCode === 0) {
            const match = (output.stdOut || '').match(/version\s+([^\s]+)/);
            const version = match ? match[1] : 'Installed';
            if (el && el.ffmpegVersionText) {
                el.ffmpegVersionText.textContent = version;
                el.ffmpegVersionText.style.color = 'var(--success)';
            }
            cache.ffmpegVersion = version;
            return true;
        }
    } catch (err) { }
    
    if (el && el.ffmpegVersionText) {
        el.ffmpegVersionText.textContent = 'Not Found';
        el.ffmpegVersionText.style.color = 'var(--danger)';
    }
    cache.ffmpegVersion = 'Not Found';
    return false;
}

function showInstallModal(target) {
    installTarget = target;
    if (!el || !el.install || !el.install.modal) return;

    el.install.modal.classList.remove('hidden');
    if (el.install.promptView) el.install.promptView.classList.remove('hidden');
    if (el.install.progressView) el.install.progressView.classList.add('hidden');

    const osName = window.NL_OS || 'OS';

    if (target === 'ytdlp') {
        if (el.install.title) el.install.title.textContent = 'yt-dlp Required';
        if (osName === 'Windows') {
            if (el.install.desc) el.install.desc.textContent = "The core engine (yt-dlp) is missing. It's required to analyze and download videos. Download it now?";
            if (el.install.startBtn) el.install.startBtn.textContent = "Download Now";
        } else {
            if (el.install.desc) el.install.desc.textContent = "The core engine (yt-dlp) is missing. Automatic installation is only supported on Windows. Click 'Instructions' to see how to install it on " + osName + ".";
            if (el.install.startBtn) el.install.startBtn.textContent = "Instructions";
        }
        if (el.install.exitBtn) el.install.exitBtn.classList.remove('hidden');
        if (el.install.skipBtn) el.install.skipBtn.classList.add('hidden');
    } else {
        if (el.install.title) el.install.title.textContent = 'FFmpeg Recommended';
        if (osName === 'Windows') {
            if (el.install.desc) el.install.desc.textContent = "FFmpeg is missing. It is highly recommended for merging high-quality video and audio. Install it via Winget?";
            if (el.install.startBtn) el.install.startBtn.textContent = "Install Now";
        } else {
            if (el.install.desc) el.install.desc.textContent = "FFmpeg is missing. Automatic installation is only supported on Windows. Click 'Instructions' to see how to install it on " + osName + ".";
            if (el.install.startBtn) el.install.startBtn.textContent = "Instructions";
        }
        if (el.install.exitBtn) el.install.exitBtn.classList.add('hidden');
        if (el.install.skipBtn) el.install.skipBtn.classList.remove('hidden');
    }
}

// Install Modal Listeners
if (el && el.install && el.install.exitBtn) {
    el.install.exitBtn.addEventListener('click', () => {
        try { Neutralino.app.exit(); } catch (e) {}
    });
}

if (el && el.install && el.install.skipBtn) {
    el.install.skipBtn.addEventListener('click', () => {
        if (el.install.modal) el.install.modal.classList.add('hidden');
    });
}

if (el && el.install && el.install.startBtn) {
    el.install.startBtn.addEventListener('click', async () => {
        const osName = window.NL_OS || 'Windows';
        if (osName !== 'Windows') {
            let msg = "";
            if (installTarget === 'ytdlp') {
                msg = osName === 'Darwin'
                    ? "To install yt-dlp on macOS, open Terminal and run:\n\nbrew install yt-dlp\n\nAfter installing, please restart the app."
                    : "To install yt-dlp on Linux, open Terminal and run:\n\nsudo apt install yt-dlp\nor\npip install yt-dlp\n\nAfter installing, please restart the app.";
            } else {
                msg = osName === 'Darwin'
                    ? "To install FFmpeg on macOS, open Terminal and run:\n\nbrew install ffmpeg\n\nAfter installing, please restart the app."
                    : "To install FFmpeg on Linux, open Terminal and run:\n\nsudo apt install ffmpeg\n\nAfter installing, please restart the app.";
            }
            await Neutralino.os.showMessageBox("Installation Instructions", msg, "OK");
            if (installTarget === 'ffmpeg' && el.install.modal) {
                el.install.modal.classList.add('hidden');
            }
            return;
        }

        if (el.install.promptView) el.install.promptView.classList.add('hidden');
        if (el.install.progressView) el.install.progressView.classList.remove('hidden');

        if (installTarget === 'ytdlp') {
            await downloadYtdlp();
        } else {
            await installFfmpeg();
        }
    });
}

async function downloadYtdlp() {
    if (el && el.install) {
        if (el.install.progTitle) el.install.progTitle.textContent = 'Downloading yt-dlp...';
        if (el.install.progDesc) el.install.progDesc.textContent = 'Fetching the latest version from GitHub';
        if (el.install.status) {
            el.install.status.textContent = 'Starting download...';
            el.install.status.style.color = 'var(--accent-light)';
        }
    }

    const progressBar = document.getElementById('installProgressBar');
    if (progressBar) {
        progressBar.style.animation = 'none';
        progressBar.style.width = '0%';
    }

    let checkProgress = null;
    let downloadFinished = false;

    try {
        const downloadCmd = 'curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe -o yt-dlp.exe';

        checkProgress = setInterval(async () => {
            if (downloadFinished) { 
                if (checkProgress) clearInterval(checkProgress); 
                return; 
            }
            try {
                let stats = await Neutralino.filesystem.getStats('./yt-dlp.exe');
                if (stats && stats.size > 0) {
                    const currentMB = (stats.size / (1024 * 1024)).toFixed(2);
                    const percent = Math.min(Math.round((stats.size / (16 * 1024 * 1024)) * 100), 99);
                    if (el && el.install && el.install.status) {
                        el.install.status.textContent = `Downloaded: ${currentMB} MB...`;
                    }
                    if (progressBar) progressBar.style.width = `${percent}%`;
                }
            } catch (e) { }
        }, 1000);

        let result = await Neutralino.os.execCommand(downloadCmd);
        downloadFinished = true;

        if (result && result.exitCode === 0) {
            if (el && el.install && el.install.status) el.install.status.textContent = 'Success! Checking FFmpeg...';
            if (progressBar) progressBar.style.width = '100%';

            await checkYtdlpVersion();
            setTimeout(async () => {
                const hasFfmpeg = await checkFfmpeg();
                if (!hasFfmpeg) showInstallModal('ffmpeg');
                else {
                    if (el && el.install && el.install.modal) el.install.modal.classList.add('hidden');
                    let restart = await Neutralino.os.showMessageBox('Restart Required', 'yt-dlp has been successfully installed. The application needs to restart to apply changes. Restart now?', 'YES_NO');
                    if (restart === 'YES') Neutralino.app.restartProcess();
                }
            }, 1500);
        } else {
            throw new Error((result ? result.stdErr : null) || 'Download failed');
        }
    } catch (err) {
        handleInstallError(err.message || 'Download error');
    } finally {
        downloadFinished = true;
        if (checkProgress) clearInterval(checkProgress);
    }
}

async function installFfmpeg() {
    if (el && el.install) {
        if (el.install.progTitle) el.install.progTitle.textContent = 'Installing FFmpeg...';
        if (el.install.progDesc) el.install.progDesc.textContent = 'Using Windows Package Manager (winget)';
        if (el.install.status) el.install.status.textContent = 'Please wait, this may take a minute...';
    }

    const progressBar = document.getElementById('installProgressBar');
    if (progressBar) {
        progressBar.style.animation = 'indeterminate 2s infinite linear';
        progressBar.style.width = '100%';
    }

    try {
        const installCmd = 'winget install "FFmpeg (Essentials Build)" --accept-source-agreements --accept-package-agreements';
        let result = await Neutralino.os.execCommand(installCmd);

        if (result && result.exitCode === 0) {
            if (el && el.install && el.install.status) el.install.status.textContent = 'FFmpeg installed successfully!';
            setTimeout(async () => {
                if (el && el.install && el.install.modal) el.install.modal.classList.add('hidden');
                let restart = await Neutralino.os.showMessageBox('Restart Required', 'FFmpeg has been successfully installed. The application needs to restart to apply changes. Restart now?', 'YES_NO');
                if (restart === 'YES') Neutralino.app.restartProcess();
            }, 2000);
        } else {
            throw new Error((result ? result.stdErr : null) || 'Winget failed. You may need to install it manually.');
        }
    } catch (err) {
        handleInstallError(err.message || 'Installation error');
    }
}

function handleInstallError(msg) {
    if (el && el.install && el.install.status) {
        el.install.status.textContent = 'Error: ' + msg;
        el.install.status.style.color = 'var(--danger)';
    }
    setTimeout(() => {
        if (el && el.install) {
            if (el.install.progressView) el.install.progressView.classList.add('hidden');
            if (el.install.promptView) el.install.promptView.classList.remove('hidden');
        }
    }, 4000);
}

async function checkYtdlpVersion() {
    try {
        let output = await Neutralino.os.execCommand('yt-dlp --version');
        if (output && output.exitCode === 0) {
            if (el && el.ytdlpVersionText) {
                el.ytdlpVersionText.textContent = `v${(output.stdOut || '').trim()}`;
                el.ytdlpVersionText.style.color = 'var(--success)';
            }
        }
    } catch (err) { }
}

// Update YT-DLP
if (el && el.updateYtdlpBtn) {
    el.updateYtdlpBtn.addEventListener('click', async () => {
        el.updateYtdlpBtn.disabled = true;
        const originalText = el.updateYtdlpBtn.innerHTML;
        el.updateYtdlpBtn.innerHTML = 'Updating...';
        if (el.ytdlpVersionText) {
            el.ytdlpVersionText.textContent = 'Downloading update...';
            el.ytdlpVersionText.style.color = 'var(--warning)';
        }

        try {
            let output = await Neutralino.os.execCommand('yt-dlp -U');
            console.log("Update output:", output ? output.stdOut : '');

            await checkYtdlpVersion(); // re-check after update

            if (output && output.stdOut && (output.stdOut.includes('Up to date') || output.stdOut.includes('Updated to'))) {
                if (el.ytdlpVersionText) {
                    el.ytdlpVersionText.textContent += ' (Updated!)';
                    el.ytdlpVersionText.style.color = 'var(--success)';
                }
            }
        } catch (err) {
            console.error("Failed to update yt-dlp", err);
            if (el.ytdlpVersionText) {
                el.ytdlpVersionText.textContent = 'Update failed!';
                el.ytdlpVersionText.style.color = 'var(--danger)';
            }
        } finally {
            setTimeout(() => {
                if (el.updateYtdlpBtn) {
                    el.updateYtdlpBtn.disabled = false;
                    el.updateYtdlpBtn.innerHTML = originalText;
                }
                checkYtdlpVersion(); // reset text to just the version
            }, 3000);
        }
    });
}