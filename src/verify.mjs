#!/usr/bin/env node
// verify.mjs — Insurance Decision Record Audit Stream verifier.
//
// Verifies an NDJSON stream of insurance-decision-event records:
//  1. Every record validates against schema/insurance-decision-event.schema.json.
//  2. The hash chain is intact (canonical-JSON SHA-256, prev_hash chained).
//  3. Human-adjudicator invariant: any event whose recommendation could trigger
//     an adverse-action notice MUST set human_adjudicator_required = true.
//
// Adverse-action-capable recommendations are:
//   - underwriting.recommendation-produced
//   - claim.recommendation-produced
//   - claim.triage-produced (when recommendation in {decline, rate-up})
//
// Exit codes:
//   0 — all events valid + chain intact + human-in-loop invariant preserved
//   1 — schema validation failed
//   2 — chain validation failed
//   3 — human-adjudicator invariant violated
//   4 — usage / IO error

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const ZERO_HASH = "0".repeat(64);

const ADVERSE_ACTION_CAPABLE_KINDS = new Set([
  "insurance.underwriting.recommendation-produced",
  "insurance.claim.recommendation-produced",
  "insurance.claim.triage-produced"
]);

const ADVERSE_ACTION_CAPABLE_RECOMMENDATIONS = new Set([
  "decline",
  "rate-up",
  "approve-with-conditions"
]);

function canonicalize(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  const keys = Object.keys(value).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalize(value[k])).join(",") + "}";
}

function sha256Hex(s) { return createHash("sha256").update(s, "utf8").digest("hex"); }
function loadJson(path) { return JSON.parse(readFileSync(path, "utf8")); }

function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.error("usage: node src/verify.mjs <events.ndjson>");
    process.exit(4);
  }

  const schema = loadJson(new URL("../schema/insurance-decision-event.schema.json", import.meta.url));
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  const raw = readFileSync(args[0], "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== "");
  const events = lines.map((l, i) => {
    try { return JSON.parse(l); }
    catch (e) { console.error(`event ${i}: not valid JSON — ${e.message}`); process.exit(1); }
  });

  let schemaErrors = 0;
  for (const [i, ev] of events.entries()) {
    if (!validate(ev)) {
      schemaErrors++;
      console.error(`event ${i} (${ev.event_id ?? "?"}): schema errors`);
      for (const e of validate.errors ?? []) {
        console.error(`  - ${e.instancePath || "/"} ${e.message}`);
      }
    }
  }
  if (schemaErrors > 0) {
    console.error(`schema validation failed: ${schemaErrors}/${events.length} events failed`);
    process.exit(1);
  }

  let chainErrors = 0;
  for (const [i, ev] of events.entries()) {
    const expectedPrev = i === 0 ? ZERO_HASH : events[i - 1].hash;
    if (ev.prev_hash !== expectedPrev) {
      chainErrors++;
      console.error(`event ${i} (${ev.event_id}): prev_hash mismatch (expected ${expectedPrev.slice(0, 16)}…, got ${ev.prev_hash.slice(0, 16)}…)`);
      continue;
    }
    const { hash, ...rest } = ev;
    const recomputed = sha256Hex(canonicalize(rest));
    if (hash !== recomputed) {
      chainErrors++;
      console.error(`event ${i} (${ev.event_id}): hash mismatch (expected ${recomputed.slice(0, 16)}…, got ${hash.slice(0, 16)}…)`);
    }
  }
  if (chainErrors > 0) {
    console.error(`chain validation failed: ${chainErrors}/${events.length} events broken`);
    process.exit(2);
  }

  let humanInLoopErrors = 0;
  for (const [i, ev] of events.entries()) {
    if (!ADVERSE_ACTION_CAPABLE_KINDS.has(ev.kind)) continue;
    if (!ev.ai_recommendation) {
      humanInLoopErrors++;
      console.error(`event ${i} (${ev.event_id}): kind=${ev.kind} requires ai_recommendation object`);
      continue;
    }
    const rec = ev.ai_recommendation.recommendation;
    if (!ADVERSE_ACTION_CAPABLE_RECOMMENDATIONS.has(rec)) continue;
    if (ev.ai_recommendation.human_adjudicator_required !== true) {
      humanInLoopErrors++;
      console.error(`event ${i} (${ev.event_id}): recommendation=${rec} on kind=${ev.kind} requires human_adjudicator_required=true (NAIC AI Model Bulletin governance expectation + state DOI guidance — no autonomous adverse-action issuance)`);
    }
  }
  if (humanInLoopErrors > 0) {
    console.error(`human-adjudicator invariant violated: ${humanInLoopErrors} event(s)`);
    process.exit(3);
  }

  console.log(`OK — ${events.length} events validated, chain intact, human-adjudicator invariant preserved.`);
}

main();
