// app.html inline-style extraction: ordered (from → to) replacements with count verification.
const fs = require('fs');
const p = 'resources/app.html';
let html = fs.readFileSync(p, 'utf8');
const orig = html;

const ops = [
    // [from, to, expectedCount]
    ['<body style="padding-top: 0;">', '<body>', 1],

    ['<button id="analyzePlaylistBtn" class="primary-btn"\n          style="background: linear-gradient(135deg, #b9101037 0%, #9605057b 100%);"\n          title="Analyze as Playlist">Playlist</button>',
     '<button id="analyzePlaylistBtn" class="primary-btn analyze-playlist-btn" title="Analyze as Playlist">Playlist</button>', 1],

    ['<button id="quickM4aBtn" class="secondary-btn" title="Quick Download Audio"\n          style="min-width: 52px; padding: 0 14px; display: flex; align-items: center; justify-content: center; gap: 8px; border-color: var(--warning); color: var(--warning);">',
     '<button id="quickM4aBtn" class="secondary-btn quick-audio-btn" title="Quick Download Audio">', 1],

    ['<span id="quickAudioLabel"\n            style="font-size: 10px; font-weight: 900; background: var(--warning); color: #000; padding: 2px 5px; border-radius: 4px; line-height: 1;">M4A</span>',
     '<span id="quickAudioLabel" class="quick-audio-badge">M4A</span>', 1],

    ['class="loading-overlay hidden" style="flex-direction: column; gap: 20px;">', 'class="loading-overlay hidden loading-column">', 1],

    // header icon colors (settings gear is also matched here - all are icon svgs)
    ['style="color: var(--accent);">', 'class="svg-accent">', 3],
    ['style="color: var(--warning);">', 'class="svg-warning">', 1],

    ['<span style="font-weight: 700; font-size: 13px;">Audio</span>', '<span class="split-title">Audio</span>', 1],

    ['class="hidden" style="display: flex; align-items: center; gap: 6px;">', 'class="hidden sub-selector-wrapper">', 1],
    ['class="custom-select-container" id="subMultiSelect" style="min-width: 110px;">', 'class="custom-select-container sub-multi-select" id="subMultiSelect">', 1],
    ['<div class="custom-select-trigger"\n                    style="padding: 4px 8px; font-size: 11px; height: 26px; border-color: rgba(168, 85, 247, 0.4);">',
     '<div class="custom-select-trigger sub-trigger">', 1],
    ['style="color: #a855f7; margin-right: 4px;">', 'class="sub-icon">', 1],
    ['class="custom-options custom-scrollbar" id="subOptionsList"\n                    style="max-height: 250px; width: 180px; right: 0;">',
     'class="custom-options custom-scrollbar sub-options" id="subOptionsList">', 1],
    ['class="info-sub" style="margin-left: 8px; font-size: 11px;">', 'class="info-sub info-sub-sm">', 1],

    // bottom panel
    ['<div style="position: relative; display: inline-block;">', '<div class="badge-anchor">', 1],
    ['<button id="clearSectionBadge" class="hidden" title="Clear Section"\n            style="position: absolute; right: -6px; top: -6px; background: #e53935; color: #fff; border: none; border-radius: 50%; width: 22px; height: 22px; font-size: 12px; cursor: pointer; align-items: center; justify-content: center; z-index: 10; box-shadow: 0 2px 5px rgba(0,0,0,0.5);">✖</button>',
     '<button id="clearSectionBadge" class="hidden section-clear-badge" title="Clear Section">✖</button>', 1],
    ['<div style="position: relative; display: inline-flex; align-items: center;">', '<div class="badge-anchor-flex">', 1],
    ['<div id="formatTooltip" class="hidden"\n            style="position: absolute; top: -45px; right: 0; background: var(--bg-card); border: 1px solid var(--border-light); padding: 6px 12px; border-radius: 6px; font-size: 0.85em; font-weight: 500; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.5); color: var(--text-primary); align-items: center; gap: 8px; z-index: 20; transition: all 0.2s ease;">',
     '<div id="formatTooltip" class="hidden format-tooltip">', 1],
    ['<span id="selectedFormatInfoText" style="color: var(--accent-light);"></span>', '<span id="selectedFormatInfoText" class="format-tooltip-text"></span>', 1],
    ['<button id="clearFormatBadge" title="Clear Selection"\n              style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 2px; margin: 0; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: color 0.2s ease;"\n              onmouseover',
     '<button id="clearFormatBadge" class="format-tooltip-close" title="Clear Selection"\n              onmouseover', 1],
    ['<div\n              style="position: absolute; bottom: -6px; right: 40px; border-width: 6px 6px 0; border-style: solid; border-color: var(--bg-card) transparent transparent transparent; z-index: 21;">\n            </div>',
     '<div class="tooltip-tail inner"></div>', 1],
    ['<div\n              style="position: absolute; bottom: -7px; right: 40px; border-width: 6px 6px 0; border-style: solid; border-color: var(--border-light) transparent transparent transparent; z-index: 20;">\n            </div>',
     '<div class="tooltip-tail"></div>', 1],

    // modal title icons
    ['style="vertical-align: -0.125em; margin-right: 8px; color: var(--accent);">', 'class="modal-title-icon">', 2],
    ['style="vertical-align: -0.125em; margin-right: 8px; fill: var(--accent);">', 'class="modal-title-icon">', 1],

    // dep-actions handled FIRST before the generic split-header-group string (same shape)
    ['<div style="display: flex; align-items: center; gap: 10px;">\n                      <span id="ytdlpVersionText"', '<div class="dep-actions">\n                      <span id="ytdlpVersionText"', 1],

    ['style="display: flex; align-items: center; gap: 10px;">', 'class="split-header-group">', 2],
    ['style="display: flex; align-items: center; gap: 8px; flex: 1;">', 'class="split-header-group main">', 1],

    // settings panes
    ['style="display: flex; flex-direction: column; gap: 2px; margin-bottom: 8px;">', 'class="card-heading mb8">', 1],
    ['style="display: flex; flex-direction: column; gap: 2px; max-width: 80%;">', 'class="setting-row-label">', 6],
    ['style="display: flex; flex-direction: column; gap: 2px;">', 'class="card-heading">', 6], // (9 total minus 1 dep? no - others consumed earlier: 9 raw - none consumed yet)
    ['style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">', 'class="setting-row mb8">', 2],
    ['style="display: flex; justify-content: space-between; align-items: center;">', 'class="setting-row">', 6], // 6 commit - chapter row handled separately below? NO see note
    ['style="font-size: 13px; font-weight: 600; color: var(--text-primary);">', 'class="setting-row-title">', 6],
    ['style="font-size: 13px; font-weight: 600; color: var(--text-primary); display: block;">', 'class="setting-row-title">', 3],
    [' style="margin-top: 0;"', '', 5],
    ['class="toggle-switch" style="margin-bottom: 0; gap: 0;">', 'class="toggle-switch">', 7],

    ['style="min-width: 140px; background: var(--bg-hover); border: 1px solid var(--border-light); color: var(--text-primary); padding: 8px 12px; border-radius: var(--radius-sm);">', 'class="settings-select">', 2],
    ['style="min-width: 120px; background: var(--bg-hover); border: 1px solid var(--border-light); color: var(--text-primary); padding: 6px 12px; border-radius: var(--radius-sm);">', 'class="settings-select sm">', 1],
    ['style="display: flex; gap: 8px; width: 100%; margin-top: 4px;">', 'class="input-row mt4">', 1],
    ['style="display: flex; gap: 8px; width: 100%;">', 'class="input-row">', 1],
    ['input type="text" id="downloadPath" value="Downloads" readonly\n                      style="flex: 1; background: var(--bg-hover); border: 1px solid var(--border-light); color: var(--text-primary); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 13px;">',
     'input type="text" id="downloadPath" value="Downloads" readonly class="settings-text-input">', 1],
    ['input type="text" id="cookiesPath" value="" placeholder="No cookies file"\n                      style="flex: 1; background: var(--bg-hover); border: 1px solid var(--border-light); color: var(--text-primary); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 13px;">',
     'input type="text" id="cookiesPath" value="" placeholder="No cookies file" class="settings-text-input">', 1],
    ['<button id="browseBtn" class="secondary-btn" style="padding: 8px 14px;">Browse</button>', '<button id="browseBtn" class="secondary-btn btn-md">Browse</button>', 1],
    ['<button id="browseCookiesBtn" class="secondary-btn" style="padding: 8px 12px;">Browse</button>', '<button id="browseCookiesBtn" class="secondary-btn btn-pad12">Browse</button>', 1],
    ['<button id="clearCookiesBtn" class="secondary-btn" style="padding: 8px 12px;">Clear</button>', '<button id="clearCookiesBtn" class="secondary-btn btn-pad12">Clear</button>', 1],
    ['input type="number" id="concurrentFragments" min="1" max="32" value="1"\n                    style="background: var(--bg-hover); border: 1px solid var(--border-light); color: var(--text-primary); padding: 8px 12px; border-radius: var(--radius-sm); font-family: var(--font-ui); font-size: 13px; width: 70px; text-align: center;">',
     'input type="number" id="concurrentFragments" min="1" max="32" value="1" class="settings-number-input">', 1],
    ['<small style="color: var(--warning); font-weight: 600; margin-top: 4px;">', '<small class="shortcut-hint">', 1],
    ['class="settings-card" style="gap: 16px;">', 'class="settings-card gap-lg">', 1],
    ['<label\n                    style="border-bottom: 1px solid var(--border-light); padding-bottom: 6px; margin-bottom: 4px;">Download\n                    Switches</label>',
     '<label class="card-label-underlined">Download Switches</label>', 1],
    ['style="display: flex; flex-direction: column; gap: 14px;">', 'class="switch-list">', 1],

    ['<a href="#" id="cookiesTutorialLink"\n                        style="font-size: 11px; color: var(--accent-light); text-decoration: none; display: inline-flex; align-items: center; gap: 4px; margin-top: 2px; opacity: 0.85; transition: opacity 0.2s;"\n                        onmouseover',
     '<a href="#" id="cookiesTutorialLink" class="settings-inline-link"\n                        onmouseover', 1],
    ['<div id="cookiesRuntimeWarning" class="hidden"\n                    style="color: var(--warning, #f59e0b); font-size: 11px; margin-top: 8px; font-weight: 500; display: none; align-items: center; gap: 4px;">',
     '<div id="cookiesRuntimeWarning" class="hidden runtime-warning">', 1],

    ['<p style="font-size: 12px; color: var(--text-muted); margin-top: -10px;">', '<p class="settings-pane-note">', 1],
    ['style="width: 130px; text-align: center; background: var(--bg-hover); border: 1px solid var(--border-light); color: var(--text-primary); padding: 8px; border-radius: var(--radius-sm); cursor: pointer; transition: all 0.2s ease; font-family: var(--font-ui); font-size: 12px; font-weight: 600;">',
     'class="shortcut-input">', 3],

    // about & deps
    ['class="settings-card" style="align-items: center; text-align: center; padding: 20px; gap: 8px;">', 'class="settings-card about-card">', 1],
    ['<img src="icon.png" alt="App Logo" style="height: 50px; filter: drop-shadow(0 2px 6px #ff86007a);">', '<img src="icon.png" alt="App Logo" class="about-logo">', 1],
    ['<span style="font-weight: 700; font-size: 16px; color: var(--text-primary);">YT-MANGO</span>', '<span class="about-title">YT-MANGO</span>', 1],
    ['<span style="font-size: 12px; color: var(--text-muted);">A professional graphical interface for\n                    yt-dlp.</span>', '<span class="about-desc">A professional graphical interface for\n                    yt-dlp.</span>', 1],
    ['<button id="openGithubBtn" class="secondary-btn"\n                    style="padding: 6px 14px; font-size: 11px; margin-top: 6px;">GitHub Repository</button>',
     '<button id="openGithubBtn" class="secondary-btn about-github-btn">GitHub Repository</button>', 1],
    ['class="settings-card" style="gap: 12px;">', 'class="settings-card gap-md">', 1],
    ['<label style="margin-bottom: 0;">Core Dependencies</label>', '<label>Core Dependencies</label>', 1],
    ['<div\n                    style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: rgba(128,128,128,0.08); border-radius: var(--radius-sm); border: 1px solid var(--border-light);">',
     '<div class="dep-row">', 1],
    ['<div\n                    style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: rgba(128,128,128,0.08); border-radius: var(--radius-sm); border: 1px solid var(--border-light);">',
     '<div class="dep-row lg">', 1],
    ['<span style="font-size: 13px; font-weight: 600;">yt-dlp version</span>', '<span class="dep-name">yt-dlp version</span>', 1],
    ['<span style="font-size: 13px; font-weight: 600;">FFmpeg version</span>', '<span class="dep-name">FFmpeg version</span>', 1],
    ['<span id="ytdlpVersionText"\n                        style="font-weight: 600; color: var(--text-secondary); font-size: 13px;">Checking...</span>',
     '<span id="ytdlpVersionText" class="version-text">Checking...</span>', 1],
    ['<span id="ffmpegVersionText"\n                      style="font-weight: 600; color: var(--text-secondary); font-size: 13px;">Checking...</span>',
     '<span id="ffmpegVersionText" class="version-text">Checking...</span>', 1],
    ['<button id="updateYtdlpBtn" class="secondary-btn"\n                        style="padding: 4px 10px; font-size: 10px; display: flex; align-items: center; gap: 4px;">',
     '<button id="updateYtdlpBtn" class="secondary-btn btn-xs btn-with-icon">', 1],

    // modals
    ['<p style="margin-bottom: 15px; font-size: 0.9em; color: var(--text-muted);">Download a specific part of the video.</p>',
     '<p class="modal-note">Download a specific part of the video.</p>', 1],
    ['<p style="margin-bottom: 15px; font-size: 0.9em; color: var(--text-muted);">Select which videos from the playlist you want\n            to download.</p>',
     '<p class="modal-note">Select which videos from the playlist you want\n            to download.</p>', 1],
    ['<span id="chapterTotalDuration" style="font-size: 12px; color: var(--accent); font-weight: bold;"></span>', '<span id="chapterTotalDuration" class="chapter-total"></span>', 1],
    ['class="range-slider-wrapper"\n            style="margin-bottom: 20px; position: relative; padding-top: 20px; padding-bottom: 20px;">',
     'class="range-slider-wrapper range-slider-padded">', 1],
    ['class="slider-labels"\n              style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-top: 8px;">',
     'class="slider-labels slider-labels-row">', 1],
    ['style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px;">', 'class="modal-footer">', 2],
    ['class="modal-content" style="max-width: 600px; width: 90%;">', 'class="modal-content">', 1],
    ['style="margin-bottom: 15px; display: flex; gap: 8px;">', 'class="playlist-actions">', 1],
    ['<button id="selectAllPlaylistBtn" class="secondary-btn" style="padding: 4px 10px; font-size: 12px;">Select\n              All</button>',
     '<button id="selectAllPlaylistBtn" class="secondary-btn btn-sm">Select\n              All</button>', 1],
    ['<button id="deselectAllPlaylistBtn" class="secondary-btn"\n              style="padding: 4px 10px; font-size: 12px;">Deselect\n              All</button>',
     '<button id="deselectAllPlaylistBtn" class="secondary-btn btn-sm">Deselect\n              All</button>', 1],
    ['<div id="playlistItems"\n            style="display: flex; flex-direction: column; gap: 8px; max-height: 40vh; overflow-y: auto; background: var(--bg-secondary); padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border);">',
     '<div id="playlistItems" class="playlist-items">', 1],

    ['class="modal-content" style="max-width: 450px; text-align: center;">', 'class="modal-content install-modal-content">', 1],
    ['<div class="success-icon"\n          style="background: linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 100%);">',
     '<div class="success-icon accent">', 1],
    ['<p id="installDesc"\n          style="color: var(--text-secondary); font-size: 14px; margin-bottom: 25px; line-height: 1.5;">',
     '<p id="installDesc" class="install-desc">', 1],
    ['style="display: flex; gap: 12px; justify-content: center;">', 'class="install-actions">', 1],
    ['<button id="exitAppBtn" class="secondary-btn" style="padding: 10px 24px;">Exit</button>', '<button id="exitAppBtn" class="secondary-btn btn-hero">Exit</button>', 1],
    ['<button id="skipInstallBtn" class="secondary-btn hidden" style="padding: 10px 24px;">Skip</button>', '<button id="skipInstallBtn" class="secondary-btn btn-hero hidden">Skip</button>', 1],
    ['<button id="startInstallBtn" class="primary-btn" style="padding: 10px 24px;">Download Now</button>', '<button id="startInstallBtn" class="primary-btn btn-hero">Download Now</button>', 1],
    ['<p id="progressDesc" style="color: var(--text-secondary); font-size: 13px; margin-bottom: 20px;">', '<p id="progressDesc" class="progress-desc">', 1],
    ['<div class="progress-track" style="height: 8px;">', '<div class="progress-track thin">', 1],
    ['<div id="installProgressBar" class="progress-fill"\n            style="width: 100%; animation: indeterminate 2s infinite linear;"></div>',
     '<div id="installProgressBar" class="progress-fill indeterminate-bar"></div>', 1],
    ['<div id="installStatusText" style="font-size: 12px; color: var(--accent-light); margin-top: 10px;">', '<div id="installStatusText" class="install-status">', 1],

    ['class="modal-content" style="max-width: 400px; text-align: center;">', 'class="modal-content alert-modal-content">', 1],
    ['<div class="success-icon"\n        style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2);">',
     '<div class="success-icon danger">', 1],
    ['<h3 id="alertTitle" style="margin-top: 15px;">Notice</h3>', '<h3 id="alertTitle" class="alert-title">Notice</h3>', 1],
    ['<div style="max-height: 250px; overflow-y: auto; margin: 15px 0 25px; padding-right: 5px;"\n        class="custom-scrollbar">',
     '<div class="custom-scrollbar alert-body">', 1],
    ['<p id="alertMsg"\n          style="color: var(--text-secondary); font-size: 14px; line-height: 1.5; text-align: left; white-space: pre-wrap; word-break: break-word;">',
     '<p id="alertMsg" class="alert-msg">', 1],
    ['<div id="alertFixWrapper" class="hidden" style="margin-bottom: 15px;">', '<div id="alertFixWrapper" class="hidden alert-fix-wrapper">', 1],
    ['<button id="alertFixBtn" class="primary-btn"\n          style="width: 100%; padding: 12px; background: linear-gradient(135deg, var(--warning) 0%, #d97706 100%); border: none; font-weight: 700; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);">',
     '<button id="alertFixBtn" class="primary-btn alert-fix-btn">', 1],
    ['<button id="closeAlertBtn" class="primary-btn" style="width: 100%; padding: 12px;">OK</button>', '<button id="closeAlertBtn" class="primary-btn btn-block">OK</button>', 1],
];

