// Spilhallen: forsiden med alle spil, en side pr. spil, siden om at lægge sit
// eget spil i Arkaden, og selve spillet i en sandkasse (iframe). Alle spil er
// gratis. Spillene kommer fra games/manifest.js, som npm run games (og GitHub
// Actions) laver ud fra mapperne i games/. Du behøver ikke røre denne fil for
// at lave et spil.

(function () {
  "use strict";

  const SLUG = /^[a-z0-9_](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
  const MAKS_GEMT = 10000; // tegn pr. gemt værdi
  const TYPER = [
    ["action", "Action"],
    ["klassiker", "Klassiker"],
    ["rolig", "Rolig"],
  ];
  const SKAERMTEKST = "GRATIS · 1 SPILLER · TRYK START";

  const manifest = window.ARKADEN_MANIFEST && Array.isArray(window.ARKADEN_MANIFEST.spil) ? window.ARKADEN_MANIFEST : null;
  const alleSpil = manifest ? manifest.spil.filter((s) => s && SLUG.test(s.slug)) : [];
  const efterSlug = new Map(alleSpil.map((s) => [s.slug, s]));
  const repo = manifest && typeof manifest.repo === "string" && /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(manifest.repo) ? manifest.repo : null;

  const visning = document.getElementById("visning");
  const scene = document.getElementById("scene");
  const sceneTitel = document.getElementById("scene-titel");
  const sceneInfo = document.getElementById("scene-info");
  const sceneRamme = document.getElementById("scene-ramme");
  const tilbageKnap = document.getElementById("tilbage");

  let aktivType = null;
  let spillerNu = null; // { slug, iframe }

  // Lille hjælper til at bygge DOM uden innerHTML. Tekst fra game.json kommer
  // fra mange forskellige folk, så den sættes altid som tekst, aldrig som HTML.
  function el(tag, egenskaber, ...boern) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(egenskaber || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === "class") e.className = v;
      else if (k === "text") e.textContent = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    }
    for (const b of boern.flat(Infinity)) if (b !== null && b !== undefined && b !== false) e.append(b);
    return e;
  }

  function typeNavn(type) {
    const t = TYPER.find(([id]) => id === type);
    return t ? t[1] : null;
  }

  // Et farverigt cover ud fra titlen, når spillet ikke selv har et billede.
  // Farverne kommer fra spillets mappenavn, så hvert spil får sit eget look.
  function lavCover(spil) {
    const NS = "http://www.w3.org/2000/svg";
    const s = (tag, attr, tekst) => {
      const n = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attr)) n.setAttribute(k, v);
      if (tekst) n.textContent = tekst;
      return n;
    };
    let hash = 0;
    for (const c of spil.slug) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
    const hue = hash % 360;
    const bund = `hsl(${hue} 65% 22%)`;
    const midt = `hsl(${(hue + 40) % 360} 75% 45%)`;
    const lys = `hsl(${(hue + 180) % 360} 95% 65%)`;
    const id = `g-${spil.slug}-${Math.random().toString(36).slice(2, 7)}`;
    const svg = s("svg", { viewBox: "0 0 320 180", class: "cover", role: "img", "aria-label": `Cover til ${spil.titel}` });
    const grad = s("linearGradient", { id, x1: "0", y1: "0", x2: "1", y2: "1" });
    grad.append(s("stop", { offset: "0", "stop-color": bund }), s("stop", { offset: "1", "stop-color": midt }));
    const defs = s("defs", {});
    defs.append(grad);
    svg.append(defs, s("rect", { width: 320, height: 180, fill: `url(#${id})` }));
    // Tre former i forskellig størrelse, placeret ud fra navnet.
    for (let i = 0; i < 3; i++) {
      const x = 180 + ((hash >>> (i * 4)) % 120);
      const y = 20 + ((hash >>> (i * 5 + 2)) % 120);
      const r = 14 + ((hash >>> (i * 3)) % 30);
      svg.append((hash >>> i) & 1 ? s("circle", { cx: x, cy: y, r, fill: lys, opacity: String(0.9 - i * 0.25) }) : s("rect", { x: x - r, y: y - r, width: r * 2, height: r * 2, fill: lys, opacity: String(0.9 - i * 0.25) }));
    }
    const titel = String(spil.titel || spil.slug).toUpperCase();
    const str = Math.max(14, Math.min(32, Math.floor(480 / Math.max(6, titel.length))));
    svg.append(s("text", { x: 16, y: 150, "font-family": "Silkscreen, ui-monospace, Menlo, Consolas, monospace", "font-weight": "700", "font-size": str, fill: "#ffffff", stroke: bund, "stroke-width": 3, "paint-order": "stroke" }, titel));
    return svg;
  }

  function cover(spil) {
    let indhold;
    if (spil.cover && typeof spil.cover === "string" && spil.cover.startsWith(`games/${spil.slug}/`)) {
      indhold = el("img", { class: "cover", src: spil.cover, alt: `Cover til ${spil.titel}`, loading: "lazy", width: 1280, height: 720 });
      indhold.addEventListener("error", () => indhold.replaceWith(lavCover(spil)), { once: true });
    } else indhold = lavCover(spil);
    return el("div", { class: "skaerm" }, indhold);
  }

  function skilt(titel) {
    return el("div", { class: "skilt", "aria-hidden": "true" }, el("i", { class: "lamper" }), el("span", { text: titel }), el("i", { class: "lamper" }));
  }

  function tagListe(spil) {
    const tags = [typeNavn(spil.type), ...(Array.isArray(spil.tags) ? spil.tags.slice(0, 5) : [])].filter(Boolean);
    if (tags.length === 0) return null;
    return el("ul", { class: "tags", "aria-label": "Tags" }, tags.map((t) => el("li", { class: "tag", text: String(t) })));
  }

  function kort(spil) {
    return el(
      "a",
      { class: "kort", href: `#/spil/${spil.slug}` },
      skilt(spil.titel),
      cover(spil),
      el(
        "span",
        { class: "kort-krop" },
        el("h3", { class: "kort-titel", text: spil.titel }),
        spil.forfatter ? el("span", { class: "meta", text: `af ${spil.forfatter}` }) : null,
        el("p", { class: "kort-tekst", text: spil.beskrivelse, title: spil.beskrivelse }),
        tagListe(spil),
      ),
    );
  }

  function ledigPlads() {
    return el("a", { class: "ledig", href: "#/laeg-dit-spil" }, el("strong", { text: "Ledig plads" }), el("span", { text: "Dit spil kan stå her. Se, hvordan du lægger det i Arkaden." }));
  }

  function saetAktivNav(navn) {
    for (const a of document.querySelectorAll(".nav a")) {
      if (a.dataset.nav === navn) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    }
  }

  function manglerManifest() {
    return el(
      "p",
      { class: "besked" },
      "Spilhallen kan ikke se spillisten endnu. Kør ",
      el("code", { text: "npm run games" }),
      " (eller bed Claude om det), og genindlæs siden. Med ",
      el("code", { text: "npm start" }),
      " sker det af sig selv.",
    );
  }

  // Ugens spil skifter hver mandag, i samme rækkefølge for alle.
  function ugensSpil() {
    if (alleSpil.length === 0) return null;
    const nu = new Date();
    const torsdag = new Date(Date.UTC(nu.getFullYear(), nu.getMonth(), nu.getDate() + 3 - ((nu.getDay() + 6) % 7)));
    const uge = Math.floor((torsdag - Date.UTC(torsdag.getUTCFullYear(), 0, 1)) / 604800000);
    const sorteret = [...alleSpil].sort((a, b) => a.slug.localeCompare(b.slug));
    return sorteret[(uge + torsdag.getUTCFullYear()) % sorteret.length];
  }

  function visHal(rul) {
    document.title = "Arkaden: spilhallen";
    saetAktivNav(rul ? "alle" : "hal");
    const nyeste = [...alleSpil].sort((a, b) => String(b.dato || "").localeCompare(String(a.dato || ""))).slice(0, 4);
    const ugens = ugensSpil();

    const gitter = el("div", { class: "gitter" });
    function fyldGitter() {
      const synlige = aktivType ? alleSpil.filter((s) => s.type === aktivType) : alleSpil;
      gitter.replaceChildren(...synlige.map(kort), ledigPlads());
    }
    const filtre = el(
      "div",
      { class: "filtre", role: "group", "aria-label": "Vis spil af typen" },
      [[null, "Alle"], ...TYPER].map(([id, navn]) =>
        el("button", {
          class: "filter",
          type: "button",
          "aria-pressed": String(aktivType === id),
          text: navn,
          onclick: (e) => {
            aktivType = id;
            for (const b of filtre.children) b.setAttribute("aria-pressed", String(b === e.currentTarget));
            fyldGitter();
          },
        }),
      ),
    );
    fyldGitter();

    const alle = el("section", { class: "sektion", id: "alle-spil", "aria-labelledby": "h-alle" }, el("div", { class: "sektion-top" }, el("h2", { id: "h-alle", text: `Alle spil (${alleSpil.length})` }), filtre), gitter);

    visning.replaceChildren(
      ...[
      el("section", { class: "velkommen" }, el("h1", { text: "Spilhallen" }), el("p", { text: "Små spil, bygget af kursister. Alle er gratis. Vælg et, og tryk start." })),
      manifest ? null : manglerManifest(),
      ugens
        ? el(
            "section",
            { class: "sektion", "aria-labelledby": "h-ugens" },
            el("div", { class: "sektion-top" }, el("h2", { id: "h-ugens", text: "Ugens spil" })),
            el(
              "div",
              { class: "ugens" },
              el("a", { class: "ugens-skaerm", href: `#/spil/${ugens.slug}`, "aria-label": ugens.titel }, skilt(ugens.titel), cover(ugens), el("p", { class: "skaermtekst", text: SKAERMTEKST })),
              el(
                "div",
                { class: "ugens-info" },
                el("span", { class: "maerke", text: "Ugens spil" }),
                el("h3", { text: ugens.titel }),
                ugens.forfatter ? el("span", { class: "meta", text: `af ${ugens.forfatter}` }) : null,
                el("p", { text: ugens.beskrivelse }),
                tagListe(ugens),
                el("a", { class: "knap", href: `#/spil/${ugens.slug}/spil`, text: "Spil" }),
              ),
            ),
          )
        : null,
      alleSpil.length ? el("section", { class: "sektion", "aria-labelledby": "h-nyeste" }, el("div", { class: "sektion-top" }, el("h2", { id: "h-nyeste", text: "Nyeste" })), el("div", { class: "raekke" }, nyeste.map(kort))) : null,
      alle,
      ].filter(Boolean),
    );
    if (rul) alle.scrollIntoView();
  }

  function visSide(slug) {
    const spil = efterSlug.get(slug);
    saetAktivNav(null);
    const broed = el("nav", { class: "broedkrumme", "aria-label": "Brødkrumme" }, el("a", { href: "#/", text: "Spilhallen" }), " / ", spil ? spil.titel : slug);

    if (!spil) {
      // Et spil, der ikke er i spillisten endnu (fx dit eget, før npm run games).
      document.title = `${slug} · Arkaden`;
      const lokal = { slug, titel: slug };
      visning.replaceChildren(
        broed,
        el(
          "div",
          { class: "side" },
          el("div", { class: "side-skaerm" }, skilt(slug), cover(lokal), el("p", { class: "skaermtekst", text: SKAERMTEKST })),
          el(
            "div",
            { class: "side-info" },
            el("h1", { text: slug }),
            el("p", {}, `games/${slug} er ikke i spillisten endnu. Kør `, el("code", { text: "npm run games" }), ", så kommer det med. Du kan stadig prøve det:"),
            el("a", { class: "knap", href: `#/spil/${slug}/spil`, text: "Spil" }),
          ),
        ),
      );
      return;
    }

    document.title = `${spil.titel} · Arkaden`;
    const fakta = el(
      "dl",
      { class: "fakta" },
      spil.forfatter
        ? [el("dt", { text: "Lavet af" }), el("dd", { text: spil.forfatter })]
        : null,
      typeNavn(spil.type) ? [el("dt", { text: "Type" }), el("dd", { text: typeNavn(spil.type) })] : null,
      spil.styring ? [el("dt", { text: "Styring" }), el("dd", { text: spil.styring })] : null,
      el("dt", { text: "Pris" }),
      el("dd", { text: "Gratis" }),
      spil.dato ? [el("dt", { text: "I hallen siden" }), el("dd", { text: new Date(spil.dato).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" }) })] : null,
    );
    const knap = el("a", { class: "knap", href: `#/spil/${slug}/spil`, text: "Spil" });
    const forbedr = repo
      ? el("p", { class: "forbedr" }, "Vil du forbedre spillet? ", el("a", { href: `${repo}/tree/main/games/${slug}`, target: "_blank", rel: "noopener noreferrer", text: `Se games/${slug} på GitHub` }), ", og send en pull request.")
      : el("p", { class: "forbedr" }, "Vil du forbedre spillet? Koden ligger i ", el("code", { text: `games/${slug}` }), ".");
    visning.replaceChildren(
      broed,
      el(
        "div",
        { class: "side" },
        el("div", { class: "side-skaerm" }, skilt(spil.titel), cover(spil), el("p", { class: "skaermtekst", text: SKAERMTEKST })),
        el("div", { class: "side-info" }, el("h1", { text: spil.titel }), el("p", { text: spil.beskrivelse }), tagListe(spil), knap, fakta, forbedr),
      ),
    );
    knap.focus({ preventScroll: true });
  }

  function visLaegDitSpil() {
    document.title = "Læg dit spil i Arkaden";
    saetAktivNav("laeg");
    const trin = [
      ["Byg dit spil", "Bed Claude bygge et spil ud fra games/_skabelon. Claude giver det sin egen mappe, opkaldt efter spillets navn, fx games/stjerneregn."],
      ["Spil det lokalt", "Kør npm start, og åbn spillet i spilhallen. npm test -- <dit-spil> tester reglerne."],
      ["Læg det i Arkaden", "På kurset: sig \"Læg mit spil i Arkaden\" til Claude. Ellers: fork repoet, og send en pull request (se CONTRIBUTING.md)."],
      ["Se det i hallen", "Består robottens tjek, merges din pull request af sig selv. Få minutter efter står spillet i spilhallen for alle."],
    ];
    const trae = el(
      "pre",
      { class: "trae" },
      "games/<dit-spil>/\n",
      "  game.json       ",
      el("em", { text: "titel, type, tags, evt. forfatter" }),
      "\n  index.html      ",
      el("em", { text: "spillet starter her" }),
      "\n  cover.png       ",
      el("em", { text: "valgfrit, 16:9, fx 1280 x 720" }),
      "\n  logic.js        ",
      el("em", { text: "reglerne, uden tegning" }),
      "\n  logic.test.js   ",
      el("em", { text: "tests af reglerne" }),
      "\n  spil.js         ",
      el("em", { text: "tegning og styring" }),
    );
    visning.replaceChildren(
      el("section", { class: "velkommen" }, el("h1", { text: "Læg dit spil i Arkaden" }), el("p", { text: "Hvert spil bor i sin egen mappe. Din pull request rører kun den mappe, så den kommer aldrig i karambolage med de andres." })),
      el("ol", { class: "trin" }, trin.map(([h, p]) => el("li", {}, el("h3", { text: h }), el("p", { text: p })))),
      el(
        "div",
        { class: "to-spalter" },
        el("section", { class: "boks" }, el("h2", { text: "Mappen" }), trae),
        el(
          "section",
          { class: "boks" },
          el("h2", { text: "Det tjekker robotten" }),
          el(
            "ul",
            { class: "tjek" },
            el("li", { text: "Din pull request ændrer kun filer i games/<dit-spil>/, og mappenavnet er ikke taget." }),
            el("li", { text: "game.json er gyldig: titel og en kort beskrivelse, og dit navn, hvis du vil have det på." }),
            el("li", { text: "Dine tests består (npm test -- <dit-spil>)." }),
            el("li", { text: "Er alt grønt, merger robotten din pull request og lægger spilhallen på GitHub Pages." }),
          ),
        ),
      ),
      el("p", { class: "sektion" }, el("a", { class: "knap", href: "#/spil/_skabelon", text: "Prøv skabelonen" })),
    );
  }

  function visInfo(felter) {
    sceneInfo.replaceChildren(
      ...Object.entries(felter || {})
        .slice(0, 3)
        .map(([k, v]) => el("div", {}, el("dt", { text: String(k).slice(0, 20) }), el("dd", { text: String(v).slice(0, 24) }))),
    );
  }

  function startSpil(slug) {
    const spil = efterSlug.get(slug);
    const kilde = spil && typeof spil.start === "string" && spil.start.startsWith(`games/${slug}/`) ? spil.start : `games/${slug}/index.html`;
    stopSpil();
    const titel = spil ? spil.titel : slug;
    document.title = `${titel} · Arkaden`;
    sceneTitel.textContent = titel;
    visInfo(null);
    // Online og med npm start: sandbox="allow-scripts" uden allow-same-origin, så
    // spillet kan køre, men ikke røre hallen, dens lager eller et andet spil.
    // Åbnet direkte som fil (file://) kan en sandkasse ikke hente spillets egne
    // filer. Der springes den over; browseren holder stadig hver fil for sig.
    const sandkasse = location.protocol !== "file:";
    const iframe = el("iframe", { src: kilde, sandbox: sandkasse ? "allow-scripts" : null, title: `Spillet ${titel}` });
    iframe.addEventListener("load", () => iframe.focus());
    sceneRamme.replaceChildren(iframe);
    scene.hidden = false;
    document.body.classList.add("spiller");
    spillerNu = { slug, iframe };
  }

  function stopSpil() {
    if (!spillerNu) return;
    sceneRamme.replaceChildren();
    scene.hidden = true;
    document.body.classList.remove("spiller");
    spillerNu = null;
  }

  function lukSpil() {
    if (!spillerNu) return;
    location.hash = `#/spil/${spillerNu.slug}`;
  }

  // Beskeder fra spillet i sandkassen (se arkade/arkade.js).
  window.addEventListener("message", (e) => {
    if (!spillerNu || e.source !== spillerNu.iframe.contentWindow) return;
    const d = e.data;
    if (!d || d.arkaden !== 1 || typeof d.type !== "string") return;
    const noegle = `arkaden:${spillerNu.slug}:${String(d.noegle || "").slice(0, 60)}`;
    if (d.type === "tilbage") lukSpil();
    else if (d.type === "klar") spillerNu.iframe.focus();
    else if (d.type === "info" && d.felter && typeof d.felter === "object") visInfo(d.felter);
    else if (d.type === "gem") {
      try {
        const json = JSON.stringify(d.vaerdi === undefined ? null : d.vaerdi);
        if (json.length <= MAKS_GEMT) localStorage.setItem(noegle, json);
      } catch (fejl) {
        /* blokeret lager: så gemmes der ikke */
      }
    } else if (d.type === "hent") {
      let vaerdi = null;
      try {
        const raa = localStorage.getItem(noegle);
        vaerdi = raa === null ? null : JSON.parse(raa);
      } catch (fejl) {
        vaerdi = null;
      }
      e.source.postMessage({ arkaden: 1, type: "svar", id: d.id, vaerdi }, "*");
    } else if (d.type === "fejl") console.warn(`Spillet ${spillerNu.slug} gik ned: ${d.besked}`);
  });

  tilbageKnap.addEventListener("click", lukSpil);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && spillerNu) lukSpil();
  });

  function rute() {
    const dele = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    if (dele[0] === "spil" && dele[1] && SLUG.test(dele[1])) {
      if (dele[2] === "spil") return startSpil(dele[1]);
      stopSpil();
      visSide(dele[1]);
    } else if (dele[0] === "laeg-dit-spil") {
      stopSpil();
      visLaegDitSpil();
    } else {
      stopSpil();
      visHal(dele[0] === "alle");
      if (dele[0] === "alle") return;
    }
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", rute);
  rute();
})();
