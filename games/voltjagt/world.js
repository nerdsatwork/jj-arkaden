(function () {
const VJ = window.VJ = window.VJ || {};
const W = VJ.world = {}, E = VJ.E;
const CH = 120, NCH = 3, ZN = 60, ZF = -460;
W.LANES = [-4.8, -1.6, 1.6, 4.8];
let R, cam, scene, chunks = [], flyers = [], flyT = 0, scroll = 0;
const stars = [], skyline = [];
const rnd = mulberry(2037);
W.rand = rnd;
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const BOX = E.box();
const PAL = { city: ['#ffcf9a', '#ffcf9a', '#f7e9ff', '#ff8a1f', '#b8ff3d', '#7cf3ff'], led: ['#b8ff3d', '#3de0c8', '#b8ff3d'] };
const ADS = [['NEURO-KAFFE', '40% mere fokus', '#ff8a1f'], ['FLYV TIL AARHUS', '9 minutter', '#b8ff3d'], ['DIN BIL SAVNER DIG', 'ring hjem', '#ff7a93'],
['SØVN 2.0', 'download nu', '#3de0c8'], ['LAD OP PÅ 3 SEK', 'overalt i byen', '#8c9bff'], ['ROBOTAXA', 'altid ledig', '#f7e9ff']];
function box(mat, sx, sy, sz, x, y, z) { const b = E.mesh(BOX, mat); b.scale.set(sx, sy, sz); b.position.set(x, y, z); return b; }
W.init = function (canvas) {
R = W.R = E.Renderer(canvas);
scene = W.scene = E.group();
cam = W.camera = { position: new E.V3(), target: new E.V3(0, 0, -1), up: new E.V3(0, 1, 0), fov: 18, aspect: 1 };
for (let i = 0; i < 380; i++) { const a = rnd() * Math.PI * 2, e = 0.05 + rnd() * 1.3; stars.push([Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)]); }
for (let i = 0; i < 90; i++) skyline.push([-Math.PI + (i / 90) * Math.PI * 2, 0.02 + rnd() * 0.03, 0.02 + rnd() * 0.1]);
buildChunks(); buildFlyers(); buildTower();
W.resize();
};
W.resize = function () {
const w = innerWidth, h = innerHeight;
R.size(w, h, w * h > 1500000 ? 3 : 2); cam.aspect = w / h;
};
function buildChunks() {
const bmats = [0x5a3a7a, 0x4b2f6b, 0x6b4a8c, 0x3f2a5e, 0x75528f].map(c => E.mat(c, { win: 0.42, pal: PAL.city }));
const nmats = [0xff8a1f, 0xb8ff3d, 0xf7e9ff, 0xff7a93, 0x3de0c8].map(c => E.mat(c, { glow: true }));
const pole = E.mat(0x3a2350), lamp = E.mat(0xf7e9ff, { glow: true });
const rail = E.mat(0x8c7aa8), leg = E.mat(0x9d8cb8), lampO = E.mat(0xff8a1f, { glow: true }), cable = E.mat(0xf7e9ff, { glow: true, double: true });
const hall = E.mat(0x2a1a40, { win: 0.5, pal: PAL.led }), towerM = E.mat(0x6b5a8c), halo = E.mat(0xb8ff3d, { glow: true, double: true });
const twGeo = E.cyl(3, 4.2, 14, 8), haloGeo = E.ring(3.0, 3.8, 16);
for (let k = 0; k < NCH; k++) {
const ch = { g: E.group(), env: 'city', z: -k * CH + 40, glints: [] };
const city = E.group(), bridge = E.group(), dc = E.group();
for (let i = 0; i < 30; i++) {
const s = i % 2 ? 1 : -1, near = rnd() < 0.45, w = 4 + rnd() * 7, d = 4 + rnd() * 9, h = near ? 6 + rnd() * 16 : 14 + rnd() * 60;
const x = s * (near ? 10.5 + w / 2 + rnd() * 5 : 22 + rnd() * 50), z = -rnd() * CH;
city.add(box(bmats[i % bmats.length], w, h, d, x, h / 2 - 0.6, z));
if (rnd() < 0.55) city.add(box(nmats[Math.floor(rnd() * nmats.length)], w * 0.32, 0.6, d * 0.32, x + w * 0.2, h + 0.1, z - d * 0.2));
}
for (let i = 0; i < 12; i++) {
const x = (i % 2 ? 1 : -1) * 8.2, z = -(Math.floor(i / 2) * 20 + 5);
city.add(box(pole, 0.25, 4.8, 0.25, x, 1.8, z), box(lamp, 0.7, 0.35, 1.4, x, 4.2, z));
}
for (let i = 0; i < 2; i++) {
const ad = ADS[Math.floor(rnd() * ADS.length)], s = i ? 1 : -1;
const bb = E.mesh(E.quad(9, 4.5), E.mat(0x1a0826, { glow: true, double: true, text: [ad[0], ad[1]], tc: ad[2] }));
bb.position.set(s * 13, 9, -30 - i * 60 - rnd() * 20); bb.rotation.y = -s * 0.35;
city.add(bb, box(pole, 0.4, 7, 0.4, bb.position.x, 3, bb.position.z));
}
for (const s of [-1, 1]) {
bridge.add(box(rail, 0.35, 1.1, CH, s * 7.6, 0.4, -CH / 2), box(leg, 1.6, 64, 1.6, s * 9.5, 31, -60), box(lampO, 1.8, 1.2, 1.8, s * 9.5, 63.6, -60));
const v = [], f = [];
for (let j = 1; j <= 6; j++) for (const dz of [-1, 1]) {
const ax = s * 9.5, ay = 58 - j * 2.5, bx = s * 7.6, bz = -60 + dz * j * 9, n = v.length / 3;
v.push(ax - 0.12, ay, -60, ax + 0.12, ay, -60, bx + 0.12, 1, bz, bx - 0.12, 1, bz); f.push([n, n + 1, n + 2, n + 3]);
}
bridge.add(E.mesh(E.geo(v, f), cable));
}
for (let i = 0; i < 24; i++) { const s = i % 2 ? 1 : -1; ch.glints.push([s * (12 + rnd() * 110), -rnd() * CH, 2 + rnd() * 5, rnd() < 0.3 ? [255, 138, 31] : [106, 90, 154]]); }
for (let i = 0; i < 6; i++) {
const s = i % 2 ? 1 : -1, sx = 10 + rnd() * 8, sy = 5 + rnd() * 4, sz = 30 + rnd() * 20;
dc.add(box(hall, sx, sy, sz, s * (16 + rnd() * 26), sy / 2 - 0.6, -10 - (i >> 1) * 40));
}
for (let i = 0; i < 3; i++) {
const s = i % 2 ? 1 : -1, x = s * (48 + rnd() * 12), z = -20 - i * 38;
const tw = E.mesh(twGeo, towerM); tw.position.set(x, 6.4, z);
const h = E.mesh(haloGeo, halo); h.position.set(x, 13.6, z); h.rotation.x = Math.PI / 2;
dc.add(tw, h);
}
bridge.visible = dc.visible = false;
ch.g.add(city, bridge, dc); ch.parts = { city, bridge, dc };
ch.g.position.z = ch.z; scene.add(ch.g); chunks.push(ch);
}
}
W.envAt = () => 'city';
function setEnv(ch, env) { ch.env = env; for (const k in ch.parts) ch.parts[k].visible = k === env; }
W.resetScenery = function (envFor) {
W.envAt = envFor;
chunks.forEach((ch, k) => { ch.z = -k * CH + 40; ch.g.position.z = ch.z; setEnv(ch, envFor(ch.z - CH / 2)); });
};
function buildFlyers() {
for (let i = 0; i < 9; i++) { const f = VJ.models.roadster(i % 3); f.visible = false; scene.add(f); flyers.push({ m: f, v: new E.V3(), life: 0 }); }
}
function launchFlyer() {
const f = flyers.find(x => !x.m.visible); if (!f) return;
const y = 12 + rnd() * 16, kind = rnd();
if (kind < 0.45) { const s = rnd() < 0.5 ? -1 : 1; f.m.position.set(-s * 90, y, -40 - rnd() * 120); f.v.set(s * (30 + rnd() * 20), 0, 0); }
else if (kind < 0.8) { f.m.position.set((rnd() - 0.5) * 50, y, -320); f.v.set(0, 0, 40 + rnd() * 30); }
else { f.m.position.set((rnd() - 0.5) * 40, y + 4, 40); f.v.set(0, 0, -(20 + rnd() * 15)); }
f.m.rotation.set(0, Math.atan2(-f.v.x, -f.v.z), 0);
f.m.visible = true; f.life = 9;
}
function buildTower() {
const t = W.tower = E.group();
const body = E.mesh(E.cyl(7, 12, 170, 10), E.mat(0x4b2f6b, { win: 0.6, pal: PAL.city })); body.position.y = 85;
const spire = E.mesh(E.cyl(0, 4, 50, 10), E.mat(0xf7e9ff)); spire.position.y = 195;
t.add(body, spire); t.rings = [];
for (let i = 0; i < 4; i++) {
const r = E.mesh(E.ring(15 - i * 2, 16.6 - i * 2, 24, 2), E.mat(i % 2 ? 0xb8ff3d : 0xff8a1f, { glow: true, double: true }));
r.position.y = 60 + i * 30; r.rotation.x = Math.PI / 2; t.add(r); t.rings.push(r);
}
const sign = E.mesh(E.quad(26, 13), E.mat(0x14061f, { glow: true, double: true, text: ['HQ'], tc: '#b8ff3d' }));
sign.position.set(0, 140, 14); t.add(sign);
t.visible = false; scene.add(t);
}
W.update = function (dt, s) {
scroll += s.dz;
for (const ch of chunks) {
ch.z += s.dz; ch.g.position.z = ch.z;
if (ch.z - CH > 60) { ch.z -= CH * NCH; ch.g.position.z = ch.z; setEnv(ch, W.envAt(ch.z - CH / 2)); }
}
flyT -= dt;
if (flyT <= 0) { launchFlyer(); flyT = 0.9 + rnd() * 1.6; }
for (const f of flyers) {
if (!f.m.visible) continue;
f.m.position.addScaledVector(f.v, dt); f.m.position.z += s.dz * 0.4;
if ((f.life -= dt) <= 0) f.m.visible = false;
}
if (W.tower.visible) { W.tower.position.z += s.dz; W.tower.rings.forEach((r, i) => { r.rotation.z += dt * (i % 2 ? 0.6 : -0.4); }); }
camRig(s);
R.setCamera(cam);
};
function camRig(s) {
if (s.orbit) {
const o = s.orbit;
if (o.pos) cam.position.copy(o.pos);
else cam.position.set(o.target.x + Math.sin(o.angle) * o.radius, o.target.y + o.height, o.target.z + Math.cos(o.angle) * o.radius);
cam.target.copy(o.target); cam.up.set(0, 1, 0); cam.fov = o.fov || 50;
R.fogN = 60; R.fogF = 420;
return;
}
const e = s.view * s.view * (3 - 2 * s.view), phi = (90 - 79 * e) * Math.PI / 180;
const h2d = Math.max(56, 26 / cam.aspect), tall = cam.aspect < 1, c3 = W.chase(s.heroX, s.heroY);
const d2 = h2d / (2 * Math.tan(9 * Math.PI / 180)), d = Math.exp(Math.log(d2) + (Math.log(c3.d) - Math.log(d2)) * e);
cam.target.set(c3.target.x * e, c3.target.y * e, -h2d * (tall ? 0.15 : 0.33) * (1 - e) + c3.target.z * e);
cam.position.set(cam.target.x, cam.target.y + d * Math.sin(phi), cam.target.z + d * Math.cos(phi));
if (s.shake) { cam.position.x += (rnd() - 0.5) * s.shake; cam.position.z += (rnd() - 0.5) * s.shake; }
cam.up.set(0, Math.cos(phi), -Math.sin(phi)); cam.fov = 18 + 42 * e;
R.fogN = (d2 + 40) * (1 - e) + 45 * e; R.fogF = (d2 + 340) * (1 - e) + 300 * e;
}
W.chase = function (hx, hy) {
const tall = cam.aspect < 1, d = tall ? 30 : 24, ph = 11 * Math.PI / 180;
const target = new E.V3(hx * 0.5, hy + (tall ? -1.5 : 1), -14);
return { d, target, pos: new E.V3(target.x, target.y + d * Math.sin(ph), target.z + d * Math.cos(ph)), fov: 60 };
};
W.project = function (v) {
const p = R.project(v.x, v.y, v.z);
return { x: p[0] * R.css, y: p[1] * R.css, on: p[2] > 0 && p[0] > -20 && p[0] < R.W + 20 && p[1] > -20 && p[1] < R.H + 20 };
};
W.render = function () {
const ctx = R.ctx;
R.clear('#170822');
const hy = R.horizon();
if (hy != null && hy > 0) {
const g = ctx.createLinearGradient(0, 0, 0, hy);
g.addColorStop(0, '#0b0313'); g.addColorStop(0.7, '#2a0e3d'); g.addColorStop(1, '#7a2a5c');
ctx.fillStyle = g; ctx.fillRect(0, 0, R.W, Math.min(R.H, hy + 1));
ctx.fillStyle = '#f7e9ff';
for (const s of stars) { const p = R.dir(s[0], s[1], s[2]); if (p && p[1] < hy - 2) ctx.fillRect(p[0] | 0, p[1] | 0, 1, 1); }
const m = R.dir(-0.3, 0.3, -0.9);
if (m && m[1] < hy) {
const r = R.H * 0.05 * 60 / cam.fov;
ctx.fillStyle = '#ffd9b8'; ctx.beginPath(); ctx.arc(m[0], m[1], r, 0, 6.283); ctx.fill();
ctx.strokeStyle = '#ff8a1f'; ctx.lineWidth = Math.max(1, r * 0.08); ctx.beginPath(); ctx.ellipse(m[0], m[1], r * 1.5, r * 0.3, -0.3, 0, 6.283); ctx.stroke();
}
ctx.fillStyle = '#2e1745';
for (const b of skyline) {
const p = R.dir(Math.sin(b[0]), 0, -Math.cos(b[0])), q = R.dir(Math.sin(b[0] + b[1]), Math.tan(b[2]), -Math.cos(b[0] + b[1]));
if (p && q) ctx.fillRect(Math.min(p[0], q[0]), q[1], Math.abs(q[0] - p[0]) + 1, hy - q[1] + 1);
}
}
R.poly([-300, -0.6, ZN, 300, -0.6, ZN, 300, -0.6, ZF, -300, -0.6, ZF], [23, 8, 34]);
const gc = [58, 27, 85], o8 = ((scroll % 8) + 8) % 8;
for (let x = -156; x <= 156; x += 8) R.poly([x - 0.15, -0.59, ZN, x + 0.15, -0.59, ZN, x + 0.15, -0.59, ZF, x - 0.15, -0.59, ZF], gc);
for (let z = o8 + 8 * Math.floor((ZF - o8) / 8); z < ZN; z += 8) R.poly([-160, -0.59, z + 0.15, 160, -0.59, z + 0.15, 160, -0.59, z - 0.15, -160, -0.59, z - 0.15], gc);
for (const ch of chunks) if (ch.env === 'bridge') {
R.poly([-250, -0.3, ch.z, 250, -0.3, ch.z, 250, -0.3, ch.z - CH, -250, -0.3, ch.z - CH], [22, 10, 48]);
for (const gl of ch.glints) { const z = ch.z + gl[1]; R.poly([gl[0], -0.29, z, gl[0] + gl[2], -0.29, z, gl[0] + gl[2], -0.29, z - 0.4, gl[0], -0.29, z - 0.4], gl[3]); }
}
R.poly([-7, 0, ZN, 7, 0, ZN, 7, 0, ZF, -7, 0, ZF], [45, 22, 66]);
for (const s of [-1, 1]) {
R.poly([s * 7, 0.02, ZN, s * 7.6, 0.02, ZN, s * 7.6, 0.02, ZF, s * 7, 0.02, ZF], [90, 60, 120]);
R.poly([s * 6.45, 0.02, ZN, s * 6.75, 0.02, ZN, s * 6.75, 0.02, ZF, s * 6.45, 0.02, ZF], [255, 138, 31]);
}
const o14 = ((scroll % 14) + 14) % 14;
for (let z = o14 + 14 * Math.floor((-300 - o14) / 14); z < 40; z += 14) {
for (const x of [-3.2, 0, 3.2]) R.poly([x - 0.11, 0.03, z, x + 0.11, 0.03, z, x + 0.11, 0.03, z - 6, x - 0.11, 0.03, z - 6], [191, 169, 214]);
if (z > -160) for (const x of W.LANES) R.poly([x - 0.2, 0.03, z - 9, x + 0.2, 0.03, z - 9, x + 0.2, 0.03, z - 9.4, x - 0.2, 0.03, z - 9.4], [184, 255, 61], 0.6);
}
const sh = VJ.fx && VJ.fx.shadow;
if (sh && sh.visible) {
const pts = [];
for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; pts.push(sh.position.x + Math.cos(a) * 1.5 * sh.scale.x, 0.04, sh.position.z + Math.sin(a) * 1.5 * sh.scale.y); }
R.poly(pts, [0, 0, 0], sh.material.opacity);
}
R.scene(scene);
};
})();
