import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createParadigmaReadOnlyFetch } from "../src/github-auth.mjs";
import { createParadigmaGitHubReader } from "../src/github-reader.mjs";
import { readParadigmaSources } from "../src/query.mjs";

function parseEnv(text) {
  const values = {};
  for (const rawLine of text.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const normalized = line.startsWith("export ") ? line.slice(7) : line;
    const separator = normalized.indexOf("=");
    if (separator < 1) continue;
    const key = normalized.slice(0, separator).trim();
    let value = normalized.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

const localValues = {};
for (const file of [".env", ".env.local"]) {
  try {
    Object.assign(localValues, parseEnv(await readFile(resolve(file), "utf8")));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
const env = { ...localValues, ...process.env };
const token = env.PROMETEO_PARADIGMA_READ_TOKEN;
const sourceCommit = env.PARADIGMA_SOURCE_COMMIT;
const query = env.PARADIGMA_QUERY || "método Prometeo";

if (!token) {
  console.error("Falta PROMETEO_PARADIGMA_READ_TOKEN en el entorno local.");
  process.exit(2);
}
if (!sourceCommit || !/^[a-f0-9]{40}$/u.test(sourceCommit)) {
  console.error("PARADIGMA_SOURCE_COMMIT debe ser un SHA completo de 40 caracteres.");
  process.exit(2);
}

try {
  const reader = createParadigmaGitHubReader({
    sourceCommit,
    fetchImpl: createParadigmaReadOnlyFetch({ token })
  });
  const mapResult = await reader.query({
    query,
    retrievedAt: new Date().toISOString()
  });
  const target = mapResult.matches.find((match) => match.category === "works" && match.id === "PROMETEO-JUR");
  if (!target) throw new Error("La consulta no localizó la obra canónica de Prometeo.");

  const readResult = await readParadigmaSources({
    mapResult: { ...mapResult, matches: [target] },
    readSource: reader.readSource,
    retrievedAt: new Date().toISOString()
  });
  if (readResult.sources.length !== 1 || readResult.sources[0].contextOnly !== true) {
    throw new Error("La lectura canónica no produjo exactamente una fuente contextual.");
  }

  console.log(JSON.stringify({
    status: "PASS",
    query,
    sourceCommit,
    mapVersion: readResult.mapVersion,
    sourceCount: readResult.sources.length,
    sourceVersion: readResult.sources[0].sourceVersion,
    contextOnly: readResult.sources[0].contextOnly,
    authenticatedAccess: "GET-only"
  }, null, 2));
} catch (error) {
  console.error("La prueba live de Paradigma falló:", error.code ?? "LIVE_READ_FAILED", error.message);
  process.exitCode = 1;
}
