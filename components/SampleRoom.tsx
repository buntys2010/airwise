/**
 * The sample room: a flat illustration of an older Indian flat with the three things AirWise points out.
 * A gap around the window, a gas stove, and an empty corner where a purifier would stand.
 * It is a drawing, labelled as a sample, so the experience works with no photo and no key.
 */
export function SampleRoom({ label }: { label: string }) {
  return (
    <svg className="roomsvg" viewBox="0 0 400 300" role="img" aria-label={label}>
      <rect className="rm-wall" x="0" y="0" width="400" height="214" />
      <rect className="rm-floor" x="0" y="214" width="400" height="86" />
      <line className="rm-line" x1="0" y1="214" x2="400" y2="214" />
      {/* window with a visible gap along its sill */}
      <rect className="rm-glass" x="44" y="72" width="128" height="124" rx="4" />
      <rect className="rm-frame" x="44" y="72" width="128" height="124" rx="4" />
      <line className="rm-line" x1="108" y1="72" x2="108" y2="196" />
      <line className="rm-line" x1="44" y1="134" x2="172" y2="134" />
      <rect className="rm-gap" x="44" y="196" width="128" height="9" />
      <path className="rm-draft" d="M58 214c6-8 6-14 0-22M88 214c6-8 6-14 0-22M118 214c6-8 6-14 0-22M148 214c6-8 6-14 0-22" />
      {/* counter and gas stove */}
      <rect className="rm-counter" x="262" y="152" width="112" height="62" rx="3" />
      <rect className="rm-stovetop" x="272" y="146" width="92" height="10" rx="2" />
      <circle className="rm-burner" cx="296" cy="146" r="9" /><circle className="rm-burner" cx="340" cy="146" r="9" />
      <path className="rm-flame" d="M290 138c-4-7 2-9 0-15 6 3 9 9 6 15zM334 138c-4-7 2-9 0-15 6 3 9 9 6 15z" />
      <rect className="rm-pot" x="326" y="112" width="28" height="22" rx="3" />
      {/* empty corner for a purifier */}
      <rect className="rm-spot" x="176" y="150" width="64" height="104" rx="6" />
      <text className="rm-q" x="208" y="212" textAnchor="middle">?</text>
      <ellipse className="rm-rug" cx="208" cy="268" rx="120" ry="14" />
    </svg>
  );
}
