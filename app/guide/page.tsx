/** The guide page. */

import type { Metadata } from "next";
import Link from "next/link";

import { Header } from "@/components/Chrome";

import {
  CallToAction,
  FeaturesSection,
  Hero,
  HowSection,
  PromptsSection,
  StartSection,
  TermsSection,
} from "./sections";

export const metadata: Metadata = {
  title: "How to use AirWise: guide and prompt tips",
  description:
    "A short guide to every AirWise feature, plus example questions that get the most useful answers.",
};

/** The guide page: how to use AirWise and how to ask good questions. */
export default function Guide() {
  return (
    <div className="wrap guide">
      <Header>
        <Link href="/" className="chip no-underline">
          Open AirWise
        </Link>
      </Header>

      <main id="main">
        <Hero />
        <StartSection />
        <FeaturesSection />
        <PromptsSection />
        <HowSection />
        <TermsSection />
        <CallToAction />
      </main>

      <footer>
        <p>
          AirWise gives general guidance and is not medical advice. If anyone has trouble breathing, contact a
          doctor.
        </p>
      </footer>
    </div>
  );
}
