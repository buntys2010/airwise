// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScheduleEntry } from "@/lib/schedule";
import { DayPlan } from "./DayPlan";
import { LangProvider } from "./LangProvider";

const SCHEDULE: ScheduleEntry[] = [
  { hour: 7, time: "7 am", title: "Cook with less smoke", detail: "Run the chimney." },
  { hour: 22, time: "10 pm", title: "Sleep with the purifier on", detail: "Close the door." },
];
const CHOICES = { city: "delhi" };

function answer(body: object, ok = true) {
  return vi.fn().mockResolvedValue({ ok, json: () => Promise.resolve(body) });
}
function mount(props: { active?: boolean } = {}) {
  return render(
    <LangProvider>
      <DayPlan schedule={SCHEDULE} choices={CHOICES} {...props} />
    </LangProvider>,
  );
}
const GEMINI = {
  source: "gemini",
  verified: true,
  headline: "A calmer day",
  steps: [{ time: "7 am", text: "Written by the model." }],
};

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("DayPlan", () => {
  it("shows the calculated schedule at once and asks nothing while the tab is hidden", () => {
    const fetchMock = answer(GEMINI);
    vi.stubGlobal("fetch", fetchMock);
    mount({ active: false });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText("Cook with less smoke")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("asks once the tab is open and then shows the checked, rewritten plan", async () => {
    const fetchMock = answer(GEMINI);
    vi.stubGlobal("fetch", fetchMock);
    mount();
    expect(screen.getByRole("button").textContent).toBe("Write it in my words with Gemini");
    act(() => {
      vi.advanceTimersByTime(800);
    });
    await waitFor(() => expect(screen.getByText("Written by the model.")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Written by Gemini, numbers checked/)).toBeTruthy();
    expect(screen.getByRole("button").textContent).toBe("Write it again with Gemini");
    expect(screen.getByText(/Every number was checked/)).toBeTruthy();
  });

  it("explains a fallback: a rejected rewrite, and an unavailable model", async () => {
    vi.stubGlobal("fetch", answer({ ...GEMINI, source: "offline", rejected: true }));
    mount();
    act(() => {
      vi.advanceTimersByTime(800);
    });
    await waitFor(() => expect(screen.getByText(/used a number we could not verify/)).toBeTruthy());
    cleanup();

    vi.stubGlobal("fetch", answer({ ...GEMINI, source: "offline", reasonText: "Gemini is busy" }));
    mount();
    act(() => {
      vi.advanceTimersByTime(800);
    });
    await waitFor(() =>
      expect(screen.getByText(/Gemini is busy, so this is the standard plan/)).toBeTruthy(),
    );
  });

  it("shows a server error, then retries from the button", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Too many requests." }),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(GEMINI) });
    vi.stubGlobal("fetch", fetchMock);
    mount();
    act(() => {
      vi.advanceTimersByTime(800);
    });
    await waitFor(() => expect(screen.getByText("Too many requests.")).toBeTruthy());
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(screen.getByText("Written by the model.")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("says so when the network is down", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue("offline"));
    mount();
    act(() => {
      vi.advanceTimersByTime(800);
    });
    await waitFor(() => expect(screen.getByText(/Could not reach AirWise/)).toBeTruthy());
  });
});
