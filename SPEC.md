# SPEC: Insurance Decision Record Audit Stream

**Version:** 0.1.0 (schema unchanged) + proposed 0.2.0-draft additive branch (see §5)
**Normative source:** [`schema/insurance-decision-event.schema.json`](./schema/insurance-decision-event.schema.json) (JSON Schema draft 2020-12) + [`src/verify.mjs`](./src/verify.mjs) (verifier).
**License:** MIT — see [`LICENSE`](./LICENSE).

This file did not exist before this PR. [`README.md`](./README.md) has served as
the spec to date; this document adds a stable reference for the record
structure, invariants, and — separately — a proposed additive branch. It does
not supersede or contradict the README.

## 1. Purpose

Defines a hash-chained, append-only event format describing which AI tool
accessed which insurance application / claim / policy field, under which
regulatory basis, under which buyer-published AI Decision Card. Covers the
three primary insurance-AI decision surfaces: underwriting, claims, pricing.
See README §"Why this exists" for full regulatory context (NAIC AI Model
Bulletin, NY DFS Circular Letter 7, CO SB 21-169, CA DOI, FCRA/ECOA).

## 2. Position in the estate

This repo is entry 1 of the InsurTech 6-pack per `CHANGELOG.md`'s own roadmap.
The confirmed remaining 5 (per this repo's CHANGELOG and the "Composes with"
table in [`insurance-decision-record-audit-stream-reference`](https://github.com/mizcausevic-dev/insurance-decision-record-audit-stream-reference)):

| # | Repo | Role |
|---|---|---|
| 1 | `insurance-decision-record-audit-stream` (this repo) | ACORD-bridged access-event log + verifier |
| 2 | `policyholder-data-vault-contract-profile` | Vault Contract profile |
| 3 | `unfair-discrimination-incident-card-profile` | Incident Card profile |
| 4 | `naic-ai-bulletin-readiness-evidence-bundle` | Evidence Bundle (compliance) |
| 5 | *(unnamed)* | Evidence Bundle (bias) — not yet named/created |
| 6 | `state-insurance-ai-disclosure-tracker` | State-DOI lifecycle tracker |

**Reconciliation note (why this section exists):** an earlier draft package
(ingested 2026-07 from an uploaded `-Claude`-suffixed file set, never
committed) described a same-named repo as *"second repo in the InsurTech
6-pack, inventory entry 244"* modeling **Decision-Card lifecycle** events
(issued/reviewed/appealed/overridden/reissued/expired) referencing a card from
a sibling `ai-claims-decision-card-spec`. That numbering and role do not match
the roster above — none of the 5 confirmed remaining items is a card-lifecycle
tracker, and this repo's existing v0.1 schema is an access-event log, not a
lifecycle tracker. The two designs were never reconciled prior to this PR.

Rather than create a second identically-named repo or silently overwrite the
existing (already-shipping) access-event schema, §5 proposes folding the
lifecycle *concept* into this schema as an **additive, optional branch** —
new `kind` values plus an optional `decision_card_lifecycle` object — so the
two ideas coexist under one spine instead of colliding on one repo name. This
is a proposal for review, not a confirmed correction to the roster above.

## 3. Record structure (v0.1, unchanged)

Full definition in `schema/insurance-decision-event.schema.json`. Summary —
see README §"The shape" for the authoritative field-by-field description:

| Field group | Purpose |
|---|---|
| `event_id`, `timestamp`, `kind` | Append-only identity |
| `source` | Emitting system |
| `subject_ref` | Tokenized policy/claim/application ID |
| `line_of_business` | One of 20 personal/commercial/specialty lines |
| `resource` | ACORD form/element + tokenized resource ID |
| `action` / `outcome` | C/R/U/D/E + 0/4/8/12 codes |
| `agent` | AI tool + Decision Card + optional principal |
| `regulatory_basis` | Code + citation + basis-document URI |
| `decision_card_ref` | Pointer to the governing Decision Card |
| `ai_recommendation` | OPTIONAL — recommendation + `human_adjudicator_required` invariant |
| `prev_hash`, `hash` | Hash chain (SHA-256 over canonical-JSON minus `hash`) |

## 4. Invariants (v0.1, unchanged)

1. **Schema** — every event validates against the JSON Schema.
2. **Hash chain** — `events[0].prev_hash = "0"*64`; `hash = sha256(canonical_json(event - {hash}))`.
3. **Canonical JSON** — keys sorted lexicographically, no insignificant whitespace, UTF-8.
4. **Human-adjudicator invariant** — scoped to adverse-action-capable kinds AND
   adverse recommendations (see README + `src/verify.mjs` for the exact sets).

Enforced by `src/verify.mjs`. Exit codes: 0 pass, 1 schema, 2 chain, 3 human-adjudicator, 4 usage.

## 5. Decision-card lifecycle branch (PROPOSED — this PR)

Additive only. No existing field, required-list entry, or enum value was
removed or renamed; `additionalProperties: false` objects only gained new
*optional* properties.

### 5.1 New `kind` values (appended to the existing 10-value enum)

```
insurance.decision-card.issued
insurance.decision-card.reviewed
insurance.decision-card.appealed
insurance.decision-card.overridden
insurance.decision-card.reissued
insurance.decision-card.expired
```

### 5.2 New optional field: `decision_card_lifecycle`

Required **only** when `kind` is one of the six values above (enforced via a
root-level `if`/`then`, verified with both a positive and a negative ajv test
before this PR was opened — see PR description).

```jsonc
"decision_card_lifecycle": {
  "source_decision_card_ref": {
    "spec": "ai-claims-decision-card-spec",   // detection key, const
    "claims_card_version": "1.2.0",           // version of the sibling spec
    "card_id": "…",
    "card_hash": "sha256:<64-hex>"            // hash of the referenced card
  },
  "jurisdiction": "FL",           // optional, ^[A-Z]{2}$ — feeds state-insurance-ai-disclosure-tracker
  "naic_bulletin_ref": null       // optional, feeds naic-ai-bulletin-readiness-evidence-bundle
}
```

### 5.3 Example

[`examples/decision-card-lifecycle-fictional/source.json`](./examples/decision-card-lifecycle-fictional/source.json)
— **explicitly fictional**, not a real claim or card. Three events: issued →
appealed → overridden, referencing a fictional `ai-claims-decision-card-spec`
card. Built with the existing `src/build-examples.mjs` pipeline and validated
with the existing `src/verify.mjs` — chain intact, schema valid, 0 errors.

### 5.4 Open questions for reviewer (not resolved by this PR)

- `agent` still requires `ai_tool_card_url` + `ai_decision_card_url` on
  lifecycle events. For human-only steps (e.g. a policyholder-submitted
  appeal), this PR's interpretation is that these fields identify the
  **originating** AI tool/card under governance, not necessarily the current
  actor — documented via `agent.principal`. Confirm this fits your intended
  semantics before merging.
- `resource.type` has no dedicated enum value for "the Decision Card itself";
  the fixture uses `adverse-action-notice` as the closest fit. Consider adding
  a `decision-card-document` resource type if this branch is adopted.
- Whether this belongs in **this** repo at all, vs. a genuinely new repo, is
  the reviewer's call — see §2's reconciliation note. This PR is additive and
  reversible either way (a straight revert removes it cleanly).

## 6. Repurposing note

The event-access-log pattern in §3 (and, if adopted, the lifecycle branch in
§5) is designed to be reused directly for `defense-decision-record-audit-stream`
and its sibling verticals (see the reference-impl roster in
`insurance-decision-record-audit-stream-reference`'s README) — same shape,
parameterized per vertical's regulatory posture, consistent with how
InsurTech's `human_adjudicator_required` scoping already differs deliberately
from PropTech's universal rule.

## 7. Compliance posture

Unchanged from README: this schema + verifier support an insurer's program
toward NAIC AI Model Bulletin / state DOI / NY DFS / CO SB 21-169 / FCRA /
ECOA expectations but do not by themselves establish compliance. Guardrail
language: *readiness · evidence · posture · controls · scaffolding* — never
"NAIC-compliant" or "state-DOI-attested" without external attestation.
