import { LightBoard } from "@/components/light/board";

export default async function LightBoardPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ t?: string }> }) {
  const { code } = await params;
  const query = await searchParams;
  return <LightBoard code={code.toUpperCase()} token={query.t ?? ""} />;
}
