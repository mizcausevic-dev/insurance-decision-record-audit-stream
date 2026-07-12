# Changelog

All notable changes to the Insurance Decision Record Audit Stream.

## [Unreleased] — proposed, pending review

### Proposed (additive, not yet merged to a release)

- `SPEC.md` — new file; record structure, invariants, and estate-position
  reference consolidated from README plus a documented reconciliation note
  (see below).
- 6 new `kind` values: `insurance.decision-card.{issued,reviewed,appealed,overridden,reissued,expired}`
  — appended to the existing 10-value enum, no existing values changed.
- New optional `decision_card_lifecycle` object, required only on the 6 new
  kinds (root-level `if`/`then`), bridging this access-event schema to a
  sibling `ai-claims-decision-card-spec` Decision Card via `source_decision_card_ref`.
- New example `examples/decision-card-lifecycle-fictional/` — explicitly
  fictional 3-event lifecycle stream (issued → appealed → overridden),
  validated end-to-end with the existing `build:examples` + `verify` pipeline.
- **Reconciliation note:** this branch resolves a naming/role collision found
  between this repo and an unreconciled draft package that assumed the same
  repo name for a different concept ("2nd of 6, inventory #244", card-lifecycle
  tracking). The confirmed InsurTech 6-pack roster (per this CHANGELOG + the
  reference repo's "Composes with" table) has no card-lifecycle tracker among
  its 5 remaining items — see `SPEC.md` §2 and §5.4 for the full reconciliation
  and open questions left for reviewer decision before merge.
- Verified before opening this PR: schema still parses + compiles under
  Ajv2020; the existing coastguard example still validates unchanged (proves
  non-destructive); a positive fixture using the new kinds validates; a
  negative fixture (lifecycle `kind` without `decision_card_lifecycle`)
  correctly fails validation (proves the new requirement is enforced, not
  just permitted).

## [0.1] — 2026-05-29

### Added

- Initial draft event schema (`schema/insurance-decision-event.schema.json`).
- 10-kind event taxonomy spanning the three insurance-AI decision surfaces (underwriting + claims + pricing) plus policy-renewal + deletion-request.
- 20-line-of-business taxonomy spanning personal + commercial + specialty insurance lines.
- 16-type resource taxonomy mapped to ACORD forms (3, 80, etc.) + telematics + smart-home sensor + medical-record summary + credit-based insurance score + wildfire / flood risk score + property imagery + claim photo / video + estimator output + third-party data feed + adverse-action notice + policy document.
- 9-doctrine `regulatory_basis` taxonomy: `naic-ai-model-bulletin-2023`, `state-doi-bulletin-adopting-naic`, `ny-dfs-circular-letter-7-2024`, `co-sb-21-169-anti-discrimination`, `ca-doi-regulation-pre-rule`, `ecoa-applicable-credit-based-scoring`, `fcra-applicable-consumer-report`, `consumer-explicit-opt-in-granted`, `judicial-order-or-subpoena`.
- C/R/U/D/E action codes + 0/4/8/12 outcome codes (mirrors HealthTech / EdTech / PropTech sibling audit streams).
- `ai_recommendation` block with the `human_adjudicator_required = true` invariant scoped specifically to adverse-action-capable kinds + adverse-action-capable recommendations (`decline`, `rate-up`, `approve-with-conditions`).
- Hash chain conventions (SHA-256 over canonical JSON of event minus `hash`).
- Node verifier (`src/verify.mjs`) with distinct exit codes for schema (1) / chain (2) / human-adjudicator (3) failures.
- Example builder (`src/build-examples.mjs`).
- Canonical example: Coastguard Insurance 2026 Q4 stream — VendorI ClaimsTriage v3.x reads an ACORD 3 General Form + triages to `refer-to-human` + human adjuster issues partial-claim-denial notice under FCRA §615.
- CI workflow that runs `build:examples` + `verify` on every push + PR.

### Not yet

- Underwriting + pricing example streams (planned; only claims-triage example shipped in v0.1).
- Optional Rust + Go verifiers (planned to mirror sibling audit streams).
- 50-state DOI bulletin overlay (planned via `state-insurance-ai-disclosure-tracker` companion repo).
- Vault Contract profile + Incident Card profile + Evidence Bundle compliance profile + Evidence Bundle bias profile + state-DOI lifecycle tracker — the remaining 5 of the InsurTech 6-pack.
