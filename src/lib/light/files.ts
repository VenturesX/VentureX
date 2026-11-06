import zlib from "node:zlib";
import Papa from "papaparse";
import { parseManifestText, rowsFromMatrix, type ManifestRow } from "@/lib/light/parse-manifest";

const MAX_BYTES = 8 * 1024 * 1024;

export async function rowsFromUpload(file: File): Promise<{ rows: ManifestRow[]; note: string }> {
  if (file.size <= 0) return { rows: [], note: "That file is empty." };
  if (file.size > MAX_BYTES) return { rows: [], note: "Keep the file under 8 MB." };
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());
  if (name.endsWith(".csv") || file.type.includes("csv") || name.endsWith(".txt")) {
    return { rows: parseManifestText(buffer.toString("utf8")), note: "" };
  }
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const XLSX = await import("xlsx");
    const book = XLSX.read(buffer, { type: "buffer" });
    const sheet = book.Sheets[book.SheetNames[0]];
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as string[][];
    return { rows: rowsFromMatrix(matrix), note: "" };
  }
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const text = extractPdfText(buffer);
    const rows = parseManifestText(text);
    if (rows.length === 0) return { rows: [], note: "Could not read that PDF. Paste the text instead." };
    return { rows, note: "" };
  }
  if (file.type.startsWith("image/") || /\.(png|jpe?g|webp|heic)$/.test(name)) {
    const text = await ocrImage(buffer, file.type || "image/jpeg");
    if (!text) return { rows: [], note: "Photo reading needs OPENAI_API_KEY. Paste the text instead." };
    return { rows: parseManifestText(text), note: "" };
  }
  const asText = buffer.toString("utf8");
  if (asText.includes(",") || asText.includes("\t")) return { rows: parseManifestText(asText), note: "" };
  return { rows: [], note: "Use a PDF, image, CSV, or Excel file." };
}

export function parseCsv(text: string): ManifestRow[] {
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
  return rowsFromMatrix(parsed.data);
}

function extractPdfText(buffer: Buffer): string {
  const latin = buffer.toString("latin1");
  const chunks: string[] = [];
  const streamRe = /stream\r?\n([\s\S]*?)endstream/g;
  let match: RegExpExecArray | null;
  while ((match = streamRe.exec(latin))) {
    const raw = Buffer.from(match[1], "latin1");
    try {
      chunks.push(zlib.inflateSync(raw).toString("latin1"));
    } catch {
      chunks.push(raw.toString("latin1"));
    }
  }
  const blob = chunks.join("\n") || latin;
  const pieces = blob.match(/\((?:\\.|[^\\)]){2,}\)/g) ?? [];
  const text = pieces
    .map((piece) => piece.slice(1, -1).replace(/\\n/g, "\n").replace(/\\r/g, " ").replace(/\\t/g, " ").replace(/\\\(/g, "(").replace(/\\\)/g, ")").replace(/\\\\/g, "\\"))
    .join(" ");
  return text.replace(/[^\S\n]+/g, " ").trim();
}

async function ocrImage(buffer: Buffer, mime: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return "";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Read this manifest into CSV. Header: Date,Airline,Flight,Time,Last Name,First Name,Origin,Air Side,Vehicle,Notes,Car Seats,Cell,Vendor. Leave a cell blank if you cannot read it. No extra commentary.",
            },
            { type: "image_url", image_url: { url: `data:${mime};base64,${buffer.toString("base64")}` } },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) return "";
  const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}
