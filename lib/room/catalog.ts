/** Curated product catalog, ranked by the engine's exposure cut per rupee. Static data, no scraping. */

import { NO_PLAN, type Plan, type Profile, simulate } from "../engine";

export type ProductKind = "purifier-hepa" | "purifier-boxfan" | "mask-n95" | "weather-strip" | "induction";

export interface Product {
  id: ProductKind;
  name: string;
  /** Indicative price range in rupees. Labelled as indicative wherever shown. */
  price: [number, number];
  /** Search text for a retailer link. No scraping; the link only opens a search. */
  query: string;
  /** The plan change this product makes in the engine. */
  patch: Partial<Plan>;
}

export const CATALOG: Product[] = [
  {
    id: "purifier-hepa",
    name: "HEPA air purifier, room size",
    price: [8000, 15000],
    query: "HEPA air purifier for room",
    patch: { purifier: true, purifierKind: "hepa" },
  },
  {
    id: "purifier-boxfan",
    name: "Box fan with a MERV 13 filter (DIY)",
    price: [1800, 2500],
    query: "20 inch box fan MERV 13 filter",
    patch: { purifier: true, purifierKind: "boxfan" },
  },
  {
    id: "mask-n95",
    name: "N95 masks, pack of 10",
    price: [600, 1200],
    query: "N95 mask pack of 10",
    patch: { mask: "n95" },
  },
  {
    id: "weather-strip",
    name: "Weather-strip and door-seal kit",
    price: [300, 800],
    query: "window weather strip door draft seal kit",
    patch: { sealGaps: true },
  },
  {
    id: "induction",
    name: "Single-plate induction cooktop",
    price: [2200, 3000],
    query: "single plate induction cooktop",
    patch: { induction: true },
  },
];

export interface RankedProduct extends Product {
  /** Cut in your average exposure, µg/m³, from the engine. */
  cutPm: number;
  cutPct: number;
  /** µg/m³ removed per ₹1,000 at the middle of the price range. */
  perThousand: number;
  link: string;
}

/** A retailer search link for a product. It only opens a search; nothing is scraped. */
export const retailerLink = (q: string) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}`;

/** Ranks the catalog by engine cut per rupee for this household, best value first. Items that change nothing are dropped. */
export function rankProducts(hourly: number[], profile: Profile): RankedProduct[] {
  const base = simulate(hourly, profile, NO_PLAN).meanPm;
  return CATALOG.map((p) => {
    const cut = base - simulate(hourly, profile, { ...NO_PLAN, ...p.patch }).meanPm;
    const mid = (p.price[0] + p.price[1]) / 2;
    return {
      ...p,
      cutPm: cut,
      cutPct: base > 0 ? cut / base : 0,
      perThousand: (cut / mid) * 1000,
      link: retailerLink(p.query),
    };
  })
    .filter((p) => p.cutPm > 0.01)
    .sort((a, b) => b.perThousand - a.perThousand);
}

/** An amount in rupees with Indian digit grouping. */
export const formatRupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
/** A product's indicative price range as text. */
export const priceRange = (p: Pick<Product, "price">) =>
  `${formatRupees(p.price[0])} to ${formatRupees(p.price[1])}`;
