import { execFileSync } from "node:child_process";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local", quiet: true });
const args = ["-c", `safe.directory=${process.cwd().replaceAll("\\", "/")}`];
const files = execFileSync("git", [
  ...args,
  "diff",
  "--cached",
  "--name-only",
  "-z",
])
  .toString()
  .split("\0")
  .filter(Boolean);
const key = process.env.OPENAI_API_KEY;
for (const file of files) {
  if (/(^|\/)\.env(\.|$)/.test(file) && file !== ".env.example")
    throw new Error("Archivo de credenciales incluido en la publicación.");
  if (
    /\.(jks|keystore)$/.test(file) ||
    /^(\.tools|\.gradle-user|artifacts)\//.test(file)
  )
    throw new Error("Archivo privado incluido en la publicación.");
  const bytes = execFileSync("git", [...args, "show", `:${file}`], {
    maxBuffer: 20 * 1024 * 1024,
  });
  if (key && bytes.includes(Buffer.from(key)))
    throw new Error(
      "Se detectó una clave en la publicación. No se subió ningún archivo.",
    );
}
console.log(
  `Revisados ${files.length} archivos preparados: sin clave ni archivos privados.`,
);
