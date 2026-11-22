# Methodology and assumptions

AirWise estimates a household member's **time-weighted PM2.5 exposure** over 24 hours. These are planning assumptions for comparing choices, not clinical measurements. Values are deliberately round and every one lives in `lib/engine.ts`.

## Daily model
For each hour `h`, outdoor PM2.5 `C(h)` (µg/m³) comes from the city's hourly data. Exposure while:
- **Indoors:** `C(h) × infiltration × purifier factor`, plus cooking emissions at 7 and 20.
- **Commuting** (8 and 18): `C(h) × mode factor × (1 − mask effect if the mode is open)` for `min(1, km / speed)` hours each way.
- **Outdoors** (default 7, or the cleanest 10–16 slot when shifted): half an hour at `C(h) × (1 − mask effect)`.

Mean exposure = total dose ÷ 24. Cigarettes a day = mean ÷ 22.

## Factors and where they come from
| Factor | Value used | Basis and range |
|---|---|---|
| Indoor share of outdoor PM2.5 (infiltration) | sealed 0.35, typical 0.6, leaky 0.85 | Indoor/outdoor ratios in urban homes are commonly 0.3–0.9 depending on air-tightness and AC use |
| HEPA purifier | indoor level × 0.4 | Right-sized units remove well over half of indoor PM2.5 in a closed room; 60% reduction is conservative |
| N95 mask, fit-adjusted | 0.6 (cloth 0.1) | Lab filtration is 95%+, real-world fit leakage lowers it substantially |
| In-transit factor | walk 1, cycle 1.2, two-wheeler 1.1, bus 0.8, car/EV 0.6, metro 0.5 | In-vehicle ratios vary by ventilation; enclosed modes shield, cycling raises inhaled dose through deeper breathing |
| Speeds (km/h) | walk 4.5, cycle 12, two-wheeler 25, bus 15, car 20, metro 30 | Typical urban averages |
| CO₂ (g per passenger-km) | two-wheeler 35, bus 70, car 150, EV 100, metro 30, walk/cycle 0 | India grid ≈ 0.7 kg CO₂/kWh makes EVs a smaller CO₂ win than elsewhere |
| Cooking add (µg/m³ during cooking) | wood 150, LPG 30, induction 8 | Indoor PM2.5 from biomass is several times that from gas; induction adds almost none |
| Cigarette equivalence | 22 µg/m³ ≈ 1 cigarette a day | Berkeley Earth rule of thumb; used only to make dose relatable |

## AQI
Piecewise-linear US-EPA-style breakpoints on PM2.5 (12, 35.4, 55.4, 150.4, 250.4, 350.4, 500.4). Indian national AQI uses different breakpoints; this is a stated simplification.

