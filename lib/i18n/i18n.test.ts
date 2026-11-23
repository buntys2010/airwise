import { describe, expect, it } from "vitest";

import { categoryOf } from "../engine/aqi";
import { unsupportedClaims } from "../guard";
import { EN } from "./en";
import { HI } from "./hi";
import {
  ADVICE_KEY,
  CATEGORY_KEY,
  DICTS,
  englishIn,
  type Key,
  placeholders,
  SPEECH_LANG,
  t,
} from "./index";

const keys = Object.keys(EN) as Key[];
const DEVANAGARI = /[ऀ-ॿ]/u;
/** Hindi entries that are deliberately Latin: the language buttons' own codes and brand or unit terms. */
const LATIN_OK = new Set<Key>([
  "lang.en",
  "lang.enName",
  "strip.aqi",
  "share.h",
  "share.city",
  "share.btn",
  "share.title",
  "pill.cook.lpg",
  "map.pm",
]);

describe("dictionary parity", () => {
  it("English and Hindi have exactly the same keys", () => {
    expect(Object.keys(HI).sort()).toEqual(Object.keys(EN).sort());
  });
  it("no entry is empty, in either language", () => {
    for (const k of keys) {
      expect(EN[k].trim(), k).not.toBe("");
      expect(HI[k].trim(), k).not.toBe("");
    }
  });
  it("placeholders match between languages, so a value is never dropped", () => {
    for (const k of keys) expect(placeholders(HI[k]), k).toEqual(placeholders(EN[k]));
  });
  it("Hindi entries are really Devanagari (except the few deliberate Latin ones)", () => {
    for (const k of keys)
      if (!LATIN_OK.has(k)) expect(DEVANAGARI.test(HI[k]), `${k}: ${HI[k]}`).toBe(true);
  });
  it("Hindi text uses ASCII digits, so screen readers, the guard and the numbers on screen agree", () => {
    for (const k of keys) expect(/[०-९]/u.test(HI[k]), k).toBe(false);
  });
  it("our own text, in both languages, makes no unsupported attribution (studies, experts, population statistics)", () => {
    for (const k of keys) {
      expect(unsupportedClaims(HI[k]), `hi ${k}`).toEqual([]);
      expect(unsupportedClaims(EN[k]), `en ${k}`).toEqual([]);
    }
  });
});

describe("t()", () => {
  it("fills placeholders in either language", () => {
    expect(t("en", "room.found", { n: 2 })).toMatch(/^Found 2 in your photo\./);
    expect(t("hi", "room.found", { n: 2 })).toMatch(/^आपकी फ़ोटो में 2 मिले।/u);
  });
  it("leaves an unknown placeholder visible instead of printing undefined", () => {
    expect(t("en", "room.found")).toContain("{n}");
    expect(t("en", "room.found", { x: 1 })).toContain("{n}");
  });
  it("returns plain text when there is nothing to fill", () => {
    expect(t("en", "nav.plan")).toBe("Plan");
    expect(t("hi", "nav.plan")).toBe("योजना");
  });
  it("both dictionaries are registered", () => {
    expect(DICTS.en).toBe(EN);
    expect(DICTS.hi).toBe(HI);
  });
});

describe("severity and advice tables", () => {
  it("cover every tone the engine can produce, with a real key for each", () => {
    for (const pm of [5, 20, 45, 100, 200, 300, 450]) {
      const tone = categoryOf(pm).tone;
      expect(keys).toContain(CATEGORY_KEY[tone]);
      expect(keys).toContain(ADVICE_KEY[tone]);
    }
    expect(Object.keys(CATEGORY_KEY)).toHaveLength(6);
  });
});

describe("speech locales", () => {
  it("maps languages to Indian-English and Hindi speech locales", () => {
    expect(SPEECH_LANG).toEqual({ en: "en-IN", hi: "hi-IN" });
  });
  it("marks English text inside a Hindi page with lang=en, and does nothing for English", () => {
    expect(englishIn("hi")).toEqual({ lang: "en" });
    expect(englishIn("en")).toEqual({});
  });
});
