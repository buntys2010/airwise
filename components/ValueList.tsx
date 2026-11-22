"use client";
import { priceRange, type RankedProduct } from "@/lib/room";
import { englishIn } from "@/lib/i18n";
import { useLang } from "./LangProvider";

/** The catalog ranked by how much of your exposure each rupee removes, for this household. Prices are indicative. */
export function ValueList({ products }: { products: RankedProduct[] }) {
  const { lang, t } = useLang();
  return (
    <div>
      <ol className="valuelist">
        {products.map((p, i) => (
          <li key={p.id}>
            <span className="fixnum" aria-hidden="true">{i + 1}</span>
            <div>
              <h3 {...englishIn(lang)}>{p.name}</h3>
              <p>
                {t("value.cut", { pct: Math.round(p.cutPct * 100) })}{" "}
                {t("value.per", { n: p.perThousand.toFixed(1) })}
              </p>
              <p className="price">{priceRange(p)} {t("value.ind")}</p>
            </div>
            <a className="btn small ghost" href={p.link} target="_blank" rel="noopener noreferrer">
              {t("value.search")}<span className="sr-only" {...englishIn(lang)}> {p.name}</span>
            </a>
          </li>
        ))}
      </ol>
      <p className="g-note">{t("value.note")}</p>
    </div>
  );
}
