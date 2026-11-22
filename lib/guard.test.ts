import { describe, expect, it } from "vitest";
import { allowedNumbers, extractNumbers, isGrounded, ungroundedNumbers, unsupportedClaims, verify } from "./guard";

const facts = { city: "Delhi", pm: 212.4, baselineCigs: 3.74, planCigs: 1.1, bestHour: "2 pm", options: [{ title: "Run a purifier", pct: 53, cigs: 1.9 }] };

describe("extractNumbers", () => {
  it("finds integers, decimals and thousands separators", () => {
    expect(extractNumbers("PM2.5 is 212 and 1,200 people, 3.7 cigarettes")).toEqual([2.5, 212, 1200, 3.7]);
  });
  it("ignores text without digits, and subscript characters", () => {
    expect(extractNumbers("CO₂ saved, no numbers here")).toEqual([]);
  });
});

describe("allowedNumbers", () => {
  it("collects numbers from values, nested objects and strings, plus honest roundings", () => {
    const a = allowedNumbers(facts);
    for (const n of [212.4, 212, 3.74, 3.7, 4, 2, 53, 1.9]) expect(a).toContain(n);
  });
  it("always allows the names PM2.5, N95 and MERV 13", () => {
    const a = allowedNumbers({});
    for (const n of [2.5, 95, 13]) expect(a).toContain(n);
  });
});

describe("isGrounded", () => {
  it("accepts text that only restates supplied numbers, including rounding", () => {
    expect(isGrounded("Right now PM2.5 is about 212, roughly 4 cigarettes a day. Open windows at 2 pm. A purifier cuts 53%.", facts)).toBe(true);
    expect(isGrounded("Wear an N95 mask.", facts)).toBe(true);
  });
  it("rejects an invented figure and names it", () => {
    const text = "A purifier cuts exposure by 80% and saves 7 cigarettes.";
    expect(isGrounded(text, facts)).toBe(false);
    expect(ungroundedNumbers(text, facts)).toEqual([80, 7]);
  });
  it("rejects a plausible but unsupplied number", () => {
    expect(isGrounded("Smog usually peaks around 6 am.", facts)).toBe(false);
  });
  it("accepts text with no numbers at all", () => {
    expect(isGrounded("Keep windows shut and run the purifier.", facts)).toBe(true);
  });
});

describe("unsupportedClaims", () => {
  it("flags the real failure seen in a live Gemini run: a supplied number misused as a population statistic", () => {
    const text = "This action reduces exposure by 2, and 53% of people choose it.";
    expect(isGrounded(text, facts)).toBe(true); // every number is real...
    expect(unsupportedClaims(text).length).toBeGreaterThan(0); // ...but the claim is not
  });
  it("flags citations of studies, experts and agencies", () => {
    expect(unsupportedClaims("Studies show purifiers help.")).toHaveLength(1);
    expect(unsupportedClaims("Experts recommend an N95.")).toHaveLength(1);
    expect(unsupportedClaims("The WHO says so.")).toHaveLength(1);
    expect(unsupportedClaims("ICMR guidelines state this.")).toHaveLength(1);
    expect(unsupportedClaims("AIIMS doctors recommend purifiers.")).toHaveLength(2);
    expect(unsupportedClaims("Most people pick the metro.")).toHaveLength(1);
  });
  it("lets ordinary advice through, including the word who in lowercase", () => {
    expect(unsupportedClaims("Anyone who is sensitive should keep windows shut. Wear an N95 and cut exposure by 53%.")).toEqual([]);
  });
});

describe("verify", () => {
  it("is ok only when numbers are grounded and no unsupported claim is made", () => {
    expect(verify("Run a purifier. It cuts 53% of your exposure.", facts).ok).toBe(true);
    expect(verify("A purifier cuts 80%.", facts)).toMatchObject({ ok: false, numbers: [80] });
    expect(verify("Studies show it works.", facts)).toMatchObject({ ok: false, numbers: [] });
  });
});

describe("Hindi and Devanagari digits", () => {
  const hiFacts = { city: "Delhi", pm: 212.4, baselineCigs: 3.74, planCigs: 1.1, bestHour: "2 pm", options: [{ title: "Run a purifier", pct: 53, cigs: 1.9 }] };
  it("reads Devanagari digits as numbers", () => {
    expect(extractNumbers("आज PM2.5 २१२ है और ५३% कम होगा, १,२०० लोग")).toEqual([2.5, 212, 53, 1200]);
    expect(extractNumbers("३.७ सिगरेट")).toEqual([3.7]);
  });
  it("accepts Hindi text whose numbers are supplied, in either digit script", () => {
    expect(isGrounded("आज हवा खराब है। PM2.5 २१२ है, यानी लगभग ४ सिगरेट। प्यूरीफायर से ५३% कमी होगी।", hiFacts)).toBe(true);
    expect(isGrounded("प्यूरीफायर से 53% कमी होगी।", hiFacts)).toBe(true);
  });
  it("rejects an invented number written in Devanagari digits", () => {
    expect(isGrounded("प्यूरीफायर से ८७% कमी होगी।", hiFacts)).toBe(false);
    expect(ungroundedNumbers("८७ और ५३", hiFacts)).toEqual([87]);
  });
  it("rejects Hindi citations and population statistics, including with Devanagari digits", () => {
    expect(unsupportedClaims("अध्ययन बताते हैं कि प्यूरीफायर काम करता है।")).toHaveLength(1);
    expect(unsupportedClaims("विशेषज्ञ N95 की सलाह देते हैं।")).toHaveLength(1);
    expect(unsupportedClaims("५३% लोग इसे चुनते हैं।")).toHaveLength(1);
    expect(unsupportedClaims("ज़्यादातर लोग मेट्रो लेते हैं।")).toHaveLength(1);
  });
  it("lets ordinary Hindi advice through", () => {
    expect(unsupportedClaims("खिड़कियाँ बंद रखें और प्यूरीफायर चलाएँ। बाहर जाते समय N95 पहनें।")).toEqual([]);
    expect(verify("खिड़कियाँ बंद रखें। प्यूरीफायर से ५३% कमी होगी।", hiFacts).ok).toBe(true);
  });
});
