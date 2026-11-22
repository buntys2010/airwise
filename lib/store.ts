import { COMMUTES, COOKINGS, HOMES } from "./chat";
import { CITIES } from "./data";
import type { Profile } from "./engine";

/**
 * Device-only save. The profile and last city live in this browser's localStorage and nowhere else.
 * Every access is wrapped: if storage is blocked (private mode, policy) the app works and says "Not saved on this phone".
 */
export interface Saved { city: string; profile: Profile }

export const STORE_KEY = "airwise.saved.v1";
export type StoreState = "saved" | "blocked" | "empty";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const defaultStorage = (): StorageLike | null => {
  try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; }
};

/** Validates whatever was stored: a tampered or old entry is ignored rather than trusted. */
export function sanitizeSaved(raw: unknown): Saved | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const p = (r.profile && typeof r.profile === "object" ? r.profile : {}) as Record<string, unknown>;
  const city = CITIES.find((c) => c.id === r.city);
  const home = HOMES.find((h) => h === p.home), commute = COMMUTES.find((c) => c === p.commute), cooking = COOKINGS.find((c) => c === p.cooking);
  const km = typeof p.km === "number" && Number.isFinite(p.km) ? Math.min(60, Math.max(0, Math.round(p.km))) : null;
  if (!city || !home || !commute || !cooking || km === null) return null;
  return { city: city.id, profile: { home, commute, cooking, km, vulnerable: p.vulnerable === true } };
}

export function readSaved(storage: StorageLike | null = defaultStorage()): { data: Saved | null; state: StoreState } {
  if (!storage) return { data: null, state: "blocked" };
  try {
    const text = storage.getItem(STORE_KEY);
    if (!text) return { data: null, state: "empty" };
    const data = sanitizeSaved(JSON.parse(text));
    return data ? { data, state: "saved" } : { data: null, state: "empty" };
  } catch {
    return { data: null, state: "blocked" };
  }
}

export function writeSaved(data: Saved, storage: StorageLike | null = defaultStorage()): StoreState {
  if (!storage) return "blocked";
  try { storage.setItem(STORE_KEY, JSON.stringify(data)); return "saved"; } catch { return "blocked"; }
}

export function clearSaved(storage: StorageLike | null = defaultStorage()): StoreState {
  if (!storage) return "blocked";
  try { storage.removeItem(STORE_KEY); return "empty"; } catch { return "blocked"; }
}
