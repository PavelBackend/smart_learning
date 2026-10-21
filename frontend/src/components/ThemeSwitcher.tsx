import { Moon, Palette, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "purple";

const themes = [
  { id: "light", label: "Светлая тема", icon: Sun },
  { id: "dark", label: "Тёмная тема", icon: Moon },
  { id: "purple", label: "Фиолетовая тема", icon: Palette },
] as const;

function currentTheme(): Theme {
  const value = document.documentElement.dataset.theme;
  return value === "dark" || value === "purple" ? value : "light";
}

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("wordwell-theme", theme);
    } catch {
      // The selected theme still works for this session when storage is blocked.
    }
  }, [theme]);

  return (
    <div className="theme-switcher" role="group" aria-label="Тема оформления">
      {themes.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={theme === id ? "selected" : ""}
          onClick={() => setTheme(id)}
          aria-label={label}
          aria-pressed={theme === id}
          title={label}
        >
          <Icon size={16} strokeWidth={2} />
        </button>
      ))}
    </div>
  );
}
