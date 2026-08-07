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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      // 报告页轮询需要实时数据，禁用缓存。
      cache: "no-store",
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    // 网络层错误（后端未启动 / 跨域 / 断网）。
    throw new Error(`无法连接后端（${API_BASE}），请确认后端已启动。`);
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
    // 429 限流：直接展示后端给的友好提示。
    if (res.status === 429 && detail) throw new Error(detail);
    throw new Error(`请求失败（${res.status}）：${detail || res.statusText}`);
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
