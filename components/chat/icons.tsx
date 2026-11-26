/** Line icons for the chat buttons. Decorative: the buttons carry their own accessible names. */

const STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 2 } as const;

/** Camera outline for the photo button. */
export function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" strokeLinejoin="round" {...STROKE} />
      <circle cx="12" cy="13" r="3.3" {...STROKE} />
    </svg>
  );
}

/** Microphone outline for the voice button. */
export function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" {...STROKE} />
      <path d="M5 11a7 7 0 0014 0M12 18v3" strokeLinecap="round" {...STROKE} />
    </svg>
  );
}
