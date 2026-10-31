/* Loads the live tape (three.js and the models) only when a [data-playback-tape] figure
   comes near the viewport. Until then, and without WebGL, the figure's still render shows. */

export function initPlaybackTape(root: ParentNode = document) {
  const stages = root.querySelectorAll<HTMLElement>('[data-playback-tape]');
  if (!stages.length || !('IntersectionObserver' in window)) return;

  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      io.unobserve(entry.target);
      import('./stage')
        .then(({ mountTape }) => mountTape(entry.target as HTMLElement))
        .catch(() => {}); // A failed load leaves the still render in place.
    }
  }, { rootMargin: '400px 0px' });

  stages.forEach((stage) => io.observe(stage));
}
