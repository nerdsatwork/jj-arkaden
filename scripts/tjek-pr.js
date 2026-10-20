// npm run tjek-pr: det samme tjek, som GitHub kører på hver pull request.
//   node scripts/tjek-pr.js [base]     base er som standard origin/main
// Regler for et spil-PR:
//   1. PR'en ændrer kun filer i én mappe: games/<dit-spil>/
//   2. mappen er ny, eller PR'en kommer fra branchen indsend/<dit-spil> (en opdatering)
//   3. game.json er gyldig
//   4. spillets egne tests består (npm test -- <dit-spil>)
// Består et spil-PR, merger robotten det selv (.github/workflows/auto-merge.yml).
// Et PR uden spil (fx en rettelse til hallen) kører alle tjek og venter på en maintainer.
//
// På GitHub sætter workflowet HEAD_REF (PR'ens branch) og FRA_FORK ("true" for
// en PR fra en fork). Lokalt bruges den branch, du står på.

const fs = require("node:fs");
const { execFileSync, spawnSync } = require("node:child_process");
const { ROD, tjekSpil, spilIPr, maaOpdatere } = require("./arkaden.js");

const base = process.argv[2] || "origin/main";
const linjer = [];
const sig = (tekst) => {
  console.log(tekst);
  linjer.push(tekst);
};

function slut(kode) {
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Tjek af pull request\n\n${linjer.map((l) => `- ${l}`).join("\n")}\n`);
  }
  process.exit(kode);
}

function koer(...args) {
  return spawnSync(process.execPath, args, { cwd: ROD, stdio: "inherit" }).status === 0;
}

function git(...args) {
  return execFileSync("git", args, { cwd: ROD, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

// Findes spillet allerede på base (fx main)?
function findesPaaBase(slug) {
  return spawnSync("git", ["cat-file", "-e", `${base}:games/${slug}/game.json`], { cwd: ROD, stdio: "ignore" }).status === 0;
}

let filer;
try {
  filer = git("diff", "--name-only", "--no-renames", `${base}...HEAD`).split("\n").filter(Boolean);
} catch {
  sig(`Kunne ikke sammenligne med ${base}. Har du hentet den (git fetch)?`);
  slut(1);
}

if (filer.length === 0) {
  sig("Ingen ændringer at tjekke.");
  slut(0);
}

const { udenfor, slugs } = spilIPr(filer);

if (slugs.length === 0) {
  sig("PR'en ændrer ingen spil. Den behandles som en ændring af selve hallen: alle tjek køres, og en maintainer merger den.");
  const ok = koer("scripts/lint.js") && koer("scripts/test.js");
  sig(ok ? "✓ Alle tjek bestod." : "✗ Et tjek fejlede. Se loggen.");
  slut(ok ? 0 : 1);
}

let gren = process.env.HEAD_REF || "";
if (!gren) {
  try {
    gren = git("branch", "--show-current");
  } catch {
    gren = "";
  }
}
const fraFork = process.env.FRA_FORK === "true";

let fejl = 0;
let linkkort = false;
for (const f of udenfor) {
  fejl++;
  if (f.startsWith("games/manifest")) sig(`✗ ${f} laves af robotten. Fjern den fra din PR.`);
  else sig(`✗ ${f} ligger uden for dit spils mappe. Et spil-PR må kun ændre games/<dit-spil>/.`);
}

if (slugs.length > 1) {
  fejl++;
  sig(`✗ PR'en ændrer ${slugs.length} spil (${slugs.join(", ")}). Lav ét PR pr. spil.`);
}

for (const slug of slugs) {
  if (slug.startsWith("_")) {
    fejl++;
    sig(`✗ games/${slug} er skabelonen. Kopiér den til en ny mappe opkaldt efter dit spil, og ret i kopien.`);
    continue;
  }
  if (findesPaaBase(slug) && !maaOpdatere(slug, { gren, fraFork })) {
    fejl++;
    if (fraFork) sig(`✗ games/${slug} findes allerede i Arkaden. Giv dit spil sit eget mappenavn. Er det dit eget spil, du vil opdatere, så skriv det i PR'en, så kigger en maintainer på den.`);
    else sig(`✗ games/${slug} findes allerede i Arkaden. Giv dit spil sit eget mappenavn, eller opdatér det fra branchen indsend/${slug}.`);
    continue;
  }
  if (!fs.existsSync(`${ROD}/games/${slug}`)) {
    sig(`games/${slug} slettes i denne PR. Det kræver en vurdering fra en maintainer.`);
    continue;
  }
  const r = tjekSpil(slug);
  if (r.data && r.data.url !== undefined) linkkort = true;
  for (const f of r.fejl) {
    fejl++;
    sig(`✗ games/${slug}: ${f}`);
  }
  for (const a of r.advarsler) sig(`! games/${slug}: ${a}`);
  if (r.data && r.data.forfatter === "Dit navn") {
    fejl++;
    sig(`✗ games/${slug}: skriv dit eget navn i "forfatter", eller fjern feltet for at stå uden navn`);
  }
}

if (fejl === 0 && slugs.length === 1 && fs.existsSync(`${ROD}/games/${slugs[0]}`)) {
  sig(`Kører testene for games/${slugs[0]} ...`);
  if (!koer("scripts/test.js", slugs[0])) {
    fejl++;
    sig(`✗ Testene for games/${slugs[0]} fejlede.`);
  }
}

const klar = linkkort
  ? `✓ Klar: games/${slugs.join(", ")} er et linkkort. Jonas godkender links i hånden, så PR'en venter på ham.`
  : `✓ Klar: games/${slugs.join(", ")}. På GitHub merges PR'en nu af sig selv.`;
sig(fejl === 0 ? klar : `✗ ${fejl} problem(er). Ret dem, og push igen.`);
slut(fejl ? 1 : 0);
