import { useState, type PointerEvent } from "react";
import type { HudState } from "../core/types";
import { characters } from "../assets/characters";
import "./hud.css";
import { FOOD_VENDORS, type FoodVendor } from "../play/food-court";
import { VELI_MENU, VELI_FLAVORS } from "../play/veli";

export function Hud({
  state,
  night,
  action,
}: {
  state: HudState;
  night: () => void;
  action: (code: string) => void;
}) {
  return (
    <div
      className="memphis-hud pointer-events-none absolute inset-0 text-[#f4efe4]"
      style={{ fontFamily: "DM Sans, sans-serif" }}
    >
      {state.veli?.open && <VeliMenu action={action} />}
      {state.foodCourt?.open && <FoodMenu vendor={state.foodCourt.open} action={action} />}
      {state.veliTv?.near && (
        <div
          data-testid="veli-tv-controls"
          className="pointer-events-auto absolute top-30 left-3 z-20 max-w-52 rounded-md border border-[#c89a40] bg-[#17140ef2] p-2 sm:bottom-16 sm:left-3 sm:top-auto"
        >
          <p className="text-xs text-[#e0b33a]">VELI TV</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="min-h-11 whitespace-nowrap px-2 text-sm"
              onClick={() => action("VeliTVToggle")}
            >
              {state.veliTv.playing ? "Pause music" : "Play music"}
            </button>
            <button
              type="button"
              className="min-h-11 whitespace-nowrap px-2 text-sm"
              onClick={() => action("VeliTVMute")}
            >
              {state.veliTv.muted ? "Unmute" : "Mute"}
            </button>
          </div>
          {state.veliTv.error && (
            <p role="status" className="text-xs">
              {state.veliTv.error}
            </p>
          )}
        </div>
      )}
      <div className="hud-wallet absolute left-3 top-3 flex max-w-[12rem] flex-col gap-2 sm:max-w-none">
        <div className="flex gap-2">
          <Chip label="SACKDOLLARS" value={`$${state.dollars}`} />
          <Chip label="RESPECT" value={String(state.respect)} />
        </div>
        <div className="flex items-center gap-2 self-start rounded-full border border-[#e0b33a66] bg-[#0b0b0fe6] px-3 py-1 text-xs text-[#f4efe4]">
          <span className="inline-block h-2 w-2 rounded-full bg-[#39ff14] shadow-[0_0_6px_#39ff14]" />
          <span className="font-medium">{locationLine(state)}</span>
          <span className="text-[10px] font-semibold tracking-[0.18em] text-[#e0b33a]">{state.night ? "NIGHT" : state.golden ? "GOLDEN" : "DAY"}</span>
          <span className="text-[#f4efe499]">{clockFor(state)}</span>
        </div>
        <div className="flex gap-2">
          {state.carrying && <Chip label="DROP" value="ON" />}
          {state.boost && <Chip label="FED" value="GO" />}
          {state.fit !== "default" && <Chip label="FIT" value={state.fit.toUpperCase()} />}
        </div>
      </div>
      <div className="hud-minimap absolute bottom-[9.5rem] left-3 w-28 rounded-md border border-[#e0b33a66] bg-[#0b0b0fe6] p-2 sm:bottom-4 sm:w-40">
        <div className="flex items-baseline justify-between">
          <div className="text-[11px] font-semibold tracking-[0.18em] text-[#e0b33a]">
            {state.activity === "race" ? "NITRO" : "MEMPHIS"}
          </div>
          <div className="text-[9px] tracking-widest text-[#f4efe488]">N ▲</div>
        </div>
        <Mini state={state} />
      </div>
      {!state.veli?.near && !state.foodCourt?.near && state.activity !== "race" && (
        <Objective state={state} />
      )}
      {state.activity === "race" && (
        <div className="hud-mission absolute left-1/2 top-3 -translate-x-1/2 rounded-md bg-[#0d0d0dcc] px-3 py-2 text-center text-sm">
          NITRO CIRCUIT · 3 LAPS
        </div>
      )}
      {state.log && <Log state={state} />}
      {state.dialogue && (
        <Dialogue line={state.dialogue} brother={state.foodCourt?.activeBrother} />
      )}
      {state.paused && <PauseMenu muted={!!state.muted} action={action} />}
      {!state.paused && (
        <button
          type="button"
          aria-label="Pause"
          onClick={() => action("Pause")}
          className="pointer-events-auto absolute right-3 top-[7.6rem] z-20 rounded-md border border-[#f4efe433] bg-[#0d0d0dcc] px-2 py-1 text-[10px] tracking-[0.16em] text-[#f4efe4] sm:top-[8.4rem]"
        >
          II MENU
        </button>
      )}
      {state.bowl && <BowlBoard bowl={state.bowl} />}
      {state.fishing && state.fishing.phase !== "idle" && <FishPanel fish={state.fishing} />}
      {state.fishing && state.fishing.phase === "idle" && state.fishing.cooler > 0 && (
        <div
          data-testid="cooler"
          className="absolute right-3 top-[8.4rem] rounded-md border border-[#e0b33a55] bg-[#0d0d0dcc] px-3 py-2 text-xs sm:top-[9.4rem]"
        >
          <div className="text-[10px] tracking-[0.16em] text-[#e0b33a]">COOLER</div>
          <div>
            {state.fishing.cooler}/{state.fishing.coolerMax} fish · sell at 901 Catch Kitchen
          </div>
        </div>
      )}
      {state.charge > 0 && !state.fishing?.phase.match(/casting|fight/) && (
        <div
          data-testid="shot-charge"
          className={`absolute left-1/2 h-2 w-40 -translate-x-1/2 overflow-hidden rounded bg-[#0d0d0d] ${state.basketball ? "top-72 sm:top-44 sm:left-3 sm:translate-x-0" : "bottom-44 sm:bottom-24"}`}
        >
          <div className="h-full bg-[#e0b33a]" style={{ width: `${state.charge * 100}%` }} />
          <div
            className="absolute inset-y-0 border-x border-[#071018] bg-[#49e97599]"
            style={{ left: "63.5%", width: "13%" }}
          />
        </div>
      )}
      {state.prompt && (
        <div
          data-testid="interaction-prompt"
          className={`absolute left-3 right-3 top-[12.5rem] rounded-full border border-[#e0b33a] bg-[#0d0d0df2] px-4 py-2 text-center text-sm sm:right-auto ${state.basketball ? "sm:top-32 sm:left-3 sm:translate-x-0" : "sm:bottom-8 sm:top-auto sm:left-1/2 sm:-translate-x-1/2"}`}
        >
          <PromptLabel text={state.prompt} />
        </div>
      )}
      {state.place === "court" && (
        <div
          data-testid="court-score"
          className={`absolute left-1/2 top-[15.5rem] -translate-x-1/2 whitespace-nowrap rounded bg-[#0d0d0dcc] px-2 py-1 text-xs tracking-widest text-[#e0b33a] ${state.basketball ? "sm:top-24 sm:left-3 sm:translate-x-0" : "sm:bottom-20 sm:top-auto"}`}
        >
          {state.basketball
            ? `GREEN ${state.basketball.score[0]} — ${state.basketball.score[1]} GOLD · ${state.basketball.clock}s`
            : `${state.made} MADE / ${state.taken} TAKEN`}
        </div>
      )}
      {state.place === "court" && (
        <div className="pointer-events-auto absolute bottom-36 left-3 flex max-w-[calc(100vw-6rem)] flex-wrap gap-1 sm:bottom-16 sm:max-w-none">
          {[
            ["HALF 2v2", "KeyG"],
            ["FULL 2v2", "KeyH"],
            [`CAM: ${(state.basketballCamera ?? "behind").toUpperCase()}`, "KeyB"],
            ...(state.basketball
              ? [
                  [`KIT: ${state.basketballKit ?? "FRESH BLACK"}`, "KeyJ"],
                  ["PASS", "KeyF"],
                  ["CROSS", "KeyC"],
                  ["DUNK", "KeyV"],
                  ["LAYUP", "KeyL"],
                  ["EXIT", "Escape"],
                ]
              : []),
          ].map(([label, code]) => (
            <button
              key={code}
              type="button"
              className="min-h-11 rounded border border-[#e0b33a77] bg-[#0d0d0dee] px-2 text-[10px]"
              onClick={() => action(code!)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="pointer-events-auto absolute bottom-4 left-4 h-28 w-28 sm:hidden">
        <Stick />
      </div>
      <div className="pointer-events-auto absolute bottom-4 right-4 flex flex-col gap-2 sm:hidden">
        <Round label="N" onPointerDown={night} />
        <Round label="E" onPointerDown={() => action("KeyE")} />
        <Round
          label={state.activity === "race" ? "DRIFT" : state.activity === "bowl" ? "ROLL" : "SHOT"}
          onPointerDown={() => action("SpaceDown")}
          onPointerUp={() => action("SpaceUp")}
        />
      </div>
      <div className="absolute bottom-3 right-4 hidden text-[11px] tracking-wide text-[#f4efe4aa] sm:block">
        {state.activity === "race"
          ? "W gas · S brake · A/D steer · Space drift · E exit"
          : state.basketball
            ? "WASD move · Space shot · B camera · F pass · C cross · V dunk · L layup · E steal · Esc exit"
            : state.place === "court"
              ? "WASD move · Space shot · B camera · E interact"
              : "Arrows / WASD move · Q/R orbit · drag or swipe camera · E interact · Space shoot · Shift run"}
      </div>
    </div>
  );
}

function Log({ state }: { state: HudState }) {
  return (
    <div className="absolute left-3 top-[12.4rem] w-56 rounded-md border border-[#e0b33a] bg-[#0d0d0df2] p-3 text-sm sm:left-4 sm:top-28">
      <div className="text-[10px] tracking-[0.18em] text-[#e0b33a]">BLOCK CARD</div>
      <div className="mt-2">Fit {state.fit}</div>
      <div>Bait {state.bait}</div>
      <div>Best bowl {state.bestBowl}</div>
      <div>Best run {state.bestRace ? `${state.bestRace.toFixed(1)}s` : "—"}</div>
      <div className="mt-2 text-xs text-[#f4efe4aa]">
        Court fit pockets shots. River fit holds the bite. Night fit owns the strip.
      </div>
    </div>
  );
}

function Dialogue({ line, brother = 0 }: { line: string; brother?: number }) {
  const [name, text] = line.includes(" — ") ? line.split(" — ") : ["", line];
  const portrait = name.startsWith("Brotherz")
    ? `/game-v2/vendors/food-court/brother-${brother + 1}.png`
    : name.startsWith("Yungveli")
      ? "/game-v2/vendors/veli/idle.png"
      : name.startsWith("Court")
        ? characters.courtOg.views.front.src
        : name.startsWith("K")
          ? characters.kBlanco.portrait
          : name.startsWith("Mama")
            ? characters.mamaDee.views.front.src
            : name.startsWith("Unc")
              ? characters.uncJ.views.front.src
              : name.startsWith("Nitro") || name.startsWith("Night")
                ? characters.nitro.views.front.src
                : name.startsWith("Strike") || name.startsWith("901")
                  ? characters.strike.views.front.src
                  : characters.benji.views.front.src;
  return (
    <div className="absolute bottom-40 left-1/2 flex w-[min(94vw,520px)] -translate-x-1/2 items-center gap-3 rounded-md border border-[#e0b33a] bg-[#0d0d0df2] px-3 py-3 sm:bottom-20">
      <img src={portrait} alt="" className="h-16 w-12 shrink-0 object-contain object-bottom" />
      <div>
        {name && (
          <div className="text-[11px] tracking-[0.18em] text-[#e0b33a]">{name.toUpperCase()}</div>
        )}
        <div className="text-sm leading-snug">{text}</div>
      </div>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="hud-chip rounded-md border border-[#e0b33a88] bg-[#0b0b0fe6] px-3 py-2">
      <div className="text-[10px] font-semibold tracking-[0.2em] text-[#e0b33a]">{label}</div>
      <div className="text-xl font-semibold leading-none">{value}</div>
    </div>
  );
}

function Mini({ state }: { state: HudState }) {
  if (state.activity === "race")
    return (
      <svg viewBox="0 0 120 60" className="mt-1 h-16 w-full">
        <rect width="120" height="60" fill="#1a1c1b" />
        <rect
          x="10"
          y="12"
          width="100"
          height="36"
          rx="18"
          fill="none"
          stroke="#ded3ad"
          strokeWidth="4"
        />
        <circle cx={state.x + 60} cy={state.z + 180} r="3" fill="#39ff14" />
      </svg>
    );
  const x =
    state.place === "home"
      ? 28
      : state.place === "hq"
        ? 55
        : state.place === "haunt"
          ? 18
          : Math.max(4, Math.min(96, ((state.x + 80) / 190) * 100));
  const y =
    state.place === "home" || state.place === "hq" || state.place === "haunt"
      ? 34
      : Math.max(4, Math.min(66, ((30 - state.z) / 130) * 70));
  return (
    <svg viewBox="0 0 100 70" className="mt-1 h-16 w-full">
      <rect width="100" height="70" fill="#1a1c1b" />
      <rect x="6" y="18" width="78" height="5" fill="#3a3f44" />
      <rect x="32" y="18" width="4" height="40" fill="#3a3f44" />
      <rect x="52" y="22" width="10" height="8" fill="#e0b33a" />
      <rect x="70" y="28" width="8" height="6" fill="#1d4e8f" />
      <rect x="78" y="30" width="10" height="7" fill="#ff4fd8" />
      <rect x="58" y="8" width="14" height="8" fill="#ffb45a" />
      <rect x="14" y="36" width="12" height="6" fill="#ff4d4d" />
      <rect x="4" y="58" width="70" height="6" fill="#1c4d6e" />
      <circle cx={x} cy={y} r="3" fill="#39ff14" />
    </svg>
  );
}

function Round({
  label,
  onPointerDown,
  onPointerUp,
}: {
  label: string;
  onPointerDown: () => void;
  onPointerUp?: () => void;
}) {
  return (
    <button
      type="button"
      className="h-14 w-14 touch-none rounded-full border border-[#e0b33a] bg-[#0d0d0de6] text-xs font-semibold"
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        onPointerDown();
      }}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onLostPointerCapture={onPointerUp}
    >
      {label}
    </button>
  );
}

function Stick() {
  return (
    <div
      className="relative h-full w-full touch-none rounded-full border border-[#e0b33a88] bg-[#0d0d0d99]"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        moveStick(e);
      }}
      onPointerMove={(e) => {
        if (e.buttons) moveStick(e);
      }}
      onPointerUp={releaseStick}
      onPointerCancel={releaseStick}
      onLostPointerCapture={releaseStick}
    >
      <div
        id="sack-v2-knob"
        className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e0b33a]"
      />
    </div>
  );
}

function moveStick(e: PointerEvent<HTMLDivElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
  const input = (
    window as unknown as { __SACK_V2_INPUT__?: { setStick: (x: number, y: number) => void } }
  ).__SACK_V2_INPUT__;
  input?.setStick(Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y)));
}

