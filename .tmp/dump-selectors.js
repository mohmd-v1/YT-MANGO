const fs = require('fs');
const css = fs.readFileSync('resources/styles.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const lines = css.split('\n');
let depth = 0, s = -1, sel = '';
const out = [];
lines.forEach((l, i) => {
    if (depth === 0) { const t = l.trim(); if (t && !t.startsWith('}')) sel = (sel ? sel + ' ' : '') + t.replace(/\s+/g, ' '); }
    for (const c of l) {
        if (c === '{') { if (depth === 0) s = i; depth++; }
        else if (c === '}') { depth--; if (depth === 0) { out.push(`[${s + 1}-${i + 1}] ${sel.slice(0, 90)}`); sel = ''; s = -1; } }
    }
});
out.forEach(x => console.log(x));
