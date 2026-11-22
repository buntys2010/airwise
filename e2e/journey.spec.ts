import { expect, test, type Page } from "@playwright/test";

/**
 * The core journey in a real browser, with the network stubbed so it is deterministic and works offline:
 * open the sample room, fix things, ask, switch language, visit the other pages.
 */
const CITIES = [
  ["delhi", "Delhi", 28.65, 77.31],
  ["lucknow", "Lucknow", 26.85, 80.99],
  ["kolkata", "Kolkata", 22.52, 88.36],
  ["mumbai", "Mumbai", 19.07, 72.87],
  ["pune", "Pune", 18.53, 73.85],
  ["bengaluru", "Bengaluru", 12.92, 77.62],
] as const;
const day = (base: number) =>
  Array.from({ length: 24 }, (_, h) =>
    Math.round(base + 60 * Math.exp(-(((h - 7) / 3) ** 2)) + 30 * Math.exp(-(((h - 20) / 3) ** 2))),
  );

async function stub(page: Page, opts: { airDown?: boolean } = {}) {
  await page.route("**/air-quality-api.open-meteo.com/**", (r) =>
    opts.airDown ? r.abort() : r.fulfill({ json: { hourly: { pm2_5: day(70) } } }),
  );
  await page.route("**/api.open-meteo.com/**", (r) =>
    opts.airDown
      ? r.abort()
      : r.fulfill({ json: { current: { temperature_2m: 14, wind_speed_10m: 5 } } }),
  );
  await page.route("**/api/chat", (r) =>
    r.fulfill({
      json: { answer: "Wear a fitted N95 for any trip outside.", source: "gemini", verified: true },
    }),
  );
  await page.route("**/api/map", (r) =>
    r.fulfill({
      json: {
        points: CITIES.map(([id, name, lat, lon], i) => ({
          id,
          name,
          lat,
          lon,
          pm: 40 + i * 35,
          source: i === 4 ? "estimate" : "live",
        })),
        hour: 16,
        time: "16:00",
        live: 5,
      },
    }),
  );
}

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource|net::ERR/.test(m.text()))
      errors.push(m.text());
  });
  return errors;
}

const haze = (page: Page) =>
  page.evaluate(() => Number(document.documentElement.style.getPropertyValue("--haze")));

