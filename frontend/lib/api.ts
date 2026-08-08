// DejaView 后端请求封装。
// 基础地址来自 NEXT_PUBLIC_API_BASE（构建期内联），默认本地 8000。

import type {
  AnalyzeRequest,
  AnalyzeResponse,
  Health,
  Job,
  JobSummary,
  ProjectFingerprint,
} from "./types";

// 默认走同源相对路径(经 next.config.js 的 /api 反代到后端)——单端口即可跑通。
// 需要直连别的后端时再设 NEXT_PUBLIC_API_BASE。
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "").replace(/\/+$/, "");

// ===== 访问码：进站门 + 每次分析请求带上，后端强制校验（前端只是体验层）=====
const ACCESS_KEY = "dejaview_access";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getAccessCode(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ACCESS_KEY) || "";
}
export function setAccessCode(code: string): void {
  window.localStorage.setItem(ACCESS_KEY, code);
}
export function clearAccessCode(): void {
  window.localStorage.removeItem(ACCESS_KEY);
}
function accessHeaders(): Record<string, string> {
  const c = getAccessCode();
  return c ? { "X-Access-Code": c } : {};
}

/** 校验一个口令是否正确（进站门用）。 */
export async function checkAccess(code: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/access`, {
      method: "POST",
      cache: "no-store",
      headers: { "X-Access-Code": code },
    });
    if (!res.ok) return false;
    return !!(await res.json())?.ok;
  } catch {
    return false;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      // 报告页轮询需要实时数据，禁用缓存。
      cache: "no-store",
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...accessHeaders(),
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new Error("暂时无法连接分析服务。请确认后端已启动，或稍后重试。");
  }

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.text();
      // FastAPI 错误体是 {"detail": "..."}; 取出人类可读文案。
      try {
        detail = (JSON.parse(body)?.detail as string) ?? body;
      } catch {
        detail = body;
      }
    } catch {
      detail = "";
    }
    if (res.status === 403) {
      clearAccessCode();
      throw new ApiError("访问码已失效或无权限。请刷新页面后重新验证。", res.status);
    }
    if (res.status === 404) {
      throw new ApiError("找不到这份任务或报告；它可能已过期，或服务刚刚重启。", res.status);
    }
    if (res.status === 429) {
      throw new ApiError(detail || "请求过于频繁，请稍后再试。", res.status);
    }
    if ([502, 503, 504].includes(res.status)) {
      throw new ApiError("分析服务暂时不可用，请稍后重试。", res.status);
    }
    throw new ApiError(detail || `请求失败（${res.status}）`, res.status);
  }

  return (await res.json()) as T;
}

/** 提交分析任务。 */
export function analyze(body: AnalyzeRequest): Promise<AnalyzeResponse> {
  return request<AnalyzeResponse>("/api/analyze", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** 拉取任务状态（供报告页轮询）。demo-<slug> 直接读预生成的静态报告（秒开）。 */
export function getJob(jobId: string): Promise<Job> {
  if (jobId.startsWith("demo-")) {
    const slug = jobId.slice("demo-".length);
    return request<Job>(`/demos/${encodeURIComponent(slug)}.json`);
  }
  return request<Job>(`/api/jobs/${encodeURIComponent(jobId)}`);
}

/** 最近任务列表（历史 / 复检对比）。 */
export function listJobs(limit = 20): Promise<JobSummary[]> {
  return request<JobSummary[]>(`/api/jobs?limit=${limit}`);
}

/** 提交用户编辑后的项目指纹，后端从"搜索"阶段恢复流水线。 */
export function confirmFingerprint(
  jobId: string,
  fingerprint: ProjectFingerprint,
): Promise<Job> {
  return request<Job>(`/api/jobs/${encodeURIComponent(jobId)}/confirm`, {
    method: "POST",
    body: JSON.stringify(fingerprint),
  });
}

/** 后端健康检查。 */
export function health(): Promise<Health> {
  return request<Health>("/api/health");
}
