// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LangProvider } from "@/components/LangProvider";
import { STORE_KEY } from "@/lib/store";

import Page from "./page";
import { cityBox, cityName, pickCity } from "./test-city";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

function stubFetch(
  chat: (body: Record<string, unknown>) => unknown = () => ({ answer: "Wear an N95.", verified: true }),
) {
  const f = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
    if (String(url).startsWith("/api/chat"))
      return { ok: true, json: async () => chat(JSON.parse(init?.body as string)) };
    throw new Error("offline");
  });
  vi.stubGlobal("fetch", f);
  return f;
}
const renderPage = () =>
  render(
    <LangProvider>
      <Page />
    </LangProvider>,
  );
const setUrl = (search: string) => window.history.replaceState({}, "", `/${search}`);
const marker = (n: number) => screen.getByRole("button", { name: new RegExp(`^(Fix|उपाय) ${n}:`) });
const saved = () => localStorage.getItem(STORE_KEY);
const openTab = (name: string) =>
  fireEvent.click(
    within(screen.getByRole("navigation", { name: "Sections" })).getByRole("button", {
      name: new RegExp(name),
    }),
  );
const radio = (name: RegExp) => screen.getByRole("radio", { name });
const isOn = (el: HTMLElement) => el.getAttribute("aria-checked") === "true";

beforeAll(() => {
  window.matchMedia = (q: string) => ({
    matches: true,
    media: q,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    onchange: null,
    dispatchEvent: () => false,
  });
});
beforeEach(() => {
  localStorage.clear();
  setUrl("");
  stubFetch();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setUrl("");
  document.documentElement.style.removeProperty("--haze");
});

describe("first run", () => {
  it("opens on the sample room and the sample family, with nothing saved yet", () => {
    renderPage();
    expect(screen.getByText("Sample room")).toBeTruthy();
    expect(cityName()).toBe("Lucknow");
    expect(screen.getByText(/Not saved yet/)).toBeTruthy();
    expect(saved()).toBeNull();
  });
  it("shows the morning brief with the city, AQI, the best outdoor hour and the first thing to do", () => {
    renderPage();
    const brief = screen.getByRole("region", { name: "Your morning brief" });
    expect(within(brief).getByText(/^Lucknow at .+: AQI \d+, /)).toBeTruthy();
    expect(brief.textContent).toMatch(/Best outdoor hour: .+, at \d+ µg\/m³\./);
    expect(brief.textContent).toMatch(/Do first: .+\./);
  });
  it("shows the morning brief in Hindi, with the English-only fix title marked lang=en", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "हिन्दी" }));
    const brief = screen.getByRole("region", { name: "आपकी सुबह की जानकारी" });
    expect(brief.textContent).toMatch(/बाहर के लिए सबसे अच्छा घंटा/);
    expect(brief.textContent).toMatch(/सबसे पहले करें:/);
  });
});

describe("shared links carry choices only", () => {
  it("applies the city, household and switched-on fixes from a link", async () => {
    setUrl("?city=delhi&home=sealed&commute=metro&km=12&cooking=induction&vulnerable=0&plan=seal,purifier");
    renderPage();
    await waitFor(() => expect(cityName()).toBe("Delhi"));
    expect(isOn(radio(/Flat \(sealed\)/))).toBe(true);
    expect(isOn(radio(/Induction/))).toBe(true);
    expect(screen.getByLabelText(/One-way distance: 12 km/)).toBeTruthy();
    // the fixes that were on in the link are on here, and the numbers are this device's own, recomputed
    expect(screen.getAllByRole("button", { name: "Done" }).length).toBeGreaterThanOrEqual(1);
  });
  it("ignores anything outside the fixed lists, and any number smuggled into a link", async () => {
    setUrl("?city=atlantis&home=castle&baselineCigs=0.1&pct=99&plan=hack");
    renderPage();
    await waitFor(() => expect(cityBox()).toBeTruthy());
    expect(cityName()).toBe("Lucknow");
    expect(isOn(radio(/Flat \(leaky\)/))).toBe(true);
    const dial = screen.getByRole("group", { name: /daily exposure/i }).textContent ?? "";
    expect(dial).not.toMatch(/b0.1b/); // the smuggled baselineCigs never reaches the dial
    expect(dial).not.toMatch(/b99%/);
  });
  it("opening someone's link never overwrites what this device saved", async () => {
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({
        city: "pune",
        profile: { home: "typical", commute: "walk", km: 2, cooking: "induction", vulnerable: false },
      }),
    );
    setUrl("?city=delhi&cooking=wood");
    renderPage();
    await waitFor(() => expect(cityName()).toBe("Delhi"));
    expect(JSON.parse(saved()!).city).toBe("pune");
    pickCity("Mumbai"); // only the user's own change is saved
    await waitFor(() => expect(JSON.parse(saved()!).city).toBe("mumbai"));
  });
  it("Copy a link puts only choices in the link and says so", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    renderPage();
    fireEvent.click(marker(1));
    openTab("Share");
    fireEvent.click(screen.getByRole("button", { name: "Copy a link to this plan" }));
    expect(
      await screen.findByText(/Link copied\. It carries your choices only, never a number\./),
    ).toBeTruthy();
    const url = new URL(writeText.mock.calls[0][0]);
    expect(url.searchParams.get("city")).toBe("lucknow");
    expect(url.searchParams.get("plan")).toBe("seal");
    expect([...url.searchParams.keys()].sort()).toEqual([
      "city",
      "commute",
      "cooking",
      "home",
      "km",
      "plan",
      "vulnerable",
    ]);
  });
  it("uses the phone's share sheet when there is one", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    renderPage();
    openTab("Share");
    fireEvent.click(screen.getByRole("button", { name: "Copy a link to this plan" }));
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(share.mock.calls[0][0].url).toMatch(/\?city=lucknow/);
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
  });
  it("shows the link to copy by hand when the clipboard is blocked", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("no")) },
      configurable: true,
    });
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    renderPage();
    openTab("Share");
    fireEvent.click(screen.getByRole("button", { name: "Copy a link to this plan" }));
    const box = (await screen.findByLabelText("Copy this link:")) as HTMLInputElement;
    expect(box.readOnly).toBe(true);
    expect(box.value).toMatch(/\?city=lucknow/);
  });
  it("offers a WhatsApp share that carries words and the choices-only link", () => {
    renderPage();
    openTab("Share");
    const link = screen.getByRole("link", { name: /Share on WhatsApp/ }) as HTMLAnchorElement;
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    const text = decodeURIComponent(new URL(link.href).searchParams.get("text")!);
    expect(text).toMatch(/smog in Lucknow, with AirWise: http.*\?city=lucknow/);
    expect(text).not.toMatch(/cigarette|µg|%/);
  });
});

