// Lægger Arkadens ramme (arkade/ramme.js) ind i hvert spils HTML, så intet
// spil ruller inde i hallens vindue. npm start gør det ved hver indlæsning, og
// udgivelsen gør det i den samlede side:
//
//   node scripts/ramme.js _site
//
// Rammen ligger inline, så den virker uanset hvor dybt HTML-filen ligger.
// Spillets egne filer i games/ ændres aldrig.

const fs = require("node:fs");
const path = require("node:path");

const KILDE = path.join(__dirname, "..", "arkade", "ramme.js");
const MAERKE = "data-arkade-ramme";

function rammeTag() {
  // "</script" kan ikke stå i rammen, men vær sikker alligevel.
  const kode = fs.readFileSync(KILDE, "utf8").replace(/<\/script/gi, "<\\/script");
  return `<script ${MAERKE}>\n${kode}</script>\n`;
}

// Lægger rammen ind lige efter <head> (eller først i filen), så den kører, før
// spillets egne scripts. En fil, der allerede har rammen, røres ikke.
function medRamme(html, tag = rammeTag()) {
  if (html.includes(MAERKE)) return html;
  const head = /<head(\s[^>]*)?>/i.exec(html);
  if (head) {
    const slut = head.index + head[0].length;
    return `${html.slice(0, slut)}\n${tag}${html.slice(slut)}`;
  }
  const doctype = /<!doctype[^>]*>/i.exec(html);
  if (doctype) {
    const slut = doctype.index + doctype[0].length;
    return `${html.slice(0, slut)}\n${tag}${html.slice(slut)}`;
  }
  return tag + html;
}

function htmlFiler(mappe) {
  const ud = [];
  for (const del of fs.readdirSync(mappe, { withFileTypes: true })) {
    const fuld = path.join(mappe, del.name);
    if (del.isDirectory()) ud.push(...htmlFiler(fuld));
    else if (/\.html?$/i.test(del.name)) ud.push(fuld);
  }
  return ud;
}

function rammeIMappe(side) {
  const games = path.join(side, "games");
  const tag = rammeTag();
  const filer = htmlFiler(games);
  for (const fil of filer) fs.writeFileSync(fil, medRamme(fs.readFileSync(fil, "utf8"), tag));
  return filer.length;
}

module.exports = { medRamme, rammeTag, rammeIMappe, MAERKE };

if (require.main === module) {
  const side = process.argv[2];
  if (!side) {
    console.error("Brug: node scripts/ramme.js <mappe med games/>");
    process.exit(1);
  }
  console.log(`Rammen er lagt ind i ${rammeIMappe(path.resolve(side))} HTML-filer.`);
}
