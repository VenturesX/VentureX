import { Suspense } from "react";
import { GuestApp } from "@/components/experience/guest-app";

export default function GuestPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-white">Opening the guest app…</p>}>
      <GuestApp />
    </Suspense>
  );
}
