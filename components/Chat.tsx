"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Key } from "@/lib/i18n";
import { useLang } from "./LangProvider";
import { useVoice } from "./useVoice";
import { runInBackground } from "@/lib/background";

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
const CHAT_CLIENT_TIMEOUT_MS = 14_000;
/** After this long, say that it is still working. */
const SLOW_AFTER_MS = 3_000;

type Note = Key | { key: Key; vars: Record<string, string> };

interface ChatReply {
  answer?: string;
  verified?: boolean;
  rejected?: boolean;
  reasonText?: string;
  error?: string;
}

/** Asks the server. Resolves with a reply that has an answer, or throws with a message a person can read. */
async function requestAnswer(
  question: string,
  choices: Choices,
  signal: AbortSignal,
): Promise<ChatReply & { answer: string }> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, choices }),
    signal,
  });
  const json = (await res.json()) as ChatReply;
  if (!res.ok || !json.answer) throw new Error(json.error || "Something went wrong.");
  return { ...json, answer: json.answer };
}

/** The line under an answer that says how far it was checked. */
function noteFor(reply: ChatReply): Note {
  if (reply.verified) return "chat.verified";
  if (reply.rejected) return "chat.rejected";
  if (reply.reasonText) return { key: "chat.reason", vars: { reason: reply.reasonText } };
  return "chat.checked";
}

/** A timeout and a dropped connection get our own wording; a server message is shown as it came. */
function errorMessage(e: unknown, t: (key: Key) => string): string {
  if (e instanceof Error && e.name === "AbortError") return t("chat.timeout");
  return e instanceof Error && e.message !== "Failed to fetch" ? e.message : t("chat.errorNet");
}

function CameraIcon() {
  return (
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
  );
}

function MicIcon() {
  return (
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
  );
}

interface AnswerBodyProps {
  busy: boolean;
  slow: boolean;
  error: string;
  answer: string;
  noteText: string;
}

/** What sits in the answer box: progress, an error, the answer with its check note, or the empty prompt. */
function AnswerBody({ busy, slow, error, answer, noteText }: Readonly<AnswerBodyProps>) {
  const { t } = useLang();
  if (busy) {
    return (
      <div className="working">
        <div className="progress" role="progressbar" aria-label={t("chat.thinking")}>
          <i />
        </div>
        {slow && <p>{t("chat.slow")}</p>}
      </div>
    );
  }
  if (error) return <p role="alert">{error}</p>;
  if (answer)
    return (
      <>
        <p>{answer}</p>
        <p className="dim u-answer-note">
          {noteText}. {t("chat.disclaimer")}
        </p>
      </>
    );
  return <p className="dim">{t("chat.empty")}</p>;
}

/** The question box: suggested questions, text or voice input, and the answer with its grounding note. */
export function Chat({ choices, prefill = "", onCamera }: Readonly<Props>) {
  const { lang, t } = useLang();
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [note, setNote] = useState<Note | null>(null);
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState("");
  const latest = useRef(0);

  // The transcript lands in the box for the user to check and send.
  const onTranscript = useCallback((text: string) => setQ(text), []);
  const voice = useVoice(lang, onTranscript);

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

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    const id = ++latest.current;
    const isLatest = () => id === latest.current; // a newer question was asked meanwhile: drop this stale outcome
    setBusy(true);
    setError("");
    voice.clearMessage();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CHAT_CLIENT_TIMEOUT_MS);
    try {
      const reply = await requestAnswer(text, choices, ctrl.signal);
      if (!isLatest()) return;
      setAnswer(reply.answer);
      setNote(noteFor(reply));
      voice.readOut(reply.answer);
    } catch (e) {
      if (isLatest()) setError(errorMessage(e, t));
    } finally {
      clearTimeout(timer);
      if (isLatest()) setBusy(false);
    }
  }

  let noteText = "";
  if (note) noteText = typeof note === "string" ? t(note) : t(note.key, note.vars);
  let voiceText = "";
  if (voice.listening) voiceText = t("voice.listening");
  else if (voice.message) voiceText = t(voice.message);
  return (
    <div className="panel chat">
      <div className="suggest" role="group" aria-label={t("chat.suggested")}>
        {SUGGESTIONS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setQ(t(k));
              runInBackground(ask(t(k)));
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
          runInBackground(ask(q));
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
            <button
              type="button"
              className="iconbtn"
              onClick={onCamera}
              aria-label={t("chat.photo")}
            >
              <CameraIcon />
              <span aria-hidden="true">{t("chat.photoShort")}</span>
            </button>
          )}
          {voice.micSupported && (
            <button
              type="button"
              className={`iconbtn${voice.listening ? " on" : ""}`}
              onClick={voice.toggleMic}
              aria-pressed={voice.listening}
              aria-label={voice.listening ? t("voice.stop") : t("voice.mic")}
            >
              <MicIcon />
              <span aria-hidden="true">
                {voice.listening ? t("voice.stopShort") : t("voice.micShort")}
              </span>
            </button>
          )}
          <button className="btn send" type="submit" disabled={busy}>
            {busy ? t("chat.thinking") : t("chat.send")}
          </button>
        </div>
      </form>
      <p className="voicemsg" role="status" aria-live="polite">
        {voiceText}
      </p>
      {voice.speakSupported && (
        <label className="check readaloud">
          <input
            type="checkbox"
            checked={voice.readAloud}
            onChange={(e) => voice.setReadAloud(e.target.checked)}
          />
          <span>{t("voice.read")}</span>
        </label>
      )}
      <div className="answer" aria-live="polite" aria-busy={busy} lang={answer ? lang : undefined}>
        <AnswerBody busy={busy} slow={slow} error={error} answer={answer} noteText={noteText} />
      </div>
    </div>
  );
}
