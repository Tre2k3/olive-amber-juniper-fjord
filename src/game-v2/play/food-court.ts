export type FoodVendor = "brothers" | "catch901";
export const FOOD_VENDORS = {
  brothers: { name: "Brotherz Wingz N Things", x: 70, z: 22.4,
    logo: "/game-v2/vendors/food-court/brothers-wingz.webp",
    // Game economy prices, not a claimed transcription of a restaurant menu.
    menu: [{ name: "Wing plate & fries", cost: 12 }, { name: "Burger & fries", cost: 10 }, { name: "Fries", cost: 4 }] },
  catch901: { name: "901 Catch Kitchen", x: 78, z: 22.4,
    logo: "/game-v2/vendors/food-court/901-catch.png",
    menu: [{ name: "901 fish plate", cost: 12 }] },
} as const;
export type FoodCourtState = { open: FoodVendor | null; serving: FoodVendor | null; left: number; order: string; activeBrother: number; nextBrother: number };
export const freshFoodCourt = (): FoodCourtState => ({ open: null, serving: null, left: 0, order: "", activeBrother: 0, nextBrother: 0 });
export function orderFood(state: FoodCourtState, wallet: number, vendor: FoodVendor, index: number) {
  if (state.open !== vendor || state.left > 0 || !Number.isInteger(index)) return null;
  const spec = FOOD_VENDORS[vendor], item = spec.menu[index];
  if (!item) return null;
  if (wallet < item.cost) return { dialogue: `${spec.name} — ${item.name} is $${item.cost}. You need a little more Sack.` };
  state.open = null; state.serving = vendor; state.left = 4; state.order = item.name;
  if (vendor === "brothers") { state.activeBrother=state.nextBrother; state.nextBrother=1-state.activeBrother; }
  return { dollars: -item.cost, respect: 2, dialogue: `${spec.name} — ${item.name}. Fresh from the window!` };
}
