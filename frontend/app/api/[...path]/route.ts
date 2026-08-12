// 运行时反代：把 /api/* 转发到后端。与 next.config 的 rewrites 不同，这里在**请求时**
// 读取 DEJAVIEW_BACKEND，因此云平台(如 Render)运行时设的后端地址能立即生效，无需重建。
import { type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function backend(): string {
  let b = process.env.DEJAVIEW_BACKEND || "http://localhost:8000";
  if (!/^https?:\/\//.test(b)) b = `https://${b}`; // 只给主机名时补 https://
  return b.replace(/\/+$/, "");
}

async function proxy(req: NextRequest, path: string[]): Promise<Response> {
  const url = `${backend()}/api/${path.join("/")}${req.nextUrl.search || ""}`;
  const headers: Record<string, string> = {
    "content-type": req.headers.get("content-type") || "application/json",
  };
  // 透传真实客户端 IP，后端按 IP 限流才准
  const xff = req.headers.get("x-forwarded-for");
  if (xff) headers["x-forwarded-for"] = xff;
  // 透传访问码，后端才校验得到（否则进站门永远判错）
  const ac = req.headers.get("x-access-code");
  if (ac) headers["x-access-code"] = ac;

  const init: RequestInit = { method: req.method, headers, cache: "no-store" };
  if (req.method !== "GET" && req.method !== "HEAD") init.body = await req.text();

  try {
    const res = await fetch(url, init);
    const responseHeaders: Record<string, string> = {
      "content-type": res.headers.get("content-type") || "application/json",
    };
    const retryAfter = res.headers.get("retry-after");
    if (retryAfter) responseHeaders["retry-after"] = retryAfter;
    return new Response(await res.arrayBuffer(), {
      status: res.status,
      headers: responseHeaders,
    });
  } catch {
    return new Response(
      JSON.stringify({ detail: "Analysis service is temporarily unavailable, please try again later." }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  }
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return proxy(req, path);
}
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return proxy(req, path);
}
