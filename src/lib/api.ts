import type {
  AuthResponse,
  CardDetail,
  CardList,
  CardMessagesPage,
  CardStats,
  FilterOptions,
  ImportIssue,
  ImportResult,
  MessageContext,
  MessageDetail,
  MessageQuery,
  MessagesPage,
  ScopeBase,
  StatsSummary,
  User,
} from "./types";

/**
 * Barcha so'rovlar `/api/v1` orqali ketadi. Vite dev-server bu yo'lni
 * `VITE_API_TARGET` (default: http://127.0.0.1:8000) ga proxy qiladi, shuning
 * uchun brauzerda CORS ham, cross-site cookie muammosi ham yo'q.
 */
export const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "/api/v1";

const TOKEN_KEY = "autoinsight.access_token";

let accessToken: string | null = null;
try {
  accessToken = window.localStorage.getItem(TOKEN_KEY);
} catch {
  accessToken = null;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* localStorage bloqlangan bo'lishi mumkin */
  }
}

export class ApiError extends Error {
  status: number;
  code: string;
  fields: { field: string; message: string }[];
  /** Import xatolari ro'yxati (`error.details`). */
  details: ImportIssue[];

  constructor(
    status: number,
    message: string,
    code = "request_failed",
    fields: { field: string; message: string }[] = [],
    details: ImportIssue[] = [],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.details = details;
  }
}

interface ErrorBody {
  error?: { code?: string; message?: string; details?: ImportIssue[] };
  detail?: unknown;
  [key: string]: unknown;
}

const FIELD_LABELS: Record<string, string> = {
  email: "Email",
  password: "Parol",
  confirm_password: "Parol tasdiqi",
  full_name: "Ism",
  phone: "Telefon",
  q: "Qidiruv",
  date_from: "Boshlanish sanasi",
  date_to: "Tugash sanasi",
  user_language__in: "Til",
  role: "Rol",
  scope: "Tahlil doirasi",
  order_by: "Saralash",
  page: "Sahifa",
  size: "Sahifa hajmi",
};

function labelFor(field: string): string {
  const clean = field.replace(/^body\./, "");
  return FIELD_LABELS[clean] ?? clean;
}

function parseError(status: number, raw: string): ApiError {
  let body: ErrorBody | null = null;
  try {
    body = JSON.parse(raw) as ErrorBody;
  } catch {
    body = null;
  }

  if (body?.error) {
    return new ApiError(
      status,
      body.error.message ?? "So'rov bajarilmadi",
      body.error.code ?? "error",
      [],
      Array.isArray(body.error.details) ? body.error.details : [],
    );
  }

  if (body && typeof body.detail === "string") {
    return new ApiError(status, body.detail, "detail");
  }

  if (body && Array.isArray(body.detail)) {
    const fields = (body.detail as { loc?: unknown[]; msg?: string }[]).map((item) => {
      const loc = Array.isArray(item.loc) ? item.loc : [];
      const name = String(loc[loc.length - 1] ?? "");
      return { field: name, message: item.msg ?? "Noto'g'ri qiymat" };
    });
    const message = fields.map((f) => `${labelFor(f.field)}: ${f.message}`).join("; ");
    return new ApiError(status, message || "Ma'lumotlar formati noto'g'ri", "validation_error", fields);
  }

  if (status === 500) {
    return new ApiError(
      status,
      "Server ichki xatosi (500). Backend logini tekshiring.",
      "internal_error",
    );
  }
  if (status === 401) return new ApiError(status, "Avtorizatsiya talab qilinadi", "unauthorized");
  if (status === 403) return new ApiError(status, "Ruxsat yo'q", "forbidden");
  if (status === 404) return new ApiError(status, "So'ralgan ma'lumot topilmadi", "not_found");
  return new ApiError(status, raw?.slice(0, 300) || "So'rov bajarilmadi", "http_error");
}

type QueryValue = string | number | boolean | null | undefined | string[];

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else {
      params.append(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, QueryValue>;
  auth?: boolean;
  retry?: boolean;
}

let refreshPromise: Promise<AuthResponse | null> | null = null;

export async function refreshSession(): Promise<AuthResponse | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(buildUrl("/auth/refresh"), {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        setAccessToken(null);
        return null;
      }
      const data = (await response.json()) as AuthResponse;
      setAccessToken(data.access_token);
      return data;
    })()
      .catch(() => {
        setAccessToken(null);
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, auth = true, retry = true } = options;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      credentials: "include",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Backend bilan aloqa yo'q. Server ishlayaptimi?", "network_error");
  }

  if (response.status === 401 && auth && retry) {
    const refreshed = await refreshSession();
    if (refreshed) return request<T>(path, { ...options, retry: false });
  }

  if (response.status === 204) return undefined as T;

  const raw = await response.text();
  if (!response.ok) throw parseError(response.status, raw);
  if (!raw) return undefined as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new ApiError(response.status, "Server noto'g'ri javob qaytardi", "bad_json");
  }
}

