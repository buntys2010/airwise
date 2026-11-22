// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as image from "@/lib/image";
import Page from "./page";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("@/lib/image", async (orig) => ({
  ...(await orig<typeof import("@/lib/image")>()),
  prepareImage: vi.fn(),
}));

const prepare = vi.mocked(image.prepareImage);
const box = { x: 0.1, y: 0.2, w: 0.3, h: 0.3 };
const hot = (kind: string, label: string, actionId: string) => ({
  id: kind,
  kind,
  label,
  actionId,
  bbox: box,
  confidence: 0.9,
});
const WINDOW = hot("window_gap", "Gap around the window", "sealGaps");
const STOVE = hot("gas_stove", "Gas stove", "induction");
const PURIFIER = hot("purifier_seen", "Air purifier", "purifier");

function stubVision(reply: unknown, status = 200) {
  const f = vi.fn().mockImplementation(async (url: string) => {
    if (String(url).startsWith("/api/vision"))
      return { ok: status === 200, status, json: async () => reply };
    throw new Error("offline"); // air feed falls back to the labelled estimate
  });
  vi.stubGlobal("fetch", f);
  return f;
}
const pick = (type = "image/jpeg") => {
  const input = screen.getByLabelText("Choose a photo of your room") as HTMLInputElement;
  fireEvent.change(input, { target: { files: [new File(["x"], "room.jpg", { type })] } });
};
const fixList = () => screen.queryByRole("list", { name: "Fixes found in your room" });
const rows = () => fixList()?.querySelectorAll(":scope > li") ?? [];
const question = (name: RegExp) => screen.getByRole("group", { name }) as HTMLElement;
const answer = (q: RegExp, yes: boolean) =>
  fireEvent.click(within(question(q)).getByLabelText(yes ? "Yes" : "No"));

