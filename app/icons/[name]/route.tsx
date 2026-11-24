/** Generates the app icons at build time, so no image files are stored. */
import { ImageResponse } from "next/og";

import { BRAND } from "@/lib/palette";

export const dynamic = "force-static";

const SIZES: Record<string, { size: number; pad: number }> = {
  "192": { size: 192, pad: 0.14 },
  "512": { size: 512, pad: 0.14 },
  // Maskable icons keep the artwork inside the central safe zone, because the OS may crop the edges.
  maskable: { size: 512, pad: 0.26 },
};

/** Lets Next render every icon size once at build time. */
export function generateStaticParams() {
  return Object.keys(SIZES).map((name) => ({ name }));
}

/**
 * The AirWise mark (two smog waves in a dark disc) drawn at the requested size. Generated at build
 * time, so no image files are stored.
 */
export async function GET(
  _req: Request,
  { params }: Readonly<{ params: Promise<{ name: string }> }>,
) {
  const { name } = await params;
  const spec = SIZES[name];
  if (!spec) return new Response("Not found", { status: 404 });
  const { size, pad } = spec;
  const inner = Math.round(size * (1 - pad * 2));
  return new ImageResponse(
    <div
      style={{
        width: size,
        height: size,
        background: BRAND.ink,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width={inner} height={inner} viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="15" fill={BRAND.inkRaised} />
        <path
          d="M7 14c3-3 5 3 9 0s5-3 9 0M7 20c3-3 5 3 9 0s5-3 9 0"
          stroke={BRAND.mark}
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>,
    { width: size, height: size },
  );
}
