"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";

export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "medispark-theme";

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyTheme(next: Theme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", next);
  root.setAttribute("data-theme-transition", "true");
  window.setTimeout(() => root.removeAttribute("data-theme-transition"), 350);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored =
      document.documentElement.dataset.theme === "light" ? "light" : "dark";
    // Sync React state with the theme already applied by the inline
    // <head> script. Initial state intentionally stays "dark" so the
    // server-rendered HTML hydrates without a mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(stored);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((previous) => {
      const next: Theme = previous === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // Storage unavailable — theme still applies for this session.
      }
      applyTheme(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
