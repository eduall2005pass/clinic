"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { WebsiteSettings } from "@/lib/website-settings-constants";
import { DEFAULT_WEBSITE_SETTINGS } from "@/lib/website-settings-constants";

type CtxValue = {
  settings: WebsiteSettings;
  refresh: () => Promise<void>;
};

const WebsiteSettingsContext = createContext<CtxValue>({
  settings: DEFAULT_WEBSITE_SETTINGS,
  refresh: async () => {},
});

export function useWebsiteSettings() {
  return useContext(WebsiteSettingsContext);
}

export function WebsiteSettingsProvider({
  children,
  initialSettings,
}: {
  children: ReactNode;
  initialSettings: WebsiteSettings | null;
}) {
  const [settings, setSettings] = useState<WebsiteSettings>(
    initialSettings ?? DEFAULT_WEBSITE_SETTINGS,
  );

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/website-settings", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { settings: WebsiteSettings | null };
      if (data.settings) setSettings(data.settings);
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    // Keep in sync after initial SSR render, same pattern as LogoProvider
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  return (
    <WebsiteSettingsContext.Provider value={{ settings, refresh }}>
      {children}
    </WebsiteSettingsContext.Provider>
  );
}
