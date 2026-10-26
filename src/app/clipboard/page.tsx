import type { Metadata } from "next";
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
      <ClipboardBoard backHref="/shuttle" backLabel="Live map" />
    </div>
  );
}
