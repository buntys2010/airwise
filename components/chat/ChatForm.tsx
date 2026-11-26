/** The chat question box with its camera, microphone and send buttons. */

import type { Lang } from "@/lib/chat";
import type { Key } from "@/lib/i18n";

import { CameraIcon, MicIcon } from "./icons";

interface Props {
  lang: Lang;
  t: (key: Key) => string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  busy: boolean;
  onCamera?: () => void;
  mic: { supported: boolean; listening: boolean; onToggle: () => void };
}

const MAX_QUESTION_LENGTH = 400;

/** The question box with its camera, microphone and send buttons. */
export function ChatForm({ lang, t, value, onChange, onSubmit, busy, onCamera, mic }: Props) {
  return (
    <form
      className="chatform"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor="q" className="sr-only">
        {t("chat.label")}
      </label>
      <input
        id="q"
        type="text"
        maxLength={MAX_QUESTION_LENGTH}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("chat.placeholder")}
        autoComplete="off"
        lang={lang}
      />
      <div className="chatactions">
        {onCamera && (
          <button type="button" className="iconbtn" onClick={onCamera} aria-label={t("chat.photo")}>
            <CameraIcon />
            <span aria-hidden="true">{t("chat.photoShort")}</span>
          </button>
        )}
        {mic.supported && (
          <button
            type="button"
            className={`iconbtn${mic.listening ? " on" : ""}`}
            onClick={mic.onToggle}
            aria-pressed={mic.listening}
            aria-label={mic.listening ? t("voice.stop") : t("voice.mic")}
          >
            <MicIcon />
            <span aria-hidden="true">{mic.listening ? t("voice.stopShort") : t("voice.micShort")}</span>
          </button>
        )}
        <button className="btn send" type="submit" disabled={busy}>
          {busy ? t("chat.thinking") : t("chat.send")}
        </button>
      </div>
    </form>
  );
}
