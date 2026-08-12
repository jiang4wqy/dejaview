"""把中文预生成示例翻成英文(信达雅), 只译前端渲染的文本字段, 结构/数字/URL/证据原文一律保留,
写到 frontend/public/demos/en/<slug>.json。前端在英文界面下优先读 en/ 版本。

逐字段**纯文本**翻译(不套 JSON schema, 避免长 markdown 批量把结构化输出搞崩), 并发加速,
单字段失败/被拒即保留中文原文(demo 不至于半途崩)。用法(需真实 provider, 见 backend/.env):
    ./.venv/bin/python scripts/translate_demo.py                 # 默认 gitingest excalidraw kutt
"""
from __future__ import annotations

import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor

import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # backend/

from app.config import get_settings  # noqa: E402

_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEMO_DIR = os.path.join(_ROOT, "frontend", "public", "demos")

SYS = (
    "You are a top literary translator. Translate the user's Chinese text into natural, idiomatic, "
    "vivid ENGLISH — faithful, fluent, elegant (信/达/雅). Preserve its PERSONALITY and register "
    "(arrogant Wall-Street VC / savage stand-up roast / gushing praise), and keep all Markdown, emoji, "
    "line breaks, inline code and URLs intact. This is a pure translation task. "
    "Output ONLY the English translation — no preamble, no quotes, no notes."
)


def _collect(job: dict) -> list[tuple]:
    """收集前端会渲染的中文文本字段引用 (container, key)；证据原文/名称/URL/枚举/数字不译。"""
    refs: list[tuple] = []

    def add(o, k):
        if isinstance(o, dict) and isinstance(o.get(k), str) and o[k].strip():
            refs.append((o, k))

    def add_list(o, k):
        arr = o.get(k) if isinstance(o, dict) else None
        if isinstance(arr, list):
            refs.extend((arr, i) for i, v in enumerate(arr) if isinstance(v, str) and v.strip())

    for rep in (job.get("reports") or {}).values():
        for k in ("headline", "body_markdown", "verdict_line", "top_fix", "why_line"):
            add(rep, k)
    res = job.get("result") or {}
    fp = res.get("fingerprint") or {}
    for k in ("one_liner", "target_users", "problem", "business_model", "functional_signature"):
        add(fp, k)
    for k in ("core_features", "claimed_novelty", "conflicts", "unknowns"):
        add_list(fp, k)
    for d in fp.get("observed_differentiators") or []:
        add(d, "description")
    dup = res.get("duplication") or {}
    for k in ("rationale", "search_scope_note"):
        add(dup, k)
    for n in dup.get("novelty") or []:
        add(n, "description")
    for grp in ("issues", "strengths"):
        for f in res.get(grp) or []:
            add(f, "title")
            add(f, "detail")
    for imp in res.get("improvements") or []:
        add(imp, "title")
        add(imp, "rationale")
        add_list(imp, "learn_from")
    for c in res.get("candidates") or []:
        add(c, "notes")
        add(c.get("ref") or {}, "why_surfaced")
    return refs


def main() -> None:
    slugs = sys.argv[1:] or ["gitingest", "excalidraw", "kutt"]
    s = get_settings()
    key = os.getenv(s.deepseek_api_key_env, "")
    if not key:
        raise SystemExit("缺少 DEEPSEEK_API_KEY(见 backend/.env)")
    client = httpx.Client(base_url=s.deepseek_base_url.rstrip("/"), timeout=120, trust_env=True,
                          headers={"Authorization": f"Bearer {key}"})

    def translate(text: str) -> str:
        try:
            r = client.post("/chat/completions", json={
                "model": s.model_cheap, "temperature": 0.3,
                "messages": [{"role": "system", "content": SYS}, {"role": "user", "content": text}]})
            r.raise_for_status()
            out = (r.json()["choices"][0]["message"].get("content") or "").strip()
            return out or text                              # 空/被拒 → 保留原文
        except Exception as e:  # noqa: BLE001
            print(f"    字段翻译失败, 保留原文: {e}")
            return text

    os.makedirs(os.path.join(DEMO_DIR, "en"), exist_ok=True)
    for slug in slugs:
        with open(os.path.join(DEMO_DIR, f"{slug}.json"), encoding="utf-8") as f:
            job = json.load(f)
        refs = _collect(job)
        src = [obj[key_] for obj, key_ in refs]
        print(f"{slug}: 并发翻译 {len(refs)} 个字段…")
        with ThreadPoolExecutor(max_workers=8) as ex:
            translated = list(ex.map(translate, src))
        kept = sum(1 for a, b in zip(src, translated) if a == b)
        for (obj, key_), t in zip(refs, translated):
            obj[key_] = t
        job["language"] = "en"
        if isinstance(job.get("request"), dict):
            job["request"]["language"] = "en"
        dst = os.path.join(DEMO_DIR, "en", f"{slug}.json")
        with open(dst, "w", encoding="utf-8") as f:
            json.dump(job, f, ensure_ascii=False, indent=2)
        print(f"  -> {dst}  (保留原文 {kept}/{len(refs)} 个)")


if __name__ == "__main__":
    main()
