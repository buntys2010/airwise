"use client";
/** The Ask AirWise card: composes the question box, voice and the checked answer. */

import { useCallback, useEffect, useState } from "react";

import type { Key } from "@/lib/i18n";

import { useLang } from "../LangProvider";
import { AnswerPanel } from "./AnswerPanel";
import { ChatForm } from "./ChatForm";
import { type Choices, useAsk } from "./useAsk";
import { useVoice } from "./useVoice";

export { CHAT_CLIENT_TIMEOUT_MS, type Choices, SLOW_AFTER_MS } from "./useAsk";

interface Props {
  /** Only choices from fixed lists. The server recomputes every figure from them. */
  choices: Choices;
  prefill?: string;
  /** Opens the room photo picker (camera button). */
  onCamera?: () => void;
}

const SUGGESTIONS: Key[] = ["chat.q1", "chat.q2", "chat.q3", "chat.q4"];

/** Suggested questions as one-tap buttons. */
function Suggestions({
  label,
  questions,
  onPick,
}: {
  label: string;
  questions: string[];
  onPick: (q: string) => void;
}) {
  return (
    <div className="suggest" role="group" aria-label={label}>
      {questions.map((text) => (
        <button key={text} type="button" onClick={() => onPick(text)}>
          {text}
        </button>
      ))}
    </div>
  );
}

/** The opt-in switch for reading answers aloud. */
function ReadAloudToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <label className="check readaloud">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

/** Ask-anything card: suggested questions, a question box with voice, and a verified answer. */
export function Chat({ choices, prefill = "", onCamera }: Props) {
  const { lang, t } = useLang();
  const [q, setQ] = useState("");
  const voice = useVoice(lang, setQ);
  const { speakIfEnabled, clearVoiceMsg } = voice;
  const { ask, answer, note, busy, slow, error } = useAsk(choices, t, speakIfEnabled);

  useEffect(() => {
    if (prefill) setQ(prefill);
  }, [prefill]);

  const send = useCallback(
    (question: string) => {
      clearVoiceMsg();
      void ask(question);
    },
    [ask, clearVoiceMsg],
  );

  const noteText = note ? (typeof note === "string" ? t(note) : t(note.key, note.vars)) : "";
  return (
    <div className="panel chat">
      <Suggestions
        label={t("chat.suggested")}
        questions={SUGGESTIONS.map((k) => t(k))}
        onPick={(text) => {
          setQ(text);
          send(text);
        }}
      />
      <ChatForm
        lang={lang}
        t={t}
        value={q}
        onChange={setQ}
        onSubmit={() => send(q)}
        busy={busy}
        onCamera={onCamera}
        mic={{ supported: voice.micSupported, listening: voice.listening, onToggle: voice.toggleMic }}
      />
      <p className="voicemsg" role="status" aria-live="polite">
        {voice.listening ? t("voice.listening") : voice.voiceMsg ? t(voice.voiceMsg) : ""}
      </p>
      {voice.speakSupported && (
        <ReadAloudToggle label={t("voice.read")} checked={voice.readAloud} onChange={voice.setReadAloud} />
      )}
      <AnswerPanel
        lang={lang}
        busy={busy}
        slow={slow}
        error={error}
        answer={answer}
        footnote={`${noteText}. ${t("chat.disclaimer")}`}
        labels={{ thinking: t("chat.thinking"), slow: t("chat.slow"), empty: t("chat.empty") }}
      />
    </div>
  );
}
