import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import type { Facing, HudState, Place, Solid, V2Public } from "./core/types";
import { productionLanes, sampleLane, gapAhead, type Lane } from "./roads/lanes";
import { createSaveWriter } from "./core/persistence";
import { pullCamera } from "./core/camera-collision";
import { cameraFraming } from "./core/camera-framing";
import { buildSlice, carBody, type SliceWorld } from "./world/slice";
import { presentVehicles } from "./world/kits/vehicles";
import { faceFoliage } from "./world/kits/trees";
import { characters, frameSize, type Cutout } from "./assets/characters";
import { characterMaterial, footMarker, plantFeet, seatOnGround, solePlane, solidCutout } from "./world/feet";
import {
  activityCharge,
  activityPrompt,
  cancelApproach,
  cityMission,
  crossFinish,
  freshCity,
  hookFish,
  locked,
  pullEarly,
  tickCity,
  triggerSpot,
  type City,
  type PlayEvent,
  type Spot,
} from "./play/city";

type Car = { lane: number; s: number; speed: number; mesh: THREE.Group };

const SAVE_KEY = "sack-v2";
let activeStop: (() => void) | null = null;

export function startSackV2(canvas: HTMLCanvasElement, push: (hud: HudState) => void): () => void {
  activeStop?.();
  const world = buildSlice();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 220);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(world.scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(canvas.clientWidth || 1280, canvas.clientHeight || 720), 0.18, 0.42, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const player = new THREE.Group();
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false }),
  );
  shadow.name = "contact-shadow";
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  shadow.scale.set(1, 0.72, 1);
  player.add(shadow);
  player.add(footMarker());
  const soft = new THREE.Mesh(
    new THREE.CircleGeometry(0.7, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.16, depthWrite: false }),
  );
  soft.rotation.x = -Math.PI / 2;
  soft.position.y = 0.02;
  player.add(soft);
  const benji = frameSize(characters.benji, "front");
  const avatarMat = characterMaterial();
  const avatar = new THREE.Mesh(solePlane(benji.w, benji.h, benji.footPad, benji.pxH, benji.centerPx, benji.pxW), avatarMat);
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

  const kSprite = world.kSprite;

  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.16, 18, 14), new THREE.MeshStandardMaterial({ map: ballTex(), roughness: 0.55 }));
  ball.castShadow = true;
  ball.position.set(world.hoop.x + 4, 0.16, world.hoop.z);
  world.scene.add(ball);

  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.025, 1.35, 6),
    new THREE.MeshStandardMaterial({ color: 0x6b3a22, roughness: 0.7 }),
  );
  rod.position.set(0.38, 1.05, 0.05);
  rod.rotation.z = -0.7;
  rod.visible = false;
  player.add(rod);
  const bobber = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xe0b33a, emissive: 0xe0b33a, emissiveIntensity: 0.4 }),
  );
  bobber.visible = false;
  bobber.position.set(-16, 0.18, -81);
  world.scene.add(bobber);
  const bowlBall = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 18, 14),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.35, metalness: 0.4 }),
  );
  bowlBall.visible = false;
  world.scene.add(bowlBall);
  const pinMat = new THREE.MeshStandardMaterial({ color: 0xf4efe4, roughness: 0.45 });
  const pinNeck = new THREE.MeshStandardMaterial({ color: 0xc4473a, roughness: 0.5 });
  const pins: THREE.Mesh[] = [];
  const pinHome: THREE.Vector3[] = [];
  const rack = [[0], [-0.26, 0.26], [-0.52, 0, 0.52], [-0.78, -0.26, 0.26, 0.78]];
  rack.forEach((row, i) => {
    row.forEach((ox) => {
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.46, 8), pinMat);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.06, 8), pinNeck);
      band.position.y = 0.08;
      pin.add(band);
      pin.position.set(92 + ox, 0.36, -29.4 - i * 0.34);
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
    if (obj.userData.kind && obj.userData.radius && !cars.some((car) => car.mesh === obj)) parked.push(obj);
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
  let mission = "Walk the block to SackReligious HQ";
  let metK = false;
  let carrying = false;
  let delivered = false;
  let hauntTicket = false;
  let hauntCleared = false;
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
  let charging = false;
  let interactHeld = false;
  let ballHeld = false;
  let pinBall: THREE.Vector3 | null = null;
  let logOpen = false;
  const city: City = freshCity();
  const ballVel = new THREE.Vector3();
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
    if (saved?.bowled) city.bowled = true;
    if (saved?.raced) city.raced = true;
    if (saved && Number.isFinite(saved.bestBowl)) city.bestBowl = saved.bestBowl!;
    if (saved && Number.isFinite(saved.bestRace)) city.bestRace = saved.bestRace!;
    if (saved?.hauntTicket) hauntTicket = true;
    if (saved?.hauntCleared) hauntCleared = true;
  } catch {
    /* fresh slice */
  }

  const onKey = (e: KeyboardEvent, down: boolean) => {
    const code = e.code || e.key;
    if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyN", "KeyE", "KeyM", "KeyQ", "KeyR", "ShiftLeft", "ShiftRight"].includes(code) || ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();
    if (down && e.repeat) return;
    const names = [code, e.key].filter(Boolean);
    if (down) names.forEach((name) => keys.add(name));
    else names.forEach((name) => keys.delete(name));
    if (down && (code === "KeyN" || e.key === "n" || e.key === "N")) cycleLight();
    if (down && (code === "KeyM" || e.key === "m" || e.key === "M")) logOpen = !logOpen;
  };
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
    if (document.hidden) clearKeys();
  };
  window.addEventListener("keydown", kd);
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

  const api: V2Public = { x: player.position.x, y: player.position.y, z: player.position.z, facing, place, cars: [], dollars, respect, mission, carrying, dialogue, pose: facing };
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
  const loop = (now: number) => {
    frame = requestAnimationFrame(loop);
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    resize();

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
    step(dt, hold, interactEdge);
    if (!hold) charging = false;

    hudAcc += dt;
    if (hudAcc > 0.12) {
      hudAcc = 0;
      push(hud());
      save({
        dollars, respect, carrying, delivered, mission,
        bait: city.bait, fit: city.fit, fed: city.fed, fished: city.fished, bowled: city.bowled, raced: city.raced,
        bestBowl: city.bestBowl, bestRace: city.bestRace, hauntTicket, hauntCleared,
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
      mission,
      prompt: promptFor(),
      charge: place === "court" ? charge : activityCharge(city),
      night,
      golden,
      made,
      taken,
      dialogue,
      carrying,
      x: player.position.x,
      z: player.position.z,
      fit: city.fit,
      bait: city.bait,
      boost: city.boost > 0,
      log: logOpen,
      marks: { fish: city.fished, bowl: city.bowled, food: city.fed, race: city.raced },
      bestBowl: city.bestBowl,
      bestRace: city.bestRace,
    };
  }

  function promptFor() {
    const live = activityPrompt(city);
    if (live) return live;
    if (place === "street" && near(world.homeDoor, 1.4)) return "E  Enter home";
    if (place === "street" && near(world.hqDoor, 1.6)) return "E  Enter SackReligious";
    if (place === "home" && nearLocal(world.homeIn, 1.3, 0, 200)) return "E  Leave home";
    if (place === "hq" && nearLocal(world.hqIn, 1.4, 80, 200)) return "E  Leave HQ";
    if (place === "hq" && nearLocal(world.kAnchor, 2.2, 80, 200)) return delivered ? "E  Talk to K Blanco" : "E  Talk to K Blanco";
    if (place === "home" && nearLocal(world.wardrobe, 1.35, 0, 200)) return "E  Change fit";
    if (near(world.courtOg, 1.8)) return carrying ? "E  Deliver to Court OG" : "E  Talk to Court OG";
    if (place === "street" && near(world.districts.bowlDoor, 2.4)) return "E  Roll at 901 Bowl";
    if (place === "street" && near(world.districts.pier, 2.2)) return city.bait > 0 ? "E  Cast (bait on)" : "E  Cast a line";
    if (place === "street" && near(world.districts.bait, 2.2)) return "E  Buy bait  $15";
    if (place === "street" && near(world.districts.meetStart, 2.6)) return "E  Run the strip";
    if (place === "street" && near(world.districts.truckOrder, 2.4)) return "E  Order at the window";
    if (place === "street" && near(world.haunt.ticket, 1.8)) return hauntTicket ? "E  Ticket punched" : "E  Buy a ticket  $10";
    if (place === "street" && near(world.haunt.gate, 1.8)) return hauntTicket ? "E  Enter the house" : "E  Need a ticket";
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
    for (const car of cars) pushCircle(car.mesh, ((car.mesh.userData.radius as number) || 2.2) * 0.72);
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
    const busy = locked(city);
    const steer = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0) + touchX;
    const sx = steer;
    const sy = (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) + touchY;
    const len = Math.hypot(sx, sy);
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
      speed = (keys.has("ShiftLeft") || keys.has("ShiftRight") ? sprintSpeed : walkSpeed) * Math.min(1, len);
      if (city.race) speed = city.fit === "night" ? 11.4 : 9.4;
      else if (city.fit === "night") speed *= 1.12;
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
    player.position.x += glideX * dt;
    player.position.z += glideZ * dt;
    travel += Math.hypot(glideX, glideZ) * dt;
    player.userData.life = ((player.userData.life as number) ?? 0) + dt;
    if (place === "court" && ballHeld && hold) facing = faceAlong(world.hoop.x - player.position.x, world.hoop.z - player.position.z);
    const zone = collisionZone();
    resolve(player.position, 0.34, zone.solids, zone.ox, zone.oz);
    if (city.bowl) {
      player.position.x = 92;
      player.position.z = -17.6;
    }
    separateBodies();
    // Door openings remain real colliders, not teleport triggers through walls.
    if (place === "home" && player.position.z >= 203.7 && Math.abs(player.position.x) < 1.35) {
      leaveInterior("home");
    } else if (place === "hq" && player.position.z >= 205.65 && Math.abs(player.position.x - 80) < 1.9) {
      leaveInterior("hq");
    }
    if (place === "street" || place === "court") {
      if (player.position.x < -104) { player.position.x = -104; glideX = 0; }
      if (player.position.x > 148) { player.position.x = 148; glideX = 0; }
      if (player.position.z < -92) { player.position.z = -92; glideZ = 0; }
      if (player.position.z > 40) { player.position.z = 40; glideZ = 0; }
      resolve(player.position, 0.34, zone.solids, zone.ox, zone.oz);
    }
    carried.visible = carrying;
    world.counterPack.visible = !carrying && !delivered;

    if (interact) tryEnter();
    const play = tickCity(city, dt, hold, steer);
    if (play) grant(play);
    if (!city.bowl && /901 Bowl|on the lane/.test(dialogue)) {
      dialogue = "";
      talkLeft = 0;
    }
    if (talkLeft > 0) {
      talkLeft -= dt;
      if (talkLeft <= 0) dialogue = "";
    }
    if (city.race && player.position.x > -19.5 && player.position.z < -33 && player.position.z > -40.2) {
      const finish = crossFinish(city);
      if (finish) grant(finish);
    }
    rod.visible = Boolean(city.fish);
    bobber.visible = Boolean(city.fish);
    if (city.fish) bobber.position.y = 0.16 + Math.sin(performance.now() / 180) * 0.04;
    presentBowl(dt);
    if (place === "haunt" && !hauntCleared) {
      const room = world.haunt.finalRoom;
      if (player.position.x > room.minX && player.position.x < room.maxX && player.position.z > room.minZ && player.position.z < room.maxZ) {
        hauntCleared = true;
        respect += 8;
        say("Final court — You walked the house. The last rim is lit.", 4.2);
        mission = delivered ? mission : "The haunted house let you through.";
      }
    }
    updatePlace();
    updateBall(dt, hold, interact);
    updateTraffic(dt);
    updatePeds(dt);
    placeCamera(dt);
    faceAvatar();
    faceFoliage(camera.position);
    composer.render();

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
  }

  function screenBasis() {
    const fwdX = Math.sin(camYaw);
    const fwdZ = Math.cos(camYaw);
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
    if (place === "haunt") return { solids: world.solids.haunt, ox: 0, oz: 500 };
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

  function tryEnter() {
    if (city.fish) {
      grant(city.fish.phase === "bite" ? hookFish(city) : pullEarly(city));
      return;
    }
    if (city.bowl?.phase === "aim") {
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
      if (delivered) {
        say("K Blanco — Court OG got the drop. The block is yours until the next one.");
      } else {
        carrying = true;
        say("K Blanco — Take this drop to Court OG. He is outside the 901 court. SackDollars and Respect when it lands.", 5.5);
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
      }
      grant(play);
      return;
    }
    if (place === "street" && near(world.districts.pier, 2.2)) {
      grant(triggerSpot(city, "pier", dollars));
      return;
    }
    if (place === "street" && near(world.districts.bait, 2.2)) {
      grant(triggerSpot(city, "bait", dollars));
      return;
    }
    if (place === "street" && near(world.districts.meetStart, 2.6)) {
      const play = triggerSpot(city, "meet", dollars);
      if (play.teleport) player.position.set(play.teleport.x, 0, play.teleport.z);
      grant(play);
      return;
    }
    if (place === "street" && near(world.districts.truckOrder, 2.4)) {
      grant(triggerSpot(city, "truck", dollars));
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
    if (play.pins != null) knockPins(play.pins);
  }

  function namedPed(r: number): Spot | null {
    let best: Spot | null = null;
    let bestD = r;
    for (const ped of world.pedestrians) {
      const id = (ped.userData.asset as { id?: string } | undefined)?.id;
      const spot = id === "mama-dee" ? "mama" : id === "unc-j" ? "unc" : id === "nitro" ? "nitro" : id === "strike" ? "strike" : null;
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
      pin.visible = true;
    });
    bowlBall.visible = false;
  }

  function knockPins(count: number) {
    pins.forEach((pin, i) => {
      if (i >= count) return;
      pin.rotation.z = i % 2 === 0 ? 1.15 : -1.15;
      pin.position.y = 0.16;
      pin.position.z -= 0.18;
    });
  }

  function presentBowl(dt: number) {
    const bowl = city.bowl;
    if (!bowl) {
      bowlBall.visible = false;
      return;
    }
    const laneX = 92;
    const startZ = -18.15;
    const pinZ = -29.3;
    bowlBall.visible = true;
    if (bowl.phase === "aim") {
      bowlBall.position.set(laneX + bowl.aim * 0.42, 0.2, startZ);
      bowlBall.rotation.set(0, 0, 0);
      return;
    }
    const duration = bowl.phase === "roll" ? 1.65 : 0;
    const t = bowl.phase === "roll" ? 1 - Math.max(0, bowl.left) / duration : 1;
    bowlBall.position.set(laneX + bowl.aim * (0.42 + t * 0.85), 0.2, startZ + (pinZ - startZ) * t);
    bowlBall.rotation.x -= dt * 16;
  }

  function updatePlace() {
    world.home.visible = place === "home";
    world.hq.visible = place === "hq";
    world.exterior.visible = place === "street" || place === "court";
    world.haunt.group.visible = place === "haunt";
    for (const light of world.haunt.lights) light.visible = place === "haunt";
    for (const light of world.homeLights) light.visible = place === "home";
    for (const light of world.hqLights) light.visible = place === "hq";
    if (place === "home" || place === "hq" || place === "haunt") return;
    const onCourt = player.position.x > 55.2 && player.position.x < 76.8 && player.position.z < -15.1 && player.position.z > -28.9;
    place = onCourt ? "court" : "street";
  }

  function updateBall(dt: number, hold: boolean, interact: boolean) {
    if (place !== "court") {
      charge = 0;
      return;
    }
    if (pinBall) {
      ball.position.copy(pinBall);
      ballVel.set(0, 0, 0);
      return;
    }
    if (ballHeld) {
      ball.position.set(player.position.x, 1.05, player.position.z);
      ballVel.set(0, 0, 0);
      if (hold) charge = Math.min(1, charge + dt / 0.85);
      if ((!hold || charge >= 1) && charge > 0.02) {
        const dx = world.hoop.x - player.position.x;
        const dz = world.hoop.z - player.position.z;
        const dist = Math.hypot(dx, dz) || 1;
        const power = 4.2 + charge * 7.5;
        ballVel.set((dx / dist) * power, 4.2 + charge * 4.8, (dz / dist) * power);
        if (city.fit === "court") {
          ballVel.x += (dx / dist) * 1.4;
          ballVel.z += (dz / dist) * 1.4;
        }
        ballHeld = false;
        taken += 1;
        charge = 0;
      } else if (!hold) charge = 0;
      return;
    }
    ballVel.y -= 12 * dt;
    ball.position.addScaledVector(ballVel, dt);
    for (const board of world.backboards) {
      const hitting = ball.position.y > board.minY && ball.position.y < board.maxY && ball.position.z > board.minZ && ball.position.z < board.maxZ;
      if (hitting && Math.abs(ball.position.x - board.x) < 0.28 && Math.sign(ballVel.x) === -board.nx) {
        ballVel.x *= -0.62;
        ball.position.x = board.x + board.nx * 0.22;
      }
    }
    for (const hoop of world.hoops) {
      const rimDx = ball.position.x - hoop.x;
      const rimDz = ball.position.z - hoop.z;
      if (ballVel.y < 0 && ball.position.y < hoop.y + 0.2 && ball.position.y > hoop.y - 0.15 && Math.hypot(rimDx, rimDz) < 0.42) {
        made += 1;
        respect += 5;
        dollars += 25;
        mission = "Bucket. The 901 felt that.";
        ballHeld = true;
        charge = 0;
        return;
      }
    }
    if (ball.position.y < 0.16) {
      ball.position.y = 0.16;
      if (Math.abs(ballVel.y) < 1.4) ballVel.set(0, 0, 0);
      else ballVel.y *= -0.45;
      ballVel.x *= 0.7;
      ballVel.z *= 0.7;
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
          blocked = cars.some((other) => other.lane === 0 && Math.hypot(other.mesh.position.x - junction.x, other.mesh.position.z - junction.z) < 6);
        }
      }
      const ahead = cars.find((other) => other !== car && other.lane === car.lane && gapAhead(lane, car.s, other.s) < 11);
      car.speed = blocked || ahead ? 0 : lane.id === "cross" ? 5.2 : 7.4;
      if (!blocked && !ahead) car.s += car.speed * dt;
      const sample = sampleLane(lane, car.s);
      const prev = car.mesh.position.clone();
      car.mesh.position.set(sample.x, 0.06, sample.z);
      car.mesh.rotation.y = sample.yaw;
      if (car.speed > 0) {
        const moved = Math.atan2(car.mesh.position.x - prev.x, car.mesh.position.z - prev.z);
        if (Math.hypot(car.mesh.position.x - prev.x, car.mesh.position.z - prev.z) > 0.001) car.mesh.rotation.y = moved;
      }
    }
  }

  function updatePeds(dt: number) {
    for (const ped of world.pedestrians) {
      const route = ped.userData.route as
        | { pts: { x: number; z: number }[]; i: number; dir: number; speed: number; phase: number; wait?: number; gait?: number }
        | undefined;
      if (route && !ped.userData.idle) {
        const target = route.pts[route.i];
        if ((route.wait ?? 0) > 0) {
          route.wait = (route.wait ?? 0) - dt;
          route.gait = (route.gait ?? 0) * Math.exp(-7 * dt);
        } else if (target) {
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
    const movingAlong = Boolean(route) && !ped.userData.idle && (route?.wait ?? 0) <= 0 && ((ped.userData.gait as number) ?? 0) > 0.2;
    if (movingAlong) return;
    const life = (ped.userData.life as number) ?? 0;
    const partner = ped.userData.partner as THREE.Object3D | undefined;
    if (partner) {
      const aim = Math.atan2(partner.position.x - ped.position.x, partner.position.z - ped.position.z) + Math.sin(life * 1.5) * 0.1;
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
    if (best) aimHeading(ped, Math.atan2(best.position.x - ped.position.x, best.position.z - ped.position.z), dt, 3);
  }

  function applyBenji(face: Facing) {
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
    const asset = host.userData.asset as Parameters<typeof frameSize>[0] | undefined;
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
    if (asset && mesh.userData.pose !== pose) {
      const map = stepping ? walkMap : tex?.[face];
      if (map) {
        if (mesh.userData.box !== pose) {
          const size = frameSize(asset, stepping ? "walk" : face);
          mesh.geometry.dispose();
          mesh.geometry = solePlane(size.w, size.h, size.footPad, size.pxH, size.centerPx, size.pxW);
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
    const sideDistance = playerDistanceSq > 0.01
      ? Math.abs(vx * pz - vz * px) / Math.sqrt(playerDistanceSq) : Infinity;
    const opacity = cameraDistance < 2 ? 0
      : fraction > 0.05 && fraction < 0.96 && sideDistance < 0.72 ? 0.2 : 1;
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

  function faceAvatar() {
    const debug = Boolean((window as Window & { __SACK_CHARACTER_DEBUG__?: boolean }).__SACK_CHARACTER_DEBUG__);
    plantFeet(player);
    const playerMark = player.getObjectByName("foot-debug");
    if (playerMark) playerMark.visible = debug;
    applyBenji(facing);
    avatar.rotation.order = "YZX";
    avatar.rotation.x = 0;
    avatar.rotation.y = yawTo(avatar, camera.position);
    avatar.rotation.z = 0;
    seatOnGround(avatar);
    avatar.scale.set(presentScale(player), presentScale(player), 1);
    for (const board of world.billboards) {
      plantFeet(board);
      const mark = board.getObjectByName("foot-debug");
      if (mark) mark.visible = debug;
      const sprite = board.getObjectByName("sprite");
      if (!sprite) continue;
      sprite.rotation.x = 0;
      applyCard(sprite, board);
    }
    const kHost = kSprite.parent ?? kSprite;
    plantFeet(kHost);
    const kMark = kHost.getObjectByName("foot-debug");
    if (kMark) kMark.visible = debug;
    kSprite.rotation.x = 0;
    applyCard(kSprite, kHost);
    presentVehicles(camera.position);
  }

  function placeCamera(dt: number) {
    if (city.bowl) {
      const aim = city.bowl.aim;
      avatar.visible = false;
      player.position.set(92, 0, -17.6);
      camera.position.set(92, 1.05, -17.15);
      camera.lookAt(92 + aim * 0.7, 0.16, -23.5);
      return;
    }
    avatar.visible = true;
    // Wide-angle indoor framing avoids cropping nearby NPCs and shows the
    // room's actual merchandise, mezzanine and architectural depth.
    const inside = place === "home" || place === "hq" || place === "haunt";
    const framing = cameraFraming(camera.aspect, place === "hq" ? 54 : place === "home" ? 49 : 42, inside);
    const desiredFov = framing.fov;
    const previousFov = camera.fov;
    camera.fov += (desiredFov - camera.fov) * (1 - Math.exp(-5 * dt));
    if (camera.fov !== previousFov) camera.updateProjectionMatrix();
    const lookX = Math.sin(camYaw);
    const lookZ = Math.cos(camYaw);
    const talking = place === "hq" && dialogue.startsWith("K Blanco");
    const dist = camDist ?? (talking ? 2.9 : place === "haunt" ? 2.45 : inside ? 3.05 : 3.4) * framing.distanceScale;
    const height = camHeight ?? (talking ? 1.42 : inside ? 1.5 : 1.32);
    const side = talking ? 1.35 : 0;
    let destX = player.position.x - lookX * dist + lookZ * side;
    let destZ = player.position.z - lookZ * dist - lookX * side;
    const zone = collisionZone();
    const pulled = pullCamera(player.position.x, player.position.z, destX, destZ, zone.solids, zone.ox, zone.oz);
    destX = pulled.x;
    destZ = pulled.z;
    const destY = player.position.y + height;
    const follow = 1 - Math.exp(-6.5 * dt);
    camera.position.x += (destX - camera.position.x) * follow;
    camera.position.y += (destY - camera.position.y) * follow;
    camera.position.z += (destZ - camera.position.z) * follow;
    // The interpolated position can cross a wall even when the destination is clear.
    const safe = pullCamera(player.position.x, player.position.z, camera.position.x, camera.position.z,
      zone.solids, zone.ox, zone.oz);
    camera.position.x = safe.x;
    camera.position.z = safe.z;
    const ahead = talking ? 0.28 : 0.72;
    const lookY = player.position.y + (camLookY ?? (talking ? 1.12 : inside ? 1.18 : 1.02));
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
    world.hemi.intensity = night ? 0.42 : golden ? 0.55 : outside ? 0.78 : 0.7;
    world.hemi.color.set(night ? 0x31465f : golden ? 0xffc48a : 0xd4ecff);
    world.hemi.groundColor.set(night ? 0x1a140e : golden ? 0x7a4a28 : 0x6a6840);
    renderer.toneMappingExposure = night ? 0.90 : golden ? 1.12 : outside ? 1.10 : 1.03;
    bloom.strength = night ? 0.22 : golden ? 0.17 : 0.11;
    world.scene.background = night ? world.skyNight : golden ? world.skyGolden : world.skyDay;
    const fog = world.scene.fog as THREE.Fog;
    fog.color.setHex(night ? 0x141820 : golden ? 0xf0c090 : 0xc5d4e2);
    fog.near = night ? 16 : golden ? 12 : 34;
    fog.far = night ? 72 : golden ? 58 : 120;
    const hqDay = world.exterior.getObjectByName("hq-plate-day");
    const hqNight = world.exterior.getObjectByName("hq-plate-night");
    if (hqDay) hqDay.visible = !night || !hqNight;
    if (hqNight) hqNight.visible = night;
    const nearby = new Set([...world.lamps]
      .sort((a, b) => a.position.distanceToSquared(player.position) - b.position.distanceToSquared(player.position))
      .slice(0, 8));
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
    for (const light of world.haunt.lights) {
      light.intensity = 18;
      light.visible = place === "haunt";
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
    const tint = night ? 0xb7c7d8 : golden ? 0xffc898 : place === "hq" ? 0xffd2a8 : place === "home" ? 0xffe4c4 : 0xfff3e4;
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
    ballState() {
      return { held: ballHeld, charge, taken, position: { x: ball.position.x, y: ball.position.y, z: ball.position.z } };
    },
    renderState() {
      const head = new THREE.Vector3(player.position.x, player.position.y + 1.85, player.position.z).project(camera);
      const feet = player.position.clone().project(camera);
      return { width: renderWidth, height: renderHeight, ratio: renderRatio, resizeCount, fov: camera.fov,
        playerScreen: { headY: (1 - head.y) * renderHeight / 2, feetY: (1 - feet.y) * renderHeight / 2 } };
    },
    setStick(x: number, y: number) {
      touchX = x;
      touchY = y;
    },
    setCharge(next: boolean) {
      charging = next;
    },
    press(code: string) {
      if (code === "KeyE") {
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
      city.fish = null;
      city.bowl = null;
      city.race = null;
      rod.visible = false;
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
        let camX = player.position.x - lookX * dist;
        let camZ = player.position.z - lookZ * dist;
        const zone = collisionZone();
        const pulled = pullCamera(player.position.x, player.position.z, camX, camZ, zone.solids, zone.ox, zone.oz);
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
          id, x: position.x, y: position.y, z: position.z,
          heading: host.userData.heading as number | undefined,
          face: mesh.userData.face as Facing | undefined,
          pose: mesh.userData.pose as string | undefined,
          src: image?.currentSrc || image?.src || "",
          loaded: Boolean(image?.complete && image.naturalWidth),
          visible: mesh.visible && host.parent?.visible !== false,
          opacity: mat.opacity,
          screen: { x: (projected.x + 1) * canvasBox.width / 2,
            y: (1 - projected.y) * canvasBox.height / 2 },
          screenBounds: {
            left: Math.min(...corners.map((p) => (p.x + 1) * canvasBox.width / 2)),
            right: Math.max(...corners.map((p) => (p.x + 1) * canvasBox.width / 2)),
            top: Math.min(...corners.map((p) => (1 - p.y) * canvasBox.height / 2)),
            bottom: Math.max(...corners.map((p) => (1 - p.y) * canvasBox.height / 2)),
          },
          views: Object.fromEntries(Object.entries(
            host.userData.tex ?? (id === "benji" ? textures : {}))
            .map(([face, texture]) => {
              const image = (texture as THREE.Texture).image as HTMLImageElement;
              return [face, { src: image.currentSrc || image.src,
                loaded: image.complete && image.naturalWidth > 0 }];
            })),
        };
      };
      const hosts = [...world.billboards, kSprite.parent ?? kSprite];
      return {
        player: inspect(player, avatar, "benji"),
        actors: hosts.map((host) => inspect(host,
          host.getObjectByName("sprite") as THREE.Mesh,
          (host.userData.asset as { id: string }).id)),
      };
    },
    courtProduction() {
      const built = world.exterior.getObjectByName("901-production-environment");
      const features: string[] = [];
      built?.traverse((obj) => {
        if (obj.name === "court-branded-sign" || obj.name === "901-gate-banner" ||
            obj.name === "901-mural-panel" || obj.name === "901-court-ball-rack") {
          features.push(obj.name);
        }
      });
      return {
        built: Boolean(built),
        features,
        gateWidth: built?.userData.gateClearWidth as number | undefined,
        rims: world.hoops.map((h) => ({ ...h })),
        courtOg: { ...world.courtOg },
        stage: world.exterior.getObjectByName("901-production-environment")?.userData.productionVersion,
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
        if (object.type === "Group" && object.userData.visualVersion === 3 &&
            typeof object.userData.kind === "string") vehicles.push(object as THREE.Group);
      });
      return {
        count: vehicles.length,
        complete: vehicles.filter((v) =>
          v.getObjectByName("body") && v.getObjectByName("vehicle-contact-shadow")).length,
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
    window.removeEventListener("keyup", ku);
    window.removeEventListener("blur", clearKeys);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("resize", resize);
    canvas.removeEventListener("pointerdown", orbitDown);
    canvas.removeEventListener("pointermove", orbitMove);
    canvas.removeEventListener("pointerup", orbitEnd);
    canvas.removeEventListener("pointercancel", orbitEnd);
    canvas.removeEventListener("lostpointercapture", orbitEnd);
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
  ];
  spec.forEach((item, i) => {
    const mesh = carBody((["sedan", "sedan", "suv", "sedan", "van", "suv", "sedan", "sedan", "suv", "sedan", "van", "sedan"] as const)[i]!);
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
