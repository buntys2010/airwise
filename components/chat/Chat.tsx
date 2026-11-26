/** The chat panel: asks a question with the household's choices and shows the checked answer. */
"use client";
import { useCallback, useEffect, useState } from "react";

import { runInBackground } from "@/lib/background";
import type { Key } from "@/lib/i18n";

import { useLang } from "../LangProvider";
import { useVoice } from "../useVoice";
import { AnswerBody } from "./AnswerBody";
import type { Choices } from "./api";
import { CameraIcon, MicIcon } from "./icons";
import { useAsk } from "./useAsk";

interface Props {
  /** Only choices from fixed lists. The server recomputes every figure from them. */
  choices: Choices;
  prefill?: string;
  /** Opens the room photo picker (camera button). */
  onCamera?: () => void;
}

const SUGGESTIONS: Key[] = ["chat.q1", "chat.q2", "chat.q3", "chat.q4"];

/** The question box: suggested questions, text or voice input, and the answer with its grounding note. */
export function Chat({ choices, prefill = "", onCamera }: Readonly<Props>) {
  const { lang, t } = useLang();
  const [q, setQ] = useState("");

  // The transcript lands in the box for the user to check and send.
  const onTranscript = useCallback((text: string) => setQ(text), []);
  const voice = useVoice(lang, onTranscript);
  const { answer, note, busy, slow, error, ask } = useAsk(choices, {
    t,
    onAnswer: voice.readOut,
    onStart: voice.clearMessage,
  });

  useEffect(() => {
    if (prefill) setQ(prefill);
  }, [prefill]);

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
