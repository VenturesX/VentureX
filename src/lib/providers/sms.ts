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

export function getSmsProvider(): SmsProvider {
  return new MockSmsProvider();
}
