// app/dashboard/clients/[id]/page.tsx
import type { Metadata } from "next";
import ClientDetailsClient from "./ClientDetailsClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  return {
    title: `Client ${params.id} — R.K Njogu & Co. Advocates`,
    description: "Client details",
  };
}

export default function ClientPage({ params }: { params: { id: string } }) {
  return <ClientDetailsClient id={params.id} />;
}
