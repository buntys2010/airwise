# AirWise MCP server

AirWise as a [Model Context Protocol](https://modelcontextprotocol.io) server over stdio, so an agent can ask the same engine the app uses. Two read-only tools; nothing is stored and nothing is written.

| Tool | What it returns |
|---|---|
| `get_city_air` | Today's hourly PM2.5 (µg/m³, hours 0 to 23 India time) for one of the 118 cities, the current level and AQI, the cleanest and worst hours, and whether the data is live or an offline estimate. |
| `score_actions` | For a household (city, home, commute, cooking, optional km and vulnerable flag): cigarettes' worth of PM2.5 per day with and without the chosen fixes, the percent reduction, and each fix on its own. |

Cigarette equivalent is a rule of thumb (about 22 µg/m³ of PM2.5 over a day per cigarette). It is general guidance, not medical advice. Figures come from the deterministic engine in `../lib`, never from a language model.

## Errors an agent can act on

A bad call returns `isError: true` and a body like:

```json
{ "error": { "code": "invalid_argument", "field": "city", "message": "city \"atlantis\" is not supported.",
  "allowed": ["delhi", "lucknow", "..."], "next_step": "Call again with city set to one of the allowed values." } }
```

Codes: `missing_argument`, `invalid_argument`, `air_data_unavailable`. A hostile value is trimmed to 40 characters in the message.

## Run it

```bash
cd mcp
npm ci
npm run build      # bundles server.ts into dist/server.mjs
npm run smoke      # starts it over stdio with the official client and makes a good and a bad call
```

Add it to an MCP client (for example Claude Desktop or Claude Code):

```json
{ "mcpServers": { "airwise": { "command": "node", "args": ["/absolute/path/to/mcp/dist/server.mjs"] } } }
```

It needs network access to the Open-Meteo air-quality feed. The tool logic is in `tools.ts` as plain functions with an injectable air loader, tested by `tools.test.ts` in the root test run; `server.ts` is only the SDK wiring. The SDK and zod versions are pinned exactly in `package.json`.
