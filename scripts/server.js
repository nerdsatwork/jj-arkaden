// npm start: en lille webserver til Arkaden på http://localhost:8080.
// Manifestet laves frisk ved hver indlæsning, så et nyt spil i games/ dukker
// op i hallen med det samme. Ingen pakker. Du kan også bare åbne index.html.

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { ROD, bygManifest, manifestFiler } = require("./arkaden.js");

const PORT = Number(process.env.PORT) || 8080;
const TYPER = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".md": "text/plain; charset=utf-8",
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  let sti = decodeURIComponent(url.pathname);

  if (sti === "/games/manifest.js" || sti === "/games/manifest.json") {
    const { json, js } = manifestFiler(bygManifest().manifest);
    res.writeHead(200, { "content-type": TYPER[path.extname(sti)], "cache-control": "no-store" });
    return res.end(sti.endsWith(".js") ? js : json);
  }

  if (sti.endsWith("/")) sti += "index.html";
  const fil = path.join(ROD, sti);
  if (!fil.startsWith(ROD + path.sep) || sti.split("/").some((del) => del.startsWith(".") && del.length > 1)) {
    res.writeHead(403);
    return res.end("Ikke tilladt");
  }
  fs.readFile(fil, (err, indhold) => {
    if (err) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      return res.end(`Fandt ikke ${sti}`);
    }
    // Spil kører i en sandkasse uden egen origin. Den header lader dem stadig
    // hente filer, ligesom GitHub Pages gør.
    res.writeHead(200, { "content-type": TYPER[path.extname(fil).toLowerCase()] || "application/octet-stream", "access-control-allow-origin": "*", "cache-control": "no-store" });
    res.end(indhold);
  });
});

server.listen(PORT, () => {
  console.log(`Arkaden kører på http://localhost:${PORT}`);
  console.log("Stop med Ctrl+C.");
});
