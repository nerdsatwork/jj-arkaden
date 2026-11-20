// Arkadens ramme: lægges ind i hvert spils HTML, når hallen udgives (og af
// npm start), så du ikke selv skal gøre noget. Spillet må aldrig rulle inde i
// hallens vindue. Er siden større end vinduet, skaleres hele siden ned og
// centreres, så hele spillet kan ses. Musen rammer stadig rigtigt, fordi
// browseren regner skaleringen med i getBoundingClientRect og offsetX.
// Åbnes spillet alene (ikke i hallen), gør rammen ingenting.

(function () {
  "use strict";
  if (window.parent === window || window.__arkadeRamme) return;
  window.__arkadeRamme = true;

  const rod = document.documentElement;
  const stil = document.createElement("style");
  stil.textContent = "html,body{overflow:hidden!important;overscroll-behavior:none}";
  (document.head || rod).appendChild(stil);

  let venter = false;
  function tilpas() {
    venter = false;
    if (!document.body) return;
    // Mål siden i sin naturlige størrelse, uden en tidligere skalering.
    rod.style.transform = "";
    const vb = rod.clientWidth;
    const vh = rod.clientHeight;
    const b = rod.scrollWidth;
    const h = rod.scrollHeight;
    // En pixel eller to (fx et canvas med en tom linje under sig) tæller med,
    // for det er nok til en rullebjælke.
    const s = Math.min(1, vb / b, vh / h);
    if (s < 1) {
      const dx = (vb - b * s) / 2;
      const dy = (vh - h * s) / 2;
      rod.style.transformOrigin = "0 0";
      rod.style.transform = `translate(${dx}px, ${dy}px) scale(${s})`;
    }
    if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
  }
  function senere() {
    if (venter) return;
    venter = true;
    requestAnimationFrame(tilpas);
  }

  function start() {
    tilpas();
    let obs = null;
    if (typeof ResizeObserver === "function") {
      obs = new ResizeObserver(senere);
      obs.observe(document.body);
      for (const barn of document.body.children) obs.observe(barn);
    }
    // Et spil, der bygger sin side senere, eller indlæser billeder og skrifter.
    new MutationObserver((aendringer) => {
      for (const a of aendringer) for (const n of a.addedNodes) if (obs && n.nodeType === 1) obs.observe(n);
      senere();
    }).observe(document.body, { childList: true });
    window.addEventListener("load", senere);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(senere, () => {});
  }

  window.addEventListener("resize", senere);
  // Fokus eller en tast (fx mellemrum) må ikke rulle siden væk fra spillet.
  window.addEventListener("scroll", () => {
    if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
  });
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
})();
