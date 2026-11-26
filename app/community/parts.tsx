/** Pieces of the community page: option groups, the printable notice and its actions. */

import type { Lang } from "@/lib/chat";
import { type Cooking, fmtHour, type Home, type Profile } from "@/lib/engine";
import { ACTION_HI, englishIn, type Key } from "@/lib/i18n";
import type { communityPlan } from "@/lib/plan";

export interface RadioOption<V extends string> {
  v: V;
  en: string;
  hi: string;
}

interface RadioFieldsetProps<V extends string> {
  legend: string;
  name: string;
  lang: Lang;
  options: RadioOption<V>[];
  value: V;
  onChange: (value: V) => void;
}

/** A labelled group of radio buttons whose labels come in English and Hindi. */
export function RadioFieldset<V extends string>({
  legend,
  name,
  lang,
  options,
  value,
  onChange,
}: RadioFieldsetProps<V>) {
  return (
    <fieldset>
      <legend>{legend}</legend>
      <div className="opts">
        {options.map((o) => (
          <label key={o.v} className="opt">
            <input
              type="radio"
              name={name}
              value={o.v}
              checked={value === o.v}
              onChange={() => onChange(o.v)}
            />
            <span>{lang === "hi" ? o.hi : o.en}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface NoticeProps {
  title: string;
  cityName: string;
  level: string;
  plan: ReturnType<typeof communityPlan>;
  lang: Lang;
  t: (key: Key, vars?: Record<string, string | number>) => string;
}

/** The printable notice: today's level, the best hour, the fixes that help most and the rules a building can adopt. */
export function Notice({ title, cityName, level, plan, lang, t }: NoticeProps) {
  return (
    <article id="community-plan" className="notice">
      <h2 id="h-notice">{title}</h2>
      <p className="notice-now">
        <strong>{t("comm.now", { city: cityName, level, pm: plan.nowPm })}</strong>
      </p>
      <p>{t("comm.best", { hour: fmtHour(plan.bestHour), pm: plan.bestPm })}</p>

      <h3>{t("comm.homes")}</h3>
      <ol>
        {plan.fixes.map((f) => {
          const hi = lang === "hi" ? ACTION_HI[f.id] : undefined;
          return (
            <li key={f.id} {...(hi ? { lang: "hi" } : englishIn(lang))}>
              {t("comm.fix", { title: hi ? hi.title : f.title, pct: f.pct })}
            </li>
          );
        })}
      </ol>

      <h3>{t("comm.together")}</h3>
      <ul>
        {plan.rules.map((r) => (
          <li key={r}>{t(r as Key, { hour: fmtHour(plan.bestHour) })}</li>
        ))}
      </ul>
      <p className="fine">{t("comm.foot")}</p>
    </article>
  );
}

const MAX_NAME_LENGTH = 60;

/** Optional name of the building, school or workplace, shown as the notice title. */
export function NameField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor="cname" className="qhead">
        {label}
      </label>
      <input
        id="cname"
        className="textfield"
        type="text"
        maxLength={MAX_NAME_LENGTH}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
      <p className="dim">{hint}</p>
    </div>
  );
}

/** Print and share buttons under the notice. */
export function NoticeActions({
  printLabel,
  shareLabel,
  onShare,
}: {
  printLabel: string;
  shareLabel: string;
  onShare: () => void;
}) {
  return (
    <div className="toolrow noprint mt-16">
      <button type="button" className="btn" onClick={() => window.print()}>
        {printLabel}
      </button>
      <button type="button" className="btn ghost" onClick={onShare}>
        {shareLabel}
      </button>
    </div>
  );
}

const HOME_OPTIONS: RadioOption<Home>[] = [
  { v: "leaky", en: "Older, gappy windows", hi: "पुराने, दरार वाली खिड़कियाँ" },
  { v: "typical", en: "Typical flats", hi: "आम फ़्लैट" },
  { v: "sealed", en: "Sealed, AC on", hi: "बंद, AC चालू" },
];
const COOK_OPTIONS: RadioOption<Cooking>[] = [
  { v: "lpg", en: "Gas (LPG)", hi: "गैस (LPG)" },
  { v: "wood", en: "Wood or coal", hi: "लकड़ी या कोयला" },
  { v: "induction", en: "Induction", hi: "इंडक्शन" },
];

/** The two household questions the notice depends on: window type and cooking fuel. */
export function HouseholdFields({
  lang,
  t,
  profile,
  onChange,
}: {
  lang: Lang;
  t: (key: Key) => string;
  profile: Profile;
  onChange: (p: Profile) => void;
}) {
  return (
    <>
      <RadioFieldset
        legend={t("comm.home")}
        name="chome"
        lang={lang}
        options={HOME_OPTIONS}
        value={profile.home}
        onChange={(home) => onChange({ ...profile, home })}
      />
      <RadioFieldset
        legend={t("comm.cook")}
        name="ccook"
        lang={lang}
        options={COOK_OPTIONS}
        value={profile.cooking}
        onChange={(cooking) => onChange({ ...profile, cooking })}
      />
    </>
  );
}
