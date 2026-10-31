/* Tape physics for the live cassette, ported from the Playback app's Cassette.swift.
   Framework-free so scripts/check-playback-tape.mjs can test it under plain Node.

   Model frame (the exported glTF): X right, Y up, Z is thickness, side A faces +Z.
   All lengths in metres. */

import type { TapeLength } from './content.ts';

/** Tape speed, 1 7/8 inches a second. */
export const SPEED = 0.0476;
export const HUB_RADIUS = 0.0108;
const HUB = { x: 0.02125, y: 0.002 };
const ROLLER = { x: 0.0403, y: -0.0263 };
const ROLLER_RADIUS = 0.003;

export const metres = (length: TapeLength) => length.sideSeconds * SPEED;

/** Radius of a pack holding `m` metres of tape: r = sqrt(hub² + L·t / π). */
export const packRadius = (length: TapeLength, m: number) =>
  Math.sqrt(HUB_RADIUS * HUB_RADIUS + (m * length.thickness) / Math.PI);

/** A tape run from a guide roller to the edge of a pack. The mesh is a 1 m ribbon along X. */
export interface Lead {
  x: number;
  y: number;
  angle: number;
  length: number;
}

export interface ReelPose {
  packL: number;
  packR: number;
  /** Hub rotation in radians about +Z. Positive is anticlockwise seen from side A. */
  hubL: number;
  hubR: number;
  leadL: Lead;
  leadR: Lead;
}

/** Pose of everything that moves, for a physical position: 0 is the start of side A, 1 its end. */
export function reelPose(length: TapeLength, position: number): ReelPose {
  const total = metres(length);
  const rFull = packRadius(length, total);
  const rL = packRadius(length, (1 - position) * total);
  const rR = packRadius(length, position * total);

  // Keep a sliver of tape on an empty hub so the pack never vanishes.
  const packL = Math.max(rL, HUB_RADIUS + 0.0002);
  const packR = Math.max(rR, HUB_RADIUS + 0.0002);

  // Each layer of tape is one full turn. Both hubs turn anticlockwise seen from side A while side A plays.
  const turnsL = (rFull - rL) / length.thickness;
  const turnsR = (rR - HUB_RADIUS) / length.thickness;
  const twoPi = Math.PI * 2;

  return {
    packL,
    packR,
    hubL: (turnsL * twoPi) % twoPi,
    hubR: (turnsR * twoPi) % twoPi,
    leadL: lead(-1, packL),
    leadR: lead(1, packR),
  };
}

/** The outer tangent from the guide roller to the pack, on the outside of the cassette. */
function lead(sign: number, packRadius: number): Lead {
  const c1x = sign * ROLLER.x, c1y = ROLLER.y;
  const c2x = sign * HUB.x, c2y = HUB.y;
  const dx = c2x - c1x, dy = c2y - c1y;
  const dist = Math.hypot(dx, dy);
  const phi = Math.atan2(dy, dx);
  const off = Math.acos(Math.min(Math.max((ROLLER_RADIUS - packRadius) / dist, -1), 1));

  let nx = Math.cos(phi + off), ny = Math.sin(phi + off);
  if (nx < 0 !== sign < 0) {
    nx = Math.cos(phi - off);
    ny = Math.sin(phi - off);
  }

  const ax = c1x + nx * ROLLER_RADIUS, ay = c1y + ny * ROLLER_RADIUS;
  const vx = c2x + nx * packRadius - ax, vy = c2y + ny * packRadius - ay;
  return { x: ax, y: ay, angle: Math.atan2(vy, vx), length: Math.hypot(vx, vy) };
}

/** Seconds played on the side facing the viewer. Flip ten minutes into A and you're ten minutes from the end of B. */
export const playhead = (length: TapeLength, position: number, side: 'a' | 'b') =>
  (side === 'a' ? position : 1 - position) * length.sideSeconds;
