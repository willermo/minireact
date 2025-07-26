import { createElement, createContext, useState, useEffect } from "@minireact";
import type { VNode } from "@minireact";

type ThemeContextType = {
  isDark: boolean;
  toggleTheme: () => void;
};

export const ThemeContext = createContext<ThemeContextType>({
  isDark: true,
  toggleTheme: () => {},
});

interface ThemeProviderProps {
  children: VNode | VNode[];
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const savedTheme = localStorage.getItem('theme');
  const [isDark, setIsDark] = useState<boolean>(savedTheme === 'light' ? false : true);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return createElement(
    ThemeContext.Provider,
    { value: { isDark, toggleTheme: () => setIsDark(!isDark) } },
    children
  );
}