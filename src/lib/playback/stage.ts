/* The live tape on the Playback case study: the app's measured cassette in three.js.
   Loaded on demand by loader.ts. Materials follow CassetteLook in the Playback app
   (CassetteMaterials.swift); the moving parts follow tape.ts.

   Renders only when something changes: a drag, the ease back to rest, a flip, or play. */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { DEFAULTS, LABELS, LENGTHS, PLASTICS, type Plastic, type ShellStyle, type Side } from './content';
import { reelPose } from './tape';
import { drawSheet, printInk } from './sheet';
import { buildControls } from './controls';

const MODELS = '/models/playback/';
const FOV = 30;
/** The app's camera angle: a little right of and above the tape. */
const VIEW = new THREE.Vector3(0.06, 0.04, 0.46).normalize();
/** Share of the stage's width the object fills, and how far above centre it sits (share of height). */
const FRAMING = { wide: { fill: 0.54, lift: 0.02 }, tall: { fill: 0.84, lift: 0.06 } };
const FLIP_MS = 600;
/** Exponential ease back to rest after a drag, per second. */
const SETTLE_RATE = 8;
/** The tape stands 1.4 mm low in the case's pocket and 0.6 mm toward the card (build_case.py). */
const CASE_OFFSET = new THREE.Vector3(0, 0.0014, -0.0006);
/** Texture resolution of the print sheet. The app uses 10; the web tape is smaller on screen. */
const SHEET_PX_PER_MM = 6;
const PAPER = [0.93, 0.91, 0.85] as const;

const srgb = (r: number, g: number, b: number) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);

function see(material: THREE.Material, opacity: number) {
  material.transparent = true;
  material.opacity = opacity;
  material.depthWrite = false;
  material.side = THREE.DoubleSide;
  return material;
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
  renderer.toneMapping = THREE.NeutralToneMapping;
  const canvas = renderer.domElement;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', LABELS.stage);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.9;
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
  const shell = new THREE.MeshPhysicalMaterial();
  const gauge = new THREE.MeshBasicMaterial();
  const steel = new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 1 });
  const fixed = {
    hub: new THREE.MeshPhysicalMaterial({ color: srgb(0.9, 0.9, 0.87), roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.04 }),
    tape: new THREE.MeshStandardMaterial({ color: srgb(0.075, 0.052, 0.042), roughness: 0.28 }),
    shield: new THREE.MeshStandardMaterial({ color: srgb(0.7, 0.7, 0.7), roughness: 0.35, metalness: 1 }),
    spring: new THREE.MeshStandardMaterial({ color: srgb(0.74, 0.52, 0.26), roughness: 0.3, metalness: 1 }),
    felt: new THREE.MeshStandardMaterial({ color: srgb(0.72, 0.56, 0.34), roughness: 1 }),
    liner: new THREE.MeshStandardMaterial({ color: srgb(0.045, 0.045, 0.045), roughness: 0.55 }),
    window: see(new THREE.MeshPhysicalMaterial({ color: srgb(0.55, 0.55, 0.55), roughness: 0.03, clearcoat: 1 }), 0.12),
    label: new THREE.MeshStandardMaterial({ map: sheet, roughness: 0.85 }),
    foil: new THREE.MeshStandardMaterial({ map: sheet, roughness: 0.35 }),
    // Ink on clear plastic: the sheet's own transparency decides where there is ink.
    print: new THREE.MeshBasicMaterial({ map: sheet, transparent: true, depthWrite: false }),
    casePlastic: see(new THREE.MeshPhysicalMaterial({ color: srgb(0.45, 0.5, 0.53), roughness: 0.08, specularIntensity: 0.25 }), 0.13),
    // The thin rims of each wall are brighter, the way the edge of clear plastic catches light.
    caseRim: see(new THREE.MeshPhysicalMaterial({ color: srgb(0.86, 0.9, 0.92), roughness: 0.15 }), 0.45),
    card: new THREE.MeshStandardMaterial({ map: sheet, roughness: 0.6 }),
    cardInside: new THREE.MeshStandardMaterial({ color: srgb(...PAPER), roughness: 0.85 }),
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
  };

  // ── Models, loaded once each and kept ─────────────────────
  const draco = new DRACOLoader().setDecoderPath(MODELS + 'draco/');
  const gltf = new GLTFLoader().setDRACOLoader(draco);
  const tapes = new Map<ShellStyle, Promise<Tape>>();
  let caseModel: Promise<THREE.Group> | null = null;
  let tape: Tape | null = null;

  function loadTape(style: ShellStyle) {
    if (!tapes.has(style)) {
      tapes.set(style, gltf.loadAsync(`${MODELS}cassette-${style}.glb`).then(({ scene: model }) => {
        set(model, ['HubL', 'HubR', 'Rollers'], fixed.hub);
        set(model, ['PackL', 'PackR', 'TapeRun', 'TapeLeadL', 'TapeLeadR'], fixed.tape);
        set(model, ['Screws'], steel);
        set(model, ['Shield'], fixed.shield);
        set(model, ['PadSpring'], fixed.spring);
        set(model, ['Felt'], fixed.felt);
        set(model, ['LinerA', 'LinerB'], fixed.liner);
        set(model, ['Gauge'], gauge);
        set(model, ['LabelTopA', 'LabelTopB'], fixed.label);
        set(model, ['LabelBottomA', 'LabelBottomB'], fixed.foil);
        set(model, ['ShellA', 'ShellB'], shell, 1);
        set(model, ['WindowA', 'WindowB'], fixed.window, 1);
        set(model, ['PrintA', 'PrintB'], fixed.print, 2);
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
  function applyPlastic(plastic: Plastic) {
    const clear = plastic.opacity < 1;
    shell.color.copy(srgb(...plastic.rgb));
    shell.roughness = clear ? 0.12 : 0.4;
    // Keep reflections low on see-through plastic, or they fog the whole face.
    shell.specularIntensity = clear ? 0.2 : 1;
    shell.transparent = clear;
    shell.opacity = plastic.opacity;
    shell.depthWrite = !clear;
    shell.side = clear ? THREE.DoubleSide : THREE.FrontSide;
    shell.needsUpdate = true;
    // Gauge lines are printed ink: white or dark on the clear shell, gold on the solid one.
    const ink = printInk(plastic);
    gauge.color.copy(clear ? srgb(ink, ink, ink) : srgb(0.86, 0.72, 0.36));
    steel.color.copy(clear ? srgb(0.72, 0.72, 0.72) : srgb(0.16, 0.16, 0.16));
    redrawSheet();
  }

  function redrawSheet() {
    drawSheet(sheetCanvas, state.plastic, state.length, SHEET_PX_PER_MM);
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
    plastic: state.plastic.id, length: state.length.id, side: state.side, inCase: state.inCase,
  }, {
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
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) invalidate();
  }).observe(stage);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) invalidate(); });
}
