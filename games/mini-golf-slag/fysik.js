// Små fysik-regler, der kan testes for sig (se test.html)

// Et træ er lige så højt, som det er bredt: højde = 2,5 × radius (træerne er 50–65 høje).
// Buen topper i ca. 67 px (driver) til 89 px (lob wedge), så bolden kun kommer over træer nær toppen af buen –
// wedges, der flyver højest, klarer dem lettest.
const TREE_HEIGHT_FACTOR = 2.5;
function treeHeight(radius) { return radius * TREE_HEIGHT_FACTOR; }

// Slagbue: en kølle flyver en bestemt længde (carry) med en bestemt udgangsvinkel.
// Samme længde med højere vinkel giver en højere bue: toppunkt = carry × tan(vinkel) / 4.
// Derfor kan en wedge (stejl vinkel) komme over et træ, selvom den flyver kort.
function launchFromCarry(carry, vinkelDeg, g) {
  const tan = Math.tan(vinkelDeg * Math.PI / 180);
  const horiz = Math.sqrt(carry * g / (2 * tan));
  return { horiz, vz: horiz * tan };
}
function apexHeight(vz, g) { return vz * vz / (2 * g); }

// Vind som luftmodstand (kun den vandrette fart, kun mens bolden er i luften).
// Luften bremser bolden efter dens fart i forhold til luften (kvadratisk: k × |v_rel| × v_rel).
// Den del, der også ville gælde i vindstille, trækkes fra, så køllernes længder er uændrede uden vind.
// Det giver: hurtige slag skubbes mest til siden.
// I medvind mister bolden løft og flyver lavere, så skubbet FREMAD langs bolden halveres (TAILWIND_FACTOR):
// modvind koster derfor mere, end medvind giver – som på en rigtig bane.
// vx, vy: boldens fart; wx, wy: vindens fart, begge i px/s. Returnerer acceleration i px/s².
const AIR_DRAG = 0.008;
const TAILWIND_FACTOR = 0.5;
const PX_PER_M = 4;          // banens målestok: 4 px = 1 m (vind i m/s × 4 = px/s)
function windAccel(vx, vy, wx, wy, k = AIR_DRAG) {
  const rx = wx - vx, ry = wy - vy, r = Math.hypot(rx, ry);
  const v = Math.hypot(vx, vy);
  let ax = k * (r * rx + v * vx), ay = k * (r * ry + v * vy);
  if (v > 0) {
    const ux = vx / v, uy = vy / v, frem = ax * ux + ay * uy;   // del af skubbet langs boldens retning
    if (frem > 0) { ax -= frem * (1 - TAILWIND_FACTOR) * ux; ay -= frem * (1 - TAILWIND_FACTOR) * uy; }
  }
  return { ax, ay };
}

// Landing: andel af farten bolden beholder ved første nedslag = terrænets værdi × køllens rul.
// Greenen er blød og holder bolden, rough griber den. (Sand stopper bolden helt og håndteres for sig.)
const LAND_KEEP = { fairway: 0.6, green: 0.4, rough: 0.4 };
function landingKeep(terrain, clubRul = 1) { return (LAND_KEEP[terrain] ?? 0.6) * clubRul; }

// Hullet: bolden falder kun i, hvis dens midte er tæt nok på hullets midte.
// En bold, der står stille eller ruller langsomt, falder i, når den ligger over den tegnede kop (radius 7).
// Jo hurtigere den ruller, jo tættere på midten skal den være (falder i kvadrat) – en hurtig bold hopper over.
// Ingen magnet: bolden trækkes aldrig ind mod hullet.
const CUP_CAPTURE_R = 7;     // fangradius for en bold, der står stille = koppens tegnede radius (CUP_R)
const CUP_MAX_SPEED = 140;   // fra denne fart falder bolden aldrig i
function cupCaptureRadius(speed) {
  const f = Math.max(0, 1 - speed / CUP_MAX_SPEED);
  return CUP_CAPTURE_R * f * f;
}
function ballDropsInCup(dist, speed) { return dist < cupCaptureRadius(speed); }

// Rammer bolden træet? tree = [x, y, radius]
function ballHitsTree(ball, tree, ballR = 4.5) {
  const [tx, ty, tr] = tree;
  const d = Math.hypot(ball.x - tx, ball.y - ty);
  return d < tr + ballR && ball.z < treeHeight(tr);
}

// ---------- Vejr ----------
// Banen vender med nord opad. Vejrtjenester angiver, hvor vinden kommer FRA, i grader med uret fra nord.
// windFromWeather giver retningen, bolden skubbes I (radianer på canvas, y nedad), og farten i m/s.
const MAX_WIND = 15;   // hårdere vind end dette gør spillet uspilleligt, så effekten loftes her
function windFromWeather(fromDeg, speed) {
  const b = (fromDeg + 180) * Math.PI / 180;   // retningen vinden blæser hen imod
  return { dir: Math.atan2(-Math.cos(b), Math.sin(b)), speed: Math.round(Math.min(MAX_WIND, Math.max(0, speed)) * 10) / 10 };
}

// WMO-vejrkode → slags vejr: 'sol', 'skyet', 'taage', 'regn', 'sne' eller 'torden'
function weatherKind(code) {
  if (code <= 1) return 'sol';
  if (code <= 3) return 'skyet';
  if (code === 45 || code === 48) return 'taage';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'sne';
  if (code >= 95) return 'torden';
  if (code >= 51) return 'regn';
  return 'skyet';
}

// Våd eller sneklædt bane: bolden ruller kortere
function weatherFriction(kind) {
  return { regn: 1.25, torden: 1.25, sne: 1.6 }[kind] || 1;
}

// ---------- Rekorder ----------
// Færre slag er bedre. Ingen tidligere rekord = enhver score er en rekord. Lige med rekorden er ikke ny rekord.
function isNewRecord(best, score) { return best == null || score < best; }
// Gemmer en score i rekordlisten for et sted: rec = { huller: [], runde: tal|null }. Returnerer true ved ny rekord.
function saveRecord(rec, holeIdx, score) {
  if (!isNewRecord(rec.huller[holeIdx], score)) return false;
  rec.huller[holeIdx] = score;
  return true;
}
