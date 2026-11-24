"use client";
import { useEffect, useRef, useState } from "react";

import { type Key, SPEECH_LANG } from "@/lib/i18n";
import {
  canSpeak,
  getRecognitionCtor,
  mapVoiceError,
  type RecognitionLike,
  speak,
  stopSpeaking,
  transcriptOf,
  VOICE_PROBLEM_KEY,
} from "@/lib/voice";

import { useLang } from "./LangProvider";

export type Choices = Record<string, unknown>;

interface Props {
  /** Only choices from fixed lists. The server recomputes every figure from them. */
  choices: Choices;
  prefill?: string;
  /** Opens the room photo picker (camera button). */
  onCamera?: () => void;
}

const SUGGESTIONS: Key[] = ["chat.q1", "chat.q2", "chat.q3", "chat.q4"];
/** The server answers within 12 s, either with Gemini's checked answer or with checked offline guidance. A little more here covers the network. */
export const CHAT_CLIENT_TIMEOUT_MS = 14_000;
/** After this long, say that it is still working. */
export const SLOW_AFTER_MS = 3_000;

export function Chat({ choices, prefill = "", onCamera }: Props) {
  const { lang, t } = useLang();
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [note, setNote] = useState<Key | { key: Key; vars: Record<string, string> } | null>(null);
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState("");
  const latest = useRef(0);

  // Voice: feature-detected, and never sends by itself. The transcript lands in the box for the user to check and send.
  const [micSupported, setMicSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceMsg, setVoiceMsg] = useState<Key | null>(null);
  const rec = useRef<RecognitionLike | null>(null);
  const [speakSupported, setSpeakSupported] = useState(false);
  const [readAloud, setReadAloud] = useState(false); // off by default
  const readRef = useRef(false);

  useEffect(() => {
    setMicSupported(getRecognitionCtor(window as never) !== null);
    setSpeakSupported(canSpeak(window));
    return () => {
      rec.current?.abort();
      stopSpeaking();
    };
  }, []);
  useEffect(() => {
    readRef.current = readAloud;
    if (!readAloud) stopSpeaking();
  }, [readAloud]);
  useEffect(() => {
    if (prefill) setQ(prefill);
  }, [prefill]);
  // A visible progress state: after a few seconds the card says it is still working, so a slow answer never looks like a hang.
  useEffect(() => {
    if (!busy) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [busy]);

  function toggleMic() {
    if (listening) {
      rec.current?.stop();
      return;
    }
    const Ctor = getRecognitionCtor(window as never);
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = SPEECH_LANG[lang];
    r.interimResults = false;
    r.continuous = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      const text = transcriptOf(e);
      if (text) {
        setQ(text);
        setVoiceMsg("voice.review");
      } else setVoiceMsg("voice.nospeech");
    };
    r.onerror = (e) => setVoiceMsg(VOICE_PROBLEM_KEY[mapVoiceError(e.error)]);
    r.onend = () => setListening(false);
    rec.current = r;
    setVoiceMsg(null);
    try {
      r.start();
      setListening(true);
    } catch {
      setVoiceMsg("voice.error");
    }
  }

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    const id = ++latest.current;
    setBusy(true);
    setError("");
    setVoiceMsg(null);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CHAT_CLIENT_TIMEOUT_MS);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, choices }),
        signal: ctrl.signal,
      });
      const json = (await res.json()) as {
        answer?: string;
        verified?: boolean;
        rejected?: boolean;
        reasonText?: string;
        error?: string;
      };
      if (id !== latest.current) return; // a newer question was asked meanwhile: drop this stale answer
      if (!res.ok || !json.answer) throw new Error(json.error || "Something went wrong.");
      setAnswer(json.answer);
      setNote(
        json.verified
          ? "chat.verified"
          : json.rejected
            ? "chat.rejected"
            : json.reasonText
              ? { key: "chat.reason", vars: { reason: json.reasonText } }
              : "chat.checked",
      );
      if (readRef.current) speak(json.answer, SPEECH_LANG[lang]);
    } catch (e) {
      if (id === latest.current) {
        const aborted = (e as Error).name === "AbortError";
        setError(
          aborted
            ? t("chat.timeout")
            : e instanceof Error && e.message !== "Failed to fetch"
              ? e.message
              : t("chat.errorNet"),
        );
      }
    } finally {
      clearTimeout(timer);
      if (id === latest.current) setBusy(false);
    }
  }

  const noteText = note ? (typeof note === "string" ? t(note) : t(note.key, note.vars)) : "";
  return (
    <div className="panel chat">
      <div className="suggest" role="group" aria-label={t("chat.suggested")}>
        {SUGGESTIONS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setQ(t(k));
              void ask(t(k));
            }}
          >
            {t(k)}
          </button>
        ))}
      </div>
      <form
        className="chatform"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(q);
        }}
      >
        <label htmlFor="q" className="sr-only">
          {t("chat.label")}
        </label>
        <input
          id="q"
          type="text"
          maxLength={400}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("chat.placeholder")}
          autoComplete="off"
          lang={lang}
        />
        <div className="chatactions">
          {onCamera && (
            <button type="button" className="iconbtn" onClick={onCamera} aria-label={t("chat.photo")}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M4 8h3l1.5-2h7L17 8h3v11H4z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="13" r="3.3" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
              <span aria-hidden="true">{t("chat.photoShort")}</span>
            </button>
          )}
          {micSupported && (
            <button
              type="button"
              className={`iconbtn${listening ? " on" : ""}`}
              onClick={toggleMic}
              aria-pressed={listening}
              aria-label={listening ? t("voice.stop") : t("voice.mic")}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect
                  x="9"
                  y="3"
                  width="6"
                  height="11"
                  rx="3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M5 11a7 7 0 0014 0M12 18v3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span aria-hidden="true">{listening ? t("voice.stopShort") : t("voice.micShort")}</span>
            </button>
          )}
          <button className="btn send" type="submit" disabled={busy}>
            {busy ? t("chat.thinking") : t("chat.send")}
          </button>
        </div>
      </form>
      <p className="voicemsg" role="status" aria-live="polite">
        {listening ? t("voice.listening") : voiceMsg ? t(voiceMsg) : ""}
      </p>
      {speakSupported && (
        <label className="check readaloud">
          <input type="checkbox" checked={readAloud} onChange={(e) => setReadAloud(e.target.checked)} />
          <span>{t("voice.read")}</span>
        </label>
      )}
      <div className="answer" aria-live="polite" aria-busy={busy} lang={answer ? lang : undefined}>
        {busy ? (
          <div className="working">
            <div className="progress" role="progressbar" aria-label={t("chat.thinking")}>
              <i />
            </div>
            {slow && <p>{t("chat.slow")}</p>}
          </div>
        ) : error ? (
          <p role="alert">{error}</p>
        ) : answer ? (
          <>
            <p>{answer}</p>
            <p className="dim" style={{ marginTop: 8, fontSize: "0.9rem" }}>
              {noteText}. {t("chat.disclaimer")}
            </p>
          </>
        ) : (
          <p className="dim">{t("chat.empty")}</p>
        )}
      </div>
    </div>
  );
}
