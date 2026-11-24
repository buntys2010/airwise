"use client";
import { BRAND } from "@/lib/palette";

/**
 * Last resort when the root layout itself fails. It replaces the layout, so it cannot rely on the
 * app's styles.
 */
export default function GlobalError({
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: "64px 16px",
          background: BRAND.ink,
          color: BRAND.onInk,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <main id="main">
          <h1>Something went wrong.</h1>
          <p>AirWise could not start. Please try again.</p>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: 44,
              padding: "10px 20px",
              borderRadius: 14,
              border: 0,
              fontWeight: 700,
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
