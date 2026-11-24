/** Device-only save of the profile and city in localStorage, safe when storage is blocked. */
import { COMMUTES, COOKINGS, HOMES } from "./chat";
import { CITIES } from "./cities";
import type { Profile } from "./engine/model";
import { asRecord, isRecord } from "./json";

/**
 * Device-only save. The profile and last city live in this browser's localStorage and nowhere else.
 * Every access is wrapped: if storage is blocked (private mode, policy) the app works and says
 * "Not saved on this phone".
 */
export interface Saved {
  city: string;
  profile: Profile;
}

/** The localStorage key. The version suffix lets a future format change start clean. */
export const STORE_KEY = "airwise.saved.v1";
/** What reading the saved choices found. */
export type StoreState = "saved" | "blocked" | "empty";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const defaultStorage = (): StorageLike | null => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};

/** Validates whatever was stored: a tampered or old entry is ignored rather than trusted. */
export function sanitizeSaved(raw: unknown): Saved | null {
  if (!isRecord(raw)) return null;
  const fields = raw;
  const storedProfile = asRecord(fields.profile);
  const city = CITIES.find((c) => c.id === fields.city);
  const home = HOMES.find((h) => h === storedProfile.home),
    commute = COMMUTES.find((c) => c === storedProfile.commute),
    cooking = COOKINGS.find((c) => c === storedProfile.cooking);
  const km =
    typeof storedProfile.km === "number" && Number.isFinite(storedProfile.km)
      ? Math.min(60, Math.max(0, Math.round(storedProfile.km)))
      : null;
  if (!city || !home || !commute || !cooking || km === null) return null;
  return {
    city: city.id,
    profile: { home, commute, cooking, km, vulnerable: storedProfile.vulnerable === true },
  };
}

/** The choices saved on this device, with a state that says whether storage was empty, saved or blocked. */
export function readSaved(storage: StorageLike | null = defaultStorage()): {
  data: Saved | null;
  state: StoreState;
} {
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

/** Saves the user's choices on this device only. Returns 'blocked' if storage is unavailable. */
export function writeSaved(
  data: Saved,
  storage: StorageLike | null = defaultStorage(),
): StoreState {
  if (!storage) return "blocked";
  try {
    storage.setItem(STORE_KEY, JSON.stringify(data));
    return "saved";
  } catch {
    return "blocked";
  }
}

/** Forgets what is saved on this device. */
export function clearSaved(storage: StorageLike | null = defaultStorage()): StoreState {
  if (!storage) return "blocked";
  try {
    storage.removeItem(STORE_KEY);
    return "empty";
  } catch {
    return "blocked";
  }
}