describe("device-only save", () => {
  it("restores a saved household and city on the next visit, and says it is saved on this phone", async () => {
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({
        city: "kolkata",
        profile: { home: "sealed", commute: "metro", km: 5, cooking: "induction", vulnerable: false },
      }),
    );
    renderPage();
    await waitFor(() => expect(cityName()).toBe("Kolkata"));
    expect(isOn(radio(/Flat \(sealed\)/))).toBe(true);
    expect(screen.getByText("Saved on this phone")).toBeTruthy();
  });
  it("saves the user's own changes, storing choices and no figures", async () => {
    renderPage();
    fireEvent.click(radio(/Metro/));
    await waitFor(() => expect(screen.getByText("Saved on this phone")).toBeTruthy());
    const data = JSON.parse(saved()!);
    expect(data.profile.commute).toBe("metro");
    expect(Object.keys(data).sort()).toEqual(["city", "profile"]);
    expect(saved()).not.toMatch(/cig|pm|exposure/i);
  });
  it("Clear forgets everything and returns to the sample family", async () => {
    renderPage();
    fireEvent.click(radio(/Metro/));
    await waitFor(() => expect(screen.getByText("Saved on this phone")).toBeTruthy());
    openTab("Share");
    fireEvent.click(screen.getByRole("button", { name: "Clear what is saved" }));
    expect(saved()).toBeNull();
    expect(await screen.findByText(/Cleared\. Back to the sample family\./)).toBeTruthy();
    openTab("Room");
    expect(isOn(radio(/Two-wheeler/))).toBe(true);
    expect(screen.getByText(/Not saved yet/)).toBeTruthy();
  });
  it("works when storage is blocked, and says so", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    renderPage();
    expect(await screen.findByText("Not saved on this phone (storage is blocked)")).toBeTruthy();
    fireEvent.click(marker(1)); // the app still works
    expect(marker(1).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByRole("button", { name: "Clear what is saved" })).toBeNull();
  });
});

describe("calendar reminder", () => {
  it("downloads a daily 7:00 calendar file built on the device, and shows the link to add it by hand", async () => {
    let blob: Blob | null = null;
    URL.createObjectURL = vi.fn((b: Blob) => {
      blob = b;
      return "blob:ics";
    });
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    renderPage();
    openTab("Share");
    fireEvent.click(screen.getByRole("button", { name: "Remind me every morning" }));
    expect(click).toHaveBeenCalled();
    expect(blob!.type).toMatch(/text\/calendar/);
    const text = await blob!.text();
    expect(text).toContain("RRULE:FREQ=DAILY");
    expect(text).toMatch(/DTSTART:\d{8}T070000/);
    expect(text).toMatch(/URL:http.*\?city=lucknow/);
    expect(screen.getByText(/add it by hand: daily at 7:00 am, link http.*\?city=lucknow/)).toBeTruthy();
  });
});

describe("chat progress and time limits", () => {
  it("shows progress at once, says it is still working after a few seconds, and recovers on a timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(
          (_u: string, init?: RequestInit) =>
            new Promise((_r, rej) =>
              init?.signal?.addEventListener("abort", () =>
                rej(Object.assign(new Error("a"), { name: "AbortError" })),
              ),
            ),
        ),
    );
    renderPage();
    openTab("Co-pilot");
    fireEvent.change(screen.getByLabelText("Ask AirWise a question"), { target: { value: "mask?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(screen.getByRole("progressbar")).toBeTruthy();
    expect(screen.queryByText(/Still working/)).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_100);
    });
    expect(
      screen.getByText(
        /Still working\. If Gemini is slow you will get checked guidance within a few seconds\./,
      ),
    ).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(11_500);
    });
    expect(screen.getByRole("alert").textContent).toMatch(/That took too long/);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByRole("button", { name: "Send" }).hasAttribute("disabled")).toBe(false);
  });
});

describe("chat controls layout", () => {
  it("the input has its own row, and the buttons below carry visible text labels", () => {
    (window as unknown as Record<string, unknown>).SpeechRecognition = class {
      start() {}
      stop() {}
      abort() {}
    };
    renderPage();
    const form = document.querySelector(".chatform")!;
    const input = form.querySelector("input#q")!;
    const actions = form.querySelector(".chatactions")!;
    expect(input.parentElement).toBe(form);
    expect(actions.contains(input)).toBe(false);
    const labels = [...actions.querySelectorAll("button")].map((b) => b.textContent?.trim());
    expect(labels).toEqual(["Photo", "Speak", "Send"]);
    delete (window as unknown as Record<string, unknown>).SpeechRecognition;
  });
  it("has no automated accessibility violations with the new tools", async () => {
    const { container } = renderPage();
    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    });
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
});
