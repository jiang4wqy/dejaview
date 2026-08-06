import { markdownToHtml } from "@/lib/markdown";

// 用受控转义后的 HTML 渲染 body_markdown。
// className 允许调用方套用不同排版皮肤（如报告页的 .prose）。
export default function Markdown({
  text,
  className = "markdown",
}: {
  text: string;
  className?: string;
}) {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: markdownToHtml(text) }}
    />
  );
}
