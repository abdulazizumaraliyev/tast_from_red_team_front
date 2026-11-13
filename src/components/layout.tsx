import { useState } from "react";

import { useAuth } from "../lib/auth";
import { initials } from "../lib/format";
import type { Page } from "../lib/navigation";
import { Icon, Logo } from "./ui";

const nav = [
  ["dashboard", "home", "Bosh sahifa"],
  ["research", "flask", "Tadqiqotlar"],
  ["records", "database", "Yozuvlar bazasi"],
  ["import", "upload", "Import"],
  ["quality", "quality", "Ma'lumotlar sifati"],
  ["settings", "settings", "Sozlamalar"],
] as const;

export function Sidebar({
  page,
  setPage,
  researchCount,
}: {
  page: Page;
  setPage: (p: Page) => void;
  researchCount: number | null;
}) {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      <Logo />
      <nav>
        <p className="nav-label">ASOSIY MENYU</p>
        {nav.map(([id, icon, label]) => (
          <button
            key={id}
            className={
              page === id || (page === "research-detail" && id === "research") ? "active" : ""
            }
            onClick={() => setPage(id)}
          >
            <Icon name={icon} />
            <span>{label}</span>
            {id === "research" && researchCount !== null && <em>{researchCount}</em>}
          </button>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="user-row">
          <div className="avatar">{initials(user?.full_name)}</div>
          <div>
            <strong>{user?.full_name ?? "Foydalanuvchi"}</strong>
            <small>{user?.email ?? "—"}</small>
          </div>
          <button onClick={() => setPage("settings")} aria-label="Sozlamalar">
            <Icon name="chevron" size={15} />
          </button>
        </div>
        <button className="logout" onClick={() => void logout()}>
          <Icon name="logout" /> Tizimdan chiqish
        </button>
      </div>
    </aside>
  );
}

const pageTitles: Record<Page, string> = {
  dashboard: "Bosh sahifa",
  research: "Tadqiqotlar",
  "research-detail": "Tadqiqot tafsilotlari",
  records: "Yozuvlar bazasi",
  import: "Import",
  quality: "Ma'lumotlar sifati",
  settings: "Sozlamalar",
};

export function Topbar({
  page,
  onSearch,
}: {
  page: Page;
  onSearch: (query: string) => void;
}) {
  const { user } = useAuth();
  const [value, setValue] = useState("");

  return (
    <header className="topbar">
      <div>
        <div className="breadcrumbs">
          <span>AutoInsight</span>
          <Icon name="chevron" size={13} />
          <b>{pageTitles[page]}</b>
        </div>
      </div>
      <div className="top-actions">
        <form
          className="global-search"
          onSubmit={(event) => {
            event.preventDefault();
            onSearch(value.trim());
          }}
        >
          <Icon name="search" />
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Yozuvlar matni yoki ID bo‘yicha qidirish..."
            aria-label="Global qidiruv"
          />
          <kbd>↵</kbd>
        </form>
        <div className="top-avatar">{initials(user?.full_name)}</div>
      </div>
    </header>
  );
}
