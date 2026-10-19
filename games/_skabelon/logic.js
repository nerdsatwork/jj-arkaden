// Reglerne for dit spil. Ren logik: ingen tegning og ingen DOM, så npm test
// kan teste dem. Tilfældighed kommer udefra (tilfaeldig), så testene kan styre den.

const BREDDE = 800;
const HOEJDE = 500;
const SPILLETID = 20; // sekunder
const RAMT_PR_LEVEL = 5; // så mange mål, før det bliver sværere

// Ét objekt pr. level. Et nyt level er bare en ny linje her.
const LEVELS = [
  { navn: "Level 1", radius: 46, levetid: 1.8, point: 1 },
  { navn: "Level 2", radius: 36, levetid: 1.4, point: 2 },
  { navn: "Level 3", radius: 28, levetid: 1.1, point: 3 },
];

function nytSpil() {
  return { fase: "titel", point: 0, ramt: 0, tidTilbage: SPILLETID, maal: null };
}

function level(ramt) {
  return Math.min(LEVELS.length - 1, Math.floor(ramt / RAMT_PR_LEVEL));
}

function nytMaal(lvl, tilfaeldig = Math.random) {
  const { radius, levetid } = LEVELS[lvl];
  const top = 70; // plads til point og tid øverst
  return {
    x: radius + tilfaeldig() * (BREDDE - 2 * radius),
    y: top + radius + tilfaeldig() * (HOEJDE - top - 2 * radius),
    radius,
    tilbage: levetid,
  };
}

function start(tilfaeldig = Math.random) {
  return { ...nytSpil(), fase: "spil", maal: nytMaal(0, tilfaeldig) };
}

function ramtMaal(maal, x, y) {
  if (!maal) return false;
  const dx = x - maal.x;
  const dy = y - maal.y;
  return dx * dx + dy * dy <= maal.radius * maal.radius;
}

// Kaldes hver frame med dt i sekunder.
function opdater(spil, dt, tilfaeldig = Math.random) {
  if (spil.fase !== "spil") return spil;
  const tidTilbage = Math.max(0, spil.tidTilbage - dt);
  if (tidTilbage === 0) return { ...spil, tidTilbage, fase: "slut", maal: null };
  const tilbage = spil.maal.tilbage - dt;
  const maal = tilbage <= 0 ? nytMaal(level(spil.ramt), tilfaeldig) : { ...spil.maal, tilbage };
  return { ...spil, tidTilbage, maal };
}

// Spilleren klikker på (x, y) i spillets koordinater.
function klik(spil, x, y, tilfaeldig = Math.random) {
  if (spil.fase === "titel" || spil.fase === "slut") return start(tilfaeldig);
  if (!ramtMaal(spil.maal, x, y)) return spil;
  const ramt = spil.ramt + 1;
  const point = spil.point + LEVELS[level(spil.ramt)].point;
  return { ...spil, ramt, point, maal: nytMaal(level(ramt), tilfaeldig) };
}

const Skabelon = { BREDDE, HOEJDE, SPILLETID, RAMT_PR_LEVEL, LEVELS, nytSpil, level, nytMaal, start, ramtMaal, opdater, klik };

// I Node (npm test) eksporteres reglerne. I browseren er Skabelon bare en global.
if (typeof module === "object" && module.exports) module.exports = Skabelon;
