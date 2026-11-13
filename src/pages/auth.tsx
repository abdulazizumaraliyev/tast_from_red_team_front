import { useEffect, useState } from "react";

import { ApiError, dataApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import { fmt } from "../lib/format";
import { Badge, Icon, Logo } from "../components/ui";

type AuthView = "login" | "register";

const authCopy = {
  login: {
    title: "Xush kelibsiz!",
    desc: "Tadqiqot platformasiga kirish uchun email va parolingizni kiriting.",
    action: "Hisobingiz yo‘qmi?",
    link: "Ro‘yxatdan o‘tish",
  },
  register: {
    title: "Hisob yaratish",
    desc: "Platformadan foydalanishni boshlash uchun ma’lumotlaringizni kiriting.",
    action: "Hisobingiz bormi?",
    link: "Kirish",
  },
};

function normalizePhone(value: string): string {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return trimmed;
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith("998")) return `+${digits}`;
  return `+${digits}`;
}

function passwordProblem(value: string): string | null {
  if (value.length < 8) return "Parol kamida 8 belgidan iborat bo‘lsin";
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return "Parolda harf va raqam bo‘lishi kerak";
  return null;
}

const AUTH_FIELDS = new Set([
  "email",
  "password",
  "confirm_password",
  "full_name",
  "phone",
]);

function errorText(error: unknown): { message: string; fields: Record<string, string> } {
  if (error instanceof ApiError) {
    const fields: Record<string, string> = {};
    const unknown: string[] = [];
    for (const field of error.fields) {
      if (AUTH_FIELDS.has(field.field)) fields[field.field] = field.message;
      else unknown.push(field.message);
    }
    let message = error.message;
    if (error.code === "internal_error" || error.status === 500) {
      message =
        "Backend autentifikatsiya xatosi (500). Serverda PyJWT kutubxonasi o‘rnatilganini tekshiring.";
    }
    if (error.fields.length > 0) {
      // Maydon xatolari input ostida ko'rsatiladi — takrorlamaymiz.
      message = unknown.join("; ");
    }
    return { message, fields };
  }
  return { message: "Kutilmagan xato yuz berdi", fields: {} };
}

function AuthVisual({ records }: { records: number | null }) {
  return (
    <div className="auth-visual">
      <div className="wave">
        {[22, 38, 54, 32, 66, 44, 72, 50, 28, 46, 64, 35, 55, 24].map((h, i) => (
          <i key={i} style={{ height: h }} />
        ))}
      </div>
      <div className="mini-insight">
        <span>
          <Icon name="flask" />
        </span>
        <div>
          <small>Manba</small>
          <strong>Real foydalanuvchi yozuvlari</strong>
        </div>
        <Badge tone="green">{records ? fmt(records) : "—"}</Badge>
      </div>
    </div>
  );
}

