import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reference = JSON.parse(fs.readFileSync(path.join(root, "contracts/prometeo-contract.json"), "utf8"));
assert.equal(reference.contractId, "prometeo-contracts");
assert.equal(reference.contractVersion, "0.2.0");
assert.equal(reference.sourceRepository, "kagenomusuko-svg/prometeo-esquema");
assert.equal(reference.manifestRef, "contracts/manifest.json@0.2.0");
console.log("PASS: consumidor fija la versión contractual 0.2.0");
