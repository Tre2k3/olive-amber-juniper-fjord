import { useEffect, useRef, useState } from "react";
import type { HudState } from "./core/types";
import { Hud } from "./ui/Hud";

const EMPTY: HudState = {
  place: "street",
  dollars: 240,
  respect: 12,
  mission: "Walk the block to $ackReligious HQ",
  prompt: "",
  charge: 0,
  night: false,
  golden: false,
  made: 0,
  taken: 0,
  dialogue: "",
  carrying: false,
  x: -30.2,
  z: 5.55,
  fit: "default",
  bait: 0,
  boost: false,
  log: false,
  marks: { fish: false, bowl: false, food: false, race: false, court: false, haunt: false },
  bestBowl: 0,
  bestRace: 0,
};

export function GameV2() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState<HudState>(EMPTY);
  const hudRef = useRef(setHud);
  hudRef.current = setHud;
  // Loading screen (skipped for ?qa=1 test runs so CI is unchanged).
  const qa =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("qa") === "1";
  const [load, setLoad] = useState<{ loaded: number; total: number; done: boolean }>({
    loaded: 0,
    total: 0,
    done: qa,
  });

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let stop = () => {};
    let dead = false;
    void import("./runtime").then(({ startSackV2 }) => {
      if (dead || !canvas.current) return;
      stop = startSackV2(
        canvas.current,
        (next) => hudRef.current(next),
        (p) => setLoad(p),
      );
    });
    return () => {
      dead = true;
      stop();
    };
  }, [20]);

  return (
    <div className="fixed inset-0 bg-[#071018]">
      <canvas ref={canvas} className="h-full w-full" />
      <Hud
        state={hud}
        night={() =>
          (
            window as unknown as { __SACK_V2_INPUT__?: { toggleNight: () => void } }
          ).__SACK_V2_INPUT__?.toggleNight()
        }
        action={(code) => {
          const input = (
            window as unknown as {
              __SACK_V2_INPUT__?: {
                press: (code: string) => void;
                setCharge: (v: boolean) => void;
              };
            }
          ).__SACK_V2_INPUT__;
          if (code === "SpaceDown") input?.setCharge(true);
          else if (code === "SpaceUp") input?.setCharge(false);
          else input?.press(code);
        }}
      />
      <div
        data-testid="loading-screen"
        aria-hidden={load.done}
        className={`pointer-events-none fixed inset-0 z-[80] flex flex-col items-center justify-center bg-[#071018] transition-opacity duration-700 ${load.done ? "opacity-0" : "opacity-100"}`}
      >
        <div className="text-2xl font-black tracking-[0.2em] text-[#e0b33a] sm:text-4xl">
          $ACKRELIGIOUS
        </div>
        <div className="mt-1 text-xs tracking-[0.4em] text-[#f4efe4aa]">MEMPHIS 901</div>
        <div className="mt-8 h-2 w-64 overflow-hidden rounded-full bg-[#f4efe41a]">
          <div
            className="h-full bg-[#e0b33a] transition-[width] duration-300"
            style={{
              width: `${load.total ? Math.round((100 * load.loaded) / Math.max(1, load.total)) : 4}%`,
            }}
          />
        </div>
        <div className="mt-3 text-xs text-[#f4efe4aa]">
          {load.total
            ? `Loading Memphis… ${Math.round((100 * load.loaded) / Math.max(1, load.total))}%`
            : "Loading the game…"}
        </div>
      </div>
    </div>
  );
}
