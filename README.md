# insurance-decision-record-audit-stream

> **Insurance Decision Record Audit Stream v0.1 draft.** Per-application / claim / pricing-decision AI-tool-access events, hash-chained and signed, designed to bridge **ACORD** + state DOI examination semantics to the Kinetic Gain Protocol Suite audit-stream spine. The Operator surface that lets an insurer's policy-admin / claims-admin system + vendor AI tool emit Suite-compliant audit events covering the three primary insurance-AI decision surfaces — underwriting, claims, pricing — under one schema with kind enum branching.

Part of the [Kinetic Gain Protocol Suite](https://suite.kineticgain.com). Opens the **InsurTech** vertical alongside the existing HealthTech, EdTech, and PropTech 6-packs.

> Status: v0.1 draft. Schema at [`schema/insurance-decision-event.schema.json`](./schema/insurance-decision-event.schema.json), Node verifier at [`src/verify.mjs`](./src/verify.mjs), canonical example at [`examples/coastguard-claimstriage-2026q4/`](./examples/coastguard-claimstriage-2026q4/).

## Why this exists

Every AI-assisted insurance decision touches at least one regulatory expectation: the **NAIC AI Model Bulletin (Nov 2023)** — adopted by 20+ states and counting — names governance, risk-management, third-party-AI testing, and bias-monitoring expectations that examiners now reference at every market-conduct exam. **NY DFS Circular Letter No. 7 (Jul 2024)** adds explicit expectations for life insurers using external consumer data + AI/ML. **Colorado SB 21-169** (effective Nov 2023 for life, additional lines staged) requires testing for unfair-discrimination outcomes from AI systems. **California DOI** has been issuing pre-rule guidance since 2022. State DOI examiners look for: provable consent + recordkeeping + human-adjudicator-in-loop on adverse-action + reproducible reason codes + third-party-vendor due diligence.

The insurer's policy-admin / claims-admin system already knows the ACORD field names. The vendor AI tool already knows the recommendation it issued. What's missing is a uniform stream that names *which AI tool read which ACORD field at which timestamp under which regulatory basis under which buyer-published Decision Card* — provable to a state DOI market-conduct examiner without forcing the insurer to rebuild its admin systems or the vendor to abandon ACORD.

This repo defines the schema + verifier for that stream.

## The shape

Each event is a JSON object with:

| Field group | Purpose |
| --- | --- |
| `event_id`, `timestamp`, `kind` | Append-only identity |
| `source` | The emitting system (policy-admin, claims-admin, vendor AI tool) |
| `subject_ref` | **Tokenized** policy / claim / application ID — raw policy number, applicant SSN, claimant SSN, applicant / claimant name MUST NOT appear |
| `line_of_business` | One of 20 personal + commercial + specialty lines |
| `resource` | ACORD form / element + optional XPath + tokenized resource ID + logical fields accessed |
| `action` / `outcome` | C/R/U/D/E + 0/4/8/12 codes (cross-vertical audit semantics) |
| `agent` | Which AI tool, which Decision Card, optional principal (adjuster / underwriter / CSR) |
| `regulatory_basis` | Code + citation + URI to the basis document (NAIC bulletin / state-DOI bulletin / NY DFS / CO SB 21-169 / CA DOI / ECOA / FCRA / consumer opt-in / judicial order) |
| `decision_card_ref` | Required pointer to the buyer-published Decision Card governing this access |
| `records_of_disclosure_status` | Whether the access was logged in the state DOI record + FCRA dispute log |
| `purpose_of_use`, `redaction_applied` | Free-text + applied tokenization/redaction list |
| `ai_recommendation` | OPTIONAL — recommendation, reason codes, model version, **`human_adjudicator_required = true`** (invariant when adverse-action-capable) |
| `signature` | Optional ed25519 signature on the canonical-JSON serialization |
| `prev_hash`, `hash` | Hash chain (SHA-256 over canonical-JSON of the event minus `hash`) |

## Invariants the verifier enforces

1. **Schema** — every event validates against the JSON Schema.
2. **Hash chain** — `events[0].prev_hash = "0"*64`; `events[i].prev_hash = events[i-1].hash`; `hash = sha256(canonical_json(event - {hash}))`.
3. **Canonical JSON** — keys sorted lexicographically at every level, no insignificant whitespace, UTF-8.
4. **Human-adjudicator invariant** — every event whose `kind` is in the adverse-action-capable set AND whose `ai_recommendation.recommendation` is in `{decline, rate-up, approve-with-conditions}` MUST set `ai_recommendation.human_adjudicator_required = true`. NAIC AI Model Bulletin governance expectation + state DOI guidance — no autonomous adverse-action issuance.

Adverse-action-capable kinds: `insurance.underwriting.recommendation-produced`, `insurance.claim.recommendation-produced`, `insurance.claim.triage-produced`.

The verifier exits **0** on success, **1** on schema failure, **2** on chain failure, **3** on human-adjudicator violation, **4** on usage error.

## Canonical example

[`examples/coastguard-claimstriage-2026q4/source.json`](./examples/coastguard-claimstriage-2026q4/source.json) — three events from Coastguard Insurance's 2026 Q4 stream covering a homeowner's claim:

1. **`insurance.claim.intake-read`** — VendorI ClaimsTriage v3.x reads the ACORD 3 General Form fields (date of loss, cause-of-loss code, loss location county, estimated loss amount, prior-claims 24-mo count) under NAIC AI Model Bulletin §4 third-party AI testing-and-monitoring expectations. Tokenized claim ID. Claimant name / SSN / street address redacted before reaching the model.
2. **`insurance.claim.triage-produced`** — VendorI issues a `refer-to-human` recommendation with reason codes `LOSS_AMOUNT_ABOVE_FAST_TRACK_THRESHOLD` + `PRIOR_CLAIMS_PATTERN_FLAG`, model_version `3.2.1`, `human_adjudicator_required: true`. (NOT a final decision.)
3. **`insurance.claim.adverse-action-evaluated`** — Coastguard's human adjuster issues the partial-claim-denial notice under FCRA §615 + applicable state DOI notice rules.

## Quick start

```bash
npm install
npm run build:examples
npm run verify
```

CI runs both on every push + PR.

## Composes with

| Repo | Role |
| --- | --- |
| [`evidence-bundle-spec`](https://github.com/mizcausevic-dev/evidence-bundle-spec) | Underlying audit-stream conventions |
| [`fhir-resource-access-audit`](https://github.com/mizcausevic-dev/fhir-resource-access-audit) | Sibling HealthTech audit-stream profile (FHIR / HIPAA) |
| [`student-data-access-audit-stream`](https://github.com/mizcausevic-dev/student-data-access-audit-stream) | Sibling EdTech audit-stream profile (CEDS / Ed-Fi / FERPA) |
| [`mortgage-decision-record-audit-stream`](https://github.com/mizcausevic-dev/mortgage-decision-record-audit-stream) | Sibling PropTech audit-stream profile (MISMO / URLA / ECOA / RESPA / HMDA) |

## Compliance posture

InsurTech-readiness scaffolding for NAIC AI Model Bulletin (Nov 2023) governance + risk-management + third-party AI testing expectations, state DOI examination logs, NY DFS Circular Letter No. 7 (Jul 2024), Colorado SB 21-169 anti-discrimination testing requirements, California DOI pre-rule guidance, FCRA consumer-report documentation, and ECOA-applicable credit-based insurance scoring. The schema + verifier support an insurer's program toward those expectations but do not by themselves establish compliance with any of them. Per the standing public-language guardrail: *readiness · evidence · posture · controls · scaffolding* — never "NAIC-compliant" or "state-DOI-attested" without an external attestation.

## License

MIT — see [`LICENSE`](./LICENSE).
