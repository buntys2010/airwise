"use client";
import { useMemo, useState } from "react";

import { Header } from "@/components/Chrome";
import { CityPicker } from "@/components/CityPicker";
import { useLang } from "@/components/LangProvider";
import { type Airwise, useAirwise } from "@/components/useAirwise";
import { runInBackground } from "@/lib/background";
import { type Cooking, fmtHour, type Home } from "@/lib/engine";
import { ACTION_HI, CATEGORY_KEY, englishIn, type Key } from "@/lib/i18n";
import { type CommunityPlan, communityPlan } from "@/lib/plan";

const HOME_OPTIONS: { v: Home; en: string; hi: string }[] = [
  { v: "leaky", en: "Older, gappy windows", hi: "पुराने, दरार वाली खिड़कियाँ" },
  { v: "typical", en: "Typical flats", hi: "आम फ़्लैट" },
  { v: "sealed", en: "Sealed, AC on", hi: "बंद, AC चालू" },
];
const COOK_OPTIONS: { v: Cooking; en: string; hi: string }[] = [
  { v: "lpg", en: "Gas (LPG)", hi: "गैस (LPG)" },
  { v: "wood", en: "Wood or coal", hi: "लकड़ी या कोयला" },
  { v: "induction", en: "Induction", hi: "इंडक्शन" },
];

interface OptionGroupProps<V extends string> {
  legend: string;
  fieldName: string;
  options: { v: V; en: string; hi: string }[];
  current: V;
  onChange: (value: V) => void;
}

/** A radio group whose labels follow the page language. */
function OptionGroup<V extends string>({
  legend,
  fieldName,
  options,
  current,
  onChange,
}: Readonly<OptionGroupProps<V>>) {
  const { lang } = useLang();
  return (
    <fieldset>
      <legend>{legend}</legend>
      <div className="opts">
        {options.map((option) => (
          <label key={option.v} className="opt">
            <input
              type="radio"
              name={fieldName}
              value={option.v}
              checked={current === option.v}
              onChange={() => onChange(option.v)}
            />
            <span>{lang === "hi" ? option.hi : option.en}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** The inputs that shape the notice: a name, the city, the kind of home and how people cook. */
function ProfileForm({
  name,
  setName,
  airwise,
}: Readonly<{ name: string; setName: (value: string) => void; airwise: Airwise }>) {
  const { t } = useLang();
  return (
    <div className="panel profile">
      <div>
        <label htmlFor="cname" className="qhead">
          {t("comm.name")}
        </label>
        <input
          id="cname"
          className="textfield"
          type="text"
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
        />
        <p className="dim">{t("comm.nameHint")}</p>
      </div>
      <div>
        <span className="qhead" aria-hidden="true">
          {t("strip.city")}
        </span>
        <CityPicker value={airwise.cityId} onChange={airwise.setCityId} />
      </div>
      <OptionGroup
        legend={t("comm.home")}
        fieldName="chome"
        options={HOME_OPTIONS}
        current={airwise.profile.home}
        onChange={(home) => airwise.setProfile({ ...airwise.profile, home })}
      />
      <OptionGroup
        legend={t("comm.cook")}
        fieldName="ccook"
        options={COOK_OPTIONS}
        current={airwise.profile.cooking}
        onChange={(cooking) => airwise.setProfile({ ...airwise.profile, cooking })}
      />
    </div>
  );
}

/** The printable notice itself, with the buttons to print or share it. */
function NoticeSection({
  title,
  level,
  plan,
  cityName,
  message,
  onShare,
}: Readonly<{
  title: string;
  level: string;
  plan: CommunityPlan;
  cityName: string;
  message: string;
  onShare: () => void;
}>) {
  const { lang, t } = useLang();
  return (
    <section id="notice-sec" aria-labelledby="h-notice">
      <article id="community-plan" className="notice">
        <h2 id="h-notice">{title}</h2>
        <p className="u-notice-line">
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
      <div className="toolrow noprint u-mt-16">
        <button type="button" className="btn" onClick={() => window.print()}>
          {t("comm.print")}
        </button>
        <button type="button" className="btn ghost" onClick={onShare}>
          {t("comm.share")}
        </button>
      </div>
      <p className="statusline noprint" role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}

/**
 * One printable page for a building, school or workplace. Every figure comes from the engine and
 * live air; the link shares choices only.
 */
export default function CommunityPage() {
  const { lang, t } = useLang();
  const airwise = useAirwise(lang);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const plan = useMemo(
    () => communityPlan(airwise.hourly, airwise.profile, airwise.nowHour),
    [airwise.hourly, airwise.profile, airwise.nowHour],
  );
  const level = t(CATEGORY_KEY[plan.tone]);
  const title = name.trim()
    ? t("comm.title", { name: name.trim() })
    : t("comm.titleCity", { city: airwise.city.name });

  async function share() {
    const params = new URLSearchParams({
      city: airwise.cityId,
      home: airwise.profile.home,
      cooking: airwise.profile.cooking,
    });
    const url = `${window.location.origin}/community?${params.toString()}`;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, url });
        return;
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setMsg(t("comm.copied"));
    } catch {
      setMsg(url);
    } // clipboard blocked: show the link
  }

  return (
    <div className="wrap">
      <Header />
      <main id="main">
        <section className="severity noprint" aria-labelledby="h1">
          <h1 id="h1">{t("comm.h")}</h1>
          <p className="lede">{t("comm.sub")}</p>
        </section>

        <section className="noprint">
          <ProfileForm name={name} setName={setName} airwise={airwise} />
        </section>

        <NoticeSection
          title={title}
          level={level}
          plan={plan}
          cityName={airwise.city.name}
          message={msg}
          onShare={() => runInBackground(share())}
        />
      </main>
    </div>
  );
}
