"use strict";

const get = id => document.getElementById(id);
const canvas = get("stadium");
const raceContext = canvas.getContext("2d");
const stadiumBackground = document.createElement("canvas");
stadiumBackground.width = canvas.width;
stadiumBackground.height = canvas.height;
const ctx = stadiumBackground.getContext("2d");
const signal = get("signal");
const button = get("start");
const results = get("results");
const player = 2;
const laneCount = 6;
// World Athletics athlete profiles and 100 m records. Historical hand times
// retain their original precision.
const sprinters = [
  ["Jesse Owens", "10,2", true], ["Harrison Dillard", "10,3", true],
  ["Bobby Morrow", "10,2", true], ["Armin Hary", "10,0", true],
  ["Bob Hayes", "10,0", true], ["Jim Hines", "9,95"],
  ["Valeriy Borzov", "10,07"], ["Hasely Crawford", "10,06"],
  ["Allan Wells", "10,11"], ["Carl Lewis", "9,86"],
  ["Linford Christie", "9,87"], ["Leroy Burrell", "9,85"],
  ["Donovan Bailey", "9,84"], ["Maurice Greene", "9,79"],
  ["Justin Gatlin", "9,74"], ["Asafa Powell", "9,72"],
  ["Tyson Gay", "9,69"], ["Usain Bolt", "9,58"],
  ["Yohan Blake", "9,69"], ["Christian Coleman", "9,76"]
].map(([name, time, handTimed], index) => ({
  name, personalBest: time + " s" + (handTimed ? " (håndtid)" : ""),
  sprint: {
    reaction: 0.15 + (index % 5) * 0.015,
    top: 100 / (Number(time.replace(",", ".")) + (handTimed ? 0.24 : 0) - 0.9),
    acceleration: 1.2 + (index % 4) * 0.07,
    fadeAt: 55 + (index % 4) * 4,
    fade: 0.04 + (index % 3) * 0.013
  }
}));
let remainingSprinters = [];
let heatSprinters = [];
const introCard = get("intro-card");
const skipIntro = get("skip-intro");
const introCloseup = get("intro-closeup");
const introPortrait = get("intro-portrait");
const introAvatar = get("intro-avatar");
const introPhotoCredit = get("intro-photo-credit");
const portraits = new Map([
  ["Usain Bolt", ["usain-bolt.jpg", "Usain_Bolt_portrait.jpg", "Samsung Belgium · CC BY 2.0"]],
  ["Carl Lewis", ["carl-lewis.jpg", "Carl_Lewis.jpg", "KUHT · CC0 1.0"]],
  ["Valeriy Borzov", ["valeriy-borzov.jpg", "Valeriy_Borzov.jpg", "Alik O / Ahonc · CC BY-SA 3.0"]],
  ["Asafa Powell", ["asafa-powell.jpg", "Asafa_Powell_-_Singapore_2010.jpg", "Julie V. · CC BY 2.0"]],
  ["Christian Coleman", ["christian-coleman.jpg", "DOH20281_coleman_(48910953681).jpg", "Filip Bossuyt · CC BY 2.0"]],
  ["Yohan Blake", ["yohan-blake.jpg", "Yohan_Blake_com_medalha_de_ouro_no_4_x_100_metros_1039105-19.08.2016_frz-1203_(cropped).jpg",
    "Fernando Frazão/Agência Brasil · CC BY 3.0 BR"]],
  ["Justin Gatlin", ["justin-gatlin.jpg", "Justin_Gatlin_Doha_2015.jpg", "Doha Stadium Plus Qatar · CC BY 2.0"]]
]);
const introLaneDuration = 1600;
const introMoveDuration = 350;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const colors = ["#85d7fc", "#ffdd81", "#dcff68", "#e3a9fa", "#ff967e", "#fff5dd"];
const format = (value, digits = 2) => value.toFixed(digits).replace(".", ",");
const startX = 145;
const finishX = 1000;
const lanesTop = 211;
const laneHeight = 48;
const checkpoints = [25, 50, 75, 100];
let runners, phase, lastKey, reaction, splits, elapsed, currentCue, comparedTime;
let previousTime = null;
let raceFrame;
const runoutDuration = 1.4;
const nameInput = get("runner-name");
const recordKey = "bislett-games.records.v1";
let playerName = "";
let storageAvailable = true;
let records = [];

