import { create } from "zustand";

const STORAGE_KEY = "connecto-theme";

export const useThemeStore = create((set) => ({
  theme: localStorage.getItem(STORAGE_KEY) || "default",

  setTheme: (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
    set({ theme });
  },

  initTheme: () => {
    const theme = localStorage.getItem(STORAGE_KEY) || "default";
    document.documentElement.setAttribute("data-theme", theme);
    set({ theme });
  },
}));
