import { createElement, useContext } from "@minireact";
import { ThemeContext } from "../../contexts/ThemeContext";
import { Icon } from "./Icon";

export function ThemeToggle() {
  const { isDark, toggleTheme } = useContext(ThemeContext);
  
  return (
    <button style={{cursor: "pointer"}}
      onClick={toggleTheme} 
      className="p-2 rounded-md"
      aria-label="Toggle theme"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Icon name="sun" size={20} color="var(--color-text-primary)" />
      ) : (
        <Icon name="moon" size={20} color="var(--color-text-primary)" />
      )}
    </button>
  );
}