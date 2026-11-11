// Formats grid rendering (dual view, compact rows, row handling).
// (extracted from resources/js/main.js — keep in sync with load order in app.html)

function renderGrid() {
    if (!el || !el.gridBody || !el.videoGridBody || !el.audioGridBody) return;

    // Clear all
    el.gridBody.innerHTML = '';
    el.videoGridBody.innerHTML = '';
    el.audioGridBody.innerHTML = '';

    const safeFormats = Array.isArray(formats) ? formats : [];
    
    // Ensure activeTab is globally accessible
    if (typeof activeTab === 'undefined') {
        window.activeTab = 'combined';
    }

    // Update active class on tab buttons (Always show all tabs, don't hide Mixed)
    if (Array.isArray(el.tabs)) {
        el.tabs.forEach(btn => {
            if (!btn) return;
            btn.classList.toggle('active', btn.dataset.tab === activeTab);
            btn.classList.remove('hidden'); // Ensure no tab is forcefully hidden
        });
    }

    if (activeTab === 'combined') {
        if (el.dualView) el.dualView.classList.remove('hidden');
        if (el.standardView) el.standardView.classList.add('hidden');

        // Filter Video Only
        const videoOnly = safeFormats.filter(f => f && (f.acodec === 'video only' || f.acodec === 'none') && (f.vcodec !== 'none' && f.vcodec !== 'audio only'));
        const videoFrag = document.createDocumentFragment();
        renderDualColumn('video', videoOnly, videoFrag);
        el.videoGridBody.appendChild(videoFrag);

        // Filter Audio Only
        const audioOnly = safeFormats.filter(f => f && (f.vcodec === 'audio only' || f.vcodec === 'none') && (f.acodec !== 'none' && f.acodec !== 'video only'));
        const audioFrag = document.createDocumentFragment();
        renderAudioColumn(audioOnly, audioFrag);
        el.audioGridBody.appendChild(audioFrag);

    } else if (activeTab === 'mixed') {
        if (el.dualView) el.dualView.classList.add('hidden');
        if (el.standardView) el.standardView.classList.remove('hidden');

        // Mixed Formats: Show formats containing both audio & video or all video formats as fallback
        const mixedFormats = safeFormats.filter(f => {
            if (!f) return false;
            const hasVideo = f.vcodec && f.vcodec !== 'none' && f.vcodec !== 'audio only';
            const hasAudio = f.acodec && f.acodec !== 'none' && f.acodec !== 'video only';
            return hasVideo && hasAudio;
        });

        // Fallback: If YouTube provided separated video/audio streams, render video streams in Mixed tab
        const formatsToRender = mixedFormats.length > 0 ? mixedFormats : safeFormats.filter(f => f && f.vcodec && f.vcodec !== 'none' && f.vcodec !== 'audio only');

        const mixedFrag = document.createDocumentFragment();
        renderDualColumn('mixed', formatsToRender, mixedFrag);
        el.gridBody.appendChild(mixedFrag);
    }

    // "Video only" note: relevant only in the Mixed tab when the source did not
    // provide any muxed stream, so the fallback list is video-only.
    if (el.videoOnlyNote) {
        const hasMuxed = safeFormats.some(f =>
            f && f.vcodec && f.vcodec !== 'none' && f.vcodec !== 'audio only' &&
            f.acodec && f.acodec !== 'none' && f.acodec !== 'video only'
        );
        const showNote = activeTab === 'mixed' && safeFormats.length > 0 && !hasMuxed;
        el.videoOnlyNote.classList.toggle('hidden', !showNote);
    }
}

