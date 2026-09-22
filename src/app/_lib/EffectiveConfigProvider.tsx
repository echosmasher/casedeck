"use client";

// Loads Settings-page overrides from storage once and merges them over the bundled activeConfig,
// so every consumer that needs a live (rate card / loaded-cost multiplier / confidence bands)
// value reads the same effective GroupConfig — see effectiveConfig.ts and UI-QA-PLAN.md Phase C.
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { GroupConfig } from "@/engine/model";
import { activeConfig } from "./activeConfig";
import { buildEffectiveConfig } from "./effectiveConfig";
import { getStorage } from "./storage";

interface EffectiveConfigContextValue {
  config: GroupConfig;
  loading: boolean;
  refresh: () => Promise<void>;
}

const EffectiveConfigContext = createContext<EffectiveConfigContextValue>({
  config: activeConfig,
  loading: true,
  refresh: async () => {},
});

export function EffectiveConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<GroupConfig>(activeConfig);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const overrides = await getStorage().getSettingsOverrides();
    setConfig(buildEffectiveConfig(activeConfig, overrides));
    setLoading(false);
  }, []);

  useEffect(() => {
    let ignore = false;
    void getStorage()
      .getSettingsOverrides()
      .then((overrides) => {
        if (ignore) return;
        setConfig(buildEffectiveConfig(activeConfig, overrides));
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <EffectiveConfigContext.Provider value={{ config, loading, refresh }}>
      {children}
    </EffectiveConfigContext.Provider>
  );
}

export function useEffectiveConfig() {
  return useContext(EffectiveConfigContext);
}
