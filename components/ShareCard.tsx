"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { shareUrl, encodeChoices, whatsappLink } from "@/lib/share";
import { useLang } from "./LangProvider";
import type { Airwise } from "./useAirwise";

/**
 * The share card is a real picture, rendered on the server from CHOICES only (the same query a share link carries), so every number on it
 * is recomputed from live air data. On a phone the picture goes straight into WhatsApp; elsewhere the link is shared and its preview shows the card.
 */
export function ShareCard({ a }: { a: Airwise }) {
  const { t } = useLang();
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const q = encodeChoices({ city: a.cityId, profile: a.profile, plan: a.plan });
  const imageUrl = `/api/share-image?${q}&size=card`;
  const say = (m: string) => { setToast(m); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setToast(""), 3000); };

  const text = t("tools.shareText", { city: a.city.name });
  const alt = t("share.alt", { city: a.city.name, base: a.base.cigs.toFixed(1), plan: a.withPlan.cigs.toFixed(1) });

  async function shareWhatsApp() {
    if (busy) return;
    setBusy(true); say(t("share.preparing"));
    const link = shareUrl(window.location.origin, { city: a.cityId, profile: a.profile, plan: a.plan });
    try {
      const res = await fetch(imageUrl);
      if (res.ok) {
        const file = new File([await res.blob()], "airwise-plan.png", { type: "image/png" });
        if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], text: `${text} ${link}`, title: t("share.title") });
          setToast("");
          return;
        }
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") { setToast(""); return; }
    } finally { setBusy(false); }
    // No file sharing here (most desktops): open WhatsApp with the text and the link, whose preview is this card.
    window.open(whatsappLink(text, link), "_blank", "noopener,noreferrer");
    say(t("share.opened"));
  }

  return (
    <div className="sharecard">
      <h2 className="chat-h" style={{ marginTop: 0 }}>{t("share.cardH")}</h2>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="sharepic" src={imageUrl} alt={alt} width={1080} height={1350} loading="lazy" />
      <div className="sharebtns">
        <button type="button" className="btn wa" onClick={() => void shareWhatsApp()} disabled={busy}>{t("share.wa")}</button>
        <a className="btn ghost" href={imageUrl} download="airwise-plan.png">{t("share.download")}</a>
      </div>
      <p className="toast" role="status" aria-live="polite">{toast}</p>
      <p className="dim">{t("share.footer")}</p>
      <Link className="textlink" href="/community">{t("share.community")}</Link>
    </div>
  );
}
