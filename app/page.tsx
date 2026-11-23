import type { Metadata } from "next";

import { Home } from "@/components/Home";

type Params = Promise<Record<string, string | string[] | undefined>>;
const KEYS = ["city", "home", "commute", "km", "cooking", "vulnerable", "plan"];

/**
 * A shared link previews as the share card: the same choices-only query goes to the image route,
 * which recomputes every number.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Params;
}): Promise<Metadata> {
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const k of KEYS) {
    const value = sp[k];
    if (typeof value === "string") params.set(k, value.slice(0, 80));
  }
  params.set("size", "og");
  const image = `/api/share-image?${params.toString()}`;
  const title = "My AirWise clean-air plan";
  const description =
    "Cigarettes equivalent of today's smog at home, and how much each fix cuts. Numbers from code, words from AI.";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: "AirWise clean-air plan card" }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function Page() {
  return <Home />;
}
