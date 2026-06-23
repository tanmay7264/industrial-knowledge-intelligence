import type { LoaderResult } from "../types";

// Pages with fewer characters than this are treated as scanned/image-based
const SPARSE_THRESHOLD = 80;

// Lazy singleton so GlobalWorkerOptions is only set once per process
let pdfjsCache: Promise<typeof import("pdfjs-dist")> | null = null;

async function getPdfJs() {
  if (!pdfjsCache) {
    pdfjsCache = import("pdfjs-dist").then((lib) => {
      // No worker needed in a Node.js server context
      lib.GlobalWorkerOptions.workerSrc = "";
      return lib;
    });
  }
  return pdfjsCache;
}

async function extractPageTexts(
  buffer: Buffer
): Promise<{ texts: string[]; totalPages: number }> {
  const pdfjs = await getPdfJs();

  const doc = await pdfjs
    .getDocument({
      data: new Uint8Array(buffer),
      disableFontFace: true,
    })
    .promise;

  const texts: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    texts.push(text);
  }

  return { texts, totalPages: doc.numPages };
}

async function renderPageToPng(
  buffer: Buffer,
  pageNum: number
): Promise<Buffer | null> {
  try {
    // canvas is an optional peer dep — fail silently if not installed
    const canvasMod = await import("canvas");
    const pdfjs = await getPdfJs();

    const doc = await pdfjs
      .getDocument({
        data: new Uint8Array(buffer),
        disableFontFace: true,
      })
      .promise;

    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = canvasMod.createCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext("2d");

    await page.render({
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport,
      canvas: canvas as unknown as HTMLCanvasElement,
    }).promise;

    return canvas.toBuffer("image/png");
  } catch {
    return null;
  }
}

async function ocrPage(
  pdfBuffer: Buffer,
  pageNum: number
): Promise<string | null> {
  const imageBuffer = await renderPageToPng(pdfBuffer, pageNum);
  if (!imageBuffer) return null;

  try {
    const Tesseract = (await import("tesseract.js")).default;
    const { data } = await Tesseract.recognize(imageBuffer, "eng");
    return data.text.trim() || null;
  } catch {
    return null;
  }
}

export async function loadPdf(
  buffer: Buffer,
  fileName: string
): Promise<LoaderResult[]> {
  const { texts, totalPages } = await extractPageTexts(buffer);

  if (texts.length === 0) {
    return [
      {
        text: "[No text could be extracted from this PDF]",
        pageOrSection: 1,
        sourceMeta: { fileName, fileType: "pdf", totalPages: 0 },
      },
    ];
  }

  const results: LoaderResult[] = [];

  for (let i = 0; i < texts.length; i++) {
    let text = texts[i];
    let ocrApplied = false;
    const isScanned = text.length < SPARSE_THRESHOLD;

    if (isScanned) {
      const ocrText = await ocrPage(buffer, i + 1);
      if (ocrText && ocrText.length > text.length) {
        text = ocrText;
        ocrApplied = true;
      }
    }

    results.push({
      text: text || `[Page ${i + 1}: image-only, OCR unavailable]`,
      pageOrSection: i + 1,
      sourceMeta: {
        fileName,
        fileType: "pdf",
        totalPages,
        isScanned,
        ocrApplied,
      },
    });
  }

  return results;
}

export async function loadImage(
  buffer: Buffer,
  fileName: string,
  fileType: string
): Promise<LoaderResult[]> {
  try {
    const Tesseract = (await import("tesseract.js")).default;
    const { data } = await Tesseract.recognize(buffer, "eng");
    return [
      {
        text: data.text.trim() || "[No text found in image]",
        pageOrSection: 1,
        sourceMeta: { fileName, fileType, ocrApplied: true },
      },
    ];
  } catch {
    return [
      {
        text: "[Image OCR failed — tesseract.js unavailable]",
        pageOrSection: 1,
        sourceMeta: { fileName, fileType, ocrApplied: false },
      },
    ];
  }
}
