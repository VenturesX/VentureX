import { db } from "@/lib/db";

export interface SmsProvider {
  name: string;
  send(to: string, body: string): Promise<{ id: string; status: string }>;
}

export class MockSmsProvider implements SmsProvider {
  name = "mock-sms";

  async send(to: string, body: string) {
    const row = await db.mockOutboundMessage.create({
      data: { channel: "SMS", to, body, status: "MOCK_SENT" },
    });
    return { id: row.id, status: row.status };
  }
}

export class TelnyxSmsProvider implements SmsProvider {
  name = "telnyx";

  constructor(
    private apiKey: string,
    private from: string,
    private profileId?: string,
  ) {}

  async send(to: string, body: string) {
    const response = await fetch("https://api.telnyx.com/v2/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to,
        text: body,
        ...(this.profileId ? { messaging_profile_id: this.profileId } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    const json = (await response.json().catch(() => ({}))) as { data?: { id?: string }; errors?: { detail?: string }[] };
    if (!response.ok) {
      throw new Error(json.errors?.[0]?.detail || `Telnyx send failed (${response.status})`);
    }
    return { id: json.data?.id || "telnyx", status: "SENT" };
  }
}

export class TwilioSmsProvider implements SmsProvider {
  name = "twilio";

  constructor(
    private accountSid: string,
    private authToken: string,
    private from: string,
  ) {}

  async send(to: string, body: string) {
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");
    const form = new URLSearchParams({ From: this.from, To: to, Body: body });
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      signal: AbortSignal.timeout(8000),
    });
    const json = (await response.json().catch(() => ({}))) as { sid?: string; message?: string };
    if (!response.ok) throw new Error(json.message || `Twilio send failed (${response.status})`);
    return { id: json.sid || "twilio", status: "SENT" };
  }
}

export function getSmsProvider(): SmsProvider {
  if (process.env.TELNYX_API_KEY && process.env.TELNYX_FROM_NUMBER) {
    return new TelnyxSmsProvider(
      process.env.TELNYX_API_KEY,
      process.env.TELNYX_FROM_NUMBER,
      process.env.TELNYX_MESSAGING_PROFILE_ID,
    );
  }
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER) {
    return new TwilioSmsProvider(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN, process.env.TWILIO_FROM_NUMBER);
  }
  return new MockSmsProvider();
}

export async function readInboundSms(request: Request): Promise<{ from: string; text: string } | null> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const from = String(form.get("From") ?? "");
    const text = String(form.get("Body") ?? "");
    if (!from || !text) return null;
    return { from, text };
  }
  const json = (await request.json().catch(() => null)) as {
    from?: string;
    text?: string;
    data?: { payload?: { from?: { phone_number?: string }; text?: string } };
  } | null;
  if (!json) return null;
  const from = json.data?.payload?.from?.phone_number || json.from || "";
  const text = json.data?.payload?.text || json.text || "";
  if (!from || !text) return null;
  return { from, text };
}
