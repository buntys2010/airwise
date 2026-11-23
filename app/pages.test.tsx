// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { existsSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NAV } from "@/components/Chrome";
import { LangProvider } from "@/components/LangProvider";
import { CITIES } from "@/lib/data";
import CommunityPage from "./community/page";
import { pickCity } from "./test-city";
import MapPage from "./map/page";
import { must } from "../test-support/must";

let currentPath = "/";
vi.mock("next/navigation", () => ({ usePathname: () => currentPath }));

const points = (overrides: Record<string, unknown> = {}) =>
  CITIES.map((c, i) => ({
    id: c.id,
    name: c.name,
    lat: c.lat,
    lon: c.lon,
    pm: 40 + i * 45,
    source: "live",
    ...(overrides[c.id] as object | undefined),
  }));
function stubFetch(map: () => unknown | Promise<unknown>) {
  const f = vi.fn().mockImplementation(async (url: string) => {
    if (String(url).startsWith("/api/map")) {
      const r = await map();
      return r instanceof Error ? Promise.reject(r) : { ok: true, json: () => Promise.resolve(r) };
    }
    throw new Error("offline");
  });
  vi.stubGlobal("fetch", f);
  return f;
}
const wrap = (el: React.ReactElement) => render(<LangProvider>{el}</LangProvider>);
const noViolations = async (container: HTMLElement) => {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
  });
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
};

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
});
beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, "", "/");
  stubFetch(() => ({ points: points(), time: "16:00", live: 6 }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  currentPath = "/";
  document.documentElement.style.removeProperty("--haze");
});

describe("every main navigation link goes somewhere", () => {
  const appDir = path.resolve(__dirname);
  it("each NAV href has a page, so the nav can never link to a 404", () => {
    for (const l of NAV) {
      const dir = l.href === "/" ? appDir : path.join(appDir, ...l.href.split("/").filter(Boolean));
      expect(existsSync(path.join(dir, "page.tsx")), `${l.href} has no page.tsx`).toBe(true);
    }
  });
  it("lists exactly the four main pages", () => {
    expect(NAV.map((l) => l.href)).toEqual(["/", "/community", "/map", "/guide"]);
  });
});

describe("/map", () => {
  it("shows a loading state, then the map and an equivalent table from one request", async () => {
    const f = stubFetch(() => ({ points: points(), time: "16:00", live: 6 }));
    wrap(<MapPage />);
    expect(screen.getByText("Loading the map…")).toBeTruthy();
    const img = await screen.findByRole("img", { name: /Schematic map of India/ });
    expect(img).toBeTruthy();
    expect(f.mock.calls.filter((c) => String(c[0]).startsWith("/api/map"))).toHaveLength(1);
    const table = await screen.findByRole("table", {}, { timeout: 5000 });
    expect(within(table).getAllByRole("row")).toHaveLength(CITIES.length + 1);
    for (const c of CITIES)
      expect(
        within(table).getByRole("rowheader", { name: new RegExp(`^${c.name}[.]`) }),
      ).toBeTruthy();
    expect(
      screen.getByText(/Schematic map, not to scale\. Values for 16:00 India time\./),
    ).toBeTruthy();
  });

  it("each dot carries an icon and a value, and the table gives a level in words, so colour is never the only signal", async () => {
    wrap(<MapPage />);
    await screen.findByRole("img", { name: /Schematic map of India/ });
    const svg = must(document.querySelector("svg.mapsvg"));
    const named = CITIES.filter((c) => c.label).length;
    expect(svg.querySelectorAll("circle.map-dot")).toHaveLength(named); // the big cities carry a name and value
    expect(svg.querySelectorAll("text.map-icon")).toHaveLength(named);
    expect(svg.querySelectorAll("g.map-mark")).toHaveLength(CITIES.length); // every city is a tappable marker with a shape
    await screen.findByRole("table");
    const levels = [...document.querySelectorAll(".maptable .cat")].map((e) =>
      must(e.textContent).trim(),
    );
    expect(levels.every((l) => l.length > 3 && !/^[●◆▲■⬣✖]$/.test(l))).toBe(true);
  });

  it("marks only the city that could not be reached as an estimate, in the dot label and the table", async () => {
    stubFetch(() => ({ points: points({ pune: { source: "estimate" } }), time: "16:00", live: 5 }));
    wrap(<MapPage />);
    await screen.findByRole("img", { name: /Schematic map of India/ });
    const row = must(
      (await screen.findByRole("rowheader", { name: /^Pune[.]/ }, { timeout: 5000 })).closest("tr"),
    );
    expect(within(row).getByText("Estimate")).toBeTruthy();
    expect(
      within(must(screen.getByRole("rowheader", { name: /^Delhi[.]/ }).closest("tr"))).getByText(
        "Live",
      ),
    ).toBeTruthy();
    expect(must(document.querySelector("svg.mapsvg")).textContent).toMatch(/Pune/);
    expect(
      must(document.querySelector('g[data-city="pune"] circle')).getAttribute("stroke-dasharray") ??
        document.querySelector('g[data-city="pune"] .est-ring'),
    ).toBeTruthy();
    expect(document.querySelectorAll(".est-ring, circle.map-dot[stroke-dasharray]").length).toBe(1);
  });

  it("shows a plain error when the map data cannot be loaded, and no broken map", async () => {
    stubFetch(() => new Error("down"));
    wrap(<MapPage />);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe(
      "The map data could not be loaded. Try again in a moment.",
    );
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("treats an empty or malformed reply as an error", async () => {
    stubFetch(() => ({ points: [], time: "16:00", live: 0 }));
    wrap(<MapPage />);
    expect((await screen.findByRole("alert")).textContent).toMatch(/could not be loaded/);
  });

  it("works in Hindi with lang attributes and the same data", async () => {
    wrap(<MapPage />);
    fireEvent.click(screen.getByRole("button", { name: "हिन्दी" }));
    expect(await screen.findByRole("heading", { level: 1, name: "अभी शहरों की हवा" })).toBeTruthy();
    expect(document.documentElement.lang).toBe("hi");
    expect(await screen.findByRole("img", { name: /भारत का योजनाबद्ध नक्शा/ })).toBeTruthy();
  });

  it("has one h1, the nav with the current page marked, and no accessibility violations", async () => {
    currentPath = "/map";
    const { container } = wrap(<MapPage />);
    await screen.findByRole("img", { name: /Schematic map of India/ });
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Map" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Plan" }).getAttribute("aria-current")).toBeNull();
    await noViolations(container);
  });
});

