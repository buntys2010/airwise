/** Colours and sizes for the share image. The image renderer needs inline styles, so they are named here once. */

export const COLOR = {
  ink: "#f1f7f9",
  white: "#ffffff",
  muted: "#b4c8d1",
  accent: "#28c7a8",
  paper: "#f4f8f9",
  ash: "#6b7c84",
  filter: "#e1a94f",
  dash: "rgba(180,200,209,0.35)",
  background: "linear-gradient(160deg, #1f3a47 0%, #0f1f27 60%)",
} as const;

/** Page geometry for the two layouts: a tall card and a wide social preview (og). */
export interface Layout {
  og: boolean;
  width: number;
  height: number;
  /** Width of one cigarette. */
  stick: number;
  padding: number;
}

/** The page geometry for the wide social preview (og) or the tall card. */
export const layoutFor = (og: boolean): Layout =>
  og
    ? { og, width: 1200, height: 630, stick: 440, padding: 48 }
    : { og, width: 1080, height: 1350, stick: 880, padding: 64 };

/** Picks the og or card value of a size. */
export const pick = (og: boolean, ogValue: number, cardValue: number): number => (og ? ogValue : cardValue);
