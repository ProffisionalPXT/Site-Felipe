/** Sessões no navegador com validade fixa de 6 horas. */

export const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

export const ATHLETE_SESSION_KEY = "athlete_session_v2";
export const ADMIN_SESSION_KEY = "admin_session_v2";

type WithExp = { exp: number };

export function saveTimedSession(
  key: string,
  data: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  try {
    const payload = {
      ...data,
      exp: Date.now() + SIX_HOURS_MS,
    };
    localStorage.setItem(key, JSON.stringify(payload));
    // limpa legado sessionStorage
    sessionStorage.removeItem("athlete_session");
  } catch {
    /* private mode */
  }
}

export function loadTimedSession<T extends Record<string, unknown>>(
  key: string
): (T & WithExp) | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      // migra sessão antiga (sessionStorage sem exp)
      const legacy = sessionStorage.getItem("athlete_session");
      if (legacy && key === ATHLETE_SESSION_KEY) {
        const p = JSON.parse(legacy) as Record<string, unknown>;
        if (p.cpf && p.password) {
          saveTimedSession(key, p);
          sessionStorage.removeItem("athlete_session");
          return loadTimedSession(key);
        }
      }
      return null;
    }
    const parsed = JSON.parse(raw) as T & WithExp;
    if (!parsed.exp || Date.now() > Number(parsed.exp)) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearTimedSession(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
    sessionStorage.removeItem("athlete_session");
  } catch {
    /* */
  }
}

/** Renova +6h a partir de agora (a cada ação importante). */
export function touchTimedSession(key: string): void {
  const cur = loadTimedSession(key);
  if (!cur) return;
  const { exp: _e, ...rest } = cur;
  saveTimedSession(key, rest);
}
