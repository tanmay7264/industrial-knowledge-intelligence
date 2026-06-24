import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IKI — Industrial Knowledge Intelligence",
  description:
    "Turn scattered industrial documents into a cited, graph-aware question-answering system with automated compliance gap detection.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex flex-1 flex-col pl-16">
            {children}
          </div>
        </div>
        <Toaster position="top-center" theme="dark" richColors closeButton />
      </body>
    </html>
  );
}
