# Arkaden

En lille spilhal i browseren. Alle spil er gratis, og hvert spil er bygget af en kursist.
Hvert spil bor i sin egen mappe i `games/` og kommer ind i hallen med en pull request.

## Åbn spilhallen

- **Med Node:** `npm start`, og åbn http://localhost:8080. Så dukker nye spil op med det samme.
- **Uden Node:** dobbeltklik på `index.html`. Hallen viser kun de spil, der står i `games/manifest.js`, så et nyt spil åbner du direkte: dobbeltklik på `games/<dit-spil>/index.html`.

Spillet Reaktion (`games/reaktion`) er færdigt og kan spilles med det samme.

## Lav dit eget spil

Bed Claude om det, fx "Byg et nyt spil i Arkaden ud fra skabelonen: en stjerne falder, og jeg fanger den". Claude gør sådan her:

1. Finder et mappenavn ud fra spillets navn: små bogstaver, tal og bindestreger, fx `games/stjerneregn`. Navnet skal være unikt i hallen, så det må ikke findes i forvejen.
2. Kopierer `games/_skabelon` til den nye mappe.
3. Retter `game.json`: titel, en kort beskrivelse, type og tags. Dit navn i `forfatter` er frivilligt, fx `"forfatter": "Lasse"`.
4. Bygger spillet: reglerne i `logic.js`, tegningen i `spil.js`, tests i `logic.test.js`.
5. Kører `npm test -- <dit-spil>` og `npm start`, så du kan spille det.

### Et spil i Arkaden

```
games/<dit-spil>/
  game.json       titel, beskrivelse, type, tags (og evt. forfatter, cover, styring, dato)
  index.html      spillet starter her
  cover.png       valgfrit, 16:9, fx 1280 x 720
  logic.js        reglerne: ingen tegning, så de kan testes
  logic.test.js   tests med node:test
  spil.js         tegning og styring
```

- Mappenavnet er spillets id. Ingen fælles liste at rette i: `npm run games` finder selv spillene og skriver `games/manifest.js`.
- `type` er `action`, `klassiker` eller `rolig`. Det styrer filtrene i hallen.
- Spillet kører i en sandkasse (iframe) i hallen. Brug `arkade.gem()` og `arkade.hent()` i stedet for `localStorage`, og `arkade.info({ Point: "12" })` til tallene i topbjælken. Se toppen af `arkade/arkade.js`.
- Spillet må ikke hente filer fra internettet.

## Læg dit spil i Arkaden

**På kurset:** sig "Læg mit spil i Arkaden" til Claude. Jonas Juhl-connectoren (værktøjet `arkaden_indsend`) spørger, om dit navn skal stå på spillet, tjekker spillet og åbner pull requesten. Ingen fork, ingen git, ingen GitHub-konto.

**Uden for kurset:** fork repoet, og send en pull request fra din fork. Skillen `arkaden-udgiv` (i `udgiv/`) eller prompten i `CONTRIBUTING.md` lader Claude tage alle trinene.

Via connectoren: består robottens tjek, merges pull requesten af sig selv, og spillet står i hallen få minutter efter. Via en fork: en maintainer kigger spillet igennem og merger det i hånden, fordi et spil er kode, der kører på siden for alle. Detaljerne står i `CONTRIBUTING.md`.

## Kommandoer

| Kommando | Hvad den gør |
|---|---|
| `npm start` | Starter spilhallen på http://localhost:8080 |
| `npm test` | Kører alle tests (Nodes egen testløber, ingen pakker) |
| `npm test -- reaktion` | Kører kun testene for ét spil |
| `npm run lint` | Hurtigt tjek for syntaksfejl og fejl i game.json |
| `npm run games` | Skriver spillisten `games/manifest.js` |
| `npm run tjek-pr` | Samme tjek, som GitHub kører på din pull request |

Node 22 eller nyere. Der er ingen pakker at installere. Mangler du Node, kan Claude installere det.

## Mere

- `CONTRIBUTING.md`: sådan kommer dit spil i Arkaden, og hvad robotten tjekker.
- `backlog.md`: ønskelisten med åbne features.
- `CHANGELOG.md`: hvad der er sket.

Vil du have Claude til at spille dine spil automatisk, kan Claude installere Playwright i projektet (`npm install -D @playwright/test`). Det er ikke nødvendigt for at bruge Arkaden.
