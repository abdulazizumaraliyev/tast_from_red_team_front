import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApiError, dataApi } from "../lib/api";
import {
  dateShort,
  dateTime,
  fmt,
  langLabel,
  parseDate,
  plural,
  roleLabel,
  shortHash,
  timeOnly,
  truncate,
} from "../lib/format";
import type { MessageContext, MessageDetail, MessageListItem, ScopeBase } from "../lib/types";
import { Badge, EmptyState, Icon, Loading, LoadError, Meta } from "../components/ui";

const PAGE_SIZES = [25, 50, 100];

function pageWindow(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((page) => pages.add(page));
  if (current >= total - 2) [total - 3, total - 2, total - 1].forEach((page) => pages.add(page));
  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
  const result: (number | "gap")[] = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) result.push("gap");
    result.push(page);
  });
  return result;
}

export function RecordDrawer({
  messageId,
  onClose,
  onOpen,
}: {
  messageId: number;
  onClose: () => void;
  onOpen: (id: number) => void;
}) {
  const [message, setMessage] = useState<MessageDetail | null>(null);
  const [context, setContext] = useState<MessageContext | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setMessage(null);
    setContext(null);

    Promise.all([dataApi.message(messageId), dataApi.context(messageId, 2, 3)])
      .then(([detail, ctx]) => {
        if (cancelled) return;
        setMessage(detail);
        setContext(ctx);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError && err.status === 404
            ? `${messageId} ID bilan yozuv topilmadi`
            : err instanceof Error
              ? err.message
              : "Noma’lum xato",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [messageId]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const prevId = context?.items
    .filter((item) => item.offset < 0)
    .sort((a, b) => b.offset - a.offset)[0]?.id;
  const nextId = context?.items
    .filter((item) => item.offset > 0)
    .sort((a, b) => a.offset - b.offset)[0]?.id;

  const copyId = () => {
    if (!message) return;
    void navigator.clipboard?.writeText(String(message.id));
  };

  return (
    <div className="drawer-overlay" onMouseDown={onClose}>
      <aside
        className="drawer"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Yozuv tafsilotlari"
      >
        <div className="drawer-head">
          <div>
            <Badge tone={message?.role === "assistant" ? "violet" : "blue"}>
              {roleLabel(message?.role ?? "user").toUpperCase()}
            </Badge>
            <h2>Yozuv tafsilotlari</h2>
          </div>
          <button className="icon-btn" onClick={onClose} ref={closeRef} aria-label="Yopish">
            <Icon name="close" />
          </button>
        </div>
        <div className="drawer-body">
          {loading ? (
            <Loading rows={5} />
          ) : error || !message ? (
            <LoadError message={error || "Yozuv topilmadi"} />
          ) : (
            <>
              <div className="record-id">
                <div>
                  <span>Original record ID</span>
                  <code>#{message.id}</code>
                </div>
                <button className="copy-btn" onClick={copyId}>
                  Nusxalash
                </button>
              </div>
              <section>
                <h3>Original matn</h3>
                <blockquote>{message.text?.trim() || "(bo‘sh matn)"}</blockquote>
              </section>
              <section>
                <h3>Asosiy ma’lumotlar</h3>
                <div className="drawer-meta">
                  <Meta label="usersid_hash" value={shortHash(message.usersid_hash)} />
                  <Meta label="Role" value={roleLabel(message.role)} />
                  <Meta label="CreatedAt" value={dateTime(message.created_at)} />
                  <Meta label="UpdatedAt" value={dateTime(message.updated_at)} />
                  <Meta label="DeletedAt" value={message.deleted_at ? dateTime(message.deleted_at) : "null (faol)"} />
                  <Meta label="UserLanguage" value={message.user_language ?? "Aniqlanmagan"} />
                </div>
              </section>
              <section>
                <h3>Qo‘shimcha metadata</h3>
                <div className="drawer-meta">
                  <Meta label="Personality" value={message.personality ?? "—"} />
                  <Meta label="Type" value={message.type ?? "—"} />
                  <Meta label="Internet" value={message.internet ?? "—"} />
                  <Meta label="User request type" value={message.user_request_type ?? "—"} />
                  <Meta label="AI response type" value={message.ai_response_type ?? "—"} />
                  <Meta label="STT quality" value={message.stt_quality ?? "—"} />
                  <Meta label="AI quality" value={message.ai_quality ?? "—"} />
                  <Meta label="Actions" value={message.actions?.trim() || "—"} />
                  <Meta
                    label="timeSTT / timeGPT / timeCache"
                    value={[message.time_stt, message.time_gpt, message.time_cache]
                      .map((value) => (value === null ? "—" : String(value)))
                      .join(" / ")}
                  />
                </div>
              </section>
              <section className="nearby">
                <div>
                  <h3>Vaqt bo‘yicha yaqin yozuvlar</h3>
                  <Badge tone="gray">
                    {context ? `−${context.before} / +${context.after}` : "kontekst"}
                  </Badge>
                </div>
                <p className="warning">
                  <Icon name="info" /> {context?.disclaimer ?? "Bu yozuvlar vaqt bo‘yicha yaqin joylashgan. Ular tasdiqlangan bitta dialog emas."}
                </p>
                <div className="timeline">
                  {(context?.items ?? []).map((item) => (
                    <div
                      key={item.id}
                      className={item.is_target ? "target" : ""}
                      onClick={() => (item.is_target ? undefined : onOpen(item.id))}
                    >
                      <i className={item.role === "assistant" ? "assistant" : "user"}></i>
                      <span>{timeOnly(item.created_at)}</span>
                      <p>
                        <b>{roleLabel(item.role)}</b>
                        {truncate(item.text, 120)}
                        {item.gap_seconds !== null && item.offset !== 0 && (
                          <small className="gap">{Math.round(item.gap_seconds)} s</small>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="context-rule">{context?.rule}</p>
              </section>
              {message.notes.length > 0 && (
                <section>
                  <h3>Metodik eslatmalar</h3>
                  <ul className="aside-notes">
                    {message.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
        <div className="drawer-footer">
          <button
            className="btn secondary"
            disabled={!prevId}
            onClick={() => prevId && onOpen(prevId)}
          >
            ‹ Oldingi yozuv
          </button>
          <button
            className="btn primary"
            disabled={!nextId}
            onClick={() => nextId && onOpen(nextId)}
          >
            Keyingi yozuv ›
          </button>
        </div>
      </aside>
    </div>
  );
}

export function Records({
  initialQuery,
  openRecord,
}: {
  initialQuery: string;
  openRecord: (id: number) => void;
}) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const [search, setSearch] = useState(initialQuery);
  const [appliedSearch, setAppliedSearch] = useState(initialQuery);
  const [scope, setScope] = useState<ScopeBase>("all");
  const [role, setRole] = useState("");
  const [language, setLanguage] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedDates, setAppliedDates] = useState({ start: "", end: "" });
  const [rows, setRows] = useState<MessageListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [languages, setLanguages] = useState<{ value: string | null; records: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [jumpError, setJumpError] = useState("");

  useEffect(() => {
    setSearch(initialQuery);
    setAppliedSearch(initialQuery);
    setPage(1);
  }, [initialQuery]);

  useEffect(() => {
    dataApi
      .filterOptions("all")
      .then((options) => setLanguages(options.languages))
      .catch(() => undefined);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    dataApi
      .messages({
        scope,
        page,
        size,
        role: role || null,
        q: appliedSearch || null,
        date_from: appliedDates.start || null,
        date_to: appliedDates.end || null,
        user_language__in: language ? [language] : null,
        order_by: ["-created_at"],
      })
      .then((data) => {
        setRows(data.items);
        setTotal(data.total);
        setPages(data.pages);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Noma’lum xato"))
      .finally(() => setLoading(false));
  }, [scope, page, size, role, appliedSearch, appliedDates, language]);

  useEffect(() => {
    load();
  }, [load]);

  const dateLabel =
    appliedDates.start && appliedDates.end
      ? `${dateShort(`${appliedDates.start}T12:00:00`)} – ${dateShort(`${appliedDates.end}T12:00:00`)}`
      : "Kunlar oralig‘i";

  const applySearch = () => {
    const value = search.trim();
    setJumpError("");
    if (/^\d+$/.test(value)) {
      const id = Number(value);
      dataApi
        .message(id)
        .then(() => {
          openRecord(id);
          setSearch("");
          setAppliedSearch("");
        })
        .catch((err: unknown) => {
          setJumpError(
            err instanceof ApiError && err.status === 404
              ? `#${id} topilmadi`
              : err instanceof Error
                ? err.message
                : "Qidiruv bajarilmadi",
          );
        });
      return;
    }
    setPage(1);
    setAppliedSearch(value);
  };

  const resetFilters = () => {
    setRole("");
    setLanguage("");
    setScope("all");
    setAppliedDates({ start: "", end: "" });
    setStartDate("");
    setEndDate("");
    setAppliedSearch("");
    setSearch("");
    setPage(1);
  };

  const activeCount = [role, language, appliedDates.start, appliedSearch].filter(Boolean).length;
  const window = useMemo(() => pageWindow(page, Math.max(pages, 1)), [page, pages]);
  const from = total === 0 ? 0 : (page - 1) * size + 1;
  const to = Math.min(page * size, total);

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Yozuvlar bazasi</h1>
          <p>Asl foydalanuvchi va assistent yozuvlarini qidiring va tekshiring.</p>
        </div>
      </div>
      <div className="scope-note">
        <Icon name="database" size={16} />
        <span>Joriy tahlil doirasi:</span>
        <b>{scope === "all" ? "Butun korpus" : "deletedAt = null"}</b>
        <small>{fmt(total)} ta yozuv</small>
      </div>
      <div className="card records-card">
        <div className="records-toolbar">
          <form
            className="records-search"
            onSubmit={(event) => {
              event.preventDefault();
              applySearch();
            }}
          >
            <Icon name="search" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Matn yoki ID bo‘yicha qidirish..."
            />
            {search && (
              <button type="button" className="clear-search" onClick={() => setSearch("")}>
                <Icon name="close" size={14} />
              </button>
            )}
          </form>
          <div className="date-range-control">
            <button
              className={`btn secondary date-range-trigger ${datePickerOpen ? "active" : ""}`}
              onClick={() => setDatePickerOpen((open) => !open)}
              aria-expanded={datePickerOpen}
            >
              <Icon name="calendar" /> {dateLabel}
            </button>
            {datePickerOpen && (
              <div className="date-range-popover">
                <div className="date-range-title">
                  <div>
                    <b>Kunlar oralig‘ini tanlang</b>
                    <span>Yozuvlar yaratilgan sana bo‘yicha filtrlanadi</span>
                  </div>
                  <button
                    className="popover-close"
                    onClick={() => setDatePickerOpen(false)}
                    aria-label="Yopish"
                  >
                    <Icon name="close" size={16} />
                  </button>
                </div>
                <div className="date-presets">
                  <button
                    onClick={() => {
                      const today = new Date().toISOString().slice(0, 10);
                      setStartDate(today);
                      setEndDate(today);
                    }}
                  >
                    Bugun
                  </button>
                  <button
                    onClick={() => {
                      const end = new Date();
                      const start = new Date();
                      start.setDate(end.getDate() - 6);
                      setStartDate(start.toISOString().slice(0, 10));
                      setEndDate(end.toISOString().slice(0, 10));
                    }}
                  >
                    Oxirgi 7 kun
                  </button>
                  <button
                    onClick={() => {
                      const end = new Date();
                      const start = new Date();
                      start.setDate(end.getDate() - 29);
                      setStartDate(start.toISOString().slice(0, 10));
                      setEndDate(end.toISOString().slice(0, 10));
                    }}
                  >
                    Oxirgi 30 kun
                  </button>
                </div>
                <div className="date-inputs">
                  <label>
                    <span>Boshlanish sanasi</span>
                    <div>
                      <Icon name="calendar" size={16} />
                      <input
                        type="date"
                        value={startDate}
                        max={endDate || undefined}
                        onChange={(event) => setStartDate(event.target.value)}
                      />
                    </div>
                  </label>
                  <i>—</i>
                  <label>
                    <span>Tugash sanasi</span>
                    <div>
                      <Icon name="calendar" size={16} />
                      <input
                        type="date"
                        value={endDate}
                        min={startDate || undefined}
                        max={new Date().toISOString().slice(0, 10)}
                        onChange={(event) => setEndDate(event.target.value)}
                      />
                    </div>
                  </label>
                </div>
                <div className="date-range-actions">
                  <button
                    className="text-btn"
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                      setAppliedDates({ start: "", end: "" });
                      setPage(1);
                      setDatePickerOpen(false);
                    }}
                  >
                    Tozalash
                  </button>
                  <div>
                    <button className="btn secondary" onClick={() => setDatePickerOpen(false)}>
                      Bekor qilish
                    </button>
                    <button
                      className="btn primary"
                      disabled={!startDate || !endDate || startDate > endDate}
                      onClick={() => {
                        setAppliedDates({ start: startDate, end: endDate });
                        setPage(1);
                        setDatePickerOpen(false);
                      }}
                    >
                      Qo‘llash
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <button
            className={`btn secondary ${filtersOpen ? "active-filter-btn" : ""}`}
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <Icon name="filter" /> Filtrlar {activeCount > 0 && <b className="filter-count">{activeCount}</b>}
          </button>
          <button className="text-btn" onClick={resetFilters}>
            Tozalash
          </button>
        </div>

        {filtersOpen && (
          <div className="filter-panel">
            <label className="filter">
              <span>Rol</span>
              <select
                value={role}
                onChange={(event) => {
                  setRole(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Barchasi</option>
                <option value="user">User</option>
                <option value="assistant">Assistant</option>
              </select>
            </label>
            <label className="filter">
              <span>Til</span>
              <select
                value={language}
                onChange={(event) => {
                  setLanguage(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Barchasi</option>
                {languages.map((option) => (
                  <option key={option.value ?? "null"} value={option.value ?? ""}>
                    {option.value ? `${langLabel(option.value)} (${fmt(option.records)})` : "Aniqlanmagan"}
                  </option>
                ))}
              </select>
            </label>
            <label className="filter">
              <span>Tahlil doirasi</span>
              <select
                value={scope}
                onChange={(event) => {
                  setScope(event.target.value as ScopeBase);
                  setPage(1);
                }}
              >
                <option value="all">Butun korpus</option>
                <option value="active">deletedAt = null</option>
              </select>
            </label>
          </div>
        )}

        <div className="active-filters">
          {role && (
            <span>
              Rol: {roleLabel(role)}{" "}
              <b
                onClick={() => {
                  setRole("");
                  setPage(1);
                }}
              >
                ×
              </b>
            </span>
          )}
          {language && (
            <span>
              Til: {langLabel(language)}{" "}
              <b
                onClick={() => {
                  setLanguage("");
                  setPage(1);
                }}
              >
                ×
              </b>
            </span>
          )}
          {appliedDates.start && appliedDates.end && (
            <span>
              Sana: {dateLabel}{" "}
              <b
                onClick={() => {
                  setAppliedDates({ start: "", end: "" });
                  setStartDate("");
                  setEndDate("");
                  setPage(1);
                }}
              >
                ×
              </b>
            </span>
          )}
          {appliedSearch && (
            <span>
              Qidiruv: “{truncate(appliedSearch, 24)}”{" "}
              <b
                onClick={() => {
                  setAppliedSearch("");
                  setSearch("");
                  setPage(1);
                }}
              >
                ×
              </b>
            </span>
          )}
          <small>
            {jumpError || "ID kiritsangiz yozuv to‘g‘ridan-to‘g‘ri ochiladi · natijalar serverdan sahifalanadi"}
          </small>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>ROL</th>
                <th>XABAR MATNI</th>
                <th>TIL</th>
                <th>YARATILGAN SANA</th>
                <th>HOLAT</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7}>
                    <Loading rows={4} />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7}>
                    <LoadError message={error} onRetry={load} />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      title="Yozuv topilmadi"
                      text="Qidiruv so‘zini yoki filtrlarni o‘zgartirib ko‘ring."
                      icon="search"
                    />
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} onClick={() => openRecord(row.id)}>
                    <td>
                      <code>#{row.id}</code>
                    </td>
                    <td>
                      <Badge tone={row.role === "user" ? "blue" : "violet"}>
                        {roleLabel(row.role)}
                      </Badge>
                    </td>
                    <td className="message-cell">{truncate(row.text, 120)}</td>
                    <td>{langLabel(row.user_language)}</td>
                    <td>{dateTime(row.created_at)}</td>
                    <td>
                      <Badge tone={row.deleted_at ? "gray" : "green"}>
                        {row.deleted_at ? "O‘chirilgan" : "Faol"}
                      </Badge>
                    </td>
                    <td>
                      <button className="row-action" aria-label="Ochish">
                        <Icon name="chevron" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <span>
            {total > 0
              ? `${fmt(total)} ${plural(total, "yozuvdan", "yozuvdan", "yozuvdan")} ${fmt(from)}–${fmt(to)}`
              : "0 yozuv"}
          </span>
          <div>
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              ‹
            </button>
            {window.map((item, index) =>
              item === "gap" ? (
                <span key={`gap-${index}`}>…</span>
              ) : (
                <button
                  key={item}
                  className={item === page ? "active" : ""}
                  onClick={() => setPage(item)}
                >
                  {fmt(item)}
                </button>
              ),
            )}
            <button disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>
              ›
            </button>
          </div>
          <label>
            Har sahifada{" "}
            <select
              value={size}
              onChange={(event) => {
                setSize(Number(event.target.value));
                setPage(1);
              }}
            >
              {PAGE_SIZES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
