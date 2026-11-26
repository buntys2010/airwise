/** The marker shapes for the map: the shape, not only the colour, says the air-quality level. */
import type { Tone } from "@/lib/engine/aqi";
import { BRAND, TONE_COLOUR } from "@/lib/palette";

/** A small marker whose SHAPE says the level, so colour is never the only signal. */
export function Shape({ tone, r }: Readonly<{ tone: Tone; r: number }>) {
  const common = { fill: TONE_COLOUR[tone], className: "map-pt" };
  switch (tone) {
    case "good":
      return <circle r={r} {...common} />;
    case "moderate":
      return <path d={`M0 ${-r * 1.2} L${r * 1.2} 0 L0 ${r * 1.2} L${-r * 1.2} 0Z`} {...common} />;
    case "sensitive":
      return <path d={`M0 ${-r * 1.25} L${r * 1.2} ${r} L${-r * 1.2} ${r}Z`} {...common} />;
    case "unhealthy":
      return <rect x={-r} y={-r} width={r * 2} height={r * 2} {...common} />;
    case "severe":
      return (
        <path
          d={`M${r * 1.2} 0 L${r * 0.6} ${r * 1.05} L${-r * 0.6} ${r * 1.05} L${-r * 1.2} 0 L${-r * 0.6} ${-r * 1.05} L${r * 0.6} ${-r * 1.05}Z`}
          {...common}
        />
      );
    default:
      return (
        <g>
          <circle r={r * 1.1} {...common} />
          <path
            d={`M${-r * 0.6} ${-r * 0.6} L${r * 0.6} ${r * 0.6} M${r * 0.6} ${-r * 0.6} L${-r * 0.6} ${r * 0.6}`}
            stroke={BRAND.ink}
            strokeWidth={1.6}
          />
        </g>
      );
  }
}
