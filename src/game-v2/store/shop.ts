/**
 * In-game shop for $ackReligious Klothing Kompany (10letters.store).
 *
 * Embedded in the store's /arcade page, the game shows the store's own catalog
 * (SR_CATALOG), the player picks a REAL size and a quantity, and the game asks
 * the store to add it to the store's kart (GG_ADD_TO_CART). "Added" is shown
 * only after the store's SR_ACK says ok. Prices always come from the store.
 *
 * Standalone (not embedded) there is no kart to add to, so the shop shows the
 * real catalog from the store's game bridge (names and USD prices, refreshed
 * whenever the store sends SR_CATALOG) and links out to the store, or drafts a
 * "contact to purchase" email. Neither is an order or a payment.
 */

export const STORE_ORIGIN = "https://10letters.store";
export const STORE_SHOP_URL = `${STORE_ORIGIN}/shop`;
export const STORE_EMAIL = "SackReligiousKlothingKompany@gmail.com";

export type ShopItem = {
  id: string;
  name: string;
  price: number;
  sizes: string[];
  image: string | null;
  zone: string;
  available: boolean;
};

/**
 * The store's game-bridge catalog (exact bridge IDs + USD prices) as of the
 * owner's handoff. Used only until the store sends SR_CATALOG. Sizes are left
 * empty on purpose: without the store, nothing can be added to a kart.
 */
const PHOTOS = new Set([
  "tee-og-logo",
  "tee-amerika",
  "tee-limited-graphik",
  "jersey-blue",
  "jersey-nco",
]);

export const BRIDGE_CATALOG: ShopItem[] = (
  [
    ["tee-og-logo", "OG Logo Tee", 45, "tees"],
    ["tee-pretty-girls", "Pretty Girls Love $ackReligious Tee", 55, "tees"],
    ["tee-amerika", "$ackReligious Of Amerika Tee", 55, "tees"],
    ["tee-limited-graphik", "$ackReligious Limited Graphik Tee", 65, "tees"],
    ["hoodie-og", "OG Hoodie", 60, "hoodies"],
    ["hoodie-pretty-girls", "Pretty Girls Love $ackReligious Hoodie", 65, "hoodies"],
    ["hoodie-amerika", "$ackReligious Of Amerika Hoodie", 65, "hoodies"],
    ["bottoms-nylon-shorts", "Sack Chaser Nylon Shorts", 65, "bottoms"],
    ["bottoms-sweats", "Sack Chaser Sweats", 70, "bottoms"],
    ["jersey-blue", "Sackreligious Blue Jersey", 165, "jerseys"],
    ["jersey-nco", "NCO Authentic Jersey", 165, "jerseys"],
    ["jersey-basketball", "Authentic Basketball Jersey", 165, "jerseys"],
    ["jersey-football", "Authentic Football Jersey", 165, "jerseys"],
    ["jersey-baseball", "Authentic Baseball Jersey", 165, "jerseys"],
    ["jersey-hockey", "Authentic Hockey Jersey", 165, "jerseys"],
    ["jacket-sublimation", "Sublimation Jacket", 135, "jackets"],
    ["jacket-embroidery", "Embroidery Jacket", 185, "jackets"],
    ["jacket-letterman", "Letterman Jacket", 260, "jackets"],
    ["acc-socks", "$ackReligious Socks", 15, "accessories"],
    ["acc-hat-namebrand", "Name Brand Hat", 40, "accessories"],
    ["acc-hat-oglogo", "OG Logo Hat", 40, "accessories"],
    ["acc-bank-sack", "Bank Sack", 25, "accessories"],
    ["acc-money-gun", "Money Gun w/ 10 Sack Bucks", 65, "accessories"],
    ["acc-sack-kounter", "$ackReligious Sack Kounter", 325, "accessories"],
  ] as const
).map(([id, name, price, zone]) => ({
  id,
  name,
  price,
  // Sizes from the store's own game catalog (asset handoff, 2026-10-26).
  sizes: zone === "accessories" ? ["One Size"] : ["S", "M", "L", "XL", "2XL"],
  // Real product photos the store's admin assigns to this item (5 of 24 so far); none are invented.
  image: PHOTOS.has(id) ? `/game-v2/store/products/${id}-front.webp` : null,
  zone,
  // The Authentic Basketball Jersey is still a DRAFT in the store's admin, so the game won't offer it.
  available: id !== "jersey-basketball",
}));

