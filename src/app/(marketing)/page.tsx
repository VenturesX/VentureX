import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/roles";
import { MarketingHome } from "@/components/marketing/home-page";

export default async function HomePage() {
  const session = await getSession();
  if (session && session.role !== "ADMIN") redirect(ROLE_HOME[session.role]);
  return <MarketingHome />;
}
