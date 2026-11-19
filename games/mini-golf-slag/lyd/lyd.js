// Lydeffekter til golfspillet – genereres med Web Audio, så der er ingen lydfiler
// Bruges fra index.html via sfx.swing(), sfx.putt(), sfx.cup(), sfx.splash(), sfx.thud(), sfx.tick(),
// sfx.chargeSet()/chargeStop(), sfx.land(), sfx.tree(), sfx.lipOut(), sfx.result(), sfx.fanfare(),
// sfx.newHole() og sfx.setWind() (vindsus + fuglekvidder i baggrunden)

let actx = null;
let pendingWind = null;   // vindstyrke der venter på, at lyden bliver låst op
function audio() {
  if (!actx) {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    if (pendingWind !== null) sfx.setWind(pendingWind);
  }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
// fælles udgang: alle lyde forstærkes her, og en kompressor forhindrer, at det skratter
const MASTER_VOL = 2.5;
let master = null;
let muted = false;   // lyd slået fra med lydknappen / M (se sfx.setMuted)
function out(a) {
  if (!master) {
    const comp = a.createDynamicsCompressor();
    comp.threshold.value = -12; comp.knee.value = 6; comp.ratio.value = 8;
    comp.attack.value = 0.003; comp.release.value = 0.15;
    master = a.createGain();
    master.gain.value = muted ? 0 : MASTER_VOL;
    master.connect(comp).connect(a.destination);
  }
  return master;
}
function noiseBuffer(a, secs) {
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * secs), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}
function playNoise(a, t, dur, type, freq, q, vol, freqEnd) {
  const src = a.createBufferSource();
  src.buffer = noiseBuffer(a, dur);
  const f = a.createBiquadFilter();
  f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(out(a));
  src.start(t); src.stop(t + dur);
}
function playTone(a, t, dur, type, freq, vol, freqEnd) {
  const o = a.createOscillator();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out(a));
  o.start(t); o.stop(t + dur);
}
const sfx = {
  swing(p, lie) {
    const a = audio(), t = a.currentTime;
    // sus fra køllen gennem luften
    playNoise(a, t, 0.18, 'bandpass', 600, 1.2, 0.15 + 0.35 * p, 2400);
    // selve træffet
    const hit = t + 0.13;
    if (lie === 'sand') {
      playNoise(a, hit, 0.35, 'lowpass', 1800, 0.7, 0.5);
    } else {
      playNoise(a, hit, 0.05, 'highpass', 2500, 0.8, 0.5 + 0.4 * p);
      playTone(a, hit, 0.09, 'triangle', 1100 + 500 * p, 0.35, 500);
    }
  },
  putt(p) {
    const a = audio(), t = a.currentTime;
    playTone(a, t, 0.08, 'sine', 900, 0.25 + 0.3 * p, 600);
    playNoise(a, t, 0.03, 'highpass', 3000, 0.7, 0.2);
  },
  cup() {
    const a = audio(), t = a.currentTime;
    [0, 0.07, 0.15].forEach((d, i) => playTone(a, t + d, 0.12, 'triangle', 700 - i * 120, 0.3, 300));
    [523, 659, 784].forEach((f, i) => playTone(a, t + 0.3 + i * 0.1, 0.35, 'sine', f, 0.18));
  },
  splash() {
    const a = audio(), t = a.currentTime;
    playNoise(a, t, 0.5, 'lowpass', 2500, 0.5, 0.5, 300);
  },
  thud() {
    const a = audio(), t = a.currentTime;
    playTone(a, t, 0.12, 'sine', 160, 0.35, 60);
  },

  // lille klik når sigtet drejes med et kort tastetryk
  tick() {
    const a = audio(), t = a.currentTime;
    playTone(a, t, 0.03, 'square', 2200, 0.12);
  },

  // stigende tone mens Space holdes nede og kraften lades op
  chargeSet(p) {
    const a = audio(), t = a.currentTime;
    if (!chargeOsc) {
      chargeOsc = a.createOscillator();
      chargeOsc.type = 'triangle';
      chargeGain = a.createGain();
      chargeGain.gain.setValueAtTime(0.0001, t);
      chargeOsc.connect(chargeGain).connect(out(a));
      chargeOsc.start(t);
    }
    chargeOsc.frequency.setTargetAtTime(220 + 660 * p, t, 0.02);
    chargeGain.gain.setTargetAtTime(0.06 + 0.08 * p, t, 0.03);
  },
  chargeStop() {
    if (!chargeOsc) return;
    const a = audio(), t = a.currentTime;
    chargeGain.gain.setTargetAtTime(0.0001, t, 0.02);
    chargeOsc.stop(t + 0.15);
    chargeOsc = chargeGain = null;
  },

  // bolden rammer jorden; impact er den lodrette fart (px/s)
  land(terrain, impact) {
    const a = audio(), t = a.currentTime;
    const v = Math.min(1, impact / 200);
    if (v < 0.03) return;
    if (terrain === 'sand') {
      playNoise(a, t, 0.3, 'lowpass', 1200, 0.6, 0.6 * v + 0.2, 300);
    } else if (terrain === 'green') {
      playTone(a, t, 0.08, 'sine', 320, 0.5 * v + 0.1);
      playNoise(a, t, 0.05, 'bandpass', 1500, 1, 0.3 * v);
    } else {
      // fairway og rough: dump bump med lidt græs-rasl
      playTone(a, t, 0.12, 'sine', 140, 0.7 * v + 0.15, 70);
      playNoise(a, t, terrain === 'rough' ? 0.18 : 0.08, 'bandpass', 2500, 0.8, 0.35 * v + 0.05);
    }
  },

  // bolden rammer et træ: blade-rasl + et knæk fra stammen
  tree() {
    const a = audio(), t = a.currentTime;
    playNoise(a, t, 0.45, 'highpass', 3000, 0.5, 0.6, 6000);
    playTone(a, t, 0.08, 'square', 420, 0.25, 180);
    playTone(a, t + 0.01, 0.15, 'sine', 210, 0.6, 90);
  },

  // bolden ryger hen over hullet for hurtigt ("lip out")
  lipOut() {
    const a = audio(), t = a.currentTime;
    [0, 0.05, 0.09].forEach((d, i) => playTone(a, t + d, 0.07, 'triangle', 900 + i * 150, 0.4, 500));
  },

  // reaktion fra publikum efter hullet: jubel for birdie eller bedre, ellers høflig klapsalve eller et suk
  result(diff, holeInOne) {
    const a = audio(), t = a.currentTime + 0.6;
    if (holeInOne || diff <= -1) {
      applause(a, t, holeInOne ? 3 : 2, 1);
      const notes = holeInOne ? [523, 659, 784, 1047, 784, 1047] : [523, 659, 784, 1047];
      notes.forEach((f, i) => {
        playTone(a, t + i * 0.12, 0.3, 'square', f, 0.15);
        playTone(a, t + i * 0.12, 0.3, 'triangle', f / 2, 0.25);
      });
    } else if (diff === 0) {
      applause(a, t, 1.2, 0.6);
    } else {
      // skuffet "åhh" – faldende tone
      playTone(a, t, 0.8, 'sawtooth', 330, 0.15, 220);
      playTone(a, t, 0.8, 'sine', 165, 0.35, 110);
    }
  },

  // fanfare når runden er færdig
  fanfare() {
    const a = audio(), t = a.currentTime + 1.6;
    [[392, 0.15], [523, 0.15], [659, 0.15], [784, 0.45], [659, 0.15], [784, 0.7]].reduce((at, [f, d]) => {
      playTone(a, t + at, d + 0.1, 'square', f, 0.14);
      playTone(a, t + at, d + 0.1, 'triangle', f, 0.28);
      return at + d;
    }, 0);
  },

  // lille "ding" når et nyt hul starter
  newHole() {
    const a = audio(), t = a.currentTime;
    playTone(a, t, 0.4, 'sine', 880, 0.3);
    playTone(a, t + 0.12, 0.5, 'sine', 1320, 0.25);
  },

  // baggrund: vindsus der følger vindstyrken (0–9 m/s) og fugle der kvidrer en gang imellem
  setWind(speed) {
    // lyden må først startes efter et tastetryk; indtil da huskes vindstyrken bare
    pendingWind = speed;
    if (!actx) return;
    const a = actx, t = a.currentTime;
    if (!windNode) startAmbience(a);
    windGain.gain.setTargetAtTime(0.03 + speed * 0.025, t, 0.8);
    windFilter.frequency.setTargetAtTime(300 + speed * 70, t, 0.8);
  },
};