function recordName(name) {
  return name.trim().toLocaleLowerCase("da");
}

function readRecords() {
  try {
    const saved = JSON.parse(localStorage.getItem(recordKey) || "[]");
    storageAvailable = true;
    return Array.isArray(saved) ? saved.filter(record => record &&
      typeof record.name === "string" && recordName(record.name) &&
      Number.isFinite(record.time) && Number.isFinite(record.reaction) &&
      Array.isArray(record.splits) && record.splits.length === 3 &&
      record.splits.every(Number.isFinite)) : [];
  } catch {
    storageAvailable = false;
    return [];
  }
}

function mergeRecords() {
  const bestByName = new Map();
  for (const record of [...readRecords(), ...records]) {
    const name = recordName(record.name);
    const best = bestByName.get(name);
    if (!best || record.time < best.time) bestByName.set(name, record);
  }
  records = [...bestByName.values()];
}

function drawRecords() {
  const best = records.slice().sort((a, b) => a.time - b.time).slice(0, 8);
  get("record-table").hidden = best.length === 0;
  get("record-status").textContent = !storageAvailable ? "Rekorder kan kun vises i denne session." :
    best.length ? "" : "Gennemfør et heat for at sætte den første rekord.";
  get("record-rows").replaceChildren(...best.map((record, index) => {
    const row = document.createElement("tr");
    const times = [record.time, record.reaction, ...record.splits];
    const model = record.sprintModel === 2 ? "2" : "1";
    [index + 1, record.name, ...times.map(time => format(time) + " s"), model].forEach(value => {
      row.insertCell().textContent = value;
    });
    return row;
  }));
}

function playerRecordIndex(player = playerName) {
  const name = recordName(player);
  return records.findIndex(record => recordName(record.name) === name);
}

