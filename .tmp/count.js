const h = require('fs').readFileSync('resources/app.html', 'utf8');
const pats = [
    'style="display: flex; justify-content: space-between; align-items: center;">',
    'style="display: flex; flex-direction: column; gap: 2px; max-width: 80%;">',
    'style="font-size: 13px; font-weight: 600; color: var(--text-primary);">',
    'style="margin-top: 0;">',
    'class="toggle-switch" style="margin-bottom: 0; gap: 0;">',
    'style="font-size: 13px; font-weight: 600; color: var(--text-primary); display: block;">',
    'style="display: flex; flex-direction: column; gap: 2px;">',
    'style="min-width: 140px; background: var(--bg-hover); border: 1px solid var(--border-light); color: var(--text-primary); padding: 8px 12px; border-radius: var(--radius-sm);">',
    'style="width: 130px; text-align: center; background: var(--bg-hover); border: 1px solid var(--border-light); color: var(--text-primary); padding: 8px; border-radius: var(--radius-sm); cursor: pointer; transition: all 0.2s ease; font-family: var(--font-ui); font-size: 12px; font-weight: 600;">',
    'style="padding: 4px 10px; font-size: 12px;">',
    'style="padding: 10px 24px;">',
    'style="flex: 1; background: var(--bg-hover); border: 1px solid var(--border-light); color: var(--text-primary); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 13px;">',
    'style="color: var(--text-secondary); font-size: 14px; margin-bottom: 25px; line-height: 1.5;">',
    'style="font-weight: 600; color: var(--text-secondary); font-size: 13px;">',
    'style="font-size: 13px; font-weight: 600;">',
    'style="vertical-align: -0.125em; margin-right: 8px; color: var(--accent);">',
    'style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px;">',
    'style="display: flex; flex-direction: column; gap: 2px; margin-bottom: 8px;">',
    'style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">',
    'style="background: var(--bg-hover); border: 1px solid var(--border-light); color: var(--text-primary); padding: 8px 12px; border-radius: var(--radius-sm); font-family: var(--font-ui); font-size: 13px; width: 70px; text-align: center;">',
    'style="min-width: 120px; background: var(--bg-hover); border: 1px solid var(--border-light); color: var(--text-primary); padding: 6px 12px; border-radius: var(--radius-sm);">',
];
pats.forEach(p => {
    const c = h.split(p).length - 1;
    console.log(String(c).padStart(3) + '  ' + p.slice(0, 100));
});
