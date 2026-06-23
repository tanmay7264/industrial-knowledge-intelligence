import * as XLSX from "xlsx";
import type { LoaderResult } from "../types";

export function loadSpreadsheet(
  buffer: Buffer,
  fileName: string
): LoaderResult[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const fileType = fileName.toLowerCase().endsWith(".csv") ? "csv" : "xlsx";
  const results: LoaderResult[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
    });

    if (rows.length === 0) continue;

    const headers = Object.keys(rows[0]);
    const lines = rows.map((row, i) => {
      const cells = headers
        .map((h) => `${h}: ${String(row[h] ?? "")}`)
        .join(" | ");
      return `Row ${i + 1}: ${cells}`;
    });

    results.push({
      text: [`Sheet: ${sheetName}`, ...lines].join("\n"),
      pageOrSection: sheetName,
      sourceMeta: {
        fileName,
        fileType,
        rowCount: rows.length,
      },
    });
  }

  return results.length > 0
    ? results
    : [
        {
          text: "[Empty spreadsheet]",
          pageOrSection: 1,
          sourceMeta: { fileName, fileType, rowCount: 0 },
        },
      ];
}