function persistRecord(record) {
  mergeRecords();
  const index = playerRecordIndex(record.name);
  if (index >= 0 && records[index].time <= record.time) return false;
  if (index < 0) records.push(record);
  else records[index] = record;
  try {
    localStorage.setItem(recordKey, JSON.stringify(records));
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
  return index >= 0;
}

async function saveRecord(time) {
  const record = {name: playerName, time, reaction, splits: splits.slice(0, 3), sprintModel: 2};
  let personalBest;
  try {
    personalBest = navigator.locks
      ? await navigator.locks.request(recordKey, () => persistRecord(record))
      : persistRecord(record);
  } catch {
    personalBest = persistRecord(record);
  }
  drawRecords();
  return personalBest;
}

window.addEventListener("storage", event => {
  if (event.key !== recordKey || event.storageArea !== localStorage) return;
  mergeRecords();
  drawRecords();
});
let timers = [];
let startAudio;

function selectHeatSprinters() {
  const opponentCount = laneCount - 1;
  if (remainingSprinters.length === 0) {
    remainingSprinters = sprinters.slice();
    for (let index = remainingSprinters.length - 1; index > 0; index--) {
      const other = Math.floor(Math.random() * (index + 1));
      [remainingSprinters[index], remainingSprinters[other]] =
        [remainingSprinters[other], remainingSprinters[index]];
    }
    if (remainingSprinters.slice(0, opponentCount).every(name => heatSprinters.includes(name))) {
      remainingSprinters.push(remainingSprinters.shift());
    }
  }
  heatSprinters = remainingSprinters.splice(0, opponentCount);
}

function reset() {
  const record = records[playerRecordIndex()];
  const playerEntry = {name: playerName, personalBest: record ? format(record.time) + " s" : null};
  runners = Array.from({length: laneCount}, (_, lane) => ({
    ...(lane === player ? playerEntry : heatSprinters[lane < player ? lane : lane - 1]),
    distance: 0,
    speed: 0,
    stridePhase: 0,
    lastStep: null,
    effort: 0,
    time: null
  }));
  lastKey = null;
  reaction = null;
  splits = [];
  elapsed = 0;
}

function rectangle(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function line(x, y, endX, endY, color, width = 2, context = ctx) {
  context.strokeStyle = color;
  context.lineWidth = width;
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(endX, endY);
  context.stroke();
}

function label(text, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.font = "bold " + size + "px system-ui";
  ctx.fillText(text, x, y);
}

function raceLeader(entrants) {
  return entrants.reduce((leader, runner) =>
    runner.time != null && (!leader || runner.time < leader.time) ? runner : leader, null);
}

function finishMotion(runner, raceTime, winner) {
  if (runner.time == null) return {distance: runner.distance, stride: 1, salute: 0, braking: false};
  const sinceFinish = Math.max(0, raceTime - runner.time);
  const remaining = Math.max(0, 1 - sinceFinish / runoutDuration);
  const distance = 100 + (runner.finishSpeed ?? 0) * runoutDuration * (1 - remaining ** 2) / 2;
  const salute = winner ? Math.min(1, Math.max(0, (sinceFinish - 0.2) / 0.45)) : 0;
  return {distance, stride: remaining, salute, braking: remaining > 0};
}

function drawRunner(runner, lane, raceTime, winner, presenting) {
  const {distance, stride, salute} = finishMotion(runner, raceTime, winner);
  const x = startX + distance / 100 * (finishX - startX);
  const y = lanesTop + lane * laneHeight + 37;
  const runoutPhase = (distance - runner.distance) * 1.2;
  drawSprinter(raceContext, x, y, colors[lane], distance,
    runner.time === null ? Math.min(1, runner.speed / 4) : stride, salute, presenting,
    runner.stridePhase + runoutPhase);
}

function drawSprinter(context, x, y, color, distance, strideStrength, salute = 0, presenting = false, stridePhase) {
  const crouched = distance === 0 && !presenting;
  const stride = Math.sin(stridePhase ?? distance * 2.4) * strideStrength;
  const drive = !crouched && !presenting && stridePhase !== undefined ? Math.exp(-distance / 8) : 0;
  const hip = crouched ? x - 12 : x - 5 - 9 * drive;
  const shoulder = crouched ? x - 5 : x;
  const torsoY = crouched ? y - 16 : y - 23 + 5 * drive;
  for (const side of [-1, 1]) {
    const swing = stride * side;
    const kneeX = crouched ? x - 10 + side * 5 : hip + 3 + swing * 9 + (presenting ? side * 3 : 0);
    const kneeY = crouched ? y - 5 : y - 6 - Math.max(0, swing) * 5;
    line(hip, y - 11, kneeX, kneeY, color, 4, context);
    const footY = y - Math.max(0, swing) * 5;
    line(kneeX, kneeY, crouched ? kneeX - 7 : kneeX - 3, footY, color, 3, context);
    const elbowX = shoulder + (-3 - swing * 7) * (1 - salute) + side * 7 * salute;
    const elbowY = torsoY + 7 - 13 * salute;
    const handX = elbowX + 6 * (1 - salute) + side * 3 * salute;
    const handY = crouched ? y : torsoY + (presenting ? 13 : 3) - 16 * salute;
    line(shoulder, torsoY, elbowX, elbowY, color, 4, context);
    line(elbowX, elbowY, handX, handY, "#f4c398", 3, context);
  }
  line(hip, y - 11, shoulder, torsoY, color, 7, context);
  context.fillStyle = "#f4c398";
  context.beginPath();
  context.arc(shoulder + 4, torsoY - 6, 5, 0, Math.PI * 2);
  context.fill();
}

function oval(x, y, width, height, radius, fill, stroke) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawStadium() {
  rectangle(0, 0, 1120, 540, "#254139");
  rectangle(0, 0, 1120, 182, stadiumWeather.sky);
  for (let block = 0; block < 15; block++) {
    const x = block * 79 - 12;
    const y = 7 + (block * 19) % 37;
    rectangle(x, y + 5, 69, 41, "#414d49");
    rectangle(x, y, 66, 34, ["#b3b4a9", "#d2c6a8", "#a0aaa8"][block % 3]);
    for (let window = 0; window < 6; window++) {
      rectangle(x + 6 + window * 9, y + 9, 5, 4, "#62716e");
    }
  }
  for (let tree = 0; tree < 24; tree++) {
    oval(9 + tree * 48, 39 + (tree * 17) % 53, 27, 19, 9, tree % 2 ? "#355b38" : "#476b3c");
  }

  oval(72, 31, 976, 151, 75, "#37413d");
  oval(67, 26, 986, 149, 74, "#ddd0b5");
  oval(79, 32, 962, 134, 67, "#51796e");
  for (let row = 0; row < 6; row++) {
    oval(83 + row * 7, 35 + row * 4, 954 - row * 14, 128 - row * 8, 64 - row * 4,
      null, row % 2 ? "#9cb5a0" : "#2d605a");
  }
  for (let row = 0; row < 5; row++) {
    for (let seat = 0; seat < 123; seat++) {
      const angle = (seat + row % 2 * 0.5) / 123 * 2 * Math.PI;
      const x = 560 + Math.cos(angle) * (470 - row * 7);
      const y = 99 + Math.sin(angle) * (61 - row * 4);
      rectangle(x, y, 3, 2, colors[(seat * 5 + row * 7 + Math.floor(seat / 7)) % colors.length]);
    }
  }
  for (const aisle of [198, 310, 422, 698, 810, 922]) {
    line(aisle, 33, aisle, 58, "#c7c5ae", 5);
    line(aisle, 143, aisle, 165, "#c7c5ae", 5);
  }

  oval(132, 56, 856, 91, 45, "#b43f2c", "#edb295");
  for (let lane = 1; lane <= 6; lane++) {
    const inset = lane * 2.5;
    oval(132 + inset, 56 + inset, 856 - 2 * inset, 91 - 2 * inset,
      45 - inset, null, "#f1af91");
  }
  oval(150, 74, 820, 55, 27, "#557d34", "#f6d7ac");
  ctx.save();
  ctx.clip();
  for (let x = 150; x < 970; x += 80) rectangle(x, 74, 40, 55, "#61873a");
  ctx.restore();
  label("OSLO BISLETT GAMES", 453, 108, 19, "#f4efd4");
  rectangle(233, 89, 75, 8, "#c97345");
  rectangle(851, 101, 33, 12, "#528ea5");

  for (const x of [114, 1006]) {
    line(x, 104, x, 38, "#e0dac5", 3);
    rectangle(x - 13, 34, 26, 9, "#464f49");
    for (let lamp = 0; lamp < 4; lamp++) rectangle(x - 11 + lamp * 6, 36, 4, 4, "#f5edce");
  }
}

function drawBackground() {
  drawStadium();
  rectangle(0, 0, 1120, 182, stadiumWeather.coldLight);
  drawStadiumWeather(ctx, 762, 5, 340);
  label("🍓", 75, 200, 42, "#fff");
  label("START", startX, 200, 16, "#e5ebd9");
  label("MÅL", finishX - 22, 200, 16, "#e5ebd9");
  for (let lane = 0; lane < 6; lane++) {
    const y = lanesTop + lane * laneHeight;
    rectangle(36, y, 1048, laneHeight, lane === player ? "#b95138" : lane % 2 ? "#a34432" : "#a94834");
    line(36, y, 1084, y, "#e7cabe", 1);
    for (const distance of checkpoints.slice(0, -1)) {
      const mark = startX + distance / 100 * (finishX - startX);
      line(mark, y + 1, mark, y + 7, "#ebd1c3", 2);
    }
    label(String(lane + 1), 55, y + 30, 18, colors[lane]);
    label(String(lane + 1), finishX + 18, y + 29, 16, "#f6d7b9");
    line(finishX - 28, y + 34, finishX - 17, y + 34, "#f6d7b9");
    rectangle(startX - 26, y + 34, 19, 4, "#c5bbb0");
    rectangle(startX - 24, y + 28, 5, 8, "#382e2d");
    rectangle(startX - 15, y + 30, 5, 6, "#382e2d");
  }
  line(startX, lanesTop, startX, 499, "#fff6e3", 3);
  line(finishX, lanesTop, finishX, 499, "#fff6e3", 5);
  line(36, 499, 1084, 499, "#e7cabe");
  checkpoints.forEach(distance => label(distance + " m", startX + distance * 8.55 - 19, 524, 14, "#e5ebd9"));
}

function draw(camera) {
  raceContext.save();
  if (camera) {
    raceContext.setTransform(camera.zoom, 0, 0, camera.zoom, camera.x, camera.y);
  }
  raceContext.drawImage(stadiumBackground, 0, 0);
  const winner = raceLeader(runners);
  runners.forEach((runner, lane) => drawRunner(runner, lane, elapsed, runner === winner, phase === "intro"));
  raceContext.restore();
  get("speed").value = runners[player].speed;
  get("velocity").textContent = format(runners[player].speed, 1) + " m/s";
}

function cue(text) {
  signal.textContent = text;
}

function prepare() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (AudioContext && !get("start-sound").checked) {
    startAudio ??= new AudioContext();
    startAudio.resume().catch(() => {});
  }
  cancelAnimationFrame(raceFrame);
  selectHeatSprinters();
  reset();
  const heatPhotos = runners.map((runner, lane) => {
    const portrait = lane === player ? null : portraits.get(runner.name);
    if (!portrait) return null;
    const [file, source, credit] = portrait;
    const image = new Image();
    image.src = arcadePortraits[file];
    return {image, source: "https://commons.wikimedia.org/wiki/File:" + encodeURIComponent(source), credit};
  });
  phase = "intro";
  button.disabled = true; nameInput.disabled = true; get("throw-tab").disabled = true;
  results.hidden = true; get("new-pr").hidden = true;
  skipIntro.hidden = false;
  skipIntro.focus({preventScroll: true});
  cue("Løberpræsentation");
  draw();
  const started = performance.now();
  let announcedLane = -1;
  raceFrame = requestAnimationFrame(function present(now) {
    const time = now - started;
    const lane = Math.floor(time / introLaneDuration);
    if (lane >= laneCount) {
      startCountdown();
      return;
    }
    if (lane !== announcedLane) {
      const {name, personalBest} = runners[lane];
      get("intro-lane").textContent = "Bane " + (lane + 1);
      get("intro-name").textContent = name;
      get("intro-best").textContent = personalBest ? "Personlig rekord · " + personalBest : "Første heat";
      introCard.style.setProperty("--lane-color", colors[lane]);
      introCard.hidden = true;
      introCloseup.hidden = true;
      announcedLane = lane;
    }
    const laneTime = time % introLaneDuration;
    if (introCloseup.hidden && (reducedMotion.matches || laneTime >= introMoveDuration)) {
      showIntroCloseup(lane, heatPhotos[lane]);
    }
    draw(introCamera(lane, laneTime));
    raceFrame = requestAnimationFrame(present);
  });
}

function showIntroCloseup(lane, photo) {
  const hasPhoto = Boolean(photo?.image.naturalWidth);
  introPortrait.hidden = !hasPhoto;
  introPhotoCredit.hidden = !hasPhoto;
  introAvatar.hidden = hasPhoto;
  if (hasPhoto) {
    introPortrait.src = photo.image.src;
    introPortrait.alt = "Portræt af " + runners[lane].name;
    introPhotoCredit.href = photo.source;
    introPhotoCredit.textContent = photo.credit;
  } else {
    drawIntroAvatar(colors[lane]);
  }
  introCloseup.hidden = false;
  introCard.hidden = false;
}

function drawIntroAvatar(color) {
  const context = introAvatar.getContext("2d");
  context.clearRect(0, 0, introAvatar.width, introAvatar.height);
  function shape(fill, drawShape) {
    context.fillStyle = fill;
    context.beginPath();
    drawShape();
    context.fill();
  }
  shape(color, () => context.roundRect(78, 258, 264, 220, 72));
  shape("#d69a74", () => context.roundRect(175, 220, 70, 81, 22));
  shape("#edb58d", () => context.ellipse(210, 168, 80, 98, 0, 0, 2 * Math.PI));
  shape("#352520", () => {
    context.ellipse(210, 127, 80, 59, 0, Math.PI, 2 * Math.PI);
    context.lineTo(276, 139);
    context.quadraticCurveTo(210, 109, 144, 139);
  });
  for (const eyeX of [182, 238]) {
    shape("#392720", () => context.ellipse(eyeX, 163, 7, 5, 0, 0, 2 * Math.PI));
  }
  line(210, 171, 205, 193, "#b87960", 4, context);
  line(194, 218, 226, 218, "#8b4c40", 4, context);
}

function introCamera(lane, time) {
  const zoom = 4;
  const x = canvas.width * 0.25 - (startX - 5) * zoom;
  const laneY = index => Math.max(canvas.height * (1 - zoom),
    canvas.height * 0.49 - (lanesTop + index * laneHeight + 21) * zoom);
  const target = {zoom, x, y: laneY(lane)};
  if (reducedMotion.matches) return target;
  const fraction = Math.min(1, time / introMoveDuration);
  const progress = fraction * fraction * (3 - 2 * fraction);
  const from = lane === 0 ? {zoom: 1, x: 0, y: 0} : {zoom, x, y: laneY(lane - 1)};
  return {
    zoom: from.zoom + (target.zoom - from.zoom) * progress,
    x: from.x + (target.x - from.x) * progress,
    y: from.y + (target.y - from.y) * progress
  };
}

function startCountdown() {
  cancelAnimationFrame(raceFrame);
  introCard.hidden = true;
  introCloseup.hidden = true;
  skipIntro.hidden = true;
  phase = "ready";
  cue("🍓 På pladserne");
  timers = [
    setTimeout(() => cue("🍓 Færdige"), 1200),
    setTimeout(() => {
      phase = "race";
      currentCue = performance.now();
      cue("🍓 LØB!");
      playStartSignal();
      raceFrame = requestAnimationFrame(frame);
    }, 1900 + Math.random() * 1200)
  ];
  draw();
}

function playStartSignal() {
  if (get("start-sound").checked || startAudio?.state !== "running") return;
  const buffer = startAudio.createBuffer(1, Math.ceil(startAudio.sampleRate * 0.16), startAudio.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index++) {
    samples[index] = (Math.random() * 2 - 1) * 0.7 * Math.exp(-index / (startAudio.sampleRate * 0.023));
  }
  const shot = startAudio.createBufferSource();
  shot.buffer = buffer;
  shot.connect(startAudio.destination);
  shot.start();
}

skipIntro.addEventListener("click", startCountdown);

function step(runner, speed, dt) {
  if (runner.time !== null) return;
  const before = runner.distance;
  runner.speed = speed;
  runner.distance = Math.min(100, before + speed * dt);
  if (speed > 0) runner.stridePhase += Math.PI * (2 + 0.22 * speed) * dt;
  if (runner === runners[player]) {
    while (splits.length < checkpoints.length && runner.distance >= checkpoints[splits.length]) {
      splits.push(elapsed - dt + (checkpoints[splits.length] - before) / speed);
    }
  }
  if (runner.distance >= 100) {
    runner.time = elapsed - dt + (100 - before) / speed;
    runner.finishSpeed = speed;
    runner.speed = 0;
  }
}

async function showResults() {
  phase = "done";
  cue("Heat afsluttet");
  const order = runners.map((runner, lane) => ({...runner, lane})).sort((a, b) => a.time - b.time);
  get("ranking").replaceChildren(...order.map(({lane, name, time}, index) => {
    const row = document.createElement("tr");
    if (lane === player) row.className = "you";
    [index + 1, name, format(time) + " s"].forEach(value => {
      row.insertCell().textContent = value;
    });
    return row;
  }));
  const time = runners[player].time;
  get("summary").textContent = "Din placering: " + (order.findIndex(entry => entry.lane === player) + 1) + " af 6.";
  get("splits").textContent = "Reaktion " + format(reaction) + " s · " +
    splits.map((split, i) => checkpoints[i] + " m: " + format(split) + " s").join(" · ");
  comparedTime = previousTime;
  get("comparison").textContent = comparedTime === null ? "" :
    "Forrige heat: " + format(comparedTime) + " s · Forskel: " + format(Math.abs(time - comparedTime)) + " s" +
    (time === comparedTime ? "" : time < comparedTime ? " hurtigere" : " langsommere");
  previousTime = time;
  results.hidden = false;
  get("new-pr").hidden = !await saveRecord(time);
  nameInput.value = "";
  nameInput.disabled = false;
  button.textContent = "Løb igen";
  button.disabled = false; get("throw-tab").disabled = false;
}

function sprintFade(distance, start, amount) {
  return 1 - amount * Math.max(0, (distance - start) / (100 - start));
}

function advanceRace(now) {
  const raceTime = (now - currentCue) / 1000;
  while (elapsed < raceTime && phase === "race") {
    const dt = Math.min(1 / 60, raceTime - elapsed);
    elapsed += dt;
    runners.forEach((runner, lane) => {
      if (runner.time !== null) return;
      if (lane === player) {
        if (runner.lastStep === null) return;
        const pause = Math.max(0, elapsed - runner.lastStep - 0.23);
        const effort = runner.effort * Math.exp(-pause * 4);
        const target = 11.8 * effort * sprintFade(runner.distance, 62, 0.05);
        const response = target > runner.speed ? 0.95 : 1.65;
        step(runner, target + (runner.speed - target) * Math.exp(-response * dt), dt);
      } else {
        const {reaction, top, acceleration, fadeAt, fade} = runner.sprint;
        const running = Math.max(0, elapsed - reaction);
        const speed = top * (1 - Math.exp(-running / acceleration)) *
          sprintFade(runner.distance, fadeAt, fade);
        step(runner, speed, Math.min(dt, running));
      }
    });
    if (runners.every(runner => runner.time !== null)) showResults();
  }
  elapsed = Math.max(elapsed, raceTime);
}

function frame(now) {
  advanceRace(now);
  draw();
  if (phase === "race" || runners.some(runner => finishMotion(runner, elapsed, false).braking)) {
    raceFrame = requestAnimationFrame(frame);
  }
}

document.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();
  if (get("offline").hidden || get("running").hidden || event.repeat || !["a", "d"].includes(key)) return;
  if (phase === "ready") {
    timers.forEach(timer => clearTimeout(timer));
    phase = "idle";
    cue("Tyvstart. Vent på LØB!");
    button.textContent = "Prøv igen"; nameInput.disabled = false;
    button.disabled = false; get("throw-tab").disabled = false;
    return;
  }
  if (phase !== "race" || runners[player].time !== null || key === lastKey) return;
  const now = performance.now();
  advanceRace(now);
  const runner = runners[player];
  if (phase !== "race" || runner.time !== null) return;
  const tapTime = (now - currentCue) / 1000;
  if (reaction === null) reaction = tapTime;
  const interval = runner.lastStep === null ? 0.23 : tapTime - runner.lastStep;
  const rhythm = Math.min(1, 0.23 / Math.max(interval, 0.01));
  runner.effort += (rhythm - runner.effort) * 0.55;
  runner.lastStep = tapTime;
  lastKey = key;
});

// Arkaden's sandbox blocks form submission.
function bindStart(button, input, start) {
  button.addEventListener("click", () => {
    if (input.reportValidity()) start();
  });
  input.addEventListener("keydown", event => {
    if (event.key !== "Enter" || event.isComposing || event.repeat) return;
    event.preventDefault();
    button.click();
  });
}

bindStart(button, nameInput, () => {
  const name = nameInput.value.trim();
  if (!name) {
    cue("Skriv dit navn før start.");
    nameInput.focus();
    return;
  }
  playerName = name;
  prepare();
});
mergeRecords();
drawRecords();
phase = "idle";
reset();
drawBackground();
draw();
