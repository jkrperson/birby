import type { Stage } from "./types";

export const STAGES: { stage: Stage; threshold: number }[] = [
  { stage: "egg", threshold: 0 },
  { stage: "hatchling", threshold: 100_000 },
  { stage: "chick", threshold: 1_000_000 },
  { stage: "birby", threshold: 10_000_000 },
  { stage: "megabirby", threshold: 100_000_000 },
];

export function stageFor(lifetimeTokens: number): Stage {
  let current: Stage = "egg";
  for (const { stage, threshold } of STAGES) {
    if (lifetimeTokens >= threshold) current = stage;
  }
  return current;
}

export function stageProgress(lifetimeTokens: number): {
  tokensToNextStage: number | null;
  progress: number;
} {
  const idx = STAGES.findIndex((s) => s.stage === stageFor(lifetimeTokens));
  const next = STAGES[idx + 1];
  if (!next) return { tokensToNextStage: null, progress: 1 };
  const floor = STAGES[idx].threshold;
  const span = next.threshold - floor;
  return {
    tokensToNextStage: next.threshold - lifetimeTokens,
    progress: Math.min(1, (lifetimeTokens - floor) / span),
  };
}
