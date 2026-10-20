// Spilhallen: forsiden med det udvalgte spil og hylder, alle spil med filtre,
// en side pr. spil, siden om at lægge sit eget spil i Arkaden, og selve
// spillet i en sandkasse (iframe). Alle spil er gratis. Spillene kommer fra
// games/manifest.js, som npm run games (og GitHub Actions) laver ud fra
// mapperne i games/. Du behøver ikke røre denne fil for at lave et spil.
//
// Bevægelse: kun transform og opacity. Ved prefers-reduced-motion står alt
// stille. Tekst, der først er vist, bliver på skærmen.

(function () {
  "use strict";

  const SLUG = /^[a-z0-9_](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
  const MAKS_GEMT = 10000; // tegn pr. gemt værdi
  const TYPER = [
    ["action", "Action", "Action"],
    ["klassiker", "Klassiker", "Klassikere"],
    ["rolig", "Rolig", "Rolige spil"],
  ];

  const manifest = window.ARKADEN_MANIFEST && Array.isArray(window.ARKADEN_MANIFEST.spil) ? window.ARKADEN_MANIFEST : null;
  const alleSpil = manifest ? manifest.spil.filter((s) => s && SLUG.test(s.slug)) : [];
  const efterSlug = new Map(alleSpil.map((s) => [s.slug, s]));
  const repo = manifest && typeof manifest.repo === "string" && /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(manifest.repo) ? manifest.repo : null;

  const visning = document.getElementById("visning");
  const top = document.getElementById("top");
  const scene = document.getElementById("scene");
  const sceneTitel = document.getElementById("scene-titel");
  const sceneInfo = document.getElementById("scene-info");
  const sceneRamme = document.getElementById("scene-ramme");
  const tilbageKnap = document.getElementById("tilbage");

  if (repo) {
    for (const id of ["top-repo", "fod-repo"]) document.getElementById(id).href = repo;
  }

  let filter = null; // { art: "type" | "tag", vaerdi }
  let spillerNu = null; // { slug, iframe }
  let flyvFra = null; // { rect, cover } fra det kort eller den skærm, spillet blev startet fra
  let foersteVisning = true;

  const stille = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const kanSvaeve = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;

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

  // Ikoner tegnet med streger (24 x 24).
  const IKONER = {
    spil: '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none"/>',
    venstre: '<path d="M15 18l-6-6 6-6"/>',
    hoejre: '<path d="M9 6l6 6-6 6"/>',
    byg: '<path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z"/><path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z"/>',
    proev: '<path d="M7 6h10a5 5 0 015 5v3a3.5 3.5 0 01-6.3 2.1L14.2 15H9.8l-1.5 1.1A3.5 3.5 0 012 14v-3a5 5 0 015-5z"/><path d="M7 9.5v4M5 11.5h4"/><path d="M15.5 10.5h.01M17.5 12.5h.01"/>',
    send: '<path d="M21 11.5a8.5 8.5 0 01-12.4 7.6L3.5 20.5l1.5-4.6A8.5 8.5 0 1121 11.5z"/><path d="M8.5 11.5h.01M12.5 11.5h.01M16.5 11.5h.01"/>',
    hal: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    person: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>',
    styring: '<rect x="2.5" y="6.5" width="19" height="11" rx="2"/><path d="M6.5 10.5h.01M10 10.5h.01M13.5 10.5h.01M17.5 10.5h.01M8 14h8"/>',
    kalender: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    kode: '<path d="M9 7l-5 5 5 5M15 7l5 5-5 5"/>',
  };

  function ikon(navn) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("class", "ikon");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.8");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.innerHTML = IKONER[navn]; // faste strenge herfra, aldrig tekst fra et spil
    return svg;
  }

  function typeNavn(type) {
    const t = TYPER.find(([id]) => id === type);
    return t ? t[1] : null;
  }

  function hashAf(tekst) {
    let hash = 0;
    for (const c of String(tekst)) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
    return hash;
  }

  // Spillets egen kulør. Den farver coveret (hvis det mangler) og lyset omkring.
  function hue(spil) {
    return hashAf(spil.slug) % 360;
  }

  function linje(spil) {
    return String(spil.beskrivelse || "").trim();
  }

  // Et cover lavet i CSS ud fra spillets navn, når spillet ikke selv har et.
  function lavCover(spil, medTitel) {
    const hash = hashAf(spil.slug);
    const former = [];
    for (let i = 0; i < 3; i++) {
      const art = ["form-rund", "form", "form-ring"][(hash >>> (i * 3)) % 3];
      const x = 52 + ((hash >>> (i * 4)) % 42);
      const y = 18 + ((hash >>> (i * 5 + 2)) % 50);
      const s = 10 + ((hash >>> (i * 3 + 1)) % 20);
      former.push(el("span", { class: `form ${art}`, style: `--x:${x}%;--y:${y}%;--s:${s}cqw;--o:${(0.95 - i * 0.25).toFixed(2)}` }));
    }
    return el(
      "div",
      { class: "cover cover-auto", role: "img", "aria-label": `Cover til ${spil.titel || spil.slug}` },
      el("span", { class: "form form-gulv" }),
      former,
      medTitel ? el("span", { class: "cover-titel", "aria-hidden": "true", text: spil.titel || spil.slug }) : null,
    );
  }

  function cover(spil, { medTitel = true, alt = true } = {}) {
    const boks = el("div", { class: "cover-boks", style: `--h:${hue(spil)}` });
    if (spil.cover && typeof spil.cover === "string" && spil.cover.startsWith(`games/${spil.slug}/`)) {
      const img = el("img", { class: "cover", src: spil.cover, alt: alt ? `Cover til ${spil.titel}` : "", loading: "lazy", decoding: "async", width: 1280, height: 720 });
      img.addEventListener("error", () => img.replaceWith(lavCover(spil, medTitel)), { once: true });
      boks.append(img);
    } else {
      const auto = lavCover(spil, medTitel);
      if (!alt) {
        auto.removeAttribute("role");
        auto.removeAttribute("aria-label");
      }
      boks.append(auto);
    }
    return boks;
  }

  // Titlen delt op i ord og tegn, så bogstaverne kan rejse sig ét ad gangen.
  // Skærmlæsere får hele titlen; tegnene er skjult for dem.
  function rejsTitel(tag, tekst, klasse) {
    const ord = String(tekst).split(/\s+/).filter(Boolean);
    let t = 0;
    const h = el(tag, { class: klasse, "aria-label": tekst });
    ord.forEach((o, i) => {
      if (i) h.append(" ");
      h.append(el("span", { class: "ord", "aria-hidden": "true" }, [...o].map((c) => el("span", { class: "tegn", style: `--t:${t++}`, text: c }))));
    });
    // Lange ord skal kunne stå på én linje i spalten, så de får en mindre skrift.
    const laengst = Math.max(0, ...ord.map((o) => o.length));
    if (laengst >= 12) h.classList.add("lang", "ekstra-lang");
    else if (laengst >= 8 || String(tekst).length > 16) h.classList.add("lang");
    return h;
  }

  // Kort med 3D-hældning efter musen (kun med mus, og kun når bevægelse er ok).
  function haeld(flade) {
    // Højst én opdatering pr. billede, uanset hvor mange musebevægelser der kommer.
    let naeste = null;
    flade.addEventListener("pointermove", (e) => {
      if (stille() || !kanSvaeve()) return;
      const sidst = naeste;
      naeste = e;
      if (sidst) return;
      requestAnimationFrame(() => {
        const ev = naeste;
        naeste = null;
        if (!ev) return;
        const r = flade.getBoundingClientRect();
        const x = (ev.clientX - r.left) / r.width - 0.5;
        const y = (ev.clientY - r.top) / r.height - 0.5;
        flade.style.setProperty("--ry", `${(x * 9).toFixed(2)}deg`);
        flade.style.setProperty("--rx", `${(-y * 7).toFixed(2)}deg`);
      });
    });
    flade.addEventListener("pointerleave", () => {
      flade.style.removeProperty("--ry");
      flade.style.removeProperty("--rx");
    });
  }

  function kort(spil, i) {
    const flade = el("div", { class: "kort-flade" }, cover(spil), el("span", { class: "kort-play", "aria-hidden": "true" }, ikon("spil")));
    haeld(flade);
    return el(
      "a",
      { class: "kort afsloer", href: `#/spil/${spil.slug}`, style: `--h:${hue(spil)};--i:${Math.min(i || 0, 8)}` },
      flade,
      el("span", { class: "kort-tekst" }, el("span", { class: "kort-titel", text: spil.titel }), linje(spil) ? el("span", { class: "kort-linje", text: linje(spil) }) : null),
    );
  }

  function ledigKort(i) {
    return el(
      "a",
      { class: "ledig-kort afsloer", href: "#/laeg-dit-spil", style: `--i:${Math.min(i, 8)}` },
      el("div", { class: "ledig-slot" }, el("span", { "aria-hidden": "true", text: "+" })),
      el("span", { class: "kort-tekst" }, el("span", { class: "kort-titel", text: "Dit spil her" }), el("span", { class: "kort-linje", text: "Læg dit spil i Arkaden" })),
    );
  }

  function tagListe(spil) {
    const type = typeNavn(spil.type);
    const tags = Array.isArray(spil.tags) ? spil.tags.slice(0, 5) : [];
    if (!type && tags.length === 0) return null;
    return el(
      "ul",
      { class: "tags", "aria-label": "Tags" },
      type ? el("li", { class: "tag tag-type", text: type }) : null,
      tags.map((t) => el("li", { class: "tag", text: String(t) })),
    );
  }

  function spilKnap(slug, tekst) {
    return el("a", { class: "knap knap-spil", href: `#/spil/${slug}/spil`, "data-spil": slug }, el("span", { class: "play" }, ikon("spil")), tekst || "Spil nu");
  }

  // Kabinettet: skærmen med lamper hele vejen rundt.
  function kabinet(spil) {
    return el("div", { class: "kabinet", "data-flyv": spil.slug }, el("div", { class: "skaerm" }, cover(spil, { medTitel: false })), el("span", { class: "lamper", "aria-hidden": "true" }));
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

  function nyesteFoerst(liste) {
    return [...liste].sort((a, b) => String(b.dato || "").localeCompare(String(a.dato || "")) || a.slug.localeCompare(b.slug));
  }

  // Afsløring, når et element ruller ind. Klassen fjernes aldrig igen.
  let iagttager = null;
  function afsloerAlt(rod) {
    const elementer = rod.querySelectorAll(".afsloer:not(.vist), .trin:not(.vist)");
    if (stille() || !("IntersectionObserver" in window)) {
      for (const e of elementer) e.classList.add("vist");
      return;
    }
    if (!iagttager) {
      iagttager = new IntersectionObserver(
        (poster) => {
          for (const p of poster) {
            if (!p.isIntersecting) continue;
            p.target.classList.add("vist");
            iagttager.unobserve(p.target);
          }
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
      );
    }
    for (const e of elementer) iagttager.observe(e);
  }

  // En hylde: en vandret række kort med pile på en computer.
  function hylde(titel, liste, seAlle, stor) {
    const id = `h-${hashAf(titel)}`;
    const spor = el("div", { class: `spor${stor ? " spor-stor" : ""}`, role: "list" }, liste.map((s, i) => el("div", { role: "listitem", class: "spor-plads" }, kort(s, i))));
    const venstre = el("button", { class: "pil", type: "button", "aria-label": `Rul ${titel} til venstre`, disabled: true }, ikon("venstre"));
    const hoejre = el("button", { class: "pil", type: "button", "aria-label": `Rul ${titel} til højre` }, ikon("hoejre"));
    const rul = (retning) => spor.scrollBy({ left: retning * spor.clientWidth * 0.9, behavior: stille() ? "auto" : "smooth" });
    venstre.addEventListener("click", () => rul(-1));
    hoejre.addEventListener("click", () => rul(1));
    const opdater = () => {
      venstre.disabled = spor.scrollLeft < 4;
      hoejre.disabled = spor.scrollLeft + spor.clientWidth >= spor.scrollWidth - 4;
    };
    spor.addEventListener("scroll", opdater, { passive: true });
    requestAnimationFrame(opdater);
    return el(
      "section",
      { class: "hylde", "aria-labelledby": id },
      el("div", { class: "hylde-top" }, el("h2", { id, text: titel }), el("div", { class: "hylde-styr" }, seAlle ? el("a", { class: "se-alle", href: seAlle, text: "Se alle" }) : null, venstre, hoejre)),
      spor,
    );
  }

  // Helten: det udvalgte spil i et kabinet. Skiftes kun, når nogen vælger et
  // andet spil, så teksten aldrig forsvinder af sig selv.
  function helt(udvalgte, ugens) {
    const sektion = el("section", { class: "helt", "aria-label": "Udvalgte spil" });
    let valgt = 0;

    function byg(medIndgang) {
      const spil = udvalgte[valgt];
      sektion.style.setProperty("--h", hue(spil));
      const knapper = udvalgte.length > 1
        ? el(
            "div",
            { class: "helt-valg", role: "group", "aria-label": "Vælg et udvalgt spil" },
            udvalgte.map((s, i) =>
              el(
                "button",
                {
                  class: "valg",
                  type: "button",
                  style: `--h:${hue(s)}`,
                  "aria-current": String(i === valgt),
                  onclick: () => {
                    if (i === valgt) return;
                    valgt = i;
                    byg(true);
                    sektion.querySelector(`.valg[aria-current="true"]`).focus({ preventScroll: true });
                  },
                },
                cover(s, { medTitel: false, alt: false }),
                s.titel,
              ),
            ),
          )
        : null;
      sektion.classList.remove("spil-ind");
      sektion.replaceChildren(
        el("div", { class: "helt-lys", "aria-hidden": "true" }, cover(spil, { medTitel: false, alt: false })),
        el("div", { class: "helt-gitter", "aria-hidden": "true" }),
        el(
          "div",
          { class: "ramme" },
          el(
            "div",
            { class: "helt-indre" },
            el(
              "div",
              { class: "helt-tekst" },
              el("span", { class: "helt-maerke" }, el("span", { class: "lampe" }), spil === ugens ? "Ugens spil" : "Nyt i hallen"),
              rejsTitel("h1", spil.titel, "helt-titel"),
              linje(spil) ? el("p", { class: "helt-linje", text: linje(spil) }) : null,
              el("div", { class: "helt-knapper" }, spilKnap(spil.slug), el("a", { class: "knap knap-stille", href: `#/spil/${spil.slug}`, text: "Om spillet" })),
            ),
            el("div", { class: "helt-skaerm" }, kabinet(spil)),
          ),
          knapper,
        ),
      );
      if (medIndgang && !stille()) {
        void sektion.offsetWidth; // start sekvensen forfra
        sektion.classList.add("spil-ind");
      }
      parallakse(sektion);
    }

    byg(true);
    return sektion;
  }

  // Skærmen drejer en smule efter musen.
  function parallakse(sektion) {
    const kab = sektion.querySelector(".kabinet");
    if (!kab) return;
    let naeste = null;
    sektion.onpointermove = (e) => {
      if (stille() || !kanSvaeve()) return;
      const sidst = naeste;
      naeste = e;
      if (sidst) return;
      requestAnimationFrame(() => {
        const ev = naeste;
        naeste = null;
        if (!ev) return;
        const x = ev.clientX / window.innerWidth - 0.5;
        const y = ev.clientY / window.innerHeight - 0.5;
        kab.style.setProperty("--ry", `${(-9 + x * 8).toFixed(2)}deg`);
        kab.style.setProperty("--rx", `${(3 - y * 6).toFixed(2)}deg`);
      });
    };
    sektion.onpointerleave = () => {
      kab.style.removeProperty("--ry");
      kab.style.removeProperty("--rx");
    };
  }

  function ledigBanner() {
    return el(
      "section",
      { class: "ledig-banner afsloer", "aria-labelledby": "h-ledig" },
      el("div", {}, el("h2", { id: "h-ledig", text: "Dit spil kan stå her" }), el("p", { text: "Byg det med Claude. Læg det i hallen." }), el("a", { class: "knap", href: "#/laeg-dit-spil", text: "Læg dit spil i Arkaden" })),
      el("div", { class: "ledig-slot", "aria-hidden": "true" }, el("span", { text: "+" })),
    );
  }

  function visHal() {
    document.title = "Arkaden: spilhallen";
    saetAktivNav("hal");
    const ugens = ugensSpil();
    const nyeste = nyesteFoerst(alleSpil);
    const udvalgte = ugens ? [ugens, ...nyeste.filter((s) => s !== ugens)].slice(0, 5) : [];

    const hylder = [];
    if (alleSpil.length) hylder.push(hylde("Nyeste", nyeste.slice(0, 12), "#/alle", alleSpil.length <= 6));
    if (alleSpil.length >= 6) {
      for (const [id, , flertal] of TYPER) {
        const af = nyeste.filter((s) => s.type === id);
        if (af.length >= 2) hylder.push(hylde(flertal, af, `#/alle/type/${id}`));
      }
    }

    document.body.classList.toggle("har-scene-top", udvalgte.length > 0);
    visning.replaceChildren(
      ...[
        udvalgte.length ? helt(udvalgte, ugens) : null,
        el("div", { class: "ramme" }, manifest ? null : manglerManifest(), manifest && !alleSpil.length ? el("p", { class: "tom", text: "Hallen er tom. Bliv den første." }) : null, hylder, ledigBanner()),
      ].filter(Boolean),
    );
  }

  function tagsI(liste) {
    const antal = new Map();
    for (const s of liste) for (const t of Array.isArray(s.tags) ? s.tags : []) antal.set(String(t), (antal.get(String(t)) || 0) + 1);
    return [...antal].filter(([, n]) => n > 1 || liste.length < 6).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "da")).slice(0, 8).map(([t]) => t);
  }

  function visAlle(dele) {
    document.title = "Alle spil · Arkaden";
    saetAktivNav("alle");
    document.body.classList.remove("har-scene-top");
    if (dele[1] === "type" && TYPER.some(([id]) => id === dele[2])) filter = { art: "type", vaerdi: dele[2] };
    else if (dele[1] === "tag" && dele[2]) filter = { art: "tag", vaerdi: decodeURIComponent(dele[2]) };
    else filter = null;

    const gitter = el("div", { class: "gitter" });
    const passer = (s) => !filter || (filter.art === "type" ? s.type === filter.vaerdi : Array.isArray(s.tags) && s.tags.map(String).includes(filter.vaerdi));
    function fyld() {
      const synlige = nyesteFoerst(alleSpil).filter(passer);
      gitter.replaceChildren(...synlige.map((s, i) => kort(s, i)), ledigKort(synlige.length));
      afsloerAlt(gitter);
    }

    const valg = [
      [null, "Alle"],
      ...TYPER.filter(([id]) => alleSpil.some((s) => s.type === id)).map(([id, navn]) => [{ art: "type", vaerdi: id }, navn]),
    ];
    const tags = tagsI(alleSpil).map((t) => [{ art: "tag", vaerdi: t }, t]);
    const ens = (a, b) => (a === null || b === null ? a === b : a.art === b.art && a.vaerdi === b.vaerdi);
    const chips = el("div", { class: "chips", role: "group", "aria-label": "Filtrér spil" });
    const chip = ([f, navn]) =>
      el("button", {
        class: "chip",
        type: "button",
        "aria-pressed": String(ens(filter, f)),
        text: navn,
        onclick: () => {
          filter = f;
          for (const b of chips.querySelectorAll(".chip")) b.setAttribute("aria-pressed", String(b === chipKnapper.get(f)));
          const sti = f ? `#/alle/${f.art}/${encodeURIComponent(f.vaerdi)}` : "#/alle";
          history.replaceState(null, "", sti);
          fyld();
        },
      });
    const chipKnapper = new Map();
    for (const v of valg) {
      const b = chip(v);
      chipKnapper.set(v[0], b);
      chips.append(b);
    }
    if (tags.length) {
      chips.append(el("span", { class: "chip-skil", "aria-hidden": "true" }));
      for (const v of tags) {
        const b = chip(v);
        chipKnapper.set(v[0], b);
        chips.append(b);
      }
    }
    // Filteret fra adressen er et nyt objekt: brug chippens eget, så knapperne kan findes igen.
    for (const [f] of chipKnapper) if (ens(filter, f)) filter = f;

    const titel = rejsTitel("h1", "Alle spil", null);
    titel.append(el("span", { class: "tal", "aria-hidden": "true", text: String(alleSpil.length) }));
    titel.setAttribute("aria-label", `Alle spil, ${alleSpil.length}`);
    const sideTop = el("div", { class: "side-top" }, titel);
    if (!stille()) sideTop.classList.add("spil-ind");
    fyld();
    visning.replaceChildren(el("div", { class: "ramme" }, manifest ? null : manglerManifest(), sideTop, alleSpil.length ? chips : null, gitter));
  }

  function visSide(slug) {
    const spil = efterSlug.get(slug) || { slug, titel: slug, ukendt: true };
    saetAktivNav(null);
    document.body.classList.add("har-scene-top");
    document.title = `${spil.titel} · Arkaden`;

    const fakta = [];
    if (spil.forfatter) fakta.push(el("li", {}, ikon("person"), `Lavet af ${spil.forfatter}`));
    if (spil.styring) fakta.push(el("li", {}, ikon("styring"), spil.styring));
    if (spil.dato && !Number.isNaN(Date.parse(spil.dato)))
      fakta.push(el("li", {}, ikon("kalender"), new Date(spil.dato).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" })));
    if (!spil.ukendt) fakta.push(el("li", {}, ikon("kode"), repo ? el("a", { href: `${repo}/tree/main/games/${slug}`, target: "_blank", rel: "noopener noreferrer", text: "Koden på GitHub" }) : el("code", { text: `games/${slug}` })));

    const knap = spilKnap(slug);
    const info = el(
      "div",
      { class: "detalje-info" },
      rejsTitel("h1", spil.titel, null),
      spil.ukendt
        ? el("p", {}, "Ikke i spillisten endnu. Kør ", el("code", { text: "npm run games" }), ".")
        : linje(spil)
          ? el("p", { text: linje(spil) })
          : null,
      knap,
      spil.ukendt ? null : tagListe(spil),
      fakta.length ? el("ul", { class: "fakta" }, fakta) : null,
    );
    const detalje = el(
      "section",
      { class: "detalje", style: `--h:${hue(spil)}` },
      el("div", { class: "helt-lys", "aria-hidden": "true" }, cover(spil, { medTitel: false, alt: false })),
      el(
        "div",
        { class: "ramme" },
        el("a", { class: "tilbage-link", href: "#/" }, ikon("venstre"), "Spilhallen"),
        el("div", { class: "detalje-indre" }, el("div", { class: "helt-skaerm" }, kabinet(spil)), info),
      ),
    );
    if (!stille()) detalje.classList.add("spil-ind");

    const mere = nyesteFoerst(alleSpil.filter((s) => s.slug !== slug)).sort((a, b) => (b.type === spil.type) - (a.type === spil.type));
    visning.replaceChildren(detalje, el("div", { class: "ramme" }, mere.length ? hylde("Mere i hallen", mere.slice(0, 10), "#/alle") : null));
    knap.focus({ preventScroll: true });
  }

  function visLaegDitSpil() {
    document.title = "Læg dit spil i Arkaden";
    saetAktivNav("laeg");
    document.body.classList.remove("har-scene-top");
    const trin = [
      ["byg", "Byg", "Bed Claude om et spil ud fra skabelonen."],
      ["proev", "Prøv", "Kør npm start, og spil det selv."],
      ["send", "Send", el("span", {}, "Sig ", el("span", { class: "trin-cit", text: "“Læg mit spil i Arkaden”" }), " til Claude.")],
      ["hal", "Spil", "Det dukker op i hallen af sig selv."],
    ];
    const top = el("div", { class: "laeg-top" }, rejsTitel("h1", "Dit spil i hallen", null), el("p", { text: "Fra idé til spilhal på fire trin." }));
    if (!stille()) top.classList.add("spil-ind");
    visning.replaceChildren(
      el(
        "div",
        { class: "ramme" },
        top,
        el(
          "ol",
          { class: "trin" },
          trin.map(([ik, h, p], i) => el("li", { class: "afsloer", style: `--i:${i * 2}` }, el("span", { class: "trin-ikon" }, ikon(ik)), el("h2", { text: h }), el("p", {}, p))),
        ),
        el(
          "p",
          { class: "laeg-note afsloer" },
          el("span", { class: "lampe", "aria-hidden": "true" }),
          el("span", { text: "På kurset merges spillet af sig selv, når robottens tjek er grønt. Spil fra en fork ser en maintainer igennem først." }),
        ),
        el(
          "div",
          { class: "laeg-knapper afsloer" },
          spilKnap("_skabelon", "Prøv skabelonen"),
          repo ? el("a", { class: "knap knap-stille", href: `${repo}/blob/main/CONTRIBUTING.md`, target: "_blank", rel: "noopener noreferrer", text: "Hele guiden" }) : null,
        ),
      ),
    );
  }

  function visInfo(felter) {
    sceneInfo.replaceChildren(
      ...Object.entries(felter || {})
        .slice(0, 3)
        .map(([k, v]) => el("div", {}, el("dt", { text: String(k).slice(0, 20) }), el("dd", { text: String(v).slice(0, 24) }))),
    );
  }

  // Spillet åbner fra sit cover: et spejlbillede flyver op og fylder skærmen,
  // og scenen tænder bag det.
  function flyvOp() {
    const fra = flyvFra;
    flyvFra = null;
    if (stille() || !scene.animate) return;
    if (!fra) {
      scene.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: "ease-out" });
      return;
    }
    const { rect, kilde } = fra;
    // Selve spilvinduet flyver: det kørende spil har allerede sin endelige
    // størrelse og skaleres op fra coveret til sin plads midt på scenen.
    // Coverets spejlbillede flyver med og toner ud undervejs, så det er
    // spillets egen skærm, der lander, og intet skifter størrelse bagefter.
    const vindue = sceneRamme.querySelector("iframe");
    if (!vindue) return;
    const maal = vindue.getBoundingClientRect();
    const spejl = el("div", { class: "flyv", "aria-hidden": "true", style: `left:${maal.left}px;top:${maal.top}px;width:${maal.width}px;height:${maal.height}px` }, kilde.cloneNode(true));
    document.body.append(spejl);
    const fraCover = `translate(${rect.left - maal.left}px, ${rect.top - maal.top}px) scale(${rect.width / maal.width}, ${rect.height / maal.height})`;
    const tur = { duration: 620, easing: "cubic-bezier(0.7, 0, 0.2, 1)" };
    spejl.animate([{ transform: fraCover }, { transform: "none" }], { ...tur, fill: "forwards" });
    spejl.animate([{ opacity: 1 }, { opacity: 1, offset: 0.35 }, { opacity: 0, offset: 0.8 }, { opacity: 0 }], { duration: 620, fill: "forwards" }).finished.then(() => spejl.remove(), () => spejl.remove());
    vindue.animate([{ transform: fraCover }, { transform: "none" }], tur);
    scene.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: "ease-out" });
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
    flyvOp();
    // Gem hallen væk, når flyveturen er landet, så kun spillet bruger kraft.
    setTimeout(() => {
      if (spillerNu && spillerNu.iframe === iframe) document.body.classList.add("skjul-hal");
    }, stille() ? 0 : 900);
  }

  function stopSpil() {
    if (!spillerNu) return;
    sceneRamme.replaceChildren();
    scene.hidden = true;
    document.body.classList.remove("spiller", "skjul-hal");
    spillerNu = null;
  }

  function lukSpil() {
    if (!spillerNu) return;
    location.hash = `#/spil/${spillerNu.slug}`;
  }

  // Husk, hvilket cover en Spil-knap hører til, så spillet kan åbne fra det.
  document.addEventListener("click", (e) => {
    const knap = e.target.closest && e.target.closest("a[data-spil]");
    if (!knap) return;
    const slug = knap.dataset.spil;
    const kab = document.querySelector(`[data-flyv="${CSS.escape(slug)}"] .skaerm`);
    const r = kab && kab.getBoundingClientRect();
    flyvFra = r && r.width > 0 && r.bottom > 0 && r.top < window.innerHeight ? { rect: r, kilde: kab.querySelector(".cover-boks") } : null;
  });

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

  // Glasset i topbjælken bliver tæt, når man ruller.
  const rullet = () => top.classList.toggle("rullet", window.scrollY > 24);
  window.addEventListener("scroll", rullet, { passive: true });

  // Sideskift: den nye side glider blødt ind.
  function sideInd() {
    if (foersteVisning || stille() || !visning.animate) return;
    visning.animate([{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }], { duration: 480, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
  }

  function rute() {
    const dele = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    if (dele[0] === "spil" && dele[1] && SLUG.test(dele[1])) {
      if (dele[2] === "spil") return startSpil(dele[1]);
      const fraSpil = spillerNu && spillerNu.slug === dele[1] && visning.querySelector(".detalje");
      stopSpil();
      if (fraSpil) {
        // Tilbage fra spillet til samme side: lad den stå, og giv Spil-knappen fokus.
        const knap = fraSpil.querySelector("a[data-spil]");
        if (knap) knap.focus({ preventScroll: true });
        return;
      }
      visSide(dele[1]);
    } else if (dele[0] === "laeg-dit-spil") {
      stopSpil();
      visLaegDitSpil();
    } else if (dele[0] === "alle") {
      stopSpil();
      visAlle(dele);
    } else {
      stopSpil();
      visHal();
    }
    window.scrollTo(0, 0);
    rullet();
    afsloerAlt(visning);
    sideInd();
    foersteVisning = false;
  }

  window.addEventListener("hashchange", rute);
  rute();
})();