// Normalize all resolution naming styles into one quality group.
// Examples: 480, 480p, 854x480 -> 480p
function getNormalizedResolution(fmt) {
    if (!fmt) return 'Unknown';
    const width = Number(fmt.width) || 0;
    const height = Number(fmt.height) || 0;

    // If yt-dlp gives us the real height, use it as the quality.
    if (height > 0) {
        return `${height}p`;
    }

    const candidates = [
        fmt.format_note,
        fmt.resolution,
        fmt.format,
        fmt.format_id
    ].filter(Boolean).join(' ');

    // Handle text such as 854x480 or 1920x1080
    const dimensionMatch = candidates.match(
        /(?:^|\D)(\d{2,5})\s*[x×]\s*(\d{2,5})(?:\D|$)/i
    );

    if (dimensionMatch) {
        return `${Number(dimensionMatch[2])}p`;
    }

    // Handle both 480p and 480
    const qualityMatch = candidates.match(
        /(?:^|\D)(\d{2,5})\s*p?(?:\D|$)/i
    );

    if (qualityMatch) {
        const h = Number(qualityMatch[1]);

        if (h >= 100 && h <= 4320) {
            return `${h}p`;
        }
    }

    return 'Unknown';
}

function getResolutionSortValue(resKey) {
    const match = String(resKey).match(/(\d{2,5})p$/i);
    return match ? Number(match[1]) : 0;
}

function renderDualColumn(type, filtered, container = null) {
    const groups = {};
    const codecPriority = {
        'av01': 5,
        'hevc': 4,
        'vp9': 3,
        'avc': 2,
        'unknown': 1,
        'other': 0
    };

    if (typeof resolutionSelections === 'undefined') {
        window.resolutionSelections = {};
    }

    (filtered || []).forEach(f => {
        if (!f) return;
        const resKey = getNormalizedResolution(f);
        if (!groups[resKey]) {
            groups[resKey] = {};
        }

        // Normalize codec name
        const vc = (f.vcodec || '').toLowerCase();

        let cType = 'unknown';

        // AV1: av01 / av1
        if (
            vc.includes('av01') ||
            vc.includes('av1')
        ) {
            cType = 'av01';

            // HEVC: hevc / h265 / h.265 / hvc1 / hev1
        } else if (
            vc.includes('hevc') ||
            vc.includes('h265') ||
            vc.includes('h.265') ||
            vc.includes('hvc1') ||
            vc.includes('hev1')
        ) {
            cType = 'hevc';

            // H.264: avc / h264 / h.264
        } else if (
            vc.includes('avc') ||
            vc.includes('h264') ||
            vc.includes('h.264')
        ) {
            cType = 'avc';

            // VP9: vp9 / vp09
        } else if (
            vc.includes('vp9') ||
            vc.includes('vp09')
        ) {
            cType = 'vp9';

            // Other known codec
        } else if (
            vc &&
            vc !== 'none' &&
            vc !== 'unknown'
        ) {
            cType = 'other';
        }

        if (!groups[resKey][cType]) {
            groups[resKey][cType] = [];
        }

        groups[resKey][cType].push(f);
    });

    // Sort resolutions from highest to lowest
    const sortedResKeys = Object.keys(groups).sort((a, b) => {
        return getResolutionSortValue(b) - getResolutionSortValue(a);
    });

    sortedResKeys.forEach(resKey => {
        const resGroup = groups[resKey];

        // Sort codecs according to priority
        const availableCTypes = Object.keys(resGroup).sort(
            (a, b) => (codecPriority[b] || 0) - (codecPriority[a] || 0)
        );

        // Restore previous codec selection if available
        let currentCType = resolutionSelections[resKey]?.cType;

        if (
            !currentCType ||
            !availableCTypes.includes(currentCType)
        ) {
            currentCType = availableCTypes[0];
        }

        // Sort formats by bitrate
        const variants = resGroup[currentCType].sort(
            (a, b) =>
                (b.tbr || b.vbr || 0) -
                (a.tbr || a.vbr || 0)
        );

        // Initialize resolution selection
        if (!resolutionSelections[resKey]) {
            resolutionSelections[resKey] = {
                cType: currentCType,
                formatId: variants[0].format_id
            };
        }

        // Get currently selected format
        const currentFormatId =
            resolutionSelections[resKey].formatId;

        const activeFmt =
            variants.find(
                f => f.format_id === currentFormatId
            ) || variants[0];

        // Render row
        if (type === 'video') {
            renderCompactRow(
                activeFmt,
                container || el.videoGridBody,
                {
                    resKey,
                    ctypes: availableCTypes,
                    activeCType: currentCType,
                    variants,
                    resGroup
                }
            );

        } else if (type === 'mixed') {
            renderCompactRow(
                activeFmt,
                container,
                {
                    resKey,
                    ctypes: availableCTypes,
                    activeCType: currentCType,
                    variants,
                    resGroup,
                    isMixed: true,
                    isMultiLang: true
                }
            );

        } else {
            // Fallback
            renderCompactRow(
                activeFmt,
                container || el.gridBody,
                {
                    resKey,
                    ctypes: availableCTypes,
                    activeCType: currentCType,
                    variants,
                    resGroup
                }
            );
        }
    });
}

