import { NextResponse } from "next/server";
import { jsonError, requireApi } from "@/lib/api";
import { db } from "@/lib/db";
import { REP_PRICE_KEY, centsFromSetting, dollarsFromCents, formatRepPrice, parseRepPriceInput } from "@/lib/quotes";

export async function GET() {
  try {
    await requireApi("quotes.settings");
    const setting = await db.appSetting.findUnique({ where: { key: REP_PRICE_KEY } });
    const cents = centsFromSetting(setting?.value);
    return NextResponse.json({
      priceDollars: dollarsFromCents(cents),
      label: formatRepPrice(cents),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const actor = await requireApi("quotes.settings");
    const body = (await request.json()) as { price?: string };
    const parsed = parseRepPriceInput(String(body.price ?? ""));
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    if (parsed.cents == null) {
      await db.appSetting.deleteMany({ where: { key: REP_PRICE_KEY } });
    } else {
      await db.appSetting.upsert({
        where: { key: REP_PRICE_KEY },
        create: { key: REP_PRICE_KEY, value: String(parsed.cents) },
        update: { value: String(parsed.cents) },
      });
    }
    return NextResponse.json({
      ok: true,
      priceDollars: dollarsFromCents(parsed.cents),
      label: formatRepPrice(parsed.cents),
      updatedBy: actor.id,
    });
  } catch (error) {
    return jsonError(error);
  }
}
