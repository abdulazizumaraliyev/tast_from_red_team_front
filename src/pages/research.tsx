import { useCallback, useEffect, useMemo, useState } from "react";

import { dataApi, type AnalyticsFilters } from "../lib/api";
import { useAuth } from "../lib/auth";
import {
  dateShort,
  dateTime,
  fmt,
  initials,
  kindLabel,
  langLabel,
  monthLabel,
  pct,
  plural,
  roleLabel,
  shortHash,
  statusLabel,
  statusTone,
  truncate,
} from "../lib/format";
import type {
  CardDetail,
  CardExample,
  CardListItem,
  CardMessagesPage,
  FilterOptions,
  ScopeBase,
} from "../lib/types";

type ExampleLike = CardExample & { explanation?: string; reason?: string };
import {
  Badge,
  CardHead,
  Conclusion,
  EmptyState,
  Icon,
  Loading,
  LoadError,
  Meta,
  Scope,
} from "../components/ui";

const BASE: AnalyticsFilters = { scope: "all" };
const MATCHES_PAGE_SIZE = 10;

interface DraftFilters {
  scope: ScopeBase;
  date_from: string;
  date_to: string;
  language: string;
}

const EMPTY_DRAFT: DraftFilters = {
  scope: "all",
  date_from: "",
  date_to: "",
  language: "",
};

function draftToFilters(draft: DraftFilters): AnalyticsFilters {
  return {
    scope: draft.scope,
    date_from: draft.date_from || null,
    date_to: draft.date_to || null,
    user_language__in: draft.language ? [draft.language] : null,
  };
}

function filterSummary(filters: AnalyticsFilters): string {
  const parts = [filters.scope === "active" ? "deletedAt = null" : "Butun korpus"];
  if (filters.date_from && filters.date_to) {
    parts.push(
      `${dateShort(`${filters.date_from}T12:00:00`)} – ${dateShort(`${filters.date_to}T12:00:00`)}`,
    );
  } else if (filters.date_from) {
    parts.push(`${dateShort(`${filters.date_from}T12:00:00`)} dan`);
  } else if (filters.date_to) {
    parts.push(`${dateShort(`${filters.date_to}T12:00:00`)} gacha`);
  }
  if (filters.user_language__in?.length) {
    parts.push(filters.user_language__in.map((lang) => langLabel(lang)).join(", "));
  }
  return parts.join(" · ");
}

function CardRow({
  card,
  onOpen,
}: {
  card: CardListItem;
  onOpen: () => void;
}) {
  const need = card.kind === "need";
  return (
    <article className="card research-list-card">
      <div className={`research-symbol ${need ? "blue" : "amber"}`}>
        <Icon name={need ? "message" : "alert"} />
      </div>
      <div className="research-list-content">
        <div>
          <Badge tone={need ? "blue" : "amber"}>{kindLabel(card.kind)}</Badge>
          <Badge tone={statusTone(card.status)}>{statusLabel(card.status)}</Badge>
        </div>
        <h3>{card.title}</h3>
        <p>{card.summary}</p>
        <div className="inline-metrics">
          <span>
            <small>Mos xabarlar</small>
            <b>{fmt(card.matching_user_messages)}</b>
          </span>
          <span>
            <small>Noyob usersid_hash</small>
            <b>{fmt(card.distinct_usersid_hash)}</b>
          </span>
          <span>
            <small>Ulush</small>
            <b>{pct(card.share_of_user_messages, 2)}</b>
          </span>
          <span>
            <small>Baza</small>
            <b>{fmt(card.denominator_user_messages)} user xabar</b>
          </span>
        </div>
      </div>
      <button className="btn secondary" onClick={onOpen}>
        Tafsilotlarni ko‘rish <Icon name="chevron" />
      </button>
    </article>
  );
}

