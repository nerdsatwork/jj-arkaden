# Ændringer i Arkaden

Nyeste øverst. Skriv en linje, når du lægger et spil eller en ny feature i hallen.

## 0.1.0 (2026-10-19)

- Spilhallen åbner: forside med Ugens spil, Nyeste og Alle spil, en side pr. spil og en side om at lægge sit eget spil i Arkaden.
- Første spil: Reaktion (games/reaktion), med tests af reglerne.
- Skabelon til nye spil i games/_skabelon.
- npm start, npm test, npm run lint, npm run games og npm run tjek-pr.
- GitHub Actions: tjek af pull requests, automatisk merge af spil fra Arkaden-værktøjet (branchen indsend/<slug>, kun spillets egen mappe), og udgivelse på GitHub Pages. Spil fra en fork merger en maintainer i hånden.
- Et spil-PR må ikke tage et mappenavn, der allerede er i hallen, med mindre det er en opdatering fra branchen indsend/<slug>.
- Skillen arkaden-udgiv i udgiv/ til at lægge et spil i Arkaden med fork og pull request.
