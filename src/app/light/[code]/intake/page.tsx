import { LightIntake } from "@/components/light/intake";

export default async function IntakePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <LightIntake code={code.toUpperCase()} />;
}
