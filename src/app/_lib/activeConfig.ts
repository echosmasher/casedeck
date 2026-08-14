// The org config this build is bundled for. Each deployment is built for one organization's
// config (produced by the /setup skill or, here, Phase 1's demo config) — there is no runtime
// config-selection mechanism, since v1 ships no backend to fetch one from (PLAN.md §3, §7
// DEPLOYMENT.md tier 2). Phase 6 formalizes "demo mode" (role switcher, reset) on top of this
// same bundled-config mechanism; until then this is a direct import.
import type { GroupConfig } from "@/engine/model";
import exampleGroupConfig from "../../../demo/example-group.config.json";

export const activeConfig = exampleGroupConfig as GroupConfig;
