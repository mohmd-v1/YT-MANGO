// v2: selector = text between previous } and next {
const fs = require('fs');
const path = require('path');
const css = fs.readFileSync(path.join(__dirname, '..', 'resources', 'styles.css'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');

let depth = 0, selStart = 0;
const blocks = [];
for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === '{') {
        if (depth === 0) {
            blocks.push({ selStart, openIdx: i });
            depth = 1;
        } else depth++;
    } else if (ch === '}') {
        depth--;
        if (depth === 0) {
            const b = blocks[blocks.length - 1];
            b.end = i;
            b.sel = css.slice(b.selStart, b.openIdx).trim().replace(/\s+/g, ' ');
            b.body = css.slice(b.openIdx + 1, b.end).replace(/\s+/g, ' ').trim();
            selStart = i + 1;
        }
    }
}

const bySel = new Map();
blocks.forEach(b => {
    if (!bySel.has(b.sel)) bySel.set(b.sel, []);
    bySel.get(b.sel).push(b);
});

console.log('Total blocks:', blocks.length);
let dupCount = 0;
for (const [sel, arr] of bySel) {
    if (arr.length > 1 && sel) dupCount++;
}
console.log('Selectors defined more than once:', dupCount);
for (const [sel, arr] of bySel) {
    if (arr.length > 1 && sel) {
        console.log('\n### ' + sel + '  x' + arr.length);
        arr.forEach(b => console.log('   • ' + b.body.slice(0, 260)));
    }
}
// also: duplicate property declarations inside same selector
console.log('\n--- Duplicate properties within a single selector (last wins, earlier is dead) ---');
for (const b of blocks) {
    if (!b.sel) continue;
    const props = [...b.body.matchAll(/(^|;)\s*([a-z-]+)\s*:/gi)].map(m => m[2].toLowerCase());
    const seen = new Set(), dups = [];
    for (const p of props) { if (seen.has(p) && !dups.includes(p)) dups.push(p); seen.add(p); }
    if (dups.length) console.log('• ' + b.sel.slice(0, 70) + '  → ' + dups.join(', '));
}
