import { expect, type Page, test } from "@playwright/test";

/**
 * Accessibility scans in a real browser. The jsdom scans in the unit tests cannot check colour contrast or
 * real layout, so this runs axe-core (WCAG 2.0/2.1 A and AA) against each page, with the network stubbed.
 */
const axePath = require.resolve("axe-core/axe.min.js");
const PAGES = ["/", "/community", "/map", "/guide"] as const;

interface AxeViolation {
  id: string;
  impact: string | null;
  nodes: { target: unknown[] }[];
}
interface AxeResult {
  violations: AxeViolation[];
}

async function scan(page: Page): Promise<AxeViolation[]> {
  await page.addScriptTag({ path: axePath });
  const result = await page.evaluate(async (): Promise<AxeResult> => {
    const axe = (window as unknown as { axe: { run: (c: Document, o: object) => Promise<AxeResult> } }).axe;
    return axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    });
  });
  return result.violations;
}

test.beforeEach(async ({ page }) => {
  await page.route("**/air-quality-api.open-meteo.com/**", (r) =>
    r.fulfill({ json: { hourly: { pm2_5: Array.from({ length: 24 }, (_, h) => 60 + h) } } }),
  );
  await page.route("**/api.open-meteo.com/**", (r) =>
    r.fulfill({ json: { current: { temperature_2m: 14, wind_speed_10m: 5 } } }),
  );
});

for (const path of PAGES) {
  test(`${path} has no axe violations (including colour contrast)`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const violations = await scan(page);
    const summary = violations.map(
      (v) => `${v.id} (${v.impact}) x${v.nodes.length}: ${JSON.stringify(v.nodes[0]?.target)}`,
    );
    expect(summary).toEqual([]);
  });
}
