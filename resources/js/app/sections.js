// Sections (trim) feature and subtitles UI/download.
// (extracted from resources/js/main.js — keep in sync with load order in app.html)

// Sections Listeners
if (el.downloadSectionBtn) {
    // Helper to get time in seconds from inputs
    function getTimeFromInputs(prefix) {
        const h = parseInt(el.sections[prefix + 'H'].value) || 0;
        const m = parseInt(el.sections[prefix + 'M'].value) || 0;
        const s = parseInt(el.sections[prefix + 'S'].value) || 0;
        return h * 3600 + m * 60 + s;
    }

    function updateSliderVisualsOnly() {
        const currentStart = parseInt(el.sections.startSlider.value) || 0;
        const currentEnd = parseInt(el.sections.endSlider.value) || 0;
        const max = parseInt(el.sections.startSlider.max) || 100;

        el.sections.startTimeDisp.textContent = formatDuration(currentStart);
        el.sections.endTimeDisp.textContent = formatDuration(currentEnd);

        const startPercent = (currentStart / max) * 100;
        const endPercent = (currentEnd / max) * 100;

        el.sections.sliderTrackFill.style.left = `${Math.max(0, Math.min(100, startPercent))}%`;
        el.sections.sliderTrackFill.style.width = `${Math.max(0, endPercent - startPercent)}%`;
    }

    function onSliderInput(e) {
        let startVal = parseInt(el.sections.startSlider.value) || 0;
        let endVal = parseInt(el.sections.endSlider.value) || 0;

        // Prevent overlap (thumbs pushing each other)
        if (e.target === el.sections.startSlider && startVal > endVal) {
            el.sections.startSlider.value = endVal;
            startVal = endVal;
        }
        if (e.target === el.sections.endSlider && endVal < startVal) {
            el.sections.endSlider.value = startVal;
            endVal = startVal;
        }

        updateSliderVisualsOnly();
        setTimePicker('start', formatDuration(startVal));
        setTimePicker('end', formatDuration(endVal));
    }

    // Enforce START ≤ END at all times. The sides "push" each other:
    // - Moving START past END drags END with it.
    // - Moving END below START drags START with it.
    function reconcileRange(movedSide = null) {
        let startSec = getTimeFromInputs('start');
        let endSec = getTimeFromInputs('end');

        if (startSec > endSec) {
            if (movedSide === 'end') {
                // END crossed below START → pull START down with it
                startSec = endSec;
                setTimePicker('start', formatDuration(startSec));
            } else {
                // START crossed above END → push END up with it
                endSec = startSec;
                setTimePicker('end', formatDuration(endSec));
            }
        }
        return { startSec, endSec };
    }

    function syncSlidersFromInputs(movedSide = null) {
        const { startSec, endSec } = reconcileRange(movedSide);
        el.sections.startSlider.value = startSec;
        el.sections.endSlider.value = endSec;
        updateSliderVisualsOnly();
        return { startSec, endSec };
    }

    el.sections.startSlider.addEventListener('input', onSliderInput);
    el.sections.endSlider.addEventListener('input', onSliderInput);

    el.downloadSectionBtn.addEventListener('click', () => {
        let videoDuration = getDurationSeconds(currentData) || 0;
        if (videoDuration === 0) videoDuration = 3600; // Fallback to 1 hour if unknown

        el.sections.startSlider.max = videoDuration;
        el.sections.endSlider.max = videoDuration;

        let startSec = getTimeFromInputs('start');
        let endSec = getTimeFromInputs('end');

        // Treat 00:00:00 end as "unset" → full video length
        if (endSec === 0) {
            endSec = videoDuration;
            if (startSec > endSec) startSec = endSec; // video shorter than a stored start time
            setTimePicker('end', formatDuration(endSec));
        }

        // Clamp to video length, then enforce START ≤ END
        startSec = Math.min(startSec, videoDuration);
        endSec = Math.min(endSec, videoDuration);
        if (startSec > endSec) {
            ({ startSec, endSec } = reconcileRange('end')); // END is newer/sure → START follows it
        }

        el.sections.startSlider.value = startSec;
        el.sections.endSlider.value = endSec;
        updateSliderVisualsOnly();

        el.sections.modal.classList.remove('hidden');
    });
}
if (el.sections.closeBtn) {
    el.sections.closeBtn.addEventListener('click', () => {
        el.sections.modal.classList.add('hidden');
    });
}
// Section Spinners Logic
document.querySelectorAll('.t-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetId = btn.getAttribute('data-target');
        const isUp = btn.classList.contains('t-up');
        const max = parseInt(btn.getAttribute('data-max'));
        const input = document.getElementById(targetId);
        if (!input) return;

        let val = parseInt(input.value) || 0;
        if (isUp) val++;
        else val--;

        if (val < 0) val = max;
        if (val > max) val = 0;

        input.value = val.toString().padStart(2, '0');
        syncSlidersFromInputs(targetId.startsWith('start') ? 'start' : 'end');
    });
});

