/** The guide's text: the quick start, every feature, prompt ideas, tips and plain-language terms. */

/** Plain-language terms, as [term, meaning] pairs. */
export const TERMS: [string, string][] = [
  [
    "PM2.5",
    "Tiny particles in the air, 2.5 micrometres or smaller, that can reach deep into the lungs. Measured in µg/m³, micrograms per cubic metre of air.",
  ],
  [
    "AQI",
    "Air Quality Index. A 0 to 500 scale made from PM2.5. Higher is worse, and above 300 is hazardous.",
  ],
  [
    "Exposure",
    "The average PM2.5 you actually breathe across the day, weighing hours at home, in transit, outdoors and cooking.",
  ],
  [
    "Cigarettes a day",
    "A way to picture exposure. About 22 µg/m³ of PM2.5 across a day is treated as one cigarette. It is a rule of thumb, not a medical measure.",
  ],
  [
    "Infiltration",
    "How much outdoor smog gets inside. A sealed, air-conditioned home lets in about a third. A gappy old window lets in most of it.",
  ],
];

/** Tips for asking better questions, as [title, advice] pairs. */
export const TIPS: [string, string][] = [
  [
    "Set up your household first",
    "Answers use your profile and plan. Choose your home, commute and cooking before you ask.",
  ],
  [
    "Name who and when",
    "Say who the question is about and what time of day, for example a toddler, a morning walk, or an evening commute.",
  ],
  [
    "Ask one thing at a time",
    "Short, specific questions get short, specific answers. You can always ask a follow-up.",
  ],
  [
    "Ask about your plan",
    "Questions such as which action first, or what is cheapest, work best, because AirWise knows your numbers.",
  ],
];

/** Example questions, grouped by topic. */
export const PROMPTS: { group: string; items: string[] }[] = [
  {
    group: "Masks and going out",
    items: [
      "Do I really need an N95?",
      "Is it safe for my child to play outside this evening?",
      "How should I wear an N95 so it actually seals?",
    ],
  },
  {
    group: "At home",
    items: [
      "When should I open the windows?",
      "Which room should I put the purifier in first?",
      "What can I do for indoor air if I cannot afford a purifier?",
    ],
  },
  {
    group: "Cooking and commuting",
    items: [
      "What should I change about cooking?",
      "Is the metro really better than my two-wheeler for smog?",
      "Is an electric car worth it for cleaner air?",
    ],
  },
  {
    group: "Your plan",
    items: [
      "Which action should I do first?",
      "Explain my cigarette number in simple words.",
      "What is the cheapest way to cut my exposure?",
    ],
  },
];

