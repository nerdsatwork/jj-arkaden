// Arkadens ramme (arkade/ramme.js) lægges ind i hvert spils HTML, så intet spil
// ruller i hallens vindue. Her tjekkes, at den lander rigtigt og kun én gang.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { medRamme, rammeIMappe, MAERKE } = require("../scripts/ramme.js");

const TAG = `<script ${MAERKE}>/* ramme */</script>\n`;

test("rammen lægges ind lige efter <head>, før spillets egne scripts", () => {
  const ud = medRamme('<!doctype html><html><head lang="da"><script src="spil.js"></script></head></html>', TAG);
  assert.ok(ud.indexOf(MAERKE) > ud.indexOf("<head"));
  assert.ok(ud.indexOf(MAERKE) < ud.indexOf("spil.js"));
});

test("en side uden <head> får rammen efter doctype eller først", () => {
  assert.ok(medRamme("<!DOCTYPE html><canvas></canvas>", TAG).startsWith(`<!DOCTYPE html>\n<script ${MAERKE}>`));
  assert.ok(medRamme("<canvas></canvas>", TAG).startsWith(`<script ${MAERKE}>`));
});

test("rammen lægges kun ind én gang", () => {
  const en = medRamme("<html><head></head></html>", TAG);
  assert.equal(medRamme(en, TAG), en);
});

test("udgivelsen lægger rammen i alle spillets HTML-filer, også i undermapper", () => {
  const side = fs.mkdtempSync(path.join(os.tmpdir(), "arkaden-"));
  fs.mkdirSync(path.join(side, "games", "golf", "baner"), { recursive: true });
  fs.writeFileSync(path.join(side, "games", "golf", "index.html"), "<html><head></head></html>");
  fs.writeFileSync(path.join(side, "games", "golf", "baner", "hul.html"), "<html><head></head></html>");
  fs.writeFileSync(path.join(side, "games", "golf", "spil.js"), "// ikke html");
  assert.equal(rammeIMappe(side), 2);
  assert.ok(fs.readFileSync(path.join(side, "games", "golf", "baner", "hul.html"), "utf8").includes(MAERKE));
  assert.equal(fs.readFileSync(path.join(side, "games", "golf", "spil.js"), "utf8"), "// ikke html");
  fs.rmSync(side, { recursive: true, force: true });
});
