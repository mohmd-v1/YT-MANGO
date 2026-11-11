// Command preview building (updateCommand) and related listeners.
// (extracted from resources/js/main.js — keep in sync with load order in app.html)

// Internal escape helper to protect paths and URLs in generated command string
function escapeCmdArg(arg) {
    if (!arg) return '""';
    return `"${String(arg).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

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

    if (el.downloadBtn) {
        el.downloadBtn.disabled = (!selectedVideoId && !selectedAudioId);
    }
    if (el.downloadSectionBtn && el.downloadBtn) {
        el.downloadSectionBtn.disabled = el.downloadBtn.disabled;
    }

    // Update Download Button Badge Info
    let formatInfoText = '';
    const bottomPanel = document.querySelector('.bottom-panel');
    if (selectedVideoId || selectedAudioId) {
        let vFmt = formats ? formats.find(f => f.format_id === selectedVideoId) : null;
        let aFmt = formats ? formats.find(f => f.format_id === selectedAudioId) : null;

        const getFormatSizeVal = (fmt) => {
            if (!fmt) return 0;
            const possibleSize = fmt.filesize || fmt.filesize_approx || fmt.filesize_approximate || fmt.size || fmt.file_size;
            if (possibleSize !== undefined && possibleSize !== null && possibleSize !== '') {
                return parseSizeToBytes ? parseSizeToBytes(possibleSize) : Number(possibleSize) || 0;
            }
            const bitrate = fmt.tbr || fmt.vbr || fmt.abr || 0;
            const duration = (typeof getDurationSeconds === 'function') ? getDurationSeconds(currentData) : (currentData.duration || 0);
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
                String(vFmt.filesize || '').includes('~') || String(aFmt.filesize || '').includes('~') ||
                String(vFmt.filesize_approx || '').includes('~') || String(aFmt.filesize_approx || '').includes('~') ||
                String(vFmt.filesize || '').includes('≈') || String(aFmt.filesize || '').includes('≈') ||
                String(vFmt.filesize_approx || '').includes('≈') || String(aFmt.filesize_approx || '').includes('≈');
            sizeStr = totalBytes ? (approx ? '~' : '') + (typeof formatBytes === 'function' ? formatBytes(totalBytes) : `${Math.round(totalBytes / 1024 / 1024)}MB`) : '--';
        } else if (vFmt) {
            sizeStr = typeof getFormatDisplaySize === 'function' ? getFormatDisplaySize(vFmt) : '--';
        } else if (aFmt) {
            sizeStr = typeof getFormatDisplaySize === 'function' ? getFormatDisplaySize(aFmt) : '--';
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

    if (!selectedVideoId && !selectedAudioId && el.downloadBtn && el.downloadBtn.disabled) {
        if (el.cmdPreview) el.cmdPreview.value = "Select a stream to generate command...";
        return;
    }

    let flags = [];
    if (settings.embedMetadata) flags.push('--embed-metadata');
    if (settings.embedThumbnail) flags.push('--embed-thumbnail');
    if (settings.restrictFilenames) flags.push('--restrict-filenames');
    if (settings.noPlaylist) flags.push('--no-playlist');
    if (settings.writeSubs) flags.push('--write-subs');
    if (settings.ignoreErrors) flags.push('--ignore-errors');

    // Global Stability & Anti-Overwrite Flags
    flags.push('--no-overwrites');
    flags.push('--no-post-overwrites');
    flags.push('--no-check-certificates');
    flags.push('--no-warnings');
    // yt-dlp writes human-readable log lines with the console encoding when
    // stdout is piped; force UTF-8 so non-ASCII file paths survive for the
    // "open file location" feature.
    flags.push('--encoding utf-8');

    if (settings.jsRuntime && settings.jsRuntime !== 'none') {
        flags.push(`--js-runtimes ${escapeCmdArg(settings.jsRuntime)}`);
    }

    if (typeof selectedSubtitles !== 'undefined' && selectedSubtitles.length > 0) {
        flags.push('--embed-subs');
        flags.push(`--sub-langs ${escapeCmdArg(selectedSubtitles.join(','))}`);
        if (typeof autoSubsEnabled !== 'undefined' && autoSubsEnabled) flags.push('--write-auto-subs');
    }

    if (settings.concurrentFragments > 1) {
        flags.push(`-N ${settings.concurrentFragments}`);
    }

    // Audio Extraction Optimization
    if (!selectedVideoId && selectedAudioId && currentData && currentData.formats) {
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
    let pathArg = path ? `-P ${escapeCmdArg(path)}` : '';
    let cookiesArg = (settings.useCookies && settings.cookiesPath) ? `--cookies ${escapeCmdArg(settings.cookiesPath)}` : '';
    let sectionArg = (typeof sectionTime !== 'undefined' && sectionTime) ? `--download-sections ${escapeCmdArg(sectionTime)}` : '';

    let playlistArg = "";
    if (typeof isPlaylistMode !== 'undefined' && isPlaylistMode && typeof playlistItemsToDownload !== 'undefined' && playlistItemsToDownload.length > 0) {
        playlistArg = `--playlist-items ${playlistItemsToDownload.join(',')}`;
    }

    // Output Template Optimization: Include quality tag [1080p] if video format selected + section timestamp if trimmed
    let resTag = '';
    if (selectedVideoId) {
        let vFmt = formats ? formats.find(f => f.format_id === selectedVideoId) : null;
        if (vFmt) {
            let res = (typeof getNormalizedResolution === 'function') ? getNormalizedResolution(vFmt) : (vFmt.height ? `${vFmt.height}p` : '');
            if (res && res !== 'Unknown') {
                resTag = ` [${res}]`;
            }
        }
    }

    if (typeof sectionTime !== 'undefined' && sectionTime) {
        let cleanRange = sectionTime.replace('*', '').replace(/:/g, '.');
        flags.push(`-o "%(title)s${resTag} (${cleanRange}).%(ext)s"`);
    } else {
        flags.push(`-o "%(title)s${resTag}.%(ext)s"`);
    }

    if (selectedVideoId && selectedAudioId) {
        flags.push('--merge-output-format mp4');
    }

    const rawUrl = el.urlInput ? el.urlInput.value.trim() : '';
    let cmd = `yt-dlp ${sectionArg} ${playlistArg} ${formatPart} ${flags.join(' ')} ${cookiesArg} ${pathArg} ${escapeCmdArg(rawUrl)}`;
    
    cmd = cmd.replace(/\s+/g, ' ').trim();

    if (el.cmdPreview) {
        el.cmdPreview.value = cmd;
    }
}

if (el.clearFormatBadge) {
    el.clearFormatBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedVideoId = null;
        selectedAudioId = null;
        if (typeof renderGrid === 'function') renderGrid();
        updateCommand();
    });
}