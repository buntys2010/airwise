/** The community page: today's rules for a school, society or workplace, from the same engine. */
"use client";
import { useMemo, useState } from "react";

import { Header } from "@/components/Chrome";
import { useLang } from "@/components/LangProvider";
import { useAirwise } from "@/components/useAirwise";
import { runInBackground } from "@/lib/background";
import { CATEGORY_KEY } from "@/lib/i18n";
import { communityPlan } from "@/lib/plan";

import { NoticeSection, ProfileForm } from "./parts";

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
    () => communityPlan(airwise.hourly, airwise.profile, airwise.nowHour, lang),
    [airwise.hourly, airwise.profile, airwise.nowHour, lang],
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
      if (error instanceof Error && error.name === "AbortError") return;
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
