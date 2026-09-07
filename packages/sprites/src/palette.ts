/** Palette keys used in sprite grids. '.' is transparent. */
export const PALETTE: Record<string, string> = {
  o: "#3b2d1f", // outline
  b: "#ffd23e", // body gold
  B: "#f0a92e", // body shade
  w: "#fffbe8", // belly / eye highlight
  k: "#2a1f14", // pupil
  r: "#ff8c42", // beak & feet
  p: "#ff9db0", // cheeks
  e: "#fdf3dc", // eggshell
  E: "#e8d5ae", // eggshell shade
  s: "#43d9c0", // crest / mega aura
};

export type Grid = string[];
