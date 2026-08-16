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

  const refresh = useCallback(async () => {
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

  const isCustom = active.fileName !== "default";

  return (
    <LogoContext.Provider value={{ logo: active, isCustom, refresh }}>
      {children}
    </LogoContext.Provider>
  );
}