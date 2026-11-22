"use client";
import { useLang } from "./LangProvider";

export type ActiveTab = "room" | "plan" | "copilot" | "share";

interface Props {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

const TABS: { id: ActiveTab; icon: string; key: "dock.room" | "dock.plan" | "dock.copilot" | "dock.share" }[] = [
  { id: "room", icon: "🛋️", key: "dock.room" },
  { id: "plan", icon: "📅", key: "dock.plan" },
  { id: "copilot", icon: "💬", key: "dock.copilot" },
  { id: "share", icon: "📤", key: "dock.share" },
];

/** The four stages of the home screen, as a floating bar that stays within thumb reach. */
export function BottomDock({ activeTab, onTabChange }: Props) {
  const { t } = useLang();
  return (
    <nav className="dock" aria-label={t("dock.label")}>
      {TABS.map((tab) => (
        <button key={tab.id} type="button" className="dockbtn" aria-pressed={activeTab === tab.id} onClick={() => onTabChange(tab.id)}>
          <span aria-hidden="true">{tab.icon}</span>
          <span>{t(tab.key)}</span>
        </button>
      ))}
    </nav>
  );
}
