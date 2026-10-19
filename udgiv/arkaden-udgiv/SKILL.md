---
name: arkaden-udgiv
description: Udgiv et mini-spil fra games/<slug> i det offentlige Arkaden-repo med en fork og en pull request. Tjekker game.json, at mappenavnet ikke er taget, at kun spillets egen mappe er med, og at testene består. Brug når brugeren vil udgive, indsende, dele eller lægge sit spil i Arkaden og IKKE har Jonas Juhl-connectoren (værktøjet arkaden_indsend). Har brugeren connectoren, så brug den i stedet.
---

# Udgiv et spil i Arkaden (fork og pull request)

Arkaden er det offentlige repo `nerdsatwork/jj-arkaden`. Et spil kommer i spilhallen, når dets pull request er merget. Består robottens tjek, og rører PR'en kun spillets egen mappe, merges den automatisk, og spillet står i hallen få minutter efter.

Har brugeren Jonas Juhl-connectoren med værktøjet `arkaden_indsend` (alle på kurset har), så stop her og brug værktøjet: det kræver hverken fork, git eller GitHub. Denne skill er vejen for alle andre.

Gå trinene igennem i rækkefølge. Stop og forklar brugeren, hvad der mangler, hvis et trin fejler. Spring aldrig et tjek over for at nå frem. Brugeren er ikke udvikler: forklar kort og på dansk, hvad du gør, og bed om lov, før du installerer noget eller skriver til GitHub.

## 1. Find spillet

Spillet er en mappe `games/<slug>/` i brugerens Arkaden-mappe. Har brugeren ikke sagt hvilket, så list mapperne i `games/` (spring `_skabelon` og `reaktion` over), og spørg.

## 2. Tjek mappen

Kør hjælperen, der følger med skillen:

```bash
node <skill-mappe>/scripts/tjek-spil.mjs games/<slug>
```

Den tjekker game.json (titel, beskrivelse, type, tags, cover, og forfatter = et navn på højst 40 tegn uden e-mail eller link, hvis feltet er der), at `index.html` findes, og at intet hentes fra internettet. Ret fejlene sammen med brugeren, og kør den igen, til den siger ✓.

Navnet er frivilligt: spørg brugeren, om deres navn skal stå på spillet i spilhallen, og hvilket (fornavn er nok). Ja: skriv det i `forfatter`. Nej: fjern feltet. Sig også, at pull requesten viser den GitHub-konto, de er logget ind med.

Findes `npm run lint` i projektet, så kør den også.

## 3. Kør testene

```bash
npm test -- <slug>
```

Er der ingen `*.test.js` i mappen, så skriv mindst tre tests af spillets regler (i `logic.test.js` med `node:test`), og kør igen. Testene skal være grønne, før du går videre. Mangler Node, så hjælp brugeren med at installere Node 22 eller nyere.

## 4. GitHub-adgang

Tjek i denne rækkefølge:

1. `gh auth status`. Virker den, så brug `gh`.
2. Ellers: har du en GitHub-connector (værktøjer til repos og pull requests), så brug den.
3. Ellers: hjælp brugeren med at installere `gh` (fx `winget install GitHub.cli` på Windows, `brew install gh` på Mac), og kør `gh auth login --web`, så brugeren selv logger ind i browseren. Bed aldrig om et password eller et token i chatten.

## 5. Er navnet ledigt?

Mappenavnet er spillets id i hallen og skal være unikt. Tjek, om det er taget:

```bash
gh api repos/nerdsatwork/jj-arkaden/contents/games/<slug>/game.json --silent && echo taget || echo ledigt
```

Er det taget, så find et nyt navn ud fra spillets titel (små bogstaver, tal og bindestreger, fx `stjerneregn-2` eller `stjerneregn-lasse`), omdøb mappen lokalt, og kør trin 2 og 3 igen. Et spil, der allerede er i hallen, kan ikke opdateres fra en fork; det kræver connectoren eller en maintainer.

## 6. Fork og branch

Med `gh`:

```bash
gh repo fork nerdsatwork/jj-arkaden --clone --remote -- ../arkaden-fork
cd ../arkaden-fork
git fetch upstream
git switch -c indsend/<slug> upstream/main
```

Har brugeren allerede en fork, så genbrug den (`gh repo clone <bruger>/arkaden`, og tilføj `upstream`). Én branch pr. spil, så flere kan sende spil fra samme konto.

## 7. Kun spillets egen mappe

Kopiér KUN `games/<slug>/` fra brugerens mappe ind i forkens `games/<slug>/`. Ingen andre filer: ikke `games/manifest.js` eller `games/manifest.json`, ikke `arkade/`, ikke `package.json`. Rører PR'en noget uden for spillets mappe, merges den ikke automatisk.

Kør derefter det samme tjek, som GitHub kører på PR'en:

```bash
node scripts/tjek-pr.js upstream/main
```

Den skal ende med `✓ Klar`.

## 8. Commit, push og pull request

```bash
git add games/<slug>
git commit -m "Nyt spil: <titel>"
git push -u origin indsend/<slug>
node <skill-mappe>/scripts/tjek-spil.mjs games/<slug> --pr-tekst > ../pr-tekst.md
gh pr create --repo nerdsatwork/jj-arkaden --base main --head <bruger>:indsend/<slug> --title "Nyt spil: <titel>" --body-file ../pr-tekst.md
```

Spørg brugeren, om de har spillet spillet i spilhallen (`npm start`), før du sætter kryds i det punkt i PR-teksten. Slet `../pr-tekst.md` bagefter.

Med GitHub-connectoren i stedet: opret forken, lav branchen `indsend/<slug>`, læg filerne fra `games/<slug>/` i den, og åbn PR'en med samme titel og tekst.

## 9. Fortæl, hvad der sker nu

Giv brugeren linket til PR'en, og forklar:

- Robotten (GitHub Actions) tjekker PR'en om lidt. Første gang en konto sender en PR til Arkaden, skal en maintainer måske trykke "godkend" først.
- Er tjekket grønt, merges PR'en af sig selv, og spillet står i spilhallen få minutter efter.
- Bliver tjekket rødt, så læs fejlen sammen, ret i `games/<slug>`, og push igen.

Husk brugeren på, at navnet i game.json bliver offentligt, og at PR'en viser den GitHub-konto, de sendte fra.
