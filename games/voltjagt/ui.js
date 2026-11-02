(function () {
const VJ = window.VJ = window.VJ || {};
const U = VJ.ui = {};
const $ = id => document.getElementById(id);
U.$ = $;
U.show = (id, on) => { $(id).hidden = !on; };
const meters = ['m-fly', 'm-emp'].map(id => { const m = $(id); return { m, bar: m.querySelector('i'), lab: m.querySelector('.ready'), full: false }; });
const hud = { score: $('score'), speed: $('speed'), zone: $('zone-lab'), prog: $('prog'), shields: [...$('shields').children] };
let lastShields = -1;
U.hud = function (g) {
hud.score.textContent = String(Math.floor(g.score)).padStart(6, '0');
hud.speed.textContent = String(Math.round(g.speed * 7.2)).padStart(3, '0');
hud.prog.style.width = (100 * Math.min(1, g.progress)).toFixed(1) + '%';
if (g.shields !== lastShields) { lastShields = g.shields; hud.shields.forEach((s, i) => s.classList.toggle('off', i >= g.shields)); }
[g.fly, g.emp].forEach((v, i) => {
const k = meters[i], full = v >= 100;
k.bar.style.width = Math.min(100, v).toFixed(1) + '%';
if (k.full !== full) { k.full = full; k.m.classList.toggle('full', full); k.lab.textContent = full ? 'Klar' : 'Lader'; }
});
};
U.zoneLabel = (i, name) => { hud.zone.textContent = 'Zone ' + (i + 1) + '/3 · ' + name; };
const call = $('call');
U.call = function (text, lime) {
call.textContent = text; call.classList.remove('show', 'lime');
void call.offsetWidth;
call.classList.add('show'); if (lime) call.classList.add('lime');
};
let sayT = 0, zoneT = 0;
U.say = function (text, secs) { $('comms-text').textContent = text; U.show('comms', true); sayT = secs || 4.5; };
U.zoneCard = function (i, name, tip) {
$('zone-k').textContent = 'Zone ' + (i + 1) + ' af 3'; $('zone-name').textContent = name; $('zone-tip').textContent = tip;
U.show('zonecard', true); zoneT = 3.6;
};
U.tick = function (dt) {
if (sayT > 0 && (sayT -= dt) <= 0) U.show('comms', false);
if (zoneT > 0 && (zoneT -= dt) <= 0) U.show('zonecard', false);
};
U.hit = function () { const h = $('hitfx'); h.classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => h.classList.remove('on'))); };
const tagLayer = $('tags'), pool = [];
U.tags = function (list) {
while (pool.length < list.length) {
const d = document.createElement('div'); d.className = 'tag';
d.innerHTML = '<span class="nm"></span><span class="act"></span>';
tagLayer.appendChild(d); pool.push({ d, nm: d.firstChild, act: d.lastChild, k: '', a: null });
}
pool.forEach((p, i) => {
const t = list[i];
if (!t) { if (!p.d.hidden) p.d.hidden = true; return; }
p.d.hidden = false;
if (p.k !== t.cls) { p.k = t.cls; p.d.className = 'tag ' + t.cls; p.nm.textContent = t.name; }
if (p.a !== t.act) { p.a = t.act; p.act.textContent = t.act || ''; p.act.hidden = !t.act; }
p.d.style.transform = 'translate(' + (t.x | 0) + 'px,' + (t.y | 0) + 'px) translate(-50%,-100%)';
});
};
let brief = null;
U.brief = function (pages, done) {
brief = { pages, i: 0, n: 0, done, acc: 0 };
U.show('s-brief', true); page();
};
function page() {
$('brief-step').textContent = 'Briefing ' + (brief.i + 1) + '/' + brief.pages.length;
brief.n = 0; $('brief-text').innerHTML = '';
$('b-next').textContent = brief.i === brief.pages.length - 1 ? 'Til bilen' : 'Videre';
}
function render() {
const full = brief.pages[brief.i];
const shown = full.slice(0, brief.n).replace(/\*([^*]*)\*?/g, '<em>$1</em>');
$('brief-text').innerHTML = shown;
}
U.briefTick = function (dt) {
if (!brief) return;
const full = brief.pages[brief.i];
if (brief.n >= full.length) return;
brief.acc += dt * 55;
while (brief.acc >= 1 && brief.n < full.length) { brief.acc -= 1; brief.n++; if (brief.n % 3 === 0) VJ.audio.sfx('type'); }
render();
};
U.briefNext = function (skip) {
if (!brief) return false;
const full = brief.pages[brief.i];
if (!skip && brief.n < full.length) { brief.n = full.length; render(); return true; }
if (!skip && brief.i < brief.pages.length - 1) { brief.i++; page(); VJ.audio.sfx('click'); return true; }
const done = brief.done; brief = null; U.show('s-brief', false); done(); return true;
};
U.briefing = () => !!brief;
U.bind = function (act) {
const keys = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'fly', ArrowUp: 'fly', KeyW: 'fly', KeyE: 'emp', KeyX: 'emp', Enter: 'enter', KeyP: 'pause', Escape: 'pause', KeyM: 'mute' };
addEventListener('keydown', e => {
const a = keys[e.code];
if (!a || e.repeat) return;
if (e.target.tagName === 'BUTTON' && (a === 'enter' || a === 'fly')) return;
e.preventDefault(); act(a);
});
const press = (id, a) => $(id).addEventListener('pointerdown', e => { e.preventDefault(); act(a); });
press('t-left', 'left'); press('t-right', 'right'); press('t-fly', 'fly'); press('t-emp', 'emp');
let sx = 0, sy = 0, st = 0;
const app = $('view');
app.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; st = performance.now(); });
app.addEventListener('pointerup', e => {
const dx = e.clientX - sx, dy = e.clientY - sy;
if (performance.now() - st > 600) return;
if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy)) act(dx < 0 ? 'left' : 'right');
else if (dy < -50) act('fly');
});
};
})();