let chargeOsc = null, chargeGain = null;
let windNode = null, windGain = null, windFilter = null;

function applause(a, t, secs, vol) {
  // mange korte støjklik oven i hinanden lyder som klappende hænder
  const n = Math.floor(secs * 70);
  for (let i = 0; i < n; i++) {
    const at = t + Math.random() * secs;
    const fade = 1 - (at - t) / secs;
    playNoise(a, at, 0.03, 'bandpass', 1200 + Math.random() * 1800, 1.5, (0.2 + Math.random() * 0.3) * vol * (0.3 + 0.7 * fade));
  }
}

function startAmbience(a) {
  windNode = a.createBufferSource();
  windNode.buffer = noiseBuffer(a, 4);
  windNode.loop = true;
  windFilter = a.createBiquadFilter();
  windFilter.type = 'lowpass'; windFilter.frequency.value = 400; windFilter.Q.value = 0.8;
  // langsom LFO giver vinden vindstød
  const lfo = a.createOscillator(), lfoGain = a.createGain();
  lfo.frequency.value = 0.15; lfoGain.gain.value = 150;
  lfo.connect(lfoGain).connect(windFilter.frequency);
  windGain = a.createGain(); windGain.gain.value = 0.0001;
  windNode.connect(windFilter).connect(windGain).connect(out(a));
  windNode.start(); lfo.start();
  scheduleBird();
}

function scheduleBird() {
  setTimeout(() => {
    if (actx && actx.state === 'running' && !document.hidden) bird(actx);
    scheduleBird();
  }, 4000 + Math.random() * 9000);
}

function bird(a) {
  const t = a.currentTime;
  const base = 2500 + Math.random() * 1500;
  const n = 2 + Math.floor(Math.random() * 4);
  for (let i = 0; i < n; i++) {
    const at = t + i * (0.09 + Math.random() * 0.05);
    playTone(a, at, 0.07, 'sine', base * (1 + Math.random() * 0.3), 0.08, base * 0.7);
  }
}

// Slå al lyd fra eller til. Alle lyde går gennem den fælles udgang, så det er nok at skrue den ned.
sfx.setMuted = function (on) {
  muted = on;
  if (master) { master.gain.cancelScheduledValues(0); master.gain.value = on ? 0 : MASTER_VOL; }
};
