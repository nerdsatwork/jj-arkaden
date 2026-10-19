// Tegningen og styringen for Reaktion. Reglerne ligger i logic.js.

Arkade.start(function (scene, arkade) {
  const { ctx, bredde: B, hoejde: H } = scene;
  const { tegn } = arkade;
  // Reaktions egne farver. Hvert spil vælger sit eget look.
  const F = {
    navy: "#141b4d",
    gul: "#ffd43b",
    groen: "#2f9e44",
    orange: "#f76707",
    tekst: "#ffffff",
    daempet: "#aab0d6",
    moerk: "#0b0f2e",
  };
  let spil = Reaktion.nytSpil();

  function trykNu() {
    spil = Reaktion.tryk(spil, performance.now());
  }

  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      trykNu();
    }
  });
  scene.canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    trykNu();
  });

  function prikker(y) {
    const afstand = 34;
    const x0 = B / 2 - ((Reaktion.RUNDER - 1) * afstand) / 2;
    for (let i = 0; i < Reaktion.RUNDER; i++) {
      const faerdig = i < spil.tider.length;
      const aktiv = i === spil.tider.length && spil.fase !== "slut";
      ctx.fillStyle = faerdig ? F.gul : aktiv ? F.tekst : "rgba(255,255,255,0.2)";
      const s = aktiv ? 14 : 10;
      ctx.fillRect(x0 + i * afstand - s / 2, y - s / 2, s, s);
    }
  }

  // Runde og bedste tid vises i hallens topbjælke.
  function info() {
    const top = Reaktion.bedste(spil.tider);
    arkade.info({ Runde: `${Reaktion.runde(spil)} af ${Reaktion.RUNDER}`, Bedste: top === null ? "..." : `${top} ms` });
  }

  function titel(tid) {
    tegn.baggrund(ctx, F.navy);
    ctx.fillStyle = F.groen;
    ctx.beginPath();
    ctx.arc(B / 2, 160, 70, 0, Math.PI * 2);
    ctx.fill();
    tegn.tekst(ctx, "NU!", B / 2, 164, { str: 40, farve: F.tekst });
    tegn.tekst(ctx, "REAKTION", B / 2, 290, { str: 64, farve: F.gul });
    tegn.tekst(ctx, "Tryk, så snart skærmen bliver grøn.", B / 2, 345, { str: 20, vaegt: 400 });
    tegn.tekst(ctx, `${Reaktion.RUNDER} runder. Tryk for tidligt, og runden tages om.`, B / 2, 375, { str: 16, farve: F.daempet, vaegt: 400 });
    if (tegn.blink(tid)) tegn.tekst(ctx, "TRYK MELLEMRUM FOR AT STARTE", B / 2, 440, { str: 16, farve: F.gul, pixel: true });
    tegn.tekst(ctx, "GRATIS · 1 SPILLER · TRYK START", B / 2, 470, { str: 12, farve: F.daempet, pixel: true });
    arkade.meld("Reaktion. Tryk mellemrum for at starte.");
  }

  function vent(tid) {
    tegn.baggrund(ctx, F.navy);
    const puls = 0.5 + 0.5 * Math.sin(tid / 180);
    ctx.globalAlpha = 0.65 + 0.35 * puls;
    tegn.tekst(ctx, "VENT", B / 2, H / 2 - 10, { str: 88, farve: F.tekst });
    ctx.globalAlpha = 1;
    tegn.tekst(ctx, `Runde ${Reaktion.runde(spil)} af ${Reaktion.RUNDER}`, B / 2, H / 2 + 60, { str: 18, farve: F.daempet, vaegt: 400 });
    prikker(H - 50);
    arkade.meld(`Runde ${Reaktion.runde(spil)}. Vent.`);
  }

  function nu() {
    ctx.fillStyle = F.groen;
    ctx.fillRect(0, 0, B, H);
    tegn.tekst(ctx, "NU!", B / 2, H / 2, { str: 160, farve: F.tekst });
    arkade.meld("Nu!");
  }

  function resultat(tid) {
    tegn.baggrund(ctx, F.navy);
    const ms = spil.tider[spil.tider.length - 1];
    tegn.tekst(ctx, `${ms} MS`, B / 2, H / 2 - 40, { str: 96, farve: F.gul });
    tegn.tekst(ctx, Reaktion.vurdering(ms), B / 2, H / 2 + 40, { str: 24, pixel: false });
    if (tegn.blink(tid)) tegn.tekst(ctx, "TRYK FOR NÆSTE RUNDE", B / 2, H / 2 + 110, { str: 16, farve: F.daempet, pixel: true });
    prikker(H - 50);
    arkade.meld(`${ms} millisekunder. ${Reaktion.vurdering(ms)}. Tryk for næste runde.`);
  }

  function forTidligt(tid) {
    ctx.fillStyle = F.orange;
    ctx.fillRect(0, 0, B, H);
    tegn.tekst(ctx, "FOR TIDLIGT!", B / 2, H / 2 - 20, { str: 64, farve: F.tekst });
    tegn.tekst(ctx, "Vent på det grønne lys.", B / 2, H / 2 + 40, { str: 20, vaegt: 400, farve: F.tekst });
    if (tegn.blink(tid)) tegn.tekst(ctx, "TRYK FOR AT PRØVE IGEN", B / 2, H / 2 + 110, { str: 16, farve: F.moerk, pixel: true });
    prikker(H - 50);
    arkade.meld("For tidligt. Tryk for at prøve igen.");
  }

  function slut(tid) {
    tegn.baggrund(ctx, F.navy);
    const snit = Reaktion.gennemsnit(spil.tider);
    const top = Reaktion.bedste(spil.tider);
    tegn.tekst(ctx, "DIT GENNEMSNIT", B / 2, 56, { str: 18, farve: F.daempet });
    tegn.tekst(ctx, `${snit} MS`, B / 2, 118, { str: 72, farve: F.gul });
    tegn.tekst(ctx, Reaktion.vurdering(snit), B / 2, 176, { str: 24, pixel: false });

    // Søjler: én pr. runde, den bedste fremhævet.
    const maks = Math.max(500, ...spil.tider);
    const sB = 70;
    const afst = 30;
    const x0 = B / 2 - (Reaktion.RUNDER * sB + (Reaktion.RUNDER - 1) * afst) / 2;
    spil.tider.forEach((ms, i) => {
      const h = Math.max(6, (ms / maks) * 150);
      const x = x0 + i * (sB + afst);
      ctx.fillStyle = ms === top ? F.groen : "rgba(255, 212, 59, 0.55)";
      ctx.fillRect(x, 380 - h, sB, h);
      tegn.tekst(ctx, String(ms), x + sB / 2, 396, { str: 15, vaegt: 400, farve: ms === top ? F.gul : F.tekst });
    });
    const ekstra = spil.forTidlige ? `   For tidligt: ${spil.forTidlige}` : "";
    tegn.tekst(ctx, `Bedste: ${top} ms${ekstra}`, B / 2, 432, { str: 16, farve: F.daempet, vaegt: 400 });
    if (tegn.blink(tid)) tegn.tekst(ctx, "TRYK FOR AT SPILLE IGEN   ESC: SPILHALLEN", B / 2, 472, { str: 13, farve: F.gul, pixel: true });
    arkade.meld(`Slut. Gennemsnit ${snit} millisekunder. ${Reaktion.vurdering(snit)}.`);
  }

  arkade.loop(function (dt, tid) {
    spil = Reaktion.opdater(spil, performance.now());
    if (spil.fase === "titel") titel(tid);
    else if (spil.fase === "vent") vent(tid);
    else if (spil.fase === "nu") nu();
    else if (spil.fase === "resultat") resultat(tid);
    else if (spil.fase === "for-tidligt") forTidligt(tid);
    else if (spil.fase === "slut") slut(tid);
    tegn.scanlinjer(ctx);
    info();
  });
});
