// server.js
// Wrapper that ensures the Next.js standalone server binds to Render's $PORT and 0.0.0.0

const path = require("path");
const fs = require("fs");

const standaloneServer = path.join(process.cwd(), ".next", "standalone", "server.js");
const port = process.env.PORT || 3000;
const host = "0.0.0.0";

if (fs.existsSync(standaloneServer)) {
  console.log(`🟢 Starting Next.js standalone server on ${host}:${port}`);
  process.env.PORT = port; // ensure Next sees the correct port
  process.env.HOST = host; // some frameworks honor HOST
  require(standaloneServer);
} else {
  console.log("⚠️ No standalone server found, using fallback Next.js runtime.");
  (async () => {
    const next = require("next");
    const app = next({ dev: false, dir: process.cwd() });
    const handle = app.getRequestHandler();
    await app.prepare();
    const http = require("http");
    const server = http.createServer((req, res) => handle(req, res));
    server.listen(port, host, () => {
      console.log(`✅ Fallback Next.js server running at http://${host}:${port}`);
    });
  })();
}
