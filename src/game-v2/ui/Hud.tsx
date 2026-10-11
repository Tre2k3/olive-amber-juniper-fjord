import { useState, type PointerEvent } from "react";
import type { HudState } from "../core/types";
import { characters } from "../assets/characters";
import "./hud.css";
import { FOOD_VENDORS, type FoodVendor } from "../play/food-court";
import { VELI_MENU, VELI_FLAVORS } from "../play/veli";

export function Hud({ state, night, action }: { state: HudState; night: () => void; action: (code: string) => void }) {
  return (
    <div className="memphis-hud pointer-events-none absolute inset-0 text-[#f4efe4]" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {state.veli?.open && <VeliMenu action={action} />}
      {state.foodCourt?.open && <FoodMenu vendor={state.foodCourt.open} action={action} />}
      {state.veliTv?.near && <div data-testid="veli-tv-controls" className="pointer-events-auto absolute bottom-60 left-3 z-20 max-w-52 rounded-md border border-[#c89a40] bg-[#17140ef2] p-2 sm:bottom-16 sm:left-3">
        <p className="text-xs text-[#e0b33a]">VELI TV</p>
        <div className="flex gap-2">
          <button type="button" className="min-h-11 whitespace-nowrap px-2 text-sm" onClick={()=>action("VeliTVToggle")}>{state.veliTv.playing ? "Pause music" : "Play music"}</button>
          <button type="button" className="min-h-11 whitespace-nowrap px-2 text-sm" onClick={()=>action("VeliTVMute")}>{state.veliTv.muted ? "Unmute" : "Mute"}</button>
        </div>
        {state.veliTv.error && <p role="status" className="text-xs">{state.veliTv.error}</p>}
      </div>}
      <div className="hud-wallet absolute left-3 top-3 flex max-w-[11.5rem] flex-wrap gap-2 sm:max-w-none">
        <Chip label="SACK" value={`$${state.dollars}`} />
        <Chip label="RESPECT" value={String(state.respect)} />
        <Chip label={placeName(state.place)} value={state.night ? "NIGHT" : state.golden ? "GOLDEN" : "DAY"} />
        {state.carrying && <Chip label="DROP" value="ON" />}
        {state.boost && <Chip label="FED" value="GO" />}
        {state.fit !== "default" && <Chip label="FIT" value={state.fit.toUpperCase()} />}
      </div>
      <div className="absolute right-3 top-3 w-24 rounded-md border border-[#e0b33a55] bg-[#0d0d0dcc] p-2 sm:top-4 sm:w-36">
        <div className="text-[10px] tracking-[0.18em] text-[#e0b33a]">{state.activity === "race" ? "NITRO" : "MEMPHIS"}</div>
        <Mini state={state} />
      </div>
      {!state.veli?.near && !state.foodCourt?.near && <div className="hud-mission absolute left-3 right-[7.5rem] top-[7.15rem] rounded-md bg-[#0d0d0dcc] px-3 py-2 text-center text-sm sm:left-1/2 sm:right-auto sm:top-4 sm:max-w-[70vw] sm:-translate-x-1/2">
        {state.activity === "race" ? "NITRO CIRCUIT · 3 LAPS" : state.mission}
      </div>}
      {!state.veli?.near && !state.foodCourt?.near && state.activity !== "race" && <div className="hud-marks absolute left-3 top-[10.6rem] flex gap-1 text-[10px] tracking-[0.14em] sm:left-1/2 sm:top-14 sm:-translate-x-1/2">
        <Mark on={state.marks.fish} label="FISH" />
        <Mark on={state.marks.bowl} label="BOWL" />
        <Mark on={state.marks.food} label="EAT" />
        <Mark on={state.marks.race} label="RACE" />
      </div>}
      {state.log && <Log state={state} />}
      {state.dialogue && <Dialogue line={state.dialogue} />}
      {state.charge > 0 && (
        <div data-testid="shot-charge" className={`absolute left-1/2 h-2 w-40 -translate-x-1/2 overflow-hidden rounded bg-[#0d0d0d] ${state.basketball ? "top-72 sm:top-44 sm:left-3 sm:translate-x-0" : "bottom-44 sm:bottom-24"}`}>
          <div className="h-full bg-[#e0b33a]" style={{ width: `${state.charge * 100}%` }} />
          <div className="absolute inset-y-0 border-x border-[#071018] bg-[#49e97599]" style={{ left: "63.5%", width: "13%" }} />
        </div>
      )}
      {state.prompt && (
        <div data-testid="interaction-prompt" className={`absolute left-3 right-3 top-[12.5rem] rounded-full border border-[#e0b33a] bg-[#0d0d0df2] px-4 py-2 text-center text-sm sm:right-auto ${state.basketball ? "sm:top-32 sm:left-3 sm:translate-x-0" : "sm:bottom-8 sm:top-auto sm:left-1/2 sm:-translate-x-1/2"}`}>
          {state.prompt}
        </div>
      )}
      {state.place === "court" && (
        <div data-testid="court-score" className={`absolute left-1/2 top-[15.5rem] -translate-x-1/2 whitespace-nowrap rounded bg-[#0d0d0dcc] px-2 py-1 text-xs tracking-widest text-[#e0b33a] ${state.basketball ? "sm:top-24 sm:left-3 sm:translate-x-0" : "sm:bottom-20 sm:top-auto"}`}>
          {state.basketball ? `GREEN ${state.basketball.score[0]} — ${state.basketball.score[1]} GOLD · ${state.basketball.clock}s` : `${state.made} MADE / ${state.taken} TAKEN`}
        </div>
      )}
      {state.place === "court" && (
        <div className="pointer-events-auto absolute bottom-36 left-3 flex max-w-[calc(100vw-6rem)] flex-wrap gap-1 sm:bottom-16 sm:max-w-none">
          {[["HALF 2v2", "KeyG"], ["FULL 2v2", "KeyH"], ...(state.basketball ? [["PASS", "KeyF"], ["CROSS", "KeyC"], ["DUNK", "KeyV"], ["LAYUP", "KeyL"], ["EXIT", "Escape"]] : [])].map(([label, code]) => (
            <button key={code} type="button" className="min-h-11 rounded border border-[#e0b33a77] bg-[#0d0d0dee] px-2 text-[10px]" onClick={() => action(code!)}>{label}</button>
          ))}
        </div>
      )}
      <div className="pointer-events-auto absolute bottom-4 left-4 h-28 w-28 sm:hidden">
        <Stick />
      </div>
      <div className="pointer-events-auto absolute bottom-4 right-4 flex flex-col gap-2 sm:hidden">
        <Round label="N" onPointerDown={night} />
        <Round label="E" onPointerDown={() => action("KeyE")} />
        <Round label={state.activity === "race" ? "DRIFT" : state.activity === "bowl" ? "ROLL" : "SHOT"} onPointerDown={() => action("SpaceDown")} onPointerUp={() => action("SpaceUp")} />
      </div>
      <div className="absolute bottom-3 right-4 hidden text-[11px] tracking-wide text-[#f4efe4aa] sm:block">
        {state.activity === "race" ? "W gas · S brake · A/D steer · Space drift · E exit" : state.basketball ? "WASD move · Space timing shot · F pass · C cross · V dunk · L layup · E steal · Esc exit" : "Arrows / WASD move · Q/R orbit · drag or swipe camera · E interact · Space shoot · Shift run"}
      </div>
    </div>
  );
}

