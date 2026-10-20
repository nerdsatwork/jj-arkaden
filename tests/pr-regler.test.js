// Reglerne for et spil-PR: hvad tjek-pr.js godkender, og hvad robotten merger selv.

const test = require("node:test");
const assert = require("node:assert/strict");
const { spilIPr, maaOpdatere, linkFejl } = require("../scripts/arkaden.js");
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

test("robotten merger aldrig et linkkort, heller ikke fra Arkaden-værktøjet", () => {
  const filer = [fil("games/stort-projekt/game.json"), fil("games/stort-projekt/cover.png")];
  assert.equal(vurder({ pr: pr("indsend/stort-projekt"), filer, findesPaaMain: false, repo: REPO, erLink: true }).flet, false);
  // Kontrol: samme PR uden link merges.
  assert.equal(vurder({ pr: pr("indsend/stort-projekt"), filer, findesPaaMain: false, repo: REPO }).flet, true);
});

test("et linkkort skal pege på en offentlig https-adresse", () => {
  assert.equal(linkFejl("https://mit-projekt.vercel.app"), null);
  assert.equal(linkFejl("https://example.com/sti?x=1"), null);
  assert.match(linkFejl("http://mit-projekt.vercel.app"), /https/);
  assert.match(linkFejl("javascript:alert(1)"), /https/);
  assert.match(linkFejl("https://bruger:kode@example.com"), /adgangskode/);
  assert.match(linkFejl("https://localhost"), /offentlig/);
  assert.match(linkFejl("ikke en adresse"), /gyldig/);
  assert.match(linkFejl("https://example.com/" + "a".repeat(200)), /200 tegn/);
});

test("tjekket godkender et linkkort med cover og afviser et uden", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const os = require("node:os");
  const { tjekSpil } = require("../scripts/arkaden.js");
  // En midlertidig games-mappe, så testen aldrig rører de rigtige spil.
  const games = fs.mkdtempSync(path.join(os.tmpdir(), "arkaden-"));
  const slug = "stort-projekt";
  const mappe = path.join(games, slug);
  fs.mkdirSync(mappe);
  try {
    const skriv = (data) => fs.writeFileSync(path.join(mappe, "game.json"), JSON.stringify(data));
    fs.writeFileSync(path.join(mappe, "cover.svg"), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"/>');
    skriv({ titel: "Stort projekt", beskrivelse: "Kører på Vercel", cover: "cover.svg", url: "https://stort-projekt.vercel.app" });
    assert.deepEqual(tjekSpil(slug, games).fejl, []);
    skriv({ titel: "Stort projekt", beskrivelse: "Kører på Vercel", url: "https://stort-projekt.vercel.app" });
    assert.match(tjekSpil(slug, games).fejl.join(" "), /cover/);
    skriv({ titel: "Stort projekt", beskrivelse: "Kører på Vercel", cover: "cover.svg", url: "https://x.vercel.app", start: "index.html" });
    assert.match(tjekSpil(slug, games).fejl.join(" "), /ikke begge/);
    // Kontrol: uden url kræves en startside igen.
    skriv({ titel: "Stort projekt", beskrivelse: "Kører på Vercel", cover: "cover.svg" });
    assert.match(tjekSpil(slug, games).fejl.join(" "), /index\.html/);
  } finally {
    fs.rmSync(games, { recursive: true, force: true });
  }
});
