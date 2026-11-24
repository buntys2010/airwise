import { describe, expect, it, vi } from "vitest";

import {
  canSpeak,
  getRecognitionCtor,
  mapVoiceError,
  speak,
  stopSpeaking,
  transcriptOf,
  VOICE_PROBLEM_KEY,
} from "./voice";

describe("getRecognitionCtor", () => {
  class A {}
  class B {}
  it("prefers the standard name, then the webkit one, else null", () => {
    expect(getRecognitionCtor({ SpeechRecognition: A as never, webkitSpeechRecognition: B as never })).toBe(
      A,
    );
    expect(getRecognitionCtor({ webkitSpeechRecognition: B as never })).toBe(B);
    expect(getRecognitionCtor({})).toBeNull();
    expect(getRecognitionCtor(undefined)).toBeNull();
  });
});

describe("mapVoiceError", () => {
  it("turns browser error codes into three things a user can act on", () => {
    expect(mapVoiceError("not-allowed")).toBe("blocked");
    expect(mapVoiceError("service-not-allowed")).toBe("blocked");
    expect(mapVoiceError("no-speech")).toBe("nospeech");
    expect(mapVoiceError("aborted")).toBe("nospeech");
    expect(mapVoiceError("network")).toBe("other");
    expect(mapVoiceError("audio-capture")).toBe("other");
    expect(VOICE_PROBLEM_KEY.blocked).toBe("voice.blocked");
  });
});

describe("transcriptOf", () => {
  const ev = (text?: string) => ({ results: [[{ transcript: text ?? "" }]] }) as never;
  it("trims, caps to the chat limit, and survives empty results", () => {
    expect(transcriptOf(ev("  do I need a mask  "))).toBe("do I need a mask");
    expect(transcriptOf(ev("a".repeat(900))).length).toBe(400);
    expect(transcriptOf(ev(""))).toBe("");
    expect(transcriptOf({ results: [] })).toBe("");
  });
});

describe("speech output", () => {
  function fakeWindow() {
    const spoken: { text: string; lang: string }[] = [];
    const order: string[] = [];
    class U {
      lang = "";
      constructor(public text: string) {}
    }
    return {
      spoken,
      order,
      w: {
        SpeechSynthesisUtterance: U as never,
        speechSynthesis: {
          speak: (u: { text: string; lang: string }) => {
            order.push("speak");
            spoken.push(u);
          },
          cancel: () => {
            order.push("cancel");
          },
        },
      },
    };
  }
  it("is only available when both parts exist", () => {
    expect(canSpeak(undefined)).toBe(false);
    expect(canSpeak({})).toBe(false);
    expect(canSpeak(fakeWindow().w)).toBe(true);
  });
  it("cancels whatever is playing, then speaks in the requested language", () => {
    const { w, spoken, order } = fakeWindow();
    speak("Wear an N95.", "hi-IN", w);
    expect(order).toEqual(["cancel", "speak"]);
    expect(spoken[0]).toMatchObject({ text: "Wear an N95.", lang: "hi-IN" });
  });
  it("does nothing for empty text or an unsupported browser", () => {
    const { w, spoken } = fakeWindow();
    speak("   ", "en-IN", w);
    expect(spoken).toHaveLength(0);
    expect(() => speak("hi", "en-IN", {})).not.toThrow();
  });
  it("stopSpeaking cancels and is safe without support", () => {
    const { w, order } = fakeWindow();
    stopSpeaking(w);
    expect(order).toEqual(["cancel"]);
    expect(() => stopSpeaking({})).not.toThrow();
    expect(() => stopSpeaking(undefined)).not.toThrow();
    vi.restoreAllMocks();
  });
});
