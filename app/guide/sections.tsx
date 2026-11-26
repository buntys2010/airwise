/** The guide's lead and reference sections: hero, quick start, features, terms and the closing call. */
import Link from "next/link";

import { FEATURES, STEPS, TERMS } from "./content";

/** The page title, a short intro and the table of contents. */
export function HeroSection() {
  return (
    <section aria-labelledby="g-title" className="g-hero">
      <h1 id="g-title">How to use AirWise</h1>
      <p>
        AirWise turns today&apos;s live air quality into a plan for your family, and shows how much
        each choice helps. This guide covers every feature and the best way to ask questions.
      </p>
      <nav aria-label="On this page" className="g-toc">
        <a href="#start">Start in a minute</a>
        <a href="#features">Every feature</a>
        <a href="#prompts">Prompt guide</a>
        <a href="#how">How the numbers work</a>
        <a href="#words">Plain-language terms</a>
      </nav>
    </section>
  );
}

/** The three-step start. */
export function StartSection() {
  return (
    <section id="start" aria-labelledby="g-start">
      <div className="sec-head">
        <h2 id="g-start">Start in a minute</h2>
      </div>
      <ol className="steps">
        {STEPS.map(([t, d]) => (
          <li key={t}>
            <h3>{t}</h3>
            <p>{d}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Every feature and how to use it. */
export function FeaturesSection() {
  return (
    <section id="features" aria-labelledby="g-feat">
      <div className="sec-head">
        <h2 id="g-feat">Every feature, and how to use it</h2>
      </div>
      <dl className="features">
        {FEATURES.map((f) => (
          <div key={f.name} className="feature">
            <dt>{f.name}</dt>
            <dd>{f.what}</dd>
            <dd className="how">
              <strong>How to use it:</strong> {f.how}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Plain-language terms. */
export function TermsSection() {
  return (
    <section id="words" aria-labelledby="g-words">
      <div className="sec-head">
        <h2 id="g-words">Plain-language terms</h2>
      </div>
      <dl className="features">
        {TERMS.map(([t, d]) => (
          <div key={t} className="feature">
            <dt>{t}</dt>
            <dd>{d}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** The closing call to action. */
export function CtaSection() {
  return (
    <section aria-labelledby="g-go">
      <div className="panel g-cta">
        <h2 id="g-go">Ready to clear your air?</h2>
        <p className="dim">Your plan takes about a minute to build.</p>
        <Link href="/" className="btn u-no-underline u-inline-block u-mt-14">
          Open AirWise
        </Link>
      </div>
    </section>
  );
}
