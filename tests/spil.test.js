// Fælles tjek af alle spil: hver mappe i games/ har en gyldig game.json og en
// startside. Med npm test -- <dit-spil> tjekkes kun det spil.

const test = require("node:test");
const assert = require("node:assert/strict");
const { spilmapper, tjekSpil, bygManifest } = require("../scripts/arkaden.js");

const valgte = process.env.ARKADEN_SPIL ? process.env.ARKADEN_SPIL.split(",") : spilmapper({ medSkabeloner: true });

for (const slug of valgte) {
  test(`games/${slug} følger Arkadens regler`, () => {
    const { fejl } = tjekSpil(slug);
    assert.deepEqual(fejl, [], `Ret dette i games/${slug}:\n  ${fejl.join("\n  ")}`);
  });
}

if (!process.env.ARKADEN_SPIL) {
  test("manifestet har alle spil undtagen skabeloner", () => {
    const { manifest, udeladt } = bygManifest();
    assert.deepEqual(udeladt.map((r) => r.slug), []);
    assert.deepEqual(manifest.spil.map((s) => s.slug).sort(), spilmapper());
    for (const s of manifest.spil) assert.ok(!s.slug.startsWith("_"));
  });
}
