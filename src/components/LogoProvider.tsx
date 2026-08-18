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
import { fetchActiveLogo } from "@/lib/logo-store";

type LogoContextValue = {
  logo: LogoInfo;
  isCustom: boolean;
  refresh: () => Promise<void>;
  setLogo: (logo: LogoInfo) => void;
};

const LogoContext = createContext<LogoContextValue>({
  logo: DEFAULT_LOGO,
  isCustom: false,
  refresh: async () => {},
  setLogo: () => {},
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

  const refresh = useCallback(async () => {
    const fromFirestore = await fetchActiveLogo();
    if (fromFirestore) {
      setActive(fromFirestore);
      return;
    }
    try {
      const response = await fetch("/api/logo", { cache: "no-store" });
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
  }, [refresh]);

  const setLogo = useCallback((logo: LogoInfo) => {
    setActive(logo);
  }, []);

  const isCustom = active.fileName !== "default";

  return (
    <LogoContext.Provider
      value={{ logo: active, isCustom, refresh, setLogo }}
    >
      {children}
    </LogoContext.Provider>
  );
}
