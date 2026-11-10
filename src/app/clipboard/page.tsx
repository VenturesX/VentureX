import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardBoard } from "@/components/clipboard/clipboard-board";
import { FieldChrome } from "@/components/field/field-chrome";

export const metadata: Metadata = {
  title: "Clipboard · Venture Directors",
  description: "Curb dispatch sheet for on-site staff. Roster, breaks, boarding count, and the running log.",
};

export default function ClipboardPage() {
  return (
    <div className="min-h-dvh bg-black text-white">
      <FieldChrome mode="clipboard" />
      <div className="px-4"><Link href="/team" className="inline-flex min-h-11 items-center text-sm text-[#9ecbff]">← Team hub</Link></div>
      <ClipboardBoard backHref="/shuttle" backLabel="Live map" />
    </div>
  );
}
