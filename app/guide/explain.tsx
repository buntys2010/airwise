/** The guide's two explanatory sections: the prompt guide and how the numbers work. */
import Link from "next/link";
import type { ReactNode } from "react";

import { PROMPTS, TIPS } from "./content";

const ask = (q: string) => `/?ask=${encodeURIComponent(q)}#h-ask`;

export function PromptSection() {
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

export function HowSection() {
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
