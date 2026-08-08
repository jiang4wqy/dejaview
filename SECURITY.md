# Security Policy

## 报告漏洞

请优先通过仓库的 [GitHub Security Advisory](https://github.com/jiang4wqy/dejaview/security/advisories/new) 私下报告。不要在公开 Issue、日志或截图中粘贴 API Key、访问码、私有仓库地址或用户数据。

报告应包含受影响版本、复现步骤、影响范围和建议修复方式。维护者确认前，请不要公开利用细节。

## 密钥与部署

- API Key 只能存放在服务器环境变量、未提交的 `.env` 或部署平台 Secret 中。
- 浏览器端变量、`NEXT_PUBLIC_*`、仓库文件和 Docker 镜像层都不适合保存秘密。
- 公开部署会消耗部署者自己的模型额度；请启用访问码、每 IP 限流和全站每日硬上限。
- 默认只对外开放前端端口。Redis、Postgres 和后端 API 应留在容器或私有网络。
- 不要向公开实例提交私有仓库、内网 URL 或敏感业务说明。

如果密钥曾进入 Git 历史，应立即在服务商处吊销并轮换；仅删除当前文件不足以消除泄露。

## 支持范围

安全更新以当前 `main` 分支为准。旧提交和个人分叉不承诺持续修复。
