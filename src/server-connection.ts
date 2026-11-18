import { Capacitor } from "@capacitor/core";

const EMULATOR_SERVER = "http://10.0.2.2:5174";
const ADB_REVERSE_SERVER = "http://127.0.0.1:5174";

export function serverCandidates(apiUrl: string) {
  const primary = apiUrl.replace(/\/$/, "");
  if (!Capacitor.isNativePlatform()) return [primary];
  return [...new Set([primary, ADB_REVERSE_SERVER, EMULATOR_SERVER])];
}

export async function fetchFromServer(
  apiUrl: string,
  path: string,
  init: RequestInit,
) {
  const candidates = serverCandidates(apiUrl);
  let lastError: unknown;
  for (const base of candidates) {
    try {
      return await fetch(`${base}${path}`, init);
    } catch (error) {
      lastError = error;
      if (!(error instanceof TypeError)) throw error;
    }
  }
  throw lastError;
}
