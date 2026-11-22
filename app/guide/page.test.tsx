// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Guide from "./page";

afterEach(cleanup);

describe("Guide page", () => {
  it("has no automated accessibility violations", async () => {
    const { container } = render(<Guide />);
    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    });
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
  it("covers the quick start, every feature, the prompt guide and terms", () => {
    render(<Guide />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    for (const name of [
      "Start in a minute",
      "Every feature, and how to use it",
      "Prompt guide for Ask AirWise",
      "How the numbers work",
      "Plain-language terms",
    ]) {
      expect(screen.getByRole("heading", { name })).toBeTruthy();
    }
    for (const f of [
      "Live air badge",
      "City picker",
      "Cigarettes-a-day gauge",
      "Household profile",
      "Hour-by-hour chart",
      "Clear-air plan",
      "Ask AirWise",
      "Building notice",
    ]) {
      expect(screen.getAllByText(f).length).toBeGreaterThan(0);
    }
  });
  it("links each example prompt to the chat with the question prefilled", () => {
    render(<Guide />);
    const link = screen.getByRole("link", { name: "Do I really need an N95?" });
    expect(link.getAttribute("href")).toBe("/?ask=Do%20I%20really%20need%20an%20N95%3F#h-ask");
  });
  it("never calls simulated numbers live data", () => {
    const { container } = render(<Guide />);
    expect(container.textContent).not.toMatch(/demo data/i);
  });
});
