import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { Providers } from "@/core/providers";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Figtree({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: { default: "TrustUs Health Portal", template: "%s · TrustUs Health" },
  description: "Internal operations portal for TrustUs Health.",
  applicationName: "TrustUs Health Portal",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/brand/favicon.ico", apple: "/brand/icon-192.png" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#34495E", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