## Air data
Hourly `pm2_5` for today, and current temperature and wind, are fetched live from Open-Meteo for the city centre and refreshed every 15 minutes. If the feed fails or returns malformed data (not 24 finite, non-negative values), the app switches to `estimateHourly`, a deterministic curve (pre-dawn inversion peak, evening bump, afternoon dip between each city's stated peak and trough) and labels it "Offline estimate". The estimate is illustrative, never shown as live.

## What the AI does and does not do
Gemini receives a whitelisted fact block (city, PM2.5, category, baseline and plan cigarettes, chosen actions) and a question. It is instructed to use only those numbers, give general guidance and stay under 90 words. It never computes impact figures.

## Limits
One person-day, a fixed schedule, no weather forecasting, no individual medical data. Health guidance is general and not medical advice.

## Room findings and the product catalog (v2)

**Photo to plan.** A photo of a room is read by Gemini for exactly three things: a gap around a window or door, a gas or wood stove, and the absence of an air purifier. The model returns only enum kinds, a confidence and a box; it never states a percentage. Code (`lib/room.ts`) validates the reply strictly (known kinds only, boxes inside the image, confidence between 0.4 and 1, one finding per kind), then maps findings to household facts and engine actions:

| Finding | Household fact set in code | Engine action |
|---|---|---|
| Gap around the window | home = leaky | seal gaps |
| Gas or wood stove | cooking = LPG | induction or ventilation |
| No air purifier | none | purifier |

Some models answer on a 0 to 1000 scale instead of 0 to 1; those boxes are read as per-mille and validated the same way. A photo that is not a room, or yields no finding, falls back to a three-question checklist that drives the same engine. Photos are shrunk to 1024 px and re-encoded on the device (which removes location data), sent once, and never stored; only a hash of the photo is used as a cache key, for the findings.

**Purifier kinds.** The engine has two documented factors for the share of indoor PM2.5 that remains while the unit runs:

| Kind | Factor | Basis |
|---|---|---|
| HEPA, right-sized | 0.4 | as in the main table |
| Box fan with a MERV 13 filter taped on (DIY) | 0.6 | A MERV 13 filter on a 20-inch fan removes less than a rated HEPA unit and moves less air in a large room, so we assume a weaker cut. This is a planning assumption, labelled as such. |

**Rupee ranking.** The catalog is a short, curated, static list (no scraping, no affiliate links). Each item is a plan change in the engine. For this household we run the model with only that item, take the cut in average exposure (µg/m³), and divide by the middle of the price range to get µg/m³ removed per ₹1,000. Items that change nothing for the household are dropped. Prices are indicative ranges in rupees and are labelled so wherever shown. The retailer link only opens a search.

**A photo shows what is there, never what is missing.** The photo step reports only visible evidence: a visible gap, a visible gas or wood stove, a visible purifier. It is told to report nothing because something is absent, and that an electric or induction hob is not a gas stove. "No purifier" is not something the model can report (the schema does not allow it). Everything the photo did not show becomes a one-tap yes or no question, and an unanswered question adds nothing to your plan. An explicit answer always beats the photo, because the household knows its own home. A living room or bedroom therefore cannot produce a stove finding.

## So far today, and the cigarette row (v2)

`simulate()` now also returns the day's dose hour by hour (`perHour`, in µg/m³ x hours). The hours add up to the whole day, so a part of the day can be summed consistently. `cigsSoFar(hourly, profile, plan, hoursElapsed)` adds the hours that have passed in India time (a fraction of the current hour counts for the part that has passed) and converts with the same rule of thumb as the daily figure. It is 0 at the start of the day and equals the whole-day figure at hour 24, never decreases, and every action lowers it. The server computes it too, rounded to one decimal as it is shown, so if the chat quotes it the grounding guard accepts exactly that number and nothing else.

The cigarette row is a drawing of three engine figures: the do-nothing day (the faint outlines), the day with your plan (the length of each cigarette) and so far today (the ash). One cigarette per whole cigarette-equivalent, the last one partial, capped at ten with a "+N" chip. Cigarettes equivalent is a rule of thumb (about 22 µg/m³ of PM2.5 over a day counts as one cigarette), shown with that label and "general guidance, not medical advice".

**Cooking smoke and the outdoor half-hour.** The model previously scaled cooking smoke by the share of the hour spent indoors. Moving the family's outdoor half-hour away from 7 am (a cooking hour) therefore added kitchen smoke and, for gas and wood households, cancelled or even reversed the benefit of the cleaner hour. This was found by the "every action lowers it" test for `cigsSoFar`. Cooking smoke is now counted for the whole cooking hour, because the person cooking is at home for it, so shifting outdoor time can no longer raise exposure (regression test in `lib/engine.test.ts`). Baseline figures moved slightly as a result.

## Outdoors-all-day cigarettes (top strip)
The strip next to the city name shows what a person breathes standing outdoors all day at today's levels: the mean of the 24 hourly PM2.5 values divided by the same constant as everywhere else (`CIGARETTE_PM`, 22 µg/m³ per cigarette a day, a rule of thumb). `outdoorCigs` and `outdoorCigsSoFar` in `lib/engine.ts` compute it; the "so far today" part sums the hours elapsed in India time. It describes the city's air, not the household, so it is always higher than the personal dial, which counts hours indoors, mask and fixes. Both figures are in the server chat facts, so the grounding guard accepts them and rejects any other number.
