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
import { getLang, tSync } from "./i18n";

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
    throw new Error(tSync("api.connError"));
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
      throw new ApiError(tSync("api.accessExpired"), res.status);
    }
    if (res.status === 404) {
      throw new ApiError(tSync("api.notFound"), res.status);
    }
    if (res.status === 429) {
      throw new ApiError(detail || tSync("api.tooManyRequests"), res.status);
    }
    if ([502, 503, 504].includes(res.status)) {
      throw new ApiError(tSync("api.serviceUnavailable"), res.status);
    }
    throw new ApiError(detail || tSync("api.requestFailed", { status: res.status }), res.status);
  }

  return (await res.json()) as T;
}

/** 提交分析任务。语言统一从当前界面语言取（覆盖调用方传入的值），前后端字段名一致。 */
export function analyze(body: AnalyzeRequest): Promise<AnalyzeResponse> {
  return request<AnalyzeResponse>("/api/analyze", {
    method: "POST",
    body: JSON.stringify({ ...body, language: getLang() }),
  });
}

/**
 * 拉取任务状态（供报告页轮询）。demo-<slug> 直接读预生成的静态报告（秒开）。
 * 英文界面下优先取 /demos/en/<slug>.json；不存在(404)时回退到中文版 /demos/<slug>.json。
 */
export function getJob(jobId: string): Promise<Job> {
  if (jobId.startsWith("demo-")) {
    const slug = jobId.slice("demo-".length);
    const zhPath = `/demos/${encodeURIComponent(slug)}.json`;
    if (getLang() === "en") {
      return request<Job>(`/demos/en/${encodeURIComponent(slug)}.json`).catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          return request<Job>(zhPath);
        }
        throw err;
      });
    }
    return request<Job>(zhPath);
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
