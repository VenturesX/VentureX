import { NextResponse } from "next/server";
import { loadGuidance } from "@/lib/ops-settings";

export async function GET() {
  const guidance = await loadGuidance();
  return NextResponse.json({
    phone: guidance.expertPhone,
    tel: guidance.expertTel,
    hours: guidance.officeHours,
    hoursLabel: guidance.hoursLabel,
    lineOpen: guidance.lineOpen,
  });
}
