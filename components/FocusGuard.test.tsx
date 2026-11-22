// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FocusGuard } from "./FocusGuard";

const rect = (top: number, bottom: number) =>
  ({ top, bottom, left: 0, right: 100, width: 100, height: bottom - top, x: 0, y: top }) as DOMRect;

function setup(barPosition: string) {
  document.body.innerHTML = `<nav class="dock"><button id="in-bar">tab</button></nav><button id="field">x</button>`;
  const bar = document.querySelector("nav.dock") as HTMLElement;
  bar.getBoundingClientRect = () => rect(600, 660);
  (document.getElementById("field") as HTMLElement).getBoundingClientRect = () => rect(580, 620);
  (document.getElementById("in-bar") as HTMLElement).getBoundingClientRect = () => rect(610, 650);
  vi.spyOn(window, "getComputedStyle").mockReturnValue({
    position: barPosition,
  } as CSSStyleDeclaration);
}

const focus = (id: string) =>
  document.getElementById(id)!.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));

describe("FocusGuard", () => {
  const scrollBy = vi.fn();
  beforeEach(() => {
    scrollBy.mockClear();
    window.scrollBy = scrollBy as unknown as typeof window.scrollBy;
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("scrolls a focused control out from under a fixed bottom bar", () => {
    setup("fixed");
    render(<FocusGuard />);
    focus("field");
    expect(scrollBy).toHaveBeenCalledWith({ top: 36, behavior: "instant" });
  });

  it("does nothing on wide screens where the nav is not fixed", () => {
    setup("static");
    render(<FocusGuard />);
    focus("field");
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it("does nothing for controls inside the bar itself", () => {
    setup("fixed");
    render(<FocusGuard />);
    focus("in-bar");
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it("stops listening when it unmounts", () => {
    setup("fixed");
    const { unmount } = render(<FocusGuard />);
    unmount();
    focus("field");
    expect(scrollBy).not.toHaveBeenCalled();
  });
});
