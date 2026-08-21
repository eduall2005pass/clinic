"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";

export type AdminTheme = "light" | "dark";

export const ADMIN_THEME_STORAGE_KEY = "medispark-admin-theme";

type AdminThemeContextValue = {
  theme: AdminTheme;
  toggleTheme: () => void;
};

const AdminThemeContext = createContext<AdminThemeContextValue>({
  theme: "light",
  toggleTheme: () => {},
});

export function useAdminTheme() {
  return useContext(AdminThemeContext);
}

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<AdminTheme>("light");

  useEffect(() => {
    // localStorage is only available after mount (SSR-safe restore)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(() => {
      try {
        const stored = window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY);
        if (stored === "dark" || stored === "light") return stored;
      } catch {}
      return "light";
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: AdminTheme = prev === "light" ? "dark" : "light";
      try {
        window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, next);
      } catch {}
      return next;
    });
  }, []);

  return (
    <AdminThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </AdminThemeContext.Provider>
  );
}