describe("/community", () => {
  it("builds a one-page plan for the city with live figures, three household fixes and community rules", () => {
    wrap(<CommunityPage />);
    const notice = must(document.getElementById("community-plan"));
    expect(
      within(notice).getByRole("heading", { level: 2, name: "Smog plan for Lucknow" }),
    ).toBeTruthy();
    expect(notice.textContent).toMatch(/Right now in Lucknow: .+, PM2\.5 \d+ µg\/m³\./);
    expect(notice.textContent).toMatch(/Cleanest outdoor hour today: .+, at \d+ µg\/m³\./);
    expect(within(notice).getByRole("heading", { name: "Every household can" })).toBeTruthy();
    expect(notice.querySelectorAll("ol > li")).toHaveLength(3);
    expect(notice.querySelectorAll("ul > li").length).toBeGreaterThanOrEqual(3);
    expect(notice.textContent).toMatch(
      /Hold outdoor events, sports and assemblies at .+, the cleanest hour today\./,
    );
  });

  it("puts the building name on the notice, and nowhere else", () => {
    wrap(<CommunityPage />);
    fireEvent.change(screen.getByLabelText("Building, school or workplace name (optional)"), {
      target: { value: "Gomti Heights Society" },
    });
    expect(
      screen.getByRole("heading", { level: 2, name: "Smog plan for Gomti Heights Society" }),
    ).toBeTruthy();
    expect(screen.getByText("Printed on the notice only. It stays on this device.")).toBeTruthy();
  });

  it("changes the plan when the city or the typical homes change, recomputed by the engine", () => {
    wrap(<CommunityPage />);
    const before = must(document.getElementById("community-plan")).textContent;
    pickCity("Bengaluru");
    expect(must(document.getElementById("community-plan")).textContent).not.toBe(before);
    expect(screen.getByRole("heading", { level: 2, name: "Smog plan for Bengaluru" })).toBeTruthy();
  });

  it("prints only the notice: the controls are marked noprint and Print calls the browser", () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    wrap(<CommunityPage />);
    fireEvent.click(screen.getByRole("button", { name: "Print this notice" }));
    expect(print).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll(".noprint").length).toBeGreaterThanOrEqual(3);
    expect(must(document.getElementById("community-plan")).closest(".noprint")).toBeNull();
  });

  it("shares a link with choices only, using the share sheet when there is one", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    wrap(<CommunityPage />);
    fireEvent.change(screen.getByLabelText("Building, school or workplace name (optional)"), {
      target: { value: "Secret Name" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Share this plan" }));
    await waitFor(() => expect(share).toHaveBeenCalled());
    const url = new URL(must(share.mock.calls[0])[0].url);
    expect(url.pathname).toBe("/community");
    expect([...url.searchParams.keys()].sort()).toEqual(["city", "cooking", "home"]);
    expect(url.toString()).not.toMatch(/Secret|cig|pm/i); // the name stays on the device, and no figure is in the link
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
  });

  it("falls back to copying the link, and to showing it when the clipboard is blocked", async () => {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    wrap(<CommunityPage />);
    fireEvent.click(screen.getByRole("button", { name: "Share this plan" }));
    expect(
      await screen.findByText(/Link copied\. It carries choices only, never a number\./),
    ).toBeTruthy();
    expect(must(writeText.mock.calls[0])[0]).toMatch(/\/community\?city=lucknow/);
    writeText.mockRejectedValue(new Error("blocked"));
    fireEvent.click(screen.getByRole("button", { name: "Share this plan" }));
    expect(await screen.findByText(/\/community\?city=lucknow/)).toBeTruthy();
  });

  it("opens with the city from a shared link", async () => {
    window.history.replaceState({}, "", "/community?city=delhi&home=sealed&cooking=induction");
    wrap(<CommunityPage />);
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 2, name: "Smog plan for Delhi" })).toBeTruthy(),
    );
    expect((screen.getByLabelText("Sealed, AC on") as HTMLInputElement).checked).toBe(true);
  });

  it("works in Hindi: Hindi plan text, lang attributes, and English-only fix titles marked lang=en", () => {
    wrap(<CommunityPage />);
    fireEvent.click(screen.getByRole("button", { name: "हिन्दी" }));
    expect(
      screen.getByRole("heading", { level: 2, name: "Lucknow के लिए स्मॉग योजना" }),
    ).toBeTruthy();
    expect(must(document.getElementById("community-plan")).textContent).toMatch(
      /हर परिवार कर सकता है/,
    );
    expect(screen.getByRole("button", { name: "यह नोटिस छापें" })).toBeTruthy();
    expect(document.documentElement.lang).toBe("hi");
  });

  it("has one h1, the current page marked in the nav, and no accessibility violations", async () => {
    currentPath = "/community";
    const { container } = wrap(<CommunityPage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Community" }).getAttribute("aria-current")).toBe(
      "page",
    );
    await noViolations(container);
  });
});
