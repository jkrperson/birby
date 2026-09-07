import { describe, expect, it } from "vitest";
import {
  applyFeed,
  applyFeedToStreak,
  decayedFullness,
  effectiveStreak,
  formatTokens,
  fullnessGain,
  petState,
  stageFor,
  stageProgress,
} from "./index";
import type { PetRow } from "./index";

const T0 = Date.parse("2026-08-31T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

const freshEgg: PetRow = {
  name: "Birby",
  lifetimeTokens: 0,
  fullness: 0,
  lastFedAt: null,
  streakCount: 0,
  streakDay: null,
  streakFreezes: 0,
};

const feed = (n: number) => ({ input: n, output: 0, cacheRead: 0, cacheCreation: 0 });

describe("evolution", () => {
  it("maps lifetime tokens to stages", () => {
    expect(stageFor(0)).toBe("egg");
    expect(stageFor(99_999)).toBe("egg");
    expect(stageFor(100_000)).toBe("hatchling");
    expect(stageFor(1_000_000)).toBe("chick");
    expect(stageFor(10_000_000)).toBe("birby");
    expect(stageFor(100_000_000)).toBe("megabirby");
  });

  it("reports progress toward next stage", () => {
    expect(stageProgress(50_000)).toEqual({ tokensToNextStage: 50_000, progress: 0.5 });
    expect(stageProgress(100_000_000).tokensToNextStage).toBeNull();
    expect(stageProgress(100_000_000).progress).toBe(1);
  });
});

describe("fullness", () => {
  it("gains on a log scale, capped", () => {
    expect(fullnessGain(0)).toBe(0);
    expect(fullnessGain(1_000)).toBeGreaterThan(14);
    expect(fullnessGain(100_000)).toBeCloseTo(45, 0);
    expect(fullnessGain(10_000_000_000)).toBe(60);
  });

  it("decays to zero over 48h", () => {
    expect(decayedFullness(100, T0, T0)).toBe(100);
    expect(decayedFullness(100, T0, T0 + DAY)).toBeCloseTo(50, 5);
    expect(decayedFullness(100, T0, T0 + 2 * DAY)).toBe(0);
    expect(decayedFullness(100, T0, T0 + 10 * DAY)).toBe(0);
  });

  it("is zero for a never-fed pet", () => {
    expect(decayedFullness(50, null, T0)).toBe(0);
  });
});

describe("streak", () => {
  it("starts at 1 on first feed", () => {
    expect(applyFeedToStreak(0, null, 0, T0).streakCount).toBe(1);
  });

  it("does not double-count the same day", () => {
    const day = "2026-08-31";
    expect(applyFeedToStreak(3, day, 0, T0)).toEqual({
      streakCount: 3,
      streakDay: day,
      streakFreezes: 0,
    });
  });

  it("increments on consecutive days", () => {
    expect(applyFeedToStreak(3, "2026-08-30", 0, T0).streakCount).toBe(4);
  });

  it("consumes freezes for missed days", () => {
    const r = applyFeedToStreak(5, "2026-08-28", 2, T0);
    expect(r.streakCount).toBe(6);
    expect(r.streakFreezes).toBe(0);
  });

  it("resets when freezes cannot cover the gap", () => {
    const r = applyFeedToStreak(5, "2026-08-27", 1, T0);
    expect(r.streakCount).toBe(1);
    expect(r.streakFreezes).toBe(0);
  });

  it("earns a freeze every 7 days, capped at 3", () => {
    expect(applyFeedToStreak(6, "2026-08-30", 0, T0).streakFreezes).toBe(1);
    expect(applyFeedToStreak(13, "2026-08-30", 3, T0).streakFreezes).toBe(3);
  });

  it("effectiveStreak survives yesterday but not an uncovered gap", () => {
    expect(effectiveStreak(4, "2026-08-30", 0, T0)).toBe(4);
    expect(effectiveStreak(4, "2026-08-28", 0, T0)).toBe(0);
    expect(effectiveStreak(4, "2026-08-28", 2, T0)).toBe(4);
  });
});

describe("applyFeed + petState", () => {
  it("feeds an egg into a live pet", () => {
    const row = applyFeed(freshEgg, feed(50_000), T0);
    expect(row.lifetimeTokens).toBe(50_000);
    expect(row.lastFedAt).toBe(T0);
    expect(row.streakCount).toBe(1);
    const state = petState(row, T0);
    expect(state.stage).toBe("egg");
    expect(state.fullness).toBeGreaterThan(0);
    expect(state.tokensToNextStage).toBe(50_000);
  });

  it("evolves across a threshold", () => {
    const row = applyFeed({ ...freshEgg, lifetimeTokens: 99_999 }, feed(2), T0);
    expect(petState(row, T0).stage).toBe("hatchling");
  });

  it("goes sleepy after 3 days without food", () => {
    const row = applyFeed(freshEgg, feed(10_000), T0);
    expect(petState(row, T0 + 4 * DAY).mood).toBe("sleepy");
  });

  it("never exceeds 100 fullness", () => {
    let row = { ...freshEgg };
    for (let i = 0; i < 10; i++) row = applyFeed(row, feed(1_000_000), T0);
    expect(petState(row, T0).fullness).toBe(100);
  });
});

describe("formatTokens", () => {
  it("humanizes counts", () => {
    expect(formatTokens(950)).toBe("950");
    expect(formatTokens(48_200)).toBe("48.2k");
    expect(formatTokens(2_100_000)).toBe("2.1M");
    expect(formatTokens(1_500_000_000)).toBe("1.5B");
  });
});
