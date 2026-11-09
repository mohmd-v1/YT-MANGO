// Command preview building (updateCommand) and related listeners.
// (extracted from resources/js/main.js — keep in sync with load order in app.html)

function updateCommand() {
    if (!currentData) return;

    let formatPart = '';

    if (selectedVideoId && selectedAudioId) {
        formatPart = `-f ${selectedVideoId}+${selectedAudioId}`;
    } else if (selectedVideoId) {
        formatPart = `-f ${selectedVideoId}`;
    } else if (selectedAudioId) {
        formatPart = `-f ${selectedAudioId}`;
    } else {
        // Default best
        formatPart = ''; // checks default behavior, usually bestvideo+bestaudio
    }

    // If user explicitly unselected everything, maybe empty logic?
    // Let's assume if nothing selected, we don't put -f, or we put best.
    // But for the GUI, explicit selection is key. If nothing selected, maybe disable download?

    el.downloadBtn.disabled = (!selectedVideoId && !selectedAudioId);
    if (el.downloadSectionBtn) el.downloadSectionBtn.disabled = el.downloadBtn.disabled;

    // Update Download Button Badge Info
    let formatInfoText = '';
    const bottomPanel = document.querySelector('.bottom-panel');
    if (selectedVideoId || selectedAudioId) {
        let vFmt = formats.find(f => f.format_id === selectedVideoId);
        let aFmt = formats.find(f => f.format_id === selectedAudioId);

        const getFormatSizeVal = (fmt) => {
            if (!fmt) return 0;
            // 1. Try any potential size fields from yt-dlp
            const possibleSize = fmt.filesize || fmt.filesize_approx || fmt.filesize_approximate || fmt.size || fmt.file_size;
            if (possibleSize !== undefined && possibleSize !== null && possibleSize !== '') {
                return parseSizeToBytes(possibleSize);
            }
            // 2. Fallback to estimation based on bitrate and duration
            const bitrate = fmt.tbr || fmt.vbr || fmt.abr || 0;
            const duration = getDurationSeconds(currentData) || 0;
            if (bitrate > 0 && duration > 0) {
                return ((bitrate * 1024) / 8) * duration;
            }
            return 0;
        };

        const isFormatSizeApprox = (fmt) => {
            if (!fmt) return false;
            const hasExact = !!fmt.filesize;
            return !hasExact;
        };

        let sizeStr = '';
        if (vFmt && aFmt) {
            let totalBytes = getFormatSizeVal(vFmt) + getFormatSizeVal(aFmt);
            let approx = isFormatSizeApprox(vFmt) || isFormatSizeApprox(aFmt) ||
                String(vFmt.filesize).includes('~') || String(aFmt.filesize).includes('~') ||
                String(vFmt.filesize_approx).includes('~') || String(aFmt.filesize_approx).includes('~') ||
                String(vFmt.filesize).includes('≈') || String(aFmt.filesize).includes('≈') ||
                String(vFmt.filesize_approx).includes('≈') || String(aFmt.filesize_approx).includes('≈');
            sizeStr = totalBytes ? (approx ? '~' : '') + formatBytes(totalBytes) : '--';
        } else if (vFmt) {
            sizeStr = getFormatDisplaySize(vFmt);
        } else if (aFmt) {
            sizeStr = getFormatDisplaySize(aFmt);
        }

        if (vFmt && aFmt) {
            let vC = (vFmt.vcodec || 'none').split('.')[0];
            let aC = (aFmt.acodec || 'none').split('.')[0];
            let bitrate = Math.round((vFmt.tbr || 0) + (aFmt.tbr || 0));
            formatInfoText = `${vFmt.resolution || 'N/A'} • ${vC}+${aC} • ${bitrate}k • ${sizeStr}`;
        } else if (vFmt) {
            let vC = (vFmt.vcodec || 'none').split('.')[0];
            let bitrate = Math.round(vFmt.tbr || 0);
            formatInfoText = `${vFmt.resolution || 'N/A'} • ${vC}${bitrate ? ` • ${bitrate}k` : ''} • ${sizeStr}`;
        } else if (aFmt) {
            let aC = (aFmt.acodec || 'none').split('.')[0];
            formatInfoText = `Audio • ${aC} • ${Math.round(aFmt.tbr || 0)}k • ${sizeStr}`;
        }
        if (bottomPanel) bottomPanel.classList.add('sticky-mode');
    } else {
        if (bottomPanel) bottomPanel.classList.remove('sticky-mode');
    }

    if (el.formatTooltip && el.selectedFormatInfoText) {
        if (formatInfoText) {
            el.selectedFormatInfoText.textContent = formatInfoText;
            el.formatTooltip.classList.remove('hidden');
            el.formatTooltip.style.display = 'flex';
        } else {
            el.formatTooltip.classList.add('hidden');
            el.formatTooltip.style.display = 'none';
        }
    }

    if (!selectedVideoId && !selectedAudioId && el.downloadBtn.disabled) {
        el.cmdPreview.value = "Select a stream to generate command...";
        return;
    }

    let flags = [];
    if (settings.embedMetadata) flags.push('--embed-metadata');
    if (settings.embedThumbnail) flags.push('--embed-thumbnail');
    if (settings.restrictFilenames) flags.push('--restrict-filenames');
    if (settings.noPlaylist) flags.push('--no-playlist');
    if (settings.writeSubs) flags.push('--write-subs');
    if (settings.ignoreErrors) flags.push('--ignore-errors');

    // Global Stability Flags
    flags.push('--no-check-certificates');
    flags.push('--no-warnings');

    if (settings.jsRuntime && settings.jsRuntime !== 'none') {
        flags.push(`--js-runtimes ${settings.jsRuntime}`);
    }

    if (selectedSubtitles.length > 0) {
        flags.push('--embed-subs');
        flags.push(`--sub-langs "${selectedSubtitles.join(',')}"`);
        if (autoSubsEnabled) flags.push('--write-auto-subs');
    }

    if (settings.concurrentFragments > 1) {
        flags.push(`-N ${settings.concurrentFragments}`);
    }

    // Audio Extraction Optimization
    // If only audio is selected and it's Opus, add -x --audio-format opus
    if (!selectedVideoId && selectedAudioId && currentData) {
        const aFmt = currentData.formats.find(f => f.format_id === selectedAudioId);
        if (aFmt) {
            const ac = (aFmt.acodec || '').toLowerCase();
            if (ac.includes('opus')) {
                flags.push('-x');
                flags.push('--audio-format opus');
            }
        }
    }

    let path = settings.downloadPath;
    // Strict: Always use -P with quotes
    let pathArg = path ? `-P "${path}"` : '';

    // Add cookies if specified
    let cookiesArg = (settings.useCookies && settings.cookiesPath) ? `--cookies "${settings.cookiesPath}"` : '';

    let sectionArg = sectionTime ? `--download-sections "${sectionTime}"` : '';

    let playlistArg = "";
    if (isPlaylistMode && playlistItemsToDownload.length > 0) {
        playlistArg = `--playlist-items ${playlistItemsToDownload.join(',')}`;
    }

    // Output Template Optimization: Use original title without additions
    flags.push('-o "%(title)s.%(ext)s"');

    // Container Optimization: Force MP4 when merging video + audio
    if (selectedVideoId && selectedAudioId) {
        flags.push('--merge-output-format mp4');
    }

    let cmd = `yt-dlp ${sectionArg} ${playlistArg} ${formatPart} ${flags.join(' ')} ${cookiesArg} ${pathArg} "${el.urlInput.value.trim()}"`;
    // Clean up extra spaces
    cmd = cmd.replace(/\s+/g, ' ').trim();
    el.cmdPreview.value = cmd;
}

// Clear format badge listener
if (el.clearFormatBadge) {
    el.clearFormatBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedVideoId = null;
        selectedAudioId = null;
        renderGrid();
        updateCommand();
    });
}


