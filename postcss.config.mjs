// Compiles @custom-media names (defined in src/styles/global.css) back to
// real @media (max-width: …) rules at build time — Astro/Vite picks this up
// automatically for any CSS it processes. Output is plain CSS; browsers never
// see the custom-media syntax. Single source of truth for the site's three
// breakpoints instead of the same pixel values typed out in ~7 places.
import postcssCustomMedia from 'postcss-custom-media';

export default {
  plugins: [postcssCustomMedia()],
};
