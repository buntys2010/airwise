"use client";

/** Shown when a page throws while rendering. The reset button retries without a full reload. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="wrap">
      <main id="main" style={{ paddingBlock: "64px" }}>
        <h1>Something went wrong.</h1>
        <p>The page could not load. Your choices are saved on this device, so nothing is lost.</p>
        {error.digest && <p><small>Reference: {error.digest}</small></p>}
        <button type="button" className="btn accent" onClick={reset}>Try again</button>
      </main>
    </div>
  );
}
