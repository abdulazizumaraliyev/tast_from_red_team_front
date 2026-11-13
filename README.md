# AutoInsight — Automotive Voice Analytics

Figma Make'da tayyorlangan interfeys backend (`task-from-red-team`, FastAPI) bilan
ulangan. Barcha raqamlar API'dan olinadi — kodda qo'lda yozilgan ko'rsatkich yo'q.

## Ishga tushirish

```bash
# 1) backend (o'z repo'sida)
cd ~/PycharmProjects/task-from-red-team
.venv/bin/uvicorn src.main:app --reload --port 8000

# 2) frontend
cd "Рабочий стол/Automotive Voice Analytics Platform"
pnpm install
pnpm dev            # http://localhost:8443
```

Vite dev-server `/api` so'rovlarini `VITE_API_TARGET` ga proxy qiladi
(default `http://127.0.0.1:8000`). Boshqa manzil uchun:

```bash
VITE_API_TARGET=http://192.168.1.10:8000 pnpm dev
```

Production build:

```bash
pnpm build          # dist/
pnpm preview
```

`pnpm preview` ham xuddi shunday `/api` proxy'sini ishlatadi, shuning uchun uni
backend bilan bir xil hostda (yoki proxy orqasida) joylashtiring. Boshqa domenda
bo'lsa, `VITE_API_BASE` orqali to'liq API URL bering va backendda CORS ni yoqing.

| O'zgaruvchi | Default | Ma'nosi |
| --- | --- | --- |
| `VITE_API_TARGET` | `http://127.0.0.1:8000` | dev/preview proxy manzili |
| `VITE_API_BASE` | `/api/v1` | brauzer ishlatadigan API prefiksi |

## Autentifikatsiya

- **Email + parol**: `POST /auth/login`, `POST /auth/register`
- **Google**: `GET /auth/google/url` → popup → backend callback cookie o'rnatadi →
  frontend `POST /auth/refresh` orqali sessiyani oladi
- Access token 30 daqiqa, `localStorage`da; har `401` da avtomatik `refresh`
- Refresh token — httpOnly cookie (`/api/v1/auth` yo'lida), shu sababli proxy
  ishlatiladi (cookie same-origin bo'lib qoladi)

Parol talablari backend bilan bir xil: kamida 8 belgi, harf va raqam.

### Muhim: backendda tuzatilishi kerak

1. **`jwt` paketi noto'g'ri.** `pyproject.toml` da `jwt` yozilgan, venvda esa
   PyJWT bo'lmagan `jwt` 1.4 turibdi → `jwt.encode` yo'q → barcha `/auth/*`
   so'rovlar `500` qaytaradi.

   ```bash
   .venv/bin/pip uninstall -y jwt
   .venv/bin/pip install PyJWT
   # pyproject.toml: "jwt>=1.4.0"  ->  "pyjwt>=2.8"
   ```

2. **`register_exception_handlers(app)` chaqirilmaydi** (`src/main.py`), shuning
   uchun `AppError` lar `401/409/429` o'rniga `500` bo'lib chiqadi. `main.py` da
   `from src.core.exceptions import register_exception_handlers` qilib,
   `app = FastAPI(...)` dan keyin chaqiring.

3. **Google login** uchun `.env` da haqiqiy `GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET` va Google Cloud Console'da
   `GOOGLE_REDIRECT_URI` (masalan `http://127.0.0.1:8000/api/v1/auth/google/callback`)
   ro'yxatdan o'tgan bo'lishi shart.

4. **Ma'lumot endpointlari himoyalanmagan.** `/thread-histories/*` va `/cards/*`
   token talab qilmaydi — login bor, lekin ma'lumot hali ochiq. Himoya qilish
   backend tomonda (`CurrentUserDep` qo'shish) hal qilinadi.

## Ishlatiladigan API

| Endpoint | Sahifa |
| --- | --- |
| `GET /thread-histories/stats/summary` | Bosh sahifa, Ma'lumotlar sifati |
| `GET /thread-histories/filters/options` | Yozuvlar (til ro'yxati) |
| `GET /thread-histories/messages` | Yozuvlar jadvali |
| `GET /thread-histories/messages/{id}` | Yozuv drawer'i |
| `GET /thread-histories/messages/{id}/context` | Drawer'dagi timeline |
| `GET /cards` | Tadqiqotlar ro'yxati, sidebar hisoblagichi |
| `GET /cards/{slug}` | Tadqiqot tafsiloti |
| `GET /auth/*` | Kirish / ro'yxatdan o'tish / sessiya |

Filterlar: `scope`, `role`, `date_from`, `date_to`, `user_language__in[]`, `q`,
`order_by[]`; sahifalash `page`/`size` (≤200).

## Kod tuzilishi

```
src/
  App.tsx                 # shell: auth gate, hash-routing, drawer
  lib/api.ts              # fetch qatlami: Bearer, 401→refresh, xato parsing
  lib/auth.tsx            # AuthProvider: login/register/logout/Google
  lib/types.ts            # backend kontrakti tiplari
  lib/format.ts           # sana/son/til formatlash (uz-UZ)
  lib/navigation.ts       # hash routing
  components/ui.tsx       # Icon, Logo, Badge, Kpi, EmptyState, Loading...
  components/layout.tsx   # Sidebar, Topbar
  pages/auth.tsx          # kirish / ro'yxatdan o'tish
  pages/dashboard.tsx     # KPI, dinamika, til, deletedAt, tadqiqotlar
  pages/research.tsx      # kartochkalar ro'yxati va tafsiloti
  pages/records.tsx       # jadval, filtrlar, ID jump, drawer, kontekst
  pages/quality.tsx       # import tekshiruvi, qamrov, cheklovlar
  pages/settings.tsx      # profil (read-only), sessiya, chiqish
```

## Ma'lumot haqida eslatmalar

- 260 232 yozuv, 130 934 user / 129 298 assistant, 999 noyob `usersid_hash`.
- Kartochka matni (`title`, `summary`, `observation`, ...) backendda rus tilida —
  UI o'zbek, kontent esa o'zgartirilmasdan ko'rsatiladi.
- Ikkala kartochka ham `status="draft"`, `verdict=null`, `examples=[]` — shuning
  uchun "Dalil yozuvlari" bo'limi bo'sh holat bilan chiqadi
  (`src/app/task/costants.py` da misollar hali to'ldirilmagan).
- Cheklovlar, `missing_fields`, `import_check` — hammasi API'dan olinadi, hech
  qanday ko'rsatkich o'ylab topilmaydi.
