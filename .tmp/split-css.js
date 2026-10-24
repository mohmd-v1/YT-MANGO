// Split styles.css into resources/css/*.css — mechanical move, no style edits.
// Comments directly above a block travel with it. Original order preserved within each file.
const fs = require('fs');
const path = require('path');
const outDir = 'resources/css';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

const css = fs.readFileSync('resources/styles.css', 'utf8');

// ---- scanner: split into atoms (comments/groups) skipping comment bodies ----
const atoms = []; // {type:'comment'|'rule', text}
let i = 0;
while (i < css.length) {
    const ws = /^\s+/.exec(css.slice(i));
    if (ws) { i += ws[0].length; continue; }
    if (css.startsWith('/*', i)) {
        const end = css.indexOf('*/', i) + 2;
        atoms.push({ type: 'comment', text: css.slice(i, end) });
        i = end; continue;
    }
    // rule: selector ... { body }
    const brace = css.indexOf('{', i);
    // selector may contain comments; already excluded above
    // find matching close brace, skipping comments
    let d = 1, j = brace + 1;
    while (j < css.length && d > 0) {
        if (css.startsWith('/*', j)) { j = css.indexOf('*/', j) + 2; continue; }
        if (css[j] === '{') d++;
        else if (css[j] === '}') d--;
        j++;
    }
    atoms.push({ type: 'rule', text: css.slice(i, j) });
    i = j;
}

for (const a of atoms) if (a.type === 'rule') {
    a.sel = a.text.slice(0, a.text.indexOf('{')).replace(/\s+/g, ' ').trim();
}

// ---- classification (first match wins) ----
const RULES = [
    [/^@import/, 'theme'],
    [/^@supports/, 'theme'],
    [/^@media/, 'formats'],
    [/^@keyframes slideUpSticky$/, 'layout'],
    [/^@keyframes slideUp$/, 'modals'],
    [/^@keyframes spin$/, 'components'],
    [/^@keyframes fixGlow$/, 'layout'],
    [/^:root$/, 'theme'],
    [/^\[data-theme="light"\]$/, 'theme'],
    [/^body(\s|:|,|$)/, 'theme'],
    [/^\.custom-scrollbar/, 'theme'],

    [/^(\.primary-btn|\.secondary-btn|\.progress-track|\.progress-fill|\.hidden\b|\.svg-icon|\.anim-spin|\.check-draw|\.svg-accent|\.svg-warning|\.btn-|\.loading-overlay|\.loading-column|\.spinner)/, 'components'],

    [/^(\.custom-select|\.custom-option|\.toggle-switch|\.cancel-analyze-btn|^\.badge$)/, 'components'],

    [/^(\.compact-row|\.tabs|\.tab-btn|\.dual-grid|\.split-header|\.split-col|\.split-body|\.split-title|\.grid-row|^\.col|^\.res-|^\.codec-|\.badge-codec|\.info-sub-sm|\.sub-selector-wrapper|\.sub-multi-select|\.sub-trigger|\.sub-icon|\.sub-options|^#contentArea)/, 'formats'],

    [/^(\.settings-|\.runtime-|\.setting-item|\.card-heading|\.input-row|\.shortcut-|\.card-label|\.switch-list|\.setting-row|\.about-|\.dep-|\.version-text)/, 'settings'],

    [/^(\.modal|\.close-btn|\.info-note|\.command-modal|\.terminal-log|\.success-|\.time-pickers-wrapper|\.time-picker-wrap|\.time-picker-box|\.time-segment|^\.t-|\.range-slider|\.slider-track|\.slider-labels|\.dual-slider|\.chapter-|\.playlist-|\.install-|\.progress-desc|\.indeterminate-bar|\.alert-)/, 'modals'],

    [/^(\.app-|\.logo-container|\.input-group|#urlInput|\.video-info|\.video-thumbnail|\.video-duration|#videoInfo|\.thumbnail-wrapper|\.meta-item|\.bottom-panel|\.bottom-left|\.icon-btn|#statusMsg|\.empty-|\.drag-|body\.drag-active|\.badge-anchor|\.section-clear-badge|\.format-tooltip|\.tooltip-tail|\.info-bg|\.copy-link-btn|\.glowing-fix|\.badge-|\.main-content|\.analyze-playlist-btn|\.quick-audio)/, 'layout'],
];

for (const a of atoms) {
    if (a.type === 'comment') { a.pendingTag = true; continue; }
    a.selKey = a.sel.startsWith('[data-theme="light"] ')
        ? a.sel.slice(20).trim()
        : a.sel;
    let c = null;
    for (const [re, key] of RULES) { if (re.test(a.selKey)) { c = key; break; } }
    a.cat = c || '???';
}
// attach comments to the following rule
function assignComments(list) {
    let pending = [];
    for (let k = 0; k < list.length; k++) {
        if (list[k].type === 'comment') { pending.push(list[k].text); continue; }
        list[k].pre = pending.join('\n');
        pending = [];
        // standalone? handled
    }
}

assignComments(atoms);
// note: every 'comment' atom now belongs to next rule via pending captured above

const files = ['theme', 'components', 'layout', 'formats', 'settings', 'modals'];
const buckets = Object.fromEntries(files.map(f => [f, []]));
let missing = 0;
for (const a of atoms) {
    if (a.type === 'comment') continue; // already attached
    if (a.cat === '???') { missing++; console.log('UNCLASSIFIED: ' + a.sel.slice(0, 70)); continue; }
    buckets[a.cat].push((a.pre ? a.pre + '\n' : '') + a.text);
}

if (missing > 0) { console.log('ABORTED: unclassified selectors'); process.exit(1); }

const HEADERS = {
    theme: '/* =========================================================\n   THEME — CSS variables, base elements, global scrollbars\n   Loaded first: every other file depends on these variables\n   ========================================================= */',
    components: '/* =========================================================\n   SHARED COMPONENTS — buttons, badges, dropdowns, toggles\n   ========================================================= */',
    layout: '/* =========================================================\n   APP LAYOUT — shell, header, video info card, bottom panel,\n   empty state, drag state, floating tooltips\n   ========================================================= */',
    formats: '/* =========================================================\n   FORMATS — format tabs, grid rows, resolution/codec badges,\n   video+audio split view, subtitle multi-select\n   ========================================================= */',
    settings: '/* =========================================================\n   SETTINGS MODAL — sidebar, panes, cards, runtime rows,\n   dependency rows, shortcut inputs\n   ========================================================= */',
    modals: '/* =========================================================\n   DIALOGS — modal base, command preview, download progress,\n   sections (slider + time pickers + chapters), playlist,\n   install, custom alert\n   ========================================================= */',
};

// @import must be the first statement in theme.css
const themeIdx = buckets.theme.findIndex(t => t.includes('@import'));
if (themeIdx > 0) {
    const [imp] = buckets.theme.splice(themeIdx, 1);
    buckets.theme.unshift(imp);
}

for (const f of files) {
    const content = HEADERS[f] + '\n\n' + buckets[f].join('\n\n') + '\n';
    fs.writeFileSync(path.join(outDir, f + '.css'), content);
    const lines = content.split('\n').length;
    console.log(`css/${f}.css  ${String(buckets[f].length).padStart(3)} blocks  ${lines} lines`);
}
console.log('DONE');
