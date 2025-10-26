// app/dashboard/cases/[id]/generateStaticParams.ts

export async function generateStaticParams(): Promise<{ id: string }[]> {
  try {
    const admin = await import("firebase-admin");

    if (!admin.apps.length) {
      const base64Key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;
      const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

      if (!base64Key && !rawKey) {
        console.warn("⚠️ No FIREBASE_SERVICE_ACCOUNT_KEY found — skipping static export of cases.");
        return [];
      }

      const serviceAccount = JSON.parse(
        base64Key
          ? Buffer.from(base64Key, "base64").toString("utf8")
          : rawKey!
      );

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }

    const db = admin.firestore();
    const snapshot = await db.collection("cases").get();
    return snapshot.docs.map((d) => ({ id: d.id }));
  } catch (err) {
    console.warn("generateStaticParams (cases) failed:", err);
    return [];
  }
}
