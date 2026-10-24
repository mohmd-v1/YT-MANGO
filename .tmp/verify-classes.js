// verify: every class used in html files has a css definition (in any css file)
const fs = require('fs');
const path = require('path');
const R = 'resources';

const cssFiles = ['styles.css', 'titlebar.css', 'tabs.css']
    .map(f => fs.readFileSync(path.join(R, f), 'utf8')).join('\n');

const html = fs.readFileSync(path.join(R, 'app.html'), 'utf8')
    + fs.readFileSync(path.join(R, 'index.html'), 'utf8');

// classes set via JS (dynamically) - skip checking these
const js = fs.readFileSync(path.join(R, 'js', 'main.js'), 'utf8')
    + fs.readFileSync(path.join(R, 'js', 'tabs.js'), 'utf8');

const used = new Set();
for (const m of html.matchAll(/class="([^"]*)"/g)) m[1].split(/\s+/).forEach(c => c && used.add(c));

const defined = new Set();
for (const m of cssFiles.matchAll(/\.([a-zA-Z_][\w-]*)/g)) defined.add(m[1]);

const missing = [...used].filter(c => !defined.has(c));
console.log('used:', used.size, ' defined:', defined.size);
console.log(missing.length ? 'MISSING:\n' + missing.join('\n') : 'ALL CLASSES DEFINED ✓');
