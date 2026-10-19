// Tests for reglerne. Kør dem med: npm test -- <dit-spil>

const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("./logic.js");

const midt = () => 0.5;

test("et nyt spil starter på titelskærmen med 0 point", () => {
  const s = S.nytSpil();
  assert.equal(s.fase, "titel");
  assert.equal(s.point, 0);
});

test("et klik på titelskærmen starter spillet med et mål", () => {
  const s = S.klik(S.nytSpil(), 0, 0, midt);
  assert.equal(s.fase, "spil");
  assert.ok(s.maal);
});

test("et klik midt i målet giver point og et nyt mål", () => {
  const s = S.start(midt);
  const efter = S.klik(s, s.maal.x, s.maal.y, () => 0.1);
  assert.equal(efter.point, 1);
  assert.notEqual(efter.maal.x, s.maal.x);
});

test("et klik ved siden af giver ingen point", () => {
  const s = S.start(midt);
  assert.equal(S.klik(s, s.maal.x + s.maal.radius + 1, s.maal.y, midt).point, 0);
});

test("målene bliver mindre for hvert level", () => {
  for (let i = 1; i < S.LEVELS.length; i++) {
    assert.ok(S.LEVELS[i].radius < S.LEVELS[i - 1].radius, `${S.LEVELS[i].navn} skal være sværere end ${S.LEVELS[i - 1].navn}`);
  }
  assert.equal(S.level(0), 0);
  assert.equal(S.level(S.RAMT_PR_LEVEL), 1);
  assert.equal(S.level(10000), S.LEVELS.length - 1);
});

test("mål holder sig inde på skærmen", () => {
  for (const r of [0, 0.999999]) {
    const m = S.nytMaal(S.LEVELS.length - 1, () => r);
    assert.ok(m.x - m.radius >= 0 && m.x + m.radius <= S.BREDDE);
    assert.ok(m.y + m.radius <= S.HOEJDE);
  }
});

test("spillet slutter, når tiden er gået", () => {
  const s = S.opdater(S.start(midt), S.SPILLETID + 1, midt);
  assert.equal(s.fase, "slut");
});
