import { describe, expect, it } from "vitest";
import { buildReminderIcs, foldLine, icsEscape } from "./calendar";

const now = new Date("2026-11-22T12:00:00Z");
const url = "https://airwise.example/?city=lucknow&home=leaky&commute=bike&km=8&cooking=lpg&vulnerable=1";
const unfold = (s: string) => s.replace(/\r\n /g, "");
const lines = (s: string) => unfold(s).split("\r\n").filter(Boolean);

describe("icsEscape", () => {
  it("escapes backslash, semicolon, comma and newlines", () => {
    expect(icsEscape("a;b,c\\d\ne")).toBe("a\\;b\\,c\\\\d\\ne");
  });
});

describe("foldLine", () => {
  it("never leaves a physical line over 75 octets, even with multi-byte Hindi text", () => {
    const text = "SUMMARY:" + "आज हवा कैसी है? ".repeat(20);
    const folded = foldLine(text);
    const enc = new TextEncoder();
    for (const physical of folded.split("\r\n")) expect(enc.encode(physical).length).toBeLessThanOrEqual(75);
    expect(unfold(folded)).toBe(text);
  });
  it("leaves short lines alone", () => expect(foldLine("BEGIN:VCALENDAR")).toBe("BEGIN:VCALENDAR"));
});

describe("buildReminderIcs", () => {
  const ics = buildReminderIcs({ url, now });
  const all = lines(ics);
  it("is a well-formed calendar with CRLF line endings", () => {
    expect(all[0]).toBe("BEGIN:VCALENDAR");
    expect(all.at(-1)).toBe("END:VCALENDAR");
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    expect(all.filter((l) => l.startsWith("BEGIN:")).length).toBe(all.filter((l) => l.startsWith("END:")).length);
    expect(all).toContain("BEGIN:VEVENT");
    expect(all).toContain("VERSION:2.0");
  });
  it("repeats daily at 07:00 local time starting tomorrow, so it never starts in the past", () => {
    expect(all).toContain("RRULE:FREQ=DAILY");
    expect(all).toContain("DTSTART:20261123T070000");
    expect(all).toContain("DTEND:20261123T071500");
  });
  it("links back to the app with choices only", () => {
    expect(all).toContain(`URL:${url}`);
    expect(all.find((l) => l.startsWith("DESCRIPTION:"))).toContain("airwise.example");
    expect(ics).not.toMatch(/cigarette|µg|exposure/i);
  });
  it("has a display alarm at the start time", () => {
    expect(all).toContain("BEGIN:VALARM");
    expect(all).toContain("TRIGGER:PT0M");
  });
  it("gives each file a unique-looking id and a UTC timestamp", () => {
    expect(all.find((l) => l.startsWith("UID:"))).toMatch(/^UID:airwise-morning-\d{8}T\d{6}Z@airwise$/);
    expect(all).toContain("DTSTAMP:20261122T120000Z");
  });
  it("cannot be broken by a hostile URL or title", () => {
    const evil = buildReminderIcs({ url: "https://x.test/?a=1\r\nEND:VCALENDAR\r\nBEGIN:EVIL", title: "x\r\nEND:VEVENT", now });
    expect(lines(evil).filter((l) => l === "END:VCALENDAR")).toHaveLength(1);
    expect(lines(evil).filter((l) => l === "END:VEVENT")).toHaveLength(1);
    expect(lines(evil).some((l) => l.startsWith("BEGIN:EVIL"))).toBe(false);
  });
  it("accepts another time of day", () => {
    expect(lines(buildReminderIcs({ url, now, hour: 6, minute: 30 }))).toContain("DTSTART:20261123T063000");
  });
});
