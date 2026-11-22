---
# gstack: design-md-format=spec
name: AirWise
description: A field instrument in smog light. The page atmosphere is the measurement; fixes visibly clear the air.
colors:
  primary: "#12222a"          # ink: text, panels, outlines
  on-primary: "#ebf3f5"
  surface: "#d9ebf1"          # clear sky; the page blends toward smog as exposure rises
  surface-smog: "#b2935f"
  text: "#12222a"
  text-muted: "#2a4755"
  accent: "#45d1b7"           # breath: applied and cleaner
  accent-deep: "#0f7f6c"
  success: "#0f7f6c"
  warning: "#ff7a4d"          # ember: severity only, always with an icon and a label
  error: "#12222a"            # hazardous panel uses ink with the on-primary text
typography:
  display:
    fontFamily: Bricolage Grotesque
    fontWeight: 700
    fontSize: clamp(2.2rem, 6vw, 3.6rem)
    letterSpacing: -0.02em
  body:
    fontFamily: Hanken Grotesk
    fontSize: 1.0625rem
    lineHeight: 1.55
  label:
    fontFamily: Hanken Grotesk
    fontSize: 0.85rem
    letterSpacing: 0
  mono:
    fontFamily: Hanken Grotesk
    fontFeature: tnum
rounded:
  sm: 8px
  md: 14px
  lg: 22px
  full: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
  chip:
    borderColor: "{colors.primary}"
    rounded: "{rounded.full}"
  marker:
    borderColor: "{colors.primary}"
    rounded: "{rounded.full}"
  dial-panel:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.lg}"
---

# AirWise design system

## Memorable thing
"The smog in my own room thinned when I changed three things." Every decision below serves it.

## Mode and use scene
Operate (an app people use to get something done), mobile first, light. A parent in a smoggy Indian city, daytime, one hand, looking for the next thing to change. Light comes from this scene, not from the category.

## Colour
The page background blends `surface` and `surface-smog` using the `--haze` variable, which follows the user's remaining exposure. Ink carries text and panels. `accent` means applied and cleaner. `warning` is for severity only, and severity always has an icon and a label, never colour alone (the scale: Good, Moderate, Poor for sensitive groups, Unhealthy, Hazardous). Body text keeps 4.5:1 contrast, checked in `lib/contrast.test.ts` including the worst-case haze.

## Typography
Display is Bricolage Grotesque, body is Hanken Grotesk, both loaded through `next/font/google` in `app/layout.tsx`. Numbers in the dial and tables use tabular figures. Devanagari falls back to Noto Sans Devanagari, then Nirmala UI and Mukta, with no webfont; translated blocks carry `lang="hi"`. More space above a heading than below it. Display stays under 6rem.

## Layout and spacing
Phone: strip (city, AQI chip with icon and label, language), agency headline, the room with its dial, three plain fix rows, chat, bottom bar (Plan, Community, Map, Guide). Desktop: room left, fixes and chat right. Spacing is a 4px base on an 8px rhythm. Touch targets are 44px.

## Components
- Fix rows are plain list rows, not cards. Never nest cards.
- Hotspot markers are real 44px buttons with an ink outline and numeral, and every marker has a matching text row.
- The dial panel is ink with on-primary text and the tabular numerals.
- Focus: a 3px ink outline plus a 6px accent ring.

## Motion
One authored moment: the haze thinning when a fix is applied, 1.4s ease-out (already in `app/globals.css`). Static under `prefers-reduced-motion`. No bounce.

## Decoration
The haze is data, not decoration: blob and sun opacity derive from `--haze`. Nothing else is decorative. No stock photos, no gradient buttons, no icon tiles above headings.

## Deliberate risks
1. Haze as the interface (memorable, but blurred blobs read as decoration unless they stay tied to exposure and contrast-tested).
2. Calm over alarm: severity sits beside an agency headline.
3. A warm display grotesque in a health context; keep copy plain and numeric.

## Decisions log
- 2026-11-22: documented the existing tokens; no new look. Preview reviewed in the browser. Fonts verified from `app/layout.tsx`; license listing not re-checked online (offline verification only).
