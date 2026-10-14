import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { jsonError, requireApi } from "@/lib/api";
import { db } from "@/lib/db";
import { recordAudit, recordStatus } from "@/lib/ops/audit";
import { planQuote } from "@/lib/drive-time";
import { loadGuidance } from "@/lib/ops-settings";
import {
  MANIFEST_MIME,
  REP_PRICE_KEY,
  centsFromSetting,
  manifestError,
  manifestExtension,
  parseQuoteFields,
  parseStops,
  type QuoteInput,
} from "@/lib/quotes";

const listSelect = {
  id: true,
  reference: true,
  profile: true,
  serviceType: true,
  startDate: true,
  endDate: true,
  startTime: true,
  endTime: true,
  pickup: true,
  dropoff: true,
  stops: true,
  passengerCount: true,
  vehicleCount: true,
  vehiclePreference: true,
  luggage: true,
  coordinatorNeeded: true,
  representativeCount: true,
  repPriceCents: true,
  needsExpertCall: true,
  waitMinutes: true,
  driveMinutes: true,
  recommendation: true,
  unsureSteps: true,
  contactName: true,
  company: true,
  email: true,
  phone: true,
  notes: true,
  manifestFileName: true,
  status: true,
  createdAt: true,
} satisfies Prisma.QuoteRequestSelect;

export async function GET() {
  try {
    await requireApi("quotes.read");
    const rows = await db.quoteRequest.findMany({
      orderBy: { createdAt: "desc" },
      select: listSelect,
    });
    return NextResponse.json({
      rows: rows.map((row) => ({ ...row, stops: parseStops(row.stops), unsureSteps: parseStops(row.unsureSteps) })),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json({ error: "Send the quote as a form." }, { status: 400 });
    }

    const parsed = parseQuoteFields(form);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: "Check the highlighted fields and try again.", fieldErrors: parsed.fieldErrors },
        { status: 400 },
      );
    }

    const uploaded = form.get("manifest");
    let manifest: { name: string; mime: string; bytes: Uint8Array } | null = null;
    if (uploaded instanceof File && uploaded.size > 0) {
      const fileError = manifestError(uploaded);
      if (fileError) {
        return NextResponse.json({ error: fileError, fieldErrors: { manifest: fileError } }, { status: 400 });
      }
      const ext = manifestExtension(uploaded.name);
      manifest = {
        name: uploaded.name,
        mime: MANIFEST_MIME[ext] ?? "application/octet-stream",
        bytes: new Uint8Array(await uploaded.arrayBuffer()),
      };
    }

    const guidance = await loadGuidance();
    const plan = await planQuote(
      {
        serviceType: parsed.data.serviceType,
        passengerCount: parsed.data.passengerCount,
        pickup: parsed.data.pickup,
        dropoff: parsed.data.dropoff,
        stops: parsed.data.stops,
        waitMinutes: parsed.data.waitMinutes,
        driveMinutes: parsed.data.driveMinutes,
        vehiclePreference: parsed.data.vehiclePreference,
        email: parsed.data.email,
        phone: parsed.data.phone,
        startDate: parsed.data.startDate,
        unsureSteps: parsed.data.unsureSteps,
      },
      guidance.fleet,
      guidance.timing,
      guidance.driveTable,
    );
    const repCount = plan.repCount > 0 ? Math.max(plan.repCount, parsed.data.representativeCount) : 0;
    const row = await createQuote(
      {
        ...parsed.data,
        vehicleCount: plan.vehicleCount,
        representativeCount: repCount,
        coordinatorNeeded: repCount > 0,
      },
      manifest,
      {
        needsExpertCall: plan.needsExpert || parsed.data.unsureSteps.length > 0,
        recommendation: plan.recommendation,
        repCount,
      },
    );
    return NextResponse.json({ ok: true, id: row.id, reference: row.reference, needsExpertCall: plan.needsExpert || parsed.data.unsureSteps.length > 0 });
  } catch (error) {
    return jsonError(error);
  }
}

async function currentRepPriceCents() {
  const setting = await db.appSetting.findUnique({ where: { key: REP_PRICE_KEY } });
  return centsFromSetting(setting?.value);
}

async function createQuote(
  data: QuoteInput,
  manifest: { name: string; mime: string; bytes: Uint8Array } | null,
  extra: { needsExpertCall: boolean; recommendation: string; repCount: number },
) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const count = await db.quoteRequest.count();
    const reference = `VX-${String(1001 + count + attempt).padStart(4, "0")}`;
    try {
      const row = await db.quoteRequest.create({
        data: {
          reference,
          profile: data.profile,
          serviceType: data.serviceType,
          startDate: data.startDate,
          endDate: data.endDate ?? null,
          startTime: data.startTime ?? null,
          endTime: data.endTime ?? null,
          pickup: data.pickup,
          dropoff: data.dropoff,
          stops: JSON.stringify(data.stops),
          passengerCount: data.passengerCount,
          vehicleCount: data.vehicleCount,
          vehiclePreference: data.vehiclePreference,
          luggage: data.luggage,
          coordinatorNeeded: data.coordinatorNeeded,
          representativeCount: extra.repCount,
          repPriceCents: extra.repCount > 0 ? await currentRepPriceCents() : null,
          needsExpertCall: extra.needsExpertCall,
          waitMinutes: data.waitMinutes ?? null,
          driveMinutes: data.driveMinutes ?? null,
          recommendation: extra.recommendation,
          unsureSteps: JSON.stringify(data.unsureSteps),
          contactName: data.contactName,
          company: data.company ?? null,
          email: data.email,
          phone: data.phone,
          notes: data.notes ?? null,
          manifestFileName: manifest?.name ?? null,
          manifestMimeType: manifest?.mime ?? null,
          manifestBytes: manifest?.bytes ?? null,
          status: "NEW",
        },
        select: { id: true, reference: true },
      });
      try {
        await recordAudit({
          action: "quote.create",
          entityType: "QUOTE_REQUEST",
          entityId: row.id,
          after: { reference: row.reference, status: "NEW" },
        });
        await recordStatus({
          entityType: "QUOTE_REQUEST",
          entityId: row.id,
          toStatus: "NEW",
        });
      } catch (error) {
        console.error("quote audit failed", error);
      }
      return row;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
  }
  throw Object.assign(new Error("Could not save the request. Try again."), { status: 500 });
}