beforeAll(() => {
  window.matchMedia = ((q: string) => ({
    matches: true,
    media: q,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    onchange: null,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  URL.revokeObjectURL = vi.fn();
});
beforeEach(() => {
  localStorage.clear();
  prepare.mockResolvedValue({
    dataUrl: "data:image/jpeg;base64,QUJD",
    objectUrl: "blob:room-photo",
  });
  stubVision({ status: "none" });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  prepare.mockReset();
  document.documentElement.style.removeProperty("--haze");
});

describe("photo of your room: only visible evidence becomes a hotspot", () => {
  it("replaces the sample room with the photo, marks what is visible, and lists the same findings", async () => {
    stubVision({ status: "ok", hotspots: [WINDOW, STOVE] });
    render(<Page />);
    expect(screen.getByText("Sample room")).toBeTruthy();
    pick();
    expect(await screen.findByText(/^Found 2 in your photo\./)).toBeTruthy();
    expect(screen.queryByText("Sample room")).toBeNull();
    expect(screen.getByRole("img", { name: /Your room, with 2 marked/ }).getAttribute("src")).toBe(
      "blob:room-photo",
    );
    expect(screen.getByRole("button", { name: /^Fix 1: Gap around the window/ })).toBeTruthy();
    expect(rows()).toHaveLength(2);
  });

  it("a visible stove and window answer their own questions; what is not visible stays an open question", async () => {
    stubVision({ status: "ok", hotspots: [WINDOW, STOVE] });
    render(<Page />);
    pick();
    await screen.findByText(/^Found 2 in your photo\./);
    const win = question(/gap around a window or door/),
      stove = question(/cook on gas or wood/),
      pur = question(/air purifier in this room/);
    expect((within(win).getByLabelText("Yes") as HTMLInputElement).checked).toBe(true);
    expect(within(win).getByText("Seen in your photo")).toBeTruthy();
    expect((within(stove).getByLabelText("Yes") as HTMLInputElement).checked).toBe(true);
    expect((within(pur).getByLabelText("Yes") as HTMLInputElement).checked).toBe(false);
    expect((within(pur).getByLabelText("No") as HTMLInputElement).checked).toBe(false);
    expect(within(pur).getByText("Not visible in the photo")).toBeTruthy();
  });

  it("never infers that something is missing: a photo with no purifier visible adds no purifier fix until you answer", async () => {
    stubVision({ status: "ok", hotspots: [WINDOW] });
    render(<Page />);
    pick();
    await screen.findByText(/^Found 1 in your photo\./);
    expect(rows()).toHaveLength(1);
    expect(within(fixList()!).queryByText("No air purifier")).toBeNull();
    answer(/air purifier in this room/, false);
    expect(rows()).toHaveLength(2);
    expect(within(fixList()!).getByText("No air purifier")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Fix 2:/ })).toBeNull(); // answered, not seen: listed, not drawn
  });

  it("a living room with nothing from the list yields no stove or any other finding, and says why", async () => {
    stubVision({ status: "none" });
    render(<Page />);
    pick();
    expect(
      await screen.findByText(
        /Nothing from our list was visible in this photo\. A photo cannot show what is not there/,
      ),
    ).toBeTruthy();
    expect(fixList()).toBeNull();
    expect(screen.getByText(/Nothing from our list was visible yet/)).toBeTruthy();
    expect(screen.queryByText("Gas stove")).toBeNull();
    for (const q of [
      /gap around a window or door/,
      /cook on gas or wood/,
      /air purifier in this room/,
    ])
      expect(within(question(q)).getByText("Not visible in the photo")).toBeTruthy();
  });

  it("an answer adds a fix with no marker, and a No beats what the photo seemed to show", async () => {
    stubVision({ status: "ok", hotspots: [STOVE] });
    render(<Page />);
    pick();
    await screen.findByText(/^Found 1 in your photo\./);
    expect(within(fixList()!).getByText("Gas stove")).toBeTruthy();
    answer(/gap around a window or door/, true);
    expect(rows()).toHaveLength(2);
    answer(/cook on gas or wood/, false); // the user knows their kitchen
    expect(rows()).toHaveLength(1);
    expect(within(fixList()!).queryByText("Gas stove")).toBeNull();
  });

  it("a visible purifier is shown as a keep-it-on fix", async () => {
    stubVision({ status: "ok", hotspots: [PURIFIER] });
    render(<Page />);
    pick();
    await screen.findByText(/^Found 1 in your photo\./);
    expect(within(fixList()!).getByText("Air purifier")).toBeTruthy();
    expect(
      within(question(/air purifier in this room/)).getByText("Seen in your photo"),
    ).toBeTruthy();
  });

  it("sends only the downscaled photo to the server", async () => {
    stubVision({ status: "none" });
    const f = vi.mocked(fetch);
    render(<Page />);
    pick();
    await screen.findByText(/Nothing from our list was visible/);
    const call = f.mock.calls.find((c) => String(c[0]).startsWith("/api/vision"))!;
    expect(JSON.parse(call[1]!.body as string)).toEqual({ image: "data:image/jpeg;base64,QUJD" });
  });

  it("the photo's markers work like the sample's: tapping one adds the fix", async () => {
    stubVision({ status: "ok", hotspots: [WINDOW] });
    render(<Page />);
    pick();
    await screen.findByText(/^Found 1 in your photo\./);
    fireEvent.click(screen.getByRole("button", { name: /^Fix 1:/ }));
    expect(screen.getByRole("button", { name: /^Fix 1:/ }).getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  it("a new photo starts a fresh set of answers", async () => {
    stubVision({ status: "ok", hotspots: [WINDOW] });
    render(<Page />);
    pick();
    await screen.findByText(/^Found 1 in your photo\./);
    answer(/air purifier in this room/, false);
    expect(rows()).toHaveLength(2);
    pick();
    await waitFor(() => expect(rows()).toHaveLength(1));
  });
});

describe("photo reader problems always lead to the questions", () => {
  it("says when the picture is not a room and keeps what was on screen", async () => {
    stubVision({ status: "not_room" });
    render(<Page />);
    pick();
    expect(
      await screen.findByText("That does not look like a room. Try another photo."),
    ).toBeTruthy();
    expect(screen.getByText("Sample room")).toBeTruthy();
    expect(image.prepareImage).toHaveBeenCalledTimes(1);
  });

  it("names the reason when the photo reader is unavailable, then asks the questions", async () => {
    stubVision({
      status: "unavailable",
      reason: "quota",
      reasonText: "Gemini's rate limit was reached",
    });
    render(<Page />);
    pick();
    expect(
      await screen.findByText(
        "Gemini's rate limit was reached. Answer the questions below instead.",
      ),
    ).toBeTruthy();
    answer(/cook on gas or wood/, true);
    expect(within(fixList()!).getByText("Gas stove")).toBeTruthy();
  });

  it("explains a photo the browser cannot decode (for example HEIC) without calling the server", async () => {
    prepare.mockRejectedValue(new Error("decode"));
    const f = stubVision({ status: "ok", hotspots: [] });
    render(<Page />);
    pick();
    expect(await screen.findByText(/This photo format cannot be read here/)).toBeTruthy();
    expect(f.mock.calls.some((c) => String(c[0]).startsWith("/api/vision"))).toBe(false);
    expect(screen.getByText("Sample room")).toBeTruthy();
  });

  it("rejects an unsupported file type up front", async () => {
    render(<Page />);
    pick("image/heic");
    expect(await screen.findByText(/JPEG, PNG or WebP/)).toBeTruthy();
    expect(prepare).not.toHaveBeenCalled();
  });

  it("reports a server error plainly and stays usable", async () => {
    stubVision({ error: "That photo is too large. Try a smaller one." }, 413);
    render(<Page />);
    pick();
    expect(await screen.findByText("That photo is too large. Try a smaller one.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Use a photo of your room" })).toBeTruthy();
  });

  it("returns to the sample room on request", async () => {
    stubVision({ status: "ok", hotspots: [STOVE] });
    render(<Page />);
    pick();
    await screen.findByText(/^Found 1 in your photo\./);
    fireEvent.click(screen.getByRole("button", { name: "Back to the sample room" }));
    await waitFor(() => expect(screen.getByText("Sample room")).toBeTruthy());
    expect(rows()).toHaveLength(3);
  });

  it("discloses what happens to the photo", () => {
    render(<Page />);
    expect(
      screen.getByText(
        /shrunk on your device, its location data is removed, and it is sent once to be read. It is not stored/,
      ),
    ).toBeTruthy();
  });

  it("has no automated accessibility violations in the photo and questions state", async () => {
    stubVision({ status: "ok", hotspots: [WINDOW] });
    const { container } = render(<Page />);
    pick();
    await screen.findByText(/^Found 1 in your photo\./);
    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    });
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
});

describe("rupee-ranked value list", () => {
  it("shows the catalog best value first with indicative prices and safe external links", () => {
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: /Day plan/ }));
    const list = screen
      .getByRole("heading", { name: "What to buy first, by value" })
      .closest("section")!;
    const items = list.querySelectorAll("ol > li");
    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(within(list).getAllByText(/\(indicative\)/).length).toBe(items.length);
    for (const a of list.querySelectorAll("a")) {
      expect(a.getAttribute("rel")).toBe("noopener noreferrer");
      expect(a.getAttribute("href")).toMatch(/^https:\/\/www\.amazon\.in\/s\?k=/);
    }
  });
});
