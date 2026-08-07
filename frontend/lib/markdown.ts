// 极简 Markdown → HTML（无第三方依赖）。
// 支持：标题(#)、无序/有序列表、引用(>)、加粗(**)、斜体(*)、行内代码(`)、链接([]())。
// 先做 HTML 转义，再插入受控标签，避免注入。

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// 行内标记。输入已经过 HTML 转义。
function renderInline(s: string): string {
  return s
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(
      /\[([^\]]+)\]\(([^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>',
    );
}

export function markdownToHtml(md: string): string {
  const src = escapeHtml(md ?? "");
  const lines = src.split(/\r?\n/);
  const out: string[] = [];

  let list: "ul" | "ol" | null = null;
  let paraBuf: string[] = [];
  let quoteBuf: string[] = [];

  const flushPara = () => {
    if (paraBuf.length) {
      out.push(`<p>${renderInline(paraBuf.join(" "))}</p>`);
      paraBuf = [];
    }
  };
  const flushList = () => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };
  const flushQuote = () => {
    if (quoteBuf.length) {
      out.push(`<blockquote>${renderInline(quoteBuf.join(" "))}</blockquote>`);
      quoteBuf = [];
    }
  };
  const flushAll = () => {
    flushPara();
    flushList();
    flushQuote();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    // 空行：结束当前块。
    if (!line.trim()) {
      flushAll();
      continue;
    }

    // 标题。
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushAll();
      const level = heading[1].length;
      out.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    // 引用。
    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushPara();
      flushList();
      quoteBuf.push(quote[1]);
      continue;
    }

    // 无序列表。
    const ul = line.match(/^[-*+]\s+(.*)$/);
    if (ul) {
      flushPara();
      flushQuote();
      if (list !== "ul") {
        flushList();
        out.push("<ul>");
        list = "ul";
      }
      out.push(`<li>${renderInline(ul[1])}</li>`);
      continue;
    }

    // 有序列表。
    const ol = line.match(/^\d+\.\s+(.*)$/);
    if (ol) {
      flushPara();
      flushQuote();
      if (list !== "ol") {
        flushList();
        out.push("<ol>");
        list = "ol";
      }
      out.push(`<li>${renderInline(ol[1])}</li>`);
      continue;
    }

    // 普通段落行。
    flushList();
    flushQuote();
    paraBuf.push(line);
  }

  flushAll();
  return out.join("\n");
}
