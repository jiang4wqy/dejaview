import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import AppChrome from "@/components/AppChrome";

export const metadata: Metadata = {
  title: {
    default: "DejaView · Evidence-Based Project Roast",
    template: "%s · DejaView",
  },
  description:
    "Drop in a public website or GitHub repo and get a fully sourced verdict on its fingerprint, look-alikes, and duplication score — the facts stay put, only the tone changes, across Gilt, Roast, and Rainbow.",
  applicationName: "DejaView",
  keywords: ["project analysis", "competitive analysis", "GitHub", "AI", "open source"],
  authors: [{ name: "jiang4wqy" }],
  icons: { icon: "/icon.svg" },
  openGraph: {
    title: "DejaView · Evidence-Based Project Roast",
    description: "Search, verify, and judge duplication. The tone changes. The facts don't.",
    type: "website",
    locale: "en_US",
    siteName: "DejaView",
  },
  twitter: {
    card: "summary",
    title: "DejaView · Evidence-Based Project Roast",
    description: "Search, verify, and judge duplication. The tone changes. The facts don't.",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#09090b",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
