// Starts the built server over stdio with the official client, lists the tools, and makes one good and one bad call.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new Client({ name: "airwise-smoke", version: "0.0.0" });
await client.connect(
  new StdioClientTransport({ command: process.execPath, args: ["dist/server.mjs"] }),
);
let failed = 0;
const check = (ok, label, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra ? `  ${extra}` : ""}`);
  if (!ok) failed++;
};

const { tools } = await client.listTools();
check(
  tools
    .map((t) => t.name)
    .sort((a, b) => a.localeCompare(b))
    .join() === "get_city_air,score_actions",
  "lists the two tools",
  tools.map((t) => t.name).join(", "),
);
check(
  tools.every((t) => t.annotations?.readOnlyHint === true),
  "both are marked read-only",
);

const air = await client.callTool({ name: "get_city_air", arguments: { city: "delhi" } });
const airData = JSON.parse(air.content[0].text);
check(
  !air.isError && airData.hourly_pm25_ugm3?.length === 24,
  "get_city_air returns 24 hourly values",
  `(source: ${airData.source})`,
);

const score = await client.callTool({
  name: "score_actions",
  arguments: {
    city: "delhi",
    home: "leaky",
    commute: "bike",
    cooking: "lpg",
    actions: ["seal", "purifier"],
  },
});
const scoreData = JSON.parse(score.content[0].text);
check(
  !score.isError && scoreData.exposure?.percent_less_exposure > 0,
  "score_actions returns a reduction",
  `(${scoreData.exposure?.percent_less_exposure}% less)`,
);

const bad = await client.callTool({
  name: "score_actions",
  arguments: { city: "atlantis", home: "leaky", commute: "bike", cooking: "lpg" },
});
const failure = JSON.parse(bad.content[0].text).error;
check(
  bad.isError === true &&
    failure.code === "invalid_argument" &&
    failure.field === "city" &&
    failure.allowed.includes("delhi") &&
    failure.next_step,
  "a bad city returns a structured error with allowed values and a next step",
  `(${failure?.code}/${failure?.field})`,
);

await client.close();
process.exitCode = failed ? 1 : 0;
