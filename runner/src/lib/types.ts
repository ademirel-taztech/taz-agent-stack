// Types mirroring templates/taa/test-scenarios/{scenario,index,result}.schema.json (v1.0).

export type Level = "light" | "normal" | "hard";
export type Primitive = "noul" | "choice" | "score";
export type StepStatus = "pass" | "fail" | "inconclusive" | "blocked" | "skipped";

export interface Locator {
  by: "role" | "label" | "testid" | "text";
  role?: string;
  name?: string;
  level?: number;
  value?: string;
  exact?: boolean;
  nth?: number;
  within?: Locator;
}

export interface ApiRequest {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  auth?: string;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean>;
  body?: unknown;
}

export interface ApiExpect {
  status: number;
  body_has_keys?: string[];
  body_contains?: Record<string, unknown>;
  body_not_contains_keys?: string[];
  max_ms?: number;
}

export interface Action {
  action:
    | "goto" | "reload" | "go_back" | "click" | "fill" | "clear" | "select" | "check" | "uncheck"
    | "press" | "hover" | "upload" | "wait_for" | "set_viewport" | "api_call";
  url?: string;
  locator?: Locator;
  value?: string;
  state?: "visible" | "hidden" | "attached" | "detached";
  viewport?: Viewport;
  request?: ApiRequest;
  expect?: ApiExpect;
}

export interface Assertion {
  type:
    | "visible" | "hidden" | "enabled" | "disabled" | "checked" | "focused" | "text_contains"
    | "text_equals" | "value_equals" | "count" | "url_matches" | "title_contains"
    | "no_console_errors" | "network_no_errors" | "response" | "a11y_no_violations";
  locator?: Locator;
  value?: string;
  eq?: number;
  gte?: number;
  lte?: number;
  url_pattern?: string;
  method?: string;
  status?: number;
  impact?: "minor" | "moderate" | "serious" | "critical";
  timeout_ms?: number;
}

export interface Step {
  step_id: number;
  description: string;
  channel?: "ui" | "api";
  question_phase?: "after_actions" | "before_actions";
  laya_question: string;
  expected_primitive: Primitive;
  options?: string[];
  scale?: { min: number; max: number };
  expected: { answer?: boolean | string; min_confidence?: number; eq?: number; gte?: number; lte?: number };
  human_hint?: string;
  automation: { actions: Action[]; assertions: Assertion[] };
  on_fail?: "stop" | "continue";
}

export type Viewport = "desktop" | "tablet" | "mobile";

export interface Scenario {
  schema_version: "1.0";
  test_id: string;
  test_name: string;
  level: Level;
  layer: string;
  priority: "P0" | "P1" | "P2";
  page: { name: string; route: string; source?: string };
  target_url: string;
  preconditions: {
    auth: { mode: "anonymous" | "role"; role?: string; credentials?: Record<string, string> };
    seed?: string[];
    feature_flags?: string[];
    viewport?: Viewport;
    locale?: string;
    notes?: string;
  };
  test_data?: Record<string, string | number | boolean>;
  steps: Step[];
  cleanup?: string[];
  verification: string;
  tags?: string[];
}

export interface IndexFile {
  schema_version: "1.0";
  run_id: string;
  level: Level;
  env: { required: string[] };
  scenarios: { test_id: string; file: string; level: Level; layer: string; priority: string }[];
}

export interface LayaAnswer {
  id: string | null;
  ok: true;
  type: Primitive;
  noul: number | null;
  choice: string | null;
  score: number | null;
  probabilities: Record<string, number>;
  confidence: number;
  act_probability: number;
  input_tokens: number;
  state_tokens: number;
  state_truncated: boolean;
  latency_ms: number;
}

export interface LayaStepDetail {
  phase: "before_actions" | "after_actions";
  verdict: "match" | "mismatch" | "null";
  probabilities: Record<string, number>;
  confidence: number;
  act_probability: number;
  input_tokens: number;
  state_truncated: boolean;
  latency_ms: number;
}

export interface StepResult {
  step_id: number;
  status: StepStatus;
  answer?: boolean | string | number;
  assertions_passed?: number;
  assertions_failed?: number;
  judgement_only?: boolean;
  evidence?: string[];
  note?: string;
  laya?: LayaStepDetail;
}

export interface ScenarioResult {
  test_id: string;
  status: StepStatus;
  duration_ms: number;
  note?: string;
  steps: StepResult[];
}
