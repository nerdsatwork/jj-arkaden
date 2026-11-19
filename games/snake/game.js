// Snake: styr slangen med piletasterne eller ved at swipe, spis æblerne,
// og undgå kanten, murene og din egen hale. Banerne står i levels.js.

const canvas = document.getElementById("bane");
const ctx = canvas.getContext("2d");
const pointTekst = document.getElementById("point");
const levelTekst = document.getElementById("level");
const beskedBoks = document.getElementById("besked");
const beskedTitel = document.getElementById("besked-titel");
const beskedTekst = document.getElementById("besked-tekst");
const knap = document.getElementById("knap");
const highscoreListe = document.getElementById("highscore");

const FELTER = 20; // banen er 20 x 20 felter
const FELT = canvas.width / FELTER; // et felts størrelse i pixels

// Farverne hentes fra CSS-variablerne i style.css, så design.md kun skal rettes ét sted
const css = getComputedStyle(document.documentElement);
const farve = (navn) => css.getPropertyValue(navn).trim();
const FARVER = {
  bane: farve("--flade"),
  ternet: farve("--baggrund"),
  slange: farve("--daempet"),
  hoved: farve("--tekst"),
  mad: farve("--accent"),
  blad: farve("--blad"),
  mur: farve("--kant"),
  murKant: farve("--daempet"),
};

const RETNINGER = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

let slange, retning, koe, mad, point, levelNr, spist;
let timer = null; // sat, mens slangen bevæger sig
let knapHandling; // hvad knappen i beskeden gør lige nu

function nytSpil() {
  point = 0;
  levelNr = 0;
  klarLevel();
  koer();
}

const START_LAENGDE = 3;

// Stil slangen op til levelet, uden at sætte den i gang.
// Hovedet starter i (10, 10) med to led bag sig. Er slangen længere, ligger resten
// af halen gemt under det sidste led og kryber ud, når slangen begynder at bevæge sig.
function klarLevel(laengde = START_LAENGDE) {
  slange = [];
  for (let i = 0; i < laengde; i++) slange.push({ x: 10 - Math.min(i, 2), y: 10 });
  retning = RETNINGER.ArrowRight;
  koe = [];
  spist = 0;
  mad = nyMad();
  visTal();
  tegn();
}

function koer() {
  beskedBoks.hidden = true;
  clearInterval(timer);
  timer = setInterval(skridt, level().fart);
}

function stop() {
  clearInterval(timer);
  timer = null;
}

function pause() {
  if (!timer) return;
  stop();
  visBesked("Pause", "Spillet venter på dig.", "Fortsæt", koer);
}

function level() {
  return LEVELS[levelNr];
}

function skridt() {
  if (koe.length > 0) retning = koe.shift();
  const hoved = { x: slange[0].x + retning.x, y: slange[0].y + retning.y };
  const spiser = hoved.x === mad.x && hoved.y === mad.y;
  // Halen flytter sig væk i samme skridt, så den tæller kun med, når slangen vokser
  const krop = spiser ? slange : slange.slice(0, -1);

  const udenfor = hoved.x < 0 || hoved.y < 0 || hoved.x >= FELTER || hoved.y >= FELTER;
  if (udenfor || paa(krop, hoved) || paa(level().mure, hoved)) {
    slut("Spillet er slut", `Du fik ${point} point og nåede level ${levelNr + 1}.`);
    return;
  }

  slange.unshift(hoved);
  if (spiser) {
    point += 1;
    spist += 1;
    visTal();
    if (spist >= level().maal) {
      if (levelNr === LEVELS.length - 1) {
        slut("Du vandt!", `Du klarede alle ${LEVELS.length} levels og fik ${point} point.`);
        return;
      }
      // Et lille pusterum, før det næste og hurtigere level går i gang
      stop();
      levelNr += 1;
      klarLevel(slange.length); // slangen beholder sin længde
      visBesked(
        `Level ${levelNr + 1}`,
        `${level().navn}. Slangen er ${slange.length} lang. Spis ${level().maal} æbler.`,
        "Start",
        koer
      );
      return;
    }
    mad = nyMad();
  } else {
    slange.pop();
  }
  tegn();
}

function slut(titel, tekst) {
  stop();
  tegn();
  const rekord = point > 0 && point > (hentHighscore()[0]?.point ?? 0);
  if (point > 0) gemHighscore(point, levelNr + 1);
  visBesked(titel, tekst + (rekord ? " Ny rekord!" : ""), "Spil igen", nytSpil);
}

