// Tjekker én spilmappe mod Arkadens regler, uden at kræve resten af repoet.
// Samme regler som scripts/arkaden.js i Arkaden og som robotten på GitHub.
//
//   node tjek-spil.mjs <spillets mappe, fx games/stjerneregn>            tjek, exit 1 ved fejl
//   node tjek-spil.mjs <spillets mappe, fx games/stjerneregn> --pr-tekst  skriv PR-teksten ud
//
// Ingen pakker. Node 22 eller nyere.

import fs from "node:fs";
import path from "node:path";

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
// Et frit navn, som det skal stå i hallen. Ingen e-mail eller link.
const NAVN = /^[^@<>\n]{1,40}$/;
const BILLEDE = /\.(png|jpe?g|webp|gif|svg)$/i;
const DATO = /^\d{4}-\d{2}-\d{2}$/;
const TYPER = ["action", "klassiker", "rolig"];
const FELTER = ["titel", "forfatter", "beskrivelse", "type", "tags", "cover", "start", "styring", "dato"];
const MAKS_COVER = 1024 * 1024;
const MAKS_MAPPE = 5 * 1024 * 1024;

const [mappeArg, ...flag] = process.argv.slice(2);
if (!mappeArg) {
  console.error("Brug: node tjek-spil.mjs <spillets mappe, fx games/stjerneregn> [--pr-tekst]");
  process.exit(2);
}
const mappe = path.resolve(mappeArg);
const slug = path.basename(mappe);
const fejl = [];
const advarsler = [];

function lokalFil(navn) {
  if (typeof navn !== "string" || !navn || navn.includes("..") || navn.startsWith("/") || navn.includes("\\") || /^[a-z]+:/i.test(navn)) return null;
  return path.join(mappe, navn);
}

function stoerrelse(m) {
  let sum = 0;
  for (const d of fs.readdirSync(m, { withFileTypes: true })) {
    const f = path.join(m, d.name);
    sum += d.isDirectory() ? stoerrelse(f) : d.isFile() ? fs.statSync(f).size : 0;
  }
  return sum;
}

let data = null;
if (!fs.existsSync(mappe) || !fs.statSync(mappe).isDirectory()) fejl.push(`${mappeArg} er ikke en mappe`);
else {
  if (path.basename(path.dirname(mappe)) !== "games") advarsler.push("Mappen ligger ikke i en mappe, der hedder games/");
  if (slug.startsWith("_")) fejl.push("Det er skabelonen. Kopiér den til en ny mappe opkaldt efter dit spil, og udgiv kopien");
  else if (!SLUG.test(slug)) fejl.push(`Mappenavnet "${slug}" skal være små bogstaver, tal og bindestreger`);

  const jsonSti = path.join(mappe, "game.json");
  if (!fs.existsSync(jsonSti)) fejl.push("game.json mangler");
  else {
    try {
      data = JSON.parse(fs.readFileSync(jsonSti, "utf8"));
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("skal være et objekt");
    } catch (e) {
      fejl.push(`game.json er ikke gyldig JSON: ${e.message}`);
      data = null;
    }
  }

  if (data) {
    const tekst = (felt, maks, kraevet) => {
      const v = data[felt];
      if (v === undefined) return kraevet && fejl.push(`"${felt}" mangler i game.json`);
      if (typeof v !== "string" || !v.trim()) fejl.push(`"${felt}" skal være en tekst`);
      else if (v.length > maks) fejl.push(`"${felt}" er ${v.length} tegn. Højst ${maks}`);
    };
    tekst("titel", 40, true);
    tekst("beskrivelse", 140, true);
    tekst("styring", 80, false);
    // Navnet er frivilligt: uden "forfatter" står spillet uden navn i hallen.
    if (data.forfatter !== undefined) {
      if (typeof data.forfatter !== "string" || !data.forfatter.trim() || !NAVN.test(data.forfatter) || /https?:|www\./i.test(data.forfatter)) fejl.push(`"forfatter" er dit navn, som det skal stå i hallen, fx "Lasse". Højst 40 tegn, ingen e-mail eller link`);
      else if (data.forfatter === "Dit navn") fejl.push(`Skriv dit eget navn i "forfatter", eller fjern feltet for at stå uden navn`);
    }
    if (data.type !== undefined && !TYPER.includes(data.type)) fejl.push(`"type" skal være en af: ${TYPER.join(", ")}`);
    if (data.tags !== undefined) {
      if (!Array.isArray(data.tags)) fejl.push(`"tags" skal være en liste`);
      else {
        if (data.tags.length > 5) fejl.push("Højst 5 tags");
        for (const t of data.tags) if (typeof t !== "string" || !t.trim() || t.length > 20) fejl.push(`Tagget ${JSON.stringify(t)} skal være 1 til 20 tegn`);
      }
    }
    if (data.dato !== undefined && (typeof data.dato !== "string" || !DATO.test(data.dato))) fejl.push(`"dato" skal se sådan ud: "2026-10-19"`);
    if (data.cover !== undefined) {
      const f = lokalFil(data.cover);
      if (!f || !BILLEDE.test(data.cover)) fejl.push(`"cover" skal være et billede (.png, .jpg, .webp, .gif, .svg) i spillets mappe`);
      else if (!fs.existsSync(f)) fejl.push(`Coveret ${data.cover} findes ikke`);
      else if (fs.statSync(f).size > MAKS_COVER) fejl.push("Coveret er større end 1 MB");
    }
    const start = data.start ?? "index.html";
    const sf = lokalFil(start);
    if (!sf || !/\.html?$/i.test(start)) fejl.push(`"start" skal være en .html-fil i mappen`);
    else if (!fs.existsSync(sf)) fejl.push(`${start} findes ikke`);
    else {
      const html = fs.readFileSync(sf, "utf8");
      if (/<script[^>]+src=["']https?:/i.test(html)) advarsler.push(`${start} henter scripts fra internettet`);
    }
    for (const k of Object.keys(data)) if (!FELTER.includes(k)) advarsler.push(`Ukendt felt "${k}" i game.json`);
  }
  if (fs.existsSync(mappe) && stoerrelse(mappe) > MAKS_MAPPE) fejl.push("Mappen fylder mere end 5 MB");
  const tests = fs.readdirSync(mappe).filter((f) => f.endsWith(".test.js"));
  if (tests.length === 0) advarsler.push("Ingen tests (*.test.js) i mappen");
}

if (flag.includes("--pr-tekst")) {
  if (fejl.length) {
    console.error("Ret fejlene først:\n  " + fejl.join("\n  "));
    process.exit(1);
  }
  console.log(`## Mit spil

- **Mappe:** games/${slug}
- **Titel:** ${data.titel}
- **Kort om spillet:** ${data.beskrivelse}

## Tjekliste

- [x] PR'en ændrer kun filer i \`games/${slug}/\`
- [x] \`game.json\` har titel og en kort beskrivelse${data.forfatter ? ", og mit navn i `forfatter`" : ", uden navn"}
- [x] \`npm test -- ${slug}\` består
- [ ] Jeg har spillet det i spilhallen (\`npm start\`)
- [x] Ingen filer hentes fra internettet, og intet personligt i koden

Indsendt med skillen arkaden-udgiv.`);
  process.exit(0);
}

for (const f of fejl) console.log(`✗ ${f}`);
for (const a of advarsler) console.log(`! ${a}`);
if (!fejl.length) console.log(`✓ games/${slug} følger Arkadens regler.`);
process.exit(fejl.length ? 1 : 0);