document.querySelectorAll('.t-val').forEach(input => {
    input.addEventListener('blur', (e) => {
        let val = parseInt(e.target.value) || 0;
        const max = parseInt(e.target.previousElementSibling.getAttribute('data-max')) || 59;
        if (val < 0) val = 0;
        if (val > max) val = max;
        e.target.value = val.toString().padStart(2, '0');
        syncSlidersFromInputs(e.target.id.startsWith('start') ? 'start' : 'end');
    });
});

document.querySelectorAll('.time-segment').forEach(seg => {
    seg.addEventListener('wheel', (e) => {
        e.preventDefault();
        const btn = seg.querySelector(e.deltaY < 0 ? '.t-up' : '.t-down');
        if (btn) btn.click();
    });
});

const setTimePicker = (prefix, timeStr) => {
    if (!timeStr) {
        el.sections[prefix + 'H'].value = '00';
        el.sections[prefix + 'M'].value = '00';
        el.sections[prefix + 'S'].value = '00';
        return;
    }
    let parts = timeStr.split(':');
    if (parts.length === 2) parts = ['00', ...parts]; // MM:SS format
    if (parts.length === 1) parts = ['00', '00', ...parts]; // SS format

    el.sections[prefix + 'H'].value = (parts[0] || '0').toString().padStart(2, '0');
    el.sections[prefix + 'M'].value = (parts[1] || '0').toString().padStart(2, '0');
    el.sections[prefix + 'S'].value = (parts[2] || '0').toString().padStart(2, '0');
};

if (el.sections.applyBtn) {
    el.sections.applyBtn.addEventListener('click', () => {
        const startH = el.sections.startH.value;
        const startM = el.sections.startM.value;
        const startS = el.sections.startS.value;
        const endH = el.sections.endH.value;
        const endM = el.sections.endM.value;
        const endS = el.sections.endS.value;

        const start = `${startH}:${startM}:${startS}`;
        const end = `${endH}:${endM}:${endS}`;

        if (end !== "00:00:00") {
            // Defensive: apply can never produce an empty or reversed section
            if (getTimeFromInputs('end') <= getTimeFromInputs('start')) {
                alert('End time must be greater than start time.');
                return;
            }
            sectionTime = `*${start}-${end}`;
            updateCommand();
            el.sections.modal.classList.add('hidden');
            el.statusMsg.textContent = 'Section Applied ✔️';
            el.downloadSectionBtn.style.color = '#4caf50'; // Make button green to indicate active

            // Show clear badge and make it flex
            if (el.clearSectionBadge) {
                el.clearSectionBadge.classList.remove('hidden');
                el.clearSectionBadge.style.display = 'flex';
            }

            setTimeout(() => el.statusMsg.textContent = 'Ready', 2000);
        } else {
            alert('Please specify an end time greater than 00:00:00.');
        }
    });
}
if (el.sections.clearBtn) {
    el.sections.clearBtn.addEventListener('click', () => {
        sectionTime = '';
        setTimePicker('start', '');
        setTimePicker('end', '');
        el.sections.chapterSelect.value = '';
        const durSpan = document.getElementById('chapterTotalDuration');
        if (durSpan) durSpan.textContent = '';
        syncSlidersFromInputs();
        updateCommand();
        el.sections.modal.classList.add('hidden');
        el.statusMsg.textContent = 'Section Cleared';
        el.downloadSectionBtn.style.color = ''; // Reset button color

        // Hide clear badge
        if (el.clearSectionBadge) el.clearSectionBadge.classList.add('hidden');

        setTimeout(() => el.statusMsg.textContent = 'Ready', 2000);
    });
}
if (el.clearSectionBadge) {
    el.clearSectionBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        if (el.sections.clearBtn) el.sections.clearBtn.click();
    });
}
if (el.sections.chapterSelect) {
    el.sections.chapterSelect.addEventListener('change', () => {
        const selectedOptions = Array.from(el.sections.chapterSelect.selectedOptions);
        const durationSpan = document.getElementById('chapterTotalDuration');

        if (selectedOptions.length > 0) {
            el.sections.chapterSelect.setAttribute('dir', selectedOptions[0].getAttribute('dir') || 'ltr');

            let minStart = Infinity;
            let maxEnd = 0;

            selectedOptions.forEach(opt => {
                const parts = opt.value.split('-');
                const s = parseFloat(parts[0]);
                const e = parseFloat(parts[1]);
                if (s < minStart) minStart = s;
                if (e > maxEnd) maxEnd = e;
            });

            setTimePicker('start', formatDuration(minStart));
            setTimePicker('end', formatDuration(maxEnd));

            const totalSec = maxEnd - minStart;
            if (durationSpan) durationSpan.textContent = `Total: ${formatDuration(totalSec)}`;
        } else {
            setTimePicker('start', '');
            setTimePicker('end', '');
            if (durationSpan) durationSpan.textContent = '';
        }
        syncSlidersFromInputs();
    });
}


