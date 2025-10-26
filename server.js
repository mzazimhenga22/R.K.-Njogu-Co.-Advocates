// server.js
// Attempts to run the Next "standalone" server produced by `next build` with output: "standalone".
// If the standalone server is not present, falls back to using `next start` (next package).
const path = require("path");
const fs = require("fs");

const standaloneServer = path.join(process.cwd(), ".next", "standalone", "server.js");

if (fs.existsSync(standaloneServer)) {
  // standalone server is a runnable Node bundle emitted by Next
  require(standaloneServer);
} else {
  // fallback: start Next the usual way (next start equivalent)
  (async () => {
    try {
      const next = require("next");
      const app = next({ dev: false, dir: process.cwd() });
      const handle = app.getRequestHandler();
      await app.prepare();
      const http = require("http");
      const port = process.env.PORT ? Number(process.env.PORT) : 3030;
      const server = http.createServer((req, res) => handle(req, res));
      server.listen(port, () => {
        console.log(`next (fallback) listening on http://localhost:${port}`);
      });
    } catch (err) {
      console.error("Failed to start fallback next server:", err);
      process.exit(1);
    }
  })();
}
