import { StoreBridge } from "../../game/storeBridge";
import {
  addToKartPayload,
  applyAck,
  BRIDGE_CATALOG,
  type KartRequest,
  parseCatalog,
  type Selection,
  type ShopItem,
  STORE_ORIGIN,
  validateSelection,
} from "./shop";

/**
 * The game's single link to the 10letters.store parent page. Embedded in the
 * store's /arcade iframe it speaks the store bridge (GG_* / SR_*); standalone it
 * simply serves the store's real catalog and links out. UI subscribes to it.
 */
type State = {
  embedded: boolean;
  connected: boolean;
  catalog: ShopItem[];
  request: KartRequest | null;
  storeOrigin: string;
};

let state: State = {
  embedded: false,
  connected: false,
  catalog: BRIDGE_CATALOG,
  request: null,
  storeOrigin: STORE_ORIGIN,
};
const listeners = new Set<() => void>();
let bridge: StoreBridge | null = null;
let entered = false;

function set(next: Partial<State>) {
  state = { ...state, ...next };
  for (const fn of listeners) fn();
}

export const storeLink = {
  get: () => state,
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  /** Install the listener, then announce GG_READY (only when inside a parent page). */
  start(hooks: { onPause: () => void; onResume: () => void }) {
    if (bridge || typeof window === "undefined" || window.parent === window) return;
    bridge = new StoreBridge();
    bridge.start({
      onInit: (p) =>
        set({ embedded: true, connected: true, storeOrigin: p.origin || STORE_ORIGIN }),
      onPlayer: () => set({ connected: true }),
      onCatalog: (products) => {
        const items = parseCatalog(products, state.storeOrigin);
        if (items.length) set({ connected: true, catalog: items });
      },
      onAck: (ack) =>
        set({
          request: applyAck(
            state.request,
            ack as { forType?: string; type?: string; ok?: boolean; error?: string },
          ),
        }),
      onPause: hooks.onPause,
      onResume: hooks.onResume,
      onReward: () => {},
    });
    set({ embedded: true });
    bridge.post("GG_READY", {});
  },
  /** Ask the store to add a validated item to ITS kart; resolves only on SR_ACK. */
  addToKart(sel: Selection): string | null {
    const item = state.catalog.find((i) => i.id === sel.id);
    const problem = validateSelection(item, sel);
    if (problem) return problem;
    if (!bridge || !state.connected)
      return "Open the game from 10letters.store to add to your kart.";
    if (state.request?.state === "pending") return "Still adding your last item…";
    const payload = addToKartPayload(sel);
    set({
      request: { id: payload.productId, size: payload.size, qty: payload.qty, state: "pending" },
    });
    bridge.post("GG_ADD_TO_CART", payload);
    return null;
  },
  /** Deliberate visit to the real store: the parent navigates; standalone opens a tab. */
  enterStore() {
    if (bridge && state.embedded) {
      if (entered) return;
      entered = true;
      bridge.post("GG_ENTER_HQ", { zone: "headquarters", path: "/headquarters" });
      setTimeout(() => (entered = false), 4000);
      return;
    }
    window.open(`${STORE_ORIGIN}/store`, "_blank", "noopener");
  },
  clearRequest() {
    set({ request: null });
  },
};
