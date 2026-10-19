// Fælles Node-værktøj for Arkaden: læser og tjekker games/<slug>/game.json og
// bygger manifestet, som hallen viser. Bruges af npm run games, npm test,
// npm run lint, npm start og GitHub Actions. Kører kun i Node, aldrig i browseren.

const fs = require("node:fs");
const path = require("node:path");

const ROD = path.join(__dirname, "..");
const GAMES = path.join(ROD, "games");

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
// Et frit navn, som det skal stå i hallen. Ingen e-mail eller link.
const NAVN = /^[^@<>\n]{1,40}$/;
const BILLEDE = /\.(png|jpe?g|webp|gif|svg)$/i;
const DATO = /^\d{4}-\d{2}-\d{2}$/;
const FELTER = ["titel", "forfatter", "beskrivelse", "type", "tags", "cover", "start", "styring", "dato"];
const TYPER = ["action", "klassiker", "rolig"];
const MAKS_COVER = 1024 * 1024;
const MAKS_MAPPE = 5 * 1024 * 1024;

// Alle mapper i games/. Mapper, der starter med _ (som _skabelon), er ikke spil i hallen.
function spilmapper({ medSkabeloner = false } = {}) {
  if (!fs.existsSync(GAMES)) return [];
  return fs
    .readdirSync(GAMES, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .filter((d) => medSkabeloner || !d.name.startsWith("_"))
    .map((d) => d.name)
    .sort();
}

function mappestoerrelse(mappe) {
  let sum = 0;
  for (const d of fs.readdirSync(mappe, { withFileTypes: true })) {
    const fuld = path.join(mappe, d.name);
    if (d.isDirectory()) sum += mappestoerrelse(fuld);
    else if (d.isFile()) sum += fs.statSync(fuld).size;
  }
  return sum;
}

// En sti i game.json skal pege på en fil inde i spillets egen mappe.
function lokalFil(mappe, navn) {
  if (typeof navn !== "string" || navn.length === 0) return null;
  if (navn.includes("..") || navn.startsWith("/") || navn.includes("\\") || /^[a-z]+:/i.test(navn)) return null;
  return path.join(mappe, navn);
}

// Læser og tjekker ét spil. Returnerer { slug, data, fejl, advarsler }.
function tjekSpil(slug) {
  const mappe = path.join(GAMES, slug);
  const fejl = [];
  const advarsler = [];
  const skabelon = slug.startsWith("_");

  if (!fs.existsSync(mappe)) return { slug, data: null, fejl: [`games/${slug} findes ikke`], advarsler };
  if (!skabelon && !SLUG.test(slug)) {
    fejl.push(`Mappenavnet "${slug}" skal være små bogstaver, tal og bindestreger (fx ram-maalet)`);
  }

  const jsonSti = path.join(mappe, "game.json");
  if (!fs.existsSync(jsonSti)) {
    fejl.push(`games/${slug}/game.json mangler`);
    return { slug, data: null, fejl, advarsler };
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(jsonSti, "utf8"));
  } catch (e) {
    fejl.push(`games/${slug}/game.json er ikke gyldig JSON: ${e.message}`);
    return { slug, data: null, fejl, advarsler };
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    fejl.push(`games/${slug}/game.json skal være et objekt { ... }`);
    return { slug, data: null, fejl, advarsler };
  }

  const tekst = (felt, maks, kraevet) => {
    const v = data[felt];
    if (v === undefined) {
      if (kraevet) fejl.push(`"${felt}" mangler i game.json`);
      return;
    }
    if (typeof v !== "string" || v.trim().length === 0) fejl.push(`"${felt}" skal være en tekst`);
    else if (v.length > maks) fejl.push(`"${felt}" er ${v.length} tegn. Højst ${maks}`);
  };

  tekst("titel", 40, true);
  tekst("beskrivelse", 140, true);
  tekst("styring", 80, false);

  // Navnet er frivilligt: uden "forfatter" står spillet uden navn i hallen.
  if (data.forfatter !== undefined && (typeof data.forfatter !== "string" || !data.forfatter.trim() || !NAVN.test(data.forfatter) || /https?:|www\./i.test(data.forfatter))) {
    fejl.push(`"forfatter" er dit navn, som det skal stå i hallen, fx "Lasse". Højst 40 tegn, ingen e-mail eller link`);
  }

  if (data.tags !== undefined) {
    if (!Array.isArray(data.tags)) fejl.push(`"tags" skal være en liste, fx ["reflekser", "kort"]`);
    else {
      if (data.tags.length > 5) fejl.push(`Højst 5 tags (der er ${data.tags.length})`);
      for (const t of data.tags) {
        if (typeof t !== "string" || t.trim().length === 0 || t.length > 20) fejl.push(`Tagget ${JSON.stringify(t)} skal være en tekst på 1 til 20 tegn`);
        else if (t !== t.toLowerCase()) advarsler.push(`Skriv tagget "${t}" med små bogstaver`);
      }
    }
  }

  if (data.dato !== undefined) {
    if (typeof data.dato !== "string" || !DATO.test(data.dato) || Number.isNaN(Date.parse(data.dato))) {
      fejl.push(`"dato" skal se sådan ud: "2026-10-19"`);
    }
  }

  if (data.type !== undefined && !TYPER.includes(data.type)) {
    fejl.push(`"type" skal være en af: ${TYPER.join(", ")}`);
  }

  if (data.cover !== undefined) {
    const fil = lokalFil(mappe, data.cover);
    if (!fil) fejl.push(`"cover" skal være et filnavn i spillets egen mappe, fx "cover.png"`);
    else if (!BILLEDE.test(data.cover)) fejl.push(`"cover" skal være .png, .jpg, .webp, .gif eller .svg`);
    else if (!fs.existsSync(fil)) fejl.push(`Coveret games/${slug}/${data.cover} findes ikke`);
    else if (fs.statSync(fil).size > MAKS_COVER) fejl.push(`Coveret er større end 1 MB`);
  }

  const start = data.start === undefined ? "index.html" : data.start;
  const startFil = lokalFil(mappe, start);
  if (!startFil || !/\.html?$/i.test(start)) fejl.push(`"start" skal være en .html-fil i spillets mappe`);
  else if (!fs.existsSync(startFil)) fejl.push(`Spillet starter i games/${slug}/${start}, men filen findes ikke`);
  else {
    const html = fs.readFileSync(startFil, "utf8");
    if (/<script[^>]+src=["']https?:/i.test(html)) {
      advarsler.push(`${start} henter scripts fra internettet. Spil i Arkaden skal kunne køre uden net`);
    }
    if (/localStorage/.test(html)) {
      advarsler.push(`localStorage virker ikke inde i hallen. Brug arkade.gem() og arkade.hent()`);
    }
  }

  for (const felt of Object.keys(data)) {
    if (!FELTER.includes(felt)) advarsler.push(`Ukendt felt "${felt}" i game.json bliver ignoreret`);
  }

  if (mappestoerrelse(mappe) > MAKS_MAPPE) fejl.push(`games/${slug} fylder mere end 5 MB`);

  return { slug, data, fejl, advarsler };
}

// Det, hallen får at vide om ét spil. Stier er relative til index.html.
function manifestPost(slug, data) {
  return {
    slug,
    titel: data.titel,
    forfatter: data.forfatter || null,
    beskrivelse: data.beskrivelse,
    type: data.type || null,
    tags: Array.isArray(data.tags) ? data.tags : [],
    cover: data.cover ? `games/${slug}/${data.cover}` : null,
    start: `games/${slug}/${data.start || "index.html"}`,
    styring: data.styring || "",
    dato: data.dato || null,
  };
}

// Bygger manifestet ud fra mapperne. Spil med fejl kommer ikke med, men
// stopper heller ikke hallen. Uden tidsstempel, så samme mapper giver samme fil.
// Repoets adresse på GitHub, til linket "Vil du forbedre spillet?". I GitHub
// Actions kommer den fra GITHUB_REPOSITORY, lokalt fra git remote origin.
function repoUrl() {
  if (process.env.GITHUB_REPOSITORY) return `https://github.com/${process.env.GITHUB_REPOSITORY}`;
  if (!fs.existsSync(path.join(ROD, ".git"))) return null;
  try {
    const url = require("node:child_process")
      .execFileSync("git", ["remote", "get-url", "origin"], { cwd: ROD, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
      .trim();
    const m = url.match(/github\.com[:/]([\w.-]+\/[\w.-]+?)(?:\.git)?$/);
    return m ? `https://github.com/${m[1]}` : null;
  } catch {
    return null;
  }
}

function bygManifest() {
  const spil = [];
  const udeladt = [];
  for (const slug of spilmapper()) {
    const r = tjekSpil(slug);
    if (r.fejl.length) udeladt.push(r);
    else spil.push(manifestPost(slug, r.data));
  }
  spil.sort((a, b) => a.titel.localeCompare(b.titel, "da"));
  return { manifest: { version: 1, repo: repoUrl(), spil }, udeladt };
}

function manifestFiler(manifest) {
  const json = JSON.stringify(manifest, null, 2) + "\n";
  return {
    json,
    js: `// Lavet af npm run games. Ret ikke i hånden.\nwindow.ARKADEN_MANIFEST = ${json.trimEnd()};\n`,
  };
}

function skrivManifest(manifest) {
  const { json, js } = manifestFiler(manifest);
  fs.writeFileSync(path.join(GAMES, "manifest.json"), json);
  fs.writeFileSync(path.join(GAMES, "manifest.js"), js);
}

// Alle testfiler (*.test.js) under en mappe, uden node_modules.
function testfiler(mappe) {
  const ud = [];
  if (!fs.existsSync(mappe)) return ud;
  for (const d of fs.readdirSync(mappe, { withFileTypes: true })) {
    if (d.name === "node_modules" || d.name.startsWith(".")) continue;
    const fuld = path.join(mappe, d.name);
    if (d.isDirectory()) ud.push(...testfiler(fuld));
    else if (d.name.endsWith(".test.js")) ud.push(fuld);
  }
  return ud.sort();
}

// Reglerne for et spil-PR, delt af tjek-pr.js og auto-merge.js, så de aldrig
// er uenige. filer er stierne, PR'en ændrer. Et spil-PR rører kun én mappe
// games/<slug>/, aldrig skabelonen og aldrig manifestet (det laver robotten).
function spilIPr(filer) {
  const iSpil = (f) => /^games\/[^/]+\/./.test(f);
  const udenfor = filer.filter((f) => !iSpil(f));
  const slugs = [...new Set(filer.filter(iSpil).map((f) => f.split("/")[1]))];
  return { udenfor, slugs };
}

// Findes spillet allerede på main, er PR'en en opdatering. Den er kun tilladt
// fra branchen indsend/<slug> i selve repoet (ikke fra en fork), som er den
// branch, Jonas Juhl-connectoren bruger. Ellers kunne et nyt spil overskrive
// et andet med samme navn.
function maaOpdatere(slug, { gren, fraFork }) {
  return !fraFork && gren === `indsend/${slug}`;
}

module.exports = { ROD, GAMES, SLUG, spilmapper, tjekSpil, bygManifest, manifestFiler, skrivManifest, testfiler, spilIPr, maaOpdatere };
