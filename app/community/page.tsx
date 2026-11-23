"use client";
import { useMemo, useState } from "react";
import { CityPicker } from "@/components/CityPicker";
import { Header } from "@/components/Chrome";
import { useLang } from "@/components/LangProvider";
import { useAirwise } from "@/components/useAirwise";
import { fmtHour, type Cooking, type Home } from "@/lib/engine";
import { ACTION_HI, CATEGORY_KEY, englishIn, type Key } from "@/lib/i18n";
import { communityPlan } from "@/lib/plan";
import { runInBackground } from "@/lib/background";

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

/** One printable page for a building, school or workplace. Every figure comes from the engine and live air; the link shares choices only. */
export default function CommunityPage() {
  const { lang, t } = useLang();
  const a = useAirwise(lang);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const plan = useMemo(
    () => communityPlan(a.hourly, a.profile, a.nowHour),
    [a.hourly, a.profile, a.nowHour],
  );
  const level = t(CATEGORY_KEY[plan.tone]);
  const title = name.trim()
    ? t("comm.title", { name: name.trim() })
    : t("comm.titleCity", { city: a.city.name });

  async function share() {
    const q = new URLSearchParams({
      city: a.cityId,
      home: a.profile.home,
      cooking: a.profile.cooking,
    });
    const url = `${window.location.origin}/community?${q.toString()}`;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, url });
        return;
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
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
              <CityPicker value={a.cityId} onChange={a.setCityId} />
            </div>
            <fieldset>
              <legend>{t("comm.home")}</legend>
              <div className="opts">
                {HOME_OPTIONS.map((o) => (
                  <label key={o.v} className="opt">
                    <input
                      type="radio"
                      name="chome"
                      value={o.v}
                      checked={a.profile.home === o.v}
                      onChange={() => a.setProfile({ ...a.profile, home: o.v })}
                    />
                    <span>{lang === "hi" ? o.hi : o.en}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>{t("comm.cook")}</legend>
              <div className="opts">
                {COOK_OPTIONS.map((o) => (
                  <label key={o.v} className="opt">
                    <input
                      type="radio"
                      name="ccook"
                      value={o.v}
                      checked={a.profile.cooking === o.v}
                      onChange={() => a.setProfile({ ...a.profile, cooking: o.v })}
                    />
                    <span>{lang === "hi" ? o.hi : o.en}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </section>

        <section id="notice-sec" aria-labelledby="h-notice">
          <article id="community-plan" className="notice">
            <h2 id="h-notice">{title}</h2>
            <p className="u-notice-line">
              <strong>{t("comm.now", { city: a.city.name, level, pm: plan.nowPm })}</strong>
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
            <button type="button" className="btn ghost" onClick={() => runInBackground(share())}>
              {t("comm.share")}
            </button>
          </div>
          <p className="statusline noprint" role="status" aria-live="polite">
            {msg}
          </p>
        </section>
      </main>
    </div>
  );
}
