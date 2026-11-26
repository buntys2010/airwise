/** English strings: Map and cigarette-dial text, share card strings and offline chat answers. */
export const EN_PAGES = {
  "map.h": "Air across cities, right now",
  "map.sub":
    "Live PM2.5 for cities across India. A city that could not be reached is marked as an estimate.",
  "map.search": "Search cities or states",
  "map.count": "{n} of {total} cities",
  "map.none": "No city matches.",
  "map.show": "Show {city} on the map",
  "map.sort": "Sort by {col}",
  "map.hint":
    "Tap a marker on the map, or press Show on a city in the table, to read its air quality here.",
  "map.detail": "{city}, {state}: PM2.5 {pm} µg/m³, AQI {aqi}, {level}. {source}.",
  "map.grid": "The air feed is gridded, about 10 km across, so nearby cities can share a value.",
  "map.alt":
    "Schematic map of India with cities marked by air quality, each marker shaped by level. The same values are in the table below.",
  "map.table": "The same data as a table",
  "map.city": "City",
  "map.pm": "PM2.5 (µg/m³)",
  "map.level": "Level",
  "map.source": "Source",
  "map.live": "Live",
  "map.est": "Estimate",
  "map.err": "The map data could not be loaded. Try again in a moment.",
  "map.loading": "Loading the map…",
  "map.open": "Open {city}",
  "map.schematic": "Schematic map, not to scale.",
  "map.hour": "Values for {time} India time.",
  "cig.h": "Cigarettes equivalent, so far today",
  "cig.full": "of about {n} for the whole day",
  "cig.base": "If nothing changes",
  "cig.plan": "With your plan",
  "cig.hour": "As of {time}",
  "cig.less": "{pct}% less",
  "cig.alt":
    "{sofar} cigarettes equivalent so far today, of about {base} for the whole day if nothing changes, and about {plan} with your plan.",
  "share.wa": "Share the card on WhatsApp",
  "share.download": "Download the image",
  "share.alt":
    "AirWise clean-air card for {city}: {base} cigarettes equivalent a day, {plan} with this plan.",
  "share.preparing": "Preparing your card…",
  "share.opened": "WhatsApp opened with your link.",
  "share.cardH": "Your card",

  // Offline chat answers, used when the model is unavailable or its reply fails verification.
  "offline.mask":
    "Use a fitted N95 for any trip outside in {city}. Cloth and surgical masks filter very little PM2.5. Seal the nose clip and check for gaps at the cheeks.",
  "offline.window":
    "Keep windows shut while the air is worst. Open them briefly around {hour}, when outdoor PM2.5 is lowest today.",
  "offline.purifier":
    "Run a HEPA purifier in the room you spend the most time in, door closed. A box fan with a MERV 13 filter taped to it is a low-cost alternative.",
  "offline.child":
    "Children, older adults and anyone with asthma breathe more air for their size. Keep outdoor time short and in the cleanest hour ({hour}), and keep reliever medicines handy. This is general guidance, not medical advice.",
  "offline.cook":
    "Cooking is a big indoor source. Induction adds almost nothing. If you cook on gas or wood, run the chimney or open a window by the stove while you cook, then close it.",
  "offline.commute":
    "Enclosed transport such as the metro shields you from the worst exhaust, and shared rides cut emissions per person. The commute card shows the exact change for your route.",
  "offline.general":
    'Today in {city} the air is "{category}" (PM2.5 about {pm} µg/m³). Following your plan ({actions}) takes your breathing from about {base} to {plan} cigarettes\' worth a day, saving {save}. General guidance, not medical advice.',
  "offline.hourWindow": "the cleanest afternoon hour",
  "offline.hourChild": "afternoon",
  "offline.noActions": "no actions chosen yet",
} as const;