function visBesked(titel, tekst, knapTekst, handling) {
  beskedTitel.textContent = titel;
  beskedTekst.textContent = tekst;
  knap.textContent = knapTekst;
  knapHandling = handling;
  beskedVist = performance.now();
  beskedBoks.hidden = false;
  knap.focus();
}

// En besked, der lige er dukket op, ignorerer tryk et øjeblik, så et tryk,
// der var ment til spillet, ikke springer beskeden over
const BESKED_RO = 500; // millisekunder
let beskedVist = 0;

function trykKnap() {
  if (performance.now() - beskedVist < BESKED_RO) return;
  knapHandling();
}

// Highscore: de fem bedste runder, gemt i browseren (localStorage)
const HIGHSCORE_NOEGLE = "snake-highscore";

function hentHighscore() {
  try {
    const liste = JSON.parse(localStorage.getItem(HIGHSCORE_NOEGLE));
    return Array.isArray(liste) ? liste : [];
  } catch {
    return []; // fx i et privat vindue, hvor browseren ikke må gemme
  }
}

function gemHighscore(point, level) {
  const liste = hentHighscore();
  liste.push({ point, level, dato: new Date().toLocaleDateString("da-DK") });
  liste.sort((a, b) => b.point - a.point);
  try {
    localStorage.setItem(HIGHSCORE_NOEGLE, JSON.stringify(liste.slice(0, 5)));
  } catch {
    // Kan browseren ikke gemme, spiller vi bare videre uden
  }
  visHighscore();
}

function visHighscore() {
  const liste = hentHighscore();
  highscoreListe.replaceChildren();
  if (liste.length === 0) {
    const tom = document.createElement("li");
    tom.className = "tom";
    tom.textContent = "Ingen point endnu. Spil en runde!";
    highscoreListe.append(tom);
    return;
  }
  liste.forEach((runde) => {
    const li = document.createElement("li");
    li.innerHTML = "<span></span><span></span>";
    li.children[0].textContent = `${runde.point} point`;
    li.children[1].textContent = `level ${runde.level}, ${runde.dato}`;
    highscoreListe.append(li);
  });
}

function visTal() {
  pointTekst.textContent = point;
  levelTekst.textContent = `${levelNr + 1}: ${level().navn}`;
}

// Ligger feltet på et af felterne i listen?
function paa(liste, felt) {
  return liste.some((del) => del.x === felt.x && del.y === felt.y);
}

function nyMad() {
  let felt;
  do {
    felt = { x: Math.floor(Math.random() * FELTER), y: Math.floor(Math.random() * FELTER) };
  } while (paa(slange, felt) || paa(level().mure, felt));
  return felt;
}

function tegn() {
  // Banen, med et svagt ternet mønster
  for (let x = 0; x < FELTER; x++) {
    for (let y = 0; y < FELTER; y++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? FARVER.bane : FARVER.ternet;
      ctx.fillRect(x * FELT, y * FELT, FELT, FELT);
    }
  }

  // Murene
  level().mure.forEach((del) => {
    ctx.fillStyle = FARVER.mur;
    ctx.fillRect(del.x * FELT, del.y * FELT, FELT, FELT);
    ctx.strokeStyle = FARVER.murKant;
    ctx.strokeRect(del.x * FELT + 0.5, del.y * FELT + 0.5, FELT - 1, FELT - 1);
  });

  tegnAeble();
  tegnSlange();
}

// Midten af et felt, i pixels
const midt = (del) => ({ x: (del.x + 0.5) * FELT, y: (del.y + 0.5) * FELT });

