import { useState } from "react";

import { useAuth } from "../lib/auth";
import { dateTime, initials } from "../lib/format";
import { Badge, Icon, Meta } from "../components/ui";

export function Settings() {
  const { user, logout } = useAuth();
  const [pending, setPending] = useState(false);

  return (
    <div className="page settings-page">
      <div className="page-heading">
        <div>
          <h1>Sozlamalar</h1>
          <p>Profilingiz va platforma parametrlarini boshqaring.</p>
        </div>
      </div>
      <div className="settings-layout">
        <aside className="settings-nav">
          <button className="active">Profil</button>
          <button disabled>Ko‘rinish</button>
          <button disabled>Til va hudud</button>
          <button disabled>Bildirishnomalar</button>
        </aside>
        <main>
          <section className="card settings-card">
            <h2>Profil ma’lumotlari</h2>
            <p>Hisobingiz backenddagi haqiqiy foydalanuvchi yozuvi bilan bog‘langan.</p>
            <div className="profile-edit">
              <div className="avatar large">{initials(user?.full_name)}</div>
              <div>
                <b>{user?.full_name ?? "—"}</b>
                <span>
                  {user?.plan ? `Tarif: ${user.plan}` : ""}
                  {user?.type ? ` · ${user.type}` : ""}
                </span>
              </div>
            </div>
            <div className="form-grid">
              <label>
                Ism va familiya
                <input value={user?.full_name ?? ""} readOnly />
              </label>
              <label>
                Telefon raqami
                <input value={user?.phone ?? "—"} readOnly />
              </label>
              <label className="full">
                Email manzili
                <div className="input-status">
                  <input value={user?.email ?? ""} readOnly />
                  <Badge tone={user?.is_verified ? "green" : "amber"}>
                    {user?.is_verified ? "Tasdiqlangan" : "Tasdiqlanmagan"}
                  </Badge>
                </div>
              </label>
              <label>
                Hisob turi
                <input value={user?.type ?? "—"} readOnly />
              </label>
              <label>
                Tarif rejasi
                <input value={user?.plan ?? "—"} readOnly />
              </label>
            </div>
            <div className="save-row">
              <button className="btn primary" disabled title="Backendda profilni tahrirlash endpointi yo‘q">
                O‘zgarishlarni saqlash
              </button>
              <small className="muted-note">
                Profilni tahrirlash hozircha faqat backend orqali mumkin.
              </small>
            </div>
          </section>

          <section className="card settings-card">
            <h2>Sessiya</h2>
            <p>Joriy hisob va token holati.</p>
            <div className="drawer-meta settings-meta">
              <Meta label="Hisob ID" value={user?.id ?? "—"} />
              <Meta label="Oxirgi kirish" value={dateTime(user?.last_login_at)} />
              <Meta label="Ro‘yxatdan o‘tgan" value={dateTime(user?.created_at)} />
              <Meta
                label="Sinov muddati"
                value={
                  user?.is_trial_active ? `${user.trial_days_left} kun qoldi` : "Faol emas"
                }
              />
              <Meta label="Parol o‘rnatilgan" value={user?.has_password ? "Ha" : "Yo‘q"} />
              <Meta label="Superuser" value={user?.is_superuser ? "Ha" : "Yo‘q"} />
            </div>
          </section>

          <section className="card settings-card">
            <h2>Ko‘rinish</h2>
            <p>Interfeys ko‘rinishi.</p>
            <div className="theme-options">
              <label className="selected">
                <input type="radio" defaultChecked name="theme" disabled />
                <span className="theme-preview light"></span>
                <b>Yorug‘</b>
                <small>Joriy</small>
              </label>
              <label>
                <input type="radio" name="theme" disabled />
                <span className="theme-preview dark"></span>
                <b>Qorong‘i</b>
                <small>Tez orada</small>
              </label>
              <label>
                <input type="radio" name="theme" disabled />
                <span className="theme-preview system"></span>
                <b>Tizim</b>
                <small>Tez orada</small>
              </label>
            </div>
          </section>

          <section className="card settings-card">
            <h2>Til va hudud</h2>
            <div className="form-grid">
              <label>
                Interfeys tili
                <select defaultValue="uz">
                  <option value="uz">O‘zbekcha</option>
                </select>
              </label>
              <label>
                Vaqt mintaqasi
                <select defaultValue="tashkent">
                  <option value="tashkent">Toshkent (GMT+5)</option>
                </select>
              </label>
            </div>
          </section>

          <section className="card settings-card danger-zone">
            <div>
              <h2>Tizimdan chiqish</h2>
              <p>Joriy qurilmadagi seansni yakunlang. Refresh cookie o‘chiriladi.</p>
            </div>
            <button
              className="btn danger"
              disabled={pending}
              onClick={() => {
                setPending(true);
                void logout().finally(() => setPending(false));
              }}
            >
              <Icon name="logout" /> {pending ? "Chiqilmoqda..." : "Tizimdan chiqish"}
            </button>
          </section>
        </main>
      </div>
    </div>
  );
}
