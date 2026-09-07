import type { Grid } from "./palette";
import type { Stage } from "@birby/core";

export type Anim = "idle" | "walk" | "eat";

/** Replace the feet row (14) of a bird grid. */
function withFeet(grid: Grid, feet: string): Grid {
  const g = [...grid];
  g[14] = feet;
  return g;
}

/** Close the eyes of a bird grid (rows 5–6 use kw/kk eye blocks). */
function blink(grid: Grid): Grid {
  const g = [...grid];
  g[5] = g[5].replace(/kw/g, "bb");
  return g;
}

/** Shift given rows right by one pixel (egg wobble). */
function wobble(grid: Grid, from: number, to: number): Grid {
  return grid.map((row, i) =>
    i >= from && i <= to ? "." + row.slice(0, row.length - 1) : row,
  );
}

const EGG: Grid = [
  "................",
  "................",
  "................",
  "......oooo......",
  ".....oeeeeo.....",
  "....oeeeeeeo....",
  "...oeeeeeeeeo...",
  "...oeeeeeeeeo...",
  "..oeeeeeeeeeeo..",
  "..oeeeeeeeeeeo..",
  "..oeeEeeeeEeeo..",
  "..oeeeEeeEeeeo..",
  "...oeEeeeeEeo...",
  "....oeeeeeeo....",
  ".....oooooo.....",
  "................",
];

const HATCHLING: Grid = [
  "................",
  "................",
  "................",
  ".....oooooo.....",
  "....obbbbbbo....",
  "...obkwbbkwbo...",
  "...obkkbbkkbo...",
  "...obbbrrbbbo...",
  "..oeEeEeeEeEeo..",
  "..oeeeeeeeeeeo..",
  "..oeeeEeeEeeeo..",
  "..oeeeeeeeeeeo..",
  "...oeeeeeeeeo...",
  "....oooooooo....",
  "................",
  "................",
];

const CHICK: Grid = [
  "................",
  "................",
  ".....oooooo.....",
  "....obbbbbbo....",
  "...obbbbbbbbo...",
  "..obkwbbbbkwbo..",
  "..obkkbbbbkkbo..",
  "..obpbbrrbbpbo..",
  "..obbbwwwwbbbo..",
  "..oBbwwwwwwbBo..",
  "..oBbwwwwwwbBo..",
  "..obbbwwwwbbbo..",
  "...obbbbbbbbo...",
  "....oooooooo....",
  ".....rr..rr.....",
  "................",
];

const BIRBY: Grid = [
  "................",
  ".......ss.......",
  ".....oooooo.....",
  "....obbbbbbo....",
  "...obbbbbbbbo...",
  "..obkwbbbbkwbo..",
  "..obkkbbbbkkbo..",
  "..obpbbrrbbpbo..",
  "..obbbwwwwbbbo..",
  ".oBBbwwwwwwbBBo.",
  ".oBBbwwwwwwbBBo.",
  "..obbbwwwwbbbo..",
  "...obbbbbbbbo...",
  "....oooooooo....",
  ".....rr..rr.....",
  "................",
];

const MEGABIRBY: Grid = [
  "......s..s......",
  ".......ss.......",
  ".....oooooo.....",
  "....obbbbbbo....",
  "s..obbbbbbbbo..s",
  "..obkwbbbbkwbo..",
  "..obkkbbbbkkbo..",
  "..obpbbrrbbpbo..",
  "..obbbwwwwbbbo..",
  ".oBBbwwwwwwbBBo.",
  ".oBBbwwwwwwbBBo.",
  "..obbbwwwwbbbo..",
  "...obbbbbbbbo...",
  "....oooooooo....",
  ".....rr..rr.....",
  "................",
];

const FEET_BASE = ".....rr..rr.....";
const FEET_SPREAD = "....rr....rr....";

/** Open-beak eating frame for a standing bird. */
function eating(grid: Grid): Grid {
  const g = [...grid];
  g[8] = g[8].slice(0, 6) + "wrrw" + g[8].slice(10);
  return g;
}

function birdAnims(base: Grid): Record<Anim, Grid[]> {
  return {
    idle: [base, blink(base)],
    walk: [withFeet(base, FEET_BASE), withFeet(base, FEET_SPREAD)],
    eat: [eating(base), base],
  };
}

export const SPRITES: Record<Stage, Record<Anim, Grid[]>> = {
  egg: {
    idle: [EGG, wobble(EGG, 3, 8)],
    walk: [EGG, wobble(EGG, 3, 8)],
    eat: [wobble(EGG, 3, 8), EGG],
  },
  hatchling: {
    idle: [HATCHLING, blink(HATCHLING)],
    walk: [HATCHLING, wobble(HATCHLING, 3, 7)],
    eat: [HATCHLING, blink(HATCHLING)],
  },
  chick: birdAnims(CHICK),
  birby: birdAnims(BIRBY),
  megabirby: birdAnims(MEGABIRBY),
};

export const GRID_SIZE = 16;