function renderAudioColumn(filtered, container = el.audioGridBody) {
    const groups = {}; // codecKey -> [formats]
    const codecPriority = { 'opus': 10, 'mp4a': 5 };

    if (typeof resolutionSelections === 'undefined') {
        window.resolutionSelections = {};
    }

    (filtered || []).forEach(f => {
        if (!f) return;
        const ac = (f.acodec || '').toLowerCase();
        const note = (f.format_note || '').toLowerCase();
        const fid = (f.format_id || '').toLowerCase();

        // DRC formats stay separate
        const isDRC = note.includes('drc') || fid.includes('drc');

        // Clean codec name (e.g., mp4a.40.2 -> mp4a)
        let codecKey = 'other';
        const codecMatch = ac.match(/^[a-z0-9]+/);
        if (ac.includes('opus')) codecKey = 'opus';
        else if (ac.includes('mp4a')) codecKey = 'mp4a';
        else if (codecMatch && codecMatch[0] !== 'none' && codecMatch[0] !== 'null' && codecMatch[0] !== '0') codecKey = codecMatch[0];
        else codecKey = 'other';

        // Unique key for grouping: Codec + DRC status only
        const groupKey = `${isDRC ? 'DRC_' : ''}${codecKey}`;

        if (!groups[groupKey]) groups[groupKey] = [];
        groups[groupKey].push(f);
    });

    // Sort groups by priority
    const sortedGroupKeys = Object.keys(groups).sort((a, b) => {
        const pA = codecPriority[a] || 0;
        const pB = codecPriority[b] || 0;
        return pB - pA;
    });

    sortedGroupKeys.forEach(gKey => {
        const variants = groups[gKey].sort((a, b) => (b.tbr || 0) - (a.tbr || 0));

        // Track selection for audio too
        if (!resolutionSelections[gKey]) {
            resolutionSelections[gKey] = { formatId: variants[0].format_id };
        }

        const currentFormatId = resolutionSelections[gKey].formatId;
        const activeFmt = variants.find(f => f.format_id === currentFormatId) || variants[0];

        renderCompactRow(activeFmt, container, {
            resKey: gKey,
            variants,
            isAudioGrouping: true,
            isDRC: gKey.startsWith('DRC_'),
            isMultiLang: true
        });
    });
}

