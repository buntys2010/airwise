// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { LangProvider } from "@/components/LangProvider";
import { CITIES, estimateHourly } from "@/lib/data";
import { NO_PLAN, cigsSoFar, simulate, toggleAction, buildActions } from "@/lib/engine";
import { DEFAULT_PROFILE } from "@/components/useAirwise";
import { CityCigs } from "@/components/CityCigs";
import Page from "./page";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

beforeAll(() => {
  window.matchMedia = ((q: string) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as typeof window.matchMedia;
});
beforeEach(() => { localStorage.clear(); window.history.replaceState({}, "", "/"); vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline"))); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); document.documentElement.style.removeProperty("--haze"); });

describe("the dial's text matches the engine", () => {
  const hourly = estimateHourly(CITIES.find((c) => c.id === "lucknow")!);
  const profile = DEFAULT_PROFILE;
  const expected = (plan = NO_PLAN) => ({
    day: simulate(hourly, profile, plan).cigs.toFixed(1),
    sofar: cigsSoFar(hourly, profile, plan, 16).toFixed(1),
  });
  const read = () => {
    const dial = screen.getByRole("group", { name: /daily exposure/i });
    return {
      before: dial.querySelector(".dialbefore")!.getAttribute("aria-label")!,
      after: dial.querySelector(".dialafter")!.getAttribute("aria-label")!,
      sofar: within(dial).getAllByText(/^So far today/)[0].textContent!,
    };
  };

  it("shows the do-nothing day, the day with the plan, and so far today, before and after applying a fix", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-22T10:30:00Z")); // 16:00 in India
    render(<LangProvider><Page /></LangProvider>);
    await waitFor(() => expect(screen.getByText(/Offline estimate/)).toBeTruthy());
    const none = expected();
    await waitFor(() => expect(read().sofar).toBe(`So far today (to 4 pm): ${none.sofar} cigarettes' worth`));
    expect(read().before).toBe(`${none.day} if nothing changes`);
    expect(read().after).toBe(`${none.day} with your plan`);

    fireEvent.click(screen.getByRole("button", { name: /^Fix 1:/ }));
    const act = buildActions(hourly, profile).find((a) => a.id === "sealGaps")!;
    const withFix = expected(toggleAction(NO_PLAN, act));
    await waitFor(() => expect(read().sofar).toBe(`So far today (to 4 pm): ${withFix.sofar} cigarettes' worth`));
    expect(read().after).toBe(`${withFix.day} with your plan`);
    expect(read().before).toBe(`${none.day} if nothing changes`); // the do-nothing figure does not move
    expect(parseFloat(withFix.sofar)).toBeLessThan(parseFloat(none.sofar));
  });

  it("labels the figure honestly: a rule of thumb, general guidance, not medical advice", () => {
    render(<LangProvider><Page /></LangProvider>);
    const note = screen.getByText(/Cigarettes equivalent is a rule of thumb/);
    expect(note.textContent).toMatch(/about 22 µg\/m³ of PM2\.5 over a day counts as one cigarette/);
    expect(note.textContent).toMatch(/General guidance, not medical advice/);
    expect(note.textContent).not.toMatch(/danger|deadly|kill|warning|shame/i); // calm, no alarm copy
  });

  it("puts the figures in one polite live region, and the drawing outside assistive technology", () => {
    render(<LangProvider><Page /></LangProvider>);
    const dial = screen.getByRole("group", { name: /daily exposure/i });
    const live = dial.querySelector('[aria-live="polite"]')!;
    expect(live.querySelector(".dialafter")).toBeTruthy();
    expect(live.querySelector(".cigtext")).toBeTruthy();
    expect(dial.querySelector(".cigrow")!.getAttribute("aria-hidden")).toBe("true");
  });

  it("shows the same figures in Hindi, with Hindi labels", () => {
    render(<LangProvider><Page /></LangProvider>);
    fireEvent.click(screen.getByRole("button", { name: "हिन्दी" }));
    const dial = screen.getByRole("group", { name: /सिगरेट/ });
    expect(within(dial).getAllByText(/^आज अब तक/)[0]).toBeTruthy();
    expect(within(dial).getByText(/सिगरेट के बराबर एक मोटा अंदाज़ा है/)).toBeTruthy();
  });

  it("has no automated accessibility violations", async () => {
    const { container } = render(<LangProvider><Page /></LangProvider>);
    const results = await axe.run(container, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
});

describe("the city strip at the very top", () => {
  it("draws one stick per cigarette-equivalent, hides the drawing from assistive technology, and says the same in text", () => {
    const { container } = render(<LangProvider><CityCigs city="delhi" day={5.6} soFar={4.8} /></LangProvider>);
    expect(container.querySelectorAll(".stick")).toHaveLength(6);
    expect(container.querySelector(".cigrow")!.getAttribute("aria-hidden")).toBe("true");
    expect(container.textContent).toMatch(/Outdoors all day here: about 5\.6 cigarettes/);
    expect(container.textContent).toMatch(/4\.8 so far today/);
  });

  it("starts from nothing and burns up to the so-far figure when the city changes", async () => {
    window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as typeof window.matchMedia;
    const { container, rerender } = render(<LangProvider><CityCigs key="lucknow" city="lucknow" day={2.3} soFar={1.6} /></LangProvider>);
    const burned = () => [...container.querySelectorAll<HTMLElement>(".cash")].reduce((a, el) => a + parseFloat(el.style.width || "0"), 0);
    await waitFor(() => expect(burned()).toBeGreaterThan(100));
    rerender(<LangProvider><CityCigs key="delhi" city="delhi" day={5.6} soFar={4.8} /></LangProvider>); // a new key replays the burn
    expect(burned()).toBeLessThan(100);
    await waitFor(() => expect(burned()).toBeGreaterThan(400), { timeout: 3000 });
  });

  it("shows the end state at once for people who prefer reduced motion", () => {
    window.matchMedia = ((q: string) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as typeof window.matchMedia;
    const { container } = render(<LangProvider><CityCigs city="delhi" day={5.6} soFar={4.8} /></LangProvider>);
    const burned = [...container.querySelectorAll<HTMLElement>(".cash")].reduce((a, el) => a + parseFloat(el.style.width || "0"), 0);
    expect(burned).toBeGreaterThan(400); // 4.8 of 5.6 cigarettes, as percent widths
  });
});
