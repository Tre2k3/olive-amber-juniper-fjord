import * as THREE from "three";
import { GameAudio, type Sfx } from "./audio";
import { updateProps } from "./world/kits/gltf-props";
import { enterHaunt, freshStage, hauntLightScale, tickHauntStage } from "./play/haunt-events";
import { animateHauntDetail, loadHauntProps, updateApparition } from "./world/kits/haunt-detail";
import {
  beginCast,
  buyBait,
  fishingHud,
  fishingLocks,
  freshFishing,
  sellCooler,
  tickFishing,
  type Catch,
  type Fishing,
  type SpeciesId,
} from "./play/fishing";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { createRenderQuality } from "./core/render-quality";
import type { Facing, HudState, Place, Solid, V2Public } from "./core/types";
import { productionLanes, sampleLane, gapAhead, type Lane } from "./roads/lanes";
import { createSaveWriter } from "./core/persistence";
import { pullCamera } from "./core/camera-collision";
import { canWalkHaunt, hauntFloorAt } from "./core/haunt-navigation";
import { cameraFraming } from "./core/camera-framing";
import {
  createBasketballCamera,
  BASKETBALL_CAMERAS,
  type BasketballCameraMode,
} from "./core/basketball-camera";
import { createCourtCameraCutaway } from "./core/court-camera-cutaway";
import {
  BALL_GRAVITY,
  backboardContact,
  rimContact,
  rimCrossing,
  shotVelocity,
} from "./core/basketball";
import {
  createCourtMatch,
  courtAction,
  matchRim,
  tickCourtMatch,
  type CourtMatch,
  type CourtMode,
} from "./core/basketball-match";
import { createCourtAnimation } from "./world/kits/court-animation";
import { createCourtUniforms, COURT_KITS, COURT_KIT_NAMES } from "./world/kits/court-uniforms";
import { animateNets, exciteNet } from "./world/kits/hoop";
import { buildSlice, carBody, spawnCourtActor, type SliceWorld } from "./world/slice";
import { presentVehicles } from "./world/kits/vehicles";
import { faceFoliage } from "./world/kits/trees";
import { buildVeliTruck, animateVeliTruck, VELI_ANCHOR } from "./world/veli";
import { freshVeli, veliOrder } from "./play/veli";
import { createFoodReceiver } from "./world/food-receiver";
import { createVendorTv } from "./world/vendor-tv";
import { buildFoodCourt, animateFoodCourt } from "./world/food-court";
import { FOOD_VENDORS, freshFoodCourt, orderFood, type FoodVendor } from "./play/food-court";
import { tickRace, RACE_LENGTH, rivalPose } from "./play/racing";
import { buildRaceCircuit, animateHauntAtmosphere } from "./world/activities";
import { animateRiverfront, setRiverSky } from "./world/riverfront-production";
import { animateHauntLibrary } from "./world/kits/haunt-library";
import { characters, frameSize, type Cutout } from "./assets/characters";
import {
  characterMaterial,
  footMarker,
  plantFeet,
  seatOnGround,
  solePlane,
  solidCutout,
} from "./world/feet";
import {
  activityCharge,
  activityPrompt,
  cancelApproach,
  cityMission,
  crossFinish,
  freshCity,
  locked,
  tickCity,
  triggerSpot,
  type City,
  type PlayEvent,
  type Spot,
  frameBoard,
  blockSteps,
} from "./play/city";

type Car = { lane: number; s: number; speed: number; mesh: THREE.Group };

const SAVE_KEY = "sack-v2";
let activeStop: (() => void) | null = null;

