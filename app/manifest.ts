import type { MetadataRoute } from "next";

/**
 * Makes AirWise installable ("Add to Home Screen"). No service worker: the app needs the network for live air anyway,
 * and installability only needs a manifest with icons over HTTPS.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AirWise: a clear-air plan for smog days",
    short_name: "AirWise",
    description:
      "Show AirWise your room or tell it how your family lives. Get a clear-air plan built on live air quality.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#12222a",
    theme_color: "#12222a",
    lang: "en-IN",
    categories: ["health", "lifestyle", "weather"],
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
