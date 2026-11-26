/** What sits in the chat's answer box. */
"use client";
import { useLang } from "../LangProvider";

interface AnswerBodyProps {
  busy: boolean;
  slow: boolean;
  error: string;
  answer: string;
  noteText: string;
}

/** What sits in the answer box: progress, an error, the answer with its check note, or the empty prompt. */
export function AnswerBody({ busy, slow, error, answer, noteText }: Readonly<AnswerBodyProps>) {
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
