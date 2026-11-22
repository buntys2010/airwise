// @vitest-environment jsdom
import axe from "axe-core";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { LangProvider } from "@/components/LangProvider";
import Page from "./page";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

class FakeRec {
  static last: FakeRec | null = null;
  lang = ""; interimResults = true; continuous = true; maxAlternatives = 0;
  onresult: ((e: { results: { transcript: string }[][] }) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn(); stop = vi.fn(() => this.onend?.()); abort = vi.fn();
  constructor() { FakeRec.last = this; }
  say(text: string) { this.onresult?.({ results: [[{ transcript: text }]] }); this.onend?.(); }
  fail(code: string) { this.onerror?.({ error: code }); this.onend?.(); }
}
const spoken: { text: string; lang: string }[] = [];
const synth = { speak: vi.fn((u: { text: string; lang: string }) => { spoken.push(u); }), cancel: vi.fn() };
class Utterance { lang = ""; constructor(public text: string) {} }

function enableVoice() {
  (window as unknown as Record<string, unknown>).SpeechRecognition = FakeRec;
  (window as unknown as Record<string, unknown>).speechSynthesis = synth;
  (window as unknown as Record<string, unknown>).SpeechSynthesisUtterance = Utterance;
}
function disableVoice() {
  for (const k of ["SpeechRecognition", "webkitSpeechRecognition", "speechSynthesis", "SpeechSynthesisUtterance"]) delete (window as unknown as Record<string, unknown>)[k];
}

function stubFetch(chat: (body: Record<string, unknown>) => unknown = () => ({ answer: "Wear an N95.", verified: true })) {
  const f = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
    if (String(url).startsWith("/api/chat")) return { ok: true, json: async () => chat(JSON.parse(init?.body as string)) };
    throw new Error("offline");
  });
  vi.stubGlobal("fetch", f);
  return f;
}
const renderPage = () => render(<LangProvider><Page /></LangProvider>);
const chatCalls = (f: ReturnType<typeof vi.fn>) => f.mock.calls.filter((c) => String(c[0]).startsWith("/api/chat"));

