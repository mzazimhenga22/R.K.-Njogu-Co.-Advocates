// Server-only: app/dashboard/clients/[id]/generateStaticParams.ts
// Exports generateStaticParams() for static export (clients).
// Priority for credentials:
// 1) ./serviceAccount.json (project root)
// 2) FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 (base64-encoded JSON env)
// 3) FIREBASE_SERVICE_ACCOUNT_KEY (raw JSON env)

export async function generateStaticParams(): Promise<{ id: string }[]> {
  try {
    const admin = await import("firebase-admin");

    if (!admin.apps || admin.apps.length === 0) {
      // Try file, then env base64, then raw env
      let serviceAccount: any | null = null;

      // 1) Project-root JSON file (preferred if present)
      try {
        const fs = await import("fs");
        const path = await import("path");
        const saPath = path.join(process.cwd(), "serviceAccount.json");
        if (fs.existsSync(saPath)) {
          try {
            const raw = fs.readFileSync(saPath, "utf8");
            serviceAccount = JSON.parse(raw);
          } catch (err) {
            console.warn("generateStaticParams (clients): failed to parse serviceAccount.json:", err);
            serviceAccount = null;
          }
        }
      } catch {
        // ignore file-system errors — we'll fallback to env
      }

      // 2) Base64 env
      if (!serviceAccount) {
        const base64Key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;
        if (base64Key) {
          try {
            const json = Buffer.from(base64Key, "base64").toString("utf8");
            serviceAccount = JSON.parse(json);
          } catch (err) {
            console.warn("generateStaticParams (clients): failed to parse FIREBASE_SERVICE_ACCOUNT_KEY_BASE64:", err);
            return [];
          }
        }
      }

      // 3) Raw JSON env
      if (!serviceAccount) {
        const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (rawKey) {
          try {
            serviceAccount = JSON.parse(rawKey);
          } catch (err) {
            console.warn("generateStaticParams (clients): failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", err);
            return [];
          }
        }
      }

      if (!serviceAccount) {
        console.warn(
          "generateStaticParams (clients): No service account found (serviceAccount.json or FIREBASE_SERVICE_ACCOUNT_KEY[_BASE64]). Returning empty list."
        );
        return [];
      }

      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? serviceAccount.project_id;

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId,
      });
    }

    const db = admin.firestore();
    const snapshot = await db.collection("clients").get();
    return snapshot.docs.map((d) => ({ id: d.id }));
  } catch (err) {
    console.warn("generateStaticParams (clients) failed:", err);
    return [];
  }
}
