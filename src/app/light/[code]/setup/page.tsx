import { LightSetup } from "@/components/light/setup";

export default async function SetupPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <LightSetup code={code.toUpperCase()} />;
}
