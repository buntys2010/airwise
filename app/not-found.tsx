import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap">
      <main id="main" className="u-page-pad">
        <h1>That page does not exist.</h1>
        <p>The link may be old or mistyped.</p>
        <Link className="btn accent" href="/">
          Back to AirWise
        </Link>
      </main>
    </div>
  );
}
