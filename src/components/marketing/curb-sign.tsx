import { headers } from "next/headers";
import * as QRCode from "qrcode";
import { VentureMark } from "@/components/marketing/logo";

export async function CurbSign() {
  const svg = await quoteQrSvg();
  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      <div className="pointer-events-none absolute inset-x-6 inset-y-8 -z-10 rounded-full bg-[#1E90FF]/30 blur-2xl" aria-hidden="true" />
      <div className="rounded-[28px] border-[3px] border-[#1E90FF] bg-[#05060a] px-6 pb-7 pt-8 shadow-[0_0_48px_rgba(30,144,255,0.38)]">
        <VentureMark className="mx-auto h-14 w-14" />
        <div className="mt-4 text-center text-[1.7rem] font-semibold tracking-[0.18em]">VENTURE</div>
        <div className="mt-2 flex items-center gap-3 text-[11px] tracking-[0.34em] text-white/90">
          <span className="h-px flex-1 bg-[#1E90FF]" />
          DIRECTORS
          <span className="h-px flex-1 bg-[#1E90FF]" />
        </div>
        <p className="mt-6 text-center text-[13px] font-medium leading-relaxed tracking-[0.16em] text-white">
          GROUP TRANSPORTATION,
          <br />
          HANDLED.
        </p>
        {svg ? (
          <div className="qr-frame mx-auto mt-6 w-[148px] rounded-md bg-white p-2" dangerouslySetInnerHTML={{ __html: svg }} />
        ) : null}
        <p className="mt-3 text-center text-[11px] font-medium tracking-[0.22em] text-[#1E90FF]">GET A QUOTE</p>
      </div>
    </div>
  );
}

async function quoteQrSvg() {
  try {
    const headerList = await headers();
    const host = (headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "").split(",")[0].trim();
    if (!/^[a-zA-Z0-9.:-]+$/.test(host)) return null;
    const forwarded = headerList.get("x-forwarded-proto")?.split(",")[0].trim();
    const proto = forwarded === "http" || forwarded === "https"
      ? forwarded
      : host.startsWith("localhost") || host.startsWith("127.")
        ? "http"
        : "https";
    const svg = await QRCode.toString(`${proto}://${host}/quote`, {
      type: "svg",
      margin: 0,
      errorCorrectionLevel: "M",
      color: { dark: "#111111", light: "#ffffff" },
    });
    return svg.replace(/<\?xml[^>]*>/, "").trim();
  } catch {
    return null;
  }
}