/** Every feature with what it shows and how to use it. */
export const FEATURES: { name: string; what: string; how: string }[] = [
  {
    name: "Live air badge",
    what: "Shows that the air quality is live, with the time of the last update, or tells you plainly when the live feed is unreachable and you are seeing an estimate.",
    how: "Nothing to do. It refreshes every 15 minutes while the page is open.",
  },
  {
    name: "City picker",
    what: "Loads today's hourly PM2.5, temperature and wind for any of more than 100 Indian cities: every state and union-territory capital and the large cities. The air data is gridded, so nearby cities can share a value.",
    how: "Tap the city name at the top and type a city, an older name such as Bombay, or a state. Arrow keys and Enter work too. Your last city is remembered on this device only. You can also open a link ending in ?city=pune.",
  },
  {
    name: "Outdoors-all-day cigarettes",
    what: "Next to the city name, a small row of cigarettes shows what a person breathes standing outdoors all day in that city at today's levels, and how much of it has passed so far. It is about the city, not your household.",
    how: "Read the line beside the row. It shows how much of the day has burned so far. Your own figure is the big gauge lower down.",
  },
  {
    name: "Photo of your room",
    what: "Looks at a photo of your room for things it can plainly see, such as a gap by a window, a gas stove or a purifier, and turns them into tappable hotspots. Anything it cannot see becomes a question for you, never a guess.",
    how: "Choose a photo or use the sample room. Your answers always win over the photo. The photo is resized and stripped of location data on your device before it is sent, and it is not stored.",
  },
  {
    name: "Hindi and voice",
    what: "The whole app works in English or Hindi. You can speak a question in browsers that support it.",
    how: "Use the EN and हिन्दी buttons at the top. For voice, press the microphone, check the text it wrote, then press Send. Reading answers aloud is off until you turn it on.",
  },
  {
    name: "City map",
    what: "Live PM2.5 for every listed city on a schematic map of India. Each marker has a shape and a number, not just a colour, and every city is also in a searchable, sortable table.",
    how: "Open Map. Tap a marker, or press Show on a table row, to read that city. A city whose data could not be reached is labelled an estimate.",
  },
  {
    name: "Community notice",
    what: "A one-page notice for a building or street, with today's level and the fixes that help most, plus rules a society can adopt.",
    how: "Open Community, pick the city, and use Print.",
  },
  {
    name: "Save, share and remind",
    what: "Saves your choices on this device only, makes a link that carries choices and never numbers, shares to WhatsApp, and adds a reminder for the cleanest hour to your calendar.",
    how: "Use the buttons under your plan. Choose Forget to clear what is saved.",
  },
  {
    name: "Cigarettes-a-day gauge",
    what: "Turns your personal PM2.5 exposure into a figure you can feel. It uses a rule of thumb of about 22 µg/m³ per cigarette a day.",
    how: "Read the large number. It changes when you change your household details.",
  },
  {
    name: "With your plan panel",
    what: "Shows your exposure, cigarettes saved and CO₂ saved once your chosen actions are applied.",
    how: "Use Clear my air to apply every action that fits you, and Start over to go back.",
  },
  {
    name: "Household profile",
    what: "Tailors every number to your home, commute, distance, cooking fuel and who lives with you.",
    how: "Pick one option in each group. Use the slider for your one-way distance in km. Tick the box if someone in your home is more sensitive to smog.",
  },
  {
    name: "Hour-by-hour chart",
    what: "Shows outdoor PM2.5 for each hour of the day, the cleanest hour, and your usual outing time.",
    how: "Look for the outlined bar marked Best. Screen reader users get the same data as a table.",
  },
  {
    name: "Clear-air plan",
    what: "Six actions, each with its percentage cut in exposure, cigarettes saved, CO₂ saved and rough cost. Actions that do not apply to you say so.",
    how: "Press Add to my plan to switch an action on, and again to switch it off. Open Show the math to see the numbers behind it.",
  },
  {
    name: "Daily dose breakdown",
    what: "Splits your day into air breathed at home, on the way, outdoors and from cooking smoke, before and after your plan.",
    how: "Compare the two bars. The biggest segment is where your next action will help most.",
  },
  {
    name: "Ask AirWise",
    what: "Answers plain-language questions using only the numbers on the page. It never makes up figures and does not give medical advice.",
    how: "Tap a suggestion or type your own question of up to 400 characters, then press Ask AirWise.",
  },
  {
    name: "Building notice",
    what: "A one-page notice with today's air level and the three actions that help most.",
    how: "Press Print this notice. Only the notice prints, so it is ready for a noticeboard or a PDF.",
  },
  {
    name: "The smog sky",
    what: "The page background is the air itself. Thick haze means a high exposure, and the sun appears as you lower it.",
    how: "Apply actions and watch it clear. If you prefer less movement, your device's reduced-motion setting is respected.",
  },
  {
    name: "Keyboard and screen reader use",
    what: "Every control works from the keyboard, has a visible focus ring and a label, and results are announced.",
    how: "Press Tab to move, Space or Enter to press, and use the Skip to main content link at the top.",
  },
];

/** The quick start, in order, as [title, instruction] pairs. */
export const STEPS: [string, string][] = [
  [
    "Pick your city",
    "The air quality loads live for that city. The badge at the top right shows when it was last updated.",
  ],
  [
    "Describe your household",
    "Choose your home type, how you commute, what you cook on, and whether a child, older adult or someone with asthma lives with you.",
  ],
  [
    "Read your number",
    "The big figure is how many cigarettes a day your breathing is worth if you change nothing.",
  ],
  [
    "Build your plan",
    "Press Add to my plan on any action, or press Clear my air to switch on everything that applies. Watch the number, and the sky, fall.",
  ],
  [
    "Ask or share",
    "Ask AirWise a question about your plan, or print a one-page notice for your building.",
  ],
];
