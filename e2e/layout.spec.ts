import { expect, test, type Page } from "@playwright/test";
import { CITIES as ALL } from "../lib/cities";

/** Layout checks that only a real browser can make: overlap, clipping, sizes and motion. Network stubbed. */
const CITIES = [
  ["delhi", "Delhi", 28.65, 77.31], ["lucknow", "Lucknow", 26.85, 80.99], ["kolkata", "Kolkata", 22.52, 88.36],
  ["mumbai", "Mumbai", 19.07, 72.87], ["pune", "Pune", 18.53, 73.85], ["bengaluru", "Bengaluru", 12.92, 77.62],
] as const;
const day = (base: number) => Array.from({ length: 24 }, (_, h) => Math.round(base + 60 * Math.exp(-(((h - 7) / 3) ** 2)) + 30 * Math.exp(-(((h - 20) / 3) ** 2))));

async function stub(page: Page, pms = [74, 43, 17, 27, 27, 40], estimate = new Set<string>()) {
  await page.route("**/air-quality-api.open-meteo.com/**", (r) => r.fulfill({ json: { hourly: { pm2_5: day(70) } } }));
  await page.route("**/api.open-meteo.com/**", (r) => r.fulfill({ json: { current: { temperature_2m: 14, wind_speed_10m: 5 } } }));
  await page.route("**/api/map", (r) => r.fulfill({ json: { points: ALL.map((c, i) => ({ id: c.id, name: c.name, state: c.state, lat: c.lat, lon: c.lon, pm: pms[i] ?? 20 + ((i * 37) % 170), source: estimate.has(c.id) ? "estimate" : "live" })), hour: 16, time: "16:00", live: ALL.length - estimate.size } }));
}

test.describe("map layout", () => {
  for (const width of [390, 360, 1280]) {
    test(`at ${width}px no two labels overlap, and the text is a readable size`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await stub(page, [74, 43, 17, 27, 27, 40], new Set(["pune"])); // Pune's longer "· Estimate" label is the hardest case
      await page.goto("/map");
      await expect(page.getByRole("img", { name: /Schematic map of India/ })).toBeVisible();
      const boxes = await page.evaluate(() =>
        [...document.querySelectorAll<SVGTextElement>("svg.mapsvg text.map-name, svg.mapsvg text.map-val")].map((t) => {
          const r = t.getBoundingClientRect();
          return { city: t.parentElement?.getAttribute("data-city") ?? "", text: t.textContent ?? "", l: r.left, r: r.right, t: r.top, b: r.bottom, h: r.height };
        }));
      expect(boxes).toHaveLength(ALL.filter((c) => c.label).length * 2);
      const clash: string[] = [];
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        if (a.city === b.city) continue; // a city's own name and value lines are stacked on purpose
        if (a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1) clash.push(`${a.city}:${a.text} / ${b.city}:${b.text}`);
      }
      expect(clash).toEqual([]);
      for (const b of boxes) expect(b.h, b.text).toBeGreaterThanOrEqual(width < 500 ? 10 : 12); // value text is the smaller line
    });
  }

  test("each dot and its label stay inside the map panel (nothing is cut off)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await stub(page, [74, 43, 17, 27, 27, 40], new Set(["pune"]));
    await page.goto("/map");
    await expect(page.getByRole("img", { name: /Schematic map of India/ })).toBeVisible();
    const outside = await page.evaluate(() => {
      const svg = document.querySelector("svg.mapsvg")!.getBoundingClientRect();
      return [...document.querySelectorAll<SVGGraphicsElement>("svg.mapsvg g[data-city]")].filter((g) => {
        const r = g.getBoundingClientRect();
        return r.left < svg.left - 1 || r.right > svg.right + 1 || r.top < svg.top - 1 || r.bottom > svg.bottom + 1;
      }).map((g) => g.getAttribute("data-city"));
    });
    expect(outside).toEqual([]);
  });

  for (const width of [390, 360]) {
    test(`at ${width}px the text table fits: no clipped cell and no sideways scroll needed`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await stub(page, [74, 130, 17, 220, 27, 40]); // include long level names like "Poor for sensitive groups"
      await page.goto("/map");
      await expect(page.getByRole("table")).toBeVisible();
      const m = await page.evaluate(() => {
        const wrap = document.querySelector<HTMLElement>(".tablewrap")!;
        const clipped = [...wrap.querySelectorAll<HTMLElement>("th, td, .cat")].filter((c) => c.scrollWidth > c.clientWidth + 1).map((c) => c.textContent?.trim());
        return { wrapScroll: wrap.scrollWidth - wrap.clientWidth, clipped, page: document.documentElement.scrollWidth - window.innerWidth };
      });
      expect(m.clipped).toEqual([]);
      expect(m.wrapScroll).toBeLessThanOrEqual(1);
      expect(m.page).toBeLessThanOrEqual(1);
      await expect(page.getByRole("region", { name: "The same data as a table" })).toBeVisible(); // a labelled, focusable region
    });
  }
});

