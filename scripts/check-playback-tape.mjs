// Self-check for the live tape's physics. Run: node scripts/check-playback-tape.mjs
// Expected values come from the exported glTF's rest pose (PackL full, PackR empty, the two leads).
import assert from 'node:assert/strict';
import { LENGTHS } from '../src/lib/playback/content.ts';
import { reelPose, packRadius, metres, playhead, HUB_RADIUS } from '../src/lib/playback/tape.ts';

const c90 = LENGTHS.find((l) => l.id === 'c90');
const near = (a, b, eps = 2e-4) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

// A full C90 pack matches the geometry sheet's pack_full_c90 (24.7 mm).
near(packRadius(c90, metres(c90)), 0.0247);

const start = reelPose(c90, 0);
near(start.packL, 0.0247);
near(start.packR, HUB_RADIUS + 0.0002, 1e-9);
near(start.leadL.x, -0.04329); near(start.leadL.y, -0.02659);
near(start.leadL.angle, 2 * Math.atan2(0.74054, 0.67201), 5e-3);
near(start.leadL.length, 0.02632);

// The packs swap ends, mirrored.
const end = reelPose(c90, 1);
near(end.packR, start.packL, 1e-9);
near(end.leadR.x, -start.leadL.x, 1e-9);

// Halfway, both packs hold the same tape.
const mid = reelPose(c90, 0.5);
near(mid.packL, mid.packR, 1e-9);

// Ten minutes into side A is ten minutes from the end of side B.
const p = 600 / c90.sideSeconds;
near(c90.sideSeconds - playhead(c90, p, 'b'), 600, 1e-6);

console.log('playback tape: ok');
