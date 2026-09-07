export type Stage = "egg" | "hatchling" | "chick" | "birby" | "megabirby";

export type Mood = "ecstatic" | "happy" | "content" | "hungry" | "sleepy";

export interface TokenDelta {
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
}

/** Persisted pet row — what the database stores. */
export interface PetRow {
  name: string;
  lifetimeTokens: number;
  /** Fullness 0–100 as of lastFedAt. */
  fullness: number;
  /** Last feed timestamp (ms epoch); null for a never-fed egg. */
  lastFedAt: number | null;
  streakCount: number;
  /** UTC day string (YYYY-MM-DD) of the last day counted into the streak. */
  streakDay: string | null;
  streakFreezes: number;
}

/** Derived, render-ready state — never stored. */
export interface PetState {
  name: string;
  stage: Stage;
  mood: Mood;
  fullness: number;
  lifetimeTokens: number;
  streak: number;
  streakFreezes: number;
  /** Tokens still needed to reach the next stage; null at max stage. */
  tokensToNextStage: number | null;
  /** 0–1 progress from current stage threshold to the next. */
  stageProgress: number;
}
