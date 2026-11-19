// Banerne i Snake. Hvert level er lidt sværere end det før.
//
// navn: står over banen.
// fart: millisekunder pr. skridt. Lavere er hurtigere.
// maal: så mange æbler skal slangen spise for at nå næste level.
// mure: felter, slangen ikke må ramme. Banen går fra 0 til 19.
//
// Slangen starter i række 10 og kører mod højre, så hold række 10 fri omkring midten.

// En lige mur fra (fraX, fraY) til (tilX, tilY)
function mur(fraX, fraY, tilX, tilY) {
  const felter = [];
  for (let x = fraX; x <= tilX; x++) {
    for (let y = fraY; y <= tilY; y++) {
      felter.push({ x, y });
    }
  }
  return felter;
}

const LEVELS = [
  { navn: "Den åbne mark", fart: 140, maal: 5, mure: [] },
  { navn: "To hegn", fart: 125, maal: 6, mure: [...mur(4, 4, 15, 4), ...mur(4, 15, 15, 15)] },
  { navn: "Labyrinten", fart: 110, maal: 8, mure: [...mur(10, 1, 10, 6), ...mur(10, 14, 10, 18), ...mur(1, 13, 5, 13), ...mur(14, 6, 18, 6)] },
  { navn: "Trange tider", fart: 97, maal: 9, mure: [...mur(10, 1, 10, 6), ...mur(10, 14, 10, 18), ...mur(1, 13, 5, 13), ...mur(14, 6, 18, 6), ...mur(14, 13, 18, 13)] },
  { navn: "Spejlsalen", fart: 85, maal: 10, mure: [...mur(10, 1, 10, 6), ...mur(10, 14, 10, 18), ...mur(1, 13, 5, 13), ...mur(14, 6, 18, 6), ...mur(14, 13, 18, 13), ...mur(1, 6, 5, 6)] },
];