function renderSubtitles() {
    if (!currentData) return;

    el.subOptionsList.innerHTML = '';
    const subs = currentData.subtitles || {};
    const autoSubs = currentData.automatic_captions || {};

    // Add Auto Captions Toggle inside dropdown
    const autoToggleRow = document.createElement('div');
    autoToggleRow.className = 'custom-option';
    autoToggleRow.style.padding = '8px 12px';
    autoToggleRow.style.borderBottom = '1px solid var(--border-light)';
    autoToggleRow.innerHTML = `
        <label class="toggle-switch" style="gap: 8px; width: 100%; cursor: pointer;">
            <input type="checkbox" id="includeAutoSubsInner" ${autoSubsEnabled ? 'checked' : ''}>
            <span class="slider" style="width: 30px; height: 16px; --slider-size: 11px;"></span>
            <span style="font-size: 10px; font-weight: 800; color: var(--text-muted);">INCLUDE AUTO</span>
        </label>
    `;
    autoToggleRow.onclick = (e) => e.stopPropagation();
    el.subOptionsList.appendChild(autoToggleRow);

    // Listener for the inner toggle
    setTimeout(() => {
        const toggle = document.getElementById('includeAutoSubsInner');
        if (toggle) {
            toggle.onchange = (e) => {
                autoSubsEnabled = e.target.checked;
                renderSubtitles();
                updateCommand();
            };
        }
    }, 0);

    const allSubs = { ...subs };
    if (autoSubsEnabled) {
        Object.keys(autoSubs).forEach(lang => {
            if (!allSubs[lang]) allSubs[lang] = autoSubs[lang];
        });
    }

    const langCodes = Object.keys(allSubs).sort();

    if (langCodes.length > 0) {
        el.subSelectorWrapper.classList.remove('hidden');
        langCodes.forEach(code => {
            const subInfo = allSubs[code];
            const name = subInfo[0]?.name || code;
            const isSelected = selectedSubtitles.includes(code);

            const option = document.createElement('div');
            option.className = `custom-option ${isSelected ? 'selected' : ''}`;
            option.style.display = 'flex';
            option.style.alignItems = 'center';
            option.style.gap = '10px';

            option.innerHTML = `
                <div style="width: 14px; height: 14px; border: 1.5px solid ${isSelected ? '#a855f7' : 'var(--accent)'}; border-radius: 3px; display: flex; align-items: center; justify-content: center; background: ${isSelected ? '#a855f7' : 'transparent'};">
                    ${isSelected ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
                </div>
                <div style="display: flex; flex-direction: column; overflow: hidden;">
                    <span style="font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}</span>
                    <span style="font-size: 9px; opacity: 0.6; font-family: var(--font-mono);">${code.toUpperCase()}</span>
                </div>
                <button class="sub-download-btn" title="Download Subtitle File" style="margin-left: auto; padding: 4px; border: none; background: transparent; color: var(--text-muted); cursor: pointer; border-radius: 4px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                </button>
            `;

            const isAuto = autoSubs[code] && !subs[code];

            const subDlBtn = option.querySelector('.sub-download-btn');
            subDlBtn.onclick = (e) => {
                e.stopPropagation();
                downloadSubtitle(code, name, subDlBtn, isAuto);
            };

            option.onclick = (e) => {
                e.stopPropagation();
                if (selectedSubtitles.includes(code)) {
                    selectedSubtitles = selectedSubtitles.filter(c => c !== code);
                } else {
                    selectedSubtitles.push(code);
                }
                renderSubtitles();
                updateCommand();
            };

            el.subOptionsList.appendChild(option);
        });
    } else {
        el.subSelectorWrapper.classList.add('hidden');
    }

    el.subCountText.textContent = `Subs (${selectedSubtitles.length})`;
    if (selectedSubtitles.length > 0) {
        el.subMultiSelect.querySelector('.custom-select-trigger').style.borderColor = '#a855f7';
        el.subCountText.style.color = '#a855f7';
        el.subCountText.style.fontWeight = '700';
    } else {
        el.subMultiSelect.querySelector('.custom-select-trigger').style.borderColor = 'rgba(168, 85, 247, 0.4)';
        el.subCountText.style.color = 'var(--text-secondary)';
        el.subCountText.style.fontWeight = '500';
    }
}

