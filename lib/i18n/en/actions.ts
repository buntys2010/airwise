/** English strings: Action cards, modes, plan items and schedule text. */
export const EN_ACTIONS = {
  // Action cards: what each fix says, with the engine's numbers filled in.
  "act.sealGaps.title": "Seal door and window gaps",
  "act.sealGaps.cost": "₹300–800 of weather-strip",
  "act.sealGaps.detail":
    "Tape and strip the gaps, keep windows shut through the smog hours. Open them only around {hour}.",
  "act.sealGaps.math1": "Indoor share of outdoor PM2.5: {from} → {to}",
  "act.sealGaps.math2": "About {pct}% of today's dose is breathed indoors",
  "act.purifier.title": "Run an air purifier in the room you use most",
  "act.purifier.cost": "₹8,000–15,000, or a ₹2,000 box-fan DIY filter",
  "act.purifier.detail":
    "HEPA unit sized to the room, door closed, on while you are home. Bedroom first.",
  "act.purifier.math1": "Indoor level keeps {keep}% of what gets in",
  "act.purifier.math2": "Indoor exposure {pct}% of today's dose, cut by {cut}%",
  "act.mask.title": "N95 mask for every trip outside",
  "act.mask.cost": "₹60–120 per mask",
  "act.mask.detail":
    "Seal it around the nose and chin. Cloth and surgical masks barely stop PM2.5.",
  "act.mask.math1": "Fit-adjusted filtering: {n95}% (cloth {cloth}%)",
  "act.mask.math2": "Applies to walking, cycling, two-wheeler and bus legs, and outdoor play",
  "act.shift.title": "Move the family's outdoor time to {hour}",
  "act.shift.cost": "Free",
  "act.shift.detail":
    "Today the air is cleanest around {best} ({bestPm} µg/m³), not {usual} ({usualPm} µg/m³).",
  "act.shift.math1": "Outdoor PM2.5 at {usual}: {usualPm} → at {best}: {bestPm} µg/m³",
  "act.shift.math2": "Half an hour outside, same activity",
  "act.swap.titleSwitch": "Switch your commute from {from} to {to}",
  "act.swap.titleKeep": "Keep your {from} commute",
  "act.swap.costSwitch": "Cheaper than a car",
  "act.swap.costKeep": "Already a low-emission choice",
  "act.swap.detailSwitch":
    "Enclosed, shared transport puts fewer exhaust particles in your lungs and {co2} g less CO₂ per km.",
  "act.swap.detailKeep": "This is already one of the cleanest ways to travel.",
  "act.swap.math1": "In-transit exposure vs outside air: {from} → {to}",
  "act.swap.math2": "CO₂: {from} → {to} g per passenger-km, {km} km each way",
  "act.induction.title": "Cook on induction, or run the hood while cooking",
  "act.induction.cost": "₹2,500 for a single-plate induction",
  "act.induction.detail":
    "Wood and gas flames leave smoke in the kitchen long after the meal. Induction leaves almost none.",
  "act.induction.math1": "Indoor PM2.5 added while cooking: +{from} → +{to} µg/m³",
  "act.induction.math2": "Two cooking hours a day",
  "mode.walk": "walking",
  "mode.cycle": "cycling",
  "mode.bike": "two-wheeler",
  "mode.car": "car",
  "mode.ev": "electric car",
  "mode.bus": "bus",
  "mode.metro": "metro",
  "planitem.sealGaps": "seal gaps",
  "planitem.purifier": "run a purifier",
  "planitem.n95": "wear N95 outside",
  "planitem.cloth": "wear a cloth mask",
  "planitem.shift": "move outdoor time to the cleanest hour",
  "planitem.swap": "switch commute to {mode}",
  "planitem.induction": "cook on induction",
  "sched.morning.title": "Keep windows shut and start the purifier",
  "sched.morning.detail":
    "Outdoor PM2.5 is {at} at {time}, one of the heavier hours. {home} Run the purifier in the room you use most.",
  "sched.home.sealed": "Your home is already well sealed.",
  "sched.home.leaky": "Seal gaps with weather-strip.",
  "sched.cook.titleInduction": "Cook as usual",
  "sched.cook.titleSmoky": "Cook with less smoke",
  "sched.cook.induction": "Induction adds almost no smoke indoors. Run the hood anyway.",
  "sched.cook.wood":
    "Wood and coal smoke is the largest indoor source. Switch to induction if you can, and ventilate the kitchen while you cook.",
  "sched.cook.lpg":
    "Gas leaves smoke in the kitchen. Run the chimney or crack a window by the stove while you cook, then close it.",
  "sched.travel.title": "Travel the cleaner way ({mode})",
  "sched.travel.detail":
    "Outdoor PM2.5 is {at} at {time}. {tip} Metro or a shared ride cuts exposure and emissions.",
  "sched.travel.open": "Wear a fitted N95 for the whole trip.",
  "sched.travel.closed": "Keep the windows up and the air on recirculate.",
  "sched.best.title": "Your cleanest hour ({time})",
  "sched.best.detail":
    "Outdoor PM2.5 falls to {at} at {time}, against {nowAt} at {nowTime}. Move the walk or play outside to this window, and air the home for a few minutes.{extra}",
  "sched.best.vulnerable": " Keep it short for the child or older adult.",
  "sched.back.title": "Head home protected",
  "sched.back.detail": "Outdoor PM2.5 is {at} at {time}. {tip}",
  "sched.back.open": "Put the N95 back on for the trip home.",
  "sched.back.closed": "Stay in your enclosed ride.",
  "sched.evening.title": "Cook and wind down with the door closed",
  "sched.evening.detail":
    "Outdoor PM2.5 is {at} at {time}, when evening smoke builds. Keep windows shut and let the purifier run.",
  "sched.night.title": "Sleep with the purifier on",
  "sched.night.detail":
    "Outdoor PM2.5 is {at} at {time}. Close the bedroom door and keep the purifier running through the night.",
} as const;
