/** Browser sharing helpers: the share sheet where there is one, else the clipboard, else the link itself. */

/** How a link ended up being shared. "manual" means nothing automatic worked and the link should be shown for copying by hand. */
export type ShareResult = "shared" | "cancelled" | "copied" | "manual";

/** Shares a link: the native share sheet if present, else the clipboard, else tells the caller to show it. */
export async function shareOrCopy(title: string, url: string): Promise<ShareResult> {
  try {
    if (typeof navigator.share === "function") {
      await navigator.share({ title, url });
      return "shared";
    }
  } catch (e) {
    if ((e as Error).name === "AbortError") return "cancelled";
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "manual"; // clipboard blocked
  }
}

const REVOKE_AFTER_MS = 10_000;

/** Saves text as a file through a temporary link, then releases it. */
export function downloadTextFile(filename: string, content: string, type: string): void {
  const href = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), REVOKE_AFTER_MS);
}
