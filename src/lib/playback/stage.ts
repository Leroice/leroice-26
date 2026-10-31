/* The live tape on the Playback case study: the app's measured cassette in three.js.
   Loaded on demand by loader.ts. Materials follow CassetteLook in the Playback app
   (CassetteMaterials.swift); the moving parts follow tape.ts.

   Renders only when something changes: a drag, the ease back to rest, a flip, or play. */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { DEFAULTS, HIGHLIGHTS, LABELS, LENGTHS, PLASTICS, type Plastic, type ShellStyle, type Side } from './content';
import { reelPose } from './tape';
import { drawSheet, printInk, STICKER_FONTS, stickerNormals } from './sheet';
import { buildControls } from './controls';
import { packMaps, shellMaps } from './surfaces';

const MODELS = '/models/playback/';
const FOV = 30;
/** The app's camera angle: a little right of and above the tape. */
const VIEW = new THREE.Vector3(0.06, 0.04, 0.46).normalize();
/** Share of the stage's width the object fills, and how far above centre it sits (share of height). */
const FRAMING = { wide: { fill: 0.54, lift: 0.07 }, tall: { fill: 0.84, lift: 0.12 } };
const FLIP_MS = 600;
/** Exponential ease back to rest after a drag, per second. */
const SETTLE_RATE = 8;
/** The tape stands 1.4 mm low in the case's pocket and 0.6 mm toward the card (build_case.py). */
const CASE_OFFSET = new THREE.Vector3(0, 0.0014, -0.0006);
/** Texture resolution of the print sheet. The app uses 10; the web tape is smaller on screen. */
const SHEET_PX_PER_MM = 8;
const PAPER = [0.93, 0.91, 0.85] as const;
/** Refractive indices: polystyrene for the shell, windows and case; POM (acetal) for the hubs. */
const IOR = { polystyrene: 1.59, pom: 1.48 };
/** Shell faces are 1.0 mm, walls 1.3 mm (the app's geometry sheet). */
const WALL = 0.0012;
const ORANGE = [0.95, 0.42, 0.12] as const;

const srgb = (r: number, g: number, b: number) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);

function see(material: THREE.Material, opacity: number) {
  material.transparent = true;
  material.opacity = opacity;
  material.depthWrite = false;
  material.side = THREE.DoubleSide;
  return material;
}

/** Helvetica Neue and Futura on Apple devices; Inter and Jost, loaded here, everywhere else. */
async function loadStickerFonts() {
  const ctx = document.createElement('canvas').getContext('2d')!;
  const installed = (family: string) => {
    ctx.font = '40px monospace';
    const base = ctx.measureText('PLB90 INDEX').width;
    ctx.font = `40px ${family}, monospace`;
    return ctx.measureText('PLB90 INDEX').width !== base;
  };
  const faces = [['"Helvetica Neue"', 'Inter', 'Inter-Medium'], ['Futura', 'Jost', 'Jost-Medium']]
    .filter(([apple]) => !installed(apple))
    .map(([, family, file]) => new FontFace(family, `url(/fonts/${file}.woff2)`, { weight: '500' }));
  await Promise.all(faces.map(async (face) => document.fonts.add(await face.load()))).catch(() => {});
  await document.fonts.load(`500 10px ${STICKER_FONTS.grotesk}`);
  await document.fonts.load(`500 10px ${STICKER_FONTS.geometric}`);
}

/** The stage's background as the page draws it: --hover-bg over the page colour. */
function stageColor(stage: HTMLElement) {
  const parse = (css: string) => (css.match(/[\d.]+/g) ?? []).map(Number);
  const [r, g, b, a = 1] = parse(getComputedStyle(stage).backgroundColor);
  const [pr, pg, pb] = parse(getComputedStyle(document.documentElement).backgroundColor);
  const mix = (c: number, p: number) => (c * a + (p ?? 255) * (1 - a)) / 255;
  return srgb(mix(r, pr), mix(g, pg), mix(b, pb));
}

/** The app's studio (CassetteStage.studioEnvironment): a dark room, an overhead softbox and two
    side strips. Clear plastic picks up the strips as highlights and stays clear everywhere else. */
function studio() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  const sky = ctx.createLinearGradient(0, 0, 0, c.height);
  sky.addColorStop(0, 'rgb(107 107 107)');
  sky.addColorStop(0.5, 'rgb(41 41 41)');
  sky.addColorStop(1, 'rgb(13 13 13)');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#fff';
  ctx.fillRect(380, 30, 300, 110);
  ctx.fillRect(120, 170, 50, 170);
  ctx.fillRect(850, 170, 50, 170);
  const texture = new THREE.CanvasTexture(c);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Puts a material on named parts. `order` sets the draw order of see-through parts: shell, print, case. */
