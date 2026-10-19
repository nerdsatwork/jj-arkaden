// Tegningen og styringen for skabelonen. Reglerne ligger i logic.js.
// Highscoren gemmes med arkade.gem og arkade.hent (localStorage virker ikke i hallen).

Arkade.start(function (scene, arkade) {
  const { ctx, bredde: B, hoejde: H } = scene;
  const { tegn } = arkade;
  // Spillets egne farver. Vælg dit eget look: det er dit spil.
  const F = {
    baggrund: "#2b1055",
    accent: "#20c997", // målene og de store tal
    tekst: "#ffffff",
    daempet: "#c3a6f0",
  };
  let spil = Skabelon.nytSpil();
  let rekord = 0;
  let nyRekord = false;

  arkade.hent("rekord").then((v) => {
    rekord = Number(v) || 0;
  });

  scene.canvas.addEventListener("pointerdown", (e) => {
    const p = arkade.punkt(e);
    const foer = spil.fase;
    spil = Skabelon.klik(spil, p.x, p.y);
    if (foer !== "spil") nyRekord = false;
  });

  function titel(tid) {
    tegn.baggrund(ctx, F.baggrund);
    tegn.tekst(ctx, "RAM MÅLET", B / 2, 170, { str: 64, farve: F.accent, gloed: 22 });
    tegn.tekst(ctx, `Ram de lysende mål. Du har ${Skabelon.SPILLETID} sekunder.`, B / 2, 245, { str: 20, vaegt: 400 });
    tegn.tekst(ctx, `Rekord: ${rekord}`, B / 2, 290, { str: 18, farve: F.daempet, vaegt: 400 });
    if (tegn.blink(tid)) tegn.tekst(ctx, "KLIK FOR AT STARTE", B / 2, 400, { str: 18, farve: F.accent, gloed: 10 });
    arkade.meld("Ram målet. Klik for at starte.");
  }

  function spillet() {
    tegn.baggrund(ctx, F.baggrund);
    const lvl = Skabelon.LEVELS[Skabelon.level(spil.ramt)];
    tegn.tekst(ctx, `POINT ${spil.point}`, 24, 34, { str: 20, just: "left", farve: F.tekst });
    tegn.tekst(ctx, lvl.navn.toUpperCase(), B / 2, 34, { str: 20, farve: F.accent });
    tegn.tekst(ctx, `TID ${Math.ceil(spil.tidTilbage)}`, B - 24, 34, { str: 20, just: "right", farve: F.accent });
    const m = spil.maal;
    ctx.save();
    ctx.strokeStyle = F.accent;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.radius * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = F.accent;
    ctx.fill();
    ctx.restore();
    arkade.meld(`${spil.point} point. ${Math.ceil(spil.tidTilbage)} sekunder tilbage.`);
  }

  function slut(tid) {
    if (spil.point > rekord) {
      rekord = spil.point;
      nyRekord = true;
      arkade.gem("rekord", rekord);
    }
    tegn.baggrund(ctx, F.baggrund);
    tegn.tekst(ctx, "TIDEN ER GÅET", B / 2, 140, { str: 44, farve: F.accent, gloed: 16 });
    tegn.tekst(ctx, `${spil.point} point`, B / 2, 230, { str: 72, farve: F.tekst, gloed: 20 });
    tegn.tekst(ctx, nyRekord ? "NY REKORD!" : `Rekord: ${rekord}`, B / 2, 300, { str: 22, farve: nyRekord ? F.accent : F.daempet });
    if (tegn.blink(tid)) tegn.tekst(ctx, "KLIK FOR AT SPILLE IGEN   ESC: SPILHALLEN", B / 2, 410, { str: 16, farve: F.accent });
    arkade.meld(`Slut. ${spil.point} point. Rekord ${rekord}.`);
  }

  arkade.loop(function (dt, tid) {
    spil = Skabelon.opdater(spil, dt);
    if (spil.fase === "titel") titel(tid);
    else if (spil.fase === "spil") spillet();
    else slut(tid);
    tegn.scanlinjer(ctx);
    arkade.info({ Point: String(spil.point), Rekord: String(rekord) });
  });
});
