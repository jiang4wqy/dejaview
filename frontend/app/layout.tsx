import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import AppChrome from "@/components/AppChrome";

export const metadata: Metadata = {
  title: {
    default: "DejaView · 证据化项目锐评",
    template: "%s · DejaView",
  },
  description: "输入公开网站或 GitHub 仓库，用可追溯证据分析项目指纹、同类竞品与重复度；事实不变，镀金、毒舌和彩虹三种语气任选。",
  applicationName: "DejaView",
  keywords: ["项目分析", "竞品分析", "GitHub", "AI", "开源"],
  authors: [{ name: "jiang4wqy" }],
  icons: { icon: "/icon.svg" },
  openGraph: {
    title: "DejaView · 证据化项目锐评",
    description: "搜索、核验并裁判项目重复度。语气会变，事实不会变。",
    type: "website",
    locale: "zh_CN",
    siteName: "DejaView",
  },
  twitter: {
    card: "summary",
    title: "DejaView · 证据化项目锐评",
    description: "搜索、核验并裁判项目重复度。语气会变，事实不会变。",
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