// Toggle logic for subtitle multi-select
el.subMultiSelect.querySelector('.custom-select-trigger').onclick = (e) => {
    e.stopPropagation();
    const isActive = el.subMultiSelect.classList.contains('active');

    // Close all other selects first
    document.querySelectorAll('.custom-select-container').forEach(c => c.classList.remove('active'));

    if (!isActive) {
        el.subMultiSelect.classList.add('active');
    }
};

// Global click to close
document.addEventListener('click', () => {
    el.subMultiSelect.classList.remove('active');
});

// Load settings and check tools on startup
async function downloadSubtitle(langCode, langName, btnElement, isAuto = false) {
    if (!currentData) return;

    const subs = isAuto ? currentData.automatic_captions : currentData.subtitles;
    const subInfo = subs[langCode];

    if (!subInfo || subInfo.length === 0) {
        showStatus("Subtitle URL not found", "error");
        return;
    }

    // Pick the best format (prefer srt or vtt)
    const bestFormat = subInfo.find(s => s.ext === 'srt') || subInfo.find(s => s.ext === 'vtt') || subInfo[0];
    const subUrl = bestFormat.url;
    const ext = bestFormat.ext || 'vtt';

    // Sanitize title for default filename
    const safeTitle = (currentData.title || 'subtitle').replace(/[\\/:*?"<>|]/g, '_').substring(0, 80);
    const defaultName = `${safeTitle}_${langCode}.${ext}`;

    try {
        // Ask user where to save
        const fullPath = await Neutralino.os.showSaveDialog('Save Subtitle', {
            defaultPath: defaultName,
            filters: [
                { name: 'Subtitle Files', extensions: [ext, 'srt', 'vtt'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (!fullPath) return; // User cancelled

        const originalHTML = btnElement.innerHTML;
        btnElement.innerHTML = `<svg class="anim-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>`;
        btnElement.disabled = true;

        // Direct download (cross platform)
        let cmd = window.NL_OS === 'Windows'
            ? `powershell -Command "Invoke-WebRequest -Uri '${subUrl}' -OutFile '${fullPath}'"`
            : `curl -L -o "${fullPath}" "${subUrl}"`;

        const output = await Neutralino.os.execCommand(cmd);

        // Success is exitCode 0
        if (output.exitCode === 0) {
            btnElement.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="4"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            showStatus(`Saved: ${langName} subtitle`, 'success');
        } else {
            console.error("Download Error:", output.stdErr);
            btnElement.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        }

        setTimeout(() => {
            btnElement.innerHTML = originalHTML;
            btnElement.disabled = false;
        }, 2500);

    } catch (e) {
        console.error("Subtitle save error:", e);
        showStatus("Error saving subtitle", "error");
    }
}


