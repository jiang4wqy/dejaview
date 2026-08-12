"use client";

import { useLang } from "@/lib/i18n";

// 明暗切换：把 data-theme 打在 <html> 上，覆盖 prefers-color-scheme。
// 初始不预设 data-theme（跟随系统），首次点击时才根据当前生效主题取反。
export default function ThemeToggle() {
  const { t } = useLang();
  function toggle() {
    const root = document.documentElement;
    let cur = root.getAttribute("data-theme");
    if (!cur) {
      cur = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    root.setAttribute("data-theme", cur === "dark" ? "light" : "dark");
  }

  return (
    <button type="button" className="iconbtn" aria-label={t("theme.toggleAria")} onClick={toggle}>
      {t("theme.toggleLabel")}
    </button>
  );
}