function renderCompactRow(fmt, container, smartData = null) {
    if (!fmt || !container) return;

    const isAudioOnly = (fmt.vcodec === 'audio only' || fmt.vcodec === 'none');
    const isMixed = smartData?.isMixed;

    const row = document.createElement('div');
    row.className = 'compact-row';
    if (isAudioOnly) row.classList.add('audio-row');
    if (isMixed) row.classList.add('mixed-row');

    const selVideo = (typeof selectedVideoId !== 'undefined') ? selectedVideoId : null;
    const selAudio = (typeof selectedAudioId !== 'undefined') ? selectedAudioId : null;

    if (fmt.format_id === selVideo || fmt.format_id === selAudio) {
        row.classList.add('selected');
    }

    const size = (typeof getFormatDisplaySize === 'function') ? getFormatDisplaySize(fmt) : '--';
    let tbr = Math.round(fmt.tbr || fmt.vbr || 0);
    const fallbackText = fmt.format_note || fmt.format || 'Unknown';
    const bitrateDisplay = tbr > 0 ? tbr + 'k' : fallbackText;

    // Main Title
    let mainTitle = '';
    let subTitle = '';
    let icon = '';

    if (isAudioOnly) {
        let codecNameRaw = (fmt.acodec || '').split('.')[0];
        if (!codecNameRaw || codecNameRaw.toLowerCase() === 'none' || codecNameRaw.toLowerCase() === 'null') codecNameRaw = 'Unknown';

        mainTitle = codecNameRaw.toUpperCase();
        subTitle = codecNameRaw;
        icon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--warning);"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`;
    } else {
        let w = Number(fmt.width) || 0;
        let h = Number(fmt.height) || 0;
        mainTitle = smartData ? smartData.resKey : ((w > 0 && h > 0) ? `${w}x${h}` : fallbackText);

        let vcRaw = (fmt.vcodec || '').split('.')[0];
        if (!vcRaw || vcRaw.toLowerCase() === 'none' || vcRaw.toLowerCase() === 'null') vcRaw = fallbackText;
        subTitle = vcRaw;

        if (isMixed) {
            icon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #a855f7;"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect><path d="M9 18V5l12-2v13"></path></svg>`;
        } else {
            icon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent);"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`;
        }
    }

    // Detail Tooltip (Native Title)
    const details = `ID: ${fmt.format_id}\nCodec: ${isAudioOnly ? fmt.acodec : fmt.vcodec}\nProtocol: ${fmt.protocol || 'N/A'}\nFPS: ${fmt.fps || 'N/A'}`;
    row.title = details;

    const getLangInfo = (f) => {
        if (!f) return { code: 'und', name: '' };
        const match = (f.format_note || '').match(/\[(.*?)\]\s*(.*?),/);
        return { code: f.language || match?.[1] || 'und', name: match?.[2] || '' };
    };

    let langSelectContainer = null;
    if ((isAudioOnly || isMixed) && smartData?.isMultiLang && Array.isArray(smartData.variants)) {
        const langMap = new Map();
        smartData.variants.forEach(v => {
            const info = getLangInfo(v);
            if (!langMap.has(info.code)) langMap.set(info.code, info.name);
        });

        const langOptions = Array.from(langMap).map(([code, name]) => ({
            value: code,
            label: `[${code.toUpperCase()}]`,
            full: `[${code.toUpperCase()}]${name ? ' ' + name : ''}`
        }));

        const currentLang = getLangInfo(fmt).code;

        if (langOptions.length > 1 && typeof createCustomSelect === 'function') {
            langSelectContainer = createCustomSelect(langOptions, currentLang, (newCode) => {
                const variantsForLang = smartData.variants.filter(v => getLangInfo(v).code === newCode).sort((a, b) => (b.tbr || 0) - (a.tbr || 0));
                const firstVariant = variantsForLang[0];

                if (firstVariant) {
                    if (fmt.format_id === selectedVideoId || fmt.format_id === selectedAudioId) {
                        if (isMixed) {
                            selectedVideoId = firstVariant.format_id;
                            selectedAudioId = null;
                        } else {
                            selectedAudioId = firstVariant.format_id;
                        }
                    }
                    resolutionSelections[smartData.resKey].formatId = firstVariant.format_id;
                    renderGrid();
                    if (typeof updateCommand === 'function') updateCommand();
                }
            });
            if (langSelectContainer) {
                langSelectContainer.classList.add('lang-select-container');
                langSelectContainer.style.marginRight = '5px';
            }
        } else if (isMixed && langOptions.length === 1) {
            const info = getLangInfo(fmt);
            if (info.code !== 'und') {
                const badge = document.createElement('span');
                badge.className = 'badge-pill';
                badge.style.marginRight = '5px';
                badge.textContent = `[${info.code.toUpperCase()}]`;
                langSelectContainer = badge;
            }
        }
    }

    let codecSelectContainer = null;
    if (smartData && smartData.ctypes && smartData.ctypes.length > 1 && typeof createCustomSelect === 'function') {
        const codecOptions = smartData.ctypes.map(c => ({
            value: c,
            label: (typeof getCodecBadgeHTML === 'function') ? getCodecBadgeHTML(c) : c
        }));
        codecSelectContainer = createCustomSelect(codecOptions, smartData.activeCType, (newCType) => {
            const variants = smartData.resGroup[newCType].sort((a, b) => (b.tbr || b.vbr || 0) - (a.tbr || a.vbr || 0));
            const firstVariant = variants[0];

            if (firstVariant) {
                if (fmt.format_id === selectedVideoId) {
                    selectedVideoId = firstVariant.format_id;
                    if (isMixed) selectedAudioId = null;
                }

                resolutionSelections[smartData.resKey] = { cType: newCType, formatId: firstVariant.format_id };
                renderGrid();
                if (typeof updateCommand === 'function') updateCommand();
            }
        });
        if (codecSelectContainer) codecSelectContainer.classList.add('codec-select-container');
    } else {
        if (!isAudioOnly) {
            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.alignItems = 'center';

            if (langSelectContainer) container.appendChild(langSelectContainer);

            const badgeWrapper = document.createElement('div');
            badgeWrapper.style.display = 'inline-flex';
            badgeWrapper.style.alignItems = 'center';
            badgeWrapper.innerHTML = (typeof getCodecBadgeHTML === 'function') ? getCodecBadgeHTML(subTitle) : subTitle;
            container.appendChild(badgeWrapper);

            codecSelectContainer = container;
        } else {
            codecSelectContainer = langSelectContainer;
        }
    }

    let bitrateSelectContainer = null;
    const filteredVars = smartData ? ((isAudioOnly || isMixed) ? (smartData.variants || []).filter(v => getLangInfo(v).code === getLangInfo(fmt).code) : (smartData.variants || [])) : [];

    if (smartData && filteredVars.length > 1 && typeof createCustomSelect === 'function') {
        const bitOptions = filteredVars.map(v => {
            const vTbr = Math.round(v.tbr || v.vbr || 0);
            const shortLabel = vTbr > 0 ? vTbr + 'k'
                : (typeof v.abr === 'number' ? Math.round(v.abr) + 'k' : 'AUTO');
            return {
                value: v.format_id,
                label: shortLabel,
                full: vTbr > 0 ? shortLabel : (v.format_note || v.format || 'Unknown')
            };
        });

        bitrateSelectContainer = createCustomSelect(bitOptions, fmt.format_id, (newId) => {
            if (fmt.format_id === selectedVideoId || fmt.format_id === selectedAudioId) {
                if (isAudioOnly) selectedAudioId = newId;
                else selectedVideoId = newId;
            }

            if (resolutionSelections[smartData.resKey]) {
                resolutionSelections[smartData.resKey].formatId = newId;
            }
            renderGrid();
            if (typeof updateCommand === 'function') updateCommand();
        });
    } else {
        const span = document.createElement('span');
        span.className = 'info-sub';
        span.textContent = bitrateDisplay;
        bitrateSelectContainer = span;
    }

    row.innerHTML = `
        <div class="info-group">
            <div class="info-main">${icon} ${mainTitle}</div>
            ${smartData?.isDRC ? `<div class="info-sub" style="color: var(--warning); font-size: 9px; margin-top: -2px; font-weight: 800; letter-spacing: 0.5px;">DRC ACTIVE</div>` : ''}
            <div class="info-details">
                ${!isAudioOnly && fmt.fps ? `<span class="info-sub">${fmt.fps} FPS</span>` : ''}
                ${isAudioOnly ? `<span class="info-sub">${bitrateDisplay}</span>` : ''}
                <span class="info-sub size-sub">${size}</span>
            </div>
        </div>
        <div class="col codec-slot"></div>
        <div class="col bitrate-slot"></div>
        <div class="col" style="text-align: center;">
            <button class="copy-link-btn" title="Copy URL" style="padding: 4px; border: 1px solid var(--border); border-radius: 4px; background: rgba(255,255,255,0.02);">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
        </div>
    `;

    // Inject custom selects
    const codecSlot = row.querySelector('.codec-slot');
    const bitrateSlot = row.querySelector('.bitrate-slot');
    if (codecSelectContainer && codecSlot) codecSlot.appendChild(codecSelectContainer);
    if (bitrateSelectContainer && bitrateSlot) bitrateSlot.appendChild(bitrateSelectContainer);

    // Row Click
    row.addEventListener('click', (e) => {
        if (e.target.closest('.custom-select-container') || e.target.closest('.copy-link-btn')) return;
        handleRowClick(fmt, row);
    });

    const copyBtn = row.querySelector('.copy-link-btn');
    if (copyBtn) {
        copyBtn.onclick = (e) => {
            e.stopPropagation();
            if (typeof copyDirectLink === 'function') {
                copyDirectLink(fmt.format_id, copyBtn);
            }
        };
    }

    container.appendChild(row);
}

