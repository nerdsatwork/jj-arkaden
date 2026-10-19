// npm run lint: et hurtigt tjek, der er godt at køre efter hver ændring (fx fra
// et hook). Finder syntaksfejl i alle .js-filer og fejl i alle game.json.
// Exit-kode 1, hvis noget er galt, så et hook kan sige det videre til Claude.

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { ROD, spilmapper, tjekSpil } = require("./arkaden.js");

const MAPPER = ["arkade", "games", "scripts", "tests"];
let fejl = 0;
let advarsler = 0;
let antal = 0;

function jsFiler(mappe) {
  const ud = [];
  if (!fs.existsSync(mappe)) return ud;
  for (const d of fs.readdirSync(mappe, { withFileTypes: true })) {
    if (d.name === "node_modules" || d.name.startsWith(".")) continue;
    const fuld = path.join(mappe, d.name);
    if (d.isDirectory()) ud.push(...jsFiler(fuld));
    else if (d.name.endsWith(".js")) ud.push(fuld);
  }
  return ud;
}

for (const fil of MAPPER.flatMap((m) => jsFiler(path.join(ROD, m)))) {
  antal++;
  const kilde = fs.readFileSync(fil, "utf8");
  try {
    // Pakkes ind som en funktion, så både browser-scripts og Node-filer kan tjekkes.
    vm.compileFunction(kilde, ["require", "module", "exports", "__dirname", "__filename"], { filename: fil });
  } catch (e) {
    fejl++;
    const linje = (e.stack || "").split("\n")[0];
    console.log(`✗ ${path.relative(ROD, fil)}: ${e.message}${linje.includes(":") ? `  (${linje})` : ""}`);
  }
}

for (const slug of spilmapper({ medSkabeloner: true })) {
  const r = tjekSpil(slug);
  for (const f of r.fejl) {
    fejl++;
    console.log(`✗ games/${slug}: ${f}`);
  }
  for (const a of r.advarsler) {
    advarsler++;
    console.log(`! games/${slug}: ${a}`);
  }
}

if (fejl === 0) console.log(`✓ ${antal} filer og ${spilmapper().length} spil uden fejl${advarsler ? ` (${advarsler} advarsler)` : ""}.`);
process.exit(fejl ? 1 : 0);
