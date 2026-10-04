import { Capacitor } from "@capacitor/core";
export async function request<T>(
  path: string,
  apiUrl: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const base = apiUrl.replace(/\/$/, "");
  if (Capacitor.isNativePlatform() && !base)
    throw new Error("Configura la dirección del servidor de IA en Ajustes.");
  try {
    const response = await fetch(`${base}/api/${path}`, {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: signal || AbortSignal.timeout(70000),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || "No pudimos completar la operación.");
    return result;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    if (error instanceof TypeError)
      throw new Error(
        "No hay conexión con el servidor. Puedes registrar la factura manualmente.",
      );
    throw error;
  }
}
