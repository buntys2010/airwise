/** Room findings: what a photo or an answer says is in the room, and what each means for the household. */
import type { Cooking, Home, Profile } from "../engine/model";

/**
 * Room findings and the product catalog.
 * Gemini may LOOK at a photo and say what it can see. Code decides what that means for the
 * household and what it is worth:
 * the model never states a figure, and every number comes from lib/engine/.
 *
 * A photo shows what is THERE. It cannot prove what is absent. So the photo step maps only visible
 * evidence to hotspots
 * (a visible gap, a visible gas or wood stove, a visible purifier), and everything else becomes a
 * question the user answers.
 */

/**
 * What a hotspot can be. `purifier_seen` comes from a photo; `no_purifier` only ever comes from the
 * user's own answer.
 */
export type FindingKind = "window_gap" | "gas_stove" | "purifier_seen" | "no_purifier";
export type RoomActionId = "sealGaps" | "induction" | "purifier";
/** Display and sort order. */
export const FINDING_KINDS: FindingKind[] = [
  "window_gap",
  "gas_stove",
  "purifier_seen",
  "no_purifier",
];

/** The three questions that cover whatever the photo could not show. */
export type QuestionId = "window" | "stove" | "purifier";
/** The questions asked, in order. */
export const QUESTIONS: QuestionId[] = ["window", "stove", "purifier"];
/** The user's answers; a missing key means not answered yet. */
export type Answers = Partial<Record<QuestionId, boolean>>;

/** A box as fractions of the image (0 to 1), so it scales with the preview. */
export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
} // fractions of the image, 0 to 1

/** Something found in the room: what it is, which fix it maps to and where to draw it. */
export interface Hotspot {
  id: string;
  kind: FindingKind;
  label: string;
  actionId: RoomActionId;
  /** Where to draw the marker. Absent for answers given in the questions, which are listed but not drawn. */
  bbox?: BBox;
  confidence: number;
}

const KIND_META: Record<FindingKind, { label: string; actionId: RoomActionId }> = {
  window_gap: { label: "Gap around the window", actionId: "sealGaps" },
  gas_stove: { label: "Gas stove", actionId: "induction" },
  purifier_seen: { label: "Air purifier", actionId: "purifier" },
  no_purifier: { label: "No air purifier", actionId: "purifier" },
};

/** A hotspot for a finding kind, with its label and the fix it points to taken from KIND_META. */
export function hotspotFor(kind: FindingKind, bbox: BBox | undefined, confidence: number): Hotspot {
  const { label, actionId } = KIND_META[kind];
  return { id: kind, kind, label, actionId, bbox, confidence };
}

/** The sample room shown on first run, so the whole experience works with no photo, no camera and no key. */
export const SAMPLE_HOTSPOTS: Hotspot[] = [
  hotspotFor("window_gap", { x: 0.1, y: 0.26, w: 0.3, h: 0.4 }, 1),
  hotspotFor("gas_stove", { x: 0.66, y: 0.5, w: 0.26, h: 0.24 }, 1),
  hotspotFor("no_purifier", { x: 0.44, y: 0.62, w: 0.16, h: 0.28 }, 1),
];

/** What the sample room says about the household: a leaky older flat cooking on gas. */
export const SAMPLE_PROFILE_PATCH: Pick<Profile, "home" | "cooking"> = {
  home: "leaky",
  cooking: "lpg",
};

/** Maps findings to the household facts the engine understands. Code decides this, not the model. */
export function profilePatch(
  hotspots: Hotspot[],
  answers: Answers = {},
  current?: Pick<Profile, "home" | "cooking">,
): Partial<Pick<Profile, "home" | "cooking">> {
  const patch: { home?: Home; cooking?: Cooking } = {};
  if (hotspots.some((h) => h.kind === "window_gap")) patch.home = "leaky";
  else if (answers.window === false && (!current || current.home === "leaky"))
    patch.home = "typical"; // "no gap": stop assuming a leaky home
  if (hotspots.some((h) => h.kind === "gas_stove")) {
    if (current?.cooking !== "wood") patch.cooking = "lpg"; // a wood stove stays wood: it is the worse case
  } else if (answers.stove === false && current?.cooking !== "induction")
    patch.cooking = "induction"; // "no gas or wood": stop assuming smoke
  return patch;
}

// Evidence and answers together

/**
 * Combines what the photo showed with what the user says. An explicit answer always wins over the
 * photo (the user knows
 * their home). With no answer, visible evidence counts as a yes, and anything not visible stays
 * unanswered: it adds no fix.
 * Hotspots keep their photo box when there is one; answer-only ones have none and are listed
 * rather than drawn.
 */
export function mergeFindings(evidence: Hotspot[], answers: Answers): Hotspot[] {
  const seen = (k: FindingKind) => evidence.find((h) => h.kind === k);
  const out: Hotspot[] = [];
  const window = answers.window ?? (seen("window_gap") ? true : undefined);
  if (window) out.push(seen("window_gap") ?? hotspotFor("window_gap", undefined, 1));
  const stove = answers.stove ?? (seen("gas_stove") ? true : undefined);
  if (stove) out.push(seen("gas_stove") ?? hotspotFor("gas_stove", undefined, 1));
  const seenPurifier = seen("purifier_seen");
  const purifier = answers.purifier ?? (seenPurifier ? true : undefined);
  if (purifier === true && seenPurifier) out.push(seenPurifier);
  if (purifier === false) out.push(seen("no_purifier") ?? hotspotFor("no_purifier", undefined, 1));
  return out;
}

/** How a question was answered: by the user, by what the photo showed, or not at all. */
interface QuestionState {
  value: boolean | undefined;
  source: "user" | "photo" | "none";
}

/**
 * For each question: was it answered by the photo, by the user, or not at all. Drives the labels
 * under the questions.
 */
export function questionState(
  evidence: Hotspot[],
  answers: Answers,
): Record<QuestionId, QuestionState> {
  const photoYes: Record<QuestionId, boolean> = {
    window: evidence.some((h) => h.kind === "window_gap"),
    stove: evidence.some((h) => h.kind === "gas_stove"),
    purifier: evidence.some((h) => h.kind === "purifier_seen"),
  };
  const stateOf = (q: QuestionId): QuestionState => {
    if (answers[q] !== undefined) return { value: answers[q], source: "user" };
    if (photoYes[q]) return { value: true, source: "photo" };
    return { value: undefined, source: "none" };
  };
  return { window: stateOf("window"), stove: stateOf("stove"), purifier: stateOf("purifier") };
}
