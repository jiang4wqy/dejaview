import Link from "next/link";
import { DEMOS } from "@/lib/showcase-data";

export default function DemoPicker({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "demo-picker compact" : "demo-picker"}>
      <span className="mono faint">
        {compact ? "先看已跑好的报告：" : "已跑好的示例报告 · 秒开，不消耗 API Key："}
      </span>
      <div className="demo-picker-links">
        {DEMOS.map((demo) => (
          <Link key={demo.slug} className="chip-demo" href={`/report/demo-${demo.slug}`}>
            {demo.label} <b>重复度 {demo.duplication}</b>
          </Link>
        ))}
      </div>
    </div>
  );
}
