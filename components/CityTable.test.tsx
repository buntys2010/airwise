// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MapPoint } from "@/lib/data";
import CityTable from "./CityTable";
import { LangProvider } from "./LangProvider";
import { must } from "../test-support/must";

const point = (id: string, name: string, state: string, pm: number): MapPoint => ({
  id,
  name,
  state,
  lat: 0,
  lon: 0,
  pm,
  source: "live",
});
const POINTS = [
  point("pune", "Pune", "Maharashtra", 40),
  point("delhi", "Delhi", "Delhi", 160),
  point("kochi", "Kochi", "Kerala", 20),
];
afterEach(cleanup);

const names = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((r) => r.textContent ?? "");

function mount(onSelect = vi.fn()) {
  render(
    <LangProvider>
      <CityTable points={POINTS} selected={null} onSelect={onSelect} />
    </LangProvider>,
  );
  return onSelect;
}

describe("CityTable", () => {
  it("starts with the most polluted city first and says which column is sorted", () => {
    mount();
    expect(names()[0]).toContain("Delhi");
    const pm = screen
      .getAllByRole("columnheader")
      .find((h) => h.getAttribute("aria-sort") === "descending");
    expect(pm).toBeTruthy();
  });

  it("sorts by name, then reverses when the same column is pressed again", () => {
    mount();
    const nameButton = must(screen.getAllByRole("button", { name: /Sort by/ })[0]);
    fireEvent.click(nameButton);
    expect(names().map((n) => n.slice(0, 4))).toEqual(["Delh", "Koch", "Pune"]);
    fireEvent.click(nameButton);
    expect(names().map((n) => n.slice(0, 4))).toEqual(["Pune", "Koch", "Delh"]);
  });

  it("filters by a state name", () => {
    mount();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "kerala" } });
    expect(names()).toHaveLength(1);
    expect(names()[0]).toContain("Kochi");
  });

  it("reports the chosen city to the map", () => {
    const onSelect = mount();
    fireEvent.click(must(screen.getAllByRole("button", { name: /Show/ })[0]));
    expect(onSelect).toHaveBeenCalledWith("delhi");
  });
});
