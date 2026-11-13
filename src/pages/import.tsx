import { useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";

import { ApiError, importFile } from "../lib/api";
import { fmt } from "../lib/format";
import type { Page } from "../lib/navigation";
import type { ImportResult } from "../lib/types";
import { Badge, CardHead, Icon } from "../components/ui";

/** Backend bilan bir xil chegara (MAX_FILE_BYTES). */
const MAX_BYTES = 500 * 1024 * 1024;

type Phase = "idle" | "uploading" | "processing" | "done" | "error";

function sizeLabel(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m} daq ${s} s` : `${s} s`;
}

function checkFile(file: File): string {
  if (!file.name.toLowerCase().endsWith(".json")) return "Faqat .json fayl qabul qilinadi.";
  if (file.size === 0) return "Fayl bo‘sh.";
  if (file.size > MAX_BYTES) {
    return `Fayl juda katta: ${sizeLabel(file.size)} (maksimum ${sizeLabel(MAX_BYTES)}).`;
  }
  return "";
}

export function ImportPage({ setPage }: { setPage: (p: Page) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [sent, setSent] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const busy = phase === "uploading" || phase === "processing";

  // Yuklash/qayta ishlash vaqtini ko'rsatish uchun sekundomer.
  useEffect(() => {
    if (!busy) return;
    const started = Date.now();
    setElapsed(0);
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [busy]);

  // Sahifadan chiqib ketilsa, davom etayotgan yuklash bekor qilinadi.
  useEffect(() => () => abortRef.current?.abort(), []);

  const pick = (next: File | null | undefined) => {
    if (!next || busy) return;
    const problem = checkFile(next);
    setLocalError(problem);
    setResult(null);
    setError(null);
    setPhase("idle");
    setFile(problem ? null : next);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    pick(event.dataTransfer.files?.[0]);
  };

  const start = async () => {
    if (!file || busy) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase("uploading");
    setSent(0);
    setResult(null);
    setError(null);
    try {
      const data = await importFile(
        file,
        ({ loaded, total }) => {
          setSent(loaded);
          if (loaded >= total) setPhase("processing");
        },
        controller.signal,
      );
      setResult(data);
      setPhase("done");
    } catch (err) {
      if (err instanceof ApiError && err.code === "aborted") {
        setPhase("idle");
        return;
      }
      setError(err instanceof ApiError ? err : new ApiError(0, "Noma’lum xato"));
      setPhase("error");
    } finally {
      abortRef.current = null;
    }
  };

  const reset = () => {
    setFile(null);
    setPhase("idle");
    setResult(null);
    setError(null);
    setLocalError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const percent = file && file.size ? Math.min(100, Math.round((sent / file.size) * 100)) : 0;

  return (
    <div className="page import-page">
      <div className="page-heading">
        <div>
          <h1>Ma’lumotlarni import qilish</h1>
          <p>
            threadhistories JSON faylini yuklang. Fayl avval to‘liq tekshiriladi, xato bo‘lsa bazaga
            hech narsa yozilmaydi.
          </p>
        </div>
      </div>

      <section className="card import-card">
        <CardHead
          title="JSON fayl"
          subtitle="Kutilgan tuzilma: { &quot;threadhistories&quot;: [ ... ] } · maksimum 500 MB"
          action={<Badge tone="gray">Qayta import xavfsiz</Badge>}
        />

        <div
          className={`dropzone ${dragging ? "active" : ""} ${busy ? "disabled" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            if (!busy) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !busy && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if ((event.key === "Enter" || event.key === " ") && !busy) inputRef.current?.click();
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(event) => pick(event.target.files?.[0])}
          />
          <Icon name="upload" size={26} />
          {file ? (
            <>
              <b>{file.name}</b>
              <span>{sizeLabel(file.size)}</span>
            </>
          ) : (
            <>
              <b>Faylni shu yerga tashlang yoki tanlang</b>
              <span>threadhistories_20pct_users.json</span>
            </>
          )}
        </div>

        {localError && (
          <p className="import-local-error">
            <Icon name="alert" size={14} /> {localError}
          </p>
        )}

        {busy && file && (
          <div className="import-progress">
            <div className="import-progress-head">
              <b>
                {phase === "uploading"
                  ? `Serverga yuborilmoqda · ${percent}%`
                  : "Server tekshirmoqda va bazaga yozmoqda…"}
              </b>
              <span>
                <Icon name="clock" size={13} /> {clock(elapsed)}
              </span>
            </div>
            <div className={`progress ${phase === "processing" ? "indeterminate" : ""}`}>
              <i style={{ width: phase === "processing" ? "100%" : `${percent}%` }}></i>
            </div>
            <small>
              {phase === "uploading"
                ? `${sizeLabel(sent)} / ${sizeLabel(file.size)}`
                : "Katta fayl uchun bu bir necha daqiqa olishi mumkin. Sahifani yopmang."}
            </small>
          </div>
        )}

        <div className="import-actions">
          {busy ? (
            <button className="btn secondary" onClick={() => abortRef.current?.abort()}>
              <Icon name="close" size={14} /> Bekor qilish
            </button>
          ) : (
            <>
              <button className="btn primary" disabled={!file} onClick={() => void start()}>
                <Icon name="upload" size={15} /> Import qilish
              </button>
              {(file || result || error) && (
                <button className="btn secondary" onClick={reset}>
                  Tozalash
                </button>
              )}
            </>
          )}
        </div>
      </section>

      {phase === "done" && result && (
        <section className="card import-result">
          <div className="import-banner">
            <div className="success-icon">
              <Icon name="check" />
            </div>
            <div>
              <b>Import muvaffaqiyatli yakunlandi</b>
              <span>Vaqt: {clock(elapsed)} · fayl: {file?.name}</span>
            </div>
            <Badge tone="green">MUVAFFAQIYATLI</Badge>
          </div>
          <div className="import-stats">
            <div>
              <span>Fayldan o‘qildi</span>
              <strong>{fmt(result.received)}</strong>
            </div>
            <div>
              <span>Yangi qo‘shildi</span>
              <strong>{fmt(result.inserted)}</strong>
            </div>
            <div>
              <span>O‘tkazib yuborildi</span>
              <strong>{fmt(result.skipped)}</strong>
              <small>bazada allaqachon bor edi (id bo‘yicha)</small>
            </div>
          </div>
          <div className="import-actions">
            <button className="btn primary" onClick={() => setPage("quality")}>
              Ma’lumotlar sifatini tekshirish <Icon name="arrow" size={14} />
            </button>
            <button className="btn secondary" onClick={() => setPage("records")}>
              Yozuvlarni ko‘rish
            </button>
          </div>
        </section>
      )}

      {phase === "error" && error && (
        <section className="card import-result">
          <div className="load-error">
            <Icon name="alert" />
            <div>
              <b>Fayl import qilinmadi</b>
              <p>{error.message}</p>
              {error.details.length > 0 && <p>Bazaga hech narsa yozilmadi.</p>}
            </div>
            <button className="btn secondary" onClick={() => void start()}>
              Qayta urinish
            </button>
          </div>

          {error.details.length > 0 && (
            <div className="issue-list" role="table" aria-label="Topilgan xatolar">
              <div className="issue-row head" role="row">
                <span>Yozuv №</span>
                <span>ID</span>
                <span>Maydon</span>
                <span>Xato</span>
              </div>
              {error.details.map((issue, index) => (
                <div className="issue-row" role="row" key={index}>
                  <span>{issue.position ?? "—"}</span>
                  <span>{issue.id ?? "—"}</span>
                  <code>{issue.field ?? "—"}</code>
                  <span>{issue.message}</span>
                </div>
              ))}
              <p className="issue-note">
                Eng ko‘pi bilan birinchi 50 ta xato ko‘rsatiladi. Yozuv № — massivdagi o‘rni (1 dan).
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
