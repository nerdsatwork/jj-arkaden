// Arkade: en lille hjælper til spil i Arkaden. Valgfri, men skabelonen bruger den.
// Indlæs den i dit spils index.html:
//
//   <link rel="stylesheet" href="../../arkade/spil.css">
//   <script src="../../arkade/arkade.js"></script>
//
// og start dit spil med:
//
//   Arkade.start(function (scene, arkade) {
//     arkade.loop(function (dt, tid) { ... tegn på scene.ctx ... });
//   });
//
// Du får en canvas på 800 x 500, et spil-loop, retro-tegnehjælpere, Esc tilbage
// til hallen, arkade.info til hallens topbjælke og arkade.gem / arkade.hent til
// fx en highscore. Spillet kører i en
// sandkasse (en iframe) i hallen, så localStorage virker ikke derinde: brug
// arkade.gem og arkade.hent, de virker både i hallen og når spillet åbnes alene.

(function () {
  "use strict";

  const BREDDE = 800;
  const HOEJDE = 500;
  // Pixel-skrift (Silkscreen) til store ord på skærmen, mono til små.
  // Uden net bruges systemets skrifter.
  const PIXEL = '"Silkscreen", ui-monospace, Menlo, Consolas, monospace';
  const SKRIFT = 'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';
  // Arkadens skærmfarver. Én accent (rød), resten er gråtoner.
  const FARVER = {
    nat: "#161515", // skærmen
    panel: "#272522",
    tekst: "#fafaf9",
    daempet: "#9f9c98",
    lys: "#e1e1dd", // lys flade med mørk tekst
    blaek: "#161515",
    accent: "#e63530", // den røde: lys, fyld og streger
  };

  const iHallen = window.parent !== window;

  function tilHallen(besked) {
    if (iHallen) window.parent.postMessage(Object.assign({ arkaden: 1 }, besked), "*");
  }

  // Tegnehjælpere i Arkadens stil. Alle tager ctx først.
  const tegn = {
    baggrund(ctx, farve) {
      ctx.fillStyle = farve || FARVER.nat;
      ctx.fillRect(0, 0, BREDDE, HOEJDE);
      ctx.strokeStyle = "rgba(250, 250, 249, 0.04)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= BREDDE; x += 40) {
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, HOEJDE);
      }
      for (let y = 0; y <= HOEJDE; y += 40) {
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(BREDDE, y + 0.5);
      }
      ctx.stroke();
    },
    tekst(ctx, tekst, x, y, valg) {
      // Fra 24 px og op bruges pixel-skriften, med mindre valg.pixel siger andet.
      const v = Object.assign({ str: 28, farve: FARVER.tekst, gloed: 0, just: "center", vaegt: 700, grundlinje: "middle" }, valg);
      const pixel = v.pixel === undefined ? v.str >= 24 : v.pixel;
      ctx.save();
      ctx.font = pixel ? `${v.str}px ${PIXEL}` : `${v.vaegt} ${v.str}px ${SKRIFT}`;
      ctx.textAlign = v.just;
      ctx.textBaseline = v.grundlinje;
      ctx.fillStyle = v.farve;
      if (v.gloed) {
        ctx.shadowColor = v.farve;
        ctx.shadowBlur = v.gloed;
      }
      ctx.fillText(tekst, x, y);
      ctx.restore();
    },
    scanlinjer(ctx) {
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
      for (let y = 0; y < HOEJDE; y += 4) ctx.fillRect(0, y, BREDDE, 2);
      ctx.restore();
    },
    blink(tid, periode) {
      const p = periode || 900;
      return Math.floor(tid / (p / 2)) % 2 === 0;
    },
  };

  // Svar fra hallen på arkade.hent.
  const ventende = new Map();
  let naesteId = 1;
  window.addEventListener("message", (e) => {
    if (e.source !== window.parent || !e.data || e.data.arkaden !== 1 || e.data.type !== "svar") return;
    const loes = ventende.get(e.data.id);
    if (loes) {
      ventende.delete(e.data.id);
      loes(e.data.vaerdi === undefined ? null : e.data.vaerdi);
    }
  });

  function lokalNoegle(noegle) {
    return `arkaden:alene:${location.pathname}:${noegle}`;
  }

  function gem(noegle, vaerdi) {
    if (iHallen) return tilHallen({ type: "gem", noegle: String(noegle), vaerdi });
    try {
      localStorage.setItem(lokalNoegle(noegle), JSON.stringify(vaerdi));
    } catch (e) {
      /* privat vindue eller blokeret lager: så gemmes der bare ikke */
    }
  }

  function hent(noegle) {
    if (!iHallen) {
      try {
        const raa = localStorage.getItem(lokalNoegle(noegle));
        return Promise.resolve(raa === null ? null : JSON.parse(raa));
      } catch (e) {
        return Promise.resolve(null);
      }
    }
    return new Promise((loes) => {
      const id = naesteId++;
      ventende.set(id, loes);
      tilHallen({ type: "hent", noegle: String(noegle), id });
      setTimeout(() => {
        if (ventende.has(id)) {
          ventende.delete(id);
          loes(null);
        }
      }, 1500);
    });
  }

  function start(spilFunktion) {
    document.documentElement.classList.add("arkade-spil");
    const canvas = document.createElement("canvas");
    canvas.className = "arkade-canvas";
    canvas.tabIndex = 0;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", document.title || "Spil");
    const status = document.createElement("p");
    status.className = "arkade-status";
    status.setAttribute("aria-live", "polite");
    document.body.append(canvas, status);

    const ctx = canvas.getContext("2d");
    function tilpas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = BREDDE * dpr;
      canvas.height = HOEJDE * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    tilpas();
    window.addEventListener("resize", tilpas);

    let nede = null;
    let sidsteInfo = "";
    function gikNed(fejl) {
      if (nede) return;
      nede = fejl;
      console.error(fejl);
      ctx.setTransform(Math.min(window.devicePixelRatio || 1, 2), 0, 0, Math.min(window.devicePixelRatio || 1, 2), 0, 0);
      tegn.baggrund(ctx, FARVER.nat);
      tegn.tekst(ctx, "SPILLET GIK NED", BREDDE / 2, HOEJDE / 2 - 40, { str: 40, farve: FARVER.accent, gloed: 18 });
      tegn.tekst(ctx, String((fejl && fejl.message) || fejl).slice(0, 70), BREDDE / 2, HOEJDE / 2 + 16, { str: 16, farve: FARVER.tekst, vaegt: 400 });
      tegn.tekst(ctx, "Se konsollen for detaljer. Esc: tilbage til hallen", BREDDE / 2, HOEJDE / 2 + 56, { str: 14, farve: FARVER.daempet, vaegt: 400 });
      status.textContent = `Spillet gik ned: ${(fejl && fejl.message) || fejl}`;
      tilHallen({ type: "fejl", besked: String((fejl && fejl.message) || fejl) });
    }

    const arkade = {
      bredde: BREDDE,
      hoejde: HOEJDE,
      farver: FARVER,
      skrift: SKRIFT,
      pixelskrift: PIXEL,
      tegn,
      // Kalder fn(dt, tid) hver frame. dt er sekunder siden sidst, tid er millisekunder.
      loop(fn) {
        let sidst = performance.now();
        function trin(nu) {
          if (nede) return;
          const dt = Math.min(0.1, (nu - sidst) / 1000);
          sidst = nu;
          try {
            fn(dt, nu);
          } catch (e) {
            gikNed(e);
            return;
          }
          requestAnimationFrame(trin);
        }
        requestAnimationFrame(trin);
      },
      // Musens eller fingerens position i spillets koordinater (0 til 800, 0 til 500).
      punkt(haendelse) {
        const r = canvas.getBoundingClientRect();
        return { x: ((haendelse.clientX - r.left) * BREDDE) / r.width, y: ((haendelse.clientY - r.top) * HOEJDE) / r.height };
      },
      // Kort tekst til skærmlæsere (og til en playtester), fx "Runde 2 af 5".
      meld(tekst) {
        if (status.textContent !== tekst) status.textContent = tekst;
      },
      // Op til tre tal i hallens topbjælke, fx { Runde: "2 af 5", Bedste: "213 ms" }.
      info(felter) {
        const ren = {};
        for (const [k, v] of Object.entries(felter || {}).slice(0, 3)) ren[String(k).slice(0, 20)] = String(v).slice(0, 24);
        const json = JSON.stringify(ren);
        if (json === sidsteInfo) return;
        sidsteInfo = json;
        tilHallen({ type: "info", felter: ren });
      },
      gem,
      hent,
      tilbage() {
        tilHallen({ type: "tilbage" });
      },
    };

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") arkade.tilbage();
    });
    window.addEventListener("error", (e) => gikNed(e.error || e.message));

    try {
      spilFunktion({ canvas, ctx, bredde: BREDDE, hoejde: HOEJDE }, arkade);
    } catch (e) {
      gikNed(e);
    }
    canvas.focus();
    tilHallen({ type: "klar" });
  }

  window.Arkade = { start, tegn, FARVER, BREDDE, HOEJDE, SKRIFT, PIXEL };
})();
