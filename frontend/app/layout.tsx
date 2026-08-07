import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import AppChrome from "@/components/AppChrome";

export const metadata: Metadata = {
  title: "DejaView · 项目锐评",
  description: "DejaView 锐评你的项目：重复度、亮点、问题与改进建议。镀金华尔街 or 毒舌马戏团，你选。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh">
      <body>
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
