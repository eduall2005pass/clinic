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

type LogoContextValue = {
  logo: LogoInfo;
  isCustom: boolean;
  refresh: () => Promise<void>;
};

const LogoContext = createContext<LogoContextValue>({
  logo: DEFAULT_LOGO,
  isCustom: false,
  refresh: async () => {},
});

export function useLogo() {
  return useContext(LogoContext);
}

export function LogoProvider({
  children,
  initialLogo,
}: {
  children: ReactNode;
  initialLogo: LogoInfo | null;
}) {
  const [active, setActive] = useState<LogoInfo>(initialLogo ?? DEFAULT_LOGO);

  // Keep SSR initialLogo in sync if server renders a newer logo on navigation/refresh
  useEffect(() => {
    if (initialLogo) setActive(initialLogo);
  }, [initialLogo]);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/logo?v=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
        next: { revalidate: 0 } as never,
      });
      if (!response.ok) return;
      const data = (await response.json()) as { logo: LogoInfo | null };
      setActive(data.logo ?? DEFAULT_LOGO);
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
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  const isCustom = active.fileName !== "default";

  return (
    <LogoContext.Provider value={{ logo: active, isCustom, refresh }}>
      {children}
    </LogoContext.Provider>
  );
}
