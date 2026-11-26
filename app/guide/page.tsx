/** The guide page: quick start, features, example questions and plain-language terms. */
import type { Metadata } from "next";
import Link from "next/link";

import { Header } from "@/components/Chrome";

import { HowSection, PromptSection } from "./explain";
import { CtaSection, FeaturesSection, HeroSection, StartSection, TermsSection } from "./sections";

export const metadata: Metadata = {
  title: "How to use AirWise: guide and prompt tips",
  description:
    "A short guide to every AirWise feature, plus example questions that get the most useful answers.",
};

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
