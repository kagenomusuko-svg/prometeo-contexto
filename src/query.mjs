export class ContextError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ContextError";
    this.code = code;
  }
}

function requiredString(value, field) {
  if (typeof value !== "string" || value.length === 0) {
    throw new ContextError("MISSING_FIELD", field + " must be a non-empty string");
  }
}

function searchableText(entry) {
  return [
    entry.label,
    entry.name,
    entry.title,
    entry.description,
    entry.summary,
    entry.symbol,
  ].filter((value) => typeof value === "string").join(" ");
}

function collectionEntries(mapDocument) {
  return [
    ["works", mapDocument.works],
    ["evidence", mapDocument.evidence],
    ["nodes", mapDocument.nodes],
    ["relations", mapDocument.relations],
    ["routes", mapDocument.routes],
  ].flatMap(([category, entries]) =>
    (Array.isArray(entries) ? entries : []).map((entry) => ({ category, entry })),
  );
}

export function queryParadigma({
  mapDocument,
  query,
  sourceRef,
  retrievedAt,
  actorId = "prometeo-contexto",
}) {
  if (!mapDocument || typeof mapDocument !== "object" || Array.isArray(mapDocument)) {
    throw new ContextError("INVALID_MAP", "mapDocument must be an object");
  }
  requiredString(mapDocument.map_version, "mapDocument.map_version");
  requiredString(mapDocument.schema_status, "mapDocument.schema_status");
  requiredString(mapDocument.phase, "mapDocument.phase");
  requiredString(query, "query");
  requiredString(sourceRef, "sourceRef");
  requiredString(retrievedAt, "retrievedAt");
  requiredString(actorId, "actorId");

  const terms = query.toLocaleLowerCase().split(/\s+/u).filter(Boolean);
  const workById = new Map((mapDocument.works ?? []).filter((work) => work?.id).map((work) => [work.id, work]));
  const evidenceById = new Map((mapDocument.evidence ?? []).filter((item) => item?.id).map((item) => [item.id, item]));
  const matches = collectionEntries(mapDocument)
    .map(({ category, entry }) => {
      if (!entry || typeof entry !== "object" || typeof entry.id !== "string") {
        return null;
      }
      const text = searchableText(entry).toLocaleLowerCase();
      const score = terms.filter((term) => text.includes(term)).length;
      if (score === 0) return null;
      const workId = entry.work_id ?? (category === "works" ? entry.id : null);
      const work = workId ? workById.get(workId) : (category === "works" ? entry : null);
      const sourceLocators = (Array.isArray(entry.evidence) ? entry.evidence : [])
        .map((reference) => typeof reference === "string" ? evidenceById.get(reference) : reference)
        .filter((evidence) => evidence && typeof evidence === "object")
        .map((evidence) => {
          const evidenceWork = workById.get(evidence.work_id);
          return {
            evidenceId: evidence.id ?? null,
            locator: evidence.segment ?? evidence.locator ?? evidence.localizer ?? null,
            canonicalSource: evidenceWork?.source ?? null,
            workId: evidence.work_id ?? null,
            workTitle: evidenceWork?.title ?? null,
            sourceLines: Array.isArray(evidence.source_lines) ? evidence.source_lines : null,
            section: evidence.section ?? null,
            evidenceType: evidence.evidence_type ?? null,
          };
        })
        .filter((item) => item.canonicalSource || item.locator);
      const directLocator = entry.locator ?? entry.localizer ?? entry.segment ?? entry.source ?? null;
      const canonicalSource = work?.source ?? (category === "works" ? entry.source : null);
      return {
        id: entry.id,
        category,
        score,
        label: entry.label ?? entry.name ?? entry.title ?? entry.id,
        locator: directLocator ?? sourceLocators[0]?.locator ?? canonicalSource,
        canonicalSource,
        workId: workId ?? null,
        workTitle: work?.title ?? null,
        sourceLines: Array.isArray(entry.source_lines) ? entry.source_lines : null,
        sourceLocators,
        evidenceStatus: entry.status ?? entry.evidence_status ?? "unclassified",
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

  return {
    query,
    mapVersion: mapDocument.map_version,
    matches,
    requiresSourceReading: true,
    contextStatus: "map-locators-only",
    provenance: {
      kind: "deterministic-system",
      actorId,
      recordedAt: retrievedAt,
      sourceObjectId: sourceRef,
      sourceVersion: mapDocument.map_version,
      reason: "Paradigma map lookup; map does not replace canonical corpus",
    },
  };
}

function requiredFunction(value, field) {
  if (typeof value !== "function") {
    throw new ContextError("SOURCE_READER_REQUIRED", field + " must be a function");
  }
}

function sourceText(value) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof value.text === "string") {
    return value.text;
  }
  return null;
}

/**
 * Reads canonical corpus text after map lookup.
 *
 * The reader is injected so Paradigma remains an external, read-only
 * dependency. The returned text is context, not case evidence and cannot
 * promote a linguistic proposal.
 */
export async function readParadigmaSources({
  mapResult,
  readSource,
  retrievedAt,
  actorId = "prometeo-contexto",
}) {
  if (!mapResult || typeof mapResult !== "object" || Array.isArray(mapResult)) {
    throw new ContextError("INVALID_MAP_RESULT", "mapResult must be an object");
  }
  if (mapResult.contextStatus !== "map-locators-only" || mapResult.requiresSourceReading !== true) {
    throw new ContextError(
      "INVALID_MAP_RESULT",
      "mapResult must be an unconsumed map lookup",
    );
  }
  requiredString(mapResult.mapVersion, "mapResult.mapVersion");
  requiredString(retrievedAt, "retrievedAt");
  requiredString(actorId, "actorId");
  requiredFunction(readSource, "readSource");

  const sources = [];
  for (const match of mapResult.matches ?? []) {
    if (!match || typeof match !== "object") {
      throw new ContextError("SOURCE_LOCATOR_REQUIRED", "every match must be an object");
    }
    const targets = Array.isArray(match.sourceLocators) && match.sourceLocators.length > 0
      ? match.sourceLocators
      : [{ locator: match.locator, canonicalSource: match.canonicalSource, sourceLines: match.sourceLines }];
    for (const target of targets) {
      const locator = target.canonicalSource ?? target.locator;
      if (!locator) {
        throw new ContextError("SOURCE_LOCATOR_REQUIRED", "every match must resolve to a canonical source locator");
      }
      const loaded = await readSource(locator, { ...match, ...target });
      const loadedText = sourceText(loaded);
      if (!loadedText || loadedText.trim().length === 0) {
        throw new ContextError(
          "SOURCE_TEXT_UNAVAILABLE",
          "reader returned no canonical text for " + (target.evidenceId ?? match.id),
        );
      }
      const lines = target.sourceLines;
      const text = Array.isArray(lines) && lines.length === 2
        ? loadedText.split(/\r?\n/u).slice(lines[0] - 1, lines[1]).join("\n")
        : loadedText;
      if (!text || text.trim().length === 0) {
        throw new ContextError("SOURCE_TEXT_UNAVAILABLE", "selected canonical passage is empty");
      }
      const sourceRef = loaded && typeof loaded === "object" ? loaded.sourceRef : null;
      const sourceVersion = loaded && typeof loaded === "object" ? loaded.sourceVersion : null;
      requiredString(sourceRef, "reader result sourceRef");
      requiredString(sourceVersion, "reader result sourceVersion");
      sources.push({
        id: target.evidenceId ?? match.id,
        category: target.evidenceId ? "evidence" : match.category,
        label: target.section ?? match.label,
        locator: target.locator ?? match.locator,
        text,
        mapEvidenceStatus: match.evidenceStatus,
        sourceRef,
        sourceVersion,
        contextOnly: true,
      });
    }
  }

  return {
    query: mapResult.query,
    mapVersion: mapResult.mapVersion,
    sources,
    contextStatus: "source-text-read",
    requiresSourceReading: false,
    provenance: {
      kind: "deterministic-system",
      actorId,
      recordedAt: retrievedAt,
      sourceObjectId: mapResult.provenance.sourceObjectId,
      sourceVersion: mapResult.mapVersion,
      reason: "Paradigma canonical corpus read after map lookup",
    },
  };
}