export function Auth() {
  const { login, register, loginWithGoogle } = useAuth();
  const [view, setView] = useState<AuthView>("login");
  const [records, setRecords] = useState<number | null>(null);
  const [pending, setPending] = useState<"form" | "google" | null>(null);
  const [message, setMessage] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    let cancelled = false;
    dataApi
      .stats({ scope: "all" })
      .then((data) => {
        if (!cancelled) setRecords(data.volume.records);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const switchView = (next: AuthView) => {
    setView(next);
    setMessage("");
    setFields({});
    setPassword("");
    setConfirm("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    setFields({});

    if (view === "register") {
      if (!fullName.trim()) {
        setFields({ full_name: "Ism-familiyani kiriting" });
        return;
      }
      const problem = passwordProblem(password);
      if (problem) {
        setFields({ password: problem });
        return;
      }
      if (password !== confirm) {
        setFields({ confirm_password: "Parollar mos kelmadi" });
        return;
      }
      if (phone.replace(/\D/g, "").length < 9) {
        setFields({ phone: "Telefon raqamini to‘liq kiriting" });
        return;
      }
    }

    setPending("form");
    try {
      if (view === "login") {
        await login(email, password);
      } else {
        await register({
          full_name: fullName,
          email,
          phone: normalizePhone(phone),
          password,
          confirm_password: confirm,
        });
      }
    } catch (error) {
      const parsed = errorText(error);
      setMessage(parsed.message);
      setFields(parsed.fields);
    } finally {
      setPending(null);
    }
  };

  const continueWithGoogle = async () => {
    setMessage("");
    setFields({});
    setPending("google");
    try {
      await loginWithGoogle();
    } catch (error) {
      const parsed = errorText(error);
      setMessage(parsed.message);
    } finally {
      setPending(null);
    }
  };

  const copy = authCopy[view];

  return (
    <div className="auth-shell">
      <div className="auth-side">
        <Logo dark />
        <div>
          <Badge tone="glass">DALILLARGA ASOSLANGAN TAHLIL</Badge>
          <h1>
            Ovozli tajribani
            <br />
            aniqroq tushuning.
          </h1>
          <p>
            Real suhbatlarni kuzating, muammolarni toping va mahsulot qarorlarini ishonchli dalillar
            bilan qabul qiling.
          </p>
        </div>
        <AuthVisual records={records} />
      </div>
      <main className="auth-main">
        <div className="auth-card">
          <div className="mobile-logo">
            <Logo />
          </div>
          <div className="eyebrow">AUTOMOTIVE VOICE ANALYTICS</div>
          <h2>{copy.title}</h2>
          <p>{copy.desc}</p>
          <form onSubmit={submit} noValidate>
            {view === "register" && (
              <>
                <label>Ism va familiya</label>
                <div className={`input-with-icon ${fields.full_name ? "invalid" : ""}`}>
                  <Icon name="users" />
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Aziza Karimova"
                    autoComplete="name"
                    required
                  />
                </div>
                {fields.full_name && <small className="field-error">{fields.full_name}</small>}
              </>
            )}

            <label>Email manzili</label>
            <div className={`input-with-icon ${fields.email ? "invalid" : ""}`}>
              <Icon name="mail" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="siz@kompaniya.uz"
                autoComplete="email"
                required
              />
            </div>
            {fields.email && <small className="field-error">{fields.email}</small>}

            {view === "register" && (
              <>
                <label>Telefon raqami</label>
                <div className={`input-with-icon ${fields.phone ? "invalid" : ""}`}>
                  <Icon name="clock" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+998 90 123 45 67"
                    autoComplete="tel"
                    required
                  />
                </div>
                {fields.phone ? (
                  <small className="field-error">{fields.phone}</small>
                ) : (
                  <small className="field-hint">9 raqam kiritsangiz +998 avtomatik qo‘shiladi</small>
                )}
              </>
            )}

            <label>Parol</label>
            <div className={`input-with-icon ${fields.password ? "invalid" : ""}`}>
              <Icon name="key" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={view === "register" ? "Kamida 8 belgi, harf va raqam" : "••••••••"}
                autoComplete={view === "register" ? "new-password" : "current-password"}
                required
              />
            </div>
            {fields.password && <small className="field-error">{fields.password}</small>}

            {view === "register" && (
              <>
                <label>Parolni tasdiqlang</label>
                <div className={`input-with-icon ${fields.confirm_password ? "invalid" : ""}`}>
                  <Icon name="check" />
                  <input
                    type="password"
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    placeholder="Parolni qayta kiriting"
                    autoComplete="new-password"
                    required
                  />
                </div>
                {fields.confirm_password && (
                  <small className="field-error">{fields.confirm_password}</small>
                )}
              </>
            )}

            {message && (
              <div className="auth-error" role="alert">
                <Icon name="alert" size={16} />
                <span>{message}</span>
              </div>
            )}

            <button className="btn primary full" type="submit" disabled={pending !== null}>
              {pending === "form"
                ? "Tekshirilmoqda..."
                : view === "login"
                  ? "Kirish"
                  : "Ro‘yxatdan o‘tish"}
              {pending !== "form" && <Icon name="arrow" />}
            </button>
          </form>

          <div className="auth-divider">
            <span>yoki</span>
          </div>

          <button
            className="btn google full"
            type="button"
            onClick={() => void continueWithGoogle()}
            disabled={pending !== null}
          >
            <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
              <path
                fill="#EA4335"
                d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.2C12.4 13.1 17.7 9.5 24 9.5Z"
              />
              <path
                fill="#4285F4"
                d="M46.1 24.5c0-1.6-.1-2.8-.4-4.1H24v9.3h12.6c-.3 2.1-1.6 5.2-4.7 7.3l7.7 6c4.5-4.2 6.5-10.3 6.5-18.5Z"
              />
              <path
                fill="#FBBC05"
                d="M10.5 28.6A14.6 14.6 0 0 1 9.7 24c0-1.6.3-3.2.8-4.6l-7.9-6.2A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.2Z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.5 0 11.9-2.1 15.6-5.8l-7.7-6c-2.1 1.4-4.8 2.4-7.9 2.4-6.3 0-11.6-3.6-13.5-8.9l-7.9 6.2C6.5 42.6 14.6 48 24 48Z"
              />
            </svg>
            {pending === "google" ? "Google oynasi ochildi..." : "Google bilan davom etish"}
          </button>

          <div className="auth-switch">
            {copy.action}{" "}
            <button onClick={() => switchView(view === "login" ? "register" : "login")}>
              {copy.link}
            </button>
          </div>
          <p className="legal">
            Davom etish orqali siz foydalanish shartlari va maxfiylik siyosatiga rozilik bildirasiz.
          </p>
        </div>
        <div className="auth-footer">© 2025 AutoInsight · Maxfiylik · Yordam</div>
      </main>
    </div>
  );
}
