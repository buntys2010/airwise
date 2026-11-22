import { describe, expect, it } from "vitest";
import {
  MAX_EDGE,
  MAX_PICK_BYTES,
  MAX_UPLOAD_BYTES,
  checkPick,
  fitSize,
  parseDataUrl,
} from "./image";

describe("fitSize", () => {
  it("shrinks the longest edge to the maximum and keeps the ratio", () => {
    expect(fitSize(4000, 3000)).toEqual({ w: MAX_EDGE, h: 768 });
    expect(fitSize(3000, 4000)).toEqual({ w: 768, h: MAX_EDGE });
  });
  it("never enlarges a small image, and survives bad sizes", () => {
    expect(fitSize(300, 200)).toEqual({ w: 300, h: 200 });
    expect(fitSize(0, 100)).toEqual({ w: 0, h: 0 });
    expect(fitSize(10000, 1)).toEqual({ w: MAX_EDGE, h: 1 });
  });
});

describe("checkPick", () => {
  it("accepts JPEG, PNG and WebP", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"])
      expect(checkPick({ type, size: 1000 }).ok).toBe(true);
  });
  it("explains HEIC, other types and oversized files in plain words", () => {
    const heic = checkPick({ type: "image/heic", size: 1000 });
    expect(heic.ok).toBe(false);
    if (!heic.ok) expect(heic.message).toMatch(/JPEG, PNG or WebP/);
    expect(checkPick({ type: "application/pdf", size: 1 }).ok).toBe(false);
    expect(checkPick({ type: "image/jpeg", size: MAX_PICK_BYTES + 1 }).ok).toBe(false);
  });
});

describe("parseDataUrl (server side)", () => {
  const ok = "data:image/jpeg;base64,QUJDREVGRw==";
  it("accepts a base64 data URL of an allowed type", () =>
    expect(parseDataUrl(ok)).toEqual({ mimeType: "image/jpeg", data: "QUJDREVGRw==" }));
  it("rejects other types, non-base64 text, scripts and non-strings", () => {
    for (const v of [
      "data:image/svg+xml;base64,QUJD",
      "data:text/html;base64,QUJD",
      "data:image/jpeg;base64,<script>",
      "data:image/jpeg;base64,QUJ",
      "https://x.test/a.jpg",
      "",
      42,
      null,
    ])
      expect(parseDataUrl(v)).toBe("bad_type");
  });
  it("rejects a decoded size over the cap", () => {
    const big = `data:image/png;base64,${"A".repeat(Math.ceil((MAX_UPLOAD_BYTES * 4) / 3) + 8)}`;
    expect(parseDataUrl(big)).toBe("too_large");
  });
});
