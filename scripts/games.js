// npm run games: finder alle spil i games/ og skriver games/manifest.json og
// games/manifest.js, som hallen (index.html) læser. Ingen fælles liste at rette i:
// et spil er med, når det har sin egen mappe med en gyldig game.json.
// GitHub Actions kører samme script, før Arkaden udgives på GitHub Pages.

const { bygManifest, skrivManifest } = require("./arkaden.js");

const streng = process.argv.includes("--streng");
const { manifest, udeladt } = bygManifest();
skrivManifest(manifest);

console.log(`Manifest skrevet: ${manifest.spil.length} spil i hallen.`);
for (const s of manifest.spil) console.log(`  ✓ ${s.slug}  ${s.titel}  ${s.forfatter ? `(af ${s.forfatter})` : "(uden navn)"}`);
for (const r of udeladt) {
  console.log(`  ✗ ${r.slug} er ikke med:`);
  for (const f of r.fejl) console.log(`      ${f}`);
}
if (streng && udeladt.length) process.exit(1);