beforeAll(() => {
  window.matchMedia = ((q: string) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as typeof window.matchMedia;
});
beforeEach(() => { localStorage.clear(); spoken.length = 0; synth.speak.mockClear(); synth.cancel.mockClear(); FakeRec.last = null; stubFetch(); disableVoice(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); disableVoice(); document.documentElement.lang = "en"; document.documentElement.style.removeProperty("--haze"); });

describe("language toggle", () => {
  it("switches the interface to Hindi, updates <html lang>, and remembers the choice", () => {
    renderPage();
    expect(document.documentElement.lang).toBe("en");
    fireEvent.click(screen.getByRole("button", { name: "हिन्दी" }));
    expect(document.documentElement.lang).toBe("hi");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/^आज हवा .+ है।/);
    expect(screen.getByRole("link", { name: "योजना" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByText("नमूना कमरा")).toBeTruthy();
    expect(screen.getByRole("button", { name: "हिन्दी" }).getAttribute("aria-pressed")).toBe("true");
    expect(localStorage.getItem("airwise.lang")).toBe("hi");
  });

  it("restores a saved Hindi choice on load, and switches back to English", async () => {
    localStorage.setItem("airwise.lang", "hi");
    renderPage();
    await waitFor(() => expect(document.documentElement.lang).toBe("hi"));
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(document.documentElement.lang).toBe("en");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/^Today's air is/);
  });

  it("marks the Hindi button lang=hi and the English-only detail sections lang=en while in Hindi", () => {
    renderPage();
    expect(screen.getByRole("button", { name: "हिन्दी" }).getAttribute("lang")).toBe("hi");
    fireEvent.click(screen.getByRole("button", { name: "हिन्दी" }));
    expect(document.querySelectorAll('main [lang="en"]').length).toBeGreaterThan(3);
    // a Hindi block must not sit inside an English-only wrapper
    expect(document.querySelector('[lang="en"] #h1')).toBeNull();
  });

  it("sends the language with the chat question, and shows the answer in that language", async () => {
    const f = stubFetch(() => ({ answer: "N95 पहनें।", verified: true }));
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "हिन्दी" }));
    fireEvent.change(screen.getByLabelText("AirWise से सवाल पूछें"), { target: { value: "क्या मुझे मास्क चाहिए?" } });
    fireEvent.click(screen.getByRole("button", { name: "भेजें" }));
    expect(await screen.findByText("N95 पहनें।")).toBeTruthy();
    expect(JSON.parse(chatCalls(f)[0][1].body as string).choices.lang).toBe("hi");
    expect(screen.getByText(/Gemini का जवाब, हर संख्या आपकी योजना से जाँची गई/)).toBeTruthy();
    expect(document.querySelector(".answer")!.getAttribute("lang")).toBe("hi");
  });

  it("shows the Hindi fix titles for the room's three fixes", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "हिन्दी" }));
    expect(screen.getByText("दरवाज़ों और खिड़कियों की दरारें बंद करें")).toBeTruthy();
  });

  it("has no automated accessibility violations in Hindi", async () => {
    const { container } = renderPage();
    fireEvent.click(screen.getByRole("button", { name: "हिन्दी" }));
    const results = await axe.run(container, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
});

describe("voice", () => {
  it("is hidden entirely in a browser without speech support, and typing still works", async () => {
    const f = stubFetch();
    renderPage();
    expect(screen.queryByRole("button", { name: "Speak your question" })).toBeNull();
    expect(screen.queryByLabelText("Read answers aloud")).toBeNull();
    fireEvent.change(screen.getByLabelText("Ask AirWise a question"), { target: { value: "mask?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText("Wear an N95.")).toBeTruthy();
    expect(chatCalls(f)).toHaveLength(1);
  });

  it("puts the transcript in the box for checking and never sends by itself", async () => {
    enableVoice();
    const f = stubFetch();
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Speak your question" }));
    expect(FakeRec.last!.start).toHaveBeenCalled();
    expect(FakeRec.last!.lang).toBe("en-IN");
    expect(FakeRec.last!.continuous).toBe(false);
    act(() => FakeRec.last!.say("do I need a mask"));
    expect((screen.getByLabelText("Ask AirWise a question") as HTMLInputElement).value).toBe("do I need a mask");
    expect(screen.getByText("Check the words, then press Send.")).toBeTruthy();
    expect(chatCalls(f)).toHaveLength(0); // explicit Send only
    fireEvent.change(screen.getByLabelText("Ask AirWise a question"), { target: { value: "do I need an N95" } }); // editable
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText("Wear an N95.");
    expect(JSON.parse(chatCalls(f)[0][1].body as string).question).toBe("do I need an N95");
  });

  it("announces listening, and the button reflects it", async () => {
    enableVoice();
    renderPage();
    const mic = await screen.findByRole("button", { name: "Speak your question" });
    fireEvent.click(mic);
    expect(screen.getByText("Listening…")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Stop listening" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Stop listening" }));
    expect(FakeRec.last!.stop).toHaveBeenCalled();
  });

  it.each([
    ["not-allowed", "Microphone access was blocked. You can still type your question."],
    ["no-speech", "Nothing was heard. Try again, or type your question."],
    ["network", "Voice input is not working right now. You can still type your question."],
  ])("explains a %s problem in plain words and leaves the typed box usable", async (code, text) => {
    enableVoice();
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Speak your question" }));
    act(() => FakeRec.last!.fail(code));
    expect(screen.getByText(text)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Ask AirWise a question"), { target: { value: "typed" } });
    expect((screen.getByLabelText("Ask AirWise a question") as HTMLInputElement).value).toBe("typed");
  });

  it("listens in Hindi after switching language", async () => {
    enableVoice();
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "हिन्दी" }));
    fireEvent.click(await screen.findByRole("button", { name: "बोलकर पूछें" }));
    expect(FakeRec.last!.lang).toBe("hi-IN");
    act(() => FakeRec.last!.say("मुझे मास्क चाहिए?"));
    expect(screen.getByText("शब्द जाँच लें, फिर भेजें दबाएँ।")).toBeTruthy();
  });

  it("handles a recogniser that throws on start", async () => {
    enableVoice();
    class Broken extends FakeRec { start = vi.fn(() => { throw new Error("busy"); }); }
    (window as unknown as Record<string, unknown>).SpeechRecognition = Broken;
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Speak your question" }));
    expect(screen.getByText(/Voice input is not working right now/)).toBeTruthy();
  });

  it("Read aloud is off by default, speaks answers only when switched on, in the right language, and stops when switched off", async () => {
    enableVoice();
    renderPage();
    const toggle = await screen.findByLabelText("Read answers aloud") as HTMLInputElement;
    expect(toggle.checked).toBe(false);
    fireEvent.change(screen.getByLabelText("Ask AirWise a question"), { target: { value: "one" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText("Wear an N95.");
    expect(synth.speak).not.toHaveBeenCalled();

    fireEvent.click(toggle);
    fireEvent.change(screen.getByLabelText("Ask AirWise a question"), { target: { value: "two" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(synth.speak).toHaveBeenCalledTimes(1));
    expect(spoken[0]).toMatchObject({ text: "Wear an N95.", lang: "en-IN" });

    fireEvent.click(toggle);
    expect(synth.cancel).toHaveBeenCalled();
  });

  it("has no automated accessibility violations with voice controls showing", async () => {
    enableVoice();
    const { container } = renderPage();
    await screen.findByRole("button", { name: "Speak your question" });
    const results = await axe.run(container, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
});
