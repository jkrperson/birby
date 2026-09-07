import type { Mood, PetRow, PetState, TokenDelta } from "./types";
import { stageFor, stageProgress } from "./evolution";
import { applyFeedToStreak, effectiveStreak } from "./streak";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Fullness decays 100 → 0 over 48 hours with no feeding. */
const FULLNESS_DECAY_PER_MS = 100 / (48 * 60 * 60 * 1000);

export function totalTokens(d: TokenDelta): number {
  return d.input + d.output + d.cacheRead + d.cacheCreation;
}

/** Fullness gained by a feed: log-scale so a 500-token ping and a 2M-token
 * marathon both feel rewarding without instant max. ~1k tokens ≈ 15 pts,
 * ~100k ≈ 45 pts. */
export function fullnessGain(tokens: number): number {
  if (tokens <= 0) return 0;
  return Math.min(60, 15 * Math.log10(1 + tokens / 100));
}

export function decayedFullness(fullness: number, lastFedAt: number | null, now: number): number {
  if (lastFedAt === null) return 0;
  const elapsed = Math.max(0, now - lastFedAt);
  return Math.max(0, fullness - elapsed * FULLNESS_DECAY_PER_MS);
}

export function moodFor(fullness: number, streak: number, lastFedAt: number | null, now: number): Mood {
  if (lastFedAt === null || now - lastFedAt > 3 * DAY_MS) return "sleepy";
  if (fullness < 20) return "hungry";
  if (fullness >= 80 && streak >= 3) return "ecstatic";
  if (fullness >= 60) return "happy";
  return "content";
}

/** Apply one feeding to a stored row, returning the new row to persist. */
export function applyFeed(row: PetRow, delta: TokenDelta, now: number): PetRow {
  const tokens = totalTokens(delta);
  const current = decayedFullness(row.fullness, row.lastFedAt, now);
  const streak = applyFeedToStreak(row.streakCount, row.streakDay, row.streakFreezes, now);
  return {
    ...row,
    lifetimeTokens: row.lifetimeTokens + tokens,
    fullness: Math.min(100, current + fullnessGain(tokens)),
    lastFedAt: now,
    streakCount: streak.streakCount,
    streakDay: streak.streakDay,
    streakFreezes: streak.streakFreezes,
  };
}

/** Derive everything a renderer needs from a stored row. */
export function petState(row: PetRow, now: number): PetState {
  const fullness = decayedFullness(row.fullness, row.lastFedAt, now);
  const streak = effectiveStreak(row.streakCount, row.streakDay, row.streakFreezes, now);
  const { tokensToNextStage, progress } = stageProgress(row.lifetimeTokens);
  return {
    name: row.name,
    stage: stageFor(row.lifetimeTokens),
    mood: moodFor(fullness, streak, row.lastFedAt, now),
    fullness: Math.round(fullness),
    lifetimeTokens: row.lifetimeTokens,
    streak,
    streakFreezes: row.streakFreezes,
    tokensToNextStage,
    stageProgress: progress,
  };
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
