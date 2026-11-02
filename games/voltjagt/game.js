(function () {
const VJ = window.VJ, U = VJ.ui;
const W = VJ.world, M = VJ.models, FX = VJ.fx, A = VJ.audio;
const LANES = W.LANES, V3 = (x, y, z) => new VJ.E.V3(x, y, z);
const ZONES = [
{ name: 'Motorvej E20', env: 'city', from: 0, speed: 34, foes: ['claude'], tip: 'Claude-agenter tænker sig grundigt om og blokerer så din bane. Skift bane, når de viser OVERVEJER.' },
{ name: 'Øresundsbroen', env: 'bridge', from: 1500, speed: 40, foes: ['claude', 'gpt'], tip: 'ChatGPT-agenter zigzagger og fylder vejen med chatbobler. Kør udenom boblerne.' },
{ name: 'Datacenter-dalen', env: 'dc', from: 3200, speed: 46, foes: ['claude', 'gpt', 'google'], tip: 'Google-droner lægger røde søgefelter på vejen. Felterne tænder, før de når dig.' }
];
const TOTAL = 5100, FLY_DUR = 7, SPAWN_Z = -160;
const BRIEF = [
'København, år 2037. Bilerne kører selv, og roadsterne flyver over tagene. Motorvejene styres af AI-agenter, der aldrig sover.',
'Du er agent for Salesforce. I din kuffert ligger *datakernen*: verdens vigtigste kundekartotek, krypteret og ulæst.',
'*Claude*-, *ChatGPT*- og *Google*-agenterne vil alle have kernen, og de skyer ingen midler. De har spærret vejen fra byen til HQ-tårnet.',
'Din bil er en 2037-roadster. Den skifter bane lynhurtigt, flyver, når Flyv-måleren er fuld, og har et EMP-chok, der rydder vejen. Kør!'
];
const TAG = { claude: ['CLAUDE-AGENT', 'claude'], gpt: ['CHATGPT-AGENT', 'gpt'], google: ['GOOGLE-AGENT', 'google'], taxi: ['ROBOTAXA', 'taxi'] };
const FOE_HINT = {
claude: 'Claude-agent forude! Når den viser OVERVEJER, så skift bane, før den blokerer dig.',
gpt: 'ChatGPT-agent! Den zigzagger og spammer chatbobler på vejen. Hold afstand.',
google: 'Google-drone over vejen! Den lægger røde søgefelter. Kør udenom, når de lyser op.'
};
const SPEC = {
taxi: { make: M.taxi, hw: 1.0, hl: 1.9, sp: 0.5, col: [0x9d8cb8, 0xf7e9ff] },
claude: { make: M.claude, hw: 1.1, hl: 2.0, sp: 0.5, foe: 1, col: [0xff7a93, 0xf7e9ff, 0x5a2a44] },
gpt: { make: M.gpt, hw: 1.0, hl: 2.1, sp: 0.5, foe: 1, col: [0x3de0c8, 0xf7e9ff] },
google: { make: M.google, hw: 1.0, hl: 1.0, sp: 1, foe: 1, air: 1, col: [0x8c9bff, 0xff4d6d] },
bubble: { make: M.bubble, hw: 1.3, hl: 0.9, sp: 0, col: [0xf7e9ff] },
scan: { make: M.scanField, hw: 1.4, hl: 4.0, sp: 0, col: [0xff4d6d] },
cell: { make: M.cell, hw: 1.0, hl: 1.0, sp: 0, pick: 1, col: [0xb8ff3d] },
shard: { make: M.shard, hw: 1.0, hl: 1.0, sp: 0, pick: 1, col: [0xf7e9ff] },
shield: { make: M.shieldPick, hw: 1.0, hl: 1.0, sp: 0, pick: 1, col: [0xff8a1f] },
ring: { make: M.skyRing, hw: 2.2, hl: 1.4, sp: 0, pick: 1, sky: 1, col: [0xff8a1f, 0xb8ff3d] }
};
const G = VJ.game = { mode: 'boot', t: 0, score: 0, progress: 0 };
let hero, agent, objs = [], spawnD = 0, ringT = 0, introT = 0, finT = 0, prev = null, doorSfx = 0;
const hints = {};
const ease = k => k * k * (3 - 2 * k), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const zoneAt = d => d >= ZONES[2].from ? 2 : d >= ZONES[1].from ? 1 : 0;
function reset(dist, score) {
objs.forEach(o => W.scene.remove(o.m)); objs = [];
FX.clear();
Object.assign(G, { dist, speed: 0, score: score || 0, cpScore: score || 0, shields: 3, fly: 45, emp: 60, lane: 1, x: LANES[1], y: 0,
flying: false, flyT: 0, view: 0, invuln: 0, shake: 0, zone: zoneAt(dist), progress: dist / TOTAL, runT: 0 });
spawnD = dist + 60;
W.resetScenery(z => ZONES[zoneAt(G.dist - z)].env);
W.tower.visible = false;
hero.visible = true; hero.position.set(G.x, 0, 0); hero.rotation.set(0, 0, 0); M.setFly(hero, 0, 0); M.setDoor(hero, 0);
U.zoneLabel(G.zone, ZONES[G.zone].name);
}
function add(kind, lane, z) {
const s = SPEC[kind], m = s.make();
const o = { kind, s, m, lane, x: LANES[lane], z: z != null ? z : SPAWN_Z, y: 0, t: 0, state: 'cruise', act: null };
if (kind === 'google') { o.y = 3.6; o.life = 8; o.dropT = 1.0; }
if (kind === 'gpt') { o.base = lane; o.other = lane < 3 ? lane + 1 : lane - 1; o.dropT = 0.8; }
if (s.pick) o.y = 1.0;
if (kind === 'ring') { o.y = 9; o.m.rotation.y = 0; }
if (kind === 'bubble') o.y = 0.9;
if (kind === 'scan') o.y = 0.05;
m.position.set(o.x, o.y, o.z); W.scene.add(m); objs.push(o);
if (s.foe && !hints[kind]) { hints[kind] = 1; U.say(FOE_HINT[kind], 5.5); A.sfx('alarm'); }
return o;
}
function addPickup(lane) {
const r = Math.random();
add(r < 0.6 ? 'cell' : (r < 0.92 || G.shields >= 5 ? 'shard' : 'shield'), lane);
}
function spawnRow() {
const Z = ZONES[G.zone], r = Math.random(), free = Math.floor(Math.random() * 4);
const lanes = [0, 1, 2, 3].filter(l => l !== free).sort(() => Math.random() - 0.5);
if (r < 0.36) {
let kind = Z.foes[Math.floor(Math.random() * Z.foes.length)];
if (kind === 'google' && objs.some(o => o.kind === 'google')) kind = 'claude';
add(kind, lanes[0]);
if (Math.random() < 0.5) addPickup(free);
} else if (r < 0.74) {
add('taxi', lanes[0]);
if (Math.random() < 0.35 + G.zone * 0.15) add('taxi', lanes[1]);
if (Math.random() < 0.55) addPickup(free);
} else { addPickup(lanes[0]); addPickup(free); }
}
function updateObjs(dt) {
for (const o of objs) {
o.t += dt;
if (o.kind === 'google') {
if (o.life > 0) {
o.z = Math.min(-72, o.z + 70 * dt); o.life -= dt; o.act = 'SCANNER';
if ((o.dropT -= dt) <= 0 && o.z >= -73) {
o.dropT = 1.5; add('scan', o.lane, o.z - 2);
o.lane = clamp(o.lane + (Math.random() < 0.5 ? -1 : 1), 0, 3);
}
} else { o.y += 7 * dt; o.z -= 25 * dt; o.act = null; if (o.y > 30) o.dead = 1; }
o.x += (LANES[o.lane] - o.x) * Math.min(1, dt * 3);
o.m.userData.rotors.forEach(r => { r.rotation.y += dt * 30; });
} else {
o.z += G.speed * (1 - o.s.sp) * dt;
}
if (o.kind === 'claude') {
if (o.state === 'cruise' && o.z > -64 && o.z < -28 && !G.flying && Math.abs(o.lane - G.lane) === 1) {
o.state = 'think'; o.tt = 0.85; o.goal = G.lane; o.act = 'OVERVEJER…'; A.sfx('alarm');
}
if (o.state === 'think' && (o.tt -= dt) <= 0) { o.state = 'block'; o.lane = o.goal; o.act = 'BLOKERER!'; }
o.m.userData.spin.rotation.z += dt * (o.state === 'think' ? 9 : 2);
}
if (o.kind === 'gpt') {
const k = (Math.sin(o.t * 1.7) + 1) / 2;
o.x = LANES[o.base] + (LANES[o.other] - LANES[o.base]) * k; o.lane = k < 0.5 ? o.base : o.other; o.act = 'SPAMMER';
if (o.z > -200 && o.z < -45 && (o.dropT -= dt) <= 0) { o.dropT = 1.3; add('bubble', o.lane, o.z + 3); }
} else if (o.kind !== 'google') {
o.x += (LANES[o.lane] - o.x) * Math.min(1, dt * (o.state === 'block' ? 4 : 8));
}
if (o.kind === 'scan') { o.live = o.z > -32; o.m.userData.mat.opacity = o.live ? 0.95 : 0.3 + 0.18 * Math.sin(o.t * 6); }
let bob = 0;
if (o.s.pick) { o.m.rotation.y += dt * 2.4; bob = Math.sin(o.t * 4) * 0.2; }
if (o.kind === 'bubble') bob = Math.sin(o.t * 3) * 0.15;
o.m.position.set(o.x, o.y + bob, o.z);
if (o.z > 25) o.dead = 1;
}
objs = objs.filter(o => { if (o.dead) W.scene.remove(o.m); return !o.dead; });
}
function collide() {
for (const o of objs) {
if (o.dead) continue;
const dx = Math.abs(o.x - G.x), dz = Math.abs(o.z);
if (o.s.pick) {
if (dx < o.s.hw + 0.9 && dz < o.s.hl + 1.6 && Math.abs(o.y - (G.y + 0.6)) < 2.6) pickup(o);
continue;
}
if (o.s.air || G.y > 1.5 || G.invuln > 0 || (o.kind === 'scan' && !o.live)) continue;
if (dx < o.s.hw + 0.85 && dz < o.s.hl + 1.9) hurt(o);
}
}
function pickup(o) {
o.dead = 1; FX.burst(o.m.position, o.s.col, 8, 6);
if (o.kind === 'cell') { G.fly = Math.min(100, G.fly + 34); G.emp = Math.min(100, G.emp + 12); G.score += 50; A.sfx('cell'); }
if (o.kind === 'shard') { G.score += 250; A.sfx('shard'); }
if (o.kind === 'shield') { G.shields = Math.min(5, G.shields + 1); A.sfx('shield'); U.say('Skjold +1. Godt samlet.', 2); }
if (o.kind === 'ring') { G.score += 300; G.emp = Math.min(100, G.emp + 20); A.sfx('ring'); }
}
function kill(o, reward) {
o.dead = 1; FX.burst(o.m.position, o.s.col, 18, 13); FX.ring(o.m.position, 5, o.s.col[0], 0.45); A.sfx('boom');
if (reward) G.score += o.s.foe ? 200 : 60;
}
function hurt(o) {
G.shields--; G.invuln = 1.6; G.shake = 1.4; U.hit(); A.sfx('hit');
FX.burst(V3(G.x, 0.8, 0), [0xff8a1f, 0xf7e9ff, 0xff4d6d], 14, 10);
kill(o, false);
if (G.shields <= 0) return gameOver();
U.say(G.shields === 1 ? 'Skjoldet er kritisk! Saml et orange skjold.' : 'Av! Du mistede et skjold.', 2.5);
}
function fly() {
if (G.flying) return;
if (G.fly < 100) { U.say('Flyv-måleren er ikke fuld endnu. Saml grønne celler.', 2); return; }
G.flying = true; G.flyT = 0; G.fly = 0; ringT = 0.9;
A.sfx('fly'); A.setLevel(2); U.call('FLYV!');
}
function emp() {
if (G.emp < 100) { U.say('EMP lader stadig op. Grønne celler hjælper.', 2); return; }
G.emp = 0; G.shake = 0.8; A.sfx('emp'); U.call('EMP!', true);
FX.ring(V3(G.x, 0, 0), 24, 0xb8ff3d, 0.7);
for (const o of objs) if (!o.dead && !o.s.pick && o.z > -75 && o.z < 12) kill(o, true);
}
function enterZone(z) {
G.zone = z; G.cpScore = G.score;
const Z = ZONES[z]; U.zoneLabel(z, Z.name); U.zoneCard(z, Z.name, Z.tip); A.sfx('ready');
spawnD = G.dist + 80;
}
function start() {
if (G.mode !== 'title') return;
A.start(); A.setLevel(0); A.sfx('click');
U.show('s-title', false); G.mode = 'brief';
U.brief(BRIEF, playIntro);
}
function playIntro() {
reset(0); G.mode = 'intro'; introT = 0; doorSfx = 0; hints.go = 0;
agent.visible = true; agent.scale.setScalar(1);
}
function beginPlay() {
agent.visible = false; M.setDoor(hero, 0);
G.mode = 'play'; G.view = 1; A.setLevel(1); A.sfx('go'); U.call('KØR!');
U.show('hud', true); U.$('touch').classList.add('on');
enterZone(zoneAt(G.dist));
if (!hints.move) { hints.move = 1; setTimeout(() => U.say('Skift bane med ← → eller knapperne. Saml grønne celler til Flyv og EMP.', 6), 3800); }
}
function gameOver() {
G.mode = 'over'; hero.visible = false; A.setLevel(4);
FX.burst(V3(G.x, 1, 0), [0xff8a1f, 0xf7e9ff, 0xb8ff3d, 0x2b1f4a], 40, 16); A.sfx('boom');
U.$('over-text').textContent = 'Agenterne fik ram på dig i zone ' + (G.zone + 1) + ', ' + ZONES[G.zone].name + '. Du kan fortsætte fra starten af zonen med fulde skjolde.';
U.$('b-retry').textContent = 'Fortsæt fra zone ' + (G.zone + 1);
setTimeout(() => { if (G.mode === 'over') { U.show('hud', false); U.show('s-over', true); U.$('b-retry').focus(); } }, 900);
}
function retry() {
const z = G.zone, sc = G.cpScore;
U.show('s-over', false); reset(ZONES[z].from, sc); beginPlay();
}
function restart() {
['s-over', 's-win', 's-pause'].forEach(id => U.show(id, false)); U.show('hud', false);
playIntro();
}
function startFinale() {
G.mode = 'finale'; finT = 0; G.flying = true; G.flyT = 0;
objs.forEach(o => { if (!o.s.pick) kill(o, true); });
A.sfx('fly'); A.setLevel(2); U.call('HQ!', true); U.say('Du er fremme! Flyv kernen op til HQ-tårnet.', 4);
}
function win() {
G.mode = 'win'; A.setLevel(3); A.sfx('shield');
U.show('hud', false); U.$('touch').classList.remove('on');
const s = Math.round(G.runT);
U.$('win-score').textContent = String(Math.floor(G.score)).padStart(6, '0') + ' point';
U.$('win-text').textContent = 'Datakernen nåede HQ efter ' + Math.floor(s / 60) + ' min ' + (s % 60) + ' sek med ' + G.shields + (G.shields === 1 ? ' skjold' : ' skjolde') + ' tilbage. Agenterne må finde en anden kunde.';
G.speed = 0; finT = 0;
setTimeout(() => { if (G.mode === 'win') { U.show('s-win', true); U.$('b-again').focus(); } }, 1600);
}
function pause() { if (G.mode === 'pause') return; prev = G.mode; G.mode = 'pause'; U.show('s-pause', true); U.$('b-resume').focus(); }
function resume() { if (G.mode !== 'pause') return; G.mode = prev; U.show('s-pause', false); }
function toggleMute() { A.setOn(!A.on); const b = U.$('b-mute'); b.textContent = 'Lyd: ' + (A.on ? 'til' : 'fra'); b.setAttribute('aria-pressed', String(!A.on)); }
function act(a) {
if (a === 'mute') return toggleMute();
if (G.mode === 'title') { if (a === 'enter' || a === 'fly') start(); return; }
if (U.briefing()) { if (a === 'enter' || a === 'fly' || a === 'emp') U.briefNext(); else if (a === 'pause') U.briefNext(true); return; }
if (a === 'pause') { if (G.mode === 'pause') resume(); else if (G.mode === 'play' || G.mode === 'finale') pause(); return; }
if (G.mode === 'intro' && (a === 'enter' || a === 'fly')) { introT = Math.max(introT, 5.39); return; }
if (G.mode === 'over' && a === 'enter') return retry();
if (G.mode === 'win' && a === 'enter') return restart();
if (G.mode !== 'play') return;
if (a === 'left' && G.lane > 0) { G.lane--; A.sfx('lane'); }
if (a === 'right' && G.lane < 3) { G.lane++; A.sfx('lane'); }
if (a === 'fly') fly();
if (a === 'emp') emp();
}
function attract() {
return { target: V3(G.x, 1, 0), angle: G.t * 0.12 - 2.2, radius: 11, height: 3.2, fov: 46 };
}
function intro(dt) {
introT += dt;
const t = introT, x = G.x, from = V3(x - 5.6, 0, 2.4), door = V3(x - 1.55, 0, 0.25);
if (t < 2.3) {
agent.position.lerpVectors(from, door, t / 2.3);
agent.rotation.y = Math.atan2(-(door.x - from.x), -(door.z - from.z)) + Math.PI;
M.walk(agent, t, 1);
} else M.walk(agent, t, 0);
if (t > 2.0 && doorSfx === 0) { doorSfx = 1; A.sfx('door'); }
if (t > 3.5 && doorSfx === 1) { doorSfx = 2; A.sfx('door'); }
if (t > 4.2 && doorSfx === 2) { doorSfx = 3; A.sfx('ready'); U.call('ONLINE', true); }
M.setDoor(hero, clamp((t - 2.0) / 0.6, 0, 1) * (1 - clamp((t - 3.5) / 0.6, 0, 1)));
if (t > 2.6) {
const k = clamp((t - 2.6) / 0.8, 0, 1);
agent.position.lerpVectors(door, V3(x - 0.3, 0.35, 0.2), ease(k)); agent.scale.setScalar(1 - 0.6 * k); agent.rotation.y = -Math.PI / 2;
agent.visible = k < 1;
}
if (t >= 5.4) { beginPlay(); return null; }
const a = -2.4 + 1.9 * ease(clamp(t / 4.4, 0, 1)), tA = V3(x, 0.9, 0.3);
const pA = V3(x + Math.sin(a) * 8.5, 3.3, 0.3 + Math.cos(a) * 8.5);
const b = ease(clamp((t - 4.4) / 1.0, 0, 1));
const c = W.chase(x, 0);
return { pos: pA.lerp(c.pos, b), target: tA.lerp(c.target, b), fov: 42 + 18 * b };
}
function play(dt) {
G.runT += dt;
if (G.flying) {
G.flyT += dt;
const up = clamp(G.flyT / 1.0, 0, 1), down = clamp((G.flyT - (FLY_DUR - 1.3)) / 1.3, 0, 1);
G.y = 9 * ease(up) * (1 - ease(down));
if ((ringT -= dt) <= 0 && G.flyT < FLY_DUR - 2.2) { ringT = 0.8; add('ring', Math.floor(Math.random() * 4), -150); }
if (G.flyT >= FLY_DUR) { G.flying = false; G.y = 0; G.invuln = Math.max(G.invuln, 1.0); G.shake = 0.5; A.sfx('land'); A.setLevel(1); }
} else {
G.fly = Math.min(100, G.fly + 2.5 * dt);
}
G.emp = Math.min(100, G.emp + 3 * dt);
const vt = G.flying && G.flyT < FLY_DUR - 1.1 ? 1 : 0;
G.view += clamp(vt - G.view, -dt / 1.1, dt / 1.1);
const Z = ZONES[G.zone], target = (Z.speed + Math.min(6, (G.dist - Z.from) / 300)) * (G.flying ? 1.25 : 1);
G.speed += clamp(target - G.speed, -14 * dt, 14 * dt);
G.dist += G.speed * dt; G.score += G.speed * dt * 0.5; G.progress = G.dist / TOTAL;
G.x += (LANES[G.lane] - G.x) * Math.min(1, dt * 12);
G.invuln = Math.max(0, G.invuln - dt);
const z = zoneAt(G.dist);
if (z !== G.zone) enterZone(z);
if (G.dist >= spawnD && G.dist < TOTAL - 320) { spawnRow(); spawnD = G.dist + 30 - G.zone * 2 + Math.random() * 14; }
if (!W.tower.visible && G.dist > TOTAL - 420) { W.tower.visible = true; W.tower.position.set(0, -0.6, -(TOTAL + 70 - G.dist)); U.say('HQ-tårnet er i sigte! Hold ud, agent.', 4); }
if (G.fly >= 100 && !hints.fly) { hints.fly = 1; U.say('Flyv-måleren er fuld! Tryk MELLEMRUM eller FLYV for at flyve over agenterne.', 5.5); U.call('FLYV KLAR', true); A.sfx('ready'); }
if (G.emp >= 100 && !hints.emp) { hints.emp = 1; U.say('EMP er klar. Tryk E eller EMP, når agenterne kommer tæt på.', 5); A.sfx('ready'); }
updateObjs(dt); collide();
if (G.dist >= TOTAL - 90 && G.mode === 'play') startFinale();
return G.speed * dt;
}
function finale(dt) {
finT += dt; G.runT += dt;
G.speed += clamp(26 - G.speed, -10 * dt, 10 * dt);
G.y = 9 * ease(clamp(finT / 1.0, 0, 1)) + 46 * ease(clamp((finT - 0.6) / 3.4, 0, 1));
G.x += (0 - G.x) * Math.min(1, dt * 1.5);
G.view += clamp(1 - G.view, -dt, dt);
G.progress = Math.min(1, G.progress + dt * 0.02);
updateObjs(dt);
if (finT > 4.4 && G.mode === 'finale') win();
return G.speed * dt;
}
let last = 0;
const tagV = new VJ.E.V3();
function frame(now) {
const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
step(dt); requestAnimationFrame(frame);
}
function step(dt) {
G.t += dt; U.tick(dt); U.briefTick(dt);
if (G.mode === 'pause') { W.render(); return; }
let dz = 0, orbit = null;
if (G.mode === 'title' || G.mode === 'brief') { dz = 5 * dt; orbit = attract(); }
else if (G.mode === 'intro') orbit = intro(dt);
else if (G.mode === 'play') dz = play(dt);
else if (G.mode === 'finale') dz = finale(dt);
else if (G.mode === 'over') { G.speed = Math.max(0, G.speed - 30 * dt); dz = G.speed * dt; updateObjs(dt); }
else if (G.mode === 'win') {
finT += dt; G.y += (62 - G.y) * dt;
orbit = { target: V3(G.x, G.y + 4, W.tower.position.z * 0.5), angle: finT * 0.18 + 0.5, radius: 34, height: 8, fov: 50 };
}
G.shake = Math.max(0, G.shake - dt * 2.5);
const steer = LANES[G.lane] - G.x;
hero.position.set(G.x, G.y + (G.y > 0.5 ? Math.sin(G.t * 3) * 0.15 : 0), 0);
hero.rotation.set(G.y > 0.5 ? -0.08 : 0, steer * 0.05, -steer * 0.08);
M.setFly(hero, clamp(G.y / 2.5, 0, 1), G.t);
if (G.mode === 'play' || G.mode === 'finale') hero.visible = G.invuln <= 0 || Math.floor(G.t * 5) % 2 === 0;
FX.shadow.position.set(G.x, 0.03, 0);
const sh = 1 / (1 + G.y * 0.12); FX.shadow.scale.set(1.1 * sh, 1.9 * sh, 1); FX.shadow.material.opacity = 0.45 * sh; FX.shadow.visible = hero.visible;
FX.update(dt, dz);
W.update(dt, { dz, view: G.view, heroX: G.x, heroY: G.y, shake: G.shake, orbit });
const tags = [];
if (G.mode === 'play') for (const o of objs) {
const t = TAG[o.kind];
if (!t || o.z < (G.view > 0.5 ? -80 : -150) || o.z > 4) continue;
const p = W.project(tagV.set(o.x, o.y + (o.kind === 'google' ? 1.3 : 2.4), o.z));
if (p.on) tags.push({ x: p.x, y: p.y, cls: t[1], name: t[0], act: o.act });
}
U.tags(tags);
U.hud(G);
W.render();
}
function boot() {
W.init(U.$('view')); FX.init(W.scene);
hero = M.hero(); W.scene.add(hero);
agent = M.agent(); agent.visible = false; W.scene.add(agent);
reset(0); G.mode = 'title';
U.bind(act);
const on = (id, f) => U.$(id).addEventListener('click', f);
on('b-start', start);
on('b-how', () => { const h = U.$('how'); h.hidden = !h.hidden; U.$('b-how').setAttribute('aria-expanded', String(!h.hidden)); });
on('b-next', () => U.briefNext()); on('b-skip', () => U.briefNext(true));
on('b-retry', retry); on('b-restart', restart); on('b-again', restart); on('b-resume', resume); on('b-mute', toggleMute);
addEventListener('resize', W.resize);
document.addEventListener('visibilitychange', () => { if (document.hidden && (G.mode === 'play' || G.mode === 'finale')) pause(); });
requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
}
const ready = document.fonts ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]) : Promise.resolve();
ready.then(boot);
})();
