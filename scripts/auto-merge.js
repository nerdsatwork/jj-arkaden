// Merger et spil-PR af sig selv, når "Tjek pull request" er grøn.
// Kaldes af .github/workflows/auto-merge.yml. Kører koden fra main, aldrig
// PR'ens egen kode, og tjekker reglerne igen ud fra GitHubs liste over filer:
//   - PR'en rører kun én mappe games/<slug>/ (aldrig skabelonen eller manifestet)
//   - PR'en kommer fra branchen indsend/<slug> i repoet selv, altså fra
//     Arkaden-værktøjet (kursister med en holdkode). En PR fra en fork merges
//     aldrig automatisk: et spil er JavaScript på vores side, og et statisk
//     tjek kan snydes, så en maintainer godkender spil udefra i hånden.
//   - spillets game.json slettes ikke
//   - PR'en er ikke en kladde, går mod main, og hovedet er det, tjekket kørte på
// Alt andet (fx en ændring af hallen) venter på en maintainer.
//
// Env: GH_TOKEN, REPO (ejer/navn), HEAD_SHA, GITHUB_OUTPUT (sættes af Actions).

const fs = require("node:fs");
const { SLUG, spilIPr, maaOpdatere } = require("./arkaden.js");

// Ren beslutning, så den kan testes uden GitHub. filer: [{ filename, status, previous_filename }].
function vurder({ pr, filer, findesPaaMain, repo }) {
  if (pr.draft) return { flet: false, grund: "PR'en er en kladde" };
  if (pr.base.ref !== "main") return { flet: false, grund: `PR'en går mod ${pr.base.ref}, ikke main` };
  const stier = filer.flatMap((f) => [f.filename, f.previous_filename].filter(Boolean));
  const { udenfor, slugs } = spilIPr(stier);
  if (slugs.length === 0) return { flet: false, grund: "PR'en ændrer ingen spil. En maintainer kigger på den" };
  if (udenfor.length) return { flet: false, grund: `PR'en ændrer filer uden for games/<slug>/: ${udenfor.slice(0, 3).join(", ")}` };
  if (slugs.length > 1) return { flet: false, grund: `PR'en ændrer flere spil: ${slugs.join(", ")}` };
  const slug = slugs[0];
  if (slug.startsWith("_") || !SLUG.test(slug)) return { flet: false, grund: `games/${slug} er ikke et gyldigt spil` };
  if (filer.some((f) => f.filename === `games/${slug}/game.json` && f.status === "removed")) {
    return { flet: false, grund: `games/${slug} slettes. Det kræver en maintainer` };
  }
  const fraFork = !pr.head.repo || pr.head.repo.full_name !== repo;
  if (fraFork) return { flet: false, grund: "PR'en kommer fra en fork. En maintainer godkender spil udefra i hånden" };
  if (pr.head.ref !== `indsend/${slug}`) {
    return { flet: false, grund: `PR'en kommer ikke fra indsend/${slug}. En maintainer kigger på den` };
  }
  if (findesPaaMain && !maaOpdatere(slug, { gren: pr.head.ref, fraFork })) {
    return { flet: false, grund: `games/${slug} findes allerede, og PR'en kommer ikke fra indsend/${slug}` };
  }
  return { flet: true, slug, grund: findesPaaMain ? `opdatering af games/${slug}` : `nyt spil: games/${slug}` };
}

async function gh(sti, valg = {}) {
  const svar = await fetch(`https://api.github.com${sti}`, {
    ...valg,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${process.env.GH_TOKEN}`,
      "x-github-api-version": "2022-11-28",
      ...(valg.body ? { "content-type": "application/json" } : {}),
    },
  });
  if (svar.status === 404) return null;
  if (!svar.ok) throw new Error(`GitHub svarede ${svar.status} på ${valg.method || "GET"} ${sti}: ${(await svar.text()).slice(0, 300)}`);
  return svar.status === 204 ? {} : svar.json();
}

async function alle(sti) {
  const ud = [];
  for (let side = 1; side <= 30; side++) {
    const del = await gh(`${sti}${sti.includes("?") ? "&" : "?"}per_page=100&page=${side}`);
    if (!del || del.length === 0) break;
    ud.push(...del);
    if (del.length < 100) break;
  }
  return ud;
}

async function main() {
  const { REPO: repo, HEAD_SHA: sha } = process.env;
  if (!repo || !sha || !process.env.GH_TOKEN) throw new Error("Mangler REPO, HEAD_SHA eller GH_TOKEN");

  const prs = (await alle(`/repos/${repo}/pulls?state=open`)).filter((p) => p.head.sha === sha);
  if (prs.length !== 1) {
    console.log(prs.length === 0 ? `Ingen åben PR har hovedet ${sha}. Intet at merge.` : `Flere PR'er har hovedet ${sha}. En maintainer må vælge.`);
    return;
  }
  const pr = prs[0];
  const filer = await alle(`/repos/${repo}/pulls/${pr.number}/files`);
  const { slugs } = spilIPr(filer.map((f) => f.filename));
  const findesPaaMain = slugs.length === 1 && (await gh(`/repos/${repo}/contents/games/${encodeURIComponent(slugs[0])}/game.json?ref=main`)) !== null;

  const v = vurder({ pr, filer, findesPaaMain, repo });
  console.log(`PR #${pr.number}: ${v.flet ? "merges" : "merges ikke"} (${v.grund}).`);
  if (!v.flet) return;

  await gh(`/repos/${repo}/pulls/${pr.number}/merge`, {
    method: "PUT",
    body: JSON.stringify({ merge_method: "squash", sha, commit_title: `${pr.title} (#${pr.number})` }),
  });
  console.log(`✓ PR #${pr.number} er merget. Spillet kommer i hallen om få minutter.`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, "merget=1\n");
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}

module.exports = { vurder };
