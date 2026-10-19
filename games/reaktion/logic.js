// Reglerne for Reaktion. Ren logik: ingen tegning, ingen DOM, ingen ure.
// Tiden (nu) og tilfældigheden (tilfaeldig) kommer udefra, så alt kan testes.
// Hver funktion returnerer en ny tilstand i stedet for at ændre den gamle.

const RUNDER = 5;
const MIN_VENT = 1200; // ms før det tidligst bliver grønt
const MAX_VENT = 3800; // ms før det senest bliver grønt
const PAUSE = 350; // ms hvor et nyt tryk ignoreres efter et skift, så ingen springer over ved et uheld

const VURDERINGER = [
  [180, "Er du en robot?"],
  [230, "Lynhurtig"],
  [280, "Skarp"],
  [350, "Helt fint"],
  [450, "Lidt søvnig"],
  [Infinity, "Vågn op!"],
];

function nytSpil() {
  return { fase: "titel", tider: [], forTidlige: 0, groenFra: null, skiftet: -Infinity };
}

function ventetid(tilfaeldig = Math.random) {
  return MIN_VENT + Math.round(tilfaeldig() * (MAX_VENT - MIN_VENT));
}

function startRunde(spil, nu, tilfaeldig = Math.random) {
  return { ...spil, fase: "vent", groenFra: nu + ventetid(tilfaeldig), skiftet: nu };
}

// Kaldes hver frame: skifter fra "vent" til "nu", når ventetiden er gået.
function opdater(spil, nu) {
  if (spil.fase === "vent" && nu >= spil.groenFra) return { ...spil, fase: "nu", skiftet: spil.groenFra };
  return spil;
}

function maaling(spil, nu) {
  const tid = Math.max(0, Math.round(nu - spil.groenFra));
  const tider = [...spil.tider, tid];
  return { ...spil, tider, fase: tider.length >= RUNDER ? "slut" : "resultat", skiftet: nu };
}

// Spilleren trykker (tast, klik eller finger).
function tryk(spil, nu, tilfaeldig = Math.random) {
  switch (spil.fase) {
    case "titel":
      return startRunde(spil, nu, tilfaeldig);
    case "vent":
      // Er tiden gået, før skærmen nåede at blive tegnet grøn, tæller det stadig.
      if (nu >= spil.groenFra) return maaling(spil, nu);
      return { ...spil, fase: "for-tidligt", forTidlige: spil.forTidlige + 1, groenFra: null, skiftet: nu };
    case "nu":
      return maaling(spil, nu);
    case "resultat":
    case "for-tidligt":
      if (nu - spil.skiftet < PAUSE) return spil;
      return startRunde(spil, nu, tilfaeldig);
    case "slut":
      if (nu - spil.skiftet < PAUSE * 2) return spil;
      return startRunde(nytSpil(), nu, tilfaeldig);
    default:
      return spil;
  }
}

function gennemsnit(tider) {
  if (tider.length === 0) return null;
  return Math.round(tider.reduce((a, b) => a + b, 0) / tider.length);
}

function bedste(tider) {
  return tider.length === 0 ? null : Math.min(...tider);
}

function vurdering(ms) {
  if (ms === null || ms === undefined) return "";
  return VURDERINGER.find(([graense]) => ms < graense)[1];
}

// Hvilken runde spilleren er i gang med (1 til RUNDER).
function runde(spil) {
  return Math.min(RUNDER, spil.tider.length + (spil.fase === "resultat" || spil.fase === "slut" ? 0 : 1));
}

const Reaktion = { RUNDER, MIN_VENT, MAX_VENT, PAUSE, nytSpil, ventetid, startRunde, opdater, tryk, gennemsnit, bedste, vurdering, runde };

// I Node (npm test) eksporteres reglerne. I browseren er Reaktion bare en global.
if (typeof module === "object" && module.exports) module.exports = Reaktion;
