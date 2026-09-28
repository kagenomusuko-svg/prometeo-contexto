import { strict as assert } from "node:assert";
import { queryParadigma, ContextError } from "../src/query.mjs";

const mapDocument = {
  map_version: "f1-test",
  schema_status: "frozen",
  phase: "F1",
  nodes: [
    {
      id: "node-r-star",
      label: "R*",
      description: "objeto formal de metrología causal",
      locator: {
        workId: "metrologia-causal",
        section: "definición de R*",
      },
      status: "explicit",
    },
  ],
  routes: [
    {
      id: "route-r-star",
      title: "Ruta de lectura R*",
      description: "dependencias y fórmula",
      locator: { workId: "metrologia-causal", section: "fórmula" },
    },
  ],
  works: [],
  evidence: [],
  relations: [],
};

const result = queryParadigma({
  mapDocument,
  query: "R* fórmula",
  sourceRef: "kagenomusuko-svg/Paradigma@map-commit",
  retrievedAt: "2026-09-28T19:00:00Z",
});

assert.equal(result.contextStatus, "map-locators-only");
assert.equal(result.requiresSourceReading, true);
assert.equal(result.provenance.sourceObjectId, "kagenomusuko-svg/Paradigma@map-commit");
assert.ok(result.matches.some((match) => match.id === "node-r-star"));
assert.ok(result.matches.some((match) => match.id === "route-r-star"));
assert.equal(result.matches.find((match) => match.id === "node-r-star").evidenceStatus, "explicit");
assert.equal(result.matches.find((match) => match.id === "node-r-star").locator.workId, "metrologia-causal");

assert.throws(
  () => queryParadigma({
    mapDocument,
    query: "R*",
    sourceRef: "Paradigma@map-commit",
    retrievedAt: "2026-09-28T19:00:00Z",
    actorId: "prometeo-lenguaje",
  }),
  (error) => error instanceof ContextError && error.code === "MISSING_FIELD",
);

console.log("PASS: contexto consulta mapa externo y exige lectura de fuente");