function handleRowClick(fmt, rowElement) {
    if (!fmt) return;

    const isVideo = fmt.vcodec !== 'none';
    const isAudio = fmt.acodec !== 'none';
    const isMixed = isVideo && isAudio;

    const safeFormats = Array.isArray(formats) ? formats : [];

    // Helper to check if currently selected video is mixed
    const currentVideoIsMixed = () => {
        if (typeof selectedVideoId === 'undefined' || !selectedVideoId) return false;
        const f = safeFormats.find(x => x && x.format_id === selectedVideoId);
        return f && f.vcodec !== 'none' && f.acodec !== 'none';
    };

    if (isMixed) {
        if (typeof selectedVideoId !== 'undefined' && selectedVideoId === fmt.format_id) {
            selectedVideoId = null;
            selectedAudioId = null;
        } else {
            selectedVideoId = fmt.format_id;
            selectedAudioId = null; // Mixed already has audio
        }
    } else if (isVideo) {
        if (typeof selectedVideoId !== 'undefined' && selectedVideoId === fmt.format_id) {
            selectedVideoId = null;
        } else {
            // If current selection is Mixed, clear everything first
            if (currentVideoIsMixed()) {
                selectedAudioId = null;
            }
            selectedVideoId = fmt.format_id;

            // AUTO-SELECT AUDIO: Pick the best one according to our UI priority (Opus > MP4A > others, excluding DRC)
            if (typeof selectedAudioId === 'undefined' || !selectedAudioId) {
                const audioOnly = safeFormats.filter(f => f && (f.vcodec === 'audio only' || f.vcodec === 'none') && f.acodec !== 'none');

                const getScore = (f) => {
                    const ac = (f.acodec || '').toLowerCase();
                    const note = (f.format_note || '').toLowerCase();
                    const fid = (f.format_id || '').toLowerCase();
                    const isDRC = note.includes('drc') || fid.includes('drc');

                    let score = isDRC ? -100 : 0;
                    if (ac.includes('opus')) score += 10;
                    else if (ac.includes('mp4a')) score += 5;

                    return score;
                };

                const bestAudio = audioOnly.sort((a, b) => {
                    const scoreDiff = getScore(b) - getScore(a);
                    if (scoreDiff !== 0) return scoreDiff;
                    return (b.tbr || 0) - (a.tbr || 0);
                })[0];

                if (bestAudio) {
                    selectedAudioId = bestAudio.format_id;
                }
            }
        }
    } else if (isAudio) {
        if (typeof selectedAudioId !== 'undefined' && selectedAudioId === fmt.format_id) {
            selectedAudioId = null;
        } else {
            // If current selection is Mixed, clear it because we want standalone audio
            if (currentVideoIsMixed()) {
                selectedVideoId = null;
            }
            selectedAudioId = fmt.format_id;
        }
    }

    renderGrid(); // Re-render to show selection visuals
    if (typeof updateCommand === 'function') updateCommand();
}