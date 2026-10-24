// lossless check: multiset of selectors in old styles.css == multiset across new css files
const fs = require('fs');
function scan(file) {
    const css = fs.readFileSync(file, 'utf8');
    const sel = {};
    let i = 0, d = 0, n = 0;
    while (i < css.length) {
        if (css.startsWith('/*', i)) { i = css.indexOf('*/', i) + 2; continue; }
        const c = css[i];
        if (c === '{') { if (d === 0) n++; d++; }
        else if (c === '}') d--;
        i++;
    }
    return n;
}
// selector multiset: parse src & dst, normalize whitespace
function selSet(file) {
    const css = fs.readFileSync(file, 'utf8');
    const out = [];
    let i = 0, d = 0;
    while (i < css.length) {
        if (css.startsWith('/*', i)) { i = css.indexOf('*/', i) + 2; continue; }
        const c = css[i];
        if (c === '{') {
            // collect selector since last }
            out.push(null); i++; d++; continue;
        }
        if (c === '}') { d--; i++; continue; }
        if (d === 0) { // accumulate selector char
            if (out.length) out.push(css[i]); else out.push(css[i]);
            i++; continue;
        }
        i++;
    }
    return out;
}
// simpler: split by top-level braces
function selectors(file) {
    const css = fs.readFileSync(file, 'utf8');
    const res = [];
    let i = 0, d = 0, buf = '';
    while (i < css.length) {
        if (css.startsWith('/*', i)) { i = css.indexOf('*/', i) + 2; continue; }
        const c = css[i];
        if (c === '{') {
            if (d === 0) res.push(buf.replace(/\s+/g, ' ').trim());
            d++; buf = ''; i++; continue;
        }
        if (c === '}') { d--; i++; continue; }
        if (d === 0) buf += c;
        i++;
    }
    return res;
}

const oldSel = selectors('resources/styles.css').sort().join('\n');

const files = ['theme', 'components', 'layout', 'formats', 'settings', 'modals']
    .map(f => 'resources/css/' + f + '.css');
let newSel = [];
for (const f of files) newSel = newSel.concat(selectors(f));
newSel = newSel.sort().join('\n');
// note: @import+* merged atom in theme yields selector "@import url(...); *"
// vs old two separate entries (@import then *). Account for it:
const norm = s => s.replace(/^@import url\('https[^']*'\); \*/, '@import@@');
const count = (list, pat) => list.split('\n').filter(x => x === pat).length;

console.log('old blocks:', oldSel.split('\n').length, ' new blocks:', newSel.split('\n').length);
const diffs = [];
const o = oldSel.split('\n'), nw = newSel.split('\n');
const multi = new Map();
const push = (m, k) => multi.set(k, (multi.get(k) || 0) + 1);
for (const x of o) push(1, x);  // dummy to build maps
const oc = {}, nc = {};
for (const x of o) oc[x] = (oc[x] || 0) + 1;
for (const x of nw) nc[x] = (nc[x] || 0) + 1;
const all = new Set([...Object.keys(oc), ...Object.keys(nc)]);
for (const k of all) {
    const a = oc[k] || 0, b = nc[k] || 0;
    if (a !== b) diffs.push(`${k.slice(0, 60)}  old:${a} new:${b}`);
}
if (diffs.length === 0) console.log('LOSSLESS ✓ same selectors, same multiplicities');
else { console.log('DIFFERENCES:'); diffs.slice(0, 20).forEach(d => console.log('  ' + d)); }
