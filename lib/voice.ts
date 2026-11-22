/**
 * Browser voice helpers (Web Speech API). Everything is feature-detected: where a browser has no speech support the
 * controls are simply not shown and typing keeps working. Speech recognition in Chrome sends audio to the browser vendor's
 * service; AirWise itself never receives or stores audio, only the text the user chooses to send.
 */

export interface RecognitionResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

export interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

export type RecognitionCtor = new () => RecognitionLike;

export function getRecognitionCtor(
  w: { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor } | undefined,
): RecognitionCtor | null {
  return w?.SpeechRecognition ?? w?.webkitSpeechRecognition ?? null;
}

export type VoiceProblem = "blocked" | "nospeech" | "other";

/** Maps the browser's error codes to the three things a user can act on. */
export function mapVoiceError(code: string): VoiceProblem {
  if (code === "not-allowed" || code === "service-not-allowed") return "blocked";
  if (code === "no-speech" || code === "aborted") return "nospeech";
  return "other";
}

export const VOICE_PROBLEM_KEY = {
  blocked: "voice.blocked",
  nospeech: "voice.nospeech",
  other: "voice.error",
} as const;

/** First transcript of the first result, trimmed and capped to the chat limit. */
export function transcriptOf(e: RecognitionResultEvent, max = 400): string {
  return (e.results?.[0]?.[0]?.transcript ?? "").trim().slice(0, max);
}

interface SynthWindow {
  speechSynthesis?: { speak(u: unknown): void; cancel(): void };
  SpeechSynthesisUtterance?: new (text: string) => { lang: string };
}

export function canSpeak(w: SynthWindow | undefined): boolean {
  return Boolean(w?.speechSynthesis && w.SpeechSynthesisUtterance);
}

/** Reads text aloud, replacing anything already being read. No-op where speech output is unsupported. */
export function speak(
  text: string,
  lang: string,
  w: SynthWindow | undefined = typeof window === "undefined" ? undefined : window,
): void {
  if (!w || !canSpeak(w) || !text.trim()) return;
  w.speechSynthesis!.cancel();
  const u = new w.SpeechSynthesisUtterance!(text);
  u.lang = lang;
  w.speechSynthesis!.speak(u);
}

export function stopSpeaking(
  w: SynthWindow | undefined = typeof window === "undefined" ? undefined : window,
): void {
  w?.speechSynthesis?.cancel();
}
