// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { must } from "../test-support/must";
import Page from "./page";
import { cityBox, pickCity } from "./test-city";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

beforeAll(() => {
  window.matchMedia = ((q: string) => ({
    matches: true,
    media: q,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    onchange: null,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  window.print = () => undefined;
});

const live = Array.from({ length: 24 }, (_, i) => 120 + i);
/** Air feed answers (or fails); /api/chat is handled by `chat`. */
function stubFetch(
  opts: {
    air?: boolean;
    chat?: (body: Record<string, unknown>) => Promise<unknown> | unknown;
  } = {},
) {
  const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
    if (String(url).startsWith("/api/chat")) {
      const result = await (opts.chat ?? (() => ({ answer: "Wear an N95.", verified: true })))(
        JSON.parse(init?.body as string),
      );
      return { ok: true, json: () => Promise.resolve(result) };
    }
    if (!opts.air) throw new Error("offline");
    return {
      ok: true,
      json: () =>
        Promise.resolve(
          String(url).includes("air-quality")
            ? { hourly: { pm2_5: live } }
            : { current: { temperature_2m: 11, wind_speed_10m: 4 } },
        ),
    };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
beforeEach(() => {
  localStorage.clear();
  stubFetch();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.documentElement.style.removeProperty("--haze");
});

const marker = (n: number) => screen.getByRole("button", { name: new RegExp(`^Fix ${n}:`) });

describe("AirWise home", () => {
  it("shows a live badge when the feed answers, and an honest estimate label when it does not", async () => {
    stubFetch({ air: true });
    render(<Page />);
    expect(
      (await screen.findByText(/^Live air data, updated [0-9]{2}:[0-9]{2} IST$/)).textContent,
    ).toMatch(/Live air data/);
    expect(screen.getByText("11°C, wind 4 km/h", { exact: false })).toBeTruthy();
    cleanup();
    stubFetch({ air: false });
    render(<Page />);
    expect((await screen.findByText(/Offline estimate/)).textContent).not.toMatch(/Live/);
  });

  it("has no automated accessibility violations", async () => {
    const { container } = render(<Page />);
    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    });
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });

  it("opens on the sample room with an agency headline, a severity chip with icon and word, and a Sample room label", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(
      /^Today's air is .+\. Here is what you can change in your home\.$/,
    );
    expect(screen.getByText("Sample room")).toBeTruthy();
    expect(screen.getByRole("img", { name: /sample room/i })).toBeTruthy();
    expect(document.querySelector(".severity .cat i")?.textContent).toBeTruthy();
  });

  it("exposes landmarks, one h1, labelled controls and a skip-link target", () => {
    render(<Page />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("main")).toBeTruthy();
    expect(cityBox()).toBeTruthy();
    expect(screen.getByLabelText(/Ask AirWise a question/)).toBeTruthy();
    expect(document.getElementById("main")).not.toBeNull();
  });

  it("has three keyboard-reachable hotspot buttons and a matching text list of fixes", () => {
    render(<Page />);
    for (const n of [1, 2, 3]) {
      const markerEl = marker(n);
      expect(markerEl.tagName).toBe("BUTTON");
      expect(markerEl.getAttribute("aria-pressed")).toBe("false");
      expect(markerEl.getAttribute("tabindex")).not.toBe("-1");
    }
    const list = screen.getByRole("list", { name: "Fixes found in your room" });
    expect(list.querySelectorAll(":scope > li")).toHaveLength(3);
  });

  it("pressing a hotspot adds the fix, updates the row, lowers the dial and clears the haze", () => {
    render(<Page />);
    const hazeBefore = Number(document.documentElement.style.getPropertyValue("--haze"));
    const dial = screen.getByRole("group", { name: /daily exposure/i });
    const label = (el: HTMLElement) =>
      must(must(el.querySelector(".dialafter")).getAttribute("aria-label"));
    const cigsBefore = parseFloat(label(dial));
    fireEvent.click(marker(1));
    expect(marker(1).getAttribute("aria-pressed")).toBe("true");
    const list = screen.getByRole("list", { name: "Fixes found in your room" });
    expect(within(list).getAllByRole("button", { name: "Done" })).toHaveLength(1);
    expect(parseFloat(label(dial))).toBeLessThan(cigsBefore);
    expect(Number(document.documentElement.style.getPropertyValue("--haze"))).toBeLessThan(
      hazeBefore,
    );
  });

  it("the row button and the hotspot stay in sync, and either one removes the fix again", () => {
    render(<Page />);
    const list = screen.getByRole("list", { name: "Fixes found in your room" });
    fireEvent.click(must(within(list).getAllByRole("button", { name: "Do this" })[0]));
    expect(marker(1).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(marker(1));
    expect(marker(1).getAttribute("aria-pressed")).toBe("false");
    expect(within(list).queryByRole("button", { name: "Done" })).toBeNull();
  });

  it("switching city clears the plan", () => {
    render(<Page />);
    fireEvent.click(marker(1));
    pickCity("Bengaluru");
    expect(marker(1).getAttribute("aria-pressed")).toBe("false");
  });
});

describe("chat on the home screen", () => {
  it("sends only choices from fixed lists, never numbers, and shows the verified label", async () => {
    const fetchMock = stubFetch({ chat: () => ({ answer: "Wear an N95.", verified: true }) });
    render(<Page />);
    fireEvent.click(marker(2));
    fireEvent.click(screen.getByRole("button", { name: /Co-pilot/ }));
    fireEvent.change(screen.getByLabelText(/Ask AirWise a question/), {
      target: { value: "Do I need a mask?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText("Wear an N95.")).toBeTruthy();
    expect(screen.getByText(/Answered by Gemini, with every number checked/)).toBeTruthy();
    const call = must(fetchMock.mock.calls.find((c) => String(c[0]).startsWith("/api/chat")));
    const body = JSON.parse(call[1].body as string);
    expect(Object.keys(body).sort()).toEqual(["choices", "question"]);
    expect(body.choices).toMatchObject({
      city: "lucknow",
      home: "leaky",
      cooking: "lpg",
      commute: "bike",
      lang: "en",
      plan: { induction: true },
    });
    expect(JSON.stringify(body)).not.toMatch(/baselineCigs|planCigs|"pm"/);
  });

  it("explains why an answer is offline using the named reason", async () => {
    stubFetch({
      chat: () => ({
        answer: "Use a purifier.",
        verified: false,
        reasonText: "Gemini's rate limit was reached",
      }),
    });
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: /Co-pilot/ }));
    fireEvent.change(screen.getByLabelText(/Ask AirWise a question/), {
      target: { value: "purifier?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(
      await screen.findByText(/Gemini's rate limit was reached, so this is checked guidance/),
    ).toBeTruthy();
  });

  it("shows only the latest answer when questions are asked one after another", async () => {
    let release: (value: unknown) => void = (_value: unknown) => undefined;
    const slow = new Promise((r) => {
      release = r;
    });
    let callCount = 0;
    stubFetch({
      chat: () => (++callCount === 1 ? slow : { answer: "Second answer.", verified: true }),
    });
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: /Co-pilot/ }));
    const input = screen.getByLabelText(/Ask AirWise a question/);
    fireEvent.change(input, { target: { value: "first" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Thinking…" }).hasAttribute("disabled")).toBe(true),
    );
    release({ answer: "First answer.", verified: true });
    expect(await screen.findByText("First answer.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Do I really need an N95?" }));
    expect(await screen.findByText("Second answer.")).toBeTruthy();
    expect(screen.queryByText("First answer.")).toBeNull();
  });
});

describe("the haze is the memorable moment", () => {
  const haze = () => Number(document.documentElement.style.getPropertyValue("--haze"));
  it("starts visibly hazy and thins by at least a quarter when the room's fixes are applied", () => {
    render(<Page />);
    const before = haze();
    expect(before).toBeGreaterThan(0.45);
    fireEvent.click(marker(1));
    fireEvent.click(marker(3));
    const after = haze();
    expect(after).toBeLessThan(before);
    expect((before - after) / before).toBeGreaterThan(0.25);
  });
  it("returns to the starting haze when the fixes are removed again", () => {
    render(<Page />);
    const before = haze();
    fireEvent.click(marker(1));
    fireEvent.click(marker(1));
    expect(haze()).toBeCloseTo(before, 3);
  });
});

describe("wording of the dial", () => {
  it("says less exposure, never a bare percentage that could be read as what is left", () => {
    render(<Page />);
    fireEvent.click(marker(1));
    const dial = screen.getByRole("group", { name: /daily exposure/i });
    expect(within(dial).getByText(/^\d+% less exposure$/)).toBeTruthy();
    expect(within(dial).getByRole("img").getAttribute("aria-label")).toMatch(
      /^\d+% less exposure$/,
    );
  });
});

describe("user journey: household pills, stage dock and share pass", () => {
  it("ProfilePills render as radio groups, and one tap updates the household the chat sends", async () => {
    const fetchMock = stubFetch({ chat: () => ({ answer: "Ok.", verified: true }) });
    render(<Page />);
    const wood = screen.getByRole("radio", { name: /Wood or coal/ });
    expect(wood.getAttribute("aria-checked")).toBe("false");
    expect(screen.getByRole("radio", { name: /Gas \(LPG\)/ }).getAttribute("aria-checked")).toBe(
      "true",
    );
    fireEvent.click(wood);
    expect(wood.getAttribute("aria-checked")).toBe("true");
    fireEvent.keyDown(wood, { key: "ArrowLeft" }); // arrow keys move and select inside the group
    expect(screen.getByRole("radio", { name: /Induction/ }).getAttribute("aria-checked")).toBe(
      "true",
    );
    const vuln = screen.getByRole("button", { name: /child, older adult or someone with asthma/i });
    fireEvent.click(vuln);
    expect(vuln.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: /Co-pilot/ }));
    fireEvent.change(screen.getByLabelText(/Ask AirWise a question/), { target: { value: "ok?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() =>
      expect(fetchMock.mock.calls.some((c) => String(c[0]).startsWith("/api/chat"))).toBe(true),
    );
    const body = JSON.parse(
      must(fetchMock.mock.calls.find((c) => String(c[0]).startsWith("/api/chat")))[1]
        .body as string,
    );
    expect(body.choices).toMatchObject({ cooking: "induction", vulnerable: false });
  });

  it("BottomDock shows four stages and switches the active one", () => {
    render(<Page />);
    const dock = screen.getByRole("navigation", { name: "Sections" });
    const tabs = within(dock).getAllByRole("button");
    expect(tabs.map((b) => b.textContent?.replace(/[^A-Za-z-]/g, ""))).toEqual([
      "Room",
      "Dayplan",
      "Co-pilot",
      "Share",
    ]);
    expect(must(tabs[0]).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(must(tabs[1]));
    expect(must(tabs[1]).getAttribute("aria-pressed")).toBe("true");
    expect(must(tabs[0]).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("heading", { name: "What to buy first, by value" })).toBeTruthy();
    fireEvent.click(must(tabs[3]));
    expect(screen.getByRole("heading", { name: "Your card" })).toBeTruthy();
  });

  it("the share card is a picture built from choices only, and WhatsApp opens with the link when files cannot be shared", async () => {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true });
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: /Share/ }));
    const img = screen.getByRole("img", {
      name: /AirWise clean-air card for Lucknow: .+ cigarettes equivalent a day, .+ with this plan\./,
    }) as HTMLImageElement;
    const src = new URL(must(img.getAttribute("src")), "http://x");
    expect(src.pathname).toBe("/api/share-image");
    expect(src.searchParams.get("city")).toBe("lucknow");
    expect(
      [...src.searchParams.keys()].every((k) =>
        ["city", "home", "commute", "km", "cooking", "vulnerable", "plan", "size"].includes(k),
      ),
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /Share the card on WhatsApp/ }));
    await waitFor(() => expect(open).toHaveBeenCalled());
    expect(String(must(open.mock.calls[0])[0])).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(await screen.findByText("WhatsApp opened with your link.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Download the image" }).getAttribute("download")).toBe(
      "airwise-plan.png",
    );
  });

  it("has no automated accessibility violations with every stage mounted", async () => {
    const { container } = render(<Page />);
    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    });
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
});