function tegnAeble() {
  const { x } = midt(mad);
  const y = midt(mad).y + FELT * 0.05; // lidt ned, så stilken kan være der
  const r = FELT * 0.38;

  // Selve æblet: to runde halvdele, så det får et lille hak foroven og forneden
  ctx.fillStyle = FARVER.mad;
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.arc(x + side * r * 0.32, y, r * 0.72, 0, Math.PI * 2);
    ctx.fill();
  });

  // Et blankt skær
  ctx.fillStyle = FARVER.bane;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.ellipse(x - r * 0.45, y - r * 0.2, r * 0.15, r * 0.25, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Stilk og blad
  ctx.strokeStyle = FARVER.hoved;
  ctx.lineWidth = FELT * 0.08;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y - r * 0.5);
  ctx.quadraticCurveTo(x, y - r * 0.95, x + r * 0.2, y - r * 1.1);
  ctx.stroke();
  ctx.fillStyle = FARVER.blad;
  ctx.beginPath();
  ctx.ellipse(x + r * 0.5, y - r * 0.9, r * 0.32, r * 0.14, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

function tegnSlange() {
  // Kroppen er én blød, rund streg gennem felterne, der bliver tyndere mod halen
  ctx.strokeStyle = FARVER.slange;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = slange.length - 1; i > 0; i--) {
    const fra = midt(slange[i]);
    const til = midt(slange[i - 1]);
    ctx.lineWidth = FELT * (0.25 + 0.5 * (1 - i / slange.length));
    ctx.beginPath();
    ctx.moveTo(fra.x, fra.y);
    ctx.lineTo(til.x, til.y);
    ctx.stroke();
  }

  // Hovedet: et aflangt hoved, der peger den vej, slangen kryber
  const hoved = midt(slange[0]);
  const hals = slange[1];
  const vinkel = Math.atan2(slange[0].y - hals.y, slange[0].x - hals.x);
  ctx.save();
  ctx.translate(hoved.x, hoved.y);
  ctx.rotate(vinkel);

  ctx.fillStyle = FARVER.hoved;
  ctx.beginPath();
  ctx.ellipse(FELT * 0.05, 0, FELT * 0.5, FELT * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Øjnene
  [-1, 1].forEach((side) => {
    ctx.fillStyle = FARVER.bane;
    ctx.beginPath();
    ctx.arc(FELT * 0.18, side * FELT * 0.2, FELT * 0.11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = FARVER.hoved;
    ctx.beginPath();
    ctx.arc(FELT * 0.22, side * FELT * 0.2, FELT * 0.05, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

// Nye retninger stilles i kø, så to hurtige tryk (fx op og så venstre) begge tæller
function styr(ny) {
  const sidste = koe.at(-1) ?? retning;
  if (ny === sidste) return;
  if (ny.x === -sidste.x && ny.y === -sidste.y) return; // slangen kan ikke vende om på stedet
  if (koe.length < 3) koe.push(ny);
}

document.addEventListener("keydown", (e) => {
  const knapTast = e.key === "Enter" || e.key === " ";
  if (knapTast && !beskedBoks.hidden) {
    e.preventDefault(); // ellers trykker browseren også på knappen
    if (!e.repeat) trykKnap(); // en tast, der holdes nede, skal ikke skifte frem og tilbage
    return;
  }
  if (e.key === " " || e.key === "p" || e.key === "P") {
    e.preventDefault();
    if (!e.repeat) pause();
    return;
  }
  const ny = RETNINGER[e.key];
  if (!ny) return;
  e.preventDefault(); // så siden ikke scroller
  if (timer) styr(ny);
});

// Telefon: swipe på banen for at styre, et kort tryk sætter på pause
const SWIPE = 24; // så langt skal fingeren flytte sig, før slangen drejer undervejs
const TRYK = 8; // flytter fingeren mindre end det, er det et tryk og ikke et swipe
let fingerStart = null;
let swipede = false;

canvas.addEventListener("touchstart", (e) => {
  fingerStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  swipede = false;
}, { passive: true });

canvas.addEventListener("touchmove", (e) => {
  if (!fingerStart || !timer) return;
  const t = e.touches[0];
  const dx = t.clientX - fingerStart.x;
  const dy = t.clientY - fingerStart.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE) return;
  styrMod(dx, dy);
  fingerStart = { x: t.clientX, y: t.clientY }; // så man kan swipe videre uden at løfte fingeren
  swipede = true;
}, { passive: true });

canvas.addEventListener("touchend", (e) => {
  // Ellers sender telefonen bagefter et klik, som rammer knappen i beskeden
  e.preventDefault();
  if (!fingerStart || swipede) {
    fingerStart = null;
    return;
  }
  const t = e.changedTouches[0];
  const dx = t.clientX - fingerStart.x;
  const dy = t.clientY - fingerStart.y;
  fingerStart = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < TRYK) pause();
  else if (timer) styrMod(dx, dy); // et kort swipe styrer også
}, { passive: false });

// Drej mod den retning, fingeren mest flyttede sig
function styrMod(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) styr(dx > 0 ? RETNINGER.ArrowRight : RETNINGER.ArrowLeft);
  else styr(dy > 0 ? RETNINGER.ArrowDown : RETNINGER.ArrowUp);
}

// Skifter man vindue eller fane, venter spillet
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
});
window.addEventListener("blur", pause);

knap.addEventListener("click", trykKnap);

// Start: vis banen, og vent på spilleren
visHighscore();
point = 0;
levelNr = 0;
klarLevel();
visBesked("Klar?", "Spis æblerne, og undgå kanten, murene og din egen hale.", "Start", koer);
