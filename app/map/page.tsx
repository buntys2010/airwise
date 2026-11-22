"use client";
import { useEffect, useState } from "react";
import { AirMap } from "@/components/AirMap";
import { Header } from "@/components/Chrome";
import { useLang } from "@/components/LangProvider";
import type { MapPoint } from "@/lib/data";

interface MapReply { points: MapPoint[]; time: string; live: number }

export default function MapPage() {
  const { t } = useLang();
  const [data, setData] = useState<MapReply | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/map", { signal: ctrl.signal })
      .then(async (r) => { if (!r.ok) throw new Error("map"); const j = (await r.json()) as MapReply; if (!Array.isArray(j.points) || j.points.length === 0) throw new Error("map"); setData(j); })
      .catch((e: Error) => { if (e.name !== "AbortError") setError(true); });
    return () => ctrl.abort();
  }, []);

  return (
    <div className="wrap">
      <Header />
      <main id="main">
        <section className="severity" aria-labelledby="h1">
          <h1 id="h1">{t("map.h")}</h1>
          <p className="lede">{t("map.sub")}</p>
        </section>
        <section aria-live="polite" aria-busy={!data && !error}>
          {error ? <p className="empty" role="alert">{t("map.err")}</p>
            : data ? <AirMap points={data.points} time={data.time} />
            : <p className="empty">{t("map.loading")}</p>}
        </section>
      </main>
    </div>
  );
}
