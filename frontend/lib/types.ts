// DejaView 后端接口的 TypeScript 类型定义。
// 与 FastAPI 契约保持一致，字段命名沿用 snake_case。

export type Tone = "serious" | "roast" | "comfort";

export type JobStatus =
  | "queued"
  | "running"
  | "await_confirm"
  | "done"
  | "error";

export type Confidence = "high" | "medium" | "low";

// site_facts / repo_facts 结构由后端决定，这里做宽松处理。
export type Facts = Record<string, unknown> | null;

export interface Evidence {
  source_type: string;
  locator: string;
  quote: string;
  confidence: string;
  note: string;
}

export interface Finding {
  id: string;
  category: string;
  title: string;
  detail: string;
  severity: string;
  confidence: Confidence;
  evidence: Evidence[];
}

export interface Improvement {
  id: string;
  title: string;
  rationale: string;
  impact: string;
  cost: string;
  learn_from: string[];
  evidence: Evidence[];
}

export interface Report {
  tone: Tone;
  headline: string;
  body_markdown: string;
  verdict_line?: string; // 一句话总结(本语气)
  top_fix?: string; // 最该改的一件事(本语气重述)
  why_line?: string; // 凭啥这么说 / 评级依据(本语气重述)
  findings: Finding[];
  share_card_ref: string;
}

export interface ObservedDifferentiator {
  description: string;
  evidence: Evidence[];
  proven: boolean;
}

export interface ProjectFingerprint {
  one_liner: string;
  target_users: string;
  problem: string;
  io: {
    input: string;
    processing: string;
    output: string;
  };
  core_features: string[];
  business_model: string;
  claimed_novelty: string[];
  observed_differentiators: ObservedDifferentiator[];
  functional_signature: string;
  conflicts: string[];
  unknowns: string[];
  confidence: string;
  user_confirmed: boolean;
}

export interface CandidateRef {
  name: string;
  url: string;
  source: string;
  snippet: string;
  why_surfaced: string;
  stars?: number | null; // GitHub star 数
  last_active?: string; // 最近 push 时间(ISO)
}

export interface Candidate {
  ref: CandidateRef;
  relation: string;
  notes: string;
  confidence: string;
}

export interface NoveltyItem {
  type: string;
  description: string;
}

export interface Duplication {
  duplication_score: number;
  confidence: string;
  dimensions: Record<string, number>;
  novelty: NoveltyItem[];
  top_similar: string[];
  rationale: string;
  search_scope_note: string;
}

export interface AnalysisResult {
  fingerprint: ProjectFingerprint;
  candidates: Candidate[];
  duplication: Duplication;
  strengths: Finding[];
  issues: Finding[];
  improvements: Improvement[];
}

export interface Cost {
  llm_calls: number;
  input_tokens: number;
  output_tokens: number;
  search_queries: number;
  seconds: number;
  stage_seconds?: Record<string, number>;
}

export interface Reports {
  serious?: Report;
  roast?: Report;
  comfort?: Report;
}

export interface Job {
  id: string;
  status: JobStatus;
  stage: string;
  progress: number; // 0..1
  site_facts: Facts;
  repo_facts: Facts;
  pending_fingerprint?: ProjectFingerprint;
  // 流式中间态（运行时逐阶段填充）
  fingerprint?: ProjectFingerprint;
  candidates?: CandidateRef[];
  verified?: Candidate[];
  duplication?: Duplication;
  result?: AnalysisResult;
  reports: Reports;
  cost: Cost;
  // 降级记录：某步失败但流水线继续（后端可选返回）。
  degradations?: string[];
  // 原始请求（后端始终回传）；仅用于报告页派生"卷宗"标题，可选以保持宽松。
  request?: AnalyzeRequest;
  error: string;
}

// 最近任务摘要（GET /api/jobs）—— 历史 / 复检对比用。
export interface JobSummary {
  id: string;
  status: JobStatus;
  stage: string;
  created_at: string;
  tone: Tone;
  website_url?: string;
  github_url?: string;
  one_liner: string;
  duplication: number | null;
}

// ===== 请求/响应体 =====

export interface AuthorStatement {
  target_users: string;
  problem_solved: string;
  claimed_novelty: string;
}

export interface AnalyzeRequest {
  website_url?: string;
  github_url?: string;
  description?: string; // 纯想法/一句话描述(没网址没仓库时)
  author_statement: AuthorStatement;
  tone: Tone;
  confirm_fingerprint: boolean;
  language: "zh";
}

export interface AnalyzeResponse {
  job_id: string;
}

export interface Health {
  ok: boolean;
  provider: string;
  access_required?: boolean; // 后端设了访问码 → 前端进站需输口令
}