function placeName(place: HudState["place"]) {
  if (place === "home") return "BENJI HOME";
  if (place === "hq") return "HQ";
  if (place === "court") return "901 COURT";
  if (place === "haunt") return "HAUNTED";
  return "THE BLOCK";
}

function Mark({ on, label }: { on: boolean; label: string }) {
  return (
    <div className={`rounded px-2 py-1 ${on ? "bg-[#e0b33a] text-[#0d0d0d]" : "bg-[#0d0d0dcc] text-[#f4efe488]"}`}>{label}</div>
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
      <div className="mt-2 text-xs text-[#f4efe4aa]">Court fit pockets shots. River fit holds the bite. Night fit owns the strip.</div>
    </div>
  );
}

function Dialogue({ line }: { line: string }) {
  const [name, text] = line.includes(" — ") ? line.split(" — ") : ["", line];
  const portrait = name.startsWith("Brotherz") ? "/game-v2/vendors/food-court/brother-1.png" : name.startsWith("Yungveli") ? "/game-v2/vendors/veli/idle.png" : name.startsWith("Court")
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
        {name && <div className="text-[11px] tracking-[0.18em] text-[#e0b33a]">{name.toUpperCase()}</div>}
        <div className="text-sm leading-snug">{text}</div>
      </div>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="hud-chip rounded-md border border-[#e0b33a55] bg-[#0d0d0dcc] px-3 py-2">
      <div className="text-[10px] tracking-[0.16em] text-[#e0b33a]">{label}</div>
      <div className="text-lg leading-none">{value}</div>
    </div>
  );
}

function Mini({ state }: { state: HudState }) {
  if (state.activity === "race") return <svg viewBox="0 0 120 60" className="mt-1 h-16 w-full"><rect width="120" height="60" fill="#1a1c1b" /><rect x="10" y="12" width="100" height="36" rx="18" fill="none" stroke="#ded3ad" strokeWidth="4" /><circle cx={state.x+60} cy={state.z+180} r="3" fill="#39ff14" /></svg>;
  const x = state.place === "home" ? 28 : state.place === "hq" ? 55 : state.place === "haunt" ? 18 : Math.max(4, Math.min(96, ((state.x + 80) / 190) * 100));
  const y = state.place === "home" || state.place === "hq" || state.place === "haunt" ? 34 : Math.max(4, Math.min(66, ((30 - state.z) / 130) * 70));
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

function Round({ label, onPointerDown, onPointerUp }: { label: string; onPointerDown: () => void; onPointerUp?: () => void }) {
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
      <div id="sack-v2-knob" className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e0b33a]" />
    </div>
  );
}

