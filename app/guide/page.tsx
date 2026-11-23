import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Header } from "@/components/Chrome";

import { FEATURES, PROMPTS, STEPS, TERMS, TIPS } from "./content";

export const metadata: Metadata = {
  title: "How to use AirWise: guide and prompt tips",
  description:
    "A short guide to every AirWise feature, plus example questions that get the most useful answers.",
};

const ask = (q: string) => `/?ask=${encodeURIComponent(q)}#h-ask`;

function PromptSection() {
  return (
    <section id="prompts" aria-labelledby="g-prompts">
      <div className="sec-head">
        <h2 id="g-prompts">Prompt guide for Ask AirWise</h2>
        <p>Tap any example to open it in the chat box, ready to send. You can edit it first.</p>
      </div>
      <div className="tips">
        {TIPS.map(([t, d]) => (
          <div key={t} className="panel">
            <h3>{t}</h3>
            <p className="dim">{d}</p>
          </div>
        ))}
      </div>
      <div className="promptgroups">
        {PROMPTS.map((g) => (
          <div key={g.group} className="panel">
            <h3>{g.group}</h3>
            <ul>
              {g.items.map((q) => (
                <li key={q}>
                  <Link href={ask(q)}>{q}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="g-note">
        <strong>What it will not do.</strong> AirWise gives general guidance and does not diagnose
        or replace a doctor. It only uses the numbers on the page, so it will not quote figures it
        cannot see. Questions can be up to 400 characters. If a question includes instructions aimed
        at the assistant, they are ignored.
      </p>
    </section>
  );
}

/** One line of "how the numbers work": a bold label followed by its explanation. */
function Fact({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <li>
      <strong>{label}</strong> {children}
    </li>
  );
}

function HowSection() {
  return (
    <section id="how" aria-labelledby="g-how">
      <div className="sec-head">
        <h2 id="g-how">How the numbers work</h2>
        <p>
          Live hourly PM2.5, temperature and wind come from Open-Meteo for the city you pick. A
          small model then adds up your day, hour by hour. The AI explains the result and never
          calculates it.
        </p>
      </div>
      <div className="panel">
        <ul className="facts">
          <Fact label="At home:">
            outdoor air times how much gets in (sealed 35%, typical 60%, gappy 85%). A right-sized
            purifier keeps 40% of that.
          </Fact>
          <Fact label="On the way:">
            exposure depends on the mode. Metro is about half of street air, car 60%, bus 80%,
            walking 100%, cycling 120% because you breathe harder.
          </Fact>
          <Fact label="Outdoors:">
            half an hour outside. An N95 filters about 60% after allowing for fit. A cloth mask
            about 10%.
          </Fact>
          <Fact label="Cooking:">
            adds smoke indoors while you cook: wood or coal +150, gas +30, induction +8 µg/m³.
          </Fact>
          <Fact label="CO₂:">
            grams per passenger-kilometre by mode, using India&apos;s grid for electric vehicles.
          </Fact>
        </ul>
        <p className="dim u-mt-12">
          These are planning assumptions for comparing choices, not clinical measurements. Full list
          and sources: docs/methodology.md in the project repository.
        </p>
      </div>
    </section>
  );
}

/** The page title, a short intro and the table of contents. */
function HeroSection() {
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
function StartSection() {
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
function FeaturesSection() {
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
function TermsSection() {
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
function CtaSection() {
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

export default function Guide() {
  return (
    <div className="wrap guide">
      <Header>
        <Link href="/" className="chip u-no-underline">
          Open AirWise
        </Link>
      </Header>

      <main id="main">
        <HeroSection />

        <StartSection />

        <FeaturesSection />

        <PromptSection />

        <HowSection />

        <TermsSection />

        <CtaSection />
      </main>

      <footer>
        <p>
          AirWise gives general guidance and is not medical advice. If anyone has trouble breathing,
          contact a doctor.
        </p>
      </footer>
    </div>
  );
}
