(function () {
const VJ = window.VJ = window.VJ || {};
const A = VJ.audio = { on: true, level: 0 };
const S16 = 60 / 134 / 4;
let ctx = null, master, music, sfx, noiseBuf, nextT = 0, step = 0;
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function hz(n) {
const m = /^([A-G])(#?)(\d)$/.exec(n);
return 440 * Math.pow(2, (NOTE[m[1]] + (m[2] ? 1 : 0) + (+m[3] + 1) * 12 - 69) / 12);
}
A.start = function () {
if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
const AC = window.AudioContext || window.webkitAudioContext;
if (!AC) return;
ctx = new AC();
master = ctx.createGain(); master.gain.value = A.on ? 0.8 : 0; master.connect(ctx.destination);
music = ctx.createGain(); music.gain.value = 0.4; music.connect(master);
sfx = ctx.createGain(); sfx.gain.value = 0.75; sfx.connect(master);
noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
const d = noiseBuf.getChannelData(0);
for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
nextT = ctx.currentTime + 0.1;
setInterval(schedule, 25);
};
A.setOn = function (on) {
A.on = on;
if (ctx) master.gain.setTargetAtTime(on ? 0.8 : 0, ctx.currentTime, 0.05);
};
A.setLevel = function (l) { A.level = l; };
function tone(t, f, dur, type, vol, bus, o) {
o = o || {};
const osc = ctx.createOscillator(), g = ctx.createGain();
osc.type = type;
osc.frequency.setValueAtTime(f, t);
if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
let node = osc;
if (o.lp) {
const fl = ctx.createBiquadFilter();
fl.type = 'lowpass'; fl.frequency.value = o.lp; fl.Q.value = o.q || 1;
osc.connect(fl); node = fl;
}
node.connect(g); g.connect(bus || music);
g.gain.setValueAtTime(0.0001, t);
g.gain.exponentialRampToValueAtTime(vol, t + (o.a || 0.005));
g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
osc.start(t); osc.stop(t + dur + 0.03);
}
function noise(t, dur, vol, type, freq, bus, sweep) {
const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
s.buffer = noiseBuf;
f.type = type; f.frequency.setValueAtTime(freq, t);
if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
s.connect(f); f.connect(g); g.connect(bus || music);
g.gain.setValueAtTime(vol, t);
g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.03);
}
const BARS = [
['E2', 'E3', ['E5', 'B4', 'G5', 'B4']],
['E2', 'E3', ['E5', 'B4', 'G5', 'B4']],
['C2', 'C3', ['E5', 'C5', 'G5', 'C5']],
['D2', 'D3', ['F#5', 'D5', 'A5', 'D5']]
];
const TUNE = [[0, 'E5', 3], [3, 'B4', 1], [4, 'E5', 2], [6, 'G5', 2], [8, 'B5', 6], [14, 'A5', 2],
[16, 'G5', 4], [20, 'E5', 2], [22, 'G5', 2], [24, 'A5', 4], [28, 'F#5', 4],
[32, 'E5', 3], [35, 'B4', 1], [36, 'E5', 2], [38, 'G5', 2], [40, 'B5', 4], [44, 'D6', 4],
[48, 'C6', 4], [52, 'B5', 4], [56, 'A5', 4], [60, 'B5', 4]];
const WIN = ['E4', 'G#4', 'B4', 'E5', 'G#5', 'B5', 'E6', 'B5'];
function schedule() {
if (!ctx) return;
while (nextT < ctx.currentTime + 0.12) { play(step, nextT); nextT += S16; step++; }
}
function play(s, t) {
const lv = A.level, i = s % 16, bar = BARS[Math.floor(s / 16) % 4];
if (lv === 4) return;
if (lv === 3) {
tone(t, hz(WIN[s % 8]), S16 * 1.6, 'triangle', 0.07, music);
if (i === 0) for (const n of ['E3', 'B3', 'G#4']) tone(t, hz(n), S16 * 15, 'triangle', 0.04, music, { a: 0.2 });
return;
}
tone(t, hz(bar[2][i % 4]), S16 * 0.9, 'square', lv === 0 ? 0.03 : 0.045, music, { lp: lv === 0 ? 1500 : 3200 });
if (lv === 0) {
if (i === 0) tone(t, hz(bar[0].replace('2', '3')), S16 * 15, 'triangle', 0.07, music, { a: 0.3 });
return;
}
if (i % 2 === 0) tone(t, hz(i % 4 === 2 ? bar[1] : bar[0]), S16 * 1.8, 'sawtooth', 0.11, music, { lp: 650, q: 5 });
if (i % 4 === 0) tone(t, 150, 0.22, 'sine', 0.55, music, { slide: 42 });
if (i === 4 || i === 12) { noise(t, 0.16, 0.22, 'bandpass', 1800); tone(t, 220, 0.08, 'triangle', 0.08, music); }
if (i % 2 === 0) noise(t, 0.04, i % 4 === 0 ? 0.07 : 0.035, 'highpass', 7000);
if (lv === 2) {
if (i % 4 === 2) noise(t, 0.12, 0.05, 'highpass', 5000);
const k = s % 64, n = TUNE.find(x => x[0] === k);
if (n) tone(t, hz(n[1]), S16 * n[2] * 0.95, 'sawtooth', 0.06, music, { lp: 2600, a: 0.01 });
}
}
A.sfx = function (name) {
if (!ctx || !A.on) return;
const t = ctx.currentTime;
switch (name) {
case 'lane': tone(t, 520, 0.07, 'square', 0.05, sfx, { slide: 780 }); break;
case 'cell': ['E6', 'G#6', 'B6'].forEach((n, k) => tone(t + k * 0.05, hz(n), 0.09, 'square', 0.06, sfx)); break;
case 'shard': tone(t, 1320, 0.25, 'sine', 0.12, sfx); tone(t + 0.04, 1980, 0.3, 'sine', 0.07, sfx); break;
case 'shield': ['B4', 'E5', 'G#5', 'B5'].forEach((n, k) => tone(t + k * 0.06, hz(n), 0.18, 'triangle', 0.1, sfx)); break;
case 'hit': noise(t, 0.35, 0.5, 'lowpass', 1400, sfx, 200); tone(t, 110, 0.35, 'sine', 0.5, sfx, { slide: 38 }); break;
case 'boom': noise(t, 0.7, 0.55, 'lowpass', 2400, sfx, 120); tone(t, 140, 0.6, 'sine', 0.55, sfx, { slide: 30 }); break;
case 'emp': tone(t, 1700, 0.6, 'sawtooth', 0.12, sfx, { slide: 70, lp: 3000 }); noise(t, 0.6, 0.3, 'bandpass', 3000, sfx, 300); break;
case 'fly': tone(t, 180, 1.0, 'sawtooth', 0.1, sfx, { slide: 900, lp: 2000 }); noise(t, 1.0, 0.2, 'bandpass', 400, sfx, 3200); break;
case 'land': tone(t, 130, 0.25, 'sine', 0.45, sfx, { slide: 48 }); noise(t, 0.2, 0.2, 'lowpass', 900, sfx); break;
case 'alarm': tone(t, hz('B5'), 0.12, 'square', 0.07, sfx); tone(t + 0.15, hz('F#5'), 0.12, 'square', 0.06, sfx); break;
case 'ready': tone(t, hz('E6'), 0.14, 'triangle', 0.12, sfx); tone(t + 0.09, hz('B6'), 0.2, 'triangle', 0.1, sfx); break;
case 'go': for (const n of ['E4', 'B4', 'E5']) tone(t, hz(n), 0.4, 'sawtooth', 0.06, sfx, { lp: 2400 }); break;
case 'ring': tone(t, hz('B5'), 0.12, 'square', 0.06, sfx); tone(t + 0.06, hz('E6'), 0.16, 'square', 0.06, sfx); break;
case 'door': noise(t, 0.5, 0.12, 'bandpass', 800, sfx, 2500); break;
case 'type': tone(t, 1900 + Math.random() * 300, 0.02, 'square', 0.015, sfx); break;
case 'click': tone(t, 900, 0.05, 'square', 0.05, sfx); break;
}
};
})();
