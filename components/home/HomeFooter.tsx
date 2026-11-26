import Link from "next/link";

import { englishIn } from "@/lib/i18n";

import { useLang } from "../LangProvider";

/** How the numbers are made, in plain words, and the standing disclaimer. */
export function HomeFooter() {
  const { lang, t } = useLang();
  return (
    <footer>
      <p {...englishIn(lang)}>
        <strong>How we calculate.</strong> Hourly PM2.5, temperature and wind come live from Open-Meteo for
        the city you pick. A small, tested model adds up the air you breathe at home, on your commute,
        outdoors and while cooking, hour by hour. The AI explains the result; it never invents the numbers.
        The cigarette comparison uses a rule of thumb of about 22 µg/m³ of PM2.5 per cigarette a day. Every
        factor is listed in the{" "}
        <Link className="textlink" href="/guide#how">
          guide
        </Link>{" "}
        and in docs/methodology.md.
      </p>
      <p className="mt-10">{t("foot.disclaimer")}</p>
    </footer>
  );
}
