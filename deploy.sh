#!/usr/bin/env bash
# DejaView 一键部署 —— 填好 key 后跑起整套 (redis + 后端 API + rq worker + 前端)。
# 用法:
#   ./deploy.sh          # 首次会生成 .env 并提示填 key；填好后再跑一次即启动
#   docker compose down  # 停止
set -euo pipefail
cd "$(dirname "$0")"

# 0) 前置检查
if ! command -v docker >/dev/null 2>&1; then
  echo "❌ 未检测到 docker。请先安装 Docker（含 docker compose 插件）: https://docs.docker.com/engine/install/"
  exit 1
fi

# 1) 首次：从模板生成 .env
if [ ! -f .env ]; then
  cp deploy.env.example .env
  echo "📝 已生成 .env。请填入 DeepSeek key 和访问码，然后重新运行 ./deploy.sh"
  echo "   编辑：  nano .env"
  exit 1
fi

# 2) 校验 key 已填
if grep -qE '^DEJAVIEW_PROVIDER=deepseek$' .env && \
   { grep -qE '^DEEPSEEK_API_KEY=(<your-deepseek-api-key>|sk-xxx)?$' .env || ! grep -qE '^DEEPSEEK_API_KEY=.+' .env; }; then
  echo "⚠️  .env 里的 DEEPSEEK_API_KEY 还没填真实值。"
  echo "   编辑：  nano .env"
  exit 1
fi

if grep -qE '^DEJAVIEW_ACCESS_CODE=(<choose-a-strong-access-code>)?$' .env; then
  echo "⚠️  建议先设置 DEJAVIEW_ACCESS_CODE，再把服务开放到公网。"
fi

# 3) 构建并启动
echo "🚀 正在构建并启动 DejaView（首次拉取/构建镜像约需几分钟）…"
docker compose up -d --build

echo
echo "✅ 已启动！"
echo "   本机访问：   http://localhost:3000"
echo "   服务器部署： http://<你的公网IP或域名>:3000   （只需对外开放 3000 端口）"
echo "   查看日志：   docker compose logs -f"
echo "   停止：       docker compose down"
