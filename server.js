// server.js
// Runs Next.js standalone build if available; otherwise falls back to next start.
const path = require("path");
const fs = require("fs");

const standaloneServer = path.join(process.cwd(), ".next", "standalone", "server.js");

if (fs.existsSync(standaloneServer)) {
  // Run standalone server bundle from Next.js build output
  require(standaloneServer);
} else {
  (async () => {
    try {
      const next = require("next");
      const app = next({ dev: false, dir: process.cwd() });
      const handle = app.getRequestHandler();
      await app.prepare();

      const http = require("http");
      const port = process.env.PORT ? Number(process.env.PORT) : 3030;
      const host = "0.0.0.0";

      const server = http.createServer((req, res) => handle(req, res));
      server.listen(port, host, () => {
        console.log(`✅ next (fallback) listening on http://${host}:${port}`);
      });
    } catch (err) {
      console.error("❌ Failed to start fallback Next.js server:", err);
      process.exit(1);
    }
  })();
}
