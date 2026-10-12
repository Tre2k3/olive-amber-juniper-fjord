/** Prices and flavors transcribed from the user-supplied Veli's Wings menu. */
export const VELI_FLAVORS = ["Veli Mild", "Veli Hot", "Veli Sweet & Hot", "Veli Lemon Pepper Mild", "Veli Lemon Pepper Hot", "Lemon Pepper Seasoned", "Seasoned"] as const;
export const VELI_MENU = [
  { pieces: 10, price: 15, combo: true }, { pieces: 15, price: 20, combo: true },
  { pieces: 20, price: 23, combo: true }, { pieces: 25, price: 28, combo: true },
  { pieces: 10, price: 12, combo: false }, { pieces: 15, price: 17, combo: false },
  { pieces: 20, price: 20, combo: false }, { pieces: 25, price: 25, combo: false },
  { pieces: 50, price: 50, combo: false }, { pieces: 100, price: 95, combo: false },
] as const;
export type VeliState = { open: boolean; serving: number; order: string; price: number };
export const freshVeli = (): VeliState => ({ open: false, serving: 0, order: "", price: 0 });
export function veliOrder(state: VeliState, wallet: number, index: number, flavor: number, okra = false, parts = 0) {
  if (!state.open || state.serving > 0) return null;
  if (!Number.isInteger(index) || !Number.isInteger(flavor) || !VELI_MENU[index] || !VELI_FLAVORS[flavor] || !Number.isInteger(parts) || parts < 0 || parts > 2) return null;
  const item = VELI_MENU[index], price = item.price + (okra && item.combo ? 2 : 0) + (parts ? item.pieces * .2 : 0);
  if (wallet < price) return { dialogue: "Yungveli — That order is $" + price + ". You need a little more Sack." };
  state.open = false; state.serving = 4; state.price = price;
  state.order = item.pieces + "pc " + (item.combo ? "party wing combo" : "wings only") + " · " + VELI_FLAVORS[flavor] + (okra && item.combo ? " · okra" : "") + (parts === 1 ? " · all drums" : parts === 2 ? " · all flats" : "");
  return { dollars: -price, respect: 2, dialogue: "Yungveli — " + state.order + ". Fresh out the kitchen!" };
}
