export type Vote = "yes" | "undecided" | "no";
export type Finding = "met" | "unclear" | "unmet";
export type Character = {
  id: string;
  name: string;
  role: string;
  concern: string;
  color: string;
  criteria: { id: string; label: string; question: string }[];
};
export type Judgment = {
  id: string;
  label: string;
  question: string;
  choice: Finding;
  confidence: number;
  probabilities: Record<Finding, number>;
};
export type CharacterResult = {
  stage: "character";
  characterId: string;
  name: string;
  vote: Vote;
  previousVote: Vote | null;
  judgments: Judgment[];
  reaction: string;
  reactionSource: "generated" | "authored";
  typesafeModel: string;
  dialogueModel: string | null;
  decisionMs: number;
  durationMs: number;
  rulesVersion: string;
  instructions: string;
  options: Record<string, string>;
  state: { pitch: string; previousPitch: string | null };
  minimumConfidence: number;
};
export type RoundInput = {
  pitch: string;
  round: number;
  previousRunId: string | null;
  previousPitch: string | null;
  previous: CharacterResult[];
  carried: CharacterResult[];
  recoveryOf: string | null;
};
export type Outcome = {
  complete: boolean;
  results: CharacterResult[];
  failed: string[];
  votes: number;
  won: boolean;
};
export type RunStep = {
  id: string;
  taskName: string;
  characterId?: string;
  status: string;
  retries: number;
  attempts: { attempt: number; status: string }[];
  startedAt?: string | null;
  completedAt?: string | null;
  result: CharacterResult | null;
};
export type Run = {
  id: string;
  startedAt?: string;
  completedAt?: string;
  status: string;
  steps: RunStep[];
  results: CharacterResult[];
  outcome: Outcome | null;
  error: string | null;
  input: RoundInput;
};
