/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "engine-purity-no-react-next",
      comment:
        "src/engine, src/import, and src/export are the deterministic core (CLAUDE.md rule 1) — " +
        "they must never depend on react, react-dom, or next, directly or transitively. The " +
        "export renderer in particular must run with no DOM/browser APIs (PLAN.md §6.4).",
      severity: "error",
      from: { path: "^src/(engine|import|export)" },
      to: { path: "node_modules/(react|react-dom|next|scheduler)($|/)" },
    },
    {
      name: "engine-purity-no-ui-code",
      comment:
        "src/engine, src/import, and src/export must not import from src/app or src/components — " +
        "that's the DOM-adjacent, React-rendered half of the app. Data flows one way: " +
        "ui -> engine/export, never back.",
      severity: "error",
      from: { path: "^src/(engine|import|export)" },
      to: { path: "^src/(app|components)" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
  },
};