/** Back views for the items that have them (the same five photographed items). */
export function backImage(id: string): string | null {
  return PHOTOS.has(id) ? `/game-v2/store/products/${id}-back.webp` : null;
}

/** Validate a store catalog item; anything malformed is dropped, never guessed. */
export function parseCatalog(raw: unknown, storeOrigin = STORE_ORIGIN): ShopItem[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: ShopItem[] = [];
  for (const r of list) {
    if (!r || typeof r !== "object") continue;
    const p = r as Record<string, unknown>;
    const id = typeof p.id === "string" ? p.id.trim() : "";
    const name = typeof p.name === "string" ? p.name.trim() : "";
    const price =
      typeof p.price === "number" && Number.isFinite(p.price) && p.price >= 0 ? p.price : NaN;
    if (!id || !name || Number.isNaN(price)) continue;
    const sizes = Array.isArray(p.sizes)
      ? p.sizes
          .filter((s): s is string => typeof s === "string" && s.trim() !== "")
          .map((s) => s.trim())
      : [];
    const rawImage =
      typeof p.imageUrl === "string" && p.imageUrl
        ? p.imageUrl
        : typeof p.image === "string" && p.image
          ? p.image
          : "";
    out.push({
      id,
      name,
      price,
      sizes,
      image: rawImage ? resolveImage(rawImage, storeOrigin) : null,
      zone: typeof p.zone === "string" ? p.zone : "shop",
      available: p.available !== false,
    });
  }
  return out;
}

/** Relative store images resolve against the STORE's origin, not the game's. */
export function resolveImage(path: string, storeOrigin = STORE_ORIGIN): string | null {
  try {
    const url = new URL(path, storeOrigin + "/");
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

export type Selection = { id: string; size: string | null; qty: number };

/** A purchase request is valid only with a real size the store lists and 1–10 units. */
export function validateSelection(item: ShopItem | undefined, sel: Selection): string | null {
  if (!item) return "Pick an item.";
  if (!item.available) return "That item isn't available right now.";
  if (!sel.size) return "Pick a size.";
  if (!item.sizes.includes(sel.size)) return "That size isn't offered for this item.";
  if (!Number.isInteger(sel.qty) || sel.qty < 1 || sel.qty > 10) return "Quantity must be 1 to 10.";
  return null;
}

export function addToKartPayload(sel: Selection) {
  return {
    productId: sel.id,
    size: sel.size!,
    qty: Math.max(1, Math.min(10, Math.round(sel.qty))),
  };
}

/** Pending add-to-kart requests, resolved only by the store's acknowledgement. */
export type KartRequest = {
  id: string;
  size: string;
  qty: number;
  state: "pending" | "added" | "failed";
  error?: string;
};

export function applyAck(
  req: KartRequest | null,
  ack: { forType?: string; type?: string; ok?: boolean; error?: string },
): KartRequest | null {
  if (!req || req.state !== "pending") return req;
  const kind = ack.forType ?? ack.type;
  if (kind !== "GG_ADD_TO_CART") return req;
  return ack.ok === true
    ? { ...req, state: "added" }
    : { ...req, state: "failed", error: ack.error || "The store couldn't add that." };
}

/** A pre-filled email draft. It opens the player's mail app; it is not an order. */
export function contactToPurchase(item: ShopItem, size: string | null, qty: number, color = "") {
  const lines = [
    `Item: ${item.name} (${item.id})`,
    `Size: ${size ?? "(not chosen)"}`,
    `Color: ${color || "(standard)"}`,
    `Quantity: ${qty}`,
    `Listed price: $${item.price} each`,
    "",
    "My question:",
  ];
  return `mailto:${STORE_EMAIL}?subject=${encodeURIComponent(`Purchase: ${item.name}`)}&body=${encodeURIComponent(lines.join("\n"))}`;
}
