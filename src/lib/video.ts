/* ───────────────────────────────────────────────────────────
   Case-study video — lazy, in-view playback.

   Live footage is heavy (2-4MB for ~10s, vs a few hundred KB for a
   screen recording), so nothing is fetched until it's nearly on screen.
   Markup carries no `src` and no `autoplay`: the source lives in
   data-src and this attaches it on approach. A page with five clips
   therefore costs one poster image each until you scroll.

   Poster frames are authored per clip (a `poster` attribute), so the
   frame is filled from first paint rather than showing a black box.
   Export one still per clip alongside the video — ffmpeg isn't installed
   here, so there's no build step doing it automatically:
     ffmpeg -i clip.mp4 -vf "select=eq(n\,0)" -q:v 3 clip-poster.jpg
   ─────────────────────────────────────────────────────────── */

const reduced = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Start fetching this far out, so it's ready by the time it's in view. */
const PRELOAD_MARGIN = '200% 0px';
/** Play/pause boundary — tighter than the preload margin. */
const PLAY_MARGIN = '0px 0px -10% 0px';

export function initVideos(root: ParentNode = document): () => void {
  const vids = Array.from(
    root.querySelectorAll<HTMLVideoElement>('video[data-src]')
  );
  if (!vids.length) return () => {};

  // Reduced motion: never attach a source at all. The poster stays, which
  // is a still of the same content — the page reads the same, it just
  // doesn't move, and nothing heavy is downloaded.
  if (reduced() || typeof IntersectionObserver === 'undefined') {
    return () => {};
  }

  const attach = (v: HTMLVideoElement) => {
    if (v.dataset.attached) return;
    v.dataset.attached = '1';
    v.src = v.dataset.src!;
    v.load();
  };

  const loader = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        attach(e.target as HTMLVideoElement);
        loader.unobserve(e.target);
      }
    },
    { rootMargin: PRELOAD_MARGIN }
  );

  const player = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const v = e.target as HTMLVideoElement;
        if (e.isIntersecting) {
          attach(v); // a fast scroll can outrun the loader
          // play() rejects if the browser blocks it (a non-muted clip, a
          // power-saving mode). Swallow it — the poster is still there,
          // so a blocked clip degrades to a still rather than an error.
          v.play().catch(() => {});
        } else if (!v.paused) {
          // Pausing off-screen clips matters more than it looks: several
          // portrait videos decoding at once on a phone is what turns a
          // case study into a stutter.
          v.pause();
        }
      }
    },
    { rootMargin: PLAY_MARGIN, threshold: 0.25 }
  );

  for (const v of vids) {
    loader.observe(v);
    player.observe(v);
  }

  // Immediate pass. An observer's first callback is asynchronous and, on a
  // page restored mid-scroll or in a throttled tab, can be late enough to
  // be noticed — a clip already on screen would sit as a still until
  // something else moved. Doing the same check synchronously costs one
  // layout read and makes the in-view case correct from the start.
  const sweep = () => {
    for (const v of vids) {
      const r = v.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) continue;
      attach(v);
      v.play().catch(() => {});
    }
  };
  sweep();
  // The markup can still be settling on first load (fonts, images
  // resizing the page under it), so re-check once everything has landed.
  if (document.readyState !== 'complete') {
    window.addEventListener('load', sweep, { once: true });
  }

  // A backgrounded tab keeps decoding otherwise.
  const onVisibility = () => {
    if (!document.hidden) return;
    for (const v of vids) if (!v.paused) v.pause();
  };
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    loader.disconnect();
    player.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
