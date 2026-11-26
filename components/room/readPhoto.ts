import type { Key } from "@/lib/i18n";
import { checkPick, prepareImage } from "@/lib/image";
import type { Hotspot } from "@/lib/room";

/** A status line: a translation key with values, or text that came from the server (shown as is). */
export type RoomMessage = { key: Key; vars?: Record<string, string | number> } | { raw: string } | null;

interface VisionReply {
  status: "ok" | "none" | "not_room" | "unreadable" | "unavailable";
  hotspots?: Hotspot[];
  reasonText?: string;
  error?: string;
}

const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

/** What happened when a photo was sent to be read. */
export type ReadOutcome =
  | { kind: "rejected"; message: RoomMessage }
  | { kind: "aborted" }
  /** `fallback` is the phase to return to when a photo is already showing. */
  | { kind: "failed"; message: RoomMessage; fallback: "photo" | "checklist" }
  | { kind: "not_room" }
  | { kind: "read"; objectUrl: string; found: Hotspot[]; message: RoomMessage };

/** The line to show once a photo was read: how many things were found, or why none were. */
function messageAfterRead(reply: VisionReply, foundCount: number): RoomMessage {
  if (foundCount > 0) return { key: "room.found", vars: { n: foundCount } };
  if (reply.status === "unavailable") {
    return {
      key: "room.unavailable",
      vars: { reason: reply.reasonText ?? "The photo reader is not available" },
    };
  }
  return { key: "room.none" };
}

/** A rejection when the file is not an acceptable photo, so it can be refused before anything is cancelled or sent. */
export function rejectionFor(file: File): ReadOutcome | null {
  if (checkPick(file).ok) return null;
  return {
    kind: "rejected",
    message: { key: file.size > MAX_PHOTO_BYTES ? "room.tooBig" : "room.badFormat" },
  };
}

/**
 * Shrinks and sends a photo to the reader, and sorts the reply into one outcome. The object URL is released here
 * unless the photo is kept ("read"). Exceptions other than a cancelled request become a "failed" outcome.
 */
export async function readPhoto(file: File, signal: AbortSignal): Promise<ReadOutcome> {
  let objectUrl: string | undefined;
  const release = () => objectUrl && URL.revokeObjectURL(objectUrl);
  try {
    const prepared = await prepareImage(file);
    objectUrl = prepared.objectUrl;
    if (signal.aborted) {
      release();
      return { kind: "aborted" };
    }
    const res = await fetch("/api/vision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: prepared.dataUrl }),
      signal,
    });
    const reply = (await res.json()) as VisionReply;
    if (signal.aborted) {
      release();
      return { kind: "aborted" };
    }
    if (!res.ok) {
      release();
      const message: RoomMessage = reply.error ? { raw: reply.error } : { key: "room.failed" };
      return { kind: "failed", message, fallback: "photo" };
    }
    if (reply.status === "not_room") {
      release();
      return { kind: "not_room" };
    }
    const found = reply.status === "ok" ? (reply.hotspots ?? []) : [];
    return {
      kind: "read",
      objectUrl: prepared.objectUrl,
      found,
      message: messageAfterRead(reply, found.length),
    };
  } catch (e) {
    release();
    if ((e as Error).name === "AbortError" || signal.aborted) return { kind: "aborted" };
    const key = e instanceof Error && e.message === "decode" ? "room.badFormat" : "room.failed";
    return { kind: "failed", message: { key }, fallback: "checklist" };
  }
}
