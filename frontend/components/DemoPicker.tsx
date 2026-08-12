"use client";

import Link from "next/link";
import { DEMOS } from "@/lib/showcase-data";
import { useLang } from "@/lib/i18n";

export default function DemoPicker({ compact = false }: { compact?: boolean }) {
  const { t } = useLang();
  return (
    <div className={compact ? "demo-picker compact" : "demo-picker"}>
      <span className="mono faint">
        {compact ? t("demo.compactLabel") : t("demo.fullLabel")}
      </span>
      <div className="demo-picker-links">
        {DEMOS.map((demo) => (
          <Link key={demo.slug} className="chip-demo" href={`/report/demo-${demo.slug}`}>
            {demo.label} <b>{t("demo.dupLabel")} {demo.duplication}</b>
          </Link>
        ))}
      </div>
    </div>
  );
}
