(function () {
const VJ = window.VJ = window.VJ || {};
const M = VJ.models = {}, E = VJ.E;
const BOX = E.box(), OCTA = E.octa();
const col = (hex, o) => E.mat(hex, o);
const glow = (hex, o) => E.mat(hex, Object.assign({ glow: true }, o || {}));
function box(mat, sx, sy, sz, x, y, z) { const b = E.mesh(BOX, mat); b.scale.set(sx, sy, sz); b.position.set(x, y, z); return b; }
const lowerGeo = E.prism([[-2.25, 0.22], [-2.32, 0.48], [-1.0, 0.64], [1.9, 0.72], [2.3, 0.64], [2.25, 0.22]], 1.84);
const cabinGeo = E.prism([[-0.8, 0.62], [0.0, 1.05], [1.05, 1.02], [1.9, 0.7]], 1.5);
const wheelGeo = E.cyl(0.42, 0.42, 0.34, 8), hubGeo = E.cyl(0.26, 0.26, 0.36, 8), flameGeo = E.cyl(0, 0.36, 1.4, 6);
M.hero = function () {
const g = E.group();
g.add(E.mesh(lowerGeo, col(0xff8a1f)), E.mesh(cabinGeo, col(0x2b1f4a)));
g.add(box(glow(0xf7e9ff), 1.9, 0.07, 0.07, 0, 0.5, -2.33), box(glow(0xff4d6d), 1.9, 0.09, 0.07, 0, 0.62, 2.33), box(glow(0xb8ff3d), 0.32, 0.08, 0.32, 0, 1.08, 0.35));
g.add(box(col(0xd96a10), 0.06, 0.12, 3.6, -0.95, 0.42, 0), box(col(0xd96a10), 0.06, 0.12, 3.6, 0.95, 0.42, 0));
const tire = col(0x1a0d26), hub = glow(0xb8ff3d), flame = glow(0xb8ff3d, { add: true, opacity: 0.8 });
g.userData.wheels = []; g.userData.flames = [];
for (const [x, z] of [[-1.0, -1.45], [1.0, -1.45], [-1.0, 1.45], [1.0, 1.45]]) {
const p = E.group(); p.position.set(x, 0.42, z);
const w = E.mesh(wheelGeo, tire); w.rotation.z = Math.PI / 2;
const h = E.mesh(hubGeo, hub); h.rotation.z = Math.PI / 2;
const f = E.mesh(flameGeo, flame); f.rotation.x = Math.PI; f.position.y = -0.8; f.visible = false;
p.add(w, h, f); g.add(p); g.userData.wheels.push(p); g.userData.flames.push(f);
}
const door = E.group(); door.position.set(-0.1, 1.04, 0.15);
door.add(box(col(0x3a2a5e), 0.06, 0.44, 1.35, -0.7, -0.2, 0));
g.add(door); g.userData.door = door;
return g;
};
M.setFly = function (car, k, t) {
car.userData.wheels.forEach((p, i) => { p.rotation.z = (i % 2 ? -1 : 1) * k * Math.PI / 2; p.position.x = (i % 2 ? 1 : -1) * (1.0 + 0.15 * k); });
car.userData.flames.forEach((f, i) => { f.visible = k > 0.3; f.scale.y = 0.6 + 0.4 * Math.sin(t * 30 + i) * k + 0.4 * k; });
};
M.setDoor = function (car, k) { car.userData.door.rotation.z = -k * 1.9; };
M.agent = function () {
const g = E.group(), suit = col(0x2b1d44), dark = col(0x1a1028), legs = [], arms = [];
for (const s of [-1, 1]) {
const l = E.group(); l.position.set(s * 0.14, 0.92, 0); l.add(box(dark, 0.22, 0.9, 0.26, 0, -0.45, 0)); g.add(l); legs.push(l);
const a = E.group(); a.position.set(s * 0.4, 1.62, 0); a.add(box(suit, 0.16, 0.7, 0.2, 0, -0.33, 0)); g.add(a); arms.push(a);
}
g.add(box(suit, 0.62, 0.78, 0.34, 0, 1.3, 0), box(glow(0xb8ff3d), 0.05, 0.5, 0.36, 0.12, 1.36, 0));
g.add(box(col(0xd8c8e6), 0.34, 0.36, 0.34, 0, 1.92, 0), box(glow(0xff8a1f), 0.36, 0.09, 0.36, 0, 1.95, -0.01));
arms[1].add(box(glow(0xf7e9ff), 0.42, 0.3, 0.12, 0, -0.7, 0));
g.userData = { legs, arms };
return g;
};
M.walk = function (a, t, k) {
const s = Math.sin(t * 8) * 0.6 * k;
a.userData.legs[0].rotation.x = s; a.userData.legs[1].rotation.x = -s;
a.userData.arms[0].rotation.x = -s * 0.8; a.userData.arms[1].rotation.x = s * 0.3;
};
const ROADSTER = [0xf7e9ff, 0x3de0c8, 0xff7a93];
M.roadster = function (v) {
const g = E.group(), jet = glow(v === 1 ? 0xb8ff3d : 0xff8a1f);
g.add(E.mesh(lowerGeo, col(ROADSTER[v])), E.mesh(cabinGeo, col(0x1c1233)));
for (const [x, z] of [[-1.1, -1.4], [1.1, -1.4], [-1.1, 1.4], [1.1, 1.4]]) g.add(box(jet, 0.5, 0.18, 0.6, x, 0.3, z));
const trail = E.mesh(E.plane(1.4, 14), glow(v === 1 ? 0x3de0c8 : 0xff8a1f, { add: true, opacity: 0.35, double: true }));
trail.position.set(0, 0.4, 9); g.add(trail);
g.scale.setScalar(1.15);
return g;
};
const podGeo = E.lathe([[0.25, -1], [0.75, -0.7], [1, 0], [0.75, 0.7], [0.25, 1]], 8);
M.claude = function () {
const g = E.group(), body = E.mesh(podGeo, col(0xff7a93));
body.rotation.x = Math.PI / 2; body.scale.set(1.1, 2.0, 0.55); body.position.y = 0.65;
const spin = E.mesh(E.ring(0.7, 0.92, 12, 2), glow(0xff7a93, { double: true }));
spin.rotation.x = Math.PI / 2; spin.position.y = 1.65;
g.add(body, box(col(0x5a2a44), 2.1, 0.25, 3.4, 0, 0.3, 0), spin);
g.add(box(glow(0xf7e9ff), 0.3, 0.12, 0.1, -0.45, 0.75, -1.95), box(glow(0xf7e9ff), 0.3, 0.12, 0.1, 0.45, 0.75, -1.95));
g.userData.spin = spin;
return g;
};
const dartGeo = E.cyl(0, 1.05, 4.4, 4);
M.gpt = function () {
const g = E.group(), body = E.mesh(dartGeo, col(0x3de0c8));
body.rotation.x = -Math.PI / 2; body.rotation.y = Math.PI / 4; body.scale.set(1, 1, 0.5); body.position.y = 0.6;
g.add(body, box(glow(0x3de0c8), 2.4, 0.08, 0.5, 0, 0.45, 1.4), box(glow(0xf7e9ff), 0.12, 0.7, 0.12, 0, 1.25, 0.8));
return g;
};
const rotorGeo = E.cyl(0.6, 0.6, 0.05, 6);
M.google = function () {
const g = E.group(), mat = col(0x8c9bff), blade = glow(0xf7e9ff, { opacity: 0.55 });
g.add(box(mat, 1.4, 0.45, 1.4, 0, 0, 0));
g.userData.rotors = [];
for (const [x, z] of [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]]) {
g.add(box(mat, Math.abs(x) * 0.9, 0.1, 0.12, x / 2, 0.1, z / 2));
const r = E.mesh(rotorGeo, blade); r.position.set(x, 0.25, z); g.add(r); g.userData.rotors.push(r);
}
const eye = E.mesh(OCTA, glow(0xff4d6d)); eye.scale.setScalar(0.32); eye.position.y = -0.35; g.add(eye);
return g;
};
M.taxi = function () {
const g = E.group();
g.add(box(col(0x9d8cb8), 2.0, 1.2, 3.8, 0, 0.75, 0), box(col(0x231638), 2.04, 0.42, 2.6, 0, 1.05, -0.1));
g.add(box(glow(0xf7e9ff), 0.8, 0.22, 0.4, 0, 1.48, 0), box(glow(0xff4d6d), 1.9, 0.08, 0.06, 0, 0.7, 1.92));
return g;
};
M.bubble = function () {
const g = E.group(), dot = glow(0x2a0e3d);
g.add(box(glow(0xf7e9ff), 2.6, 1.0, 1.6, 0, 0, 0), box(glow(0xf7e9ff), 0.5, 0.5, 0.5, -0.9, -0.5, 0.7));
for (const x of [-0.6, 0, 0.6]) g.add(box(dot, 0.32, 0.06, 0.32, x, 0.52, 0), box(dot, 0.32, 0.32, 0.06, x, 0, 0.82));
return g;
};
M.scanField = function () {
const g = E.group(), base = glow(0xff4d6d, { opacity: 0.5 }), line = glow(0xff4d6d);
g.add(E.mesh(E.plane(3.0, 8), base));
for (let y = -3.5; y <= 3.5; y += 1) { const s = E.mesh(E.plane(3.0, 0.16), line); s.position.set(0, 0.02, y); g.add(s); }
for (const x of [-1.45, 1.45]) { const s = E.mesh(E.plane(0.12, 8), line); s.position.set(x, 0.02, 0); g.add(s); }
g.userData.mat = base;
return g;
};
M.cell = function () {
const g = E.group(), c = E.mesh(OCTA, glow(0xb8ff3d)), r = E.mesh(E.ring(0.84, 0.96, 12), glow(0xb8ff3d, { double: true }));
c.scale.set(0.6, 0.84, 0.6); r.rotation.x = Math.PI / 2; g.add(c, r);
return g;
};
M.shard = function () { const g = E.group(), s = E.mesh(OCTA, glow(0xf7e9ff)); s.scale.set(0.4, 0.8, 0.4); g.add(s); return g; };
M.shieldPick = function () { const g = E.group(), s = E.mesh(E.cyl(0.8, 0.8, 0.3, 6), glow(0xff8a1f)); s.rotation.x = Math.PI / 4; g.add(s); return g; };
M.skyRing = function () { const g = E.group(); g.add(E.mesh(E.ring(2.35, 2.85, 20), glow(0xff8a1f, { double: true }))); return g; };
const FX = VJ.fx = {};
const debris = [], rings = [];
FX.init = function (scene) {
for (let i = 0; i < 90; i++) { const m = E.mesh(BOX, glow(0xffffff)); m.visible = false; scene.add(m); debris.push({ m, v: new E.V3(), life: 0, max: 1 }); }
const rg = E.ring(0.9, 1.0, 32);
for (let i = 0; i < 5; i++) { const r = E.mesh(rg, glow(0xb8ff3d, { add: true, double: true })); r.rotation.x = Math.PI / 2; r.visible = false; scene.add(r); rings.push({ m: r, life: 0, max: 1, size: 1 }); }
FX.shadow = { position: new E.V3(), scale: new E.V3(1.1, 1.9, 1), material: { opacity: 0.45 }, visible: true };
};
FX.burst = function (pos, colors, n, speed) {
let k = 0;
for (const d of debris) {
if (k >= n) break;
if (d.life > 0) continue;
d.m.scale.setScalar(0.2 + Math.random() * 0.45); d.m.position.copy(pos);
d.m.mat.c = E.rgb(colors[k % colors.length]);
d.v.set((Math.random() - 0.5) * speed, Math.random() * speed * 0.8 + 2, (Math.random() - 0.5) * speed);
d.life = d.max = 0.7 + Math.random() * 0.6; d.m.visible = true; k++;
}
};
FX.ring = function (pos, size, color, dur) {
const r = rings.find(x => x.life <= 0); if (!r) return;
r.m.position.set(pos.x, 0.15, pos.z); r.m.mat.c = E.rgb(color); r.size = size; r.life = r.max = dur || 0.6; r.m.visible = true;
};
FX.update = function (dt, dz) {
for (const d of debris) {
if (d.life <= 0) continue;
d.life -= dt; d.v.y -= 22 * dt;
d.m.position.addScaledVector(d.v, dt); d.m.position.z += dz;
if (d.m.position.y < 0.1) { d.m.position.y = 0.1; d.v.y *= -0.35; d.v.x *= 0.7; }
d.m.rotation.x += dt * 9; d.m.rotation.y += dt * 7; d.m.scale.multiplyScalar(0.985);
if (d.life <= 0) d.m.visible = false;
}
for (const r of rings) {
if (r.life <= 0) continue;
r.life -= dt; r.m.position.z += dz;
const p = 1 - r.life / r.max;
r.m.scale.setScalar(1 + p * r.size); r.m.mat.opacity = 1 - p;
if (r.life <= 0) r.m.visible = false;
}
};
FX.clear = function () { debris.forEach(d => { d.life = 0; d.m.visible = false; }); rings.forEach(r => { r.life = 0; r.m.visible = false; }); };
})();
