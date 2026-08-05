import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "DejaView · 项目锐评",
  description: "DejaView 锐评你的项目：重复度、亮点、问题与改进建议。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh">
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <a href="/" className="brand">
              <span className="brand-name">DejaView</span>
              <span className="brand-sep">·</span>
              <span className="brand-sub">项目锐评</span>
            </a>
          </div>
        </header>
        <main className="main">{children}</main>
      </body>
    </html>
  );
}
