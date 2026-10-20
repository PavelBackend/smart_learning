import {
  ArrowUpRight,
  BookOpen,
  ChartNoAxesCombined,
  CircleHelp,
  CloudUpload,
  GraduationCap,
  LayoutDashboard,
  Menu,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";

const navigation = [
  { to: "/", label: "Обзор", icon: LayoutDashboard },
  { to: "/dictionary", label: "Мой словарь", icon: BookOpen },
  { to: "/practice", label: "Практика", icon: GraduationCap },
  { to: "/import", label: "Импорт слов", icon: CloudUpload },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const title =
    navigation.find((item) => item.to === location.pathname)?.label ??
    "Wordwell";

  return (
    <div className="app-shell">
      <button
        className="mobile-menu"
        onClick={() => setOpen(!open)}
        aria-label="Открыть меню"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>
      {open && (
        <div className="mobile-overlay" onClick={() => setOpen(false)} />
      )}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <NavLink to="/" className="brand" onClick={() => setOpen(false)}>
          <div className="brand-mark">
            <span>w</span>
            <i />
          </div>
          <div>
            <strong>
              wordwell<span>.</span>
            </strong>
            <small>your space to grow</small>
          </div>
        </NavLink>

        <div className="sidebar-section-title">РАБОЧЕЕ ПРОСТРАНСТВО</div>
        <nav className="nav-list">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <Icon size={19} strokeWidth={1.9} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <div className="tip-icon">
              <ChartNoAxesCombined size={19} />
            </div>
            <strong>Слова остаются с тобой</strong>
            <p>
              Повторяй понемногу каждый день, и они станут частью твоей речи.
            </p>
            <NavLink to="/practice">
              Начать тренировку <ArrowUpRight size={15} />
            </NavLink>
          </div>
          <div className="sidebar-help">
            <CircleHelp size={17} />
            <span>Локальная версия · v0.1</span>
          </div>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Моё пространство</span>
            <span className="slash">/</span>
            <strong>{title}</strong>
          </div>
          <div className="topbar-right">
            <span className="status-dot" /> Локально на вашем ноутбуке{" "}
            <div className="avatar">P</div>
          </div>
        </header>
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}
