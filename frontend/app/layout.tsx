import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "DejaView · 项目锐评",
  description: "DejaView 锐评你的项目：重复度、亮点、问题与改进建议。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh">
      <body>
        <header className="app-topbar">
          <div className="app-topbar-inner">
            <a href="/" className="brand">
              <span className="dot" aria-hidden="true" />
              DejaView <small>// 项目锐评</small>
            </a>
            <ThemeToggle />
          </div>
        </header>
        <main className="main">{children}</main>
      </body>
    </html>
  );
}
