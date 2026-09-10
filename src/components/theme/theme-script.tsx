/**
 * Inlined before hydration so the correct theme paints on the first frame
 * (no flash of the wrong palette). Reads localStorage; falls back to the
 * OS preference the CSS media query already handles.
 */
const THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("kesi-theme");
    if (stored === "light" || stored === "dark") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
}
