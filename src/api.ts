import { Capacitor } from "@capacitor/core";
import { tr } from "./locale";
const serverErrors: Record<string, string> = {
  "Hay varias solicitudes en curso. Espera unos segundos.":
    "Several requests are in progress. Wait a few seconds.",
  "La lectura con IA todavía no está configurada en el servidor.":
    "AI reading is not configured on the server yet.",
  "No pudimos conectar con la IA. Inténtalo de nuevo o registra los datos manualmente.":
    "We couldn't connect to the AI. Try again or enter the details manually.",
  "La clave del servidor no es válida. Revisa su configuración.":
    "The server key is invalid. Review its configuration.",
  "El proyecto de OpenAI no tiene acceso a este modelo.":
    "The OpenAI project does not have access to this model.",
  "OpenAI no pudo atender la solicitud. Revisa el saldo o inténtalo en unos minutos.":
    "OpenAI could not process the request. Review the balance or try again in a few minutes.",
  "La lectura no se pudo completar. Puedes registrar los datos manualmente.":
    "Reading could not be completed. You can enter the details manually.",
  "La IA no completó la respuesta. Inténtalo de nuevo.":
    "The AI did not complete the response. Try again.",
  "No pudimos interpretar el documento.": "We couldn't interpret the document.",
  "No pudimos completar la operación.": "We couldn't complete the operation.",
};
export async function request<T>(
  path: string,
  apiUrl: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const base = apiUrl.replace(/\/$/, "");
  if (Capacitor.isNativePlatform() && !base)
    throw new Error(
      tr(
        "Configura la dirección del servidor de IA en Ajustes.",
        "Set the AI server address in Settings.",
      ),
    );
  try {
    const response = await fetch(`${base}/api/${path}`, {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: signal || AbortSignal.timeout(70000),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(
        result.error
          ? tr(result.error, serverErrors[result.error] || result.error)
          : tr(
              "No pudimos completar la operación.",
              "We couldn't complete the operation.",
            ),
      );
    return result;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    if (error instanceof TypeError)
      throw new Error(
        tr(
          "No hay conexión con el servidor. Puedes registrar la factura manualmente.",
          "There is no connection to the server. You can enter the bill manually.",
        ),
      );
    throw error;
  }
}
