// Tests for reglerne i Reaktion. Kør dem med: npm test -- reaktion

const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("./logic.js");

const midt = () => 0.5; // fast "tilfældighed", så testene altid giver det samme
const vent = R.MIN_VENT + Math.round(0.5 * (R.MAX_VENT - R.MIN_VENT));

// Spiller én hel runde: start ved t, tryk efter ms.
function spilRunde(spil, t, ms) {
  let s = R.tryk(spil, t, midt);
  s = R.opdater(s, s.groenFra);
  return R.tryk(s, s.groenFra + ms, midt);
}

test("et nyt spil starter på titelskærmen uden tider", () => {
  const s = R.nytSpil();
  assert.equal(s.fase, "titel");
  assert.deepEqual(s.tider, []);
  assert.equal(s.forTidlige, 0);
});

test("ventetiden ligger altid mellem MIN_VENT og MAX_VENT", () => {
  assert.equal(R.ventetid(() => 0), R.MIN_VENT);
  assert.equal(R.ventetid(() => 0.999999), R.MAX_VENT);
  for (let i = 0; i < 200; i++) {
    const v = R.ventetid();
    assert.ok(v >= R.MIN_VENT && v <= R.MAX_VENT, `${v} er uden for grænserne`);
  }
});

test("et tryk på titelskærmen starter første runde", () => {
  const s = R.tryk(R.nytSpil(), 1000, midt);
  assert.equal(s.fase, "vent");
  assert.equal(s.groenFra, 1000 + vent);
  assert.equal(R.runde(s), 1);
});

test("skærmen bliver grøn, først når ventetiden er gået", () => {
  const s = R.tryk(R.nytSpil(), 0, midt);
  assert.equal(R.opdater(s, vent - 1).fase, "vent");
  assert.equal(R.opdater(s, vent).fase, "nu");
});

test("reaktionstiden måles fra det øjeblik, skærmen blev grøn", () => {
  const s = spilRunde(R.nytSpil(), 0, 243);
  assert.equal(s.fase, "resultat");
  assert.deepEqual(s.tider, [243]);
});

test("et tryk lige efter grønt tæller, selv før skærmen er tegnet", () => {
  const s = R.tryk(R.nytSpil(), 0, midt);
  const efter = R.tryk(s, s.groenFra + 120, midt); // opdater er ikke kaldt endnu
  assert.equal(efter.fase, "resultat");
  assert.deepEqual(efter.tider, [120]);
});

test("et tryk før grønt er for tidligt og giver ingen tid", () => {
  const s = R.tryk(R.nytSpil(), 0, midt);
  const tidligt = R.tryk(s, 500, midt);
  assert.equal(tidligt.fase, "for-tidligt");
  assert.equal(tidligt.forTidlige, 1);
  assert.deepEqual(tidligt.tider, []);
});

test("efter for tidligt tages samme runde om", () => {
  let s = R.tryk(R.tryk(R.nytSpil(), 0, midt), 500, midt);
  s = R.tryk(s, 500 + R.PAUSE, midt);
  assert.equal(s.fase, "vent");
  assert.equal(R.runde(s), 1);
});

test("et hurtigt ekstra tryk springer ikke resultatet over", () => {
  const s = spilRunde(R.nytSpil(), 0, 250);
  const t = s.skiftet;
  assert.equal(R.tryk(s, t + 50, midt), s);
  assert.equal(R.tryk(s, t + R.PAUSE, midt).fase, "vent");
});

test(`efter ${R.RUNDER} runder er spillet slut`, () => {
  let s = R.nytSpil();
  let t = 0;
  const tider = [300, 250, 280, 210, 260];
  for (const ms of tider) {
    s = spilRunde(s, t, ms);
    t = s.skiftet + R.PAUSE * 2;
  }
  assert.equal(s.fase, "slut");
  assert.deepEqual(s.tider, tider);
  assert.equal(R.runde(s), R.RUNDER);
});

test("et tryk på slutskærmen starter et helt nyt spil", () => {
  let s = R.nytSpil();
  let t = 0;
  for (let i = 0; i < R.RUNDER; i++) {
    s = spilRunde(s, t, 200);
    t = s.skiftet + R.PAUSE * 2;
  }
  const nyt = R.tryk(s, t, midt);
  assert.equal(nyt.fase, "vent");
  assert.deepEqual(nyt.tider, []);
  assert.equal(nyt.forTidlige, 0);
});

test("gennemsnit og bedste tid", () => {
  assert.equal(R.gennemsnit([]), null);
  assert.equal(R.bedste([]), null);
  assert.equal(R.gennemsnit([200, 300, 251]), 250);
  assert.equal(R.bedste([310, 199, 250]), 199);
});

test("vurderingen passer til tiden", () => {
  assert.equal(R.vurdering(150), "Er du en robot?");
  assert.equal(R.vurdering(229), "Lynhurtig");
  assert.equal(R.vurdering(230), "Skarp");
  assert.equal(R.vurdering(1000), "Vågn op!");
  assert.equal(R.vurdering(null), "");
});
