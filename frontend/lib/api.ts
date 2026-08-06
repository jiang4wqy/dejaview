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

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, "") ??
  "http://localhost:8000";

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
      detail = await res.text();
    } catch {
      detail = "";
    }
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

/** 拉取任务状态（供报告页轮询）。 */
export function getJob(jobId: string): Promise<Job> {
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
