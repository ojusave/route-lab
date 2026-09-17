export type Model = {
  id: string;
  name: string;
  description: string;
  contextLength: number;
  inputPrice: number | null;
  outputPrice: number | null;
  inputModalities: string[];
  outputModalities: string[];
  eligible: boolean;
  exclusion: string | null;
  reasoning: boolean;
};
export type Catalog = {
  stage: "catalog";
  models: Model[];
  fetchedAt: string;
  durationMs: number;
};
export type Shortlist = {
  stage: "shortlist";
  group: number;
  candidates: number;
  winner: Model;
  confidence: number;
  probabilities: Record<string, number>;
  durationMs: number;
};
export type Decision = {
  stage: "route";
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
  model: Model;
  routerModel: string;
  durationMs: number;
  candidateCount: number;
  rounds: Shortlist[];
  catalogFetchedAt: string;
  usage: unknown;
};
export type Answer = {
  stage: "answer";
  text: string;
  model: string;
  durationMs: number;
  usage: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cost?: number;
  } | null;
  finishReason: string | null;
};
export type Outcome = { decision: Decision; answer: Answer; state: string };
export type RunStep = {
  id: string;
  taskName: string;
  group?: number;
  candidates?: number;
  status: string;
  retries: number;
  attempts: { attempt: number; status: string }[];
  startedAt?: string | null;
  completedAt?: string | null;
  result: Catalog | Shortlist | Decision | Answer | Outcome | null;
};
export type Run = {
  id: string;
  startedAt?: string;
  completedAt?: string;
  status: string;
  steps: RunStep[];
  decision: Decision | null;
  answer: Answer | null;
  error: string | null;
  input: { prompt: string; simulateFailure: boolean };
};
