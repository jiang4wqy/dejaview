// DejaView 后端接口的 TypeScript 类型定义。
// 与 FastAPI 契约保持一致，字段命名沿用 snake_case。

export type Tone = "serious" | "roast";

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
}

export interface Reports {
  serious?: Report;
  roast?: Report;
}

export interface Job {
  id: string;
  status: JobStatus;
  stage: string;
  progress: number; // 0..1
  site_facts: Facts;
  repo_facts: Facts;
  pending_fingerprint?: ProjectFingerprint;
  result?: AnalysisResult;
  reports: Reports;
  cost: Cost;
  error: string;
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
}
