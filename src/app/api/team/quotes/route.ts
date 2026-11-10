import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { crewDenied } from "@/lib/crew-guard";
import { quoteDetailsSelect, quoteAlertKey, QUOTE_TEST_ALERT_KEY, type QuoteAlert } from "@/lib/quote-details";
import { notifyOffice, quoteEmailConfig } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await crewDenied(["admin"]);
  if (denied) return denied;
  const [quotes, calls] = await Promise.all([
    db.quoteRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: quoteDetailsSelect,
    }),
    db.callbackRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  const keys = quotes.map((quote) => quoteAlertKey(quote.id));
  const settings = await db.appSetting.findMany({ where: { key: { in: [...keys, QUOTE_TEST_ALERT_KEY] } } });
  const alerts = new Map(settings.map((setting) => {
    let alert: QuoteAlert | null = null;
    try { alert = JSON.parse(setting.value) as QuoteAlert; } catch { /* Older or missing status. */ }
    return [setting.key, alert] as const;
  }));
  const config = quoteEmailConfig();
  return NextResponse.json({
    email: { ...config, test: alerts.get(QUOTE_TEST_ALERT_KEY) ?? null },
    quotes: quotes.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), alert: alerts.get(quoteAlertKey(row.id)) ?? null })),
    calls: calls.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
  });
}

// Only the signed-in owner/admin can send this fixed test to the configured office address.
export async function POST() {
  const denied = await crewDenied(["admin"]);
  if (denied) return denied;
  const delivery = await notifyOffice("Venture Directors quote alert test", "This is a test of your quote alert email. New quote alerts will include the full request details. No client request was created.");
  const alert: QuoteAlert = { state: delivery.sent ? "accepted" : delivery.missing ? "not_configured" : "failed", detail: delivery.detail, attemptedAt: new Date().toISOString() };
  const value = JSON.stringify(alert);
  await db.appSetting.upsert({ where: { key: QUOTE_TEST_ALERT_KEY }, create: { key: QUOTE_TEST_ALERT_KEY, value }, update: { value } });
  return NextResponse.json({ alert });
}
