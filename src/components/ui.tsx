import type { ReactNode } from "react";

export const Icon = ({ name, size = 18 }: { name: string; size?: number }) => {
  const paths: Record<string, ReactNode> = {
    home: (
      <>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v11h14V9" />
        <path d="M9 20v-6h6v6" />
      </>
    ),
    flask: (
      <>
        <path d="M9 3h6" />
        <path d="M10 3v6l-5 8.5A2.3 2.3 0 0 0 7 21h10a2.3 2.3 0 0 0 2-3.5L14 9V3" />
        <path d="M7.5 16h9" />
      </>
    ),
    database: (
      <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
        <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
      </>
    ),
    quality: (
      <>
        <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
      </>
    ),
    message: (
      <>
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
      </>
    ),
    bot: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="3" />
        <path d="M12 3v4M8 12h.01M16 12h.01M8 16h8" />
      </>
    ),
    key: (
      <>
        <circle cx="8" cy="15" r="4" />
        <path d="m11 12 8-8M15 8l2 2M17 6l2 2" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m14 7 5 5-5 5" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    filter: <path d="M4 5h16l-6 7v5l-4 2v-7Z" />,
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    alert: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 17h.01" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6M12 7h.01" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4m0 0-4 4m4-4 4 4" />
        <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
        <path d="M4 19h16" />
      </>
    ),
  };
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
};

export const Logo = ({ dark = false }: { dark?: boolean }) => (
  <div className={`logo ${dark ? "logo-dark" : ""}`}>
    <div className="logo-mark">
      <span></span>
      <span></span>
      <span></span>
    </div>
    <b>AutoInsight</b>
  </div>
);

export const Badge = ({ children, tone = "blue" }: { children: ReactNode; tone?: string }) => (
  <span className={`badge ${tone}`}>{children}</span>
);

export function Scope({ compact = false, label = "Butun korpus" }: { compact?: boolean; label?: string }) {
  return (
    <div className={`scope ${compact ? "compact" : ""}`}>
      <span className="scope-dot"></span>
      <span>{compact ? label : `Tahlil doirasi: ${label}`}</span>
      <Icon name="chevron" size={14} />
    </div>
  );
}

export function Kpi({
  icon,
  label,
  value,
  note,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  note: string;
  tone: string;
}) {
  return (
    <div className="card kpi">
      <div className={`kpi-icon ${tone}`}>
        <Icon name={icon} />
      </div>
      <div className="kpi-label">
        {label}
        <Icon name="info" size={14} />
      </div>
      <strong>{value}</strong>
      <span>{note}</span>
    </div>
  );
}

export function CardHead({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="card-head">
      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="meta">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

export function Conclusion({ title, text, tone }: { title: string; text: string; tone: string }) {
  return (
    <div className={`conclusion-item ${tone}`}>
      <Icon name={tone === "green" ? "check" : tone === "amber" ? "alert" : "info"} />
      <div>
        <b>{title}</b>
        <p>{text}</p>
      </div>
    </div>
  );
}

export function LoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="load-error">
      <Icon name="alert" />
      <div>
        <b>Ma’lumotni yuklab bo‘lmadi</b>
        <p>{message}</p>
      </div>
      {onRetry && (
        <button className="btn secondary" onClick={onRetry}>
          Qayta urinish
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  text,
  icon = "info",
}: {
  title: string;
  text: string;
  icon?: string;
}) {
  return (
    <div className="empty-state">
      <span>
        <Icon name={icon} />
      </span>
      <b>{title}</b>
      <p>{text}</p>
    </div>
  );
}

export function Loading({ rows = 4 }: { rows?: number }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="skeleton-row" key={index}>
          <i style={{ width: `${34 + ((index * 13) % 24)}%` }} />
          <i style={{ width: `${52 + ((index * 7) % 30)}%` }} />
        </div>
      ))}
    </div>
  );
}
