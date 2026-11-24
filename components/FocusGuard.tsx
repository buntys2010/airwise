"use client";
import { useEffect } from "react";

import { scrollNeeded } from "@/lib/focus";

/** Keeps a keyboard-focused control from being hidden under the fixed bottom bar on phones (the home dock, or the global nav on other pages). Renders nothing. */
export function FocusGuard() {
  useEffect(() => {
    function onFocus(e: FocusEvent) {
      const el = e.target as HTMLElement | null;
      const bar =
        document.querySelector<HTMLElement>("nav.dock") ?? document.querySelector<HTMLElement>("nav.nav");
      if (!el || !bar || bar.contains(el) || typeof el.getBoundingClientRect !== "function") return;
      if (getComputedStyle(bar).position !== "fixed") return; // on wide screens the nav is in the header
      const dy = scrollNeeded(el.getBoundingClientRect(), bar.getBoundingClientRect());
      if (dy > 0) window.scrollBy({ top: dy, behavior: "instant" });
    }
    document.addEventListener("focusin", onFocus);
    return () => document.removeEventListener("focusin", onFocus);
  }, []);
  return null;
}
