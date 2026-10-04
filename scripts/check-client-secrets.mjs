import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local", quiet: true });
const key = process.env.OPENAI_API_KEY;
if (!key) {
  console.log("No hay una clave local para comprobar.");
  process.exit(0);
}
async function inspect(root) {
  for (const item of await readdir(root, { withFileTypes: true })) {
    const file = path.join(root, item.name);
    if (item.isDirectory()) await inspect(file);
    else if ((await readFile(file)).includes(Buffer.from(key)))
      throw new Error(
        "Se detectó un secreto en los archivos del cliente. No distribuyas esta compilación.",
      );
  }
}
for (const root of process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["dist", "android/app/src/main/assets"])
  await inspect(root);
console.log(
  "Verificado: la clave no está en los archivos de distribución revisados.",
);
