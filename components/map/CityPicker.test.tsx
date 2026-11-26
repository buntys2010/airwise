// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { LangProvider } from "../LangProvider";
import { CityPicker } from "./CityPicker";

function Harness({ onPick }: { onPick: (id: string) => void }) {
  const [v, setV] = useState("delhi");
  return (
    <LangProvider>
      <CityPicker
        value={v}
        onChange={(id) => {
          setV(id);
          onPick(id);
        }}
      />
    </LangProvider>
  );
}
const box = () => screen.getByRole("combobox", { name: "City" }) as HTMLInputElement;
afterEach(cleanup);

describe("CityPicker", () => {
  it("opens with every city, filters as you type, and finds old names and states", () => {
    render(<Harness onPick={() => {}} />);
    fireEvent.focus(box());
    expect(box().getAttribute("aria-expanded")).toBe("true");
    expect(screen.getAllByRole("option").length).toBe(50);
    fireEvent.change(box(), { target: { value: "bombay" } });
    expect(screen.getAllByRole("option")[0].textContent).toContain("Mumbai");
    fireEvent.change(box(), { target: { value: "kerala" } });
    expect(screen.getAllByRole("option").every((o) => /Kerala/.test(o.textContent))).toBe(true);
    fireEvent.change(box(), { target: { value: "zzzz" } });
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByRole("status").textContent).toMatch(/No city matches/);
  });
  it("works from the keyboard: arrows move, Enter chooses, Escape restores", () => {
    const picked: string[] = [];
    render(<Harness onPick={(id) => picked.push(id)} />);
    fireEvent.focus(box());
    fireEvent.change(box(), { target: { value: "pune" } });
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(picked).toEqual(["pune"]);
    expect(box().value).toBe("Pune");
    expect(box().getAttribute("aria-expanded")).toBe("false");
    fireEvent.change(box(), { target: { value: "xyz" } });
    fireEvent.keyDown(box(), { key: "Escape" });
    expect(box().value).toBe("Pune");
    fireEvent.keyDown(box(), { key: "ArrowDown" });
    fireEvent.keyDown(box(), { key: "ArrowDown" });
    expect(box().getAttribute("aria-activedescendant")).toBeTruthy();
  });
  it("has no accessibility violations open or closed", async () => {
    const { container } = render(<Harness onPick={() => {}} />);
    for (const open of [false, true]) {
      if (open) fireEvent.focus(box());
      const r = await axe.run(container, {
        rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
      });
      expect(r.violations.map((v) => v.id)).toEqual([]);
    }
  });
});
