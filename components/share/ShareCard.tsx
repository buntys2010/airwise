"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { encodeChoices, shareUrl, whatsappLink } from "@/lib/share";

import { useLang } from "../LangProvider";
import type { Airwise } from "../useAirwise";

const TOAST_MS = 3000;
/** The card picture's size, as the server draws it. */
const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;

/** A short message that clears itself. */
function useToast() {
  const [toast, setToast] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const say = (m: string) => {
    setToast(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), TOAST_MS);
  };
  return { toast, say, clear: () => setToast("") };
}

/** Shares the card picture as a file where the device can. "unsupported" tells the caller to fall back to a link. */
async function shareFile(
  imageUrl: string,
  text: string,
  title: string,
): Promise<"shared" | "cancelled" | "unsupported"> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return "unsupported";
    const file = new File([await res.blob()], "airwise-plan.png", { type: "image/png" });
    if (typeof navigator.canShare !== "function" || !navigator.canShare({ files: [file] }))
      return "unsupported";
    await navigator.share({ files: [file], text, title });
    return "shared";
  } catch (e) {
    return (e as Error).name === "AbortError" ? "cancelled" : "unsupported";
  }
}

/**
 * The share card is a real picture, rendered on the server from CHOICES only (the same query a share link carries), so every number on it
 * is recomputed from live air data. On a phone the picture goes straight into WhatsApp; elsewhere the link is shared and its preview shows the card.
 */
export function ShareCard({ a }: { a: Airwise }) {
  const { t } = useLang();
  const { toast, say, clear } = useToast();
  const [busy, setBusy] = useState(false);

  const q = encodeChoices({ city: a.cityId, profile: a.profile, plan: a.plan });
  const imageUrl = `/api/share-image?${q}&size=card`;

  const text = t("tools.shareText", { city: a.city.name });
  const alt = t("share.alt", {
    city: a.city.name,
    base: a.base.cigs.toFixed(1),
    plan: a.withPlan.cigs.toFixed(1),
  });

  async function shareWhatsApp() {
    if (busy) return;
    setBusy(true);
    say(t("share.preparing"));
    const link = shareUrl(window.location.origin, { city: a.cityId, profile: a.profile, plan: a.plan });
    const result = await shareFile(imageUrl, `${text} ${link}`, t("share.title")).finally(() =>
      setBusy(false),
    );
    if (result !== "unsupported") {
      clear();
      return;
    }
    // No file sharing here (most desktops): open WhatsApp with the text and the link, whose preview is this card.
    window.open(whatsappLink(text, link), "_blank", "noopener,noreferrer");
    say(t("share.opened"));
  }

  return (
    <div className="sharecard">
      <h2 className="chat-h mt-0">{t("share.cardH")}</h2>
      <img
        className="sharepic"
        src={imageUrl}
        alt={alt}
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        loading="lazy"
      />
      <div className="sharebtns">
        <button type="button" className="btn wa" onClick={() => void shareWhatsApp()} disabled={busy}>
          {t("share.wa")}
        </button>
        <a className="btn ghost" href={imageUrl} download="airwise-plan.png">
          {t("share.download")}
        </a>
      </div>
      <p className="toast" role="status" aria-live="polite">
        {toast}
      </p>
      <p className="dim">{t("share.footer")}</p>
      <Link className="textlink" href="/community">
        {t("share.community")}
      </Link>
    </div>
  );
}
