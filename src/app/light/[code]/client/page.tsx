import { ClientView } from "@/components/light/client-view";

export default async function ClientPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <ClientView code={code.toUpperCase()} />;
}
