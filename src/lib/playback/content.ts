/* Copy and data for the live tape on the Playback case study.
   Plastics and lengths are the Playback app's own values
   (~/Developer/Playback/Playback/CassetteMaterials.swift and Cassette.swift). */

export type ShellStyle = 'clear' | 'solid';
export type Side = 'a' | 'b';

export interface Plastic {
  id: string;
  name: string;
  style: ShellStyle;
  /** sRGB, 0 to 1. */
  rgb: [number, number, number];
  /** 1 is solid. Below 1 is tinted see-through plastic. */
  opacity: number;
}

export const PLASTICS: Plastic[] = [
  { id: 'smoke', name: 'Smoke', style: 'clear', rgb: [0.16, 0.17, 0.19], opacity: 0.45 },
  { id: 'ice', name: 'Ice', style: 'clear', rgb: [0.42, 0.47, 0.5], opacity: 0.14 },
  { id: 'cobalt', name: 'Cobalt', style: 'clear', rgb: [0.16, 0.2, 0.75], opacity: 0.5 },
  { id: 'black', name: 'Black', style: 'solid', rgb: [0.035, 0.035, 0.04], opacity: 1 },
  { id: 'slate', name: 'Slate', style: 'solid', rgb: [0.2, 0.23, 0.26], opacity: 1 },
  { id: 'bone', name: 'Bone', style: 'solid', rgb: [0.8, 0.78, 0.72], opacity: 1 },
];

export interface TapeLength {
  id: string;
  /** The number on the control and the shell print. */
  label: string;
  /** Full name, read out by screen readers and printed on the card. */
  name: string;
  sideSeconds: number;
  /** Tape thickness in metres. Longer tapes use thinner stock. */
  thickness: number;
}

export const LENGTHS: TapeLength[] = [
  { id: 'c46', label: '46', name: 'C46', sideSeconds: 23 * 60, thickness: 18e-6 },
  { id: 'c60', label: '60', name: 'C60', sideSeconds: 30 * 60, thickness: 18e-6 },
  { id: 'c90', label: '90', name: 'C90', sideSeconds: 45 * 60, thickness: 12e-6 },
  { id: 'c120', label: '120', name: 'C120', sideSeconds: 60 * 60, thickness: 9e-6 },
];

export interface Highlight {
  id: string;
  name: string;
  hex: string;
}

/** The sticker's highlight colours. The clamps and rollers follow the one picked. */
export const HIGHLIGHTS: Highlight[] = [
  { id: 'orange', name: 'Orange', hex: '#F75C00' },
  { id: 'red', name: 'Red', hex: '#D62B2B' },
  { id: 'blue', name: 'Blue', hex: '#2453B8' },
  { id: 'yellow', name: 'Yellow', hex: '#F2B600' },
];

/** `sticker` is a highlight id, or 'none' for a bare tape. */
export const DEFAULTS = { plastic: 'smoke', length: 'c90', side: 'a' as Side, inCase: false, sticker: 'orange' };

/** The full-face sticker, laid out in its Figma frame's own units (PlayBack --- Walkman --- V1,
    node 3090:16, 489.5 x 214.5). On the tape it is 88 x 38.6 mm. Positions are the top-left of
    each element; text sizes are in the same units. */
export const STICKER = {
  w: 489.5,
  h: 214.5,
  radius: 7,
  paper: '#E5E1D5',
  ink: '#000000',
  /** Centred; the Figma frame has it 1.5 units left of centre. */
  window: { x: 48.5, y: 84, w: 392.5, h: 89, radius: 4 },
  index: { text: 'INDEX', x: 9.5, y: 10.875, size: 8.2, opacity: 0.6 },
  rules: { y: [25, 50.5], width: 0.2, opacity: 0.35 },
  band: { y: 76.5, h: 101 },
  /** The side letter, in the band left of the window, knocked out to the paper. */
  side: { x: 24.25, y: 127, size: 32 },
  type: { text: 'TYPE I (NORMAL) POSITION', x: 48.5, y: 200.875, size: 8.2 },
  arrow: { x: 220.875, y: 181.125, path: 'M37.125 13.875L23.25 27.75V20.875H0V6.875H23.25V0L37.125 13.875Z' },
  /** PLB and the length share a baseline, as in the Figma frame. */
  brand: { text: 'PLB', x: 338.25, baseline: 205.5, size: 31.783 },
  number: { size: 30.548, tracking: -1.8329 },
};

/** Printed on the tape and its card. */
export const PRINT = {
  title: 'Mix Tape',
  subtitle: 'Playback mix',
  brand: 'PLAYBACK',
  cardBand: 'PLAYBACK MIX CASSETTE',
  type: 'Type I   Normal Position',
  typeCaps: 'NORMAL POSITION   TYPE I',
  cardBack: 'Made by hand. Play it through.',
};

export const LABELS = {
  stage: 'Playback cassette, live 3D view',
  play: 'Play',
  side: 'Side',
  sides: { a: 'A', b: 'B' } as Record<Side, string>,
  plastic: 'Plastic',
  length: 'Length',
  case: 'Case',
  tapeOnly: 'Tape on its own',
  inCase: 'In its case',
  sticker: 'Sticker',
  noSticker: 'No sticker',
};