export function startSackV2(canvas: HTMLCanvasElement, push: (hud: HudState) => void): () => void {
  activeStop?.();
  const world = buildSlice();
  const circuit = buildRaceCircuit(world.scene);
  const veliTruck = buildVeliTruck(world.exterior);
  const veli = freshVeli();
  const veliTv = createVendorTv(veliTruck);
  const foodTrucks = buildFoodCourt(world.exterior);
  const foodCourt = freshFoodCourt();
  let raceOverview = false;
  let lastBowlRack = 0;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 220);
  const quality = createRenderQuality(renderer, world.scene, world.sun);
  // Software renderers: cheaper shadow filtering and native pixel ratio keep frames interactive.
  if (quality.software) {
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setPixelRatio(1);
  }
  // MSAA on the composer target: `antialias: true` on the renderer is lost the
  // moment bloom renders through its own targets, so without this every edge jags.
  const composer = new EffectComposer(
    renderer,
    quality.renderTarget(canvas.clientWidth || 1280, canvas.clientHeight || 720),
  );
  composer.addPass(new RenderPass(world.scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(canvas.clientWidth || 1280, canvas.clientHeight || 720),
    0.18,
    0.42,
    0.92,
  );
  composer.addPass(bloom);
  const grade = new ShaderPass(quality.gradeShader);
  composer.addPass(grade);
  if (quality.software) {
    bloom.enabled = false;
    grade.enabled = false;
  }
  const alleyRig = world.exterior.getObjectByName("901-bowl-interior");
  composer.addPass(new OutputPass());
  const player = new THREE.Group();
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 16),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    }),
  );
  shadow.name = "contact-shadow";
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  shadow.scale.set(1, 0.72, 1);
  player.add(shadow);
  player.add(footMarker());
  const soft = new THREE.Mesh(
    new THREE.CircleGeometry(0.7, 16),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    }),
  );
  soft.rotation.x = -Math.PI / 2;
  soft.position.y = 0.02;
  player.add(soft);
  const benji = frameSize(characters.benji, "front");
  const avatarMat = characterMaterial();
  const avatar = new THREE.Mesh(
    solePlane(benji.w, benji.h, benji.footPad, benji.pxH, benji.centerPx, benji.pxW),
    avatarMat,
  );
  avatar.position.y = 0;
  avatar.renderOrder = 6;
  avatar.castShadow = true;
  player.add(avatar);
  const carried = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.16, 0.22),
    new THREE.MeshStandardMaterial({ color: 0xe0b33a, roughness: 0.4, metalness: 0.55 }),
  );
  carried.position.set(0.32, 0.78, 0.12);
  carried.visible = false;
  player.add(carried);
  world.scene.add(player);
  const foodReceiver = createFoodReceiver(player);

  const kSprite = world.kSprite;

  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 18, 14),
    new THREE.MeshStandardMaterial({ map: ballTex(), roughness: 0.55 }),
  );
  ball.castShadow = true;
  ball.position.set(world.hoop.x + 4, 0.16, world.hoop.z);
  world.scene.add(ball);

  const rod = new THREE.Group();
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.009, 0.017, 1.35, 8),
    new THREE.MeshStandardMaterial({ color: 0x303b35, roughness: 0.45 }),
  );
  shaft.position.y = 0.675;
  rod.add(shaft);
  const grip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.026, 0.18, 8),
    new THREE.MeshStandardMaterial({ color: 0x9c7951, roughness: 0.9 }),
  );
  grip.position.y = 0.035;
  rod.add(grip);
  const reel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.03, 12),
    new THREE.MeshStandardMaterial({ color: 0xb4c2bd, metalness: 0.2, roughness: 0.6 }),
  );
  reel.rotation.z = Math.PI / 2;
  reel.position.set(0.028, -0.035, 0);
  rod.add(reel);
  rod.visible = false;
  player.add(rod);
  const bobber = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xe0b33a, emissive: 0xe0b33a, emissiveIntensity: 0.4 }),
  );
  bobber.visible = false;
  // Real fishing lives in play/fishing.ts; `city.fish` stays null from here on.
  const fishing: Fishing = freshFishing();
  let castArmed = false;
  /** Painted sky panoramas (public/game-v2/places/sky/); the gradient canvases stay until they load. */
  const paintedSky: { day?: THREE.Texture; golden?: THREE.Texture } = {};
  for (const mode of ["day", "golden"] as const) {
    new THREE.TextureLoader().load(
      `/game-v2/places/sky/${mode}.jpg`,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.mapping = THREE.EquirectangularReflectionMapping;
        paintedSky[mode] = t;
      },
      undefined,
      () => {
        /* keep the gradient */
      },
    );
  }
  /** Direction from the pier into open river water (toward the old bobber spot). */
  const PIER_WATER = { x: -0.92, z: -0.4 };
  let paused = false;
  let lastCountdownTick = -1;
  const audio = new GameAudio();
  // Cast beside the deck so the line and float remain visible in open water.
  bobber.position.set(-21.5, 0.055, -73);
  world.scene.add(bobber);
  const fishingLineGeometry = new THREE.BufferGeometry();
  fishingLineGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(new Float32Array(9), 3),
  );
  const fishingLine = new THREE.Line(
    fishingLineGeometry,
    new THREE.LineBasicMaterial({ color: 0xf5ead7, transparent: true, opacity: 0.95 }),
  );
  fishingLine.visible = false;
  fishingLine.frustumCulled = false;
  world.scene.add(fishingLine);
  const rodDirection = new THREE.Vector3(),
    rodTip = new THREE.Vector3();
  const rodUp = new THREE.Vector3(0, 1, 0);
  const bowlBall = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 18, 14),
    new THREE.MeshStandardMaterial({ color: 0x25204f, roughness: 0.24, metalness: 0.15 }),
  );
  bowlBall.visible = false;
  world.scene.add(bowlBall);
  const fingerHoleMaterial = new THREE.MeshBasicMaterial({ color: 0x08080b });
  for (const [x, y] of [
    [-0.027, 0.03],
    [0.027, 0.03],
    [0, -0.025],
  ]) {
    const hole = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), fingerHoleMaterial);
    hole.position.set(x!, y!, 0.122);
    bowlBall.add(hole);
  }
  const pinMat = new THREE.MeshStandardMaterial({ color: 0xf4efe4, roughness: 0.45 });
  const pinNeck = new THREE.MeshStandardMaterial({ color: 0xc4473a, roughness: 0.5 });
  const pins: THREE.Mesh[] = [];
  const pinHome: THREE.Vector3[] = [];
  const rack = [[0], [-0.26, 0.26], [-0.52, 0, 0.52], [-0.78, -0.26, 0.26, 0.78]];
  rack.forEach((row, i) => {
    row.forEach((ox) => {
      const pin = new THREE.Mesh(
        new THREE.LatheGeometry(
          [
            new THREE.Vector2(0.075, -0.28),
            new THREE.Vector2(0.12, -0.18),
            new THREE.Vector2(0.105, -0.07),
            new THREE.Vector2(0.048, 0.08),
            new THREE.Vector2(0.043, 0.16),
            new THREE.Vector2(0.071, 0.23),
            new THREE.Vector2(0.062, 0.27),
            new THREE.Vector2(0, 0.29),
          ],
          12,
        ),
        pinMat,
      );
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.035, 10), pinNeck);
      band.position.y = 0.125;
      pin.add(band);
      pin.position.set(92 + ox, 0.44, -29.4 - i * 0.34);
      pinHome.push(pin.position.clone());
      world.scene.add(pin);
      pins.push(pin);
    });
  });

  const textures: Partial<Record<Facing, THREE.Texture>> = {};
  const loader = new THREE.TextureLoader();
  for (const face of ["front", "back", "left", "right"] as const) {
    loader.load(characters.benji.views[face].src, (tex) => {
      solidCutout(tex);
      textures[face] = tex;
      if (face === facing) applyBenji(face);
    });
  }
  const strideTex: Partial<Record<Facing, THREE.Texture>> = {};
  const frontStride = (characters.benji.views as { walk?: Cutout }).walk;
  if (frontStride) {
    loader.load(frontStride.src, (tex) => {
      solidCutout(tex);
      strideTex.front = tex;
    });
  }
  let glideX = 0;
  let glideZ = 0;
  /** Distance walked. Stride sheets flip on this, not on a timer. */
  let travel = 0;

  const lanes = productionLanes();
  const cars = spawnTraffic(world, lanes);
  const parked: THREE.Object3D[] = [];
  world.exterior.traverse((obj) => {
    if (obj.userData.kind && obj.userData.radius && !cars.some((car) => car.mesh === obj))
      parked.push(obj);
  });
  const keys = new Set<string>();
  const pulses = new Map<string, number>();
  let interactQueued = false;
  let touchX = 0;
  let touchY = 0;
  let night = false;
  let golden = false;
  const cycleLight = () => {
    if (!night && !golden) golden = true;
    else if (golden) {
      golden = false;
      night = true;
    } else {
      night = false;
    }
  };
  let place: Place = "street";
  let dollars = 240;
  let respect = 12;
  let made = 0;
  let taken = 0;
  let mission = "Walk the block to $ackReligious HQ";
  let metK = false;
  let carrying = false;
  let delivered = false;
  let hauntTicket = false;
  let hauntCleared = false;
  const hauntStage = freshStage();
  let wasInHaunt = false;
  let dialogue = "";
  let facing: Facing = "back";
  /** Latest dominant axis so a tie on a diagonal does not flicker. */
  let faceAxis: "side" | "depth" = "depth";
  let camYaw = Math.PI / 2;
  let outsideYaw = camYaw;
  let camDist: number | null = null;
  let camHeight: number | null = null;
  let camLookY: number | null = null;
  let charge = 0;
  let shotCameraLeft = 0;
  let shotCameraActive = false;
  let basketballCameraMode: BasketballCameraMode = "behind";
  const basketballCamera = createBasketballCamera(camera);
  const courtCameraCutaway = createCourtCameraCutaway(world.exterior);
  const courtCameraPool = Array.from({ length: 12 }, () => new THREE.Vector3());
  const courtCameraPoints: THREE.Vector3[] = [];
  let scoredFlight = false;
  let shotFeedback = "";
  const previousBall = new THREE.Vector3();
  let courtMatch: CourtMatch | null = null;
  const courtActors: THREE.Group[] = [];
  const courtFans: THREE.Object3D[] = [];
  let cheerLeft = 0,
    lastCheerScore = 0;
  for (const [asset, x, z] of [
    [characters.pedestrian.female02, 59, -31.3],
    [characters.pedestrian.male04, 61.5, -31.4],
    [characters.pedestrian.female03, 72, -31.3],
    [characters.pedestrian.male02, 74.4, -31.5],
    [characters.pedestrian.male01, 58.5, -12.3],
    [characters.pedestrian.female01, 73.5, -12.4],
  ] as const) {
    const fan = spawnCourtActor(asset, x, z, world.exterior);
    fan.name = "901-court-fan";
    fan.userData.heading = Math.atan2(66 - x, -22 - z);
    fan.userData.idle = true;
    courtFans.push(fan);
    world.billboards.push(fan);
  }
  let practiceYaw = camYaw;
  const courtAnimation = createCourtAnimation(player);
  const courtUniforms = createCourtUniforms();
  let courtKitIndex = 0;
  let teamJerseys = true;
  const actionHand = new THREE.Vector3();
  const hiddenCourtCast = new Map<THREE.Object3D, boolean>();
  function teamRing(host: THREE.Object3D, color: number) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.43, 0.5, 32),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
    );
    ring.name = "court-team-ring";
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.015;
    host.add(ring);
    return ring;
  }
  const humanRing = teamRing(player, 0x49e975);
  humanRing.visible = false;
  function endCourtMatch() {
    courtMatch = null;
    camYaw = practiceYaw;
    ballHeld = true;
    charge = 0;
    courtActors.forEach((actor) => {
      actor.visible = false;
    });
    humanRing.visible = false;
    hiddenCourtCast.forEach((visible, actor) => {
      actor.visible = visible;
    });
    hiddenCourtCast.clear();
  }

  function courtCommand(code: string) {
    if (place !== "court") return false;
    if (code === "KeyJ") {
      courtKitIndex = (courtKitIndex + 1) % 4;
      teamJerseys = courtKitIndex < 3;
      push(hud());
      return true;
    }
    if (code === "KeyB") {
      basketballCameraMode =
        BASKETBALL_CAMERAS[
          (BASKETBALL_CAMERAS.indexOf(basketballCameraMode) + 1) % BASKETBALL_CAMERAS.length
        ]!;
      push(hud());
      return true;
    }
    if (code === "KeyG" || code === "KeyH") {
      if (!courtMatch) practiceYaw = camYaw;
      startCourtMatch(code === "KeyG" ? "half" : "full");
      return true;
    }
    if (!courtMatch) return false;
    if (code === "Escape") {
      endCourtMatch();
      return true;
    }
    const action =
      code === "KeyF"
        ? "pass"
        : code === "KeyC"
          ? "cross"
          : code === "KeyV"
            ? "dunk"
            : code === "KeyL"
              ? "layup"
              : code === "KeyE"
                ? "steal"
                : null;
    if (action) {
      courtAction(courtMatch, action, world.hoops);
      return true;
    }
    return false;
  }

  function startCourtMatch(mode: CourtMode) {
    courtMatch = createCourtMatch(mode);
    camYaw = Math.PI;
    charge = 0;
    shotCameraLeft = 0;
    pinBall = null;
    if (!courtActors.length)
      for (const asset of [characters.courtOg, characters.nitro, characters.strike]) {
        const actor = spawnCourtActor(asset, 64, -22, world.exterior);
        actor.name = "basketball-match-athlete";
        teamRing(actor, courtActors.length === 0 ? 0x49e975 : 0xe0b33a);
        courtActors.push(actor);
      }
    courtActors.forEach((actor) => {
      actor.visible = true;
    });
    humanRing.visible = true;
    for (const actor of world.billboards)
      if (["court-og", "nitro", "strike"].includes(actor.userData.asset?.id ?? "")) {
        if (!hiddenCourtCast.has(actor)) hiddenCourtCast.set(actor, actor.visible);
        actor.visible = false;
      }
    player.position.set(courtMatch.players[0]!.x, 0.08, courtMatch.players[0]!.z);
    dialogue = "";
  }
  let charging = false;
  let interactHeld = false;
  let ballHeld = false;
  let pinBall: THREE.Vector3 | null = null;
  let logOpen = false;
  const city: City = freshCity();
  const ballVel = new THREE.Vector3();
  let flightTouchedRim = false;
  player.position.set(-30.2, 0, 5.55);
  player.userData.heading = Math.PI / 2;

  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "null") as {
      dollars?: number;
      respect?: number;
      carrying?: boolean;
      delivered?: boolean;
      mission?: string;
      dialogue?: string;
      bait?: number;
      fit?: City["fit"];
      fed?: boolean;
      fished?: boolean;
      bowled?: boolean;
      raced?: boolean;
      bestBowl?: number;
      bestRace?: number;
      hauntTicket?: boolean;
      hauntCleared?: boolean;
    } | null;
    if (saved && Number.isFinite(saved.dollars)) dollars = saved.dollars!;
    if (saved && Number.isFinite(saved.respect)) respect = saved.respect!;
    if (saved?.carrying) carrying = true;
    if (saved?.delivered) delivered = true;
    if (saved?.mission) mission = saved.mission;
    if (saved && Number.isFinite(saved.bait)) city.bait = saved.bait!;
    if (saved?.fit) city.fit = saved.fit;
    if (saved?.fed) city.fed = true;
    if (saved?.fished) city.fished = true;
    const sv = saved as
      | (typeof saved & {
          worms?: number;
          shad?: number;
          cooler?: Catch[];
          records?: Partial<Record<SpeciesId, number>>;
          totalCaught?: number;
        })
      | null;
    fishing.worms = Number.isFinite(sv?.worms)
      ? sv!.worms!
      : Number.isFinite(saved?.bait)
        ? saved!.bait!
        : 0;
    if (Number.isFinite(sv?.shad)) fishing.shad = sv!.shad!;
    if (Array.isArray(sv?.cooler)) fishing.cooler = sv!.cooler!.slice(0, 6);
    if (sv?.records) fishing.records = sv.records;
    if (Number.isFinite(sv?.totalCaught)) fishing.totalCaught = sv!.totalCaught!;
    if (saved?.bowled) city.bowled = true;
    if (saved?.raced) city.raced = true;
    if (saved && Number.isFinite(saved.bestBowl)) city.bestBowl = saved.bestBowl!;
    if (saved && Number.isFinite(saved.bestRace)) city.bestRace = saved.bestRace!;
    if (saved?.hauntTicket) hauntTicket = true;
    if (saved?.hauntCleared) hauntCleared = true;
    const sv2 = saved as (typeof saved & { wonMatch?: boolean; finale?: boolean }) | null;
    if (sv2?.wonMatch) city.wonMatch = true;
    if (sv2?.finale) city.finale = true;
  } catch {
    /* fresh slice */
  }

  const onKey = (e: KeyboardEvent, down: boolean) => {
    const code = e.code || e.key;
    if (veli.open && e.target instanceof HTMLSelectElement) return;
    if ((veli.open || foodCourt.open) && code !== "KeyE") {
      if (down && code === "Escape") {
        veli.open = false;
        foodCourt.open = null;
        e.preventDefault();
        push(hud());
      }
      return;
    }
    if (
      [
        "KeyW",
        "KeyA",
        "KeyS",
        "KeyD",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Space",
        "KeyN",
        "KeyE",
        "KeyM",
        "KeyQ",
        "KeyR",
        "ShiftLeft",
        "ShiftRight",
      ].includes(code) ||
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
    )
      e.preventDefault();
    if (down && e.repeat) return;
    if (paused) {
      if (down && code === "Escape") {
        e.preventDefault();
        togglePause(false);
      }
      return;
    }
    if (down && courtCommand(code)) {
      e.preventDefault();
      return;
    }
    if (down && code === "Escape" && !city.race && !city.bowl) {
      e.preventDefault();
      togglePause(true);
      return;
    }
    const names = [code, e.key].filter(Boolean);
    if (down) names.forEach((name) => keys.add(name));
    else names.forEach((name) => keys.delete(name));
    // A quick interaction tap may start and end between two rendered frames.
    if (down && (code === "KeyE" || e.key === "e" || e.key === "E")) {
      if (place === "street" && near(VELI_ANCHOR, 2) && !veli.open && veli.serving <= 0)
        veliTv.play();
      interactQueued = true;
    }
    if (down && (code === "KeyN" || e.key === "n" || e.key === "N")) cycleLight();
    if (down && (code === "KeyM" || e.key === "m" || e.key === "M")) logOpen = !logOpen;
  };
  function togglePause(next = !paused) {
    paused = next;
    if (paused) {
      clearKeys();
      charging = false;
      audio.suspend();
    } else {
      audio.resume();
      last = performance.now();
    }
    push(hud());
  }
  const kd = (e: KeyboardEvent) => onKey(e, true);
  const ku = (e: KeyboardEvent) => onKey(e, false);
  const clearKeys = () => {
    keys.clear();
    pulses.clear();
    touchX = touchY = 0;
    glideX = glideZ = 0;
    charging = false;
    interactQueued = interactHeld = false;
    if (orbitPointer !== null) {
      const pointer = orbitPointer;
      orbitPointer = null;
      if (canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
    }
  };
  const onVisibility = () => {
    if (document.hidden) {
      clearKeys();
      veliTv.pause();
    }
  };
  window.addEventListener("keydown", kd);
  const wake = () => {
    audio.unlock();
    audio.setMusicEnabled(true);
  };
  const onWakeKey = (e: KeyboardEvent) => {
    wake();
    if (e.code === "KeyX") audio.toggleMuted();
  };
  const onAudioVisibility = () => (document.hidden ? audio.suspend() : audio.resume());
  window.addEventListener("keydown", onWakeKey);
  window.addEventListener("pointerdown", wake, { passive: true });
  document.addEventListener("visibilitychange", onAudioVisibility);
  window.addEventListener("keyup", ku);
  window.addEventListener("blur", clearKeys);
  document.addEventListener("visibilitychange", onVisibility);

  // Mouse dragging and mobile swipes orbit the view. HUD controls use separate elements.
  let orbitPointer: number | null = null;
  let lastOrbitX = 0;
  const orbitDown = (e: PointerEvent) => {
    if (orbitPointer !== null || (e.pointerType === "mouse" && e.button !== 0)) return;
    orbitPointer = e.pointerId;
    lastOrbitX = e.clientX;
    canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const orbitMove = (e: PointerEvent) => {
    if (orbitPointer !== e.pointerId) return;
    camYaw += (e.clientX - lastOrbitX) * 0.008;
    lastOrbitX = e.clientX;
    e.preventDefault();
  };
  const orbitEnd = (e: PointerEvent) => {
    if (orbitPointer !== e.pointerId) return;
    orbitPointer = null;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  };
  canvas.style.touchAction = "none";
  canvas.addEventListener("pointerdown", orbitDown);
  canvas.addEventListener("pointermove", orbitMove);
  canvas.addEventListener("pointerup", orbitEnd);
  canvas.addEventListener("pointercancel", orbitEnd);
  canvas.addEventListener("lostpointercapture", orbitEnd);

  const api: V2Public = {
    x: player.position.x,
    y: player.position.y,
    z: player.position.z,
    facing,
    place,
    cars: [],
    dollars,
    respect,
    mission,
    carrying,
    dialogue,
    pose: facing,
  };
  (window as unknown as { __SACK_V2__?: V2Public }).__SACK_V2__ = api;

  let hudAcc = 0;
  let last = performance.now();
  let frame = 0;

  let renderWidth = 0;
  let renderHeight = 0;
  let renderRatio = 0;
  let resizeCount = 0;
  const resize = () => {
    const w = Math.max(1, canvas.clientWidth || window.innerWidth);
    const h = Math.max(1, canvas.clientHeight || window.innerHeight);
    const ratio = Math.min(window.devicePixelRatio || 1, 1.75);
    if (w === renderWidth && h === renderHeight && ratio === renderRatio) return;
    renderWidth = w;
    renderHeight = h;
    resizeCount++;
    if (ratio !== renderRatio) {
      renderRatio = ratio;
      renderer.setPixelRatio(ratio);
      composer.setPixelRatio(ratio);
    }
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize);

  const save = createSaveWriter((value) => localStorage.setItem(SAVE_KEY, value));
  let captureFrozen = false;
  /** One frame's worth of input edges. Shared by the render loop and the headless simulate hook. */
  function pollInput() {
    const hold = keys.has("Space") || charging;
    for (const [code, left] of pulses) {
      if (left <= 1) {
        pulses.delete(code);
        keys.delete(code);
      } else pulses.set(code, left - 1);
    }
    const interact = keys.has("KeyE");
    const interactEdge = interactQueued || (interact && !interactHeld);
    interactQueued = false;
    interactHeld = interact;
    return { hold, interactEdge };
  }
  let renderOff = false;

  const loop = (now: number) => {
    frame = requestAnimationFrame(loop);
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    resize();
    if (captureFrozen) {
      composer.render();
      return;
    }
    if (paused) {
      composer.render();
      return;
    }

    const { hold, interactEdge } = pollInput();
    if (veli.serving > 0) veli.serving = Math.max(0, veli.serving - dt);
    animateVeliTruck(veliTruck, veli.serving, player.position);
    if (place !== "street" || !near(VELI_ANCHOR, 8)) veliTv.pause();
    if (foodCourt.left > 0) {
      foodCourt.left = Math.max(0, foodCourt.left - dt);
      if (foodCourt.left === 0) foodCourt.serving = null;
    }
    animateFoodCourt(
      foodTrucks,
      foodCourt.serving,
      foodCourt.left,
      player.position,
      foodCourt.activeBrother,
    );
    const serving = veli.serving > 0 ? veli.serving : foodCourt.left;
    const vendor =
      veli.serving > 0 ? veliTruck : foodCourt.serving ? foodTrucks[foodCourt.serving] : null;
    if (vendor) vendor.userData.receiverBrother = foodCourt.activeBrother;
    foodReceiver.control(
      dt,
      serving,
      vendor?.getObjectByName(
        veli.serving > 0 ? "veli-customer-box" : `${foodCourt.serving}-order-tray`,
      ) ?? null,
      vendor?.position.x ?? 62,
      place === "street" &&
        city.fit === "default" &&
        (veli.serving > 0 || foodCourt.serving === "brothers" || foodReceiver.active),
    );
    const menuWasOpen = veli.open || Boolean(foodCourt.open);
    if (menuWasOpen) {
      if (interactEdge) {
        veli.open = false;
        foodCourt.open = null;
      }
      glideX = glideZ = 0;
    }
    step(dt, hold, interactEdge && !menuWasOpen);
    if (!hold) charging = false;

    hudAcc += dt;
    if (hudAcc > 0.12) {
      hudAcc = 0;
      push(hud());
      save({
        dollars,
        respect,
        carrying,
        delivered,
        mission,
        bait: fishing.worms,
        fit: city.fit,
        fed: city.fed,
        fished: city.fished,
        bowled: city.bowled,
        raced: city.raced,
        worms: fishing.worms,
        shad: fishing.shad,
        cooler: fishing.cooler,
        records: fishing.records,
        totalCaught: fishing.totalCaught,
        bestBowl: city.bestBowl,
        bestRace: city.bestRace,
        hauntTicket,
        hauntCleared,
        wonMatch: city.wonMatch,
        finale: city.finale,
      });
    }
  };
  frame = requestAnimationFrame(loop);
  push(hud());

  function hud(): HudState {
    return {
      place,
      dollars,
      respect,
      mission: courtMatch ? `901 COURT · ${courtMatch.mode.toUpperCase()} 2v2` : mission,
      prompt: promptFor(),
      charge: place === "court" ? charge : activityCharge(city),
      night,
      golden,
      made,
      taken,
      activity: city.race
        ? "race"
        : city.bowl
          ? "bowl"
          : fishingLocks(fishing)
            ? "fish"
            : undefined,
      veli: { ...veli, near: place === "street" && near(VELI_ANCHOR, 2.5) },
      foodCourt: { ...foodCourt, near: place === "street" && Boolean(nearFoodVendor()) },
      veliTv: { ...veliTv.state(), near: place === "street" && near(VELI_ANCHOR, 4) },
      basketball: courtMatch
        ? {
            mode: courtMatch.mode,
            score: [...courtMatch.score],
            clock: Math.ceil(courtMatch.clock),
            feedback: courtMatch.feedback,
            phase: courtMatch.phase,
          }
        : undefined,
      basketballCamera: basketballCameraMode,
      teamJerseys,
      basketballKit: COURT_KIT_NAMES[courtKitIndex],
      dialogue,
      carrying,
      x: player.position.x,
      z: player.position.z,
      fit: city.fit,
      bait: city.bait,
      boost: city.boost > 0,
      log: logOpen,
      marks: {
        fish: city.fished,
        bowl: city.bowled,
        food: city.fed,
        race: city.raced,
        court: city.wonMatch,
        haunt: hauntCleared,
      },
      fishing:
        fishing.phase !== "idle" || near(world.districts.pier, 2.4) ? fishingHud(fishing) : null,
      bowl: city.bowl
        ? {
            frames: frameBoard(city.bowl),
            score: city.bowl.score,
            best: city.bestBowl,
            standing: city.bowl.standing,
          }
        : null,
      paused,
      muted: audio.muted,
      bestBowl: city.bestBowl,
      bestRace: city.bestRace,
    };
  }

  function promptFor() {
    if (veli.open || foodCourt.open) return "";
    if (foodCourt.left > 0) return "Your food is coming from the window.";
    const vendor = nearFoodVendor();
    if (place === "street" && vendor)
      return `E  ${FOOD_VENDORS[vendor].name} · order at the window`;
    if (veli.serving > 0) return "Yungveli is serving your order.";
    if (place === "street" && near(VELI_ANCHOR, 2)) return "E  Veli’s Wings · order from Yungveli";
    if (courtMatch) return courtMatch.feedback;
    const live = activityPrompt(city);
    if (live) return live;
    if (place === "street" && near(world.homeDoor, 1.4)) return "E  Enter home";
    if (place === "street" && near(world.hqDoor, 1.6)) return "E  Enter $ackReligious";
    if (place === "home" && nearLocal(world.homeIn, 1.3, 0, 200)) return "E  Leave home";
    if (place === "hq" && nearLocal(world.hqIn, 1.4, 80, 200)) return "E  Leave HQ";
    if (place === "hq" && nearLocal(world.kAnchor, 2.2, 80, 200))
      return delivered ? "E  Talk to K Blanco" : "E  Talk to K Blanco";
    if (place === "home" && nearLocal(world.wardrobe, 1.35, 0, 200)) return "E  Change fit";
    if (near(world.courtOg, 1.8))
      return carrying ? "E  Deliver to Court OG" : "E  Talk to Court OG";
    if (place === "street" && near(world.districts.bowlDoor, 2.4)) return "E  Roll at 901 Bowl";
    if (fishingLocks(fishing)) return fishingHud(fishing).prompt;
    if (place === "street" && near(world.districts.pier, 2.2))
      return `E  Cast  (${fishingHud(fishing).bait})`;
    if (place === "street" && near(world.districts.bait, 2.2))
      return "E  Worms $15  ·  Shift+E  Cut shad $25";
    if (place === "street" && near(world.districts.meetStart, 2.6))
      return "E  Race Nitro · three-lap circuit";
    if (place === "street" && near(world.haunt.ticket, 1.8))
      return hauntTicket ? "E  Ticket punched" : "E  Buy a ticket  $10";
    if (place === "street" && near(world.haunt.gate, 1.8))
      return hauntTicket ? "E  Enter the house" : "E  Need a ticket";
    if (place === "haunt" && nearLocal(world.haunt.exit, 1.5, 0, 500)) return "E  Leave the house";
    if (place === "court") return ballHeld ? "Hold to shoot" : "E  Pick up ball";
    if (namedPed(1.7)) return "E  Talk";
    return "";
  }

  function near(p: { x: number; z: number }, r: number) {
    return Math.hypot(player.position.x - p.x, player.position.z - p.z) < r;
  }

  function nearLocal(p: { x: number; z: number }, r: number, ox: number, oz: number) {
    return Math.hypot(player.position.x - (p.x + ox), player.position.z - (p.z + oz)) < r;
  }

  function pushCircle(mesh: THREE.Object3D, reach: number) {
    const dx = player.position.x - mesh.position.x;
    const dz = player.position.z - mesh.position.z;
    const d = Math.hypot(dx, dz);
    if (d >= reach || d < 0.001) return;
    player.position.x += (dx / d) * (reach - d);
    player.position.z += (dz / d) * (reach - d);
  }

  function separateBodies() {
    if (place !== "street" && place !== "court") return;
    for (const car of cars)
      pushCircle(car.mesh, ((car.mesh.userData.radius as number) || 2.2) * 0.72);
    for (const mesh of parked) pushCircle(mesh, ((mesh.userData.radius as number) || 2.2) * 0.55);
    for (const ped of world.billboards) {
      const dx = player.position.x - ped.position.x;
      const dz = player.position.z - ped.position.z;
      const d = Math.hypot(dx, dz);
      const min = 0.58;
      if (d >= min || d < 0.001) continue;
      const push = Math.min(0.12, (min - d) * 0.65);
      player.position.x += (dx / d) * push;
      player.position.z += (dz / d) * push;
      ped.position.x -= (dx / d) * push * 0.45;
      ped.position.z -= (dz / d) * push * 0.45;
    }
  }

  function step(dt: number, hold: boolean, interact: boolean) {
    applyNight();
    const cameraTurn = (keys.has("KeyR") ? 1 : 0) - (keys.has("KeyQ") ? 1 : 0);
    camYaw += cameraTurn * 1.75 * dt;
    const steer =
      (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
      (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0) +
      touchX;
    const sx = steer;
    const sy =
      (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) -
      (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) +
      touchY;
    const len = Math.hypot(sx, sy);
    if (city.race) {
      stepRace(dt, sx, sy, hold, interact);
      return;
    }
    if (fishing.phase === "wait" && len > 0.15) {
      fishing.phase = "idle";
      say("River — Line is in. Come back whenever you want to fish.");
      glideX = glideZ = 0;
    }
    const busy =
      foodReceiver.active ||
      locked(city) ||
      fishingLocks(fishing) ||
      veli.open ||
      veli.serving > 0 ||
      Boolean(foodCourt.open) ||
      foodCourt.left > 0;
    const wantsMove = !busy && len > 0.15;
    if (wantsMove) {
      camDist = null;
      camHeight = null;
      camLookY = null;
      const ax = Math.abs(sx);
      const ay = Math.abs(sy);
      if (ax > ay * 1.15) faceAxis = "side";
      else if (ay > ax * 1.15) faceAxis = "depth";
      facing = faceAxis === "side" ? (sx > 0 ? "right" : "left") : sy > 0 ? "back" : "front";
    }
    const walkSpeed = 6.4;
    const sprintSpeed = 10.2;
    let speed = 0;
    if (wantsMove) {
      speed =
        (keys.has("ShiftLeft") || keys.has("ShiftRight") ? sprintSpeed : walkSpeed) *
        Math.min(1, len);
      if (city.fit === "night") speed *= 1.12;
      if (city.boost > 0) speed *= 1.22;
    }
    const basis = screenBasis();
    const wishX = wantsMove ? ((basis.rightX * sx + basis.fwdX * sy) / len) * speed : 0;
    const wishZ = wantsMove ? ((basis.rightZ * sx + basis.fwdZ * sy) / len) * speed : 0;
    if (wantsMove && glideX * wishX + glideZ * wishZ < 0) {
      glideX = 0;
      glideZ = 0;
    }
    const follow = 1 - Math.exp(-(wantsMove ? 14 : 12) * dt);
    glideX += (wishX - glideX) * follow;
    glideZ += (wishZ - glideZ) * follow;
    if (!wantsMove && Math.hypot(glideX, glideZ) < 0.06) {
      glideX = 0;
      glideZ = 0;
    }
    if (place === "haunt") {
      // Substeps prevent sprinting across multiple risers or thin rail collisions.
      const count = Math.max(1, Math.ceil((Math.hypot(glideX, glideZ) * dt) / 0.09));
      const dx = (glideX * dt) / count,
        dz = (glideZ * dt) / count;
      for (let i = 0; i < count; i++) {
        const x = player.position.x,
          z = player.position.z;
        player.position.x += dx;
        player.position.z += dz;
        const zone = collisionZone();
        resolve(player.position, 0.34, zone.solids, zone.ox, zone.oz);
        if (!canWalkHaunt(x, z - 500, player.position.x, player.position.z - 500)) {
          player.position.x = x;
          player.position.z = z;
        }
        player.position.y = hauntFloorAt(player.position.x, player.position.z - 500) + 0.03;
      }
    } else {
      player.position.x += glideX * dt;
      player.position.z += glideZ * dt;
    }
    travel += Math.hypot(glideX, glideZ) * dt;
    player.userData.life = ((player.userData.life as number) ?? 0) + dt;
    if (place === "court" && ballHeld && hold)
      facing = faceAlong(world.hoop.x - player.position.x, world.hoop.z - player.position.z);
    const zone = collisionZone();
    resolve(player.position, 0.34, zone.solids, zone.ox, zone.oz);
    if (city.bowl) {
      player.position.x = 92;
      player.position.z = -17.6;
      facing = "back";
    }
    if (fishingLocks(fishing) && fishing.phase !== "casting")
      facing = faceAlong(
        bobber.position.x - player.position.x,
        bobber.position.z - player.position.z,
      );
    separateBodies();
    // Door openings remain real colliders, not teleport triggers through walls.
    if (place === "home" && player.position.z >= 203.7 && Math.abs(player.position.x) < 1.35) {
      leaveInterior("home");
    } else if (
      place === "hq" &&
      player.position.z >= 205.65 &&
      Math.abs(player.position.x - 80) < 1.9
    ) {
      leaveInterior("hq");
    }
    if (place === "street" || place === "court") {
      if (player.position.x < -104) {
        player.position.x = -104;
        glideX = 0;
      }
      if (player.position.x > 148) {
        player.position.x = 148;
        glideX = 0;
      }
      if (player.position.z < -92) {
        player.position.z = -92;
        glideZ = 0;
      }
      if (player.position.z > 40) {
        player.position.z = 40;
        glideZ = 0;
      }
      resolve(player.position, 0.34, zone.solids, zone.ox, zone.oz);
    }
    carried.visible = carrying;
    world.counterPack.visible = !carrying && !delivered;

    if (interact) tryEnter();
    const play = tickCity(city, dt, hold, steer);
    if (city.bowl?.lastEvents?.length) {
      for (const e of city.bowl.lastEvents) {
        if (e === "release") audio.play("bowlRelease");
        else if (e === "gutter") audio.play("gutter");
        else if (e === "foul") audio.play("foul");
        else if (e === "pinhit") audio.play("pins", Math.min(1, city.bowl.roll.fellThisRoll / 10));
        else if (e === "settled") {
          const b = city.bowl;
          if (b.roll.foul) {
            /* foul buzz already played */
          } else if (b.roll.fellThisRoll === 10) audio.play("strike");
          else if (b.standing - b.roll.fellThisRoll === 0) audio.play("spare");
        }
      }
      city.bowl.lastEvents.length = 0;
    }
    if (city.bowl?.phase === "roll" && city.bowl.roll.ball && !city.bowl.roll.ball.gutter)
      audio.play("bowlRoll", Math.min(1, city.bowl.roll.ball.vs / 9));
    if (play) grant(play);
    if (!city.bowl && /901 Bowl|on the lane/.test(dialogue)) {
      dialogue = "";
      talkLeft = 0;
    }
    if (talkLeft > 0) {
      talkLeft -= dt;
      if (talkLeft <= 0) dialogue = "";
    }
    updateFishing(dt, hold, interact);
    rod.visible = fishingLocks(fishing);
    bobber.visible = fishingLocks(fishing) && fishing.phase !== "casting";
    if (bobber.visible) {
      const dip =
        fishing.phase === "wait" && fishing.nibbling > 0
          ? -0.05
          : fishing.phase === "bite"
            ? -0.09
            : 0;
      bobber.position.set(
        fishing.lure.x,
        0.055 + dip + Math.sin(performance.now() / (fishing.phase === "bite" ? 85 : 220)) * 0.012,
        fishing.lure.z,
      );
    }
    if (city.bowl && lastBowlRack !== city.bowl.rack) {
      resetPins();
      lastBowlRack = city.bowl.rack;
    }
    presentBowl(dt);
    if ((place === "haunt") !== wasInHaunt) {
      wasInHaunt = place === "haunt";
      if (wasInHaunt) {
        enterHaunt(hauntStage);
        loadHauntProps();
      }
      audio.mood = wasInHaunt ? "haunt" : "street";
    }
    if (place === "haunt") {
      const moving = Math.hypot(glideX, glideZ) > 0.25;
      const staged = tickHauntStage(hauntStage, {
        dt,
        x: player.position.x,
        z: player.position.z - 500,
        moving,
      });
      for (const e of staged) {
        if (e.kind === "heartbeat") continue;
        const sfx: Sfx =
          e.kind === "sting"
            ? "sting"
            : e.kind === "creak"
              ? "creak"
              : e.kind === "whisper"
                ? "whisper"
                : e.kind === "blackout"
                  ? "doorlock"
                  : "flicker";
        audio.play(sfx, e.volume);
        if (e.line) say(e.line, e.kind === "blackout" ? 2.4 : 3.2);
      }
      audio.tickHeartbeat(dt, hauntStage.heartbeat);
      const scale = hauntLightScale(hauntStage);
      for (const light of world.haunt.lights) {
        const base =
          typeof light.userData.baseIntensity === "number" ? light.userData.baseIntensity : 18;
        light.intensity = base * scale;
      }
    }
    if (place === "haunt" && !hauntCleared) {
      const room = world.haunt.finalRoom;
      if (
        player.position.x > room.minX &&
        player.position.x < room.maxX &&
        player.position.z > room.minZ &&
        player.position.z < room.maxZ
      ) {
        hauntCleared = true;
        respect += 8;
        say("Final court — You walked the house. The last rim is lit.", 4.2);
        mission = delivered
          ? (cityMission(city, delivered, true) ?? mission)
          : "The haunted house let you through.";
      }
    }
    updatePlace();
    updateBall(dt, hold, interact);
    updateTraffic(dt);
    updatePeds(dt);
    placeCamera(dt);
    faceAvatar(dt);
    foodReceiver.update(camera);
    if (foodReceiver.active) avatar.visible = false;
    presentFishing();
    animateRiverfront(performance.now() / 1000);
    faceFoliage(camera.position);
    quality.followShadows(player.position);
    animateNets(world.exterior, dt);
    if (place === "haunt") {
      animateHauntLibrary(world.haunt.group, performance.now() / 1000);
      animateHauntAtmosphere(world.haunt.group, performance.now() / 1000);
      animateHauntDetail(world.haunt.detail.motes, world.haunt.group, performance.now() / 1000);
      updateApparition(
        world.haunt.detail.apparition,
        dt,
        player.position.x,
        player.position.z - 500,
      );
    }
    for (const node of world.exterior.children)
      if (node.name === "haunt-ground-mist") {
        node.position.x =
          Number(node.userData.homeX) +
          Math.sin(performance.now() / 2800 + Number(node.userData.phase)) * 0.65;
      }
    if (!renderOff) composer.render();

    api.x = player.position.x;
    api.y = player.position.y;
    api.z = player.position.z;
    api.facing = facing;
    api.pose = String(avatar.userData.pose ?? facing);
    api.place = place;
    api.cars = cars.map((car) => ({
      x: car.mesh.position.x,
      z: car.mesh.position.z,
      yaw: car.mesh.rotation.y,
      speed: car.speed,
    }));
    api.dollars = dollars;
    api.respect = respect;
    api.mission = mission;
    api.carrying = carrying;
    api.dialogue = dialogue;
    api.hauntStage = {
      room: hauntStage.inRoom,
      fired: hauntStage.fired.size,
      lightScale: hauntLightScale(hauntStage),
      blackout: hauntStage.blackout,
      heartbeat: hauntStage.heartbeat,
    };
    api.fishing = {
      phase: fishing.phase,
      cooler: fishing.cooler.length,
      worms: fishing.worms,
      shad: fishing.shad,
      tension: fishing.tension,
    };
  }

  function stopRace() {
    city.race = null;
    circuit.group.visible = false;
    raceOverview = false;
    player.visible = true;
    player.position.set(-40, 0, -36);
    glideX = glideZ = 0;
    world.exterior.visible = true;
    say("Nitro — Keys back. E to race again.");
  }

  function stepRace(dt: number, sx: number, sy: number, drift: boolean, interact: boolean) {
    const race = city.race!;
    const raceFog = world.scene.fog as THREE.Fog;
    raceFog.near = 80;
    raceFog.far = 280;
    if (interact) {
      stopRace();
      return;
    }
    world.exterior.visible = false;
    player.visible = false;
    circuit.group.visible = true;
    tickRace(race, dt, THREE.MathUtils.clamp(sy, -1, 1), THREE.MathUtils.clamp(-sx, -1, 1), drift);
    const result = crossFinish(city);
    if (result) grant(result);
    circuit.human.position.set(race.x, 0.065, race.z);
    circuit.human.rotation.y = race.yaw + Math.PI;
    const rival = rivalPose(race);
    if (race.phase === "running") {
      audio.play("engine", Math.min(1, race.speed / 27));
      if (drift && race.speed > 8) audio.play("drift", Math.min(1, race.speed / 27));
    } else if (race.phase === "countdown") {
      const tick = Math.ceil(race.countdown);
      if (tick !== lastCountdownTick) {
        lastCountdownTick = tick;
        audio.play("countdown", tick <= 0 ? 1 : 0);
      }
    }
    for (const e of race.events) {
      if (e === "contact") audio.play("backboard");
      else if (e === "draft") audio.play("pickup");
      else if (e === "overtake") audio.play("cash");
      else if (e === "overtaken") audio.play("denied");
      else if (e === "lap") audio.play("ui");
      else if (e === "finish") audio.play(race.won ? "complete" : "buzzer");
    }
    circuit.nitro.position.set(rival.x, 0.065, rival.z);
    circuit.nitro.rotation.y = rival.yaw + Math.PI;
    circuit.marker.position.set(race.x, 2.15, race.z);
    circuit.marker.rotation.z = Math.PI;
    circuit.sparks.visible = race.wasDrifting || race.boost > 0;
    const sparkPoints = circuit.sparks.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < 6; i++)
      sparkPoints.setXYZ(
        i,
        race.x +
          Math.sin(race.yaw) * (0.9 + i * 0.12) +
          (i % 2 ? 0.65 : -0.65) * Math.cos(race.yaw),
        0.18 + (i % 3) * 0.06,
        race.z +
          Math.cos(race.yaw) * (0.9 + i * 0.12) -
          (i % 2 ? 0.65 : -0.65) * Math.sin(race.yaw),
      );
    sparkPoints.needsUpdate = true;
    circuit.sparks.geometry.computeBoundingSphere();
    player.position.set(race.x, 0.065, race.z);
    const fov = cameraFraming(camera.aspect, 56 + race.speed * 0.24, false).fov;
    camera.fov = fov;
    camera.updateProjectionMatrix();
    const scale = cameraFraming(camera.aspect, fov, false).distanceScale;
    const desired = new THREE.Vector3(
      race.x + Math.sin(race.yaw) * 8.4 * scale,
      4.1 * scale,
      race.z + Math.cos(race.yaw) * 8.4 * scale,
    );
    if (raceOverview) {
      camera.position.set(0, 100, -150);
      camera.lookAt(0, 0, -150);
    } else {
      camera.position.lerp(desired, 1 - Math.exp(-5 * dt));
      camera.lookAt(race.x - Math.sin(race.yaw) * 3, 0.65, race.z - Math.cos(race.yaw) * 3);
    }
    presentVehicles(camera.position);
    if (!renderOff) composer.render();
    api.x = race.x;
    api.y = 0.065;
    api.z = race.z;
    api.place = "street";
    api.dollars = dollars;
    api.respect = respect;
    api.dialogue = dialogue;
    if (talkLeft > 0) {
      talkLeft -= dt;
      if (talkLeft <= 0) dialogue = "";
    }
  }

  function screenBasis() {
    const yaw = place === "court" && basketballCamera.active ? basketballCamera.yaw : camYaw;
    const fwdX = Math.sin(yaw);
    const fwdZ = Math.cos(yaw);
    return { fwdX, fwdZ, rightX: -fwdZ, rightZ: fwdX };
  }

  function faceAlong(dx: number, dz: number): Facing {
    const basis = screenBasis();
    const side = dx * basis.rightX + dz * basis.rightZ;
    const depth = dx * basis.fwdX + dz * basis.fwdZ;
    if (Math.abs(side) > Math.abs(depth)) return side > 0 ? "right" : "left";
    return depth > 0 ? "back" : "front";
  }

  function collisionZone(): { solids: Solid[]; ox: number; oz: number } {
    if (place === "home") return { solids: world.solids.home, ox: 0, oz: 200 };
    if (place === "hq") return { solids: world.solids.hq, ox: 80, oz: 200 };
    if (place === "haunt")
      return {
        solids: world.solids.haunt.filter(
          (s) =>
            player.position.y + 1.8 >= (s.minY ?? -Infinity) &&
            player.position.y <= (s.maxY ?? Infinity),
        ),
        ox: 0,
        oz: 500,
      };
    return { solids: world.solids.street, ox: 0, oz: 0 };
  }

  function leaveInterior(from: "home" | "hq") {
    const destination = from === "home" ? world.homeOut : world.hqOut;
    place = "street";
    player.position.set(destination.x, 0, destination.z);
    camYaw = outsideYaw;
    glideX = 0;
    glideZ = 0;
  }

  function nearFoodVendor(): FoodVendor | null {
    return (["brothers", "catch901"] as const).find((id) => near(FOOD_VENDORS[id], 2)) ?? null;
  }

  function tryEnter() {
    if (foodReceiver.active) return;
    if (veli.serving > 0 || foodCourt.left > 0) return;
    const foodVendor = nearFoodVendor();
    if (place === "street" && foodVendor === "catch901" && fishing.cooler.length) {
      // 901 Catch Kitchen buys the cooler before it sells you a plate.
      const sale = sellCooler(fishing);
      grant({
        dollars: sale.dollars,
        respect: sale.respect,
        dialogue: sale.line.replace("Mama Dee", "901 Catch"),
      });
      audio.play("cash");
      return;
    }
    if (place === "street" && foodVendor) {
      foodCourt.open = foodVendor;
      touchX = touchY = 0;
      keys.clear();
      glideX = glideZ = 0;
      return;
    }
    if (place === "street" && near(VELI_ANCHOR, 2)) {
      veli.open = !veli.open;
      touchX = touchY = 0;
      keys.clear();
      glideX = glideZ = 0;
      return;
    }
    if (city.race) {
      stopRace();
      return;
    }
    if (fishing.phase === "casting") {
      castArmed = false; // second E releases the cast
      return;
    }
    if (fishingLocks(fishing)) return; // bite/fight are read by the module each frame
    if (city.bowl?.phase === "aim" || city.bowl?.phase === "finished") {
      grant(cancelApproach(city));
      resetPins();
      return;
    }
    if (place === "haunt" && nearLocal(world.haunt.exit, 1.5, 0, 500)) {
      place = "street";
      player.position.set(world.haunt.out.x, 0, world.haunt.out.z);
      return;
    }
    if (place === "street" && near(world.haunt.ticket, 1.8)) {
      if (hauntTicket) say("Tickets — You're already on the list. Gate's open.");
      else if (dollars < 10) say("Tickets — Ten SackDollars. You're short.");
      else {
        dollars -= 10;
        hauntTicket = true;
        say("Tickets — Wristband's on. Don't touch the portraits.");
      }
      return;
    }
    if (place === "street" && near(world.haunt.gate, 1.8)) {
      if (!hauntTicket) {
        say("Gate — Ticket first. Booth is on the left.");
        return;
      }
      place = "haunt";
      player.position.set(world.haunt.inside.x, 0, world.haunt.inside.z);
      say("Foyer — Eleven rooms. The last one still has a rim.");
      return;
    }
    if (place === "street" && near(world.homeDoor, 1.4)) {
      outsideYaw = camYaw;
      camYaw = Math.PI;
      place = "home";
      player.position.set(world.homeIn.x, 0, 201.2);
      glideX = 0;
      glideZ = 0;
      return;
    }
    if (place === "street" && near(world.hqDoor, 1.6)) {
      outsideYaw = camYaw;
      camYaw = Math.PI;
      place = "hq";
      player.position.set(80, 0, 201.4);
      glideX = 0;
      glideZ = 0;
      mission = metK ? mission : "Talk to K Blanco";
      return;
    }
    if (place === "home" && nearLocal(world.homeIn, 1.3, 0, 200)) {
      leaveInterior("home");
      return;
    }
    if (place === "hq" && nearLocal(world.kAnchor, 2.2, 80, 200)) {
      metK = true;
      if (delivered && !city.finale && blockSteps(city, hauntCleared).every((st) => st.done)) {
        city.finale = true;
        dollars += 500;
        respect += 25;
        audio.play("complete");
        say(
          "K Blanco — Court, river, lanes, trucks, strip, and the house. Memphis is yours. $500, and the block stays open for you.",
          7,
        );
        mission = cityMission(city, delivered, hauntCleared) ?? mission;
      } else if (delivered) {
        say(
          city.finale
            ? "K Blanco — Block's yours. Come back when the next drop lands."
            : "K Blanco — Court OG got the drop. Now run the block — the mission line says what's next.",
        );
      } else {
        carrying = true;
        say(
          "K Blanco — Take this drop to Court OG. He is outside the 901 court. SackDollars and Respect when it lands.",
          5.5,
        );
        mission = "Deliver the package to Court OG";
      }
      return;
    }
    if (place === "home" && nearLocal(world.wardrobe, 1.35, 0, 200)) {
      grant(triggerSpot(city, "wardrobe", dollars));
      return;
    }
    if (place === "hq" && nearLocal(world.hqIn, 1.4, 80, 200)) {
      leaveInterior("hq");
      return;
    }
    if (place === "street" && near(world.districts.bowlDoor, 2.4)) {
      const play = triggerSpot(city, "bowl", dollars);
      if (play.teleport) {
        player.position.set(play.teleport.x, 0, play.teleport.z);
        resetPins();
        lastBowlRack = 0;
      }
      grant(play);
      return;
    }
    if (place === "street" && near(world.districts.pier, 2.2)) {
      const b = screenBasis();
      const fx =
        facing === "right"
          ? b.rightX
          : facing === "left"
            ? -b.rightX
            : facing === "back"
              ? b.fwdX
              : -b.fwdX;
      const fz =
        facing === "right"
          ? b.rightZ
          : facing === "left"
            ? -b.rightZ
            : facing === "back"
              ? b.fwdZ
              : -b.fwdZ;
      if (
        beginCast(
          fishing,
          { x: player.position.x, y: player.position.y, z: player.position.z },
          fx,
          fz,
          PIER_WATER,
        )
      ) {
        castArmed = true;
        audio.play("ui");
      }
      return;
    }
    if (place === "street" && near(world.districts.bait, 2.2)) {
      const kind = keys.has("ShiftLeft") || keys.has("ShiftRight") ? "shad" : "worm";
      const buy = buyBait(fishing, kind, dollars);
      grant({ dollars: buy.dollars, dialogue: buy.line });
      audio.play(buy.dollars ? "cash" : "denied");
      return;
    }
    if (place === "street" && near(world.districts.meetStart, 2.6)) {
      const play = triggerSpot(city, "meet", dollars);
      if (play.teleport) player.position.set(play.teleport.x, 0, play.teleport.z);
      grant(play);
      return;
    }
    if (near(world.courtOg, 1.8)) {
      if (carrying) {
        carrying = false;
        delivered = true;
        dollars += 80;
        respect += 10;
        dialogue = "Court OG — Drop's in. Eighty SackDollars, and that's Respect.";
        talkLeft = 4.8;
        mission = "Delivery complete. The 901 court is open.";
        const next = cityMission(city, true);
        if (next) mission = next;
      } else if (delivered) {
        dialogue = "Court OG — We good. The 901 is open.";
        talkLeft = 4.2;
      } else {
        dialogue = "Court OG — K said a drop was coming. You holding it?";
        talkLeft = 4.2;
      }
      return;
    }
    const who = namedPed(1.7);
    if (who && place === "street") grant(triggerSpot(city, who, dollars));
  }

  let talkLeft = 0;

  function say(line: string, seconds = 4.2) {
    dialogue = line;
    talkLeft = line ? seconds : 0;
  }

  function grant(play: PlayEvent) {
    if (play.dollars) dollars = Math.max(0, dollars + play.dollars);
    if (play.respect) respect += play.respect;
    if (play.dialogue != null) say(play.dialogue, play.dialogue.includes(" — ") ? 4.2 : 2.6);
    if (play.mission && delivered) mission = play.mission;
    if (play.pins != null) syncPinsFromRoll();
  }

  function namedPed(r: number): Spot | null {
    let best: Spot | null = null;
    let bestD = r;
    for (const ped of world.pedestrians) {
      const id = (ped.userData.asset as { id?: string } | undefined)?.id;
      const spot =
        id === "mama-dee"
          ? "mama"
          : id === "unc-j"
            ? "unc"
            : id === "nitro"
              ? "nitro"
              : id === "strike"
                ? "strike"
                : null;
      if (!spot) continue;
      const d = Math.hypot(player.position.x - ped.position.x, player.position.z - ped.position.z);
      if (d < bestD) {
        bestD = d;
        best = spot;
      }
    }
    return best;
  }

  function resetPins() {
    pins.forEach((pin, i) => {
      const home = pinHome[i];
      if (!home) return;
      pin.position.copy(home);
      pin.rotation.set(0, 0, 0);
      pin.userData.falling = false;
      pin.visible = true;
    });
    bowlBall.visible = false;
  }

  /** Pins fall exactly as the simulation knocked them, each away from the ball's side. */
  function syncPinsFromRoll() {
    const roll = city.bowl?.roll;
    if (!roll) return;
    const ballU = roll.ball ? roll.ball.u : 0;
    roll.fallen.forEach((down, i) => {
      const pin = pins[i];
      if (!pin || !down || pin.userData.falling) return;
      pin.userData.falling = true;
      pin.userData.fallSign = pin.position.x - 92 >= ballU ? -1 : 1;
    });
  }

  function presentBowl(dt: number) {
    for (const pin of pins)
      if (pin.userData.falling) {
        pin.rotation.z +=
          (Number(pin.userData.fallSign) * 1.4 - pin.rotation.z) * (1 - Math.exp(-9 * dt));
        pin.position.y += (0.24 - pin.position.y) * (1 - Math.exp(-9 * dt));
      }
    const bowl = city.bowl;
    if (!bowl) {
      bowlBall.visible = false;
      return;
    }
    const laneX = 92;
    const startZ = -18.15;
    const roll = bowl.roll;
    bowlBall.visible = true;
    if (bowl.phase === "finished") {
      bowlBall.visible = false;
      return;
    }
    // Pins drop the moment the sim knocks them, mid-roll, not after a timer.
    if (bowl.phase === "roll") syncPinsFromRoll();
    if (bowl.phase === "aim" || bowl.phase === "approach") {
      // Four-step approach: Benji walks from the dots to the foul line while
      // the ball swings back and comes through at the release point.
      const p = bowl.phase === "approach" ? Math.min(1, roll.approach) : 0;
      player.position.z = startZ + 1.7 * (1 - p);
      player.position.x = laneX + roll.aim * 0.46;
      const swing =
        bowl.phase === "approach" ? Math.sin(Math.min(1, roll.approach / 0.78) * Math.PI) : 0;
      // Swing goes back (+z, toward the bowler's rear) then forward past the knee.
      bowlBall.position.set(
        player.position.x + 0.32,
        player.position.y + 0.74 - swing * 0.46,
        player.position.z + swing * 0.55 - (p > 0.78 ? (p - 0.78) * 2.2 : 0),
      );
      bowlBall.rotation.set(0, 0, 0);
      return;
    }
    const b = roll.ball;
    if (!b) return;
    const loftY = roll.loft > 0 ? Math.max(0, roll.loft * 0.3 * (1 - b.s / 1.2)) : 0;
    bowlBall.position.set(laneX + b.u, 0.11 + loftY, startZ - b.s);
    bowlBall.rotation.x -= dt * (b.vs * 9);
    bowlBall.rotation.y = b.vu * 0.3;
  }

  function updateFishing(dt: number, hold: boolean, interact: boolean) {
    const b = screenBasis();
    const fx =
      facing === "right"
        ? b.rightX
        : facing === "left"
          ? -b.rightX
          : facing === "back"
            ? b.fwdX
            : -b.fwdX;
    const fz =
      facing === "right"
        ? b.rightZ
        : facing === "left"
          ? -b.rightZ
          : facing === "back"
            ? b.fwdZ
            : -b.fwdZ;
    const events = tickFishing(fishing, {
      dt,
      hold: fishing.phase === "casting" ? castArmed : hold,
      interact,
      player: { x: player.position.x, y: player.position.y, z: player.position.z },
      faceX: fx,
      faceZ: fz,
      night,
      riverFit: city.fit === "river",
    });
    for (const e of events) {
      if (e === "reel") audio.play("reel", fishing.tension);
      else if (e === "strain") audio.play("strain", fishing.tension);
      else if (e === "lost") audio.play("denied");
      else if (e === "landed") {
        audio.play("landed");
        city.fished = true;
        dollars += 5; // catch bonus; the cooler sale at 901 Catch Kitchen is the real money
        if (fishing.lastCatch?.trophy) respect += 4;
        const m = cityMission(city, delivered, hauntCleared);
        if (m) mission = m;
      } else audio.play(e);
    }
  }

  function presentFishing() {
    fishingLine.visible = bobber.visible;
    if (!bobber.visible) return;
    // Anchor the handle to the billboard's hand side, independently of orbit.
    const yaw = avatar.rotation.y;
    // Use the forward hand in side views so the shaft clears the torso and
    // the rear hand stays empty. The reel belongs beneath this same grip.
    const handSide = facing === "right" ? 0.13 : facing === "left" ? -0.13 : 0.26;
    rod.position.set(Math.cos(yaw) * handSide, 0.64, -Math.sin(yaw) * handSide);
    const handX = player.position.x + rod.position.x,
      handZ = player.position.z + rod.position.z;
    const dx = bobber.position.x - handX,
      dz = bobber.position.z - handZ;
    rodDirection.set(dx, Math.hypot(dx, dz) * 0.55, dz).normalize();
    rod.quaternion.setFromUnitVectors(rodUp, rodDirection);
    rodTip.set(0, 1.35, 0).applyQuaternion(rod.quaternion).add(rod.position).add(player.position);
    const points = fishingLineGeometry.getAttribute("position") as THREE.BufferAttribute;
    points.setXYZ(0, rodTip.x, rodTip.y, rodTip.z);
    points.setXYZ(
      1,
      (rodTip.x + bobber.position.x) / 2,
      (rodTip.y + bobber.position.y) / 2 - 0.12,
      (rodTip.z + bobber.position.z) / 2,
    );
    // The river surface is y=0.02; the line enters the water beneath the float.
    points.setXYZ(2, bobber.position.x, 0.02, bobber.position.z);
    points.needsUpdate = true;
  }

  function updatePlace() {
    world.home.visible = place === "home";
    world.hq.visible = place === "hq";
    world.exterior.visible = place === "street" || place === "court";
    world.haunt.group.visible = place === "haunt";
    for (const light of world.homeLights) light.visible = place === "home";
    for (const light of world.hqLights) light.visible = place === "hq";
    if (place === "home" || place === "hq" || place === "haunt") return;
    const onCourt =
      player.position.x > 55.2 &&
      player.position.x < 76.8 &&
      player.position.z < -15.1 &&
      player.position.z > -28.9;
    place = onCourt ? "court" : "street";
  }

  function updateBall(dt: number, hold: boolean, interact: boolean) {
    if (courtMatch && place !== "court") {
      endCourtMatch();
    }
    if (courtMatch) {
      const wasLive = courtMatch.phase !== "finished";
      tickCourtMatch(courtMatch, dt, world.hoops, player.position, hold, world.backboards);
      if (courtMatch.contact) audio.play(courtMatch.contact);
      if (wasLive && courtMatch.phase === "finished") {
        const won = courtMatch.score[0] > courtMatch.score[1];
        audio.play(won ? "complete" : "buzzer");
        if (won && !city.wonMatch) {
          city.wonMatch = true;
          dollars += 120;
          respect += 8;
          say("Court OG — That's a W on my court. $120 and the block knows your name.", 5);
          const m = cityMission(city, delivered, hauntCleared);
          if (m) mission = m;
        } else if (won) {
          dollars += 40;
          respect += 2;
        }
      }
      player.position.x = courtMatch.players[0]!.x;
      player.position.z = courtMatch.players[0]!.z;
      ball.position.set(courtMatch.ball.x, courtMatch.ball.y, courtMatch.ball.z);
      ball.rotation.z += dt * 4;
      ballHeld = courtMatch.owner === 0;
      charge = courtMatch.charge;
      if (courtMatch.net >= 0) {
        const rim = world.hoops[courtMatch.net]!;
        exciteNet(world.exterior, rim.x, rim.z);
        audio.play(courtMatch.touchedRim ? "net" : "swish");
      }
      return;
    }
    shotCameraLeft = Math.max(0, shotCameraLeft - dt);
    if (place !== "court") {
      charge = 0;
      shotCameraLeft = 0;
      return;
    }
    if (pinBall) {
      ball.position.copy(pinBall);
      ballVel.set(0, 0, 0);
      return;
    }
    if (ballHeld) {
      const basis = screenBasis();
      const moving = Math.hypot(glideX, glideZ) > 0.28;
      const dribbleY =
        moving && !hold ? 0.16 + 0.62 * (1 - Math.abs(Math.sin(travel * 5.5))) : hold ? 1.05 : 0.74;
      ball.position.set(
        player.position.x + basis.rightX * 0.34,
        player.position.y + dribbleY,
        player.position.z + basis.rightZ * 0.34,
      );
      if (moving && !hold) ball.rotation.z += dt * 2.5;
      ballVel.set(0, 0, 0);
      if (hold) charge = Math.min(1, charge + dt / 0.85);
      if ((!hold || charge >= 1) && charge > 0.02) {
        const release = shotVelocity(ball.position, world.hoop, charge);
        ballVel.set(release.x, release.y, release.z);
        shotFeedback = release.quality;
        scoredFlight = false;
        flightTouchedRim = false;
        audio.play("release");
        ballHeld = false;
        shotCameraLeft = 3;
        taken += 1;
        charge = 0;
      } else if (!hold) charge = 0;
      return;
    }
    previousBall.copy(ball.position);
    ball.position.addScaledVector(ballVel, dt);
    ball.position.y -= (BALL_GRAVITY * dt * dt) / 2;
    ballVel.y -= BALL_GRAVITY * dt;
    ball.rotation.x += ballVel.z * dt;
    ball.rotation.z -= ballVel.x * dt;
    for (const board of world.backboards) {
      if (backboardContact(previousBall, ball.position, ballVel, board)) audio.play("backboard");
    }
    for (const hoop of world.hoops) {
      if (rimContact(ball.position, ballVel, hoop)) {
        flightTouchedRim = true;
        audio.play("rim");
      }
    }
    for (const hoop of world.hoops) {
      if (!scoredFlight && rimCrossing(previousBall, ball.position, hoop)) {
        audio.play(flightTouchedRim ? "net" : "swish");
        made += 1;
        respect += 5;
        dollars += 25;
        mission = "Bucket. The 901 felt that.";
        scoredFlight = true;
        exciteNet(world.exterior, hoop.x, hoop.z);
        ballVel.x *= 0.25;
        ballVel.z *= 0.25;
        charge = 0;
        break;
      }
    }
    if (ball.position.y < 0.16) {
      shotCameraLeft = 0;
      ball.position.y = 0.16;
      if (Math.abs(ballVel.y) < 1.4) ballVel.set(0, 0, 0);
      else {
        ballVel.y *= -0.45;
        audio.play("bounce", Math.min(1, Math.abs(ballVel.y) / 6));
      }
      ballVel.x *= 0.7;
      ballVel.z *= 0.7;
    }
    // Recover an out-of-bounds practice ball without trapping it behind fences.
    if (
      ball.position.x < 55.5 ||
      ball.position.x > 76.5 ||
      ball.position.z < -28.5 ||
      ball.position.z > -15.5
    ) {
      ball.position.x = THREE.MathUtils.clamp(ball.position.x, 56, 76);
      ball.position.z = THREE.MathUtils.clamp(ball.position.z, -28, -16);
      ballVel.x *= -0.4;
      ballVel.z *= -0.4;
    }
    if (interact && ball.position.distanceTo(player.position) < 1.6) ballHeld = true;
  }

  function updateTraffic(dt: number) {
    const junction = { x: 8, z: 0 };
    for (const car of cars) {
      const lane = lanes[car.lane]!;
      let blocked = false;
      if (lane.id === "cross") {
        const here = sampleLane(lane, car.s);
        if (Math.hypot(here.x - junction.x, here.z - junction.z) < 7) {
          blocked = cars.some(
            (other) =>
              other.lane === 0 &&
              Math.hypot(other.mesh.position.x - junction.x, other.mesh.position.z - junction.z) <
                6,
          );
        }
      }
      const ahead = cars.find(
        (other) => other !== car && other.lane === car.lane && gapAhead(lane, car.s, other.s) < 11,
      );
      car.speed = blocked || ahead ? 0 : lane.id === "cross" ? 5.2 : 7.4;
      if (!blocked && !ahead) car.s += car.speed * dt;
      const sample = sampleLane(lane, car.s);
      const prev = car.mesh.position.clone();
      car.mesh.position.set(sample.x, 0.06, sample.z);
      car.mesh.rotation.y = sample.yaw;
      if (car.speed > 0) {
        const moved = Math.atan2(car.mesh.position.x - prev.x, car.mesh.position.z - prev.z);
        if (Math.hypot(car.mesh.position.x - prev.x, car.mesh.position.z - prev.z) > 0.001)
          car.mesh.rotation.y = moved;
      }
    }
  }

  function updatePeds(dt: number) {
    for (const ped of world.pedestrians) {
      const route = ped.userData.route as
        | {
            pts: { x: number; z: number }[];
            i: number;
            dir: number;
            speed: number;
            phase: number;
            wait?: number;
            gait?: number;
          }
        | undefined;
      if (route && !ped.userData.idle) {
        const target = route.pts[route.i];
        if ((route.wait ?? 0) > 0) {
          route.wait = (route.wait ?? 0) - dt;
          route.gait = (route.gait ?? 0) * Math.exp(-7 * dt);
        } else if (target) {
          const directionX = target.x - ped.position.x,
            directionZ = target.z - ped.position.z;
          const length = Math.hypot(directionX, directionZ) || 1;
          const futureX = ped.position.x + (directionX / length) * 1.5,
            futureZ = ped.position.z + (directionZ / length) * 1.5;
          if (
            cars.some(
              (car) =>
                car.speed > 0 &&
                Math.hypot(car.mesh.position.x - futureX, car.mesh.position.z - futureZ) < 3.5,
            )
          ) {
            route.wait = 0.16;
            route.gait = 0;
            continue;
          }
          const dx = target.x - ped.position.x;
          const dz = target.z - ped.position.z;
          const dist = Math.hypot(dx, dz);
          const brake = 1.4;
          const want = dist < brake ? route.speed * Math.max(0.18, dist / brake) : route.speed;
          const gait = route.gait ?? 0;
          const next = gait + (want - gait) * (1 - Math.exp(-3.2 * dt));
          route.gait = next;
          if (dist <= 0.2 && next < route.speed * 0.45) {
            ped.position.x = target.x;
            ped.position.z = target.z;
            route.gait = 0;
            route.i += route.dir;
            if (route.i < 0 || route.i >= route.pts.length) {
              route.dir *= -1;
              route.i += route.dir * 2;
              route.i = Math.max(0, Math.min(route.pts.length - 1, route.i));
            }
            route.wait = 1.15 + ((ped.id % 5) + 1) * 0.22;
          } else if (dist > 0.02 && next > 0.02) {
            const step = Math.min(dist, next * dt);
            ped.position.x += (dx / dist) * step;
            ped.position.z += (dz / dist) * step;
            aimHeading(ped, Math.atan2(dx, dz), dt, 4.2);
            route.phase += step / 0.74;
          }
        }
      }
      ped.userData.life = ((ped.userData.life as number) ?? ped.id) + dt;
      ped.userData.gait = route && !ped.userData.idle ? (route.gait ?? 0) : 0;
      if (route) ped.userData.phase = route.phase;
      faceCompany(ped, dt);
    }
    for (const board of world.billboards) {
      if (!world.pedestrians.includes(board as THREE.Group)) faceCompany(board, dt);
    }
  }

  function aimHeading(ped: THREE.Object3D, aim: number, dt: number, sharp: number) {
    const cur = (ped.userData.heading as number) ?? aim;
    ped.userData.heading = dampAngle(cur, aim, 1 - Math.exp(-sharp * dt));
  }

  function faceCompany(ped: THREE.Object3D, dt: number) {
    const route = ped.userData.route as { wait?: number } | undefined;
    const movingAlong =
      Boolean(route) &&
      !ped.userData.idle &&
      (route?.wait ?? 0) <= 0 &&
      ((ped.userData.gait as number) ?? 0) > 0.2;
    if (movingAlong) return;
    const life = (ped.userData.life as number) ?? 0;
    const partner = ped.userData.partner as THREE.Object3D | undefined;
    if (partner) {
      const aim =
        Math.atan2(partner.position.x - ped.position.x, partner.position.z - ped.position.z) +
        Math.sin(life * 1.5) * 0.1;
      aimHeading(ped, aim, dt, 3);
      return;
    }
    const look = ped.userData.look as { x: number; z: number } | undefined;
    if (look) {
      aimHeading(ped, Math.atan2(look.x - ped.position.x, look.z - ped.position.z), dt, 2.4);
      return;
    }
    if (!route) return;
    let best: THREE.Object3D | null = null;
    let bestD = 3.6;
    for (const other of world.billboards) {
      if (other === ped) continue;
      const d = Math.hypot(other.position.x - ped.position.x, other.position.z - ped.position.z);
      if (d < bestD) {
        bestD = d;
        best = other;
      }
    }
    if (best)
      aimHeading(
        ped,
        Math.atan2(best.position.x - ped.position.x, best.position.z - ped.position.z),
        dt,
        3,
      );
  }

  function applyBenji(face: Facing) {
    if (
      courtUniforms.apply(
        avatar,
        "benji",
        Boolean(courtMatch) && teamJerseys,
        face,
        COURT_KITS[courtKitIndex % 3]!,
      )
    )
      return;
    const mat = avatar.material as THREE.MeshBasicMaterial;
    const speed = Math.hypot(glideX, glideZ);
    const stepping = speed > 0.28 && (travel / 1.9) % 1 >= 0.5;
    const stride = stepping ? strideTex[face] : undefined;
    const pose = stride ? `${face}-walk` : face;
    if (avatar.userData.pose === pose && mat.map) return;
    const tex = stride ?? textures[face];
    if (!tex) return;
    if (avatar.userData.box !== pose) {
      const size = frameSize(characters.benji, stride ? "walk" : face);
      avatar.geometry.dispose();
      avatar.geometry = solePlane(size.w, size.h, size.footPad, size.pxH, size.centerPx, size.pxW);
      avatar.userData.box = pose;
    }
    mat.map = tex;
    mat.needsUpdate = true;
    avatar.position.set(0, 0, 0);
    avatar.userData.pose = pose;
    avatar.userData.face = face;
  }

  function rock(mesh: THREE.Object3D, _host: THREE.Object3D) {
    mesh.rotation.z = 0;
  }

  function presentScale(_host: THREE.Object3D) {
    return 1;
  }

  const cameraCardPosition = new THREE.Vector3();

  function applyCard(sprite: THREE.Object3D, host: THREE.Object3D) {
    const mesh = sprite as THREE.Mesh;
    const mat = mesh.material as THREE.MeshBasicMaterial;
    const asset = host.userData.asset as
      (Parameters<typeof frameSize>[0] & { id?: string }) | undefined;
    const tex = host.userData.tex as Partial<Record<Facing | "walk", THREE.Texture>> | undefined;
    const heading = (host.userData.heading as number) ?? Math.PI;
    const toCam = yawTo(host, camera.position);
    let rel = toCam - heading;
    while (rel > Math.PI) rel -= Math.PI * 2;
    while (rel < -Math.PI) rel += Math.PI * 2;
    const abs = Math.abs(rel);
    let face: Facing = "front";
    if (asset?.views.back && tex?.back) {
      face = abs < 0.75 ? "front" : abs > 2.35 ? "back" : rel > 0 ? "left" : "right";
      if (!tex[face]) face = "front";
    }
    const gait = (host.userData.gait as number) ?? 0;
    const phase = (host.userData.phase as number) ?? 0;
    const walkMap = face === "front" ? tex?.walk : undefined;
    const stepping = Boolean(walkMap) && gait > 0.22 && ((phase % 1) + 1) % 1 >= 0.5;
    const pose = stepping ? `${face}-walk` : face;
    const uniform = courtUniforms.apply(
      mesh,
      asset?.id ?? "",
      host.name === "basketball-match-athlete" && teamJerseys,
      face,
      COURT_KITS[courtKitIndex % 3]!,
    );
    if (!uniform && asset && mesh.userData.pose !== pose) {
      const map = stepping ? walkMap : tex?.[face];
      if (map) {
        if (mesh.userData.box !== pose) {
          const size = frameSize(asset, stepping ? "walk" : face);
          mesh.geometry.dispose();
          mesh.geometry = solePlane(
            size.w,
            size.h,
            size.footPad,
            size.pxH,
            size.centerPx,
            size.pxW,
          );
          mesh.userData.box = pose;
        }
        mesh.userData.pose = pose;
        mesh.userData.face = face;
        mat.map = map;
        mat.needsUpdate = true;
      }
    }
    seatOnGround(mesh);
    // Within 2m of the camera a bright head can remain clearly visible even
    // at 12% opacity. Hide it completely; only use a ghost farther away when
    // an NPC stands directly between the lens and Benji.
    host.getWorldPosition(cameraCardPosition);
    const vx = cameraCardPosition.x - camera.position.x;
    const vz = cameraCardPosition.z - camera.position.z;
    const cameraDistance = Math.hypot(vx, vz);
    const px = player.position.x - camera.position.x;
    const pz = player.position.z - camera.position.z;
    const playerDistanceSq = px * px + pz * pz;
    const fraction = playerDistanceSq > 0.01 ? (vx * px + vz * pz) / playerDistanceSq : -1;
    const sideDistance =
      playerDistanceSq > 0.01
        ? Math.abs(vx * pz - vz * px) / Math.sqrt(playerDistanceSq)
        : Infinity;
    const opacity =
      host.name === "basketball-match-athlete"
        ? 1
        : cameraDistance < 2
          ? 0
          : fraction > 0.05 && fraction < 0.96 && sideDistance < 0.72
            ? 0.2
            : 1;
    mesh.visible = opacity !== 0;
    if (mat.opacity !== opacity || mat.depthWrite !== (opacity === 1)) {
      mat.opacity = opacity;
      mat.depthWrite = opacity === 1;
      mat.needsUpdate = true;
    }
    const s = presentScale(host);
    mesh.scale.set(s, s, 1);
    const turnaround = Boolean(tex?.back && tex?.left && tex?.right);
    let cardYaw = toCam;
    if (!turnaround) {
      let rel = heading - toCam;
      while (rel > Math.PI) rel -= Math.PI * 2;
      while (rel < -Math.PI) rel += Math.PI * 2;
      const limit = 1.25;
      if (rel > limit) rel = limit;
      else if (rel < -limit) rel = -limit;
      cardYaw = toCam + rel;
    }
    mesh.rotation.order = "YZX";
    mesh.rotation.x = 0;
    mesh.rotation.y = cardYaw - host.rotation.y;
    rock(mesh, host);
  }

  function faceAvatar(dt: number) {
    const score = courtMatch ? courtMatch.score[0] + courtMatch.score[1] : 0;
    if (score > lastCheerScore) cheerLeft = 2;
    lastCheerScore = score;
    cheerLeft = Math.max(0, cheerLeft - dt);
    const debug = Boolean(
      (window as Window & { __SACK_CHARACTER_DEBUG__?: boolean }).__SACK_CHARACTER_DEBUG__,
    );
    plantFeet(player);
    if (place === "haunt")
      player.position.y = hauntFloorAt(player.position.x, player.position.z - 500) + 0.03;
    const playerMark = player.getObjectByName("foot-debug");
    if (playerMark) playerMark.visible = debug;
    applyBenji(facing);
    avatar.rotation.order = "YZX";
    avatar.rotation.x = 0;
    avatar.rotation.y = yawTo(avatar, camera.position);
    avatar.rotation.z = 0;
    seatOnGround(avatar);
    avatar.position.y += courtMatch?.players[0]?.jump ?? 0;
    const rim = courtMatch ? matchRim(courtMatch, world.hoops) : world.hoop;
    const attackX = rim.x - player.position.x,
      attackZ = rim.z - player.position.z;
    const viewX = camera.position.x - player.position.x,
      viewZ = camera.position.z - player.position.z;
    const rear =
      attackX * viewX + attackZ * viewZ <
      -0.55 * Math.hypot(attackX, attackZ) * Math.hypot(viewX, viewZ);
    courtAnimation.setKit(teamJerseys ? COURT_KITS[courtKitIndex % 3]! : null);
    const animated = courtAnimation.update(
      courtMatch,
      rim.x >= player.position.x ? 1 : -1,
      yawTo(avatar, camera.position),
      rear,
      dt,
    );
    avatar.visible = !animated;
    // Keep the reach pose at the rim through release; only the ball detaches.
    if (animated && courtMatch?.dunk === 0 && courtAnimation.state().frame === 2) {
      const progress = 1 - courtMatch.actionLeft / 0.85;
      // The palm stays above the rim while the forearm crosses its opening.
      // The ball sits beneath the finishing hand and drops through on release.
      const insertion = THREE.MathUtils.smoothstep(progress, 0.58, 0.71);
      const target = new THREE.Vector3(rim.x, rim.y + 0.13 - insertion * 0.1, rim.z);
      courtAnimation.alignGrip(target, actionHand);
    }
    if (
      animated &&
      courtMatch?.owner === 0 &&
      (courtMatch.charge > 0 ||
        ((courtMatch.dunk >= 0 || courtMatch.layup >= 0) && !courtMatch.scored))
    ) {
      if (courtMatch.dunk === 0 || courtMatch.layup === 0) {
        courtAnimation.gripWorld(actionHand);
      } else courtAnimation.handWorld(actionHand);
      ball.position.copy(actionHand);
      // The physical release begins at the rendered hand, preventing a jump
      // back to a different generic release origin.
      courtMatch.ball = { x: actionHand.x, y: actionHand.y, z: actionHand.z };
    } else if (
      animated &&
      courtMatch?.owner === 0 &&
      (courtAnimation.state().action === "dribble" ||
        (courtAnimation.state().action === "cross-back" &&
          courtMatch.players[0]!.action !== "crossover"))
    ) {
      courtAnimation.handWorld(actionHand);
      const bounce = Math.abs(Math.cos(courtMatch.time * 7));
      ball.position.x = actionHand.x;
      ball.position.z = actionHand.z;
      ball.position.y = 0.17 + Math.max(0, actionHand.y - 0.13 - 0.17) * bounce;
      courtMatch.ball = { x: ball.position.x, y: ball.position.y, z: ball.position.z };
    } else if (
      animated &&
      courtMatch?.owner === 0 &&
      courtMatch.players[0]!.action === "crossover"
    ) {
      courtAnimation.handWorld(actionHand);
      const progress = THREE.MathUtils.clamp(1 - courtMatch.actionLeft / 0.4, 0, 1),
        catchBlend = THREE.MathUtils.smoothstep(progress, 0.72, 1);
      ball.position.x = THREE.MathUtils.lerp(ball.position.x, actionHand.x, catchBlend);
      ball.position.z = THREE.MathUtils.lerp(ball.position.z, actionHand.z, catchBlend);
      const height = progress < 0.5 ? courtMatch.crossStartY : actionHand.y - 0.13;
      ball.position.y = 0.17 + Math.max(0, height - 0.17) * Math.cos(progress * Math.PI) ** 2;
      courtMatch.ball = { x: ball.position.x, y: ball.position.y, z: ball.position.z };
    }

    avatar.scale.set(presentScale(player), presentScale(player), 1);
    for (const board of world.billboards) {
      plantFeet(board);
      const mark = board.getObjectByName("foot-debug");
      if (mark) mark.visible = debug;
      const sprite = board.getObjectByName("sprite");
      if (!sprite) continue;
      sprite.rotation.x = 0;
      applyCard(sprite, board);
      if (board.name === "901-court-fan")
        sprite.position.y +=
          cheerLeft > 0
            ? Math.max(0, Math.sin(cheerLeft * 10 + courtFans.indexOf(board))) * 0.075
            : Math.sin(performance.now() * 0.0013 + courtFans.indexOf(board)) * 0.006;
    }
    const kHost = kSprite.parent ?? kSprite;
    plantFeet(kHost);
    const kMark = kHost.getObjectByName("foot-debug");
    if (kMark) kMark.visible = debug;
    kSprite.rotation.x = 0;
    applyCard(kSprite, kHost);
    presentVehicles(camera.position);
    for (let i = 0; i < courtActors.length; i++) {
      const host = courtActors[i]!,
        athlete = courtMatch?.players[i + 1];
      host.visible = Boolean(athlete);
      if (!athlete) continue;
      host.position.set(athlete.x, 0.08, athlete.z);
      host.userData.heading = athlete.heading;
      const sprite = host.getObjectByName("sprite");
      if (sprite) {
        applyCard(sprite, host);
        sprite.position.y =
          athlete.jump +
          (athlete.action === "run" ? Math.sin(courtMatch!.time * 13 + i) * 0.018 : 0);
      }
    }
  }

  function placeCamera(dt: number) {
    shotCameraActive = place === "court" && !courtMatch && (charge > 0 || shotCameraLeft > 0);
    if (place === "court") {
      const rim = courtMatch ? matchRim(courtMatch, world.hoops) : world.hoop;
      const points = courtCameraPoints;
      points.length = 4;
      points[0] = courtCameraPool[0]!.copy(player.position);
      const headHeight = courtMatch && (courtMatch.dunk === 0 || courtMatch.layup === 0) ? 3 : 2.25;
      points[1] = courtCameraPool[1]!.set(
        player.position.x,
        player.position.y + headHeight,
        player.position.z,
      );
      points[2] = courtCameraPool[2]!.copy(ball.position);
      points[3] = courtCameraPool[3]!.set(rim.x, rim.y + 0.4, rim.z);
      const action =
        courtMatch &&
        (courtMatch.charge > 0 ||
          courtMatch.dunk === 0 ||
          courtMatch.layup === 0 ||
          (courtMatch.shooter === 0 && courtMatch.actionLeft > 0));
      if (courtMatch && !action)
        for (const athlete of courtMatch.players) {
          if (
            camera.aspect < 0.8 &&
            basketballCameraMode !== "sideline" &&
            Math.hypot(athlete.x - player.position.x, athlete.z - player.position.z) > 3.5
          )
            continue;
          const i = points.length;
          points.push(
            courtCameraPool[i]!.set(athlete.x, 0.08, athlete.z),
            courtCameraPool[i + 1]!.set(athlete.x, athlete.jump + 1.85, athlete.z),
          );
        }
      basketballCamera.update(dt, basketballCameraMode, player.position, rim, points);
      courtCameraCutaway.update(camera.position, points, dt);
      const dx = rim.x - player.position.x,
        dz = rim.z - player.position.z;
      if (courtMatch) camYaw = basketballCamera.yaw;
      const viewX = player.position.x - camera.position.x,
        viewZ = player.position.z - camera.position.z;
      const side = dx * -viewZ + dz * viewX,
        depth = dx * viewX + dz * viewZ;
      if (
        shotCameraActive ||
        (courtMatch && (courtMatch.charge > 0 || courtMatch.dunk >= 0 || courtMatch.layup >= 0))
      ) {
        facing =
          Math.abs(side) > Math.abs(depth)
            ? side > 0
              ? "right"
              : "left"
            : depth > 0
              ? "back"
              : "front";
      }
      avatar.visible = !courtMatch || !courtAnimation.mesh.visible;
      return;
    }
    basketballCamera.reset();
    courtCameraCutaway.restore();
    if (fishingLocks(fishing)) {
      // Frame the fisherman and float from the side instead of hiding the
      // rod behind the back cutout. Resume the user's orbit after fishing.
      const dx = bobber.position.x - player.position.x;
      const dz = bobber.position.z - player.position.z;
      const range = Math.max(1, Math.hypot(dx, dz));
      const alongX = dx / range,
        alongZ = dz / range;
      const framing = cameraFraming(camera.aspect, 54, false);
      const scale = framing.distanceScale;
      const follow = 1 - Math.exp(-4 * dt);
      const destination = new THREE.Vector3(
        player.position.x + (-alongZ * 6 - alongX * 5) * scale,
        player.position.y + 4.2 * scale,
        player.position.z + (alongX * 6 - alongZ * 5) * scale,
      );
      camera.position.lerp(destination, follow);
      camera.fov += (framing.fov - camera.fov) * follow;
      camera.updateProjectionMatrix();
      camera.lookAt(
        player.position.x + dx * 0.38,
        player.position.y + 0.45,
        player.position.z + dz * 0.38,
      );
      // Choose the supplied directional view using the actual activity camera.
      const toX = player.position.x - camera.position.x;
      const toZ = player.position.z - camera.position.z;
      const side = dx * -toZ + dz * toX;
      const depth = dx * toX + dz * toZ;
      facing =
        Math.abs(side) > Math.abs(depth)
          ? side > 0
            ? "right"
            : "left"
          : depth > 0
            ? "back"
            : "front";
      return;
    }
    if (foodReceiver.active) {
      const follow = 1 - Math.exp(-5 * dt),
        scale = cameraFraming(camera.aspect, 54, false).distanceScale;
      camera.position.lerp(
        new THREE.Vector3(player.position.x + 4.8 * scale, 3, player.position.z - 4.8 * scale),
        follow,
      );
      camera.fov += (54 - camera.fov) * follow;
      camera.updateProjectionMatrix();
      camera.lookAt(foodReceiver.x, 1.65, 23.8);
      facing = "left";
      return;
    }
    if (foodCourt.left > 0 && foodCourt.serving) {
      const spec = FOOD_VENDORS[foodCourt.serving],
        follow = 1 - Math.exp(-5 * dt);
      const framing = cameraFraming(camera.aspect, 54, false);
      camera.position.lerp(
        new THREE.Vector3(spec.x - 1.2, 2.65, 24.6 - 6.1 * framing.distanceScale),
        follow,
      );
      camera.fov += (framing.fov - camera.fov) * follow;
      camera.updateProjectionMatrix();
      camera.lookAt(spec.x - 0.4, 2.1, 24.3);
      facing = "back";
      return;
    }
    if (veli.serving > 0) {
      const follow = 1 - Math.exp(-5 * dt);
      const framing = cameraFraming(camera.aspect, 54, false);
      camera.position.lerp(
        new THREE.Vector3(60.8, 2.65, 24.6 - 6.1 * framing.distanceScale),
        follow,
      );
      camera.fov += (framing.fov - camera.fov) * follow;
      camera.updateProjectionMatrix();
      camera.lookAt(61.6, 1.85, 24.3);
      facing = "back";
      return;
    }
    if (city.bowl) {
      const bowl = city.bowl;
      avatar.visible = true;
      player.position.set(92, 0, -17.6);
      const roll =
        bowl.phase === "aim" ? 0 : bowl.phase === "roll" ? 1 - Math.max(0, bowl.left) / 1.65 : 1;
      const follow = 1 - Math.exp(-5 * dt);
      const distanceScale = cameraFraming(camera.aspect, 54, false).distanceScale;
      const destination = new THREE.Vector3(92.8, 2.7, -17.6 + 4.2 * distanceScale - roll * 7);
      camera.position.lerp(destination, follow);
      camera.fov += (54 - camera.fov) * follow;
      camera.updateProjectionMatrix();
      camera.lookAt(92 + bowl.aim * 0.5, 0.9 - roll * 0.35, -19.1 - roll * 6);
      return;
    }
    avatar.visible = true;
    // Wide-angle indoor framing avoids cropping nearby NPCs and shows the
    // room's actual merchandise, mezzanine and architectural depth.
    const inside = place === "home" || place === "hq" || place === "haunt";
    const framing = cameraFraming(
      camera.aspect,
      place === "hq" || place === "haunt" ? 54 : place === "home" ? 49 : 42,
      inside,
    );
    const desiredFov = framing.fov;
    const previousFov = camera.fov;
    camera.fov += (desiredFov - camera.fov) * (1 - Math.exp(-5 * dt));
    if (camera.fov !== previousFov) camera.updateProjectionMatrix();
    let lookX = Math.sin(camYaw);
    let lookZ = Math.cos(camYaw);
    const talking = place === "hq" && dialogue.startsWith("K Blanco");
    const dist =
      camDist ??
      (talking ? 2.9 : place === "haunt" ? 3.2 : inside ? 3.05 : 3.4) * framing.distanceScale;
    const height = camHeight ?? (talking ? 1.42 : place === "haunt" ? 1.72 : inside ? 1.5 : 1.32);
    const side = talking ? 1.35 : 0;
    let destX = player.position.x - lookX * dist + lookZ * side;
    let destZ = player.position.z - lookZ * dist - lookX * side;
    const zone = collisionZone();
    let pulled = pullCamera(
      player.position.x,
      player.position.z,
      destX,
      destZ,
      zone.solids.filter((s) => s.cameraBlock !== false),
      zone.ox,
      zone.oz,
    );
    // Once the walker stops at a wall, rotate toward open room space rather
    // than leaving the lens pressed against the cap. Updating yaw also keeps
    // the next movement input aligned with the new camera.
    if (
      place === "haunt" &&
      camDist === null &&
      Math.hypot(glideX, glideZ) < 0.3 &&
      Math.hypot(pulled.x - player.position.x, pulled.z - player.position.z) < 1.15
    ) {
      const centerX = Math.floor(player.position.x / 8) * 8 + 4;
      const centerZ = Math.floor((player.position.z - 500) / 8) * 8 + 504;
      const open = pullCamera(
        player.position.x,
        player.position.z,
        centerX,
        centerZ,
        zone.solids.filter((s) => s.cameraBlock !== false),
        zone.ox,
        zone.oz,
      );
      if (Math.hypot(open.x - player.position.x, open.z - player.position.z) > 1.9) {
        pulled = open;
        camYaw = Math.atan2(player.position.x - open.x, player.position.z - open.z);
        lookX = Math.sin(camYaw);
        lookZ = Math.cos(camYaw);
      }
    }
    destX = pulled.x;
    destZ = pulled.z;
    const destY = player.position.y + height;
    const follow = 1 - Math.exp(-6.5 * dt);
    camera.position.x += (destX - camera.position.x) * follow;
    camera.position.y += (destY - camera.position.y) * follow;
    camera.position.z += (destZ - camera.position.z) * follow;
    // The interpolated position can cross a wall even when the destination is clear.
    const safe = pullCamera(
      player.position.x,
      player.position.z,
      camera.position.x,
      camera.position.z,
      zone.solids.filter((s) => s.cameraBlock !== false),
      zone.ox,
      zone.oz,
    );
    camera.position.x = safe.x;
    camera.position.z = safe.z;
    const ahead = talking ? 0.28 : 0.72;
    const lookY =
      player.position.y +
      (camLookY ?? (talking ? 1.12 : place === "haunt" ? 1.34 : inside ? 1.18 : 1.02));
    camera.lookAt(player.position.x + lookX * ahead, lookY, player.position.z + lookZ * ahead);
  }

  // Earlier real nighttime QA frames blew out white porch/lamp details.
  // Keep contrast and material texture visible; glow should be warm, not a
  // screen-wide white flare. Use fixed bounds across day/golden/night.
  let lightingState = "";
  function applyNight() {
    // Lighting uniforms change with the mode/place, not every animation frame.
    // Keep a local street-light budget across every Memphis district.
    const state = `${place}:${night}:${golden}:${Math.floor(player.position.x / 10)}:${Math.floor(player.position.z / 10)}`;
    if (state === lightingState) return;
    lightingState = state;
    const outside = place === "street" || place === "court";
    world.sun.intensity = night ? 0.22 : golden ? 2.35 : outside ? 2.85 : 0.85;
    world.sun.color.set(night ? 0x243044 : golden ? 0xff7a28 : 0xffe0b0);
    world.sun.position.set(golden ? -52 : -18, golden ? 6.2 : 26, golden ? 24 : 18);
    world.sun.userData.dir = world.sun.position.clone(); // the shadow box re-centres on the player every frame
    world.hemi.intensity = night ? 0.42 : golden ? 0.55 : outside ? 0.78 : 0.7;
    world.hemi.color.set(night ? 0x31465f : golden ? 0xffc48a : 0xd4ecff);
    world.hemi.groundColor.set(night ? 0x1a140e : golden ? 0x7a4a28 : 0x6a6840);
    renderer.toneMappingExposure = night ? 0.9 : golden ? 1.12 : outside ? 1.1 : 1.03;
    bloom.strength = night ? 0.22 : golden ? 0.17 : 0.11;
    world.scene.background = night
      ? world.skyNight
      : golden
        ? (paintedSky.golden ?? world.skyGolden)
        : (paintedSky.day ?? world.skyDay);
    setRiverSky(
      night ? null : golden ? (paintedSky.golden ?? null) : (paintedSky.day ?? null),
      golden ? 1.25 : 0.9,
    );
    quality.applyMode(
      place === "haunt"
        ? "haunt"
        : night
          ? "night"
          : golden
            ? "golden"
            : outside
              ? "day"
              : "interior",
      grade,
    );
    const fog = world.scene.fog as THREE.Fog;
    if (place === "haunt") {
      // Haze in the house: short, dark, warm.
      fog.color.setHex(0x16090c);
      fog.near = 5;
      fog.far = 24;
    } else {
      fog.color.setHex(night ? 0x141820 : golden ? 0xf0c090 : 0xc5d4e2);
      fog.near = night ? 22 : golden ? 30 : 50;
      fog.far = night ? 110 : golden ? 150 : 220;
    }
    const hqDay = world.exterior.getObjectByName("hq-plate-day");
    const hqNight = world.exterior.getObjectByName("hq-plate-night");
    if (hqDay) hqDay.visible = !night || !hqNight;
    if (hqNight) hqNight.visible = night;
    const nearby = new Set(
      [...world.lamps]
        .sort(
          (a, b) =>
            a.position.distanceToSquared(player.position) -
            b.position.distanceToSquared(player.position),
        )
        .slice(0, 8),
    );
    for (const lamp of world.lamps) {
      lamp.intensity = night ? 14 : golden ? 5 : 0;
      lamp.visible = outside && (night || golden) && nearby.has(lamp);
      const diffuser = lamp.userData.bulbMaterial as THREE.MeshStandardMaterial | undefined;
      const halo = lamp.userData.haloMaterial as THREE.MeshBasicMaterial | undefined;
      if (diffuser) diffuser.emissiveIntensity = night ? 1.25 : golden ? 0.55 : 0.12;
      if (halo) {
        // opacity is a material uniform; marking needsUpdate every frame
        // would recompile transparent shaders and stall mobile devices.
        halo.opacity = night ? 0.18 : golden ? 0.07 : 0;
      }
    }
    for (const lamp of world.courtLights) {
      lamp.intensity = night ? 20 : golden ? 5 : 0;
      lamp.visible = place === "court" && (night || golden);
    }
    for (const light of world.homeLights) {
      light.intensity = 12;
      light.visible = place === "home";
    }
    for (const light of world.hqLights) {
      light.intensity = 19;
      light.visible = place === "hq";
    }
    const hauntNearby = new Set(
      [...world.haunt.lights]
        .sort(
          (a, b) =>
            a.getWorldPosition(new THREE.Vector3()).distanceToSquared(player.position) -
            b.getWorldPosition(new THREE.Vector3()).distanceToSquared(player.position),
        )
        .slice(0, 4),
    );
    if (place === "street") updateProps(player.position.x, player.position.z);
    if (alleyRig) {
      const c = alleyRig.userData.centre as { x: number; z: number };
      const near =
        place === "street" && Math.hypot(player.position.x - c.x, player.position.z - c.z) < 24;
      for (const l of alleyRig.userData.lights as THREE.PointLight[]) l.visible = near;
    }
    for (const light of world.haunt.lights) {
      light.intensity =
        typeof light.userData.baseIntensity === "number" ? light.userData.baseIntensity : 18;
      light.visible = place === "haunt" && hauntNearby.has(light);
    }
    for (const mat of world.headlightMats) mat.emissiveIntensity = night ? 1.7 : golden ? 0.8 : 0.3;
    for (const mat of world.glowMats) mat.emissiveIntensity = night ? 1.1 : golden ? 0.55 : 0.2;
    // Color reflected from Beale's venue signs. The decal's opacity is a
    // uniform; day/night transitions do not allocate geometry or point lights.
    const beale = world.exterior.getObjectByName("beale-production-nightlife");
    const pavementGlow = beale?.userData.neonPools as THREE.MeshBasicMaterial[] | undefined;
    if (pavementGlow) {
      for (const spill of pavementGlow) spill.opacity = night ? 0.24 : golden ? 0.09 : 0;
    }
    const tint = night
      ? 0xb7c7d8
      : golden
        ? 0xffc898
        : place === "hq"
          ? 0xffd2a8
          : place === "home"
            ? 0xffe4c4
            : 0xfff3e4;
    for (const mat of world.figureMats) mat.color.set(tint);
    (avatar.material as THREE.MeshBasicMaterial).color.set(tint);
  }

  world.pedestrians.forEach((ped, i) => {
    ped.userData.base = ped.position.x;
    ped.userData.t = i * 1.7;
  });
  camera.position.set(player.position.x - 3.05, 1.42, player.position.z);
  camera.lookAt(player.position.x + 1.15, 1.22, player.position.z);

  const touchApi = {
    foodCourtState() {
      const vendors = foodTrucks.brothers.userData.vendors as THREE.Mesh[];
      return {
        ...foodCourt,
        vendors: vendors.length,
        frames: foodTrucks.brothers.userData.frames as number[],
        box: foodTrucks.brothers.getObjectByName("brothers-order-tray")?.visible,
        loaded: (foodTrucks.brothers.userData.textures as THREE.Texture[][])
          .flat()
          .every((t) => Boolean((t.image as HTMLImageElement)?.naturalWidth)),
      };
    },
    receiverState() {
      return foodReceiver.state();
    },
    tvState() {
      return veliTv.state();
    },
    veliState() {
      const frames = veliTruck.userData.textures as THREE.Texture[];
      return {
        ...veli,
        frame: veliTruck.userData.frame as number,
        loaded: frames.every((t) => Boolean((t.image as HTMLImageElement)?.naturalWidth)),
        vendor: veliTruck.getObjectByName("yungveli")?.visible,
        box: veliTruck.getObjectByName("veli-customer-box")?.visible,
      };
    },
    freezeCapture(paused: boolean) {
      // QA can hold an actual rendered action frame for a screenshot. Normal
      // game URLs cannot pause through this hook.
      if (new URLSearchParams(window.location.search).get("qa") === "1") captureFrozen = paused;
    },
    brandState() {
      let logos = 0,
        loaded = 0;
      world.scene.traverse((node) => {
        if (!(node instanceof THREE.Mesh) || node.name !== "flagship-brand-logo") return;
        logos++;
        const image = (node.material as THREE.MeshBasicMaterial).map?.image as
          HTMLImageElement | undefined;
        if (image?.naturalWidth === 732 && image.naturalHeight === 341) loaded++;
      });
      return { logos, loaded };
    },
    hauntState() {
      const fire = world.haunt.group.getObjectByName("library-hearth-flame");
      const hearth = world.haunt.group.getObjectByName("library-hearth-light") as
        THREE.PointLight | undefined;
      const house = world.exterior.getObjectByName("haunt-3d-house");
      const foyer = world.haunt.group.getObjectByName("haunt-3d-foyer");
      let houseMeshes = 0,
        foyerMeshes = 0;
      house?.traverse((node) => {
        if (node instanceof THREE.Mesh) houseMeshes++;
      });
      foyer?.traverse((node) => {
        if (node instanceof THREE.Mesh) foyerMeshes++;
      });
      return {
        houseMeshes,
        foyerMeshes,
        floorY: hauntFloorAt(player.position.x, player.position.z - 500),
        gallery: Boolean(world.haunt.group.getObjectByName("haunt-walkable-gallery")),
        ticket: hauntTicket,
        cleared: hauntCleared,
        activeLights: world.haunt.lights.filter((light) => light.visible).length,
        hearth: { flameHeight: fire?.scale.y ?? 0, intensity: hearth?.intensity ?? 0 },
      };
    },
    ballState() {
      const projected = [
        player.position.clone(),
        new THREE.Vector3(player.position.x, player.position.y + 1.85, player.position.z),
        ball.position.clone(),
        new THREE.Vector3(world.hoop.x, world.hoop.y, world.hoop.z),
      ].map((point) => point.project(camera));
      return {
        held: ballHeld,
        charge,
        taken,
        shotCameraActive,
        shotCameraLeft,
        made,
        shotFeedback,
        scoredFlight,
        shotScreen: projected.map((point) => ({ x: point.x, y: point.y, z: point.z })),
        position: { x: ball.position.x, y: ball.position.y, z: ball.position.z },
      };
    },
    basketballState() {
      return courtMatch
        ? {
            ...courtMatch,
            players: courtMatch.players.map((p) => ({ ...p })),
            animation: courtAnimation.state(),
            jerseys: teamJerseys
              ? (courtAnimation.state().visible && courtAnimation.state().kit
                  ? 1
                  : avatar.userData.uniformKit
                    ? 1
                    : 0) +
                courtActors.filter((a) => a.getObjectByName("sprite")?.userData.uniformKit).length
              : 0,
            kit: teamJerseys ? COURT_KITS[courtKitIndex % 3] : "street",
            uniformTextures: courtUniforms.loaded,
            uniformPlayers: [
              { id: "benji", kit: avatar.userData.uniformKit, face: avatar.userData.face },
              ...courtActors.map((a) => ({
                id: a.userData.asset?.id,
                kit: a.getObjectByName("sprite")?.userData.uniformKit,
                face: a.getObjectByName("sprite")?.userData.face,
              })),
            ],
            jerseyOverlays: player.getObjectByName("sack-court-jersey") ? 1 : 0,
            spectators: courtFans.length,
            cheerLeft,
            hand: courtAnimation.handWorld(new THREE.Vector3()).toArray(),
            rim: { ...matchRim(courtMatch, world.hoops) },
            actionScreen: [
              player.position.clone(),
              player.position
                .clone()
                .add(
                  new THREE.Vector3(
                    0,
                    courtMatch.dunk === 0 || courtMatch.layup === 0 ? 3 : 2.25,
                    0,
                  ),
                ),
              ball.position.clone(),
              new THREE.Vector3(
                matchRim(courtMatch, world.hoops).x,
                matchRim(courtMatch, world.hoops).y,
                matchRim(courtMatch, world.hoops).z,
              ),
            ].map((point) => {
              point.project(camera);
              return { x: point.x, y: point.y, z: point.z };
            }),
            duplicateCastVisible: [...hiddenCourtCast.keys()].filter((actor) => actor.visible)
              .length,
            nets: world.exterior.children
              .filter((node) => node.name === "basketball-reactive-net")
              .map((node) => node.userData.reaction ?? 0),
          }
        : null;
    },
    courtCameraState() {
      const direction = camera.getWorldDirection(new THREE.Vector3());
      return {
        mode: basketballCameraMode,
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
        direction: direction.toArray(),
        fov: camera.fov,
        cutaways: courtCameraCutaway.count,
      };
    },
    startBasketball(mode: CourtMode) {
      if (place === "court") startCourtMatch(mode);
    },
    raceState() {
      return city.race
        ? {
            ...city.race,
            length: RACE_LENGTH,
            visible: circuit.group.visible,
            vehicle: circuit.human.userData.kind,
            view: circuit.human.userData.card?.face,
            fog: {
              near: (world.scene.fog as THREE.Fog).near,
              far: (world.scene.fog as THREE.Fog).far,
            },
            gantryY: circuit.group.getObjectByName("flagship-brand-logo")?.position.y,
          }
        : null;
    },
    raceOverview(value: boolean) {
      raceOverview = value;
    },
    atmosphereState() {
      const effects = world.haunt.group.getObjectByName("haunt-atmosphere");
      return {
        ghosts:
          effects?.children
            .filter((n) => n.name === "haunt-wraith")
            .map((n) => ({ x: n.position.x, y: n.position.y })) ?? [],
        crowds: world.pedestrians.length,
        cars: cars.length,
      };
    },
    activityState() {
      const rodScreen = rodTip.clone().project(camera);
      const floatScreen = bobber.position.clone().project(camera);
      return {
        bowl: city.bowl ? { ...city.bowl } : null,
        fish:
          fishing.phase !== "idle"
            ? {
                phase: fishing.phase,
                tension: fishing.tension,
                cooler: fishing.cooler.length,
                lineOut: fishing.lineOut,
              }
            : null,
        avatarVisible: avatar.visible,
        bowlBall: { x: bowlBall.position.x, y: bowlBall.position.y, z: bowlBall.position.z },
        rodVisible: rod.visible,
        lineVisible: fishingLine.visible,
        lineEndX: (fishingLineGeometry.getAttribute("position") as THREE.BufferAttribute).getX(2),
        lineEndZ: (fishingLineGeometry.getAttribute("position") as THREE.BufferAttribute).getZ(2),
        lineEndY: (fishingLineGeometry.getAttribute("position") as THREE.BufferAttribute).getY(2),
        floatY: bobber.position.y,
        waterY: 0.02,
        fishingScreen: {
          tip: { x: rodScreen.x, y: rodScreen.y },
          float: { x: floatScreen.x, y: floatScreen.y },
        },
        bowlDoor: world.districts.bowlDoor,
        pier: world.districts.pier,
      };
    },
    renderState() {
      const head = new THREE.Vector3(
        player.position.x,
        player.position.y + 1.85,
        player.position.z,
      ).project(camera);
      const feet = player.position.clone().project(camera);
      return {
        width: renderWidth,
        height: renderHeight,
        ratio: renderRatio,
        resizeCount,
        fov: camera.fov,
        playerScreen: {
          headX: ((head.x + 1) * renderWidth) / 2,
          feetX: ((feet.x + 1) * renderWidth) / 2,
          headY: ((1 - head.y) * renderHeight) / 2,
          feetY: ((1 - feet.y) * renderHeight) / 2,
        },
      };
    },
    /** Step the game at a fixed 60 Hz without drawing — deterministic QA on any host. */
    simulate(seconds: number) {
      renderOff = true;
      const n = Math.max(1, Math.round(seconds * 60));
      for (let i = 0; i < n; i++) {
        const { hold, interactEdge } = pollInput();
        step(1 / 60, hold, interactEdge);
        if (!hold) charging = false;
      }
      renderOff = false;
      last = performance.now();
      push(hud());
    },
    setStick(x: number, y: number) {
      touchX = x;
      touchY = y;
    },
    setCharge(next: boolean) {
      charging = next;
    },
    press(code: string) {
      if (code === "Pause") {
        togglePause(true);
        return;
      }
      if (code === "Resume") {
        togglePause(false);
        return;
      }
      if (code === "SoundToggle") {
        audio.toggleMuted();
        push(hud());
        return;
      }
      if (code === "ResetSave") {
        try {
          localStorage.removeItem(SAVE_KEY);
        } catch {
          /* storage denied */
        }
        window.location.reload();
        return;
      }
      if (code === "VeliTVToggle" || code === "VeliTVMute") {
        if (place === "street" && near(VELI_ANCHOR, 4)) {
          if (code === "VeliTVToggle") veliTv.toggle();
          else veliTv.mute();
          push(hud());
        }
        return;
      }
      if (code === "FoodClose") {
        foodCourt.open = null;
        push(hud());
        return;
      }
      if (code.startsWith("FoodOrder:")) {
        const [, id, index] = code.split(":");
        if (id !== "brothers" && id !== "catch901") return;
        if (place !== "street" || !near(FOOD_VENDORS[id], 2)) {
          foodCourt.open = null;
          return;
        }
        const event = orderFood(foodCourt, dollars, id, Number(index));
        if (event?.dollars) {
          city.fed = true;
          city.boost = 35;
        }
        if (event) grant(event);
        push(hud());
        return;
      }
      if (code === "VeliClose") {
        veli.open = false;
        push(hud());
        return;
      }
      if (code.startsWith("VeliOrder:")) {
        if (place !== "street" || !near(VELI_ANCHOR, 2)) {
          veli.open = false;
          return;
        }
        const [, index, flavor, okra, parts] = code.split(":");
        const event = veliOrder(
          veli,
          dollars,
          Number(index),
          Number(flavor),
          okra === "1",
          Number(parts ?? 0),
        );
        if (event?.dollars) {
          city.fed = true;
          city.boost = 35;
        }
        if (event) grant(event);
        return;
      }
      if (courtCommand(code)) return;
      if (code === "KeyE") {
        if (place === "street" && near(VELI_ANCHOR, 2) && !veli.open && veli.serving <= 0)
          veliTv.play();
        interactQueued = true;
        return;
      }
      keys.add(code);
      pulses.set(code, 12);
    },
    toggleNight() {
      cycleLight();
    },
    setPos(x: number, z: number, yaw?: number) {
      this.setShot({ x, z, yaw });
    },
    setShot(opts: {
      x?: number;
      z?: number;
      yaw?: number;
      facing?: Facing;
      night?: boolean;
      golden?: boolean;
      place?: Place;
      carrying?: boolean;
      delivered?: boolean;
      dialogue?: string;
      mission?: string;
      dollars?: number;
      respect?: number;
      ballHeld?: boolean;
      ballAt?: { x: number; y: number; z: number };
      dist?: number;
      height?: number;
      lookY?: number;
    }) {
      if (opts.dollars != null) dollars = opts.dollars;
      if (opts.respect != null) respect = opts.respect;
      if (opts.mission != null) mission = opts.mission;
      if (opts.dialogue != null) dialogue = opts.dialogue;
      if (opts.carrying != null) carrying = opts.carrying;
      if (opts.delivered != null) delivered = opts.delivered;
      if (opts.golden) {
        golden = true;
        night = false;
      } else if (opts.night != null) {
        night = opts.night;
        golden = false;
      }
      if (opts.facing) facing = opts.facing;
      foodReceiver.reset();
      veli.open = false;
      veli.serving = 0;
      foodCourt.open = null;
      foodCourt.serving = null;
      foodCourt.left = 0;
      city.fish = null;
      city.bowl = null;
      city.race = null;
      circuit.group.visible = false;
      player.visible = true;
      raceOverview = false;
      rod.visible = false;
      fishingLine.visible = false;
      bobber.visible = false;
      bowlBall.visible = false;
      if (opts.place === "home") {
        place = "home";
        player.position.set(opts.x ?? 0, 0, opts.z ?? 201.2);
      } else if (opts.place === "hq") {
        place = "hq";
        player.position.set(opts.x ?? 80.4, 0, opts.z ?? 203.4);
      } else if (opts.place === "haunt") {
        place = "haunt";
        player.position.set(opts.x ?? 4, 0, opts.z ?? 501.6);
      } else if (opts.x != null && opts.z != null) {
        player.position.set(opts.x, 0, opts.z);
        place = "street";
      }
      updatePlace();
      if (opts.place === "court") place = "court";
      if (opts.ballHeld != null) ballHeld = opts.ballHeld;
      shotCameraLeft = 0;
      charge = 0;
      if (opts.ballAt) {
        ballHeld = false;
        pinBall = new THREE.Vector3(opts.ballAt.x, opts.ballAt.y, opts.ballAt.z);
        ball.position.copy(pinBall);
        ballVel.set(0, 0, 0);
        place = "court";
      } else pinBall = null;
      if (opts.yaw != null) {
        camYaw = opts.yaw;
        camDist = opts.dist ?? null;
        camHeight = opts.height ?? null;
        camLookY = opts.lookY ?? null;
        const lookX = Math.sin(camYaw);
        const lookZ = Math.cos(camYaw);
        const inside = place === "home" || place === "hq" || place === "haunt";
        const dist = camDist ?? (inside ? 3.05 : 3.05);
        const height = camHeight ?? (inside ? 1.5 : 1.42);
        plantFeet(player);
        if (place === "haunt")
          player.position.y = hauntFloorAt(player.position.x, player.position.z - 500) + 0.03;
        let camX = player.position.x - lookX * dist;
        let camZ = player.position.z - lookZ * dist;
        const zone = collisionZone();
        const pulled = pullCamera(
          player.position.x,
          player.position.z,
          camX,
          camZ,
          zone.solids.filter((s) => s.cameraBlock !== false),
          zone.ox,
          zone.oz,
        );
        camX = pulled.x;
        camZ = pulled.z;
        camera.position.set(camX, player.position.y + height, camZ);
      }
      carried.visible = carrying;
      world.counterPack.visible = !carrying && !delivered;
      applyNight();
      updatePlace();
      api.x = player.position.x;
      api.z = player.position.z;
      api.facing = facing;
      api.place = place;
      api.dollars = dollars;
      api.respect = respect;
      api.mission = mission;
      api.carrying = carrying;
      api.dialogue = dialogue;
      push(hud());
    },
    cameraYaw() {
      return camYaw;
    },
    spriteState() {
      const inspect = (host: THREE.Object3D, mesh: THREE.Mesh, id: string) => {
        const mat = mesh.material as THREE.MeshBasicMaterial;
        const image = mat.map?.image as HTMLImageElement | undefined;
        const position = host.getWorldPosition(new THREE.Vector3());
        const projected = position.clone().project(camera);
        const canvasBox = canvas.getBoundingClientRect();
        mesh.geometry.computeBoundingBox();
        const box = mesh.geometry.boundingBox!;
        const corners = [
          new THREE.Vector3(box.min.x, box.min.y, 0),
          new THREE.Vector3(box.max.x, box.min.y, 0),
          new THREE.Vector3(box.min.x, box.max.y, 0),
          new THREE.Vector3(box.max.x, box.max.y, 0),
        ].map((point) => mesh.localToWorld(point).project(camera));
        return {
          id,
          x: position.x,
          y: position.y,
          z: position.z,
          heading: host.userData.heading as number | undefined,
          face: mesh.userData.face as Facing | undefined,
          pose: mesh.userData.pose as string | undefined,
          src: image?.currentSrc || image?.src || "",
          loaded: Boolean(image?.complete && image.naturalWidth),
          visible: mesh.visible && host.parent?.visible !== false,
          opacity: mat.opacity,
          screen: {
            x: ((projected.x + 1) * canvasBox.width) / 2,
            y: ((1 - projected.y) * canvasBox.height) / 2,
          },
          screenBounds: {
            left: Math.min(...corners.map((p) => ((p.x + 1) * canvasBox.width) / 2)),
            right: Math.max(...corners.map((p) => ((p.x + 1) * canvasBox.width) / 2)),
            top: Math.min(...corners.map((p) => ((1 - p.y) * canvasBox.height) / 2)),
            bottom: Math.max(...corners.map((p) => ((1 - p.y) * canvasBox.height) / 2)),
          },
          views: Object.fromEntries(
            Object.entries(host.userData.tex ?? (id === "benji" ? textures : {})).map(
              ([face, texture]) => {
                const image = (texture as THREE.Texture).image as HTMLImageElement;
                return [
                  face,
                  {
                    src: image.currentSrc || image.src,
                    loaded: image.complete && image.naturalWidth > 0,
                  },
                ];
              },
            ),
          ),
        };
      };
      const hosts = [...world.billboards, kSprite.parent ?? kSprite];
      return {
        player: inspect(player, avatar, "benji"),
        actors: hosts.map((host) =>
          inspect(
            host,
            host.getObjectByName("sprite") as THREE.Mesh,
            (host.userData.asset as { id: string }).id,
          ),
        ),
      };
    },
    courtProduction() {
      const built = world.exterior.getObjectByName("901-production-environment");
      const features: string[] = [];
      built?.traverse((obj) => {
        if (
          obj.name === "court-branded-sign" ||
          obj.name === "901-gate-banner" ||
          obj.name === "901-mural-panel" ||
          obj.name === "901-court-ball-rack"
        ) {
          features.push(obj.name);
        }
      });
      return {
        built: Boolean(built),
        features,
        gateWidth: built?.userData.gateClearWidth as number | undefined,
        rims: world.hoops.map((h) => ({ ...h })),
        courtOg: { ...world.courtOg },
        stage: world.exterior.getObjectByName("901-production-environment")?.userData
          .productionVersion,
      };
    },
    bealeProduction() {
      const district = world.exterior.getObjectByName("beale-production-nightlife");
      const pools = district?.userData.neonPools as THREE.MeshBasicMaterial[] | undefined;
      return {
        built: Boolean(district),
        version: district?.userData.productionVersion as number | undefined,
        poolCount: pools?.length ?? 0,
        opacities: pools?.map((mat) => mat.opacity) ?? [],
        signCount: district?.children.filter((child) => child.type === "Group").length ?? 0,
      };
    },
    vehicleProduction() {
      const vehicles: THREE.Group[] = [];
      world.exterior.traverse((object) => {
        if (
          object.type === "Group" &&
          object.userData.visualVersion === 3 &&
          typeof object.userData.kind === "string"
        )
          vehicles.push(object as THREE.Group);
      });
      return {
        count: vehicles.length,
        complete: vehicles.filter(
          (v) => v.getObjectByName("body") && v.getObjectByName("vehicle-contact-shadow"),
        ).length,
        kinds: [...new Set(vehicles.map((v) => v.userData.kind as string))],
        lampPools: world.lamps.filter((l) => Boolean(l.userData.haloMaterial)).length,
      };
    },
    riverfrontProduction() {
      const built = world.exterior.getObjectByName("memphis-riverfront-production");
      return {
        built: Boolean(built),
        version: built?.userData.productionVersion as number | undefined,
        archSpans: built?.userData.bridgeSpanCount as number | undefined,
        pier: { ...world.districts.pier },
        bait: { ...world.districts.bait },
        cooler: Boolean(built?.getObjectByName("river-fishing-cooler")),
        tackle: Boolean(built?.getObjectByName("river-tackle-box")),
        ripples: Boolean(built?.getObjectByName("river-water-highlights")),
      };
    },
    charactersNearCamera() {
      return world.billboards.map((ped) => {
        const position = ped.getWorldPosition(new THREE.Vector3());
        const sprite = ped.getObjectByName("sprite") as THREE.Mesh | undefined;
        const mat = sprite?.material as THREE.MeshBasicMaterial | undefined;
        return {
          id: (ped.userData.asset as { id?: string } | undefined)?.id ?? "unknown",
          distance: Math.hypot(position.x - camera.position.x, position.z - camera.position.z),
          visible: Boolean(sprite?.visible),
          opacity: mat?.opacity ?? 1,
        };
      });
    },
    peds() {
      return world.pedestrians.map((ped) => ({
        id: (ped.userData.asset as { id?: string } | undefined)?.id ?? "?",
        x: Math.round(ped.position.x * 10) / 10,
        y: Math.round(ped.position.y * 1000) / 1000,
        z: Math.round(ped.position.z * 10) / 10,
      }));
    },
  };
  (window as unknown as { __SACK_V2_INPUT__?: typeof touchApi }).__SACK_V2_INPUT__ = touchApi;

  const stop = () => {
    if (activeStop === stop) activeStop = null;
    cancelAnimationFrame(frame);
    window.removeEventListener("keydown", kd);
    window.removeEventListener("keydown", onWakeKey);
    window.removeEventListener("pointerdown", wake);
    document.removeEventListener("visibilitychange", onAudioVisibility);
    audio.dispose();
    window.removeEventListener("keyup", ku);
    window.removeEventListener("blur", clearKeys);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("resize", resize);
    canvas.removeEventListener("pointerdown", orbitDown);
    canvas.removeEventListener("pointermove", orbitMove);
    canvas.removeEventListener("pointerup", orbitEnd);
    canvas.removeEventListener("pointercancel", orbitEnd);
    canvas.removeEventListener("lostpointercapture", orbitEnd);
    foodReceiver.dispose();
    courtCameraCutaway.dispose();
    veliTv.dispose();
    courtAnimation.dispose();
    courtUniforms.dispose();
    bloom.dispose();
    composer.dispose();
    renderer.dispose();
  };
  activeStop = stop;
  return stop;
}

function ballTex() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#d3542c";
  g.fillRect(0, 0, 256, 128);
  g.strokeStyle = "#1a1a1a";
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(20, 0);
  g.bezierCurveTo(40, 40, 40, 88, 20, 128);
  g.moveTo(128, 0);
  g.bezierCurveTo(100, 40, 100, 88, 128, 128);
  g.moveTo(0, 64);
  g.lineTo(256, 64);
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function spawnTraffic(world: SliceWorld, lanes: Lane[]): Car[] {
  const cars: Car[] = [];
  const spec = [
    { lane: 0, s: 8 },
    { lane: 0, s: 28 },
    { lane: 0, s: 52 },
    { lane: 0, s: 78 },
    { lane: 0, s: 110 },
    { lane: 1, s: 4 },
    { lane: 1, s: 22 },
    { lane: 1, s: 40 },
    { lane: 2, s: 8 },
    { lane: 2, s: 36 },
    { lane: 2, s: 62 },
    { lane: 2, s: 92 },
    { lane: 0, s: 150 },
    { lane: 0, s: 195 },
    { lane: 0, s: 253 },
    { lane: 0, s: 300 },
    { lane: 2, s: 112 },
    { lane: 2, s: 132 },
  ];
  spec.forEach((item, i) => {
    const mesh = carBody(
      (
        [
          "sedan",
          "sedan",
          "suv",
          "sedan",
          "van",
          "suv",
          "sedan",
          "sedan",
          "suv",
          "sedan",
          "van",
          "sedan",
        ] as const
      )[i % 12]!,
    );
    const lamps = mesh.userData.headlights as THREE.MeshStandardMaterial[] | undefined;
    if (lamps) world.headlightMats.push(...lamps);
    const sample = sampleLane(lanes[item.lane]!, item.s);
    mesh.position.set(sample.x, 0.06, sample.z);
    mesh.rotation.y = sample.yaw;
    world.exterior.add(mesh);
    cars.push({ lane: item.lane, s: item.s, speed: 7, mesh });
  });
  return cars;
}

function yawTo(obj: THREE.Object3D, cam: THREE.Vector3) {
  const pos = obj.getWorldPosition(new THREE.Vector3());
  return Math.atan2(cam.x - pos.x, cam.z - pos.z);
}

function resolve(pos: THREE.Vector3, radius: number, solids: Solid[], ox: number, oz: number) {
  for (let pass = 0; pass < 3; pass++) {
    for (const solid of solids) {
      const minX = solid.minX + ox - radius;
      const maxX = solid.maxX + ox + radius;
      const minZ = solid.minZ + oz - radius;
      const maxZ = solid.maxZ + oz + radius;
      if (pos.x < minX || pos.x > maxX || pos.z < minZ || pos.z > maxZ) continue;
      const left = pos.x - minX;
      const right = maxX - pos.x;
      const back = pos.z - minZ;
      const front = maxZ - pos.z;
      const min = Math.min(left, right, back, front);
      if (min === left) pos.x = minX;
      else if (min === right) pos.x = maxX;
      else if (min === back) pos.z = minZ;
      else pos.z = maxZ;
    }
  }
}

function dampAngle(current: number, target: number, amount: number) {
  let delta = target - current;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * amount;
}
