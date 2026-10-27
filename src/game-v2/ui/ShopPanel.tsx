import { useState, useSyncExternalStore } from "react";
import { backImage, contactToPurchase, STORE_SHOP_URL, type ShopItem } from "../store/shop";
import { storeLink } from "../store/link";

/** The HQ counter: browse the real $ackReligious catalog, pick a real size, add to the store's kart. */
export function ShopPanel({ onClose }: { onClose: () => void }) {
  const link = useSyncExternalStore(storeLink.subscribe, storeLink.get, storeLink.get);
  const items = link.catalog.filter((i) => i.available);
  const [id, setId] = useState(items[0]?.id ?? "");
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [back, setBack] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const item: ShopItem | undefined = items.find((i) => i.id === id);
  const live = link.embedded && link.connected;
  const req = link.request;
  const pick = (next: string) => {
    setId(next);
    setSize(null);
    setQty(1);
    setBack(false);
    setNote(null);
    storeLink.clearRequest();
  };
  const photo = item ? (back ? backImage(item.id) : item.image) : null;
  return (
    <div
      data-testid="shop-panel"
      className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-3"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-[#c49635]/60 bg-[#14110d] text-[#f4e3bf] shadow-2xl sm:flex-row">
        <div className="max-h-[38vh] overflow-y-auto border-b border-[#c49635]/30 sm:max-h-none sm:w-64 sm:border-b-0 sm:border-r">
          <div className="sticky top-0 bg-[#14110d] px-4 py-3 text-xs font-bold tracking-[0.2em] text-[#e9b84a]">
            $ACKRELIGIOUS · 10LETTERS.STORE
          </div>
          {items.map((i) => (
            <button
              key={i.id}
              data-testid={`shop-item-${i.id}`}
              onClick={() => pick(i.id)}
              className={`flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm ${i.id === id ? "bg-[#c49635]/25" : "hover:bg-white/5"}`}
            >
              <span className="truncate">{i.name}</span>
              <span className="shrink-0 text-[#e9b84a]">${i.price}</span>
            </button>
          ))}
        </div>
        {item && (
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-bold">{item.name}</div>
                <div className="text-[#e9b84a]">${item.price}</div>
              </div>
              <button
                data-testid="shop-close"
                onClick={onClose}
                className="rounded-md border border-white/20 px-3 py-1 text-sm hover:bg-white/10"
              >
                Close
              </button>
            </div>
            <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-[#efe9df]">
              {photo ? (
                <img
                  src={photo}
                  alt={`${item.name} — ${back ? "back" : "front"}`}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="px-6 text-center text-sm text-[#5b5146]">
                  Photo coming soon — see it in person at the store.
                </div>
              )}
            </div>
            {backImage(item.id) && (
              <div className="flex gap-2 text-xs">
                <button
                  onClick={() => setBack(false)}
                  className={`rounded px-2 py-1 ${!back ? "bg-[#c49635] text-black" : "border border-white/20"}`}
                >
                  Front
                </button>
                <button
                  onClick={() => setBack(true)}
                  className={`rounded px-2 py-1 ${back ? "bg-[#c49635] text-black" : "border border-white/20"}`}
                >
                  Back
                </button>
              </div>
            )}
            <div>
              <div className="mb-1 text-xs tracking-widest text-white/60">SIZE</div>
              <div className="flex flex-wrap gap-2">
                {item.sizes.map((s) => (
                  <button
                    key={s}
                    data-testid={`shop-size-${s}`}
                    onClick={() => setSize(s)}
                    className={`min-w-11 rounded-md border px-3 py-1.5 text-sm ${size === s ? "border-[#e9b84a] bg-[#e9b84a] text-black" : "border-white/25 hover:bg-white/10"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs tracking-widest text-white/60">QTY</div>
              <button
                aria-label="Less"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="h-8 w-8 rounded border border-white/25"
              >
                −
              </button>
              <span data-testid="shop-qty" className="w-6 text-center">
                {qty}
              </span>
              <button
                aria-label="More"
                onClick={() => setQty((q) => Math.min(10, q + 1))}
                className="h-8 w-8 rounded border border-white/25"
              >
                +
              </button>
            </div>
            {live ? (
              <button
                data-testid="shop-add"
                disabled={!size || req?.state === "pending"}
                onClick={() => setNote(storeLink.addToKart({ id: item.id, size, qty }))}
                className="rounded-lg bg-[#e9b84a] px-4 py-3 font-bold text-black disabled:opacity-40"
              >
                {req?.state === "pending" ? "Adding…" : `Add to Kart — $${item.price * qty}`}
              </button>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <a
                  data-testid="shop-online"
                  href={STORE_SHOP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-lg bg-[#e9b84a] px-4 py-3 text-center font-bold text-black"
                >
                  Shop on 10letters.store
                </a>
                <a
                  data-testid="shop-contact"
                  href={contactToPurchase(item, size, qty)}
                  className="flex-1 rounded-lg border border-[#e9b84a] px-4 py-3 text-center font-bold text-[#e9b84a]"
                >
                  Contact to Purchase
                </a>
              </div>
            )}
            <div data-testid="shop-status" className="min-h-5 text-sm">
              {note && <span className="text-[#ff9b8a]">{note}</span>}
              {!note && req?.id === item.id && req.state === "added" && (
                <span className="text-[#9be39b]">
                  Added to your kart on 10letters.store ({req.size} × {req.qty}).
                </span>
              )}
              {!note && req?.id === item.id && req.state === "failed" && (
                <span className="text-[#ff9b8a]">{req.error}</span>
              )}
            </div>
            <button
              data-testid="shop-visit"
              onClick={() => storeLink.enterStore()}
              className="self-start text-sm text-[#e9b84a] underline underline-offset-4"
            >
              Visit the real store →
            </button>
            <div className="text-xs text-white/50">
              {live
                ? "Adding to your kart isn't payment — you'll check out on 10letters.store."
                : "Purchases happen on 10letters.store. Contact to Purchase opens an email draft; it isn't an order."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
