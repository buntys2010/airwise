/** The one place the app writes a log line: a single structured JSON line on the console. */
export function logLine(line: string): void {
  console.info(line);
}