function set(model: THREE.Object3D, names: string[], material: THREE.Material, order = 0) {
  for (const name of names) {
    model.getObjectByName(name)?.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        (o as THREE.Mesh).material = material;
        o.renderOrder = order;
      }
    });
  }
}

interface Tape {
  model: THREE.Group;
  part(name: string): THREE.Object3D;
}

export async function mountTape(stage: HTMLElement) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    return; // No WebGL: the still render stays.
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  // No tone mapping: Neutral's toe crushes the dark theme's page seen through clear plastic.
  renderer.toneMapping = THREE.NoToneMapping;
  // The canvas paints the stage's own colour, so clear plastic has the real background to refract.
  renderer.setClearColor(stageColor(stage), 1);
  const canvas = renderer.domElement;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', LABELS.stage);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(studio()).texture;
  scene.environmentIntensity = 1.6;
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-0.5, 0.7, 0.45);
  const fill = new THREE.DirectionalLight(0xffffff, 0.45);
  fill.position.set(0.6, -0.2, 0.5);
  scene.add(key, fill);

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 2);
  const turntable = new THREE.Group();
  const body = new THREE.Group();
  const caseHolder = new THREE.Group();
  caseHolder.position.copy(CASE_OFFSET);
  turntable.add(body, caseHolder);
  scene.add(turntable);

  // ── Print sheet, shared by the tape and the case ──────────
  const sheetCanvas = document.createElement('canvas');
  const sheet = new THREE.CanvasTexture(sheetCanvas);
  sheet.colorSpace = THREE.SRGBColorSpace;
  sheet.flipY = false; // glTF UVs run top-down, like the canvas
  sheet.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // ── Materials ─────────────────────────────────────────────
  const texture = (source: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(source);
    t.flipY = false;
    t.colorSpace = THREE.NoColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  };
  const shells = new Map<ShellStyle, THREE.MeshPhysicalMaterial>();
  function shellMaterial(style: ShellStyle) {
    if (!shells.has(style)) {
      const maps = shellMaps(style);
      const common = { ior: IOR.polystyrene, roughness: 1, roughnessMap: texture(maps.roughness), normalMap: texture(maps.normal) };
      shells.set(style, style === 'clear'
        // Clear polystyrene: light passes through the 1.2 mm wall and the tint is absorbed on the way.
        ? new THREE.MeshPhysicalMaterial({ ...common, transmission: 1, thickness: WALL, attenuationDistance: WALL, side: THREE.DoubleSide })
        : new THREE.MeshPhysicalMaterial(common));
    }
    return shells.get(style)!;
  }
  const pack = packMaps();
  const gauge = new THREE.MeshBasicMaterial();
  const steel = new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 1 });
  const fixed = {
    // White POM hubs: satin, not glossy.
    hub: new THREE.MeshPhysicalMaterial({ color: srgb(0.92, 0.91, 0.87), roughness: 0.42, ior: IOR.pom }),
    accent: new THREE.MeshPhysicalMaterial({ color: srgb(...ORANGE), roughness: 0.45, ior: IOR.pom }),
    tape: new THREE.MeshStandardMaterial({ color: srgb(0.075, 0.052, 0.042), roughness: 0.28 }),
    // Wound tape: fine rings, with a sheen that runs round the pack.
    pack: new THREE.MeshPhysicalMaterial({
      color: srgb(0.075, 0.052, 0.042), roughness: 1, roughnessMap: texture(pack.roughness),
      normalMap: texture(pack.normal), anisotropy: 0.7, anisotropyMap: texture(pack.anisotropy),
    }),
    shield: new THREE.MeshStandardMaterial({ color: srgb(0.7, 0.7, 0.7), roughness: 0.35, metalness: 1 }),
    spring: new THREE.MeshStandardMaterial({ color: srgb(0.74, 0.52, 0.26), roughness: 0.3, metalness: 1 }),
    felt: new THREE.MeshStandardMaterial({ color: srgb(0.72, 0.56, 0.34), roughness: 1 }),
    liner: new THREE.MeshStandardMaterial({ color: srgb(0.045, 0.045, 0.045), roughness: 0.55 }),
    window: new THREE.MeshPhysicalMaterial({
      ior: IOR.polystyrene, roughness: 0.03, transmission: 1, thickness: 0.001,
      attenuationColor: srgb(0.9, 0.9, 0.9), attenuationDistance: 0.001, side: THREE.DoubleSide,
    }),
    label: new THREE.MeshStandardMaterial({ map: sheet, roughness: 0.85 }),
    foil: new THREE.MeshStandardMaterial({ map: sheet, roughness: 0.35 }),
    // Ink on clear plastic: the sheet's own transparency decides where there is ink.
    print: new THREE.MeshBasicMaterial({ map: sheet, transparent: true, depthWrite: false }),
    // The case stays alpha-blended: transmission can't see the tape's own clear shell through it.
    casePlastic: see(new THREE.MeshPhysicalMaterial({ color: srgb(0.45, 0.5, 0.53), roughness: 0.08, ior: IOR.polystyrene, specularIntensity: 0.25 }), 0.13),
    // The thin rims of each wall are brighter, the way the edge of clear plastic catches light.
    caseRim: see(new THREE.MeshPhysicalMaterial({ color: srgb(0.86, 0.9, 0.92), roughness: 0.15, ior: IOR.polystyrene }), 0.45),
    card: new THREE.MeshStandardMaterial({ map: sheet, roughness: 0.6 }),
    cardInside: new THREE.MeshStandardMaterial({ color: srgb(...PAPER), roughness: 0.85 }),
    // Matte paper; the sheet's own transparency cuts the rounded corners and the window.
    sticker: new THREE.MeshStandardMaterial({
      map: sheet, alphaTest: 0.5, roughness: 0.75, normalMap: texture(stickerNormals(4)),
    }),
  };

  // ── State ─────────────────────────────────────────────────
  const state = {
    plastic: PLASTICS.find((p) => p.id === DEFAULTS.plastic)!,
    length: LENGTHS.find((l) => l.id === DEFAULTS.length)!,
    side: DEFAULTS.side,
    /** Physical tape position: 0 is the start of side A, 1 its end. */
    position: 0,
    playing: false,
    inCase: DEFAULTS.inCase,
    sticker: DEFAULTS.sticker,
  };
  const highlight = () => HIGHLIGHTS.find((h) => h.id === state.sticker) ?? null;

  // ── Models, loaded once each and kept ─────────────────────
  const draco = new DRACOLoader().setDecoderPath(MODELS + 'draco/');
  const gltf = new GLTFLoader().setDRACOLoader(draco);
  const tapes = new Map<ShellStyle, Promise<Tape>>();
  let caseModel: Promise<THREE.Group> | null = null;
  let tape: Tape | null = null;

  function loadTape(style: ShellStyle) {
    if (!tapes.has(style)) {
      tapes.set(style, gltf.loadAsync(`${MODELS}cassette-${style}.glb`).then(({ scene: model }) => {
        set(model, ['HubL', 'HubR'], fixed.hub);
        set(model, ['ClampL', 'ClampR', 'Rollers'], fixed.accent);
        set(model, ['PackL', 'PackR'], fixed.pack);
        set(model, ['TapeRun', 'TapeLeadL', 'TapeLeadR'], fixed.tape);
        set(model, ['Screws'], steel);
        set(model, ['Shield'], fixed.shield);
        set(model, ['PadSpring'], fixed.spring);
        set(model, ['Felt'], fixed.felt);
        set(model, ['LinerA', 'LinerB'], fixed.liner);
        set(model, ['Gauge'], gauge);
        set(model, ['LabelTopA', 'LabelTopB'], fixed.label);
        set(model, ['LabelBottomA', 'LabelBottomB'], fixed.foil);
        set(model, ['ShellA', 'ShellB'], shellMaterial(style), 1);
        set(model, ['WindowA', 'WindowB'], fixed.window, 1);
        set(model, ['PrintA', 'PrintB'], fixed.print, 2);
        set(model, ['StickerA', 'StickerB'], fixed.sticker);
        const part = (name: string) => {
          const found = model.getObjectByName(name);
          if (!found) throw new Error(`Playback model is missing ${name}`);
          return found;
        };
        return { model, part };
      }));
    }
    return tapes.get(style)!;
  }

  function loadCase() {
    caseModel ??= gltf.loadAsync(MODELS + 'case.glb').then(({ scene: model }) => {
      set(model, ['CaseLid', 'CaseBase'], fixed.casePlastic, 3);
      set(model, ['CaseLidEdges', 'CaseBaseEdges'], fixed.caseRim, 3);
      set(model, ['JCardFront', 'JCardSpine', 'JCardBack'], fixed.card);
      set(model, ['JCardInside'], fixed.cardInside);
      return model;
    });
    return caseModel;
  }

  // ── Looks and pose ────────────────────────────────────────
  const darkStage = () => {
    const c = renderer.getClearColor(new THREE.Color());
    return c.r + c.g + c.b < 0.6; // linear: true for the dark theme's stage
  };
  function applyPlastic(plastic: Plastic) {
    const clear = plastic.opacity < 1;
    const shell = shellMaterial(plastic.style);
    // Tinted plastic absorbs its colour through the wall: the deeper the tint, the more it takes.
    // Light crosses two walls, front and back, so each takes half.
    if (clear) shell.attenuationColor.copy(srgb(...plastic.rgb.map((c) => c ** (plastic.opacity / 2)) as [number, number, number]));
    else shell.color.copy(srgb(...plastic.rgb));
    // Gauge lines are printed ink: white or dark on the clear shell, gold on the solid one.
    const ink = printInk(plastic, darkStage());
    gauge.color.copy(clear ? srgb(ink, ink, ink) : srgb(0.86, 0.72, 0.36));
    applySticker();
    steel.color.copy(clear ? srgb(0.72, 0.72, 0.72) : srgb(0.16, 0.16, 0.16));
    redrawSheet();
  }

  /** With a sticker, it covers the shell's print and the solid shell's paper strips. */
  function applySticker() {
    const on = highlight();
    fixed.accent.color.copy(on ? new THREE.Color(on.hex) : srgb(...ORANGE));
    for (const t of [tapes.get('clear'), tapes.get('solid')]) t?.then(({ model }) => {
      for (const name of ['StickerA', 'StickerB']) model.getObjectByName(name)!.visible = !!on;
      for (const name of ['PrintA', 'PrintB', 'LabelTopA', 'LabelTopB', 'LabelBottomA', 'LabelBottomB']) {
        const part = model.getObjectByName(name);
        if (part) part.visible = !on;
      }
      invalidate();
    });
  }

  function redrawSheet() {
    drawSheet(sheetCanvas, state.plastic, state.length, SHEET_PX_PER_MM, darkStage(), highlight());
    sheet.needsUpdate = true;
  }

  function applyPose() {
    if (!tape) return;
    const pose = reelPose(state.length, state.position);
    tape.part('PackL').scale.set(pose.packL, pose.packL, 1);
    tape.part('PackR').scale.set(pose.packR, pose.packR, 1);
    tape.part('HubL').rotation.z = pose.hubL;
    tape.part('HubR').rotation.z = pose.hubR;
    for (const [name, lead] of [['TapeLeadL', pose.leadL], ['TapeLeadR', pose.leadR]] as const) {
      const part = tape.part(name);
      part.position.set(lead.x, lead.y, 0);
      part.rotation.z = lead.angle;
      part.scale.x = lead.length;
    }
  }

  // ── Framing ───────────────────────────────────────────────
  const objectWidth = { tape: 0.1004, case: 0.1004 };

  function fit() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const { fill: share, lift } = camera.aspect >= 1 ? FRAMING.wide : FRAMING.tall;
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const visibleW = (state.inCase ? objectWidth.case : objectWidth.tape) / share;
    const d = visibleW / (2 * tan * camera.aspect);
    const dy = -lift * 2 * d * tan;
    camera.position.copy(VIEW).multiplyScalar(d);
    camera.position.y += dy;
    camera.lookAt(0, dy, 0);
    camera.updateProjectionMatrix();
    invalidate();
  }

  // ── Motion ────────────────────────────────────────────────
  const view = { yaw: 0, pitch: 0 };
  let drag: { x: number; y: number; yaw: number; pitch: number; id: number } | null = null;
  let flip: { from: number; to: number; start: number } | null = null;
  let visible = true;
  let raf = 0;
  let tick = 0;
  let last = 0;

  function invalidate() {
    if (raf || tick) return;
    raf = requestAnimationFrame(frame);
  }

  function frame(now: number) {
    raf = 0;
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    let moving = false;

    if (state.playing) {
      const dir = state.side === 'a' ? 1 : -1;
      state.position = Math.min(Math.max(state.position + (dir * dt) / state.length.sideSeconds, 0), 1);
      if (state.position === (dir > 0 ? 1 : 0)) setPlaying(false);
      applyPose();
    }

    // Ease back to rest after a drag, to the nearest whole turn.
    if (!drag && (view.yaw || view.pitch)) {
      const restYaw = Math.round(view.yaw / (Math.PI * 2)) * Math.PI * 2;
      const k = reduce.matches ? 1 : 1 - Math.exp(-dt * SETTLE_RATE);
      view.yaw += (restYaw - view.yaw) * k;
      view.pitch -= view.pitch * k;
      if (Math.abs(view.yaw - restYaw) < 1e-3 && Math.abs(view.pitch) < 1e-3) view.yaw = view.pitch = 0;
      else moving = true;
    }
    turntable.rotation.set(view.pitch, view.yaw, 0);

    if (flip) {
      const t = reduce.matches ? 1 : Math.min((now - flip.start) / FLIP_MS, 1);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
      body.rotation.y = flip.from + (flip.to - flip.from) * eased;
      if (t === 1) flip = null;
      else moving = true;
    }

    renderer.render(scene, camera);

    if (!visible || document.hidden) {
      last = 0;
    } else if (moving || drag) {
      invalidate();
    } else if (state.playing) {
      // With reduced motion the reels step once a second instead of turning smoothly.
      if (reduce.matches) tick = window.setTimeout(() => { tick = 0; invalidate(); }, 1000);
      else invalidate();
    } else {
      last = 0;
    }
  }

  function setPlaying(playing: boolean) {
    state.playing = playing;
    controls.setPlaying(playing);
    invalidate();
  }

  // ── Input ─────────────────────────────────────────────────
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || drag) return;
    drag = { x: e.clientX, y: e.clientY, yaw: view.yaw, pitch: view.pitch, id: e.pointerId };
    canvas.setPointerCapture(e.pointerId);
    stage.classList.add('is-dragging');
    invalidate();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    view.yaw = drag.yaw + (e.clientX - drag.x) * 0.012;
    view.pitch = Math.min(Math.max(drag.pitch + (e.clientY - drag.y) * 0.008, -1.1), 1.1);
    invalidate();
  });
  const release = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    stage.classList.remove('is-dragging');
    invalidate();
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  const controls = buildControls(stage, {
    plastic: state.plastic.id, length: state.length.id, side: state.side, inCase: state.inCase, sticker: state.sticker,
  }, {
    sticker(id) {
      state.sticker = id;
      redrawSheet();
      applySticker();
      invalidate();
    },
    play() {
      // At the end of a side, Play starts that side again.
      const atEnd = state.position === (state.side === 'a' ? 1 : 0);
      if (!state.playing && atEnd) state.position = state.side === 'a' ? 0 : 1;
      setPlaying(!state.playing);
    },
    side(side: Side) {
      state.side = side;
      flip = { from: body.rotation.y, to: side === 'a' ? 0 : Math.PI, start: performance.now() };
      invalidate();
    },
    async plastic(id) {
      state.plastic = PLASTICS.find((p) => p.id === id)!;
      const next = await loadTape(state.plastic.style);
      if (next !== tape) showTape(next);
      applyPlastic(state.plastic);
      invalidate();
    },
    length(id) {
      state.length = LENGTHS.find((l) => l.id === id)!;
      redrawSheet();
      applyPose();
      invalidate();
    },
    async inCase(on) {
      state.inCase = on;
      controls.setSideEnabled(!on);
      if (on) {
        const model = await loadCase();
        if (!state.inCase) return;
        caseHolder.add(model);
        objectWidth.case = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).x;
      } else {
        caseHolder.clear();
      }
      fit();
    },
  });

  function showTape(next: Tape) {
    if (tape) body.remove(tape.model);
    tape = next;
    body.add(tape.model);
    applyPose();
  }

  // ── First frame ───────────────────────────────────────────
  await loadStickerFonts();
  try {
    showTape(await loadTape(state.plastic.style));
  } catch {
    stage.querySelectorAll('.tape__bar').forEach((bar) => bar.remove());
    renderer.dispose();
    return; // The still render stays.
  }
  applyPlastic(state.plastic);
  // Above the still, under the controls: the canvas fades in over the still.
  stage.insertBefore(canvas, stage.querySelector('.tape__bar'));
  fit();
  renderer.render(scene, camera);
  stage.classList.add('is-live');

  new ResizeObserver(fit).observe(stage);
  const restage = () => {
    renderer.setClearColor(stageColor(stage), 1);
    applyPlastic(state.plastic); // print ink follows the page behind clear plastic
    invalidate();
  };
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', restage);
  new MutationObserver(restage).observe(document.documentElement, { attributeFilter: ['data-theme'] });
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) invalidate();
  }).observe(stage);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) invalidate(); });
}
