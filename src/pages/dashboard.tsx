import { useCallback, useEffect, useMemo, useState } from "react";

import { dataApi, type AnalyticsFilters } from "../lib/api";
import {
  dateShort,
  fmt,
  kindLabel,
  langLabel,
  monthLabel,
  pct,
  ratio,
  statusLabel,
  statusTone,
} from "../lib/format";
import type { Page } from "../lib/navigation";
import type { CardListItem, StatsSummary } from "../lib/types";
import { Badge, CardHead, Icon, Kpi, Loading, LoadError, Scope } from "../components/ui";

const SCOPE_FILTERS: AnalyticsFilters = { scope: "all" };

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function buildPath(values: number[], max: number, height = 170, width = 700): string {
  if (values.length === 0) return "";
  if (values.length === 1) return `M0 ${height} L${width} ${height - (values[0] / max) * height}`;
  const step = width / (values.length - 1);
  return values
    .map((value, index) => {
      const x = index * step;
      const y = height - (value / max) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function LineChart({ stats }: { stats: StatsSummary }) {
  const months = stats.by_month;
  const assistant = months.map((m) => Math.max(0, m.records - m.user_messages));
  const max = niceMax(Math.max(...months.map((m) => m.records), 1));
  const tickValues = [max, Math.round((max * 2) / 3), Math.round(max / 3), 0];

  const labelIndices = useMemo(() => {
    if (months.length <= 6) return months.map((_, index) => index);
    const wanted = 6;
    const step = (months.length - 1) / (wanted - 1);
    return Array.from({ length: wanted }, (_, index) => Math.round(index * step));
  }, [months]);

  return (
    <div className="line-chart">
      <div className="ylabels">
        {tickValues.map((value) => (
          <span key={value}>{value >= 1000 ? `${Math.round(value / 1000)}k` : value}</span>
        ))}
      </div>
      <svg viewBox="0 0 700 170" preserveAspectRatio="none">
        <defs>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4f6ef7" stopOpacity=".16" />
            <stop offset="1" stopColor="#4f6ef7" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          className="area"
          d={`${buildPath(
            months.map((m) => m.records),
            max,
          )} L700 170 L0 170Z`}
        />
        <path className="line one" d={buildPath(months.map((m) => m.records), max)} />
        <path className="line two" d={buildPath(months.map((m) => m.user_messages), max)} />
      </svg>
      <div className="xlabels">
        {labelIndices.map((index) => (
          <span key={index}>{months[index] ? monthLabel(months[index].month) : ""}</span>
        ))}
      </div>
      <div className="legend">
        <span>
          <i className="legend-blue"></i>Barcha yozuvlar
        </span>
        <span>
          <i className="legend-purple"></i>Foydalanuvchi xabarlari
        </span>
        <span className="legend-note">yordamchi javoblari: {fmt(assistant.reduce((a, b) => a + b, 0))}</span>
      </div>
    </div>
  );
}

function LanguageDonut({ stats }: { stats: StatsSummary }) {
  const rows = stats.languages.filter((row) => row.language);
  const top = rows.slice(0, 3);
  const covered = top.reduce((sum, row) => sum + row.share_of_records, 0);
  const other = Math.max(0, 1 - covered);
  const colors = ["#4f6ef7", "#8373e6", "#cbd1db"];

  let cursor = 0;
  const stops = top.map((row, index) => {
    const start = cursor;
    cursor += row.share_of_records;
    return `${colors[index] ?? "#cbd1db"} ${(start * 100).toFixed(2)}% ${(cursor * 100).toFixed(2)}%`;
  });
  stops.push(`${colors[2]} ${(cursor * 100).toFixed(2)}% 100%`);

  const total = stats.volume.records;

  return (
    <>
      <div className="donut-wrap">
        <div className="donut" style={{ background: `conic-gradient(${stops.join(", ")})` }}>
          <div>
            <strong>{fmt(total)}</strong>
            <small>Jami yozuv</small>
          </div>
        </div>
      </div>
      <div className="donut-legend">
        {top.map((row, index) => (
          <span key={row.language ?? index}>
            <i className={["bg-blue", "bg-violet", "bg-slate"][index]}></i>
            {langLabel(row.language)} <b>{pct(row.share_of_records)}</b>
          </span>
        ))}
        <span>
          <i className="bg-slate"></i>Boshqa <b>{pct(other)}</b>
        </span>
      </div>
    </>
  );
}

function ResearchCard({
  card,
  onClick,
}: {
  card: CardListItem;
  onClick: () => void;
}) {
  const need = card.kind === "need";
  return (
    <article className="card research-card">
      <div className="research-top">
        <div className={`research-symbol ${need ? "blue" : "amber"}`}>
          <Icon name={need ? "message" : "alert"} />
        </div>
        <Badge tone={need ? "blue" : "amber"}>{kindLabel(card.kind)}</Badge>
        <Badge tone={statusTone(card.status)}>{statusLabel(card.status)}</Badge>
      </div>
      <h3>{card.title}</h3>
      <p>{card.summary}</p>
      <div className="metric-row">
        <div>
          <span>Mos xabarlar</span>
          <b>{fmt(card.matching_user_messages)}</b>
        </div>
        <div>
          <span>Noyob kalitlar</span>
          <b>{fmt(card.distinct_usersid_hash)}</b>
        </div>
        <div>
          <span>Ulush</span>
          <b>{pct(card.share_of_user_messages, 2)}</b>
        </div>
      </div>
      <div className="sample-note">
        <Icon name="info" size={14} />
        {card.verdict ? `Xulosa: ${card.verdict}` : "Xulosa hali tasdiqlanmagan (qoralama)"}
      </div>
      <button className="btn link" onClick={onClick}>
        Tadqiqotni ko‘rish <Icon name="arrow" />
      </button>
    </article>
  );
}

export function Dashboard({
  setPage,
  openCard,
}: {
  setPage: (page: Page) => void;
  openCard: (slug: string) => void;
}) {
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [cards, setCards] = useState<CardListItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([dataApi.stats(SCOPE_FILTERS), dataApi.cards("all")])
      .then(([statsData, cardsData]) => {
        setStats(statsData);
        setCards(cardsData.items);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Noma’lum xato");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="page">
        <Loading rows={5} />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="page">
        <LoadError message={error || "Ma’lumot yo‘q"} onRetry={load} />
      </div>
    );
  }

  const { volume, dates } = stats;
  const active = volume.deleted_at_null;
  const deleted = volume.deleted_at_filled;
  const total = volume.records;

  return (
    <div className="page">
      <div className="page-heading dashboard-heading">
        <div>
          <h1>Bosh sahifa</h1>
          <p>Avtomobil assistenti foydalanuvchilari faoliyati bo‘yicha tahlillar.</p>
        </div>
        <Scope />
      </div>
      <div className="scope-note">
        <Icon name="info" size={16} />
        <span>Barcha ko‘rsatkichlar joriy tahlil doirasiga tegishli: </span>
        <b>Butun korpus</b>
        <small>Oxirgi yozuv: {dateShort(dates.created_at_max)}</small>
      </div>
      <div className="kpi-grid">
        <Kpi
          icon="database"
          label="Jami yozuvlar"
          value={fmt(volume.records)}
          note="Butun ma’lumotlar bazasi"
          tone="indigo"
        />
        <Kpi
          icon="message"
          label="Foydalanuvchi xabarlari"
          value={fmt(volume.user_messages)}
          note={`Jami yozuvlarning ${pct(ratio(volume.user_messages, total))}`}
          tone="blue"
        />
        <Kpi
          icon="bot"
          label="Assistent javoblari"
          value={fmt(volume.assistant_messages)}
          note={`Jami yozuvlarning ${pct(ratio(volume.assistant_messages, total))}`}
          tone="violet"
        />
        <Kpi
          icon="key"
          label="Foydalanuvchi kalitlari"
          value={fmt(volume.distinct_usersid_hash)}
          note="Noyob usersid_hash"
          tone="cyan"
        />
      </div>
      <div className="analytics-grid">
        <div className="card chart-card wide">
          <CardHead
            title="Faollik dinamikasi"
            subtitle="Oylar bo‘yicha yozuvlar va foydalanuvchi xabarlari"
            action={
              <span className="chart-period">
                {stats.by_month.length} oy · oxirgi yozuv {dateShort(dates.created_at_max)}
              </span>
            }
          />
          <LineChart stats={stats} />
          <p className="chart-note">
            <Icon name="info" size={14} /> Oxirgi oy to‘liq emas: ma’lumot{" "}
            {dateShort(dates.created_at_max)} sanasigacha.
          </p>
        </div>
        <div className="card chart-card">
          <CardHead title="Til taqsimoti" subtitle="Yozuvlar bo‘yicha" />
          <LanguageDonut stats={stats} />
        </div>
        <div className="card chart-card">
          <CardHead title="O‘chirilish holati" subtitle="deletedAt maydoni bo‘yicha" />
          <div className="delete-stat">
            <div>
              <strong>{fmt(active)}</strong>
              <span>Faol yozuvlar</span>
            </div>
            <Badge tone="green">{pct(ratio(active, total))}</Badge>
          </div>
          <div className="progress">
            <i style={{ width: `${ratio(active, total) * 100}%` }}></i>
          </div>
          <div className="delete-stat muted">
            <div>
              <strong>{fmt(deleted)}</strong>
              <span>O‘chirilgan yozuvlar</span>
            </div>
            <b>{pct(ratio(deleted, total))}</b>
          </div>
          <p className="chart-note">
            <Icon name="info" size={14} /> O‘chirilish sababi ma’lumotlarda mavjud emas.
          </p>
        </div>
        <div className="card chart-card wide">
          <CardHead title="Xabarlar nisbati" subtitle="Joriy tahlil doirasida" />
          <div className="ratio-wrap">
            <div
              className="ratio-donut"
              style={{
                background: `conic-gradient(#4f6ef7 0 ${(ratio(volume.user_messages, total) * 100).toFixed(
                  2,
                )}%, #8373e6 ${(ratio(volume.user_messages, total) * 100).toFixed(2)}% 100%)`,
              }}
            >
              <span>
                {fmt(total)}
                <small>Jami</small>
              </span>
            </div>
            <div className="ratio-bars">
              <div>
                <span>Foydalanuvchi</span>
                <b>{fmt(volume.user_messages)}</b>
              </div>
              <div className="bar blue">
                <i style={{ width: `${ratio(volume.user_messages, total) * 100}%` }} />
              </div>
              <div>
                <span>Assistent</span>
                <b>{fmt(volume.assistant_messages)}</b>
              </div>
              <div className="bar purple">
                <i style={{ width: `${ratio(volume.assistant_messages, total) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <section className="section">
        <div className="section-head">
          <div>
            <h2>Tadqiqotlar sharhi</h2>
            <p>Foydalanuvchi ehtiyojlari va assistent faoliyatidan asosiy kuzatuvlar</p>
          </div>
          <button className="btn secondary" onClick={() => setPage("research")}>
            Barcha tadqiqotlar <Icon name="arrow" />
          </button>
        </div>
        <div className="research-grid">
          {cards.slice(0, 2).map((card) => (
            <ResearchCard key={card.slug} card={card} onClick={() => openCard(card.slug)} />
          ))}
        </div>
      </section>
    </div>
  );
}
