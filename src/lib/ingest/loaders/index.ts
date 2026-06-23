import type { LoaderResult } from "../types";
import { loadPdf, loadImage } from "./pdf";
import { loadSpreadsheet } from "./spreadsheet";
import { loadEmail, loadText } from "./email";

const IMAGE_TYPES = ["png", "jpg", "jpeg", "tiff", "webp"] as const;
const SUPPORTED_TYPES = [
  "pdf",
  ...IMAGE_TYPES,
  "xlsx",
  "csv",
  "eml",
  "txt",
] as const;

export type SupportedExt = (typeof SUPPORTED_TYPES)[number];

export function getFileExt(fileName: string): SupportedExt | null {
  const ext = fileName.split(".").pop()?.toLowerCase();
  return SUPPORTED_TYPES.includes(ext as SupportedExt)
    ? (ext as SupportedExt)
    : null;
}

export async function loadDocument(
  buffer: Buffer,
  fileName: string
): Promise<LoaderResult[]> {
  const ext = getFileExt(fileName);

  if (!ext) {
    throw new Error(
      `Unsupported file type: "${fileName}". Supported: ${SUPPORTED_TYPES.join(", ")}`
    );
  }

  if (ext === "pdf") return loadPdf(buffer, fileName);
  if ((IMAGE_TYPES as readonly string[]).includes(ext))
    return loadImage(buffer, fileName, ext);
  if (ext === "xlsx" || ext === "csv") return loadSpreadsheet(buffer, fileName);
  if (ext === "eml") return loadEmail(buffer, fileName);
  return loadText(buffer, fileName);
}
