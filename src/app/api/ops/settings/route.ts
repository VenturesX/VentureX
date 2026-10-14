import { NextResponse } from "next/server";
import { jsonError, requireApi } from "@/lib/api";
import { db } from "@/lib/db";
import {
  SETTINGS_KEYS,
  parseDriveTable,
  parseFleet,
  parseTiming,
  resolveHours,
  resolvePhone,
} from "@/lib/guidance";
import { loadGuidance } from "@/lib/ops-settings";

async function activeEvent() {
  return db.event.findFirst({
    where: { deletedAt: null, status: "ACTIVE" },
    orderBy: { startsAt: "asc" },
    include: { faqs: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function GET() {
  try {
    await requireApi("quotes.settings");
    const [guidance, event] = await Promise.all([loadGuidance(), activeEvent()]);
    return NextResponse.json({
      ...guidance,
      eventId: event?.id ?? null,
      eventName: event?.name ?? "",
      eventDirectLine: event?.directLinePhone ?? "",
      guestPhoneEnabled: event?.guestPhoneEnabled ?? false,
      faqs: event?.faqs ?? [],
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireApi("quotes.settings");
    const body = (await request.json()) as Record<string, unknown>;
    if ("expertPhone" in body) {
      const phone = String(body.expertPhone ?? "").trim();
      if (phone && phone.replace(/\D/g, "").length < 7) {
        return NextResponse.json({ error: "Enter a phone number, or leave it blank." }, { status: 400 });
      }
      await saveSetting(SETTINGS_KEYS.expertPhone, phone ? resolvePhone(phone) : "");
    }
    if ("defaultDirectLine" in body) {
      const phone = String(body.defaultDirectLine ?? "").trim();
      if (phone && phone.replace(/\D/g, "").length < 7) {
        return NextResponse.json({ error: "Enter a direct-line number, or leave it blank." }, { status: 400 });
      }
      await saveSetting(SETTINGS_KEYS.defaultDirectLine, phone ? resolvePhone(phone) : "");
    }
    if ("officeHours" in body) {
      if (!body.officeHours) {
        await saveSetting(SETTINGS_KEYS.officeHours, "");
      } else {
        const hours = resolveHours(JSON.stringify({ ...(body.officeHours as object), configured: true, timezone: "America/New_York" }));
        if (!hours) return NextResponse.json({ error: "Enter opening and closing times, and at least one day." }, { status: 400 });
        await saveSetting(SETTINGS_KEYS.officeHours, JSON.stringify(hours));
      }
    }
    if ("fleet" in body) {
      await saveSetting(SETTINGS_KEYS.fleet, JSON.stringify(parseFleet(JSON.stringify(body.fleet))));
    }
    if ("driveTable" in body) {
      await saveSetting(SETTINGS_KEYS.driveTable, JSON.stringify(parseDriveTable(JSON.stringify(body.driveTable))));
    }
    if ("timing" in body) {
      await saveSetting(SETTINGS_KEYS.loopTiming, JSON.stringify(parseTiming(JSON.stringify(body.timing))));
    }
    if ("eventDirectLine" in body || "guestPhoneEnabled" in body) {
      const event = await activeEvent();
      if (event) {
        const phone = "eventDirectLine" in body ? String(body.eventDirectLine ?? "").trim() : undefined;
        if (phone && phone.replace(/\D/g, "").length < 7) {
          return NextResponse.json({ error: "Enter this event's direct line, or leave it blank to use the default." }, { status: 400 });
        }
        await db.event.update({
          where: { id: event.id },
          data: {
            ...(phone !== undefined ? { directLinePhone: phone ? resolvePhone(phone) : null } : {}),
            ...("guestPhoneEnabled" in body ? { guestPhoneEnabled: Boolean(body.guestPhoneEnabled) } : {}),
          },
        });
      }
    }
    const guidance = await loadGuidance();
    return NextResponse.json({ ok: true, ...guidance });
  } catch (error) {
    return jsonError(error);
  }
}

async function saveSetting(key: string, value: string) {
  await db.appSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}