function releaseStick() {
  (
    window as unknown as { __SACK_V2_INPUT__?: { setStick: (x: number, y: number) => void } }
  ).__SACK_V2_INPUT__?.setStick(0, 0);
}

function VeliMenu({ action }: { action: (code: string) => void }) {
  const [flavor, setFlavor] = useState(0);
  const [okra, setOkra] = useState(false);
  const [parts, setParts] = useState(0);
  return (
    <div
      data-testid="veli-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Veli's Wings menu"
      className="pointer-events-auto absolute inset-3 z-50 overflow-y-auto rounded-lg border-2 border-[#c89a40] bg-[#17140efc] p-4 sm:inset-x-[20%]"
    >
      <button
        type="button"
        className="float-right min-h-11 border border-[#c89a40] px-4"
        onClick={() => action("VeliClose")}
      >
        Close
      </button>
      <h2 className="text-2xl text-[#e0b33a]">Veli’s Wings</h2>
      <p>Yungveli · fresh wings at the window</p>
      <img
        src="/game-v2/vendors/veli/menu-original.png"
        alt="Original Veli's Wings logo and menu"
        className="mx-auto my-3 w-40 sm:w-56"
      />
      <label className="block">
        Wing flavor{" "}
        <select
          aria-label="Wing flavor"
          className="ml-2 min-h-11 rounded bg-[#352e20] px-2"
          value={flavor}
          onChange={(e) => setFlavor(Number(e.target.value))}
        >
          {VELI_FLAVORS.map((name, i) => (
            <option key={name} value={i}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className="my-3 block">
        <input type="checkbox" checked={okra} onChange={(e) => setOkra(e.target.checked)} />{" "}
        Substitute okra for fries (+$2 on combos)
      </label>
      <label className="my-3 block">
        Wing selection{" "}
        <select
          aria-label="Wing selection"
          className="min-h-11 rounded bg-[#352e20]"
          value={parts}
          onChange={(e) => setParts(Number(e.target.value))}
        >
          <option value={0}>Mixed</option>
          <option value={1}>All drums (+$2 per 10pc)</option>
          <option value={2}>All flats (+$2 per 10pc)</option>
        </select>
      </label>
      <p className="text-sm">Combos include ranch, carrots, celery, a drink and fries.</p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {VELI_MENU.map((item, i) => (
          <button
            type="button"
            key={i}
            data-testid={`veli-order-${i}`}
            className="min-h-12 rounded border border-[#c89a40] px-3 py-2 text-left hover:bg-[#4b3b1d]"
            onClick={() => action(`VeliOrder:${i}:${flavor}:${okra ? 1 : 0}:${parts}`)}
          >
            {item.pieces}pc {item.combo ? "party wing combo" : "wings only"} · $
            {item.price + (okra && item.combo ? 2 : 0) + (parts ? item.pieces * 0.2 : 0)}
          </button>
        ))}
      </div>
    </div>
  );
}

function FoodMenu({ vendor, action }: { vendor: FoodVendor; action: (code: string) => void }) {
  const spec = FOOD_VENDORS[vendor];
  return (
    <div
      data-testid="food-menu"
      role="dialog"
      aria-modal="true"
      aria-label={`${spec.name} menu`}
      className="pointer-events-auto absolute inset-3 z-50 overflow-y-auto rounded-lg border-2 border-[#c89a40] bg-[#17140efc] p-4 sm:inset-x-[25%]"
    >
      <button
        type="button"
        className="float-right min-h-11 border border-[#c89a40] px-4"
        onClick={() => action("FoodClose")}
      >
        Close
      </button>
      <h2 className="text-2xl text-[#e0b33a]">{spec.name}</h2>
      <img
        src={spec.logo}
        alt={`${spec.name} original logo`}
        className="mx-auto my-4 max-h-64 max-w-full"
      />
      <p className="mb-3 text-sm">Game menu · pay with your Sack</p>
      <div className="grid gap-3">
        {spec.menu.map((item, i) => (
          <button
            key={item.name}
            type="button"
            data-testid={`food-order-${i}`}
            className="min-h-12 rounded border border-[#c89a40] p-3 text-left hover:bg-[#4b3b1d]"
            onClick={() => action(`FoodOrder:${vendor}:${i}`)}
          >
            {item.name} · ${item.cost}
          </button>
        ))}
      </div>
    </div>
  );
}

function FishPanel({ fish }: { fish: NonNullable<HudState["fishing"]> }) {
  const fighting = fish.phase === "fight";
  const t = fish.tension;
  const tone = t > 0.82 ? "#ff4d4d" : t > 0.3 ? "#39ff14" : "#e0b33a";
  return (
    <div
      data-testid="fishing-panel"
      className="absolute bottom-[9.5rem] left-1/2 flex w-60 -translate-x-1/2 flex-col items-center gap-1 sm:bottom-[6.5rem]"
    >
      {fish.flash && (
        <div
          className={`text-center text-sm ${fish.flash.good ? "text-[#39ff14]" : "text-[#ff8a8a]"}`}
        >
          {fish.flash.text}
        </div>
      )}
      {fish.phase === "casting" && (
        <>
          <div className="text-[10px] tracking-[0.16em] text-[#e0b33a]">CAST</div>
          <div className="h-3 w-56 overflow-hidden rounded bg-[#1a1a1a]">
            <div className="h-full bg-[#e0b33a]" style={{ width: `${fish.power * 100}%` }} />
          </div>
        </>
      )}
      {fighting && (
        <>
          <div className="flex w-56 items-baseline justify-between text-[10px] tracking-[0.16em] text-[#e0b33a]">
            <span>{fish.fishName.toUpperCase()}</span>
            <span>{fish.lineOut.toFixed(1)} M OUT</span>
          </div>
          <div className="relative h-3 w-56 overflow-hidden rounded bg-[#1a1a1a]">
            <div
              className="absolute inset-y-0 bg-[#39ff1422]"
              style={{ left: "30%", width: "52%" }}
            />
            <div className="absolute inset-y-0 left-[82%] w-px bg-[#ff4d4d]" />
            <div className="h-full" style={{ width: `${t * 100}%`, background: tone }} />
          </div>
          <div className="h-1 w-56 overflow-hidden rounded bg-[#1a1a1a]">
            <div className="h-full bg-[#f4efe4aa]" style={{ width: `${fish.stamina * 100}%` }} />
          </div>
          <div className="text-[10px] text-[#f4efe488]">
            TENSION · fish tires in the green · red snaps
          </div>
        </>
      )}
      {(fish.phase === "wait" || fish.phase === "bite") && (
        <div
          className={`text-sm ${fish.phase === "bite" ? "animate-pulse text-[#39ff14]" : "text-[#f4efe4aa]"}`}
        >
          {fish.prompt}
        </div>
      )}
    </div>
  );
}

function BowlBoard({ bowl }: { bowl: NonNullable<HudState["bowl"]> }) {
  return (
    <div
      data-testid="bowl-board"
      className="absolute left-1/2 top-[5.6rem] flex -translate-x-1/2 items-end gap-[2px] rounded-md border border-[#ff4fd855] bg-[#0b0b12d9] px-2 py-1.5 sm:top-[6.2rem]"
    >
      {bowl.frames.map((f, i) => (
        <div
          key={i}
          className={`flex w-9 flex-col items-center sm:w-11 ${f.current ? "text-[#ff4fd8]" : "text-[#f4efe4]"}`}
        >
          <div className="text-[9px] tracking-widest text-[#7af0ff]">{i + 1}</div>
          <div
            className={`flex h-4 w-full items-center justify-center gap-[3px] border-b text-[11px] font-semibold ${f.current ? "border-[#ff4fd8]" : "border-[#f4efe433]"}`}
          >
            {f.rolls.length ? (
              f.rolls.map((m, j) => <span key={j}>{m}</span>)
            ) : (
              <span className="opacity-30">·</span>
            )}
          </div>
          <div className="h-4 text-[11px]">{f.total ?? ""}</div>
        </div>
      ))}
      <div className="ml-2 flex flex-col items-end pl-2 text-[#e0b33a]">
        <div className="text-[9px] tracking-widest">TOTAL</div>
        <div className="text-lg leading-5">{bowl.score}</div>
        <div className="text-[9px] text-[#f4efe488]">BEST {bowl.best}</div>
      </div>
    </div>
  );
}

function PauseMenu({ muted, action }: { muted: boolean; action: (code: string) => void }) {
  const rows: [string, string][] = [
    ["WASD / Arrows", "move · Shift run"],
    ["E", "interact · talk · pick up · cast / hook"],
    ["Space", "hold to shoot, roll, cast, reel · drift in the race"],
    ["G / H", "start a half / full 2v2 at the court"],
    ["F · C · V · L", "pass · cross · dunk · layup (2v2)"],
    ["B", "cycle court camera (Behind / Sideline / Baseline)"],
    ["Q / R", "orbit camera · N day / night · X mute"],
    ["Esc", "pause · leave a match"],
  ];
  return (
    <div
      data-testid="pause-menu"
      className="pointer-events-auto absolute inset-0 z-[60] flex items-center justify-center bg-[#05060aee]"
    >
      <div className="w-[min(92vw,34rem)] rounded-xl border border-[#e0b33a66] bg-[#0b0b12] p-5 text-[#f4efe4] shadow-2xl">
        <div className="text-[11px] tracking-[0.3em] text-[#e0b33a]">$ACKRELIGIOUS · MEMPHIS</div>
        <div className="mt-1 text-2xl">Paused</div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => action("Resume")}
            className="rounded-md bg-[#e0b33a] px-4 py-2 text-sm font-semibold text-[#141414]"
          >
            Resume
          </button>
          <button
            type="button"
            onClick={() => action("SoundToggle")}
            className="rounded-md border border-[#f4efe433] px-4 py-2 text-sm"
          >
            {muted ? "Sound: off" : "Sound: on"}
          </button>
        </div>
        <div className="mt-4 max-h-[40vh] overflow-y-auto rounded-md border border-[#f4efe41a] p-3 text-xs">
          {rows.map(([k, w]) => (
            <div key={k} className="flex gap-3 py-1">
              <span className="w-28 shrink-0 font-semibold text-[#7af0ff]">{k}</span>
              <span className="text-[#f4efe4cc]">{w}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-[#f4efe488]">
          <span>Progress saves on its own.</span>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Wipe your save and start over?")) action("ResetSave");
            }}
            className="rounded-md border border-[#ff4d4d55] px-3 py-1 text-[#ff8a8a]"
          >
            Reset save
          </button>
        </div>
      </div>
    </div>
  );
}

/** Chapter + marks + the next move, top right, as on the concept boards. */
function Objective({ state }: { state: HudState }) {
  const marks: [keyof HudState["marks"], string][] = [
    ["court", "COURT"],
    ["fish", "FISH"],
    ["bowl", "BOWL"],
    ["food", "EAT"],
    ["race", "RUN"],
    ["haunt", "HOUSE"],
  ];
  const sub =
    state.fishing && state.fishing.cooler > 0 && state.fishing.phase === "idle"
      ? `SELL YOUR CATCH · ${state.fishing.cooler} in the cooler`
      : null;
  return (
    <div className="hud-objective absolute right-3 top-3 w-[min(60vw,22rem)] rounded-md border border-[#e0b33a66] bg-[#0b0b0fe6] px-3 py-2 sm:w-[24rem]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-[10px] font-semibold tracking-[0.22em] text-[#39ff14]">
          THE DROP DAY
        </span>
        <span className="flex gap-2 text-[10px] tracking-[0.14em]">
          {marks.map(([k, label]) => (
            <span
              key={k}
              className={
                state.marks[k] ? "rounded-sm bg-[#e0b33a] px-1 text-[#0d0d0d]" : "text-[#f4efe466]"
              }
            >
              {label}
            </span>
          ))}
        </span>
      </div>
      <div className="mt-1 text-[15px] leading-snug text-[#f4efe4]">{state.mission}</div>
      {sub && (
        <div className="mt-0.5 text-[11px] font-semibold tracking-wide text-[#39ff14]">{sub}</div>
      )}
    </div>
  );
}

/** "[E]  Talk to K Blanco": the key in a box, the action beside it. */
function PromptLabel({ text }: { text: string }) {
  const m = text.match(/^(E|Space|Shift\+E|G|B)\s{2}(.*)$/);
  if (!m) return <>{text}</>;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="rounded border border-[#f4efe466] bg-[#1a1a1f] px-2 py-0.5 text-xs font-semibold">
        {m[1]}
      </span>
      <span>{m[2]}</span>
    </span>
  );
}

function locationLine(state: HudState) {
  if (state.place === "home") return "Benji Home - North Memphis";
  if (state.place === "hq") return "SackReligious HQ - Memphis";
  if (state.place === "court") return "901 Memphis - Courts";
  if (state.place === "haunt") return "Haunted House - 901";
  if (state.activity === "race") return "Nitro Circuit - The Strip";
  return "The Block - Memphis";
}

/** The clock the boards show for each lighting mode. */
function clockFor(state: HudState) {
  return state.night ? "10:35 PM" : state.golden ? "6:42 PM" : "2:15 PM";
}