test.describe("core journey", () => {
  test("opens on the sample room, and tapping the hotspots lowers the dial and clears the haze", async ({
    page,
  }) => {
    const errors = trackErrors(page);
    await stub(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Today's air is");
    await expect(page.getByText("Sample room")).toBeVisible();
    await expect(
      page.getByRole("status").filter({ hasText: /Live air data, updated/ }),
    ).toBeVisible();

    const before = await haze(page);
    const dial = page.getByRole("group", { name: /daily exposure/i });
    const after = dial.locator(".dialafter");
    const startLabel = await after.getAttribute("aria-label");

    await page.getByRole("button", { name: /^Fix 1:/ }).click();
    await page.getByRole("button", { name: /^Fix 3:/ }).click();
    await expect(page.getByRole("button", { name: /^Fix 1:/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("button", { name: "Done" })).toHaveCount(2);
    expect(await after.getAttribute("aria-label")).not.toBe(startLabel);
    expect(parseFloat((await after.getAttribute("aria-label")) ?? "9")).toBeLessThan(
      parseFloat(startLabel ?? "0"),
    );
    expect(await haze(page)).toBeLessThan(before * 0.75); // the haze visibly clears
    expect(errors).toEqual([]);
  });

  test("asks a question and shows the verified answer", async ({ page }) => {
    await stub(page);
    await page.goto("/");
    await page.getByRole("button", { name: /Co-pilot/ }).click();
    await page.getByLabel("Ask AirWise a question").fill("Do I need a mask?");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Wear a fitted N95 for any trip outside.")).toBeVisible();
    await expect(page.getByText(/Answered by Gemini, with every number checked/)).toBeVisible();
  });

  test("switches to Hindi, keeps it after a reload, and switches back", async ({ page }) => {
    await stub(page);
    await page.goto("/");
    await page.getByRole("button", { name: "हिन्दी" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("आज हवा");
    await expect(page.locator("html")).toHaveAttribute("lang", "hi");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "hi");
    await page.getByRole("button", { name: "English" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("an unreachable air feed is labelled an offline estimate and the plan still works", async ({
    page,
  }) => {
    await stub(page, { airDown: true });
    await page.goto("/");
    await expect(page.getByText(/Offline estimate/)).toBeVisible();
    await page.getByRole("button", { name: /^Fix 1:/ }).click();
    await expect(page.getByRole("button", { name: /^Fix 1:/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("every main navigation link opens a real page", async ({ page }) => {
    const errors = trackErrors(page);
    await stub(page);
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main" });
    for (const [name, heading] of [
      ["Community", "Community plan"],
      ["Map", "Air across cities, right now"],
      ["Guide", "How to use AirWise"],
    ] as const) {
      await nav.getByRole("link", { name }).click();
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(nav.getByRole("link", { name })).toHaveAttribute("aria-current", "page");
    }
    await nav.getByRole("link", { name: "Plan" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Today's air is");
    expect(errors).toEqual([]);
  });

  test("the map shows a labelled estimate for the one city that failed, and a table", async ({
    page,
  }) => {
    await stub(page);
    await page.goto("/map");
    await expect(page.getByRole("img", { name: /Schematic map of India/ })).toBeVisible();
    const row = page.getByRole("row", { name: /Pune/ });
    await expect(row).toContainText("Estimate");
    await expect(page.getByRole("row", { name: /Delhi/ })).toContainText("Live");
  });

  test("the community page builds a printable notice", async ({ page }) => {
    await stub(page);
    await page.goto("/community");
    await expect(page.locator("#community-plan")).toContainText("Every household can");
    await page.getByLabel("Building, school or workplace name (optional)").fill("Gomti Heights");
    await expect(
      page.getByRole("heading", { level: 2, name: "Smog plan for Gomti Heights" }),
    ).toBeVisible();
    await page.emulateMedia({ media: "print" });
    await expect(page.locator("#community-plan")).toBeVisible();
    await expect(page.getByRole("button", { name: "Print this notice" })).toBeHidden();
  });

  test("the app can be installed: the manifest and icons are served", async ({ request }) => {
    const manifest = await request.get("/manifest.webmanifest");
    expect(manifest.ok()).toBe(true);
    const m = await manifest.json();
    expect(m.display).toBe("standalone");
    for (const icon of m.icons) {
      const res = await request.get(icon.src);
      expect(res.ok(), icon.src).toBe(true);
      expect(res.headers()["content-type"]).toMatch(/image\/png/);
    }
  });
});

test.describe("phone, 390 x 844", () => {
  test.skip(({ viewport }) => !viewport || viewport.width > 500, "phone project only");

  test("the bottom bar never hides a focused control", async ({ page }) => {
    await stub(page);
    await page.goto("/");
    const bar = page.getByRole("navigation", { name: "Sections" });
    await expect(bar).toBeVisible();
    const box = await bar.boundingBox();
    expect(box && box.y + box.height).toBeGreaterThan(800); // it is at the bottom, as designed
    const seen = new Set<string>();
    const obscured: string[] = [];
    for (let i = 0; i < 90; i++) {
      await page.keyboard.press("Tab");
      // Wait for any smooth scrolling to finish: what matters is where the control ends up, not where it is mid-scroll.
      await page.evaluate(
        () =>
          new Promise<void>((done) => {
            let last = -1,
              same = 0;
            const tick = () => {
              const y = window.scrollY;
              if (y === last) {
                if (++same >= 4) return done();
              } else {
                same = 0;
                last = y;
              }
              requestAnimationFrame(tick);
            };
            tick();
          }),
      );
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        const navEl = document.querySelector("nav.dock") as HTMLElement | null;
        if (!el || !navEl || el === document.body) return null;
        const r = el.getBoundingClientRect(),
          n = navEl.getBoundingClientRect();
        const inside = navEl.contains(el);
        const hidden =
          !inside && r.bottom > n.top && r.top < n.bottom && r.right > n.left && r.left < n.right;
        const id = `${el.tagName}:${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 28)}`;
        return { id, hidden };
      });
      if (!info) continue;
      seen.add(info.id);
      if (info.hidden) obscured.push(info.id);
    }
    expect(seen.size).toBeGreaterThan(25);
    expect(obscured).toEqual([]);
  });

  test("the end of the page can be read above the bar", async ({ page }) => {
    await stub(page);
    await page.goto("/");
    await page.evaluate(() =>
      window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }),
    );
    const footer = page.locator("footer").last();
    const fb = await footer.boundingBox();
    const nb = await page.getByRole("navigation", { name: "Sections" }).boundingBox();
    expect(fb && nb && fb.y + fb.height).toBeLessThanOrEqual((nb?.y ?? 0) + 1);
  });

  test("the chat controls fit the screen: input on its own row, labelled buttons, 44 px targets, nothing sideways", async ({
    page,
  }) => {
    await stub(page);
    await page.goto("/");
    await page.getByRole("button", { name: /Co-pilot/ }).click();
    const input = page.getByLabel("Ask AirWise a question");
    await input.scrollIntoViewIfNeeded();
    const ib = await input.boundingBox();
    expect(ib!.width).toBeGreaterThan(280);
    for (const name of ["Send", "Add a photo of your room"]) {
      const b = await page.getByRole("button", { name }).first().boundingBox();
      expect(b!.height, name).toBeGreaterThanOrEqual(43.5);
      expect(b!.y, name).toBeGreaterThan(ib!.y + ib!.height - 1); // the buttons are on the row below the input
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
