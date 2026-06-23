import type { LoaderResult } from "../types";

export async function loadEmail(
  buffer: Buffer,
  fileName: string
): Promise<LoaderResult[]> {
  try {
    const { simpleParser } = await import("mailparser");
    const parsed = await simpleParser(buffer);

    const body =
      parsed.text ??
      (parsed.html ? parsed.html.replace(/<[^>]+>/g, " ") : "");

    const parts = [
      parsed.subject ? `Subject: ${parsed.subject}` : null,
      parsed.from?.text ? `From: ${parsed.from.text}` : null,
      parsed.date ? `Date: ${parsed.date.toISOString()}` : null,
      parsed.to
        ? `To: ${Array.isArray(parsed.to) ? parsed.to.map((a) => a.text).join(", ") : parsed.to.text}`
        : null,
      "",
      body.replace(/\s+/g, " ").trim(),
    ]
      .filter((p): p is string => p !== null)
      .join("\n");

    return [
      {
        text: parts,
        pageOrSection: 1,
        sourceMeta: {
          fileName,
          fileType: "eml",
          subject: parsed.subject ?? undefined,
          from: parsed.from?.text ?? undefined,
        },
      },
    ];
  } catch {
    // Fallback: treat as plain text
    return [
      {
        text: buffer.toString("utf-8"),
        pageOrSection: 1,
        sourceMeta: { fileName, fileType: "eml" },
      },
    ];
  }
}

export function loadText(buffer: Buffer, fileName: string): LoaderResult[] {
  return [
    {
      text: buffer.toString("utf-8"),
      pageOrSection: 1,
      sourceMeta: { fileName, fileType: "txt" },
    },
  ];
}
