// app/dashboard/cases/[id]/page.tsx
import type { Metadata } from "next";
import CaseDetailsClient from "./CaseDetailsClient";

export const dynamic = "force-dynamic";

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
    title: `Case ${id} — R.K Njogu & Co. Advocates`,
    description: "Case details",
  };
}

/**
 * Make the page async and await params as well.
 * The client component will still run on the client and perform Firestore hooks.
 */
export default async function CasePage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CaseDetailsClient id={id} />;
}