function moveStick(e: PointerEvent<HTMLDivElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width * 2 - 1;
  const y = -((e.clientY - rect.top) / rect.height * 2 - 1);
  const input = (window as unknown as { __SACK_V2_INPUT__?: { setStick: (x: number, y: number) => void } }).__SACK_V2_INPUT__;
  input?.setStick(Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y)));
}

function releaseStick() {
  (window as unknown as { __SACK_V2_INPUT__?: { setStick: (x: number, y: number) => void } }).__SACK_V2_INPUT__?.setStick(0, 0);
}


function VeliMenu({ action }: { action: (code: string) => void }) {
  const [flavor, setFlavor] = useState(0);
  const [okra, setOkra] = useState(false);
  const [parts,setParts] = useState(0);
  return <div data-testid="veli-menu" role="dialog" aria-modal="true" aria-label="Veli's Wings menu"
    className="pointer-events-auto absolute inset-3 z-50 overflow-y-auto rounded-lg border-2 border-[#c89a40] bg-[#17140efc] p-4 sm:inset-x-[20%]">
    <button type="button" className="float-right min-h-11 border border-[#c89a40] px-4" onClick={() => action("VeliClose")}>Close</button>
    <h2 className="text-2xl text-[#e0b33a]">Veli’s Wings</h2><p>Yungveli · fresh wings at the window</p>
    <img src="/game-v2/vendors/veli/menu-original.png" alt="Original Veli's Wings logo and menu" className="mx-auto my-3 w-40 sm:w-56" />
    <label className="block">Wing flavor <select aria-label="Wing flavor" className="ml-2 min-h-11 rounded bg-[#352e20] px-2" value={flavor} onChange={e => setFlavor(Number(e.target.value))}>
      {VELI_FLAVORS.map((name,i) => <option key={name} value={i}>{name}</option>)}
    </select></label>
    <label className="my-3 block"><input type="checkbox" checked={okra} onChange={e => setOkra(e.target.checked)} /> Substitute okra for fries (+$2 on combos)</label>
    <label className="my-3 block">Wing selection <select aria-label="Wing selection" className="min-h-11 rounded bg-[#352e20]" value={parts} onChange={e => setParts(Number(e.target.value))}><option value={0}>Mixed</option><option value={1}>All drums (+$2 per 10pc)</option><option value={2}>All flats (+$2 per 10pc)</option></select></label>
    <p className="text-sm">Combos include ranch, carrots, celery, a drink and fries.</p>
    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {VELI_MENU.map((item,i) => <button type="button" key={i} data-testid={`veli-order-${i}`}
        className="min-h-12 rounded border border-[#c89a40] px-3 py-2 text-left hover:bg-[#4b3b1d]"
        onClick={() => action(`VeliOrder:${i}:${flavor}:${okra ? 1 : 0}:${parts}`)}>
        {item.pieces}pc {item.combo ? "party wing combo" : "wings only"} · ${item.price + (okra && item.combo ? 2 : 0) + (parts ? item.pieces * .2 : 0)}
      </button>)}
    </div>
  </div>;
}


function FoodMenu({ vendor, action }: { vendor: FoodVendor; action: (code:string)=>void }) {
  const spec=FOOD_VENDORS[vendor];
  return <div data-testid="food-menu" role="dialog" aria-modal="true" aria-label={`${spec.name} menu`}
    className="pointer-events-auto absolute inset-3 z-50 overflow-y-auto rounded-lg border-2 border-[#c89a40] bg-[#17140efc] p-4 sm:inset-x-[25%]">
    <button type="button" className="float-right min-h-11 border border-[#c89a40] px-4" onClick={()=>action("FoodClose")}>Close</button>
    <h2 className="text-2xl text-[#e0b33a]">{spec.name}</h2>
    <img src={spec.logo} alt={`${spec.name} original logo`} className="mx-auto my-4 max-h-64 max-w-full" />
    <p className="mb-3 text-sm">Game menu · pay with your Sack</p>
    <div className="grid gap-3">{spec.menu.map((item,i)=><button key={item.name} type="button" data-testid={`food-order-${i}`} className="min-h-12 rounded border border-[#c89a40] p-3 text-left hover:bg-[#4b3b1d]" onClick={()=>action(`FoodOrder:${vendor}:${i}`)}>{item.name} · ${item.cost}</button>)}</div>
  </div>;
}
