"use client";
import { useId, useRef } from "react";
import type { Key } from "@/lib/i18n";
import { QUESTIONS, type QuestionId } from "@/lib/room";
import { useLang } from "./LangProvider";
import type { Room } from "./useRoom";
import { runInBackground } from "@/lib/background";

/** The id of the file input, so other controls (the chat camera button) can open the same picker. */
export const PHOTO_INPUT_ID = "room-photo-input";

const QUESTION_KEY: Record<QuestionId, Key> = {
  window: "check.window",
  stove: "check.stove",
  purifier: "check.purifier",
};

/**
 * Photo input, the plain-language disclosure, and the questions.
 * A photo cannot show what is not there, so anything the photo did not show is asked, one tap each. Unanswered adds nothing to the plan.
 */
export function PhotoPicker({ room }: Readonly<{ room: Room }>) {
  const { t } = useLang();
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const showQuestions = room.phase === "photo" || room.phase === "checklist";
  let msg = "";
  if (room.message) {
    msg = "raw" in room.message ? room.message.raw : t(room.message.key, room.message.vars);
  }
  let photoLabel = t("room.photo");
  if (room.busy) photoLabel = t("room.reading");
  else if (room.photoUrl) photoLabel = t("room.otherPhoto");
  const sourceNote = { photo: t("check.photo"), none: t("check.open") } as const;
  return (
    <div className="photopicker">
      <div className="photorow">
        <button
          type="button"
          className="btn"
          disabled={room.busy}
          onClick={() => input.current?.click()}
        >
          {photoLabel}
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
            const file = e.target.files?.[0];
            if (file) runInBackground(room.pickFile(file));
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
          {QUESTIONS.map((q) => {
            const answer = room.questions[q];
            return (
              <fieldset key={q} className="question">
                <legend>{t(QUESTION_KEY[q])}</legend>
                <div className="yesno">
                  {([true, false] as const).map((v) => (
                    <label key={String(v)} className="opt">
                      <input
                        type="radio"
                        name={`${id}-${q}`}
                        checked={answer.value === v}
                        onChange={() => room.answer(q, v)}
                      />
                      <span>{t(v ? "check.yes" : "check.no")}</span>
                    </label>
                  ))}
                </div>
                <p className="qnote">
                  {answer.source === "photo" || answer.source === "none"
                    ? sourceNote[answer.source]
                    : ""}
                </p>
              </fieldset>
            );
          })}
        </div>
      )}
    </div>
  );
}
