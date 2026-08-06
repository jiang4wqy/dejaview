/** @type {import('next').NextConfig} */
// 后端地址（服务端内部转发用）。默认本机 8010，可用 DEJAVIEW_BACKEND 覆盖。
const BACKEND = process.env.DEJAVIEW_BACKEND || "http://localhost:8010";

const nextConfig = {
  reactStrictMode: true,
  // 把 /api/* 反代到后端：浏览器只与前端同源通信，无需单独暴露后端端口。
  // 这样单个公网端口（或单条 SSH 隧道）即可跑通整个应用。
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND}/api/:path*` }];
  },
};

module.exports = nextConfig;