/* ----------------------------- auth ----------------------------- */

export const authApi = {
  login(email: string, password: string) {
    return request<AuthResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
      retry: false,
    });
  },
  register(payload: {
    full_name: string;
    email: string;
    phone: string;
    password: string;
    confirm_password: string;
  }) {
    return request<AuthResponse>("/auth/register", {
      method: "POST",
      body: payload,
      auth: false,
      retry: false,
    });
  },
  me() {
    return request<User>("/auth/me");
  },
  logout() {
    return request<void>("/auth/logout", { method: "POST", auth: false, retry: false });
  },
  googleUrl() {
    return request<{ url: string }>("/auth/google/url", { auth: false, retry: false });
  },
};

/* ----------------------------- import ----------------------------- */

export interface ImportProgress {
  /** Brauzerdan serverga yuborilgan baytlar. */
  loaded: number;
  total: number;
}

/**
 * JSON faylni serverga yuklaydi (POST /thread-histories/import/file).
 *
 * `fetch` yuklash progressini bermaydi, shuning uchun XMLHttpRequest ishlatiladi.
 * 401 faqat butun fayl yuborilgandan KEYIN qaytadi, shu sababli yuklashdan oldin
 * tokenni `/auth/me` bilan tekshirib (kerak bo'lsa yangilab) olamiz.
 */
export async function importFile(
  file: File,
  onProgress?: (p: ImportProgress) => void,
  signal?: AbortSignal,
): Promise<ImportResult> {
  await authApi.me();

  return new Promise<ImportResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", buildUrl("/thread-histories/import/file"));
    xhr.withCredentials = true;
    xhr.setRequestHeader("Accept", "application/json");
    if (accessToken) xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.({ loaded: event.loaded, total: event.total });
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as ImportResult);
        } catch {
          reject(new ApiError(xhr.status, "Server noto'g'ri javob qaytardi", "bad_json"));
        }
        return;
      }
      reject(parseError(xhr.status, xhr.responseText));
    };
    xhr.onerror = () =>
      reject(new ApiError(0, "Backend bilan aloqa uzildi. Server ishlayaptimi?", "network_error"));
    xhr.ontimeout = () => reject(new ApiError(0, "So'rov vaqti tugadi", "timeout"));
    xhr.onabort = () => reject(new ApiError(0, "Yuklash bekor qilindi", "aborted"));

    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        return;
      }
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }

    const form = new FormData();
    form.append("file", file, file.name);
    xhr.send(form);
  });
}

/* --------------------------- analytics --------------------------- */

export interface AnalyticsFilters {
  scope: ScopeBase;
  role?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  user_language__in?: string[] | null;
  q?: string | null;
}

function toQuery(filters: AnalyticsFilters): Record<string, QueryValue> {
  return {
    scope: filters.scope,
    role: filters.role || undefined,
    date_from: filters.date_from || undefined,
    date_to: filters.date_to || undefined,
    user_language__in: filters.user_language__in?.length ? filters.user_language__in : undefined,
    q: filters.q || undefined,
  };
}

export const dataApi = {
  stats(filters: AnalyticsFilters) {
    return request<StatsSummary>("/thread-histories/stats/summary", {
      query: toQuery(filters),
    });
  },
  filterOptions(scope: ScopeBase) {
    return request<FilterOptions>("/thread-histories/filters/options", {
      query: { scope },
    });
  },
  messages(filters: MessageQuery) {
    return request<MessagesPage>("/thread-histories/messages", {
      query: {
        ...toQuery(filters),
        page: filters.page ?? 1,
        size: filters.size ?? 25,
        order_by: filters.order_by,
      },
    });
  },
  message(id: number) {
    return request<MessageDetail>(`/thread-histories/messages/${id}`);
  },
  context(id: number, before = 2, after = 3) {
    return request<MessageContext>(`/thread-histories/messages/${id}/context`, {
      query: { before, after },
    });
  },
  cards(scope: ScopeBase) {
    return request<CardList>("/cards", { query: { scope } });
  },
  card(slug: string, filters: AnalyticsFilters) {
    return request<CardDetail>(`/cards/${encodeURIComponent(slug)}`, {
      query: toQuery(filters),
    });
  },
  cardStats(slug: string, filters: AnalyticsFilters) {
    return request<CardStats>(`/cards/${encodeURIComponent(slug)}/stats`, {
      query: toQuery(filters),
    });
  },
  cardMessages(slug: string, filters: MessageQuery) {
    return request<CardMessagesPage>(`/cards/${encodeURIComponent(slug)}/messages`, {
      query: {
        ...toQuery(filters),
        page: filters.page ?? 1,
        size: filters.size ?? 25,
        order_by: filters.order_by,
      },
    });
  },
};