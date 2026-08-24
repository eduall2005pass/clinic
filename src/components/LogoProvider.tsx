"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { LogoInfo } from "@/lib/logo";
import { DEFAULT_LOGO } from "@/lib/logo";

export type ThemeLogos = {
  light: LogoInfo | null;
  dark: LogoInfo | null;
};

type LogoContextValue = {
  /** Shared/fallback logo — shown when no theme-specific variant is set. */
  logo: LogoInfo;
  /** LIGHT MODE logo uploaded by the admin (null = not set). */
  light: LogoInfo | null;
  /** DARK MODE logo uploaded by the admin (null = not set). */
  dark: LogoInfo | null;
  isCustom: boolean;
  refresh: () => Promise<void>;
};

const LogoContext = createContext<LogoContextValue>({
  logo: DEFAULT_LOGO,
  light: null,
  dark: null,
  isCustom: false,
  refresh: async () => {},
});

export function useLogo() {
  return useContext(LogoContext);
}

export function LogoProvider({
  children,
  initialLogo,
  initialThemeLogos,
}: {
  children: ReactNode;
  initialLogo: LogoInfo | null;
  initialThemeLogos?: ThemeLogos;
}) {
  const [active, setActive] = useState<LogoInfo>(initialLogo ?? DEFAULT_LOGO);
  const [light, setLight] = useState<LogoInfo | null>(
    initialThemeLogos?.light ?? null,
  );
  const [dark, setDark] = useState<LogoInfo | null>(
    initialThemeLogos?.dark ?? null,
  );

  // Keep SSR initial values in sync if server renders newer data on navigation/refresh
  useEffect(() => {
    if (!initialLogo) return;
    queueMicrotask(() => {
      setActive(initialLogo);
    });
  }, [initialLogo]);

  useEffect(() => {
    if (!initialThemeLogos) return;
    queueMicrotask(() => {
      setLight(initialThemeLogos.light);
      setDark(initialThemeLogos.dark);
    });
  }, [initialThemeLogos]);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/logo?v=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
        next: { revalidate: 0 } as never,
      });
      if (!response.ok) return;
      const data = (await response.json()) as {
        logo: LogoInfo | null;
        light?: LogoInfo | null;
        dark?: LogoInfo | null;
      };
      setActive(data.logo ?? DEFAULT_LOGO);
      setLight(data.light ?? null);
      setDark(data.dark ?? null);
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    // Re-fetch when tab becomes visible so live site picks up admin changes
    const onFocus = () => refresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  const isCustom =
    active.fileName !== "default" || light !== null || dark !== null;

  return (
    <LogoContext.Provider
      value={{ logo: active, light, dark, isCustom, refresh }}
    >
      {children}
    </LogoContext.Provider>
  );
}
