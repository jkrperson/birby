const DAY_MS = 24 * 60 * 60 * 1000;

export function utcDay(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function dayDiff(fromDay: string, toDay: string): number {
  return Math.round(
    (Date.parse(toDay + "T00:00:00Z") - Date.parse(fromDay + "T00:00:00Z")) / DAY_MS,
  );
}

export interface StreakUpdate {
  streakCount: number;
  streakDay: string;
  streakFreezes: number;
}

/**
 * Advance the streak for a feed happening at `now`.
 * Missed days consume freezes (one per day); if freezes run out the streak
 * resets to 1 — the pet gets sleepy, it never dies. A freeze is earned every
 * 7 consecutive days, capped at 3 banked.
 */
export function applyFeedToStreak(
  streakCount: number,
  streakDay: string | null,
  streakFreezes: number,
  now: number,
): StreakUpdate {
  const today = utcDay(now);
  if (streakDay === null) {
    return { streakCount: 1, streakDay: today, streakFreezes };
  }
  const gap = dayDiff(streakDay, today);
  let count: number;
  let freezes = streakFreezes;
  if (gap <= 0) {
    return { streakCount, streakDay, streakFreezes };
  } else if (gap === 1) {
    count = streakCount + 1;
  } else {
    const missed = gap - 1;
    if (freezes >= missed) {
      freezes -= missed;
      count = streakCount + 1;
    } else {
      freezes = 0;
      count = 1;
    }
  }
  if (count > 0 && count % 7 === 0) {
    freezes = Math.min(3, freezes + 1);
  }
  return { streakCount: count, streakDay: today, streakFreezes: freezes };
}

/**
 * The streak a viewer should see at `now` (without feeding): still alive if
 * today or yesterday is covered, or if banked freezes span the gap.
 */
export function effectiveStreak(
  streakCount: number,
  streakDay: string | null,
  streakFreezes: number,
  now: number,
): number {
  if (streakDay === null) return 0;
  const gap = dayDiff(streakDay, utcDay(now));
  if (gap <= 1) return streakCount;
  return gap - 1 <= streakFreezes ? streakCount : 0;
}
