import { vi } from "vitest";

/** Collects what the app logs (and keeps it out of the test output). Returns the collected lines. */
export function captureLog(lines: string[] = []): string[] {
  vi.spyOn(console, "info").mockImplementation((line: unknown) => {
    lines.push(String(line));
  });
  return lines;
}
