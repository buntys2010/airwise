import type { Lang } from "@/lib/chat";

interface Props {
  lang: Lang;
  busy: boolean;
  slow: boolean;
  error: string;
  answer: string;
  /** How the answer was checked, already translated, plus the standing disclaimer. */
  footnote: string;
  labels: { thinking: string; slow: string; empty: string };
}

/** The answer area: progress while working, an alert on failure, the checked answer, or a prompt to ask. */
export function AnswerPanel({ lang, busy, slow, error, answer, footnote, labels }: Props) {
  return (
    <div className="answer" aria-live="polite" aria-busy={busy} lang={answer ? lang : undefined}>
      {busy && (
        <div className="working">
          <div className="progress" role="progressbar" aria-label={labels.thinking}>
            <i />
          </div>
          {slow && <p>{labels.slow}</p>}
        </div>
      )}
      {!busy && error && <p role="alert">{error}</p>}
      {!busy && !error && answer && (
        <>
          <p>{answer}</p>
          <p className="dim answernote">{footnote}</p>
        </>
      )}
      {!busy && !error && !answer && <p className="dim">{labels.empty}</p>}
    </div>
  );
}
