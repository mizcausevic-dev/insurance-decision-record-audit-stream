# Changelog

All notable changes to the Insurance Decision Record Audit Stream.

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
