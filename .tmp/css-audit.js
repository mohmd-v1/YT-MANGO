// CSS audit: find classes defined in styles.css but never referenced in html/js
const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '..', 'resources');

const css = fs.readFileSync(path.join(R, 'styles.css'), 'utf8');
const html = ['app.html', 'index.html'].map(f =>
    fs.readFileSync(path.join(R, f), 'utf8')).join('\n');
const js = ['main.js', 'tabs.js'].map(f =>
    fs.readFileSync(path.join(R, 'js', f), 'utf8')).join('\n');

// 1. classes defined in CSS
const cssClasses = new Set();
for (const m of css.matchAll(/\.([a-zA-Z_][\w-]*)/g)) cssClasses.add(m[1]);
// strip names inside comments to be safe: recompute ignoring comments
const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
const realCssClasses = new Set();
for (const m of cssNoComments.matchAll(/\.([a-zA-Z_][\w-]*)/g)) realCssClasses.add(m[1]);

// 2. classes used in HTML (class="..." attributes)
const used = new Set();
for (const attr of html.matchAll(/class="([^"]*)"/g)) {
    attr[1].split(/\s+/).forEach(c => c && used.add(c));
}

// 3. classes used in JS:
//    a) class="..." inside template strings
for (const attr of js.matchAll(/class=\\?"([^"\\]*)\\?"/g)) {
    attr[1].split(/\s+/).forEach(c => c && used.add(c));
}
//    b) classList.add/remove/toggle('name'), className = 'name'
for (const m of js.matchAll(/class(?:List\.(?:add|remove|toggle)|Name(?:\s*=[^;]*?|\+))\s*\(?['"`]([\w- ]+)['"`]/g)) {
    m[1].split(/\s+/).forEach(c => c && used.add(c));
}
//    c) querySelector('.name'), getElementById — ids not classes but keep selector classes
for (const m of js.matchAll(/querySelector(?:All)?\(\s*['"`]([^'"`]+)['"`]/g)) {
    for (const s of m[1].matchAll(/\.([a-zA-Z_][\w-]*)/g)) used.add(s[1]);
}

// 4. candidates = defined in css, never used
const candidates = [...realCssClasses].filter(c => !used.has(c)).sort();

console.log('Total CSS classes:', realCssClasses.size);
console.log('Used classes (html+js):', used.size);
console.log('\n--- Candidate unused classes (' + candidates.length + ') ---');
console.log(candidates.join('\n'));
