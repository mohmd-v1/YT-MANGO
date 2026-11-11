// URL analysis pipeline (analyzeUrl, analyzePlaylist, quickM4a).
// (extracted from resources/js/main.js — keep in sync with load order in app.html)

// Helper to escape shell arguments safely for Neutralino os.spawnProcess
function escapeCmdArg(arg) {
    if (!arg) return '""';
    // Escape backslashes and double quotes
    return `"${String(arg).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

// Internal helper to kill any running analysis process safely before starting a new one
async function cancelPreviousAnalysisProcess() {
    if (currentAnalyzeProcessPid) {
        try {
            let killCmd = window.NL_OS === 'Windows'
                ? `taskkill /F /T /PID ${currentAnalyzeProcessPid}`
                : `kill -9 ${currentAnalyzeProcessPid}`;
            await Neutralino.os.execCommand(killCmd);
            console.log("Previous analysis process killed.");
        } catch (err) {
            console.warn("Failed to kill previous analysis process (may have already exited):", err);
        } finally {
            currentAnalyzeProcess = null;
            currentAnalyzeProcessPid = null;
        }
    }
}

if (el.cancelAnalyzeBtn) {
    el.cancelAnalyzeBtn.addEventListener('click', async () => {
        isAnalysisCancelled = true;
        await cancelPreviousAnalysisProcess();
        setLoading(false);
    });
}

// Reusable process runner for analysis with robust listener cleanup & cancellation support
function runSpawnalyze(cmd) {
    return new Promise(async (resolve, reject) => {
        let proc = null;
        let stdOutData = '';
        let stdErrData = '';

        const onSpawned = (evt) => {
            if (proc && evt.detail.id === proc.id) {
                if (evt.detail.action === 'stdOut') {
                    stdOutData += evt.detail.data;
                }
                if (evt.detail.action === 'stdErr') {
                    stdErrData += evt.detail.data;
                }
                if (evt.detail.action === 'exit') {
                    const code = evt.detail.data;
                    cleanup();
                    resolve({ exitCode: code, stdOut: stdOutData, stdErr: stdErrData });
                }
            }
        };

        const cleanup = () => {
            try {
                Neutralino.events.off('spawnedProcess', onSpawned);
            } catch (e) {
                // Ignore if listener wasn't registered
            }
            if (proc && currentAnalyzeProcess === proc.id) {
                currentAnalyzeProcess = null;
                currentAnalyzeProcessPid = null;
            }
        };

        try {
            // Kill previous process if it's still running
            await cancelPreviousAnalysisProcess();

            proc = await Neutralino.os.spawnProcess(cmd);
            currentAnalyzeProcess = proc.id;
            currentAnalyzeProcessPid = proc.pid;

            Neutralino.events.on('spawnedProcess', onSpawned);

        } catch (err) {
            cleanup();
            reject(err);
        }
    });
}

async function analyzePlaylist() {
    const url = el.urlInput ? el.urlInput.value.trim() : '';
    if (!url) return;

    isAnalysisCancelled = false;
    setLoading(true);
    resetSelection();
    isPlaylistMode = false;
    playlistItemsToDownload = [];

    try {
        let cookiesArg = (settings.useCookies && settings.cookiesPath) ? `--cookies ${escapeCmdArg(settings.cookiesPath)}` : '';
        let jsRuntimeArg = settings.jsRuntime && settings.jsRuntime !== 'none' ? `--js-runtimes ${escapeCmdArg(settings.jsRuntime)}` : '';
        let command = `yt-dlp -J --flat-playlist --encoding utf-8 --no-check-certificates --no-warnings ${jsRuntimeArg} ${cookiesArg} ${escapeCmdArg(url)}`;
        console.log("Playlist Analysis:", command);

        let output = await runSpawnalyze(command);

        if (output.exitCode !== 0) {
            if (isAnalysisCancelled) {
                console.log("Analysis cancelled by user.");
                setLoading(false);
                return;
            }
            await analyzeUrl();
            return;
        }

        let data;
        try {
            data = JSON.parse(output.stdOut);
        } catch (parseErr) {
            console.error("Failed to parse playlist JSON:", parseErr);
            await analyzeUrl();
            return;
        }

        if (data && data.entries && data.entries.length > 0) {
            currentPlaylistData = data;
            populatePlaylistModal(data);
            setLoading(false);
        } else {
            await analyzeUrl();
        }
    } catch (e) {
        if (isAnalysisCancelled) {
            setLoading(false);
            return;
        }
        showAlert(e.message || 'An error occurred during playlist analysis', 'Analysis Exception');
        setLoading(false);
    }
}

let currentBgThumbnailUrl = null;
function updateDynamicBackground(url) {
    if (url === currentBgThumbnailUrl) return;
    currentBgThumbnailUrl = url;
    const bgDiv = document.getElementById('infoBg');
    if (!bgDiv) return;
    if (url) {
        bgDiv.style.backgroundImage = `url('${url}')`;
        bgDiv.classList.add('active');
    } else {
        bgDiv.style.backgroundImage = 'none';
        bgDiv.classList.remove('active');
    }
}

async function analyzeUrl(isPlaylistFormatMode = false) {
    const url = el.urlInput ? el.urlInput.value.trim() : '';
    if (!url) return;

    // If the URL contains 'playlist', automatically redirect to playlist analysis
    if (!isPlaylistFormatMode && url.toLowerCase().includes('playlist')) {
        return analyzePlaylist();
    }

    isAnalysisCancelled = false;
    setLoading(true);
    resetSelection();

    try {
        // Speed Boost: --no-check-certificates, --no-warnings
        let cookiesArg = (settings.useCookies && settings.cookiesPath) ? `--cookies ${escapeCmdArg(settings.cookiesPath)}` : '';
        let jsRuntimeArg = settings.jsRuntime && settings.jsRuntime !== 'none' ? `--js-runtimes ${escapeCmdArg(settings.jsRuntime)}` : '';
        let command = `yt-dlp -J --encoding utf-8 --no-playlist --no-check-certificates --no-warnings ${jsRuntimeArg} ${cookiesArg} ${escapeCmdArg(url)}`;
        console.log("Analyzing:", command);

        let output = await runSpawnalyze(command);

        if (output.exitCode !== 0) {
            if (isAnalysisCancelled) {
                console.log("Analysis cancelled by user.");
                setLoading(false);
                return;
            }
            showAlert(output.stdErr || 'Failed to analyze URL', 'Analysis Error');
            setLoading(false);
            return;
        }

        let data;
        try {
            data = JSON.parse(output.stdOut);
        } catch (parseErr) {
            console.error("Failed to parse JSON output:", parseErr);
            showAlert("Failed to parse video metadata from yt-dlp.", "Parse Error");
            setLoading(false);
            return;
        }

        currentData = data;
        formats = data.formats || [];

        if (data.title && typeof updateTabTitle === 'function') {
            updateTabTitle(data.title);
        }

        if (data.thumbnail && data.thumbnail !== 'N/A') {
            el.videoThumbnail.src = data.thumbnail;
            el.thumbnailWrapper.classList.remove('hidden');
            el.thumbnailWrapper.classList.remove('no-thumb');
            el.videoThumbnail.classList.remove('hidden');
            updateDynamicBackground(data.thumbnail);
        } else {
            el.thumbnailWrapper.classList.remove('hidden');
            el.thumbnailWrapper.classList.add('no-thumb');
            el.videoThumbnail.classList.add('hidden');
            updateDynamicBackground(null);
        }

        // Setup Chapters for Sections Modal
        if (data.chapters && data.chapters.length > 0) {
            el.sections.chapterSelect.innerHTML = '<option value="">-- Custom Time --</option>';
            data.chapters.forEach((ch, idx) => {
                const opt = document.createElement('option');
                opt.value = `${ch.start_time}-${ch.end_time}`;
                opt.textContent = `${idx + 1}. ${ch.title} (${formatDuration(ch.start_time)} - ${formatDuration(ch.end_time)})`;
                applySmartDir(opt, ch.title);
                el.sections.chapterSelect.appendChild(opt);
            });
            el.sections.chapterContainer.classList.remove('hidden');
        } else {
            el.sections.chapterContainer.classList.add('hidden');
        }

        // Display video info
        let title = data.title || 'Unknown Title';
        if (isPlaylistFormatMode) {
            title = `[Playlist Selection] ${title}`;
        }
        let duration = getDurationSeconds(data) ? formatDuration(getDurationSeconds(data)) : 'N/A';
        let uploader = data.uploader || 'Unknown';
        // Smart RTL detection for Arabic characters using unified helper
        const dir = getTextDir(title);

        // Formatter helpers
        const formatCompact = (num) => {
            if (num == null) return null;
            return Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(num);
        };
        const formatYMD = (dateStr) => {
            if (!dateStr || dateStr.length !== 8) return null;
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(4, 6);
            const day = dateStr.substring(6, 8);
            const date = new Date(year, month - 1, day);
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        };

        let views = formatCompact(data.view_count);
        let likes = formatCompact(data.like_count);
        let uploadDate = formatYMD(data.upload_date);

        // Update overlay
        if (el.videoDurationOverlay) {
            el.videoDurationOverlay.textContent = duration;
        }

        el.videoInfo.innerHTML = `
            <div class="video-info-content" dir="${dir}">
                <h3 class="video-info-title" title="${title.replace(/"/g, '&quot;')}">${title}</h3>
                <div class="video-info-meta" style="flex-wrap: wrap;">
                    <span class="meta-item" title="Uploader">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        ${uploader}
                    </span>
                    ${views ? `<span class="meta-item" title="Views">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        ${views}
                    </span>` : ''}
                    ${likes ? `<span class="meta-item" title="Likes">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                        ${likes}
                    </span>` : ''}
                    ${uploadDate ? `<span class="meta-item" title="Upload Date">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        ${uploadDate}
                    </span>` : ''}
                </div>
            </div>
        `;

        el.emptyState.classList.add('hidden');
        el.contentArea.classList.remove('hidden');

        renderGrid();
        renderSubtitles();
        updateCommand(); // Initial command update

    } catch (e) {
        if (isAnalysisCancelled) {
            setLoading(false);
            return;
        }
        showAlert(e.message || 'Error fetching video data', 'Fetch Exception');
    } finally {
        setLoading(false);
    }
}

// ... existing code ...
async function quickM4a() {
    const url = el.urlInput ? el.urlInput.value.trim() : '';
    if (!url) {
        showAlert('Please enter a URL first.', 'Input Required');
        return;
    }

    resetSelection();

    let path = settings.downloadPath;
    let pathArg = path ? `-P ${escapeCmdArg(path)}` : '';
    let cookiesArg = (settings.useCookies && settings.cookiesPath) ? `--cookies ${escapeCmdArg(settings.cookiesPath)}` : '';

    let jsRuntimeArg = settings.jsRuntime && settings.jsRuntime !== 'none' ? `--js-runtimes ${escapeCmdArg(settings.jsRuntime)}` : '';
    let cmd = '';
    if (settings.quickAudioFormat === 'opus') {
        cmd = `yt-dlp -f "251/bestaudio" --encoding utf-8 --no-overwrites --embed-metadata --embed-thumbnail -o "%(title)s.%(ext)s" -x --audio-format opus --no-playlist ${jsRuntimeArg} ${cookiesArg} ${pathArg} ${escapeCmdArg(url)}`;
    } else {
        cmd = `yt-dlp -f "140/bestaudio" --encoding utf-8 --no-overwrites --embed-metadata --embed-thumbnail -o "%(title)s.%(ext)s" --no-playlist ${jsRuntimeArg} ${cookiesArg} ${pathArg} ${escapeCmdArg(url)}`;
    }

    if (el.cmdPreview) {
        el.cmdPreview.value = cmd;
    }
    startDownload();
}