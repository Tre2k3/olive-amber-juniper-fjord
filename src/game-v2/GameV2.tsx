import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { LoadProgress } from "./runtime";
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
  // Screenshot/gameplay suites set an explicit bypass (scripts/smoke-lib.mjs); loader tests
  // and players always take the real loading path — ?qa=1 alone no longer skips it.
  const qa =
    typeof window !== "undefined" &&
    (window as unknown as { __SACK_SKIP_LOAD_SCREEN__?: boolean }).__SACK_SKIP_LOAD_SCREEN__ ===
      true;
  const [load, setLoad] = useState<LoadProgress>({
    loaded: 0,
    total: 0,
    done: qa,
    state: qa ? "ready" : "loading",
  });

  // Remount hook: bumping the generation makes React clean up the running game (its
  // effects) and start a fresh one in the same document — tests use it to prove remount
  // cleanup (no stale errors, no duplicate listeners, one live runtime).
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    (window as unknown as { __SACK_REMOUNT__?: () => void }).__SACK_REMOUNT__ = () =>
      setGeneration((g) => g + 1);
  }, []);
  // The runtime also broadcasts loading status page-wide; read the latest on mount.
  useEffect(() => {
    const latest = (window as unknown as { __SACK_LOAD_STATE__?: LoadProgress })
      .__SACK_LOAD_STATE__;
    if (qa) return;
    if (latest) setLoad(latest);
    // DIAGNOSTIC WORKAROUND (unproven): terminal states commit synchronously in case
    // world construction starves queued React updates; window.__SACK_LOAD_DIAG__()
    // .longTasksMs measures that. Remove if long tasks don't explain the stall.
    const onLoad = (e: Event) => {
      const detail = (e as CustomEvent<LoadProgress>).detail;
      if (detail.done) flushSync(() => setLoad(detail));
      else setLoad(detail);
    };
    window.addEventListener("sack-load", onLoad);
    return () => window.removeEventListener("sack-load", onLoad);
  }, [generation]);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let stop = () => {};
    let dead = false;
    void import("./runtime")
      .then(({ startSackV2 }) => {
        if (dead || !canvas.current) return;
        stop = startSackV2(
          canvas.current,
          (next) => hudRef.current(next),
          () => {}, // status arrives via the page-wide "sack-load" event
        );
      })
      .catch((err: unknown) => {
        console.error("game code failed to load", err);
        setLoad({
          loaded: 0,
          total: 0,
          done: true,
          state: "error",
          failed: 1,
          timedOut: false,
          reason: "The game code failed to load",
        });
      });
    return () => {
      dead = true;
      stop();
    };
  }, [generation]);

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
        aria-hidden={load.state === "ready"}
        className={`${load.state === "error" ? "pointer-events-auto" : "pointer-events-none"} fixed inset-0 z-[80] flex flex-col items-center justify-center bg-[#071018] transition-opacity duration-700 ${load.state === "ready" ? "opacity-0" : "opacity-100"}`}
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
        {load.state === "error" && (
          <div className="pointer-events-auto mt-4 flex flex-col items-center gap-2 rounded-lg bg-[#2a1313] px-4 py-3 text-xs text-[#f4efe4]">
            <div data-testid="loading-error">
              {load.reason ??
                `${load.timedOut ? "Still waiting on" : "Couldn't load"} ${load.failed} file${load.failed === 1 ? "" : "s"} — slow or blocked connection?`}
            </div>
            <button
              type="button"
              className="rounded border border-[#e0b33a] px-3 py-1 text-[#e0b33a]"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        )}
        <div className="mt-3 text-xs text-[#f4efe4aa]">
          {load.total
            ? `Loading Memphis… ${Math.round((100 * load.loaded) / Math.max(1, load.total))}%`
            : "Loading the game…"}
        </div>
      </div>
    </div>
  );
}
