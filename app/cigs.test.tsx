// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { CigaretteRow } from "@/components/CigaretteRow";
import { LangProvider } from "@/components/LangProvider";
import { CITIES, estimateHourly } from "@/lib/data";
import { NO_PLAN, cigsSoFar, simulate, toggleAction, buildActions } from "@/lib/engine";
import { DEFAULT_PROFILE } from "@/components/useAirwise";
import Page from "./page";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

beforeAll(() => {
  window.matchMedia = ((q: string) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as typeof window.matchMedia;
});
beforeEach(() => { localStorage.clear(); window.history.replaceState({}, "", "/"); vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline"))); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); document.documentElement.style.removeProperty("--haze"); });

describe("CigaretteRow", () => {
  it("is decorative: hidden from assistive technology, and carries no text of its own except the +N chip", () => {
    const { container } = render(<CigaretteRow base={3.4} plan={2.2} soFar={1} />);
    const root = container.querySelector(".cigrow")!;
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(root.querySelector("svg")!.getAttribute("focusable")).toBe("false");
    expect(root.querySelector("text")).toBeNull();
  });
  it("draws a slot per cigarette-equivalent, marks the one being smoked, and shows the ember only there", async () => {
    const { container } = render(<CigaretteRow base={4} plan={4} soFar={1.5} />);
    await waitFor(() => expect(container.querySelectorAll("g[data-burning]")).toHaveLength(1)); // after the first frame the burn-down plays
    expect(container.querySelectorAll("svg g")).toHaveLength(4);
    const ember = [...container.querySelectorAll<SVGRectElement>("rect.cig-ember")].map((r) => r.style.height);
    expect(ember.filter((h) => h && h !== "0px" && h !== "0")).toHaveLength(1);
  });
  it("starts unburned and burns down to the so-far figure", async () => {
    const { container } = render(<CigaretteRow base={3} plan={3} soFar={2} />);
    const ash = () => [...container.querySelectorAll<SVGRectElement>("rect.cig-ash")].reduce((a, r) => a + parseFloat(r.style.height || "0"), 0);
    expect(ash()).toBe(0);
    await waitFor(() => expect(ash()).toBeGreaterThan(0));
  });
  it("shortens the same cigarettes when the plan figure falls", async () => {
    const { container, rerender } = render(<CigaretteRow base={4} plan={4} soFar={0} />);
    const body = () => [...container.querySelectorAll<SVGRectElement>("rect.cig-body")].reduce((a, r) => a + parseFloat(r.style.height || "0"), 0);
    await waitFor(() => expect(body()).toBeGreaterThan(0));
    const full = body();
    rerender(<CigaretteRow base={4} plan={1.5} soFar={0} />);
    expect(body()).toBeLessThan(full);
    expect(container.querySelectorAll("svg g")).toHaveLength(4); // the same row, not a new one
    expect(container.querySelectorAll("rect.cig-ghost")).toHaveLength(4); // the do-nothing outlines stay
  });
  it("shows a +N chip beyond ten cigarettes, and never overflows the row", () => {
    const { container } = render(<CigaretteRow base={14.5} plan={14.5} soFar={0} />);
    expect(container.querySelectorAll("svg g")).toHaveLength(10);
    expect(container.querySelector(".cigmore")!.textContent).toBe("+5");
    expect(render(<CigaretteRow base={3} plan={3} soFar={0} />).container.querySelector(".cigmore")).toBeNull();
  });
});

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
