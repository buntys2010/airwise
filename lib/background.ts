/**
 * Starts a promise-returning task from an event handler or effect that cannot await it.
 * A failure is reported to the console instead of becoming an unhandled rejection.
 */
export function runInBackground(task: Promise<unknown>): void {
  task.catch((error: unknown) => console.error(error));
}
