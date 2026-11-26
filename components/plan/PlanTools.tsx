"use client";
/** Keep, share and remind: link, calendar reminder, WhatsApp and the device-only save. */

import { useState } from "react";

import { buildReminderIcs } from "@/lib/calendar";
import { NO_PLAN } from "@/lib/engine";
import type { Key } from "@/lib/i18n";
import { shareUrl, whatsappLink } from "@/lib/share";
import { downloadTextFile, shareOrCopy } from "@/lib/sharing";
import type { StoreState } from "@/lib/store";

import { useLang } from "../LangProvider";
import type { Airwise } from "../useAirwise";

const SAVED_TEXT_KEY: Record<StoreState, Key> = {
  saved: "tools.saved",
  blocked: "tools.notSaved",
  empty: "tools.notYet",
};

/** The link shown in a box when it could not be shared or copied automatically. */
function ManualLink({ url, label }: { url: string; label: string }) {
  return (
    <p className="manuallink">
      <label htmlFor="manual-link">{label}</label>{" "}
      <input id="manual-link" type="text" readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
    </p>
  );
}

/** Whether choices are saved on this device, with a control to forget them. */
function SavedLine({
  text,
  canClear,
  clearLabel,
  onClear,
}: {
  text: string;
  canClear: boolean;
  clearLabel: string;
  onClear: () => void;
}) {
  return (
    <p className="savedline">
      <span role="status">{text}</span>
      {canClear && (
        <>
          {" "}
          <button type="button" className="textbtn" onClick={onClear}>
            {clearLabel}
          </button>
        </>
      )}
    </p>
  );
}

/**
 * Keep this plan: a link that carries choices only, a calendar reminder built on this device, and the device-only save with a Clear control.
 * Nothing here sends anything anywhere.
 */
export function PlanTools({ a }: { a: Airwise }) {
  const { t } = useLang();
  const [msg, setMsg] = useState("");
  const [manual, setManual] = useState("");
  const [remindUrl, setRemindUrl] = useState("");

  async function copyLink() {
    const url = shareUrl(window.location.origin, { city: a.cityId, profile: a.profile, plan: a.plan });
    const result = await shareOrCopy(t("tools.linkShareTitle"), url);
    if (result === "cancelled") return;
    setManual(result === "manual" ? url : ""); // clipboard blocked: show the link so it can be copied by hand
    setMsg(result === "copied" ? t("tools.linkDone") : "");
  }

  function remind() {
    const url = shareUrl(window.location.origin, { city: a.cityId, profile: a.profile, plan: NO_PLAN });
    downloadTextFile(
      "airwise-morning-reminder.ics",
      buildReminderIcs({ url }),
      "text/calendar;charset=utf-8",
    );
    setRemindUrl(url); // always shown, so the reminder can be added by hand if the file does not open
  }

  // One-tap WhatsApp share. The message is words plus the choices-only link: never a number.
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const whatsapp = whatsappLink(
    t("tools.shareText", { city: a.city.name }),
    shareUrl(origin, { city: a.cityId, profile: a.profile, plan: a.plan }),
  );

  const savedText = t(SAVED_TEXT_KEY[a.storeState]);
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
      {manual && <ManualLink url={manual} label={t("tools.linkManual")} />}
      {remindUrl && <p className="disclose">{t("tools.remindHelp", { url: remindUrl })}</p>}
      <SavedLine
        text={savedText}
        canClear={a.storeState === "saved"}
        clearLabel={t("tools.clear")}
        onClear={() => {
          a.forget();
          setMsg(t("tools.cleared"));
        }}
      />
    </div>
  );
}
