import express from "express";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractInvoice, askAssistant, assistantInput } from "./extraction.mjs";
dotenv.config({ path: ".env.local", quiet: true });
export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  const port = Number(process.env.PORT || 5173);
  const allowed = new Set([
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
    "https://localhost",
    "capacitor://localhost",
    ...(process.env.ALLOWED_ORIGINS || "").split(",").filter(Boolean),
  ]);
  app.use("/api", (req, res, next) => {
    const origin = req.get("origin");
    if (origin && !allowed.has(origin))
      return res.status(403).json({ error: "Origen no permitido." });
    if (origin) {
      res.set("Access-Control-Allow-Origin", origin);
      res.set("Vary", "Origin");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      res.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    }
    if (req.method === "OPTIONS") return res.sendStatus(204);
    res.set("Cache-Control", "no-store");
    next();
  });
  app.use(express.json({ limit: "18mb" }));
  const counts = new Map();
  let concurrent = 0;
  app.use(["/api/extract", "/api/assistant"], (req, res, next) => {
    const now = Date.now();
    for (const [k, v] of counts) if (now - v.at > 60000) counts.delete(k);
    const key = req.ip;
    const record = counts.get(key) || { at: now, count: 0 };
    record.count++;
    counts.set(key, record);
    if (record.count > 15 || concurrent >= 2)
      return res
        .status(429)
        .json({
          error: "Hay varias solicitudes en curso. Espera unos segundos.",
        });
    concurrent++;
    let released = false;
    const release = () => {
      if (!released) {
        released = true;
        concurrent--;
      }
    };
    res.once("finish", release);
    res.once("close", release);
    next();
  });
  app.get("/api/health", (_req, res) =>
    res.json({ ready: Boolean(process.env.OPENAI_API_KEY), version: "0.1.0" }),
  );
  app.post("/api/extract", async (req, res, next) => {
    try {
      res.json(await extractInvoice(req.body));
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/assistant", async (req, res, next) => {
    const parsed = assistantInput.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "La consulta o los registros no son válidos." });
    try {
      res.json({ answer: await askAssistant(parsed.data) });
    } catch (e) {
      next(e);
    }
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "Ruta no disponible." }),
  );
  app.use((err, _req, res, _next) => {
    const status =
      err.type === "entity.too.large"
        ? 413
        : err.type === "entity.parse.failed"
          ? 400
          : err.status || 500;
    res
      .status(status)
      .json({
        error:
          status === 413
            ? "El archivo supera el tamaño permitido."
            : status === 500
              ? "No pudimos completar la operación."
              : err.message,
      });
  });
  return app;
}
const launched =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (launched) {
  const app = createApp();
  if (process.argv.includes("--production")) {
    app.use(express.static("dist"));
    app.get(/.*/, (_req, res) => res.sendFile(path.resolve("dist/index.html")));
  } else {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }
  const port = Number(process.env.PORT || 5173);
  const host = process.env.HOST || "127.0.0.1";
  app.listen(port, host, () =>
    console.log(`CuentAI disponible en http://${host}:${port}`),
  );
}
