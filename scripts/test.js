// npm test kører alle tests med Nodes indbyggede testløber (node:test).
// npm test -- reaktion        kører kun testene for games/reaktion
// npm test -- games/reaktion  virker også
// Ingen pakker skal installeres. Kræver Node 22 eller nyere.

const path = require("node:path");
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
const { ROD, GAMES, testfiler } = require("./arkaden.js");

const [major] = process.versions.node.split(".").map(Number);
if (major < 22) {
  console.error(`Arkaden skal bruge Node 22 eller nyere. Du har ${process.version}.`);
  process.exit(1);
}

const valgte = process.argv
  .slice(2)
  .map((a) => a.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^games\//, "").replace(/\/+$/, ""))
  .filter(Boolean);

let filer;
const env = { ...process.env };
if (valgte.length === 0) {
  filer = [...testfiler(GAMES), ...testfiler(path.join(ROD, "tests"))];
} else {
  filer = [];
  for (const slug of valgte) {
    if (!fs.existsSync(path.join(GAMES, slug))) {
      console.error(`games/${slug} findes ikke.`);
      process.exit(1);
    }
    const egne = testfiler(path.join(GAMES, slug));
    if (egne.length === 0) console.log(`games/${slug} har ingen tests endnu (*.test.js). Kun game.json tjekkes.`);
    filer.push(...egne);
  }
  // Fælles tjek af game.json, men kun for de valgte spil.
  env.ARKADEN_SPIL = valgte.join(",");
  filer.push(...testfiler(path.join(ROD, "tests")));
}

const r = spawnSync(process.execPath, ["--test", ...filer.map((f) => path.relative(ROD, f))], { cwd: ROD, env, stdio: "inherit" });
process.exit(r.status === null ? 1 : r.status);
