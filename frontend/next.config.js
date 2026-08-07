/** @type {import('next').NextConfig} */
// /api/* 的反代改由运行时路由 app/api/[...path]/route.ts 处理（在请求时读 DEJAVIEW_BACKEND，
// 云平台运行时改后端地址即可生效）。这里不再用 rewrites —— 它的目标会在构建期被写死。
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;
