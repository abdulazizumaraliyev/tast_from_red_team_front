import { useCallback, useEffect, useState } from "react";

import { dataApi } from "../lib/api";
import { dateShort, daysBetween, fmt, langLabel, longMonth, pct, plural } from "../lib/format";
import type { StatsSummary } from "../lib/types";
import { Badge, CardHead, Icon, Kpi, Loading, LoadError } from "../components/ui";

const FIELD_LABELS: Record<string, string> = {
  text: "text (bo‘sh matn)",
  actions: "actions",
  user_language: "userLanguage",
  type: "type",
  internet: "internet",
  user_request_type: "userRequestType",
  ai_response_type: "aiResponseType",
  stt_quality: "sttQuality",
  ai_quality: "aiQuality",
  personality: "personality",
};

const CHECK_LABELS: Record<string, string> = {
  records: "Jami yozuvlar",
  user_messages: "User xabarlari",
  assistant_messages: "Assistant xabarlari",
  distinct_usersid_hash: "Noyob kalitlar",
  deleted_at_filled: "deletedAt to‘lgan",
  deleted_at_null: "deletedAt = null",
};

export function Quality() {
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    dataApi
      .stats({ scope: "all" })
      .then(setStats)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Noma’lum xato"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="page">
        <Loading rows={6} />
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
  const checksOk = stats.import_check.every((check) => check.ok);
  const span = daysBetween(dates.created_at_min, dates.created_at_max);
  const fields = [...stats.missing_fields].sort((a, b) => b.missing_share - a.missing_share);
  const maxShare = Math.max(...fields.map((field) => field.missing_share), 0.01);
  const langNull = stats.languages.find((row) => row.language === null);
  const concentration = stats.activity_concentration;

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Ma’lumotlar sifati</h1>
          <p>Import holati, qamrov va ma’lumotlar cheklovlarini kuzating.</p>
        </div>
      </div>
      <div className={`import-banner ${checksOk ? "" : "warning"}`}>
        <div className="success-icon">
          <Icon name={checksOk ? "check" : "alert"} />
        </div>
        <div>
          <b>
            {checksOk
              ? "Import tekshiruvi muvaffaqiyatli yakunlandi"
              : "Import tekshiruvida nomuvofiqlik bor"}
          </b>
          <span>
            {stats.import_check.filter((check) => check.ok).length} / {stats.import_check.length}{" "}
            ko‘rsatkich kutilgan qiymatga mos · namuna: 999 kalit
          </span>
        </div>
        <Badge tone={checksOk ? "green" : "amber"}>{checksOk ? "MUVAFFAQIYATLI" : "TEKSHIRING"}</Badge>
      </div>

      <div className="quality-kpis">
        <Kpi
          icon="database"
          label="Jami import qilingan"
          value={fmt(volume.records)}
          note="Barcha yozuvlar"
          tone="indigo"
        />
        <Kpi
          icon="message"
          label="User yozuvlari"
          value={fmt(volume.user_messages)}
          note={pct(volume.user_messages / volume.records)}
          tone="blue"
        />
        <Kpi
          icon="bot"
          label="Assistant yozuvlari"
          value={fmt(volume.assistant_messages)}
          note={pct(volume.assistant_messages / volume.records)}
          tone="violet"
        />
        <Kpi
          icon="key"
          label="Noyob usersid_hash"
          value={fmt(volume.distinct_usersid_hash)}
          note="Shaxslar soni emas"
          tone="cyan"
        />
      </div>

      <div className="quality-grid">
        <section className="card detail-section">
          <CardHead title="Ma’lumotlar qamrovi" subtitle="Yozuvlarning vaqt bo‘yicha ko‘rinishi" />
          <div className="coverage">
            <div>
              <span>Eng eski yozuv</span>
              <b>{longMonth(dates.created_at_min)}</b>
            </div>
            <div>
              <span>Eng yangi yozuv</span>
              <b>{longMonth(dates.created_at_max)}</b>
            </div>
            <div>
              <span>Qamrab olingan davr</span>
              <b>{span ? `${fmt(span)} kun` : "—"}</b>
            </div>
            <div>
              <span>Sanasiz yozuvlar</span>
              <b>{fmt(dates.created_at_null)}</b>
            </div>
          </div>
          <div className="date-span">
            <i></i>
            <span>{dateShort(dates.created_at_min)}</span>
            <span>{dateShort(dates.created_at_max)}</span>
          </div>
          <p className="chart-note">
            <Icon name="info" size={14} /> {dates.timezone_note}
          </p>
        </section>

        <section className="card detail-section">
          <CardHead title="O‘chirilish holati" subtitle="deletedAt qiymati bo‘yicha" />
          <div className="quality-delete">
            <div
              className="big-donut"
              style={{
                background: `radial-gradient(circle, #fff 0 55%, transparent 56%), conic-gradient(#4f6ef7 0 ${(volume.deleted_at_null / volume.records) * 100}%, #cbd1db ${(volume.deleted_at_null / volume.records) * 100}% 100%)`,
              }}
            >
            </div>
            <div>
              <p>
                <i className="bg-blue"></i>
                <span>deletedAt = null</span>
                <b>
                  {fmt(volume.deleted_at_null)} · {pct(volume.deleted_at_null / volume.records)}
                </b>
              </p>
              <p>
                <i className="bg-slate"></i>
                <span>O‘chirilgan</span>
                <b>
                  {fmt(volume.deleted_at_filled)} · {pct(volume.deleted_at_filled / volume.records)}
                </b>
              </p>
              <p>
                <i className="bg-violet"></i>
                <span>Bo‘sh user matnlari</span>
                <b>{fmt(volume.empty_user_texts)}</b>
              </p>
              <p>
                <i className="bg-slate"></i>
                <span>Bo‘sh assistant matnlari</span>
                <b>{fmt(volume.empty_assistant_texts)}</b>
              </p>
            </div>
          </div>
        </section>

        <section className="card detail-section missing">
          <CardHead
            title="Muhim maydonlardagi bo‘sh qiymatlar"
            subtitle="null yoki bo‘sh qiymatlar ulushi"
          />
          {fields.map((field) => (
            <div className="field-row" key={field.field}>
              <span>{FIELD_LABELS[field.field] ?? field.field}</span>
              <div>
                <i style={{ width: `${Math.max(1.5, (field.missing_share / maxShare) * 100)}%` }}></i>
              </div>
              <b>{fmt(field.null_count + field.empty_count)}</b>
              <small>{pct(field.missing_share)}</small>
            </div>
          ))}
        </section>

        <section className="card detail-section">
          <CardHead
            title="Kalitlar konsentratsiyasi"
            subtitle="Bitta usersid_hash yozuvlarning qancha qismini beradi"
          />
          <div className="coverage">
            <div>
              <span>Eng faol kalit</span>
              <b>
                {fmt(concentration.max_records_per_hash)} yozuv · {pct(concentration.top_1_share)}
              </b>
            </div>
            <div>
              <span>Top 5 kalit</span>
              <b>{pct(concentration.top_5_share)}</b>
            </div>
            <div>
              <span>Top 10 kalit</span>
              <b>{pct(concentration.top_10_share)}</b>
            </div>
            <div>
              <span>Til aniqlanmagan</span>
              <b>
                {langNull
                  ? `${fmt(langNull.records)} · ${pct(langNull.share_of_records)}`
                  : "—"}
              </b>
            </div>
          </div>
          <p className="chart-note">
            <Icon name="info" size={14} /> Xabarlar bitta kalit ichida bog‘liq: mustaqil kuzatuvlar
            sifatida talqin qilinmasligi kerak.
          </p>
        </section>

        <section className="card detail-section">
          <CardHead
            title="Import tekshiruvi"
            subtitle="Kutilgan va haqiqiy qiymatlar"
          />
          <div className="check-list">
            {stats.import_check.map((check) => (
              <div key={check.name}>
                <Icon name={check.ok ? "check" : "alert"} size={15} />
                <span>{CHECK_LABELS[check.name] ?? check.name}</span>
                <b>
                  {fmt(check.actual)}
                  {!check.ok && <small> / {fmt(check.expected)}</small>}
                </b>
              </div>
            ))}
          </div>
        </section>

        <section className="card limitations">
          <div className="limitations-head">
            <Icon name="alert" />
            <div>
              <h3>Ma’lumotlar to‘plami cheklovlari</h3>
              <p>Tahlil natijalarini talqin qilishda quyidagilarni hisobga oling.</p>
            </div>
          </div>
          <ul>
            {stats.limitations.map((limitation) => (
              <li key={limitation.code}>{limitation.text}</li>
            ))}
          </ul>
          {stats.data_notes.length > 0 && (
            <>
              <h3 className="subhead">Metodik eslatmalar</h3>
              <ul>
                {stats.data_notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
