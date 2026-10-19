// Reglerne for et spil-PR: hvad tjek-pr.js godkender, og hvad robotten merger selv.

const test = require("node:test");
const assert = require("node:assert/strict");
const { spilIPr, maaOpdatere } = require("../scripts/arkaden.js");
const { vurder } = require("../scripts/auto-merge.js");

const REPO = "nerdsatwork/jj-arkaden";
const pr = (gren, ekstra = {}) => ({ draft: false, base: { ref: "main" }, head: { ref: gren, repo: { full_name: REPO } }, ...ekstra });
const fil = (filename, status = "added") => ({ filename, status });

test("et spil-PR rører kun én mappe i games/", () => {
  assert.deepEqual(spilIPr(["games/stjerneregn/game.json", "games/stjerneregn/logic.js"]), { udenfor: [], slugs: ["stjerneregn"] });
  assert.deepEqual(spilIPr(["games/manifest.js"]).udenfor, ["games/manifest.js"]);
  assert.deepEqual(spilIPr(["README.md", "games/a/x.js", "games/b/y.js"]), { udenfor: ["README.md"], slugs: ["a", "b"] });
});

test("et eksisterende spil må kun opdateres fra indsend/<slug> i repoet selv", () => {
  assert.equal(maaOpdatere("reaktion", { gren: "indsend/reaktion", fraFork: false }), true);
  assert.equal(maaOpdatere("reaktion", { gren: "indsend/reaktion", fraFork: true }), false);
  assert.equal(maaOpdatere("reaktion", { gren: "indsend/andet", fraFork: false }), false);
  assert.equal(maaOpdatere("reaktion", { gren: "main", fraFork: false }), false);
});

test("robotten merger et nyt spil", () => {
  const v = vurder({ pr: pr("indsend/stjerneregn"), filer: [fil("games/stjerneregn/game.json"), fil("games/stjerneregn/index.html")], findesPaaMain: false, repo: REPO });
  assert.equal(v.flet, true);
  assert.equal(v.slug, "stjerneregn");
});

test("robotten merger aldrig et spil fra en fork, det godkender en maintainer", () => {
  const fraFork = pr("indsend/ny", { head: { ref: "indsend/ny", repo: { full_name: "nogen/jj-arkaden" } } });
  assert.equal(vurder({ pr: fraFork, filer: [fil("games/ny/game.json")], findesPaaMain: false, repo: REPO }).flet, false);
  // En branch i repoet, der ikke er indsend/<slug>, merges heller ikke af sig selv.
  assert.equal(vurder({ pr: pr("spil"), filer: [fil("games/ny/game.json")], findesPaaMain: false, repo: REPO }).flet, false);
});

test("robotten merger en opdatering fra indsend/<slug>, men ikke fra en anden branch", () => {
  const filer = [fil("games/reaktion/logic.js", "modified")];
  assert.equal(vurder({ pr: pr("indsend/reaktion"), filer, findesPaaMain: true, repo: REPO }).flet, true);
  assert.equal(vurder({ pr: pr("indsend/mit-andet"), filer, findesPaaMain: true, repo: REPO }).flet, false);
});

test("robotten merger aldrig noget uden for games/<slug>/", () => {
  const filer = [fil("games/ny/game.json"), fil("scripts/tjek-pr.js", "modified")];
  assert.equal(vurder({ pr: pr("indsend/ny"), filer, findesPaaMain: false, repo: REPO }).flet, false);
  assert.equal(vurder({ pr: pr("rettelse"), filer: [fil("arkade/hal.css", "modified")], findesPaaMain: false, repo: REPO }).flet, false);
  assert.equal(vurder({ pr: pr("indsend/ny"), filer: [fil("games/ny/game.json"), fil("games/manifest.js", "modified")], findesPaaMain: false, repo: REPO }).flet, false);
});

test("en flytning ud af games/ tæller som en ændring udenfor", () => {
  const filer = [{ filename: "games/ny/spil.js", status: "renamed", previous_filename: "arkade/arkade.js" }];
  assert.equal(vurder({ pr: pr("indsend/ny"), filer, findesPaaMain: false, repo: REPO }).flet, false);
});

test("robotten merger ikke skabelonen, flere spil, en sletning eller en kladde", () => {
  assert.equal(vurder({ pr: pr("x"), filer: [fil("games/_skabelon/logic.js", "modified")], findesPaaMain: false, repo: REPO }).flet, false);
  assert.equal(vurder({ pr: pr("x"), filer: [fil("games/a/game.json"), fil("games/b/game.json")], findesPaaMain: false, repo: REPO }).flet, false);
  assert.equal(vurder({ pr: pr("indsend/reaktion"), filer: [fil("games/reaktion/game.json", "removed")], findesPaaMain: true, repo: REPO }).flet, false);
  assert.equal(vurder({ pr: pr("indsend/ny", { draft: true }), filer: [fil("games/ny/game.json")], findesPaaMain: false, repo: REPO }).flet, false);
});
