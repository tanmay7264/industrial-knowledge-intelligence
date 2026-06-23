import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent bundling of native / heavy Node.js packages — load them directly in the runtime
  serverExternalPackages: ["canvas", "tesseract.js", "pdfjs-dist", "pdf-parse"],
};

export default nextConfig;
