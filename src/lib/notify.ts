const DEFAULT_TO = "venturedirectors@gmail.com";
const DEFAULT_FROM = "Venture Directors <onboarding@resend.dev>";

export function quoteEmailConfig() {
  return {
    to: process.env.QUOTE_NOTIFY_EMAIL || DEFAULT_TO,
    from: process.env.QUOTE_FROM_EMAIL || DEFAULT_FROM,
    enabled: Boolean(process.env.RESEND_API_KEY),
  };
}

export async function notifyOffice(subject: string, text: string) {
  const { to, from, enabled } = quoteEmailConfig();
  if (!enabled) {
    console.warn(`Saved the request. Email is off until RESEND_API_KEY is set. It would go to ${to}.`);
    return { sent: false as const, missing: "RESEND_API_KEY" };
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, text }),
    });
    if (!response.ok) {
      console.error("quote email failed", response.status);
      return { sent: false as const, missing: "" };
    }
    return { sent: true as const, missing: "" };
  } catch (error) {
    console.error("quote email failed", error instanceof Error ? error.message : error);
    return { sent: false as const, missing: "" };
  }
}
