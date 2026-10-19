# Læg dit spil i Arkaden

Arkaden er et åbent repo. Dit spil kommer i spilhallen, når din pull request er merget. Består robottens tjek, og rører din pull request kun dit spils egen mappe, merges den af sig selv, og spillet står i hallen få minutter efter.

Hvert spil bor i sin egen mappe `games/<dit-spil>/`. Mappenavnet er spillets id: små bogstaver, tal og bindestreger, lavet ud fra spillets navn, fx `games/stjerneregn`. Det skal være unikt, så to spil aldrig overskriver hinanden. Lad Claude vælge det.

## På kurset: sig det til Claude

Har du Jonas Juhl-connectoren slået til (alle på kurset har), så skriv til Claude:

> Læg mit spil i Arkaden

Claude bruger værktøjet `arkaden_indsend`. Det spørger, om dit navn skal stå på spillet, tjekker spillet og åbner pull requesten for dig. Du behøver ingen fork, ingen git og ingen GitHub-konto. Claude giver dig linket til pull requesten, og når robotten er færdig, står spillet i hallen.

Vil du rette spillet bagefter, så sig det samme igen. Det opdaterer samme pull request, eller laver en ny, hvis den første er merget.

## Uden for kurset: fork og pull request

Uden connectoren går vejen over din egen fork. Du behøver ikke kunne Git: Claude kan tage hvert trin. Vælg én af de to måder herunder. Begge gør det samme.

### Med skillen arkaden-udgiv

Skillen ligger i `udgiv/arkaden-udgiv/` i dette repo. Kopiér mappen til `.claude/skills/` i dit projekt, og sig "Udgiv mit spil i Arkaden" til Claude.

### Med en prompt

Kopiér prompten ind i Claude, mens du står i din Arkaden-mappe. Skriv dit spils mappenavn, hvor der står `[dit-spil]`.

```text
Jeg vil lægge mit spil i games/[dit-spil] i Arkaden. Arkaden er det offentlige repo nerdsatwork/jj-arkaden på GitHub. Gør det her i rækkefølge, og stop og spørg mig, hvis noget fejler:

0. Spørg mig først, om mit navn skal stå på spillet i spilhallen, og hvilket (fornavn er nok). Det er frivilligt. Siger jeg ja, skriver du det i "forfatter" i game.json. Siger jeg nej, fjerner du feltet.
1. Tjek mappen mod reglerne i CONTRIBUTING.md: der er en game.json med titel (højst 40 tegn), forfatter kun hvis jeg har sagt ja (mit navn, højst 40 tegn, ingen e-mail eller link), beskrivelse (højst 140 tegn), type (action, klassiker eller rolig) og højst 5 tags. Der er en index.html, spillet henter intet fra internettet, og et eventuelt cover ligger i mappen og fylder under 1 MB. Kør npm run lint.
2. Kør npm test -- [dit-spil]. Er der ingen tests, så skriv mindst tre tests af reglerne i logic.test.js med node:test, og kør dem igen. Ret fejl, indtil alt er grønt.
3. Tjek, om jeg kan bruge GitHub herfra: enten gh (gh auth status) eller en GitHub-connector. Mangler begge, så hjælp mig med at sætte en af dem op, trin for trin. Installér gh for mig, hvis det er nødvendigt, og lad mig selv logge ind i browseren.
4. Tjek, om games/[dit-spil] allerede findes i nerdsatwork/jj-arkaden på main. Gør den, så find et nyt mappenavn ud fra spillets titel, omdøb mappen her, og kør trin 1 og 2 igen.
5. Fork nerdsatwork/jj-arkaden til min GitHub-konto (hvis jeg ikke allerede har en fork), og hent forken ned i en ny mappe ved siden af denne. Tilføj nerdsatwork/jj-arkaden som remote "upstream".
6. Lav en branch fra upstream/main, der hedder indsend/[dit-spil]. Kopiér KUN mappen games/[dit-spil] over i forken. Ingen andre filer må ændres, heller ikke games/manifest.js eller games/manifest.json.
7. Kør node scripts/tjek-pr.js upstream/main i forken. Det er det samme tjek, som GitHub kører på min pull request. Det skal ende med "✓ Klar".
8. Commit med beskeden "Nyt spil: [titel fra game.json]", og push branchen til min fork.
9. Åbn en pull request mod nerdsatwork/jj-arkaden main. Udfyld PR-skabelonen fra .github/pull_request_template.md: mappe, titel, én sætning om spillet, og sæt kryds ved de punkter i tjeklisten, du har tjekket. Lad billede-feltet stå tomt.
10. Giv mig linket til pull requesten, og fortæl mig, hvad der sker nu: robotten tjekker den, og er tjekket grønt, merges den af sig selv, og spillet står i spilhallen få minutter efter.

Pull requesten viser den GitHub-konto, jeg er logget ind med. Navnet i spilhallen kommer kun fra game.json. Skriv ikke andet personligt nogen steder.
```

Første gang en konto sender en pull request til Arkaden, skal en maintainer måske godkende, at robotten må køre.

## Det tjekker robotten

Når du sender en pull request, kører GitHub `npm run tjek-pr`. Den består, når:

- PR'en **kun** ændrer filer i `games/<dit-spil>/`. Så kommer mange PR'er aldrig i karambolage.
- Mappenavnet er ikke taget. Findes `games/<dit-spil>` allerede i hallen, er PR'en kun gyldig som en opdatering fra branchen `indsend/<dit-spil>` i Arkaden selv, som er den, connectoren bruger.
- `game.json` er gyldig: titel (højst 40 tegn), dit navn, hvis du har skrevet det (højst 40 tegn, ingen e-mail eller link), en beskrivelse (højst 140 tegn), højst 5 tags, og et eventuelt cover findes i mappen og fylder under 1 MB.
- Dine tests består (`npm test -- <dit-spil>`).

Kør det selv først: `npm run tjek-pr`.

Er tjekket grønt, merger robotten (`.github/workflows/auto-merge.yml`) din pull request med squash, bygger spillisten og lægger spilhallen på GitHub Pages. Robotten merger aldrig noget uden for `games/`.

## Husregler

- Ét spil pr. pull request, og kun i dit spils egen mappe.
- Ingen filer fra internettet (CDN, analytics, fonte udefra i spillet).
- Intet personligt i koden. Dit navn i `game.json` er frivilligt, og står det der, bliver det offentligt.
- En pull request fra en fork viser den GitHub-konto, du sender den fra. Med connectoren er det Arkadens robot.
- Vær sød ved hinanden. Vi spiller hinandens spil.

## Vil du ændre selve hallen?

Ændringer i `arkade/`, `index.html`, `scripts/`, `udgiv/` eller `.github/` er fælles. Lav et issue først, og send dem som en PR for sig, uden spil i. De merges aldrig automatisk: en maintainer kigger på dem.
