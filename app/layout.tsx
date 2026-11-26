/** Root layout, fonts and page metadata. */

import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";

import { Sky } from "@/components/Chrome";
import { FocusGuard } from "@/components/FocusGuard";
import { LangProvider } from "@/components/LangProvider";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
const body = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "AirWise: a clear-air plan for smog days",
  applicationName: "AirWise",
  icons: { icon: "/icons/192", apple: "/icons/192" },
  appleWebApp: { capable: true, title: "AirWise", statusBarStyle: "black-translucent" },
  description:
    "Show AirWise your room, or tell it how your family lives. Get a clear-air plan built on live air quality, and see exactly how much each fix cuts your exposure.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#12222a" };

/** The page shell: fonts, language provider, and the sky behind everything. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <LangProvider>
          <Sky />
          <FocusGuard />
          <a className="skip" href="#main">
            Skip to main content
          </a>
          {children}
        </LangProvider>
      </body>
    </html>
  );
}
