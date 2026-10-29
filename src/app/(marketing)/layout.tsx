import type { ReactNode } from "react";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <div className="bg-[#090b10] text-white">{children}</div>;
}
