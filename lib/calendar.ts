/**
 * A daily-reminder calendar file, built entirely on the device. AirWise stores nothing: the user's own calendar app does the reminding,
 * and the event links back to the app with the household's choices (never numbers).
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** iCalendar text escaping: backslash, semicolon, comma and newlines. */
export function icsEscape(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Folds a content line at 75 octets, as RFC 5545 requires, continuing with a single space. Splits on character boundaries. */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  const limit = 75;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > limit) {
      out.push(cur);
      cur = " ";
      bytes = 1;
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join("\r\n");
}

export interface ReminderOptions {
  /** The link back to the app (choices only). */
  url: string;
  /** Local time of day, 24 h. Default 07:00. */
  hour?: number;
  minute?: number;
  /** Used for the first occurrence and DTSTAMP. */
  now?: Date;
  title?: string;
  description?: string;
}

export function buildReminderIcs({
  url,
  hour = 7,
  minute = 0,
  now = new Date(),
  title = "Check today's air with AirWise",
  description,
}: ReminderOptions): string {
  // First occurrence is tomorrow, so the event never starts in the past. Floating local time: it fires at 7:00 wherever the phone is.
  const first = new Date(now.getTime() + 24 * 3600 * 1000);
  const day = `${first.getFullYear()}${pad(first.getMonth() + 1)}${pad(first.getDate())}`;
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const desc = description ?? `Open AirWise to see today's air and your plan: ${url}`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AirWise//Morning reminder//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:airwise-morning-${stamp}@airwise`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${day}T${pad(hour)}${pad(minute)}00`,
    `DTEND:${day}T${pad(hour)}${pad(minute + 15 > 59 ? 59 : minute + 15)}00`,
    "RRULE:FREQ=DAILY",
    `SUMMARY:${icsEscape(title)}`,
    `DESCRIPTION:${icsEscape(desc)}`,
    `URL:${url.replace(/[\r\n\0]/g, "")}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(title)}`,
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
