// HTTP client. If VITE_API_BASE_URL is set (e.g. http://localhost:8080 for the
// Spring Boot server) requests go over the network with a Bearer JWT.
// Otherwise the in-browser mock backend answers the same REST contract.
import { clearSession, getSession } from "@/lib/auth/session";
import { ApiError, handle } from "@/lib/mock/server";

export { ApiError };
const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "");
export const USING_MOCK_API = !BASE;

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getSession()?.token ?? null;
  try {
    if (!BASE) return (await handle(method, `/api${path}`, body, token)) as T;
    const res = await fetch(`${BASE}/api${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) throw new ApiError(res.status, data?.message ?? res.statusText, data?.details);
    return data as T;
  } catch (e) {
    if (e instanceof ApiError && e.status === 401 && !path.startsWith("/auth/login")) {
      clearSession();
      if (typeof window !== "undefined") window.location.assign("/login?expired=1");
    }
    if (e instanceof ApiError) throw e;
    throw new ApiError(0, "Network error — could not reach the server");
  }
}

export const http = {
  get: <T>(p: string) => request<T>("GET", p),
  post: <T>(p: string, b?: unknown) => request<T>("POST", p, b ?? {}),
  put: <T>(p: string, b: unknown) => request<T>("PUT", p, b),
  del: <T>(p: string) => request<T>("DELETE", p),
};