for (const op of ops) {
    if (op[0] === 'style="display: flex; justify-content: space-between; align-items: center;">') op[2] = 7; // 6 switches + chapter row
    if (op[0] === 'style="display: flex; flex-direction: column; gap: 2px;">') op[2] = 9; // card headings
    if (op[0] === ' style="margin-top: 0;"') op[2] = 6; // small descriptions
}

// normalize line endings: file uses CRLF
html = fs.readFileSync(p, 'utf8');

const fixEol = s => s.includes('\r\n') ? s : s.split('\n').join('\r\n');
let fail = false;
for (const [from, to, want] of ops) {
    const F = fixEol(from), T = fixEol(to);
    const n = html.split(F).length - 1;
    if (n !== want) {
        console.log('MISMATCH (' + n + ' != ' + want + '): ' + from.slice(0, 80));
        fail = true;
        continue;
    }
    html = html.split(F).join(T);
    console.log(('OK  x' + n).padEnd(8) + to.slice(0, 60).replace(/\n/g, ' '));
    if (true) { /* counted */ }
}

if (fail) { console.log('\nABORTED - file not written'); process.exit(1); }
fs.writeFileSync(p, html);
console.log('\nWritten. inline remaining:', (html.match(/style="/g) || []).length);
console.log('changed bytes:', orig.length, '->', html.length);
