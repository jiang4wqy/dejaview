import { markdownToHtml } from "@/lib/markdown";

// 用受控转义后的 HTML 渲染 body_markdown。
export default function Markdown({ text }: { text: string }) {
  return (
    <div
      className="markdown"
      dangerouslySetInnerHTML={{ __html: markdownToHtml(text) }}
    />
  );
}