test.describe("cigarette row", () => {
  test("fits the dial at 390px, with the same figures as readable text", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await stub(page);
    await page.goto("/?city=delhi");
    const dial = page.getByRole("group", { name: /daily exposure/i });
    await dial.scrollIntoViewIfNeeded();
    const fit = await page.evaluate(() => {
      const panel = document.querySelector<HTMLElement>(".dial")!.getBoundingClientRect();
      const svg = document.querySelector<SVGElement>(".dial .cigs")!.getBoundingClientRect();
      return { svgRight: svg.right, panelRight: panel.right, overflowX: document.documentElement.scrollWidth - window.innerWidth };
    });
    expect(fit.svgRight).toBeLessThanOrEqual(fit.panelRight + 1);
    expect(fit.overflowX).toBeLessThanOrEqual(1);
    await expect(dial.getByText(/^So far today \(to/).first()).toBeVisible();
    await expect(dial.getByText(/Cigarettes equivalent is a rule of thumb/)).toBeVisible();
  });

  test("burns and shortens over about 1.4 s, and shows the end state with no motion under reduced motion", async ({ page }) => {
    await stub(page);
    await page.goto("/?city=delhi");
    const dur = () => page.evaluate(() => getComputedStyle(document.querySelector(".cigs rect.cig-body")!).transitionDuration);
    expect(await dur()).toContain("1.4s");
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await dur()).toMatch(/^0s(, 0s)*$/);
  });

  test("applying a fix shortens the cigarettes and lowers the so-far figure", async ({ page }) => {
    await stub(page);
    await page.goto("/?city=delhi");
    const body = () => page.evaluate(() => [...document.querySelectorAll<SVGRectElement>(".cigs rect.cig-body")].reduce((a, r) => a + parseFloat(r.style.height || "0"), 0));
    await expect.poll(body).toBeGreaterThan(0);
    const sofar = () => page.locator(".cigtext .sr-only").textContent();
    const before = await sofar();
    const heightBefore = await body();
    await page.getByRole("button", { name: /^Fix 3:/ }).click();
    await expect.poll(body, { timeout: 5000 }).toBeLessThan(heightBefore);
    expect(await sofar()).not.toBe(before);
  });
});

test.describe("city strip", () => {
  for (const width of [360, 390]) {
    test(`at ${width}px the city cigarette row and figures fit, and the city picker finds a city by typing`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await stub(page);
      await page.goto("/?city=delhi");
      const strip = page.locator(".citycigs");
      await expect(strip.getByText(/Outdoors all day here: about [0-9.]+ cigarettes/).first()).toBeVisible();
      const fit = await page.evaluate(() => {
        const r = document.querySelector<HTMLElement>(".citycigs")!.getBoundingClientRect();
        const svg = document.querySelector<SVGElement>(".citycigs .cigs")!.getBoundingClientRect();
        const text = document.querySelector<HTMLElement>(".citycigs p")!.getBoundingClientRect();
        return { right: r.right, svgRight: svg.right, textRight: text.right, vw: window.innerWidth, overflowX: document.documentElement.scrollWidth - window.innerWidth, svgH: svg.height };
      });
      expect(fit.overflowX).toBeLessThanOrEqual(1);
      expect(fit.svgRight).toBeLessThanOrEqual(fit.vw);
      expect(fit.textRight).toBeLessThanOrEqual(fit.vw);
      expect(fit.svgH).toBeLessThan(80);
      const box = page.getByRole("combobox", { name: "City" });
      await box.click();
      await box.fill("varan");
      await page.getByRole("option", { name: /Varanasi/ }).click();
      await expect(box).toHaveValue("Varanasi");
      await expect(page.getByText(/Outdoors all day here/).first()).toBeVisible();
    });
  }
});
