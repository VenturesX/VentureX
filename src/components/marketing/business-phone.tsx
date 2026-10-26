import { Phone } from "lucide-react";
import { DEFAULT_EXPERT_PHONE, DEFAULT_EXPERT_TEL, ONSITE_MANAGER_LABEL } from "@/lib/guidance";

export const ONSITE_MANAGER_LINE = `${ONSITE_MANAGER_LABEL} ${DEFAULT_EXPERT_PHONE}`;

export function BusinessPhone({ className = "" }: { className?: string }) {
  return (
    <a
      href={`tel:${DEFAULT_EXPERT_TEL}`}
      className={`inline-flex items-center gap-2 font-medium text-white ${className}`}
      aria-label={`Call the On-Site Manager at ${DEFAULT_EXPERT_PHONE}`}
    >
      <Phone className="size-4 shrink-0 text-[#1E90FF]" aria-hidden="true" />
      <span className="whitespace-nowrap">{ONSITE_MANAGER_LINE}</span>
    </a>
  );
}
