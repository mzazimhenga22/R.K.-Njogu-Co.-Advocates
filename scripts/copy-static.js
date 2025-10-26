// scripts/copy-static.js (CommonJS)
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  for (const item of fs.readdirSync(src)) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const stats = fs.statSync(srcPath);
    if (stats.isDirectory()) {
      copyRecursiveSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const staticSrc = path.resolve(".next", "static");
const staticDest = path.resolve(".next", "standalone", ".next", "static");
const publicSrc = path.resolve("public");
const publicDest = path.resolve(".next", "standalone", "public");

console.log("📂 Copying .next/static ->", staticDest);
copyRecursiveSync(staticSrc, staticDest);
console.log("✅ .next/static copied (if present).");

console.log("📂 Copying public/ ->", publicDest);
copyRecursiveSync(publicSrc, publicDest);
console.log("✅ public/ copied (if present).");
