import { Capacitor } from "@capacitor/core";
import type { AuthSession, AuthUser } from "./types";
import { tr } from "./locale";

const STORAGE_KEY = "cuentai-auth-v1";
let session: AuthSession | null = null;

try {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored) as AuthSession;
    if (parsed?.token && parsed?.user?.id) session = parsed;
  }
} catch {
  session = null;
}

const authErrors: Record<string, string> = {
  "Ya existe una cuenta con este correo.":
    "An account with this email already exists.",
  "Correo o contraseña incorrectos.": "Incorrect email or password.",
  "Inicia sesión para continuar.": "Sign in to continue.",
  "Los datos enviados no son válidos.": "The submitted data is not valid.",
  "Hay varias solicitudes en curso. Espera unos segundos.":
    "Several requests are in progress. Wait a few seconds.",
};

export function authSession() {
  return session;
}

export function authToken() {
  return session?.token || "";
}

export function saveAuthSession(next: AuthSession) {
  session = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function clearAuthSession() {
  session = null;
  localStorage.removeItem(STORAGE_KEY);
}

export async function authRequest<T>(
  action: "register" | "login" | "logout" | "me",
  apiUrl: string,
  body?: unknown,
  token = authToken(),
): Promise<T> {
  const base = apiUrl.replace(/\/$/, "");
  if (Capacitor.isNativePlatform() && !base)
    throw new Error(
      tr(
        "El servidor de CuentAI no está disponible en esta versión.",
        "The CuentAI server is not available in this build.",
      ),
    );
  try {
    const response = await fetch(`${base}/api/auth/${action}`, {
      method: action === "me" ? "GET" : "POST",
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(20000),
    });
    if (response.status === 204) return undefined as T;
    const result = await response.json();
    if (!response.ok)
      throw new Error(
        result.error
          ? tr(result.error, authErrors[result.error] || result.error)
          : tr("No pudimos continuar.", "We couldn't continue."),
      );
    return result as T;
  } catch (error) {
    if (error instanceof TypeError)
      throw new Error(
        tr(
          "No hay conexión con el servidor de CuentAI.",
          "There is no connection to the CuentAI server.",
        ),
      );
    throw error;
  }
}

export async function logout(apiUrl: string) {
  const token = authToken();
  try {
    if (token) await authRequest<void>("logout", apiUrl, undefined, token);
  } finally {
    clearAuthSession();
  }
}

export type AuthResult = { token: string; user: AuthUser };
