// electron/main.js
const { app, BrowserWindow, nativeImage } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const http = require("http");

const isDev = !app.isPackaged;
let mainWindow = null;
let serverProcess = null;

function waitForServer(port, timeout = 20000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryReq = () => {
      const req = http.request({ method: "GET", hostname: "127.0.0.1", port, path: "/" }, (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
          resolve();
        } else {
          if (Date.now() - start > timeout) reject(new Error("Server did not become ready in time"));
          else setTimeout(tryReq, 250);
        }
      });
      req.on("error", () => {
        if (Date.now() - start > timeout) reject(new Error("Server did not become ready in time (error)"));
        else setTimeout(tryReq, 250);
      });
      req.end();
    };
    tryReq();
  });
}

/**
 * Return candidate standalone server paths depending on environment:
 * - dev: .next/standalone/server.js (project cwd)
 * - packaged (unpacked): process.resourcesPath/app.asar.unpacked/.next/standalone/server.js
 * - packaged (if not unpacked): process.resourcesPath/.next/standalone/server.js (less likely / may not be executable)
 */
function getStandaloneServerCandidates() {
  const candidates = [];

  // 1) project folder (dev / local test)
  candidates.push(path.join(process.cwd(), ".next", "standalone", "server.js"));

  // 2) relative to this file (when running from source electron)
  candidates.push(path.join(__dirname, "..", ".next", "standalone", "server.js"));

  // 3) packaged: asar.unpacked location (preferred for executing)
  if (process.resourcesPath) {
    candidates.push(path.join(process.resourcesPath, "app.asar.unpacked", ".next", "standalone", "server.js"));
    // also try without app.asar.unpacked (if files were not unpacked)
    candidates.push(path.join(process.resourcesPath, ".next", "standalone", "server.js"));
  }

  // filter to unique values
  return [...new Set(candidates)];
}

/**
 * Try to find and start the standalone server. Will spawn a child node process pointing to the server.js
 * Returns object { port, ready } if started, otherwise null.
 */
function startStandaloneServerIfPresent() {
  const port = process.env.PORT ? Number(process.env.PORT) : 3030;
  const candidates = getStandaloneServerCandidates();

  for (const serverPath of candidates) {
    try {
      if (!serverPath) continue;
      if (!fs.existsSync(serverPath)) continue;

      // Make sure the serverPath is not inside app.asar (can't execute inside archive).
      // If it's inside app.asar, prefer the app.asar.unpacked path (one of the candidates above should match).
      if (serverPath.includes("app.asar") && !serverPath.includes("app.asar.unpacked")) {
        // Skip this candidate — child process can't execute files inside app.asar
        continue;
      }

      // spawn using the same Node binary the process is running on (process.execPath)
      serverProcess = spawn(process.execPath, [serverPath], {
        cwd: path.dirname(serverPath),
        env: { ...process.env, PORT: String(port) },
        stdio: ["ignore", "pipe", "pipe"],
      });

      serverProcess.stdout && serverProcess.stdout.on("data", (d) => console.log("[standalone stdout]", d.toString()));
      serverProcess.stderr && serverProcess.stderr.on("data", (d) => console.warn("[standalone stderr]", d.toString()));
      serverProcess.on("exit", (code, signal) => console.log(`[standalone] exited code=${code} signal=${signal}`));

      // return port + readiness promise
      return { port, ready: waitForServer(port, 20000) };
    } catch (err) {
      console.warn("startStandaloneServer: candidate failed:", serverPath, err && err.message ? err.message : err);
      // try next candidate
    }
  }

  return null;
}

/**
 * Fallback static server using Express for `out/` (if you used next export)
 */
function startStaticOutServerIfPresent() {
  try {
    const outPath = path.join(process.cwd(), "out");
    const indexFile = path.join(outPath, "index.html");
    const port = 3030;
    if (fs.existsSync(indexFile)) {
      const express = require("express");
      const server = express();
      server.use(express.static(outPath));
      server.get("*", (_, res) => res.sendFile(indexFile));
      const httpServer = server.listen(port, () => console.log(`Static out server listening on ${port}`));
      return { port, ready: Promise.resolve(), server: httpServer };
    }
  } catch (err) {
    console.warn("startStaticOutServerIfPresent error (express missing?):", err && err.message ? err.message : err);
  }
  return null;
}

function createWindow() {
  const iconIco = path.join(__dirname, "../public/assets/icon.ico");
  const logoPng = path.join(__dirname, "../public/assets/logo.png");
  let appIcon;
  if (fs.existsSync(iconIco)) appIcon = nativeImage.createFromPath(iconIco);
  else if (fs.existsSync(logoPng)) appIcon = nativeImage.createFromPath(logoPng);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: "#ffffff",
    title: "R.K Njogu & Co. Advocates",
    icon: appIcon,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:9002");
    mainWindow.webContents.openDevTools();
    mainWindow.once("ready-to-show", () => mainWindow.show());
    return;
  }

  (async () => {
    // 1) Try standalone
    const standalone = startStandaloneServerIfPresent();
    if (standalone) {
      try {
        console.log("Waiting for standalone server on port", standalone.port);
        await standalone.ready;
        const url = `http://127.0.0.1:${standalone.port}`;
        await mainWindow.loadURL(url);
        mainWindow.once("ready-to-show", () => mainWindow.show());
        return;
      } catch (err) {
        console.warn("Standalone server ready check failed:", err && err.message ? err.message : err);
      }
    }

    // 2) Try static `out/`
    const staticServer = startStaticOutServerIfPresent();
    if (staticServer) {
      try {
        if (staticServer.ready) await staticServer.ready;
        const url = `http://127.0.0.1:${staticServer.port}`;
        await mainWindow.loadURL(url);
        mainWindow.once("ready-to-show", () => mainWindow.show());
        return;
      } catch (err) {
        console.warn("Static out server failed:", err && err.message ? err.message : err);
      }
    }

    // 3) Try to load bundled fallback index.html
    const fallbackIndex = path.join(__dirname, "../out/index.html");
    if (fs.existsSync(fallbackIndex)) {
      try {
        await mainWindow.loadFile(fallbackIndex);
        mainWindow.once("ready-to-show", () => mainWindow.show());
        return;
      } catch (err) {
        console.warn("Failed loading fallback index:", err && err.message ? err.message : err);
      }
    }

    // 4) final friendly message
    const message = `<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh"><div style="text-align:center"><h2>Build not found</h2><p>Please rebuild the app (run <code>npm run build</code>) and repackage.</p></div></body></html>`;
    await mainWindow.loadURL("data:text/html," + encodeURIComponent(message));
    mainWindow.once("ready-to-show", () => mainWindow.show());
  })().catch((err) => {
    console.error("Startup error:", err);
    mainWindow.loadURL("data:text/html," + encodeURIComponent(`<pre>${String(err)}</pre>`));
    mainWindow.once("ready-to-show", () => mainWindow.show());
  });

  mainWindow.on("closed", () => (mainWindow = null));
  mainWindow.setMenuBarVisibility(false);
}

function cleanup() {
  if (serverProcess) {
    try { serverProcess.kill(); } catch (e) { /* ignore */ } finally { serverProcess = null; }
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("before-quit", () => cleanup());
app.on("window-all-closed", () => { cleanup(); if (process.platform !== "darwin") app.quit(); });
