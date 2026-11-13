export type Page = "dashboard" | "research" | "research-detail" | "records" | "import" | "quality" | "settings";

export const PAGES: Page[] = [
  "dashboard",
  "research",
  "research-detail",
  "records",
  "import",
  "quality",
  "settings",
];

export function isPage(value: string): value is Page {
  return (PAGES as string[]).includes(value);
}

/** URL hash — sahifa yangilanganda qaysi bo'limda qolishni saqlaydi. */
export function readPageFromHash(): Page {
  const hash = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  return isPage(hash) ? hash : "dashboard";
}

export function writePageToHash(page: Page): void {
  const next = `#/${page}`;
  if (window.location.hash !== next) window.history.replaceState(null, "", next);
}