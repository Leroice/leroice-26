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

export const DEFAULTS = { plastic: 'smoke', length: 'c90', side: 'a' as Side, inCase: false };

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
};
