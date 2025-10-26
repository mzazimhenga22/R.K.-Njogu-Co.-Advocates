
// app/dashboard/files/[id]/page.tsx
import type { Metadata } from "next";
import FileDetailsClient from "./FileDetailsClient";
import { generateStaticParams as generateStaticParamsForFiles } from "./generateStaticParams";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  // You can uncomment this if you have a function to fetch all file IDs at build time
  // return generateStaticParamsForFiles();
  return [];
}


/**
 * generateMetadata must await params before accessing its properties
 * to satisfy the App Router's async dynamic params behavior.
 */
export async function generateMetadata({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `File ${id} — R.K Njogu & Co. Advocates`,
    description: "File details",
  };
}

/**
 * Make the page async and await params as well.
 * The client component will still run on the client and perform Firestore hooks.
 */
export default async function FilePage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FileDetailsClient id={id} />;
}

    