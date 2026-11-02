(function () {
const VJ = window.VJ = window.VJ || {};
const E = VJ.E = {};
class V3 {
constructor(x, y, z) { this.x = x || 0; this.y = y || 0; this.z = z || 0; }
set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
setScalar(s) { this.x = this.y = this.z = s; return this; }
copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
clone() { return new V3(this.x, this.y, this.z); }
add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
lerp(v, k) { this.x += (v.x - this.x) * k; this.y += (v.y - this.y) * k; this.z += (v.z - this.z) * k; return this; }
lerpVectors(a, b, k) { this.x = a.x + (b.x - a.x) * k; this.y = a.y + (b.y - a.y) * k; this.z = a.z + (b.z - a.z) * k; return this; }
distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
}
E.V3 = V3;
let ids = 0;
class Obj {
constructor(geo, mat) {
this.position = new V3(); this.rotation = new V3(); this.scale = new V3(1, 1, 1);
this.visible = true; this.children = []; this.userData = {}; this.geo = geo || null; this.mat = mat || null; this.id = ids++;
}
get material() { return this.mat; }
add() { for (const o of arguments) this.children.push(o); return this; }
remove(o) { const i = this.children.indexOf(o); if (i >= 0) this.children.splice(i, 1); }
}
E.mesh = (geo, mat) => new Obj(geo, mat);
E.group = () => new Obj();
E.rgb = hex => [hex >> 16 & 255, hex >> 8 & 255, hex & 255];
E.mat = (hex, o) => Object.assign({ c: E.rgb(hex), opacity: 1 }, o || {});
function orient(g) {
const v = g.v, n = v.length / 3;
let cx = 0, cy = 0, cz = 0;
for (let i = 0; i < n; i++) { cx += v[i * 3]; cy += v[i * 3 + 1]; cz += v[i * 3 + 2]; }
cx /= n; cy /= n; cz /= n;
for (const f of g.f) {
const a = f[0] * 3, b = f[1] * 3, c = f[2] * 3;
const ux = v[b] - v[a], uy = v[b + 1] - v[a + 1], uz = v[b + 2] - v[a + 2], wx = v[c] - v[a], wy = v[c + 1] - v[a + 1], wz = v[c + 2] - v[a + 2];
let mx = 0, my = 0, mz = 0;
for (const i of f) { mx += v[i * 3]; my += v[i * 3 + 1]; mz += v[i * 3 + 2]; }
mx = mx / f.length - cx; my = my / f.length - cy; mz = mz / f.length - cz;
if ((uy * wz - uz * wy) * mx + (uz * wx - ux * wz) * my + (ux * wy - uy * wx) * mz < 0) f.reverse();
}
return g;
}
const seq = (n, k) => Array.from({ length: n }, (_, i) => i + (k || 0));
E.box = () => orient({ v: [-.5, -.5, -.5, .5, -.5, -.5, .5, .5, -.5, -.5, .5, -.5, -.5, -.5, .5, .5, -.5, .5, .5, .5, .5, -.5, .5, .5],
f: [[0, 3, 2, 1], [4, 5, 6, 7], [0, 4, 7, 3], [1, 2, 6, 5], [0, 1, 5, 4], [3, 7, 6, 2]] });
E.prism = function (pts, w) {
const v = [], f = [], n = pts.length;
for (const s of [-w / 2, w / 2]) for (const [z, y] of pts) v.push(s, y, z);
f.push(seq(n), seq(n, n));
for (let i = 0; i < n; i++) { const j = (i + 1) % n; f.push([i, j, j + n, i + n]); }
return orient({ v, f });
};
E.cyl = function (rt, rb, h, n) {
const v = [], f = [];
for (const [r, y] of [[rb, -h / 2], [rt, h / 2]]) for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; v.push(Math.cos(a) * r, y, Math.sin(a) * r); }
f.push(seq(n), seq(n, n));
for (let i = 0; i < n; i++) { const j = (i + 1) % n; f.push([i, j, j + n, i + n]); }
return orient({ v, f });
};
E.lathe = function (rings, n) {
const v = [], f = [];
for (const [r, y] of rings) for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; v.push(Math.cos(a) * r, y, Math.sin(a) * r); }
for (let k = 0; k < rings.length - 1; k++) for (let i = 0; i < n; i++) { const j = (i + 1) % n; f.push([k * n + i, k * n + j, (k + 1) * n + j, (k + 1) * n + i]); }
f.push(seq(n), seq(n, (rings.length - 1) * n));
return orient({ v, f });
};
E.octa = () => orient({ v: [1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1], f: [[0, 2, 4], [4, 2, 1], [1, 2, 5], [5, 2, 0], [0, 4, 3], [4, 1, 3], [1, 5, 3], [5, 0, 3]] });
E.ring = function (r1, r2, n, every) {
const v = [], f = [];
for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; v.push(Math.cos(a) * r1, Math.sin(a) * r1, 0, Math.cos(a) * r2, Math.sin(a) * r2, 0); }
for (let i = 0; i < n; i++) if (i % (every || 1) === 0) { const j = (i + 1) % n; f.push([i * 2, i * 2 + 1, j * 2 + 1, j * 2]); }
return { v, f };
};
E.plane = (w, d) => ({ v: [-w / 2, 0, -d / 2, w / 2, 0, -d / 2, w / 2, 0, d / 2, -w / 2, 0, d / 2], f: [[0, 3, 2, 1]] });
E.quad = (w, h) => ({ v: [-w / 2, -h / 2, 0, w / 2, -h / 2, 0, w / 2, h / 2, 0, -w / 2, h / 2, 0], f: [[0, 1, 2, 3]] });
E.geo = (v, f) => ({ v, f });
E.Renderer = function (canvas) {
const ctx = canvas.getContext('2d');
const R = { canvas, ctx, W: 1, H: 1, css: 1, fogC: [42, 14, 61], fogN: 100, fogF: 400, near: 0.4 };
const L = [-0.42, 0.82, 0.38], ll = Math.hypot(L[0], L[1], L[2]);
L[0] /= ll; L[1] /= ll; L[2] /= ll;
let ex = 0, ey = 0, ez = 0, rx = 1, ry = 0, rz = 0, ux = 0, uy = 1, uz = 0, fx = 0, fy = 0, fz = -1, F = 1, budget = 0;
R.size = function (w, h, pf) {
R.W = canvas.width = Math.max(1, Math.round(w / pf)); R.H = canvas.height = Math.max(1, Math.round(h / pf));
R.css = w / R.W; canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
};
R.setCamera = function (cam) {
ex = cam.position.x; ey = cam.position.y; ez = cam.position.z;
let dx = cam.target.x - ex, dy = cam.target.y - ey, dz = cam.target.z - ez, l = Math.hypot(dx, dy, dz) || 1;
fx = dx / l; fy = dy / l; fz = dz / l;
const up = cam.up;
rx = fy * up.z - fz * up.y; ry = fz * up.x - fx * up.z; rz = fx * up.y - fy * up.x; l = Math.hypot(rx, ry, rz) || 1;
rx /= l; ry /= l; rz /= l;
ux = ry * fz - rz * fy; uy = rz * fx - rx * fz; uz = rx * fy - ry * fx;
F = R.H / 2 / Math.tan(cam.fov * Math.PI / 360);
};
const cam3 = (x, y, z) => { const dx = x - ex, dy = y - ey, dz = z - ez; return [dx * rx + dy * ry + dz * rz, dx * ux + dy * uy + dz * uz, dx * fx + dy * fy + dz * fz]; };
R.project = function (x, y, z) { const c = cam3(x, y, z); return c[2] > R.near ? [R.W / 2 + c[0] * F / c[2], R.H / 2 - c[1] * F / c[2], c[2]] : [0, 0, -1]; };
R.dir = function (x, y, z) { const zc = x * fx + y * fy + z * fz; return zc > 0.01 ? [R.W / 2 + (x * rx + y * ry + z * rz) * F / zc, R.H / 2 - (x * ux + y * uy + z * uz) * F / zc] : null; };
R.horizon = function () { const l = Math.hypot(fx, fz); if (l < 0.05) return null; const hx = fx / l, hz = fz / l, zc = hx * fx + hz * fz; return R.H / 2 - (hx * ux + hz * uz) * F / zc; };
function clip(p) {
const out = [], n = p.length;
for (let i = 0; i < n; i++) {
const a = p[i], b = p[(i + 1) % n], ain = a[2] >= R.near, bin = b[2] >= R.near;
if (ain) out.push(a);
if (ain !== bin) { const t = (R.near - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, R.near]); }
}
return out;
}
function fogK(d) { return Math.min(1, Math.max(0, (d - R.fogN) / (R.fogF - R.fogN))); }
function style(c, k, d) {
const f = fogK(d), g = 1 - f;
return 'rgb(' + Math.min(255, c[0] * k * g + R.fogC[0] * f) + ',' + Math.min(255, c[1] * k * g + R.fogC[1] * f) + ',' + Math.min(255, c[2] * k * g + R.fogC[2] * f) + ')';
}
function path(p) {
ctx.beginPath();
for (let i = 0; i < p.length; i++) { const q = p[i], sx = R.W / 2 + q[0] * F / q[2], sy = R.H / 2 - q[1] * F / q[2]; if (i) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy); }
ctx.closePath();
}
function fill(p, s, a, add) {
path(p); ctx.fillStyle = s;
if (a < 1 || add) { ctx.globalAlpha = a; if (add) ctx.globalCompositeOperation = 'lighter'; ctx.fill(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
else { ctx.strokeStyle = s; ctx.lineWidth = 0.6; ctx.fill(); ctx.stroke(); }
}
R.clear = function (c) { ctx.fillStyle = c; ctx.fillRect(0, 0, R.W, R.H); budget = 6000; };
R.poly = function (pts, c, a, add) {
const p = [];
for (let i = 0; i < pts.length; i += 3) p.push(cam3(pts[i], pts[i + 1], pts[i + 2]));
const q = clip(p); if (q.length < 3) return;
let d = 0; for (const v of q) d += v[2];
d /= q.length; if (d > R.fogF + 40) return;
fill(q, style(c, 1, d), a == null ? 1 : a, add);
};
const faces = []; let nf = 0;
const ID = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]);
function local(o, m) {
const a = Math.cos(o.rotation.x), b = Math.sin(o.rotation.x), c = Math.cos(o.rotation.y), d = Math.sin(o.rotation.y), e = Math.cos(o.rotation.z), f = Math.sin(o.rotation.z);
const ae = a * e, af = a * f, be = b * e, bf = b * f, s = o.scale;
m[0] = c * e * s.x; m[1] = -c * f * s.y; m[2] = d * s.z; m[3] = o.position.x;
m[4] = (af + be * d) * s.x; m[5] = (ae - bf * d) * s.y; m[6] = -b * c * s.z; m[7] = o.position.y;
m[8] = (bf - ae * d) * s.x; m[9] = (be + af * d) * s.y; m[10] = a * c * s.z; m[11] = o.position.z;
}
function mul(A, B, o) {
for (let r = 0; r < 12; r += 4) {
const a0 = A[r], a1 = A[r + 1], a2 = A[r + 2];
o[r] = a0 * B[0] + a1 * B[4] + a2 * B[8]; o[r + 1] = a0 * B[1] + a1 * B[5] + a2 * B[9];
o[r + 2] = a0 * B[2] + a1 * B[6] + a2 * B[10]; o[r + 3] = a0 * B[3] + a1 * B[7] + a2 * B[11] + A[r + 3];
}
}
function walk(o, pm) {
if (!o.visible) return;
const lm = new Float32Array(12), wm = new Float32Array(12);
local(o, lm); mul(pm, lm, wm);
if (o.geo) emit(o, wm);
for (const c of o.children) walk(c, wm);
}
function emit(o, m) {
const g = o.geo, mt = o.mat, v = g.v, n = v.length / 3, w = new Array(n), cv = new Array(n);
for (let i = 0; i < n; i++) {
const x = v[i * 3], y = v[i * 3 + 1], z = v[i * 3 + 2];
const X = m[0] * x + m[1] * y + m[2] * z + m[3], Y = m[4] * x + m[5] * y + m[6] * z + m[7], Z = m[8] * x + m[9] * y + m[10] * z + m[11];
w[i] = [X, Y, Z]; cv[i] = cam3(X, Y, Z);
}
for (let k = 0; k < g.f.length; k++) {
const f = g.f[k], A = w[f[0]], B = w[f[1]], C = w[f[2]];
const px = B[0] - A[0], py = B[1] - A[1], pz = B[2] - A[2], qx = C[0] - A[0], qy = C[1] - A[1], qz = C[2] - A[2];
let nx = py * qz - pz * qy, ny = pz * qx - px * qz, nz = px * qy - py * qx;
const facing = nx * (ex - A[0]) + ny * (ey - A[1]) + nz * (ez - A[2]);
if (facing <= 0 && !mt.double) continue;
let p = f.map(i => cv[i]), whole = true;
if (p.some(q => q[2] < R.near)) { p = clip(p); whole = false; if (p.length < 3) continue; }
let d = 0; for (const q of p) d += q[2];
d /= p.length; if (d > R.fogF + 40) continue;
const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
let k2 = 1;
if (!mt.glow) { k2 = 0.36 + 0.52 * Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]) + 0.2 * (0.5 + 0.5 * ny); if (facing <= 0) k2 *= 0.6; }
const fc = faces[nf] || (faces[nf] = {});
nf++;
fc.p = p; fc.d = d; fc.s = style(mt.c, k2, d); fc.a = mt.opacity; fc.add = !!mt.add; fc.mt = mt;
fc.extra = whole && facing > 0 && f.length === 4 && ((mt.win && Math.abs(ny) < 0.5) || mt.text) ? [p, w[f[0]], w[f[1]], w[f[3]], o.id * 131 + k] : null;
}
}
const hash = n => { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); return ((n ^ (n >>> 15)) >>> 0) / 4294967296; };
function sp(q) { return [R.W / 2 + q[0] * F / q[2], R.H / 2 - q[1] * F / q[2]]; }
function windows(fc) {
const [p, w0, w1, w3, seed] = fc.extra, mt = fc.mt;
const a = sp(p[0]), b = sp(p[1]), d = sp(p[3]), c = sp(p[2]);
const l1 = Math.hypot(w1[0] - w0[0], w1[1] - w0[1], w1[2] - w0[2]), l3 = Math.hypot(w3[0] - w0[0], w3[1] - w0[1], w3[2] - w0[2]);
const v1 = Math.abs(w1[1] - w0[1]) > l1 * 0.7, cols = Math.min(24, Math.max(1, Math.round(l1 / (v1 ? 3.2 : 2.4)))), rows = Math.min(30, Math.max(1, Math.round(l3 / (v1 ? 2.4 : 3.2))));
const area = Math.abs((b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]));
if (area < cols * rows * 10 || budget <= 0) return;
const s = Math.max(1, Math.round(Math.sqrt(area / (cols * rows)) * 0.3)), pal = mt.pal;
ctx.globalAlpha = 1 - fogK(fc.d);
for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
const h = hash(seed * 977 + i * 131 + j * 7);
if (h > mt.win) continue;
const u = (i + 0.5) / cols, t = (j + 0.5) / rows;
const x = a[0] + (b[0] - a[0]) * u + (d[0] - a[0]) * t + (a[0] - b[0] + c[0] - d[0]) * u * t;
const y = a[1] + (b[1] - a[1]) * u + (d[1] - a[1]) * t + (a[1] - b[1] + c[1] - d[1]) * u * t;
ctx.fillStyle = pal[Math.floor(h / mt.win * pal.length) % pal.length];
ctx.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, s);
budget--;
}
ctx.globalAlpha = 1;
}
function label(fc) {
const p = fc.extra[0], mt = fc.mt, a = sp(p[0]), b = sp(p[1]), c = sp(p[2]), d = sp(p[3]);
const wd = Math.hypot(b[0] - a[0], b[1] - a[1]), ht = Math.hypot(d[0] - a[0], d[1] - a[1]);
if (wd < 18) return;
ctx.globalAlpha = 1 - fogK(fc.d);
path(p); ctx.strokeStyle = mt.tc; ctx.lineWidth = Math.max(1, wd * 0.025); ctx.stroke();
const cx = (a[0] + b[0] + c[0] + d[0]) / 4, cy = (a[1] + b[1] + c[1] + d[1]) / 4;
ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
const t = mt.text, s1 = Math.min(ht * (t[1] ? 0.36 : 0.6), wd * 1.5 / t[0].length);
ctx.fillStyle = mt.tc; ctx.font = 'bold ' + Math.max(4, s1 | 0) + 'px "Courier New", monospace';
ctx.fillText(t[0], cx, cy - (t[1] ? ht * 0.14 : 0));
if (t[1] && s1 > 6) { ctx.fillStyle = '#f7e9ff'; ctx.font = Math.max(4, s1 * 0.62 | 0) + 'px "Trebuchet MS", sans-serif'; ctx.fillText(t[1], cx, cy + ht * 0.2); }
ctx.globalAlpha = 1;
}
R.scene = function (root) {
nf = 0; walk(root, ID);
const list = faces.slice(0, nf).sort((x, y) => y.d - x.d);
for (const fc of list) {
fill(fc.p, fc.s, fc.a, fc.add);
if (fc.extra) { if (fc.mt.text) label(fc); else windows(fc); }
}
};
return R;
};
})();
