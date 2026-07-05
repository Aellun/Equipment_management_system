import { cookies } from "next/headers";

const API = process.env.INTERNAL_API_URL ?? "http://localhost:8000";
const GATEWAY_SECRET = process.env.GATEWAY_SECRET ?? "dyzah-gateway-secret-change-me";

/**
 * Server-side fetch for admin pages. Forwards the caller's auth cookies to the
 * backend so server-rendered admin data is fetched *as the logged-in staff
 * member*. Unauthenticated visitors get 401s (and therefore empty pages),
 * while the React AuthGuard shows them the login screen.
 *
 * Accepts either a path ("/equipment/") or a full URL (`${API}/equipment/`).
 */
export async function serverApi(input: string, init?: RequestInit): Promise<Response> {
  const url = input.startsWith("http") ? input : `${API}${input}`;
  const cookieHeader = (await cookies()).toString();
  return fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      // SSR is a trusted internal caller (it reaches the backend directly, not
      // through nginx), so it presents the gateway secret itself. This lets
      // server actions perform writes while external direct hits still can't.
      "X-Gateway-Secret": GATEWAY_SECRET,
    },
  });
}
