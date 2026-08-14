/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "engine-purity-no-react-next",
      comment:
        "src/engine and src/import are the deterministic core (CLAUDE.md rule 1) — they must " +
        "never depend on react, react-dom, or next, directly or transitively.",
      severity: "error",
      from: { path: "^src/(engine|import)" },
      to: { path: "node_modules/(react|react-dom|next|scheduler)($|/)" },
    },
    {
      name: "engine-purity-no-ui-code",
      comment:
        "src/engine and src/import must not import from src/app or src/components — that's the " +
        "DOM-adjacent, React-rendered half of the app. Data flows one way: ui -> engine, never back.",
      severity: "error",
      from: { path: "^src/(engine|import)" },
      to: { path: "^src/(app|components)" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
  },
};
