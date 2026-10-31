/* The live tape's controls, laid over the stage: native radio groups in pill tracks,
   so keyboard and screen readers get the platform's own behaviour. */

import { HIGHLIGHTS, LABELS, LENGTHS, PLASTICS, type Side } from './content';

const ICON = {
  play: '<svg class="tape__icon-play" viewBox="0 0 20 20" aria-hidden="true"><path d="M6.5 4.9v10.2c0 .6.6.9 1.1.6l8-5.1c.5-.3.5-.9 0-1.2l-8-5.1c-.5-.3-1.1 0-1.1.6z" fill="currentColor"/></svg>',
  pause: '<svg class="tape__icon-pause" viewBox="0 0 20 20" aria-hidden="true"><rect x="5.5" y="4.5" width="3" height="11" rx="1" fill="currentColor"/><rect x="11.5" y="4.5" width="3" height="11" rx="1" fill="currentColor"/></svg>',
  tape: '<svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><rect x="2.75" y="5.25" width="14.5" height="9.5" rx="2"/><circle cx="7.25" cy="10" r="1.75"/><circle cx="12.75" cy="10" r="1.75"/></svg>',
  noSticker: '<svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><rect x="2.75" y="5.25" width="14.5" height="9.5" rx="1.5"/><path d="M4 16.5L16 3.5"/></svg>',
  inCase: '<svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><rect x="2.25" y="2.75" width="15.5" height="14.5" rx="2.5"/><path d="M5.25 2.75v14.5"/><circle cx="9" cy="10" r="1.6"/><circle cx="14" cy="10" r="1.6"/></svg>',
};

export interface ControlValues {
  plastic: string;
  length: string;
  side: Side;
  inCase: boolean;
  sticker: string;
}

export interface ControlHandlers {
  play(): void;
  side(side: Side): void;
  plastic(id: string): void;
  length(id: string): void;
  inCase(on: boolean): void;
  sticker(id: string): void;
}

interface Option {
  value: string;
  /** Visible text, or an SVG string for an icon. */
  content: string;
  /** Accessible name when the visible content isn't one. */
  name?: string;
  swatch?: { color: string; clear: boolean };
}

let uid = 0;

function group(key: string, legend: string, options: Option[], checked: string) {
  const name = `tape-${key}-${++uid}`;
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'tape__seg';
  const caption = document.createElement('legend');
  caption.textContent = legend;
  fieldset.append(caption);

  for (const option of options) {
    const label = document.createElement('label');
    label.className = 'tape__opt';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = option.value;
    input.dataset.group = key;
    input.checked = option.value === checked;
    if (option.name) input.setAttribute('aria-label', option.name);
    label.append(input);

    if (option.swatch) {
      const swatch = document.createElement('span');
      swatch.className = option.swatch.clear ? 'tape__swatch is-clear' : 'tape__swatch';
      swatch.style.setProperty('--swatch', option.swatch.color);
      label.append(swatch);
    } else if (option.content.startsWith('<svg')) {
      label.insertAdjacentHTML('beforeend', option.content);
    } else {
      const text = document.createElement('span');
      text.className = 'tape__text';
      text.textContent = option.content;
      label.append(text);
    }
    fieldset.append(label);
  }
  return fieldset;
}

export function buildControls(stage: HTMLElement, values: ControlValues, on: ControlHandlers) {
  const play = document.createElement('button');
  play.type = 'button';
  play.className = 'tape__play';
  play.setAttribute('aria-label', LABELS.play);
  play.setAttribute('aria-pressed', 'false');
  play.innerHTML = ICON.play + ICON.pause;
  play.addEventListener('click', () => on.play());

  const side = group('side', LABELS.side,
    (['a', 'b'] as Side[]).map((s) => ({ value: s, content: LABELS.sides[s] })), values.side);

  const plastic = group('plastic', LABELS.plastic, PLASTICS.map((p) => {
    const clear = p.opacity < 1;
    // See-through swatches show a touch more tint than the plastic itself, so they read at 16px.
    const alpha = clear ? Math.min(p.opacity + 0.15, 1) : 1;
    const [r, g, b] = p.rgb.map((c) => Math.round(c * 255));
    return { value: p.id, content: '', name: p.name, swatch: { color: `rgb(${r} ${g} ${b} / ${alpha})`, clear } };
  }), values.plastic);

  const length = group('length', LABELS.length,
    LENGTHS.map((l) => ({ value: l.id, content: l.label, name: l.name })), values.length);

  const inCase = group('case', LABELS.case, [
    { value: 'tape', content: ICON.tape, name: LABELS.tapeOnly },
    { value: 'case', content: ICON.inCase, name: LABELS.inCase },
  ], values.inCase ? 'case' : 'tape');

  const sticker = group('sticker', LABELS.sticker, [
    { value: 'none', content: ICON.noSticker, name: LABELS.noSticker },
    ...HIGHLIGHTS.map((h) => ({ value: h.id, content: '', name: h.name, swatch: { color: h.hex, clear: false } })),
  ], values.sticker);

  const top = document.createElement('div');
  top.className = 'tape__bar tape__bar--top';
  top.append(play, side);
  const bottom = document.createElement('div');
  bottom.className = 'tape__bar tape__bar--bottom';
  const looks = document.createElement('div');
  looks.className = 'tape__row';
  looks.append(plastic, length, inCase);
  const stickers = document.createElement('div');
  stickers.className = 'tape__row';
  stickers.append(sticker);
  bottom.append(looks, stickers);
  stage.append(top, bottom);

  stage.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    switch (input.dataset.group) {
      case 'side': on.side(input.value as Side); break;
      case 'plastic': on.plastic(input.value); break;
      case 'length': on.length(input.value); break;
      case 'case': on.inCase(input.value === 'case'); break;
      case 'sticker': on.sticker(input.value); break;
    }
  });

  return {
    setPlaying(playing: boolean) {
      play.setAttribute('aria-pressed', String(playing));
    },
    /** Flipping inside the case would turn the tape through it. */
    setSideEnabled(enabled: boolean) {
      side.disabled = !enabled;
    },
  };
}
