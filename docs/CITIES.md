# Cities

`lib/cities/` lists 100+ places: every state and union-territory capital plus large cities. Each has latitude and longitude to about 0.1 degree, from public knowledge of the city centre. That is finer than the air feed's own grid, so nearby cities can share a value (the map and the guide say so).

- Ids are lowercase slugs; the first six (Delhi, Lucknow, Kolkata, Mumbai, Pune, Bengaluru) keep their original ids and monitoring areas so saved choices and share links still work.
- Old names people search for (Bombay, Madras, Allahabad, ...) are in `aka`. The English name always works.
- `ZONE_LEVELS` gives a rough winter peak and trough per region for the offline estimate only. It is not a measurement, and an estimate is always labelled as one.
- Positions are checked by `lib/cities.test.ts`: unique ids, inside India's bounding box, every capital present.

## Marked `unsure: true` (double-check before relying on them)

| City | Why |
|---|---|
| Daman | Capital of the merged UT of Dadra and Nagar Haveli and Daman and Diu (Silvassa is the other headquarters). Position is Daman town. |
| Itanagar | Position to within a few km; hill terrain means the air grid cell may not match the town. |
| Amaravati | Andhra Pradesh capital status is still being settled; position is the planned capital area, near Vijayawada and Guntur. |
| Kavaratti | Tiny island; the air grid cell is mostly sea, so the value says little about the town. |
