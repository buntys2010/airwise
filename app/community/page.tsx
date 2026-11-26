"use client";
/** The community page: a printable notice for a building, school or workplace. */

import { useMemo, useState } from "react";

import { Header } from "@/components/Chrome";
import { useLang } from "@/components/LangProvider";
import { CityPicker } from "@/components/map/CityPicker";
import { useAirwise } from "@/components/useAirwise";
import { CATEGORY_KEY } from "@/lib/i18n";
import { communityPlan } from "@/lib/plan";
import { shareOrCopy } from "@/lib/sharing";

import { HouseholdFields, NameField, Notice, NoticeActions } from "./parts";

/** One printable page for a building, school or workplace. Every figure comes from the engine and live air; the link shares choices only. */
export default function CommunityPage() {
  const { lang, t } = useLang();
  const a = useAirwise(lang);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const plan = useMemo(() => communityPlan(a.hourly, a.profile, a.nowHour), [a.hourly, a.profile, a.nowHour]);
  const level = t(CATEGORY_KEY[plan.tone]);
  const title = name.trim()
    ? t("comm.title", { name: name.trim() })
    : t("comm.titleCity", { city: a.city.name });

  async function share() {
    const q = new URLSearchParams({ city: a.cityId, home: a.profile.home, cooking: a.profile.cooking });
    const url = `${window.location.origin}/community?${q.toString()}`;
    const result = await shareOrCopy(title, url);
    if (result === "copied") setMsg(t("comm.copied"));
    if (result === "manual") setMsg(url); // clipboard blocked: show the link
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
            <NameField label={t("comm.name")} hint={t("comm.nameHint")} value={name} onChange={setName} />
            <div>
              <span className="qhead" aria-hidden="true">
                {t("strip.city")}
              </span>
              <CityPicker value={a.cityId} onChange={a.setCityId} />
            </div>
            <HouseholdFields lang={lang} t={t} profile={a.profile} onChange={a.setProfile} />
          </div>
        </section>

        <section id="notice-sec" aria-labelledby="h-notice">
          <Notice title={title} cityName={a.city.name} level={level} plan={plan} lang={lang} t={t} />
          <NoticeActions
            printLabel={t("comm.print")}
            shareLabel={t("comm.share")}
            onShare={() => void share()}
          />
          <p className="statusline noprint" role="status" aria-live="polite">
            {msg}
          </p>
        </section>
      </main>
    </div>
  );
}