export function ResearchList({
  openCard,
}: {
  openCard: (slug: string) => void;
}) {
  const [scope, setScope] = useState<ScopeBase>("all");
  const [cards, setCards] = useState<CardListItem[]>([]);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    dataApi
      .cards(scope)
      .then((data) => setCards(data.items))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Noma’lum xato"))
      .finally(() => setLoading(false));
  }, [scope]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return cards.filter((card) => {
      if (kind !== "all" && card.kind !== kind) return false;
      if (status !== "all" && card.status !== status) return false;
      if (!needle) return true;
      return `${card.title} ${card.summary} ${card.slug}`.toLowerCase().includes(needle);
    });
  }, [cards, query, kind, status]);

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Tadqiqotlar</h1>
          <p>Foydalanuvchilar ehtiyojlari va assistent faoliyatidagi muammolarni o‘rganing.</p>
        </div>
        <button className="btn primary" disabled title="Kartochkalar backendda statik konfiguratsiya qilinadi">
          + Yangi tadqiqot
        </button>
      </div>
      <div className="filters card">
        <div className="filter-search">
          <Icon name="search" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tadqiqot nomi bo‘yicha qidirish..."
          />
        </div>
        <label className="filter">
          <span>Kategoriya</span>
          <select value={kind} onChange={(event) => setKind(event.target.value)}>
            <option value="all">Barchasi</option>
            <option value="need">User needs</option>
            <option value="hypothesis">Gipoteza</option>
          </select>
        </label>
        <label className="filter">
          <span>Holat</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">Barchasi</option>
            <option value="draft">Qoralama</option>
            <option value="verified">Tasdiqlangan</option>
          </select>
        </label>
        <label className="filter">
          <span>Tahlil doirasi</span>
          <select
            value={scope}
            onChange={(event) => setScope(event.target.value as ScopeBase)}
          >
            <option value="all">Butun korpus</option>
            <option value="active">deletedAt = null</option>
          </select>
        </label>
      </div>
      <div className="results-head">
        <span>
          {loading ? "Yuklanmoqda..." : `${fmt(visible.length)} ${plural(visible.length, "tadqiqot", "tadqiqot", "tadqiqot")}`}
        </span>
        <Scope compact label={scope === "all" ? "Butun korpus" : "deletedAt = null"} />
      </div>
      {error ? (
        <LoadError message={error} onRetry={load} />
      ) : loading ? (
        <Loading rows={3} />
      ) : visible.length === 0 ? (
        <EmptyState
          title="Tadqiqot topilmadi"
          text="Qidiruv yoki filtrlarni o‘zgartirib ko‘ring."
          icon="flask"
        />
      ) : (
        <div className="research-list">
          {visible.map((card) => (
            <CardRow key={card.slug} card={card} onOpen={() => openCard(card.slug)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ExampleBlock({
  example,
  tone,
  onOpen,
}: {
  example: ExampleLike;
  tone: "blue" | "amber";
  onOpen: (id: number) => void;
}) {
  const note = example.note ?? example.explanation ?? example.reason;
  const actions = example.actions?.trim();

  if (tone === "blue") {
    return (
      <div className="evidence">
        <div className="evidence-head">
          <code>#{example.id}</code>
          <span>{dateTime(example.created_at)}</span>
        </div>
        <p>“{example.text?.trim() || "(bo‘sh matn)"}”</p>
        <div className="evidence-meta">
          <Badge tone={example.role === "assistant" ? "violet" : "blue"}>
            {roleLabel(example.role ?? "user")}
          </Badge>
          <span>{langLabel(example.user_language)}</span>
          <span>{example.deleted_at ? "deletedAt to‘lgan" : "Faol yozuv"}</span>
          {example.usersid_hash && <code>{shortHash(example.usersid_hash)}</code>}
          {example.matches_rule !== undefined && (
            <Badge tone={example.matches_rule ? "green" : "amber"}>
              {example.matches_rule ? "Qoidaga mos" : "Qoidaga mos emas"}
            </Badge>
          )}
          <button onClick={() => onOpen(example.id)}>
            Yozuv va kontekst <Icon name="arrow" />
          </button>
        </div>
        {actions && (
          <div className="evidence-actions">
            <span>actions</span>
            <code>{actions}</code>
          </div>
        )}
        {note && <p className="evidence-note">{note}</p>}
      </div>
    );
  }

  return (
    <div className="counter-item">
      <Icon name="alert" />
      <div>
        <div className="evidence-head">
          <code>#{example.id}</code>
          <span>{dateTime(example.created_at)}</span>
        </div>
        <p>“{example.text?.trim() || "(bo‘sh matn)"}”</p>
        <span>{note ?? "Qo‘shimcha izoh berilmagan."}</span>
        {actions && (
          <div className="evidence-actions">
            <span>actions</span>
            <code>{actions}</code>
          </div>
        )}
      </div>
      <button className="btn secondary" onClick={() => onOpen(example.id)}>
        Ko‘rish
      </button>
    </div>
  );
}

export function ResearchDetail({
  slug,
  back,
  openRecord,
}: {
  slug: string;
  back: () => void;
  openRecord: (id: number) => void;
}) {
  const { user } = useAuth();
  const [card, setCard] = useState<CardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<DraftFilters>(EMPTY_DRAFT);
  const [filters, setFilters] = useState<AnalyticsFilters>(BASE);
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [matchPage, setMatchPage] = useState(1);
  const [matches, setMatches] = useState<CardMessagesPage | null>(null);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [matchesError, setMatchesError] = useState("");

  useEffect(() => {
    dataApi
      .filterOptions("all")
      .then(setOptions)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setMatchPage(1);
  }, [slug]);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    dataApi
      .card(slug, filters)
      .then(setCard)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Noma’lum xato"))
      .finally(() => setLoading(false));
  }, [slug, filters]);

  const loadMatches = useCallback(() => {
    setMatchesLoading(true);
    setMatchesError("");
    dataApi
      .cardMessages(slug, {
        ...filters,
        page: matchPage,
        size: MATCHES_PAGE_SIZE,
        order_by: ["-created_at"],
      })
      .then(setMatches)
      .catch((err: unknown) =>
        setMatchesError(err instanceof Error ? err.message : "Noma’lum xato"),
      )
      .finally(() => setMatchesLoading(false));
  }, [slug, filters, matchPage]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const applyFilters = () => {
    setFilters(draftToFilters(draft));
    setMatchPage(1);
  };

  const resetFilters = () => {
    setDraft(EMPTY_DRAFT);
    setFilters(BASE);
    setMatchPage(1);
  };

  const download = () => {
    if (!card) return;
    const blob = new Blob([JSON.stringify(card, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${card.slug}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="page detail-page">
        <Loading rows={6} />
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="page detail-page">
        <button className="back-link" onClick={back}>
          ‹ Tadqiqotlarga qaytish
        </button>
        <LoadError message={error || "Kartochka topilmadi"} onRetry={load} />
      </div>
    );
  }

  const stats = card.stats;
  const need = card.kind === "need";
  const examples = card.examples ?? [];
  const ambiguous = card.ambiguous_examples ?? [];
  const maxMonth = Math.max(...stats.by_month.map((row) => row.matching_user_messages), 1);

  return (
    <div className="page detail-page">
      <button className="back-link" onClick={back}>
        ‹ Tadqiqotlarga qaytish
      </button>
      <div className="detail-title">
        <div>
          <div>
            <Badge tone={need ? "blue" : "amber"}>{kindLabel(card.kind)}</Badge>
            <Badge tone={statusTone(card.status)}>{statusLabel(card.status)}</Badge>
            {card.verdict ? <Badge tone="green">{card.verdict}</Badge> : null}
          </div>
          <h1>{card.title}</h1>
          <p>{card.summary}</p>
        </div>
        <button className="btn secondary" onClick={download}>
          <Icon name="download" /> Hisobotni yuklash (JSON)
        </button>
      </div>
      <div className="detail-layout">
        <main>
          <section className="card detail-section">
            <CardHead title="Tadqiqot sharhi" subtitle="Kuzatuv va tahlil parametrlari" />
            <div className="observation">
              <span>ASOSIY KUZATUV</span>
              <p>{card.observation}</p>
            </div>
            <div className="meta-grid">
              <Meta label="Kategoriya" value={need ? "Foydalanuvchi ehtiyojlari" : "Gipoteza"} />
              <Meta label="Holat" value={statusLabel(card.status)} />
              <Meta
                label="Tahlil doirasi"
                value={stats.scope.base === "all" ? "Butun korpus" : "deletedAt = null"}
              />
              <Meta label="O‘lchov birligi" value={stats.unit} />
            </div>
          </section>

          <section className="card detail-section">
            <CardHead title="Asosiy statistika" subtitle="Joriy tanlash qoidasi bo‘yicha" />
            <div className="detail-stats">
              <div>
                <span>Mos foydalanuvchi xabarlari</span>
                <b>{fmt(stats.matching_user_messages)}</b>
              </div>
              <div>
                <span>Noyob usersid_hash</span>
                <b>{fmt(stats.distinct_usersid_hash)}</b>
              </div>
              <div>
                <span>Maxraj (user xabarlar)</span>
                <b>{fmt(stats.denominator_user_messages)}</b>
              </div>
              <div>
                <span>Tegishli xabarlar ulushi</span>
                <b>{pct(stats.share_of_user_messages, 2)}</b>
              </div>
            </div>
            <div className="denominator">
              <Icon name="info" />
              <p>
                <b>Maxraj:</b> {stats.base_description}
              </p>
            </div>
          </section>

          <section className="card detail-section">
            <CardHead
              title="Tanlash usuli"
              subtitle="Mos yozuvlarni aniqlash uchun qo‘llanilgan aniq qoida"
            />
            <div className="rule">
              <div>
                <span>1</span>
                <p>
                  <b>Qoida</b>
                  {card.rule_text}
                </p>
              </div>
            </div>
            {card.alternative_explanations.length > 0 && (
              <>
                <h3 className="subhead">Muqobil izohlar</h3>
                <ul className="plain-list">
                  {card.alternative_explanations.map((item) => (
                    <li key={item}>
                      <Icon name="info" size={14} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {stats.by_language.length > 0 && (
              <>
                <h3 className="subhead">Til bo‘yicha</h3>
                <div className="language-table">
                  {stats.by_language.map((row) => (
                    <div key={row.language ?? "null"}>
                      <span>{langLabel(row.language)}</span>
                      <b>{fmt(row.matching_user_messages)}</b>
                      <small>
                        {pct(row.share_of_language, 2)} · {fmt(row.distinct_usersid_hash)} kalit
                      </small>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="card detail-section">
            <CardHead
              title="Asl dalil yozuvlari"
              subtitle="Kuzatuvni qo‘llab-quvvatlovchi manba yozuvlar"
              action={
                <Badge tone={examples.length ? "blue" : "gray"}>
                  {examples.length} ta misol
                </Badge>
              }
            />
            {examples.length === 0 ? (
              <EmptyState
                title="Misollar hali biriktirilmagan"
                text={card.examples_note}
                icon="database"
              />
            ) : (
              examples.map((example) => (
                <ExampleBlock key={example.id} example={example} tone="blue" onOpen={openRecord} />
              ))
            )}
            {card.missing_example_ids.length > 0 && (
              <p className="impact">
                <b>Topilmagan ID lar:</b> {card.missing_example_ids.join(", ")}
              </p>
            )}
          </section>

          <section className="card detail-section counter">
            <CardHead
              title="Qarama-qarshi misollar"
              subtitle="Gipotezani zaiflashtirishi yoki boshqa izoh berishi mumkin bo‘lgan yozuvlar"
            />
            {ambiguous.length === 0 ? (
              <EmptyState
                title="Qarama-qarshi misollar yo‘q"
                text="Kartochkada hali noaniq holatlar biriktirilmagan."
                icon="alert"
              />
            ) : (
              ambiguous.map((example) => (
                <ExampleBlock
                  key={example.id}
                  example={example}
                  tone="amber"
                  onOpen={openRecord}
                />
              ))
            )}
            <p className="impact">
              <b>Xulosaga ta’siri:</b> Har bir mos yozuv muammo ekanini tasdiqlamaydi; noaniq
              holatlar alohida ko‘rib chiqilishi kerak.
            </p>
          </section>

          <section className="card detail-section solution">
            <CardHead
              title="Tavsiya etilayotgan yechim"
              subtitle="Kuzatuvdan kelib chiqadigan mahsulot taklifi"
            />
            <div className="solution-grid">
              <Meta label="TAKLIF" value={card.proposal} />
              <Meta
                label="CHEKLOVLAR"
                value={card.limitations.join(" · ") || "Ko‘rsatilmagan"}
              />
            </div>
          </section>

          <section className="card detail-section">
            <CardHead
              title="Taqsimot va barqarorlik"
              subtitle="Oylar, yetakchi kalitlar va ularsiz ko‘rsatkich"
            />
            <div className="month-bars">
              {stats.by_month
                .filter((row) => row.matching_user_messages > 0)
                .map((row) => (
                  <div key={row.month} title={`${monthLabel(row.month)}: ${row.matching_user_messages}`}>
                    <i
                      style={{
                        height: `${Math.max(4, (row.matching_user_messages / maxMonth) * 100)}%`,
                      }}
                    />
                    <span>{monthLabel(row.month).split(" ")[0]}</span>
                  </div>
                ))}
            </div>
            {stats.without_top_user ? (
              <div className="stability">
                <div>
                  <span>Eng faol kalit</span>
                  <code>{shortHash(stats.without_top_user.excluded_usersid_hash)}</code>
                </div>
                <div>
                  <span>Usiz mos xabarlar</span>
                  <b>
                    {fmt(stats.without_top_user.matching_after)} / {fmt(stats.without_top_user.matching_before)}
                  </b>
                </div>
                <div>
                  <span>Usiz ulush</span>
                  <b>{pct(stats.without_top_user.share_after, 2)}</b>
                </div>
              </div>
            ) : null}
            {stats.top_users.length > 0 && (
              <div className="top-users">
                {stats.top_users.slice(0, 5).map((row) => (
                  <div key={row.usersid_hash}>
                    <code>{shortHash(row.usersid_hash)}</code>
                    <b>{fmt(row.matching_user_messages)}</b>
                    <small>{pct(row.share_of_matches)}</small>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card detail-section">
            <CardHead
              title="Tadqiqot xulosasi"
              subtitle="Tasdiqlangan va hali tekshirilishi kerak bo‘lgan jihatlar"
            />
            <div className="conclusion">
              <Conclusion
                title="Kuzatildi"
                text={`${fmt(stats.matching_user_messages)} ta foydalanuvchi xabari qoidaga mos keldi.`}
                tone="blue"
              />
              <Conclusion
                title="Tasdiqlandi"
                text={
                  card.status === "verified"
                    ? "Kartochka tasdiqlangan holatda."
                    : "Hali tasdiqlanmagan: kartochka qoralama holatida."
                }
                tone={card.status === "verified" ? "green" : "amber"}
              />
              <Conclusion
                title="Hali gipoteza"
                text="Moslik sababi (haqiqiy niyat) faqat qo‘lda tekshirish orqali aniqlanadi."
                tone="amber"
              />
              <Conclusion
                title="Keyingi qadam"
                text={`Tanlangan misollarni ochib, kontekstni ko‘zdan kechiring: ${truncate(
                  card.examples_note,
                  110,
                )}`}
                tone="violet"
              />
            </div>
          </section>
        </main>
        <aside className="detail-aside">
          <div className="card sticky-card">
            <h3>Tadqiqot holati</h3>
            <div className="status-line">
              <span>Kartochka holati</span>
              <Badge tone={statusTone(card.status)}>{statusLabel(card.status)}</Badge>
            </div>
            <div className="status-line">
              <span>Xulosa (verdict)</span>
              <Badge tone={card.verdict ? "green" : "gray"}>{card.verdict ?? "Yo‘q"}</Badge>
            </div>
            <div className="status-line">
              <span>Dalil misollari</span>
              <Badge tone={examples.length ? "green" : "amber"}>{examples.length} ta</Badge>
            </div>
            <div className="status-line">
              <span>Qarama-qarshi misollar</span>
              <Badge tone={ambiguous.length ? "green" : "amber"}>{ambiguous.length} ta</Badge>
            </div>
            <hr />
            <small>Manba</small>
            <b>Backend kartochka konfiguratsiyasi</b>
            <small>Tahlilchi</small>
            <div className="researcher">
              <div className="avatar">{initials(user?.full_name)}</div>
              <b>{user?.full_name ?? "—"}</b>
            </div>
            {stats.notes.length > 0 && (
              <>
                <hr />
                <small>Metodik eslatmalar</small>
                <ul className="aside-notes">
                  {stats.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
