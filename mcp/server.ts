/** The Model Context Protocol server: exposes the engine's tools to an AI assistant over stdio. */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { CITIES } from "../lib/cities";
import { COMMUTES, COOKINGS, HOMES } from "../lib/chat";
import { PLAN_IDS } from "../lib/share";
import { getCityAir, scoreActions, type Result } from "./tools";

/**
 * AirWise as an MCP server over stdio. Two read-only tools, the same engine as the app.
 * Inputs are plain strings here on purpose: the tool functions validate them and return a structured error
 * (code, field, allowed values, next step) that an agent can use to correct its own call.
 */
const server = new McpServer({ name: "airwise", version: "0.1.0" });

const reply = (r: Result<unknown>) =>
  r.ok
    ? {
        content: [{ type: "text" as const, text: JSON.stringify(r.data) }],
        structuredContent: r.data as Record<string, unknown>,
      }
    : {
        isError: true,
        content: [{ type: "text" as const, text: JSON.stringify({ error: r.error }) }],
        structuredContent: { error: r.error } as Record<string, unknown>,
      };

server.registerTool(
  "get_city_air",
  {
    title: "Get a city's air quality today",
    description:
      "Live hourly PM2.5 for one Indian city for today (India Standard Time), with the current level, AQI (US-EPA style scale), the cleanest and worst hours, and whether the data is live or an offline estimate. " +
      "PM2.5 is in micrograms per cubic metre (ug/m3). Hours run 0 to 23. Read-only; nothing is stored.",
    inputSchema: { city: z.string().describe(`One of: ${CITIES.map((c) => c.id).join(", ")}.`) },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async (args) => reply(await getCityAir(args)),
);

server.registerTool(
  "score_actions",
  {
    title: "Score smog fixes for a household",
    description:
      "Calculates, with AirWise's deterministic exposure model, how many cigarettes' worth of PM2.5 a household breathes per day and how much each fix cuts, using today's live air for the city. " +
      "Returns the day's exposure with and without the chosen actions and each action's effect on its own. Distances are one-way kilometres. Percentages are reductions in the household's own exposure, not shares of people. " +
      "Cigarettes equivalent is a rule of thumb (about 22 ug/m3 of PM2.5 over a day per cigarette), general guidance and not medical advice. Read-only; nothing is stored.",
    inputSchema: {
      city: z.string().describe(`One of: ${CITIES.map((c) => c.id).join(", ")}.`),
      home: z.string().describe(`How leaky the home is: ${HOMES.join(", ")}.`),
      commute: z.string().describe(`Main way of travelling: ${COMMUTES.join(", ")}.`),
      cooking: z.string().describe(`Cooking fuel: ${COOKINGS.join(", ")}.`),
      km: z
        .number()
        .optional()
        .describe("One-way commute distance in kilometres, 0 to 60. Default 8."),
      vulnerable: z
        .boolean()
        .optional()
        .describe(
          "True if a child, older adult or someone with asthma or a heart condition lives in the home.",
        ),
      actions: z
        .array(z.string())
        .optional()
        .describe(`Fixes to switch on, any of: ${PLAN_IDS.join(", ")}. Leave out for none.`),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async (args) => reply(await scoreActions(args)),
);

await server.connect(new StdioServerTransport());
