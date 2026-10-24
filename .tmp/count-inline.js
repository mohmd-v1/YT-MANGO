const h = require('fs').readFileSync('resources/app.html', 'utf8');
console.log('inline styles remaining:', (h.match(/style="/g) || []).length);
console.log('broken class patterns:', (h.match(/ class="[^"]*  /g) || []).length);
console.log('empty style attrs:', (h.match(/style=""/g) || []).length);
