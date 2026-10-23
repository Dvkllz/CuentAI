import type { AppState, Attachment } from "./types";
import { Capacitor } from "@capacitor/core";
import { tr } from "./locale";
import type { Language, Theme } from "./locale";
const preferredTheme = (): Theme =>
  typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
export const emptyState = (): AppState => ({
  version: 1,
  started: false,
  invoices: [],
  settings: {
    income: null,
    apiUrl: "",
    notifications: false,
    language: "es",
    theme: preferredTheme(),
  },
});
let connection: Promise<IDBDatabase> | undefined;
function database() {
  connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("cuentai-v1", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("state");
      request.result.createObjectStore("attachments", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        new Error("No pudimos abrir el almacenamiento de este dispositivo."),
      );
  });
  return connection;
}
export async function loadState(): Promise<AppState> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction("state").objectStore("state").get("app");
    request.onsuccess = () => {
      const stored = request.result as AppState | undefined;
      if (!stored) return resolve(emptyState());
      const language: Language =
        stored.settings.language === "en" ? "en" : "es";
      const theme: Theme = stored.settings.theme === "dark" ? "dark" : "light";
      resolve({
        ...stored,
        settings: { ...stored.settings, language, theme },
      });
    };
    request.onerror = () => reject(request.error);
  });
}
export async function saveState(
  state: AppState,
  attachments: Attachment[] = [],
  removeIds: string[] = [],
) {
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["state", "attachments"], "readwrite");
    tx.objectStore("state").put(state, "app");
    attachments.forEach((a) => tx.objectStore("attachments").put(a));
    const retained = new Set(
      state.invoices
        .flatMap((i) => [i.documentId, i.receiptId])
        .filter(Boolean),
    );
    removeIds
      .filter((id) => !retained.has(id))
      .forEach((id) => tx.objectStore("attachments").delete(id));
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(new Error("No se pudo guardar. Comprueba el espacio disponible."));
    tx.onabort = () =>
      reject(new Error("El guardado se interrumpió. Inténtalo otra vez."));
  });
}
export async function getAttachment(
  id: string,
): Promise<Attachment | undefined> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const r = db.transaction("attachments").objectStore("attachments").get(id);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function allAttachments(): Promise<Attachment[]> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const r = db.transaction("attachments").objectStore("attachments").getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function deleteAttachment(id: string) {
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("attachments", "readwrite");
    tx.objectStore("attachments").delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
export async function readFile(file: File): Promise<Attachment> {
  if (
    !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
      file.type,
    )
  )
    throw new Error(
      tr(
        "Elige una imagen JPG, PNG, WebP o un PDF.",
        "Choose a JPG, PNG, WebP image, or a PDF.",
      ),
    );
  if (file.size > 12 * 1024 * 1024)
    throw new Error(
      tr(
        "El documento supera 12 MB. Usa una foto o un PDF más pequeño.",
        "The document exceeds 12 MB. Use a smaller photo or PDF.",
      ),
    );
  const bytes = await file.arrayBuffer();
  const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
  const data = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () =>
      reject(
        new Error(
          tr("No pudimos leer el archivo.", "We couldn't read the file."),
        ),
      );
    r.readAsDataURL(file);
  });
  return {
    id: crypto.randomUUID(),
    name: file.name,
    mime: file.type,
    data,
    hash,
  };
}
export async function download(name: string, content: Blob) {
  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ]);
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = () =>
        reject(new Error("No pudimos preparar el archivo."));
      reader.readAsDataURL(content);
    });
    const safeName =
      name.replace(/[^\p{L}\p{N}._ -]/gu, "_").replace(/^\.+/, "") ||
      "CuentAI-documento";
    const file = await Filesystem.writeFile({
      path: `exports/${safeName}`,
      data,
      directory: Directory.Cache,
      recursive: true,
    });
    await Share.share({
      title: name,
      files: [file.uri],
      dialogTitle: "Guardar o compartir con CuentAI",
    });
    return;
  }
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
