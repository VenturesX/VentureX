const DEFAULT_TO = "venturedirectors@gmail.com";
const DEFAULT_FROM = "Venture Directors <onboarding@resend.dev>";

export function quoteEmailConfig() {
  return {
    to: process.env.QUOTE_NOTIFY_EMAIL || DEFAULT_TO,
    from: process.env.QUOTE_FROM_EMAIL || DEFAULT_FROM,
    enabled: Boolean(process.env.RESEND_API_KEY?.trim()),
  };
}

export async function notifyOffice(subject: string, text: string) {
  const { to, from, enabled } = quoteEmailConfig();
  if (!enabled) {
    console.warn(`Saved the request. Email is off until RESEND_API_KEY is set. It would go to ${to}.`);
    return { sent: false as const, missing: "RESEND_API_KEY", detail: "Email alerts are off. Add RESEND_API_KEY in Vercel and redeploy." };
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      console.error("quote email failed", response.status);
      const detail = response.status === 401
        ? "Resend rejected the API key. Check RESEND_API_KEY in Vercel and redeploy."
        : response.status === 403
          ? "Resend refused this sender or recipient. Check the API key permissions and verified sender domain. The resend.dev test sender can only email the Resend account address."
          : response.status === 429
            ? "Resend's sending limit was reached. Check the Resend dashboard."
            : `Resend rejected the email (HTTP ${response.status}). Check Resend logs for the reason.`;
      return { sent: false as const, missing: "", detail };
    }
    return { sent: true as const, missing: "", detail: "Accepted by the email service. Inbox delivery is not confirmed; check Gmail, including Spam." };
  } catch (error) {
    console.error("quote email failed", error instanceof Error ? error.message : error);
    return { sent: false as const, missing: "", detail: "The email service could not be reached or timed out. Check Resend and try a test alert." };
  }
}
