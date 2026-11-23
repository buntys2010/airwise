// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prepareImage } from "./image";

type Behaviour = { decode: boolean; ctx: boolean; blob: boolean; read: boolean };
let behave: Behaviour;
const revoked: string[] = [];

const noop = (): void => undefined;

class FakeImage {
  naturalWidth = 4000;
  naturalHeight = 3000;
  onload: () => void = noop;
  onerror: () => void = noop;
  set src(_: string) {
    queueMicrotask(() => (behave.decode ? this.onload() : this.onerror()));
  }
}

class FakeReader {
  result: string | null = "data:image/jpeg;base64,AAAA";
  onload: () => void = noop;
  onerror: () => void = noop;
  readAsDataURL() {
    queueMicrotask(() => (behave.read ? this.onload() : this.onerror()));
  }
}

beforeEach(() => {
  behave = { decode: true, ctx: true, blob: true, read: true };
  revoked.length = 0;
  vi.stubGlobal("Image", FakeImage);
  vi.stubGlobal("FileReader", FakeReader);
  let callCount = 0;
  URL.createObjectURL = () => `blob:${++callCount}`;
  URL.revokeObjectURL = (u: string) => {
    revoked.push(u);
  };
  const realCreate = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
    if (tag !== "canvas") return realCreate(tag);
    return {
      width: 0,
      height: 0,
      getContext: () => (behave.ctx ? { drawImage: () => undefined } : null),
      toBlob: (cb: (b: Blob | null) => void) => cb(behave.blob ? new Blob(["x"]) : null),
    } as unknown as HTMLCanvasElement;
  }) as typeof document.createElement);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("prepareImage", () => {
  it("decodes, shrinks and re-encodes, then releases the temporary source URL", async () => {
    const out = await prepareImage(new Blob(["raw"]));
    expect(out.dataUrl).toMatch(/^data:image\/jpeg/);
    expect(out.objectUrl).toBe("blob:2");
    expect(revoked).toEqual(["blob:1"]);
  });

  it.each([
    ["a file the browser cannot decode", { decode: false }, "decode"],
    ["a canvas with no 2D context", { ctx: false }, "canvas"],
    ["an encoder that returns nothing", { blob: false }, "encode"],
    ["a reader that fails", { read: false }, "read"],
  ])("rejects %s and still releases the source URL", async (_name, change, message) => {
    behave = { ...behave, ...change };
    await expect(prepareImage(new Blob(["raw"]))).rejects.toThrow(message);
    expect(revoked).toContain("blob:1");
  });
});
