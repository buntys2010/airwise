"use client";
import { useCallback, useState } from "react";

import type { ActiveTab } from "../BottomDock";

/** Which stage of the home page is showing. Switching also brings the stage into view; the hero above is tall, so without this a tap seems to do nothing. */
export function useTabs(initial: ActiveTab = "room") {
  const [tab, setTabRaw] = useState<ActiveTab>(initial);
  const setTab = useCallback((next: ActiveTab) => {
    setTabRaw(next);
    requestAnimationFrame(() => {
      const target = document.getElementById(next === "room" ? "main" : `stage-${next}`);
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target?.scrollIntoView?.({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
  }, []);
  return { tab, setTab };
}
