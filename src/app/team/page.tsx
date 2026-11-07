import type { Metadata } from "next";
import { TeamLogin } from "@/components/team/team-login";

export const metadata: Metadata = {
  title: "Team Login",
  robots: { index: false, follow: false },
};

export default function TeamPage() {
  return <TeamLogin />;
}
