/** Client-safe game configuration. Never put secrets here. */

// Vite only injects environment values into modules that literally reference
// `import.meta.env`; reaching it through a variable (as before) left every
// VITE_* setting undefined, so the defaults always won. Outside Vite (node
// tests) import.meta.env doesn't exist, hence the typeof guard.
const VITE_ENV: Record<string, string | undefined> =
  typeof import.meta.env !== "undefined" ? (import.meta.env as Record<string, string | undefined>) : {};

function env(name: string): string | undefined {
  const value = VITE_ENV[name];
  return typeof value === "string" && value !== "" ? value : undefined;
}

function bool(name: string, fallback: boolean): boolean {
  const v = env(name);
  if (v == null || v === "") return fallback;
  return v === "1" || v.toLowerCase() === "true";
}

export const GAME_BUILD_VERSION = env("VITE_GAME_BUILD_VERSION") ?? "0.9.7";
export const GAME_TITLE = "$ackReligious: Memphis";

export const STORE_BASE_URL = (env("VITE_STORE_BASE_URL") ?? "https://10letters.store").replace(/\/$/, "");
/** Public store floor. Never a Lovable preview address. */
export const PUBLIC_STORE_PAGE = "https://10letters.store/store";
export const PRODUCT_CATALOG_URL = env("VITE_PRODUCT_CATALOG_URL") ?? "/config/store-products.json";
export const ALLOWED_PARENT_ORIGIN = env("VITE_ALLOWED_PARENT_ORIGIN") ?? "";
export const ANALYTICS_ENABLED = bool("VITE_ANALYTICS_ENABLED", true);

export function storeProductUrl(slugOrPath: string): string {
  if (/^https?:\/\//i.test(slugOrPath)) return slugOrPath;
  const path = slugOrPath.startsWith("/") ? slugOrPath : `/product/${slugOrPath}`;
  return STORE_BASE_URL ? `${STORE_BASE_URL}${path}` : path;
}

export function isEmbedded(): boolean {
  try {
    return typeof window !== "undefined" && window.parent !== window;
  } catch {
    return false;
  }
}
