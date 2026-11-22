"use client";
import { useEffect, useState } from "react";
import { buildReminderIcs } from "@/lib/calendar";
import { NO_PLAN } from "@/lib/engine";
import { shareUrl, whatsappLink } from "@/lib/share";
import { useLang } from "./LangProvider";
import type { Airwise } from "./useAirwise";

/**
 * Keep this plan: a link that carries choices only, a calendar reminder built on this device, and the device-only save with a Clear control.
 * Nothing here sends anything anywhere.
 */
export function PlanTools({ a }: Readonly<{ a: Airwise }>) {
  const { t } = useLang();
  const [msg, setMsg] = useState("");
  const [manual, setManual] = useState("");
  const [remindUrl, setRemindUrl] = useState("");
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function copyLink() {
    const url = shareUrl(window.location.origin, {
      city: a.cityId,
      profile: a.profile,
      plan: a.plan,
    });
    setManual("");
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: t("tools.linkShareTitle"), url });
        setMsg("");
        return;
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return; /* fall through to copy */
    }
    try {
      await navigator.clipboard.writeText(url);
      setMsg(t("tools.linkDone"));
    } catch {
      setMsg("");
      setManual(url);
    } // clipboard blocked: show the link so it can be copied by hand
  }

  function remind() {
    const url = shareUrl(window.location.origin, {
      city: a.cityId,
      profile: a.profile,
      plan: NO_PLAN,
    });
    const ics = buildReminderIcs({ url });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = "airwise-morning-reminder.ics";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(href), 10_000);
    setRemindUrl(url); // always shown, so the reminder can be added by hand if the file does not open
  }

  // One-tap WhatsApp share. The message is words plus the choices-only link: never a number.
  // The origin is read after mount so the server HTML and the first client render match; the link then becomes absolute.
  const whatsapp = whatsappLink(
    t("tools.shareText", { city: a.city.name }),
    shareUrl(origin, { city: a.cityId, profile: a.profile, plan: a.plan }),
  );

  const savedKeys = { saved: "tools.saved", blocked: "tools.notSaved" } as const;
  const savedText = t(
    a.storeState === "saved" || a.storeState === "blocked"
      ? savedKeys[a.storeState]
      : "tools.notYet",
  );
  return (
    <div className="plantools">
      <h2 className="chat-h">{t("tools.h")}</h2>
      <div className="toolrow">
        <button type="button" className="btn ghost" onClick={() => void copyLink()}>
          {t("tools.link")}
        </button>
        <button type="button" className="btn ghost" onClick={remind}>
          {t("tools.remind")}
        </button>
        <a className="btn ghost" href={whatsapp} target="_blank" rel="noopener noreferrer">
          {t("tools.whatsapp")}
          <span className="sr-only"> ({t("tools.newTab")})</span>
        </a>
      </div>
      <p className="statusline" role="status" aria-live="polite">
        {msg}
      </p>
      {manual && (
        <p className="manuallink">
          <label htmlFor="manual-link">{t("tools.linkManual")}</label>{" "}
          <input
            id="manual-link"
            type="text"
            readOnly
            value={manual}
            onFocus={(e) => e.currentTarget.select()}
          />
        </p>
      )}
      {remindUrl && <p className="disclose">{t("tools.remindHelp", { url: remindUrl })}</p>}
      <p className="savedline">
        <span role="status">{savedText}</span>
        {a.storeState === "saved" && (
          <>
            {" "}
            <button
              type="button"
              className="textbtn"
              onClick={() => {
                a.forget();
                setMsg(t("tools.cleared"));
              }}
            >
              {t("tools.clear")}
            </button>
          </>
        )}
      </p>
    </div>
  );
}
