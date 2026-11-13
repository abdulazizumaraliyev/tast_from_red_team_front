import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ApiError, authApi, getAccessToken, refreshSession, setAccessToken } from "./api";
import type { AuthResponse, User } from "./types";

/** Google popup oynasi uchun umumiy kutish vaqti (ms). */
const GOOGLE_TIMEOUT_MS = 180_000;
const GOOGLE_POLL_MS = 1_500;

interface AuthContextValue {
  user: User | null;
  booting: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    full_name: string;
    email: string;
    phone: string;
    password: string;
    confirm_password: string;
  }) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      if (getAccessToken()) {
        try {
          const me = await authApi.me();
          if (!cancelled) setUser(me);
          return;
        } catch {
          /* token muddati tugagan bo'lishi mumkin — pastda refresh */
        }
      }
      const refreshed = await refreshSession();
      if (!cancelled && refreshed) setUser(refreshed.user);
    };

    restore()
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setBooting(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email.trim(), password);
    setAccessToken(response.access_token);
    setUser(response.user);
  }, []);

  const register = useCallback<AuthContextValue["register"]>(async (payload) => {
    const response = await authApi.register({
      ...payload,
      email: payload.email.trim(),
      full_name: payload.full_name.trim(),
      phone: payload.phone.trim(),
    });
    setAccessToken(response.access_token);
    setUser(response.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* cookie allaqachon o'chirilgan bo'lishi mumkin */
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  /**
   * Backend Google callback'i JSON qaytaradi (ilovaga redirect emas), shuning
   * uchun popup o'z-o'zidan yopilmaydi. Oyna ochiq turganda `/auth/refresh`
   * orqali sessiya paydo bo'lishini kutamiz va oynani o'zimiz yopamiz.
   * Cookie host bo'yicha saqlanadi (port muhim emas), shuning uchun ilova
   * `localhost:8443`, callback esa `localhost:8000` bo'lsa ham ishlaydi.
   */
  const loginWithGoogle = useCallback(async () => {
    const { url } = await authApi.googleUrl();

    const popup = window.open(url, "autoinsight-google", "width=520,height=660");
    if (!popup) {
      throw new ApiError(
        0,
        "Brauzer popup oynasini bloklandi. Ruxsat bering va qayta urinib ko'ring.",
        "popup_blocked",
      );
    }

    const started = Date.now();
    let session: AuthResponse | null = null;

    while (!session && !popup.closed && Date.now() - started < GOOGLE_TIMEOUT_MS) {
      try {
        session = await refreshSession();
      } catch {
        session = null; // tarmoq uzilishi — keyingi urinishgacha kutamiz
      }
      if (session) break;
      await new Promise((resolve) => window.setTimeout(resolve, GOOGLE_POLL_MS));
    }

    if (!popup.closed) popup.close();

    if (!session) {
      // Popup juda tez yopilgan bo'lsa ham cookie allaqachon o'rnatilgan bo'lishi mumkin.
      session = await refreshSession().catch(() => null);
    }
    if (!session) {
      throw new ApiError(
        Date.now() - started >= GOOGLE_TIMEOUT_MS ? 0 : 401,
        Date.now() - started >= GOOGLE_TIMEOUT_MS
          ? "Google avtorizatsiyasi vaqti tugadi"
          : "Google sessiyasi aniqlanmadi. Backend callback'i cookie o'rnatganini tekshiring.",
        Date.now() - started >= GOOGLE_TIMEOUT_MS ? "oauth_timeout" : "oauth_no_session",
      );
    }
    setUser(session.user);
  }, []);

  const value = useMemo(
    () => ({ user, booting, login, register, loginWithGoogle, logout }),
    [user, booting, login, register, loginWithGoogle, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth faqat AuthProvider ichida ishlatiladi");
  return context;
}
