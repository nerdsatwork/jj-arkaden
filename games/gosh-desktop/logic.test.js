// Tests for reglerne. Kør dem med: npm test -- gosh-desktop

const test = require("node:test");
const assert = require("node:assert/strict");
const G = require("./logic.js");

test("dagens kode er datoen som DDMMÅÅÅÅ", () => {
  assert.equal(G.dagensKode(new Date(2026, 10, 26)), "26112026");
  assert.equal(G.dagensKode(new Date(2027, 0, 5)), "05012027");
});

test("koden må skrives med punktum, bindestreg og mellemrum", () => {
  const d = new Date(2026, 10, 26);
  assert.equal(G.tjekKode("26112026", d), true);
  assert.equal(G.tjekKode("26-11-2026", d), true);
  assert.equal(G.tjekKode("26.11. 2026", d), true);
  assert.equal(G.tjekKode("25112026", d), false);
  assert.equal(G.tjekKode("", d), false);
});

test("løftet tjekker uden store og små bogstaver", () => {
  assert.equal(G.tjekLoefte("jeg LÅSER min pc.", "Jeg låser min pc"), "faerdig");
  assert.equal(G.tjekLoefte("Jeg lås", "Jeg låser min pc"), "godt");
  assert.equal(G.tjekLoefte("Jeg glemmer", "Jeg låser min pc"), "fejl");
});

test("spillet låses først op, når alle tre opgaver er klaret", () => {
  let s = G.nytSpil();
  s = G.klar(s, "quiz");
  s = G.klar(s, "catch");
  assert.equal(G.antalKlaret(s), 2);
  assert.equal(s.laastOp, false);
  s = G.klar(s, "pledge");
  assert.equal(s.laastOp, true);
  assert.equal(G.antalKlaret(G.klar(G.nytSpil(), "ukendt")), 0);
});

test("alle quizspørgsmål har ét gyldigt rigtigt svar", () => {
  for (const q of G.SPOERGSMAAL) {
    assert.ok(q.a.length >= 2);
    assert.ok(q.c >= 0 && q.c < q.a.length);
  }
});

test("bland beholder alle elementer", () => {
  const ud = G.bland([1, 2, 3, 4], () => 0.3);
  assert.deepEqual(ud.slice().sort(), [1, 2, 3, 4]);
});
