/**
 * Photo handling helpers. The browser work (decode, resize, re-encode) strips EXIF location data
 * before anything leaves the device.
 */

export const MAX_EDGE = 1024;
const JPEG_QUALITY = 0.8;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
/** Largest raw file the picker will try to read, before it is downscaled. */
export const MAX_PICK_BYTES = 15 * 1024 * 1024;

/** Largest decoded image the server accepts, after the client has downscaled. */
export const MAX_UPLOAD_BYTES = 1_500_000;

/** Dimensions scaled down to fit within `max` on the longer edge, never enlarged and never below 1 px. */
export function fitSize(w: number, h: number, max = MAX_EDGE): { w: number; h: number } {
  if (w <= 0 || h <= 0) return { w: 0, h: 0 };
  const scale = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) };
}

export type PickCheck = { ok: true } | { ok: false; message: string };

/**
 * Whether a picked file is a supported type and small enough to try, with a message a person can
 * act on if not.
 */
export function checkPick(file: { type: string; size: number }): PickCheck {
  if (!ACCEPTED_TYPES.includes(file.type))
    return {
      ok: false,
      message:
        "This photo format cannot be read here. Use a JPEG, PNG or WebP photo, or answer the three questions below.",
    };
  if (file.size > MAX_PICK_BYTES)
    return {
      ok: false,
      message: "That photo is very large. Try a smaller one, or answer the three questions below.",
    };
  return { ok: true };
}

export interface Prepared {
  dataUrl: string;
  objectUrl: string;
}

/**
 * Decodes, shrinks to MAX_EDGE and re-encodes as JPEG. Throws if the browser cannot decode the file
 * (for example HEIC).
 */
export async function prepareImage(file: Blob): Promise<Prepared> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode"));
      el.src = url;
    });
    const { w, h } = fitSize(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const facts = canvas.getContext("2d");
    if (!facts) throw new Error("canvas");
    facts.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob) throw new Error("encode");
    const dataUrl = await new Promise<string>((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => rej(new Error("read"));
      reader.readAsDataURL(blob);
    });
    return { dataUrl, objectUrl: URL.createObjectURL(blob) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

/** Server side: accept only a base64 data URL of an allowed type and a bounded decoded size. */
export function parseDataUrl(
  value: unknown,
): { mimeType: string; data: string } | "bad_type" | "too_large" {
  if (typeof value !== "string") return "bad_type";
  const match = DATA_URL.exec(value);
  if (!match) return "bad_type";
  // Strict base64 length alignment: standard base64 must align to 4 characters
  const [, mimeType, data] = match;
  if (!mimeType || !data || data.length % 4 !== 0 || data.length < 4) return "bad_type";
  const decoded = Math.floor((data.length * 3) / 4);
  if (decoded > MAX_UPLOAD_BYTES) return "too_large";
  return { mimeType, data };
}
