// GOSH Desktop: reglerne. Ren logik uden DOM, så npm test kan teste dem.

// Dagens kode er datoen som DDMMÅÅÅÅ, fx 26112026.
function dagensKode(dato = new Date()) {
  const dd = String(dato.getDate()).padStart(2, "0");
  const mm = String(dato.getMonth() + 1).padStart(2, "0");
  return dd + mm + dato.getFullYear();
}

// Punktum, bindestreg og mellemrum er ligegyldige: "26-11-2026" er det samme som "26112026".
function tjekKode(indtastet, dato = new Date()) {
  return String(indtastet).replace(/[^0-9]/g, "") === dagensKode(dato);
}

const LOEFTER = ["Jeg låser min pc", "Win + L er min ven", "Lås pc, hent kaffe"];

function normLoefte(tekst) {
  return String(tekst).toLowerCase().replace(/\s+/g, " ").replace(/[.!,]/g, "").trim();
}

// "faerdig" når teksten passer, "godt" mens man er på vej, "fejl" ved en slåfejl.
function tjekLoefte(indtastet, loefte) {
  const v = normLoefte(indtastet);
  const p = normLoefte(loefte);
  if (v === p) return "faerdig";
  if (p.startsWith(v)) return "godt";
  return "fejl";
}

const SPOERGSMAAL = [
  { q: "Du går fra din pc for at hente kaffe. Hvad gør du?", a: ["Lader den stå åben, det tager kun 2 minutter", "Trykker Windows + L", "Lægger en læbestift på tastaturet som advarsel"], c: 1 },
  { q: "Hvilken adgangskode er mest holdbar?", a: ["Gosh2026", "123456", "En lang sætning som Rød-Læbestift-Danser-Tango!"], c: 2 },
  { q: "Du får en mail om, at din løn er spærret, og du skal klikke på et link. Hvad gør du?", a: ["Klikker hurtigt, det haster", "Sender den videre til alle kolleger", "Klikker ikke og kontakter IT"], c: 2 },
  { q: "Du finder et USB-stik i kantinen. Hvad gør du?", a: ["Sætter det i for at se, hvem det tilhører", "Afleverer det til IT uden at sætte det i", "Tager det med hjem"], c: 1 },
  { q: "Hvem må kende din adgangskode?", a: ["Ingen, heller ikke IT", "Kun din bedste kollega", "Alle med et pænt smil"], c: 0 },
  { q: "Hvad er MFA (to-faktor-godkendelse)?", a: ["Et ekstra tjek, fx en kode på telefonen", "Mascara, Foundation og Applikator", "To adgangskoder på samme post-it"], c: 0 },
  { q: "Hvor er det smartest at gemme dine adgangskoder?", a: ["På en post-it under tastaturet", "I en godkendt adgangskode-manager", "I en fil der hedder Koder.docx"], c: 1 },
  { q: "Nogen ringer, siger de er fra Microsoft og vil ind på din pc. Hvad gør du?", a: ["Lægger på og kontakter IT", "Giver dem adgang, de lyder søde", "Sender dem en vareprøve"], c: 0 },
];

function bland(liste, tilfaeldig = Math.random) {
  const a = liste.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(tilfaeldig() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const OPGAVER = ["quiz", "catch", "pledge"];
const FANG_ANTAL = 3;

function nytSpil() {
  return { klaret: { quiz: false, catch: false, pledge: false }, laastOp: false };
}

function klar(spil, opgave) {
  if (!OPGAVER.includes(opgave)) return spil;
  const klaret = { ...spil.klaret, [opgave]: true };
  return { klaret, laastOp: OPGAVER.every((o) => klaret[o]) };
}

function antalKlaret(spil) {
  return OPGAVER.filter((o) => spil.klaret[o]).length;
}

const GoshDesktop = { dagensKode, tjekKode, LOEFTER, normLoefte, tjekLoefte, SPOERGSMAAL, bland, OPGAVER, FANG_ANTAL, nytSpil, klar, antalKlaret };

if (typeof module === "object" && module.exports) module.exports = GoshDesktop;
