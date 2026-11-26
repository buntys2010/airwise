"use client";
import { useId, useRef } from "react";

import type { Key } from "@/lib/i18n";
import { type QuestionId, QUESTIONS } from "@/lib/room";

import { useLang } from "../LangProvider";
import type { Room } from "./useRoom";

/** The id of the file input, so other controls (the chat camera button) can open the same picker. */
export const PHOTO_INPUT_ID = "room-photo-input";

const QUESTION_KEY: Record<QuestionId, Key> = {
  window: "check.window",
  stove: "check.stove",
  purifier: "check.purifier",
};

type Translate = ReturnType<typeof useLang>["t"];

/** The status line as text: server text as is, or a translated key. */
function messageText(message: Room["message"], t: Translate): string {
  if (!message) return "";
  return "raw" in message ? message.raw : t(message.key, message.vars);
}

interface QuestionRowProps {
  q: QuestionId;
  state: Room["questions"][QuestionId];
  /** Shared radio-group name for this question. */
  name: string;
  t: Translate;
  onAnswer: (q: QuestionId, yes: boolean) => void;
}

/** One yes/no question, with a note on whether the photo already answered it. */
function QuestionRow({ q, state, name, t, onAnswer }: QuestionRowProps) {
  const note = { photo: t("check.photo"), none: t("check.open"), user: "" }[state.source];
  return (
    <fieldset className="question">
      <legend>{t(QUESTION_KEY[q])}</legend>
      <div className="yesno">
        {([true, false] as const).map((v) => (
          <label key={String(v)} className="opt">
            <input type="radio" name={name} checked={state.value === v} onChange={() => onAnswer(q, v)} />
            <span>{t(v ? "check.yes" : "check.no")}</span>
          </label>
        ))}
      </div>
      <p className="qnote">{note}</p>
    </fieldset>
  );
}

/**
 * Photo input, the plain-language disclosure, and the questions.
 * A photo cannot show what is not there, so anything the photo did not show is asked, one tap each. Unanswered adds nothing to the plan.
 */
export function PhotoPicker({ room }: { room: Room }) {
  const { t } = useLang();
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const showQuestions = room.phase === "photo" || room.phase === "checklist";
  const msg = messageText(room.message, t);
  return (
    <div className="photopicker">
      <div className="photorow">
        <button type="button" className="btn" disabled={room.busy} onClick={() => input.current?.click()}>
          {room.busy ? t("room.reading") : room.photoUrl ? t("room.otherPhoto") : t("room.photo")}
        </button>
        {room.phase !== "sample" && !room.busy && (
          <button type="button" className="btn ghost" onClick={room.useSample}>
            {t("room.back")}
          </button>
        )}
        <input
          ref={input}
          id={PHOTO_INPUT_ID}
          name={`${id}-file`}
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          tabIndex={-1}
          aria-label="Choose a photo of your room"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void room.pickFile(f);
            e.target.value = "";
          }}
        />
      </div>
      <p className="disclose">{t("room.disclose")}</p>
      <p className="statusline" role="status" aria-live="polite">
        {msg}
      </p>
      {showQuestions && (
        <div className="questions" role="group" aria-labelledby={`${id}-q`}>
          <p id={`${id}-q`} className="qhead">
            {t("check.legend")}
          </p>
          <p className="qintro">{t("check.intro")}</p>
          {QUESTIONS.map((q) => (
            <QuestionRow
              key={q}
              q={q}
              state={room.questions[q]}
              name={`${id}-${q}`}
              t={t}
              onAnswer={room.answer}
            />
          ))}
        </div>
      )}
    </div>
  );
}
