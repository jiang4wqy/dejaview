"""评测数据集 —— 真实项目, 覆盖三类: crowded(明显重复) / novel(较创新) / hard(难判断)。

用于 `scripts/eval.py` 校准: 项目指纹是否准、Top5 是否相关、证据是否可追溯、重复度是否稳定。
可继续往里加(目标 20-30 个)。website 缺失时走 GitHub-only(测可选路径)。
"""
from __future__ import annotations

DATASET: list[dict] = [
    # ---- crowded: 拥挤赛道, 预期重复度偏高 ----
    {"name": "Gitingest", "category": "crowded",
     "website": "https://gitingest.com", "github": "https://github.com/cyclotruc/gitingest",
     "problem": "把 Git 仓库转成适合喂给 LLM 的文本"},
    {"name": "Repomix", "category": "crowded",
     "website": "https://repomix.com", "github": "https://github.com/yamadashy/repomix",
     "problem": "把整个仓库打包成 LLM 友好的单文件"},
    {"name": "Dub", "category": "crowded",
     "website": "https://dub.co", "github": "https://github.com/dubinc/dub",
     "problem": "短链接 / 链接管理"},
    {"name": "Umami", "category": "crowded",
     "website": "https://umami.is", "github": "https://github.com/umami-software/umami",
     "problem": "隐私友好的网站分析"},
    {"name": "Plausible", "category": "crowded",
     "website": "https://plausible.io", "github": "https://github.com/plausible/analytics",
     "problem": "轻量隐私网站分析"},
    {"name": "Excalidraw", "category": "crowded",
     "website": "https://excalidraw.com", "github": "https://github.com/excalidraw/excalidraw",
     "problem": "手绘风白板 / 图表"},
    {"name": "tldraw", "category": "crowded",
     "website": "https://tldraw.com", "github": "https://github.com/tldraw/tldraw",
     "problem": "可嵌入的白板 SDK"},

    # ---- novel: 相对独特 ----
    {"name": "n8n", "category": "novel",
     "website": "https://n8n.io", "github": "https://github.com/n8n-io/n8n",
     "problem": "可自托管的工作流自动化(公平代码许可)"},
    {"name": "Supabase", "category": "novel",
     "website": "https://supabase.com", "github": "https://github.com/supabase/supabase",
     "problem": "开源 Firebase 替代(Postgres 为核心)"},
    {"name": "Ollama", "category": "novel",
     "website": "https://ollama.com", "github": "https://github.com/ollama/ollama",
     "problem": "本地一行命令跑大模型"},
    {"name": "Marker", "category": "novel",
     "website": None, "github": "https://github.com/VikParuchuri/marker",
     "problem": "PDF 转 markdown(高精度)"},
    {"name": "MinerU", "category": "novel",
     "website": None, "github": "https://github.com/opendatalab/MinerU",
     "problem": "PDF/文档抽取为结构化数据"},

    # ---- hard: 难判断 / 边界 ----
    {"name": "Firecrawl", "category": "hard",
     "website": "https://firecrawl.dev", "github": "https://github.com/mendableai/firecrawl",
     "problem": "把网站抓成 LLM 友好的干净数据"},
    {"name": "Crawl4AI", "category": "hard",
     "website": None, "github": "https://github.com/unclecode/crawl4ai",
     "problem": "面向 LLM 的开源抓取器"},
    {"name": "Continue", "category": "hard",
     "website": "https://continue.dev", "github": "https://github.com/continuedev/continue",
     "problem": "开源 AI 代码助手(IDE 插件)"},
    {"name": "Cal.com", "category": "hard",
     "website": "https://cal.com", "github": "https://github.com/calcom/cal.com",
     "problem": "开源日程预约(Calendly 替代)"},
]
