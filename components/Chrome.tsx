/** The top bar: navigation, the language switch and the live-air badge. */
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import type { Key } from "@/lib/i18n";
import { BRAND } from "@/lib/palette";

import { useLang } from "./LangProvider";

/** The decorative sky and sun behind the page. Its thickness follows the --haze custom property. */
export function Sky() {
  return (
    <div className="sky" aria-hidden="true">
      <div className="sun" />
      <div className="blob a" />
      <div className="blob b" />
      <div className="blob c" />
      <div className="grain" />
    </div>
  );
}

function Brand() {
  return (
    <Link href="/" className="brand" aria-label="AirWise">
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="14" fill={BRAND.ink} />
        <path
          d="M7 14c3-3 5 3 9 0s5-3 9 0M7 20c3-3 5 3 9 0s5-3 9 0"
          stroke={BRAND.mark}
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      AirWise
    </Link>
  );
}

/** The pages in the top bar, in order. The label is a translation key. */
export const NAV: { href: string; key: Key }[] = [
  { href: "/", key: "nav.plan" },
  { href: "/community", key: "nav.community" },
  { href: "/map", key: "nav.map" },
  { href: "/guide", key: "nav.guide" },
];

/** English and Hindi. The Hindi button carries lang="hi" so a screen reader pronounces it correctly. */
function LangToggle() {
  const { lang, setLang, t } = useLang();
  return (
    <div className="langtoggle" role="group" aria-label={`${t("lang.label")} / Language`}>
      <button
        type="button"
        aria-pressed={lang === "en"}
        aria-label="English"
        lang="en"
        onClick={() => setLang("en")}
      >
        {t("lang.en")}
      </button>
      <button
        type="button"
        aria-pressed={lang === "hi"}
        aria-label="हिन्दी"
        lang="hi"
        onClick={() => setLang("hi")}
      >
        {t("lang.hi")}
      </button>
    </div>
  );
}

/**
 * One nav landmark. On a phone it becomes a bottom bar (thumb reach); on desktop it sits in the header.
 * The current page is announced with aria-current.
 */
export function Header({ children }: Readonly<{ children?: ReactNode }>) {
  const path = usePathname();
  const { t } = useLang();
  return (
    <header className="top">
      <Brand />
      <div className="toprow">
        {children}
        <LangToggle />
      </div>
      <nav aria-label={t("nav.main")} className="nav">
        {NAV.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="navlink"
            aria-current={path === l.href ? "page" : undefined}
          >
            {t(l.key)}
          </Link>
        ))}
      </nav>
    </header>
  );
}
