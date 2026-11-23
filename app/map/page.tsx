"use client";
import { useEffect, useState } from "react";
import { AirMap } from "@/components/AirMap";
import { Header } from "@/components/Chrome";
import { useLang } from "@/components/LangProvider";
import type { MapPoint } from "@/lib/data";

interface MapReply {
  points: MapPoint[];
  time: string;
  live: number;
}

export default function MapPage() {
  const { t } = useLang();
  const [data, setData] = useState<MapReply | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/map", { signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error("map");
        const reply = (await r.json()) as MapReply;
        if (!Array.isArray(reply.points) || reply.points.length === 0) throw new Error("map");
        setData(reply);
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") setError(true);
      });
    return () => ctrl.abort();
  }, []);

  let body = <p className="empty">{t("map.loading")}</p>;
  if (error) {
    body = (
      <p className="empty" role="alert">
        {t("map.err")}
      </p>
    );
  } else if (data) {
    body = <AirMap points={data.points} time={data.time} />;
  }

  return (
    <div className="wrap">
      <Header />
      <main id="main">
        <section className="severity" aria-labelledby="h1">
          <h1 id="h1">{t("map.h")}</h1>
          <p className="lede">{t("map.sub")}</p>
        </section>
        <section aria-live="polite" aria-busy={!data && !error}>
          {body}
        </section>
      </main>
    </div>
  );
}
