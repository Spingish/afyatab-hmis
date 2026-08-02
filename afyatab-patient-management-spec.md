# TibaMax / AfyaTab HMIS — Patient Management: Consolidated Architecture Specification

**Status:** Merged reference document. Combines the original comprehensive Patient Management prompt, its Visit Classification addendum (First Visit / Revisit / Follow-up), and the Kenya Digital Health & Interoperability addition. Supersedes none of them individually — this is the single source of truth going forward.

**Foundational principle, unchanged across all three source documents:**

```
PATIENT → MASTER PATIENT INDEX → ENCOUNTER → SERVICE/ACTIVITY → CLINICAL/ADMIN RECORD → BILLING/CLAIM
                                       │
                          ┌────────────┼────────────┐
                          ↓            ↓            ↓
                      APPOINTMENT   REFERRAL    (multiple services
                                                  per encounter)
```

A patient's identity is permanent. An encounter is a distinct episode of care. Services are activities within an encounter. First Visit / Revisit / Continuation / Follow-up are **operational labels layered on top of the encounter**, never the encounter's unique identity.

---

## PART A — Role, Scope, and Ground Rules

Act as a senior health-information-systems architect, full-stack engineer, database engineer, UX designer, QA engineer, and Kenya health-data compliance specialist working on the **existing** AfyaTab-HMIS / TibaMax repository.

- Do NOT rebuild from scratch. Inspect the existing architecture, schema, APIs, RBAC, and workflows first, then extend safely.
- Do NOT remove or replace existing working concepts: MPI/Patient Registry, First Visit, Second Visit, Revisit, Follow-up, Continuation, Encounter, Appointment, Queue & Flow Management, ADT, longitudinal history, multiple same-day encounters.
- Prefer additive, safe database migrations. Never destroy existing data.
- No facility selector in reception/encounter forms for the current single-facility deployment — facility comes from authenticated context. Architecture must remain ready for future multi-facility/multi-tenancy expansion.
- Do not claim legal/regulatory certification merely because a feature exists; prepare the architecture for certified integration rather than simulating compliance.

---

## PART B — Non-Negotiable Business Rules

1. One patient can have multiple encounters.
2. Multiple encounters can occur on the same day.
3. There is **no** universal "maximum N visits/day" rule.
4. Double-click/duplicate-submission protection prevents duplicate *transactions*, not legitimate encounters.
5. An existing open encounter does not permanently block creation of another encounter.
6. The system must first determine whether a new service belongs to an existing encounter before creating a new one.
7. Different departments do not automatically mean different encounters.
8. A genuinely unrelated patient interaction may create another encounter even on the same day.
9. The continuation window (default 6 hours) is configurable **facility policy**, not a hard-coded database definition of an encounter.
10. Triage is conditional by service/pathway — not universally mandatory.
11. Pharmacy-only and laboratory-only encounters may bypass triage.
12. Patient identity is permanent; encounters are separate episodes.
13. Patient count, encounter count, and service/activity count must remain distinct in all reporting.
14. All important movements and corrections must be auditable.
15. Never silently destroy historical records — soft-delete/amend, don't hard-delete clinical or financial history.

---

## PART C — Encounter Continuation Logic (the core workflow change)

### C.1 Duplicate submission protection

Implement idempotent encounter creation (idempotency key or equivalent transaction-safe mechanism). Same request submitted twice (double-click, network retry) → **one** encounter. A genuinely new legitimate interaction → **allowed**, even seconds later.

### C.2 Continuation window

```
Patient requests service
   ↓
Check existing active/recent encounters for this patient
   ↓
Is this the same episode of care?
   ├── YES, within configured continuation window (default 6h)
   │     → Continue existing encounter (no new row, no new encounter_no)
   └── NO, or outside the window
         → Create new encounter
```

The 6-hour rule does **not** mean "everything after 6 hours automatically becomes a new encounter" — the relationship between the interaction and the existing episode matters, not just elapsed time. If an authorized user overrides the normal continuation decision, require a reason and record it in the audit log.

**Worked example:** Patient registers 10:00 AM for abdominal-pain investigation (ENC-001, Laboratory). Encounter stays open. Patient returns 3:00 PM for Pharmacy related to the same episode → still ENC-001 (Laboratory + Pharmacy as two services within one encounter), *not* a new ENC-002 just because the department changed. If the 6 PM pharmacy visit is genuinely unrelated, it becomes ENC-002 — both are valid on the same day.

### C.3 Continuation vs. new encounter is NOT the same as visit classification

| Concept | Meaning |
|---|---|
| **First visit** | Patient's first recorded encounter with the facility/service |
| **Revisit** | Patient returns for another encounter |
| **Continuation** | Patient continues an existing encounter/episode |
| **Follow-up** | A planned subsequent clinical encounter related to an earlier one |
| **Appointment** | Scheduled future attendance; not itself a completed encounter |
| **New encounter** | A distinct interaction/episode requiring its own encounter record |
| **Service/activity** | What happens within an encounter |
| **Initial** (treatment phase) | Clinical treatment-phase concept — **not** the same as "first visit" |

`visit_sequence` (1st, 2nd, 3rd... derived automatically, never typed by staff) and `visit_classification` (`FIRST_VISIT` / `REVISIT` / etc.) are metadata *about* an encounter, computed from real chronological history — never the encounter's primary key.

```
Encounter Number ≠ Visit Sequence ≠ Visit Classification
```

**Non-negotiable:** Do NOT map `FIRST_VISIT → ICD-10 7th character A` automatically. ICD-10-CM 7th-character injury classification depends on treatment *phase*, not chronological visit order. A third visit can still be "active treatment" (character A); a second visit could already be "routine healing" (character D).

### C.4 Revisit / Follow-up relationships

```
ENC-001 (First Visit, abdominal pain)
   ↓
ENC-002 (Revisit)
   related_encounter_id = ENC-001
   purpose = FOLLOW_UP   [only if it actually is one]
```

`Appointment → Patient arrives → Encounter created/activated → visit_classification = REVISIT → purpose = FOLLOW_UP`. These stay three separate fields, never collapsed into one assumption.

---

## PART D — Master Patient Index (MPI) / Client Registry

Treat the Patient Registry as the single authoritative identity layer.

```
PATIENT/CLIENT
   ├── Demographic Identity
   ├── Contact Information
   ├── Identifiers
   ├── Identity Verification
   ├── Duplicate Detection
   └── Patient Status
          ↓
   MULTIPLE ENCOUNTERS
```

Never create a new patient record merely because they return another day, attend another department, change service, have another appointment, or receive treatment at another service point — always search/match against the existing MPI first.

### D.1 MPI landing page functions
Search · Register · Open patient · View demographics · View encounters/current status · Start/continue encounter · Schedule appointment · View appointments/admissions/discharge/transfer history · View longitudinal record.

### D.2 Search support
TibaMax Patient Number, Client Registry ID, National ID, Passport, Birth Certificate, other approved ID, phone, first/last/other names, DOB, name+DOB, phone+DOB, encounter number. Fast, paginated, server-side filtered — never load the whole register into the browser.

### D.3 Search results (minimum necessary data only)
Patient No · Name · DOB/age · sex · phone · identification indicator · current encounter status · last encounter · actions (`Open` / `Start Encounter` / `Continue` / `Schedule` / `View History`).

---

## PART E — Identifiers (keep distinct — never merge)

Store separately, never conflated:

```
patient_id             — internal DB key
patient_no             — TibaMax facility/system identifier (unique, immutable, never recycled)
client_registry_id     — national digital-health integration ID (nullable until integration exists)
national_id             — identity document, not universally mandatory
identification_type / identification_number
sha_identifier          — payer/insurance identifier
facility_mrn             — facility-specific
```

Do not force reception staff to invent/type a Client Registry ID. Do not make `client_registry_id = national_id`. Do not require National ID from every patient (data minimisation).

### `patient_identifications` table

| Field | Notes |
|---|---|
| id, patient_id | |
| identification_type | National ID, Passport, Birth Certificate, Refugee ID, Asylum Seeker Pass, Movement Pass, other — configurable |
| identification_number | |
| issuing_country | |
| verified, verification_method, verified_by, verified_at | |
| is_primary | |
| created_at, updated_at | |

Every identifier record should also carry: issuing authority, verification status/date, source, effective date, expiry date where applicable.

---

## PART F — Duplicate Detection & Merge

### F.1 Detection (before every new registration)
Match on: exact identification number, phone, patient number, name+DOB, name+phone, name+DOB+sex, other configurable similarity rules, Client Registry ID where available.

```
Exact Match → Possible Match → Manual Verification → Create New OR Link to Existing
```

Show "Possible existing patient" with minimum necessary info. Allow: Open existing / Confirm different person / Cancel registration. Never auto-create a duplicate. If an authorized user overrides the warning, record user, timestamp, matching records, and reason.

### F.2 Merge / identity resolution
Authorized users (Records Officer/admin) can merge confirmed duplicates:
- Select surviving patient
- Merge permitted demographic info
- Re-link encounters, appointments, billing, lab/pharmacy references
- Preserve original patient IDs in merge history
- Never silently destroy history

`patient_merge_log`: source patient, surviving patient, merged by, date/time, reason, affected records. Provide an auditable merge/unmerge history subject to authorization.

---

## PART G — Registration & Demographics

### G.1 Fields (data minimisation — don't collect what isn't needed)
**Identity:** first/middle/last name, DOB, sex, nationality, identification type/number where applicable.
**Contact:** primary phone, phone ownership, alternative phone, email where applicable.
**Residence:** county, sub-county, ward, village/estate, physical address where needed.
**Guardian/NOK:** for minors — guardian name, relationship, ID type/number, phone. For adults — next-of-kin name, relationship, phone.
**Administrative:** payer, SHA/insurance details where applicable, family account where applicable.

### G.2 Age
Store DOB, never a static age field. Calculate age dynamically (years/months/days as appropriate) for display, paediatric classification, reporting, service routing, eligibility. Reject future DOB. Never silently overwrite DOB.

### G.3 Sex/gender
Replace free-text/simplistic Male-Female-Other with a controlled value list appropriate to the facility's approved data standard — no arbitrary free text.

### G.4 Phone validation
Normalize Kenyan numbers (e.g. `0712345678` → `+254712345678`), validate length/format. Phone ownership: Patient's own / Parent / Guardian / Spouse / Other — guardian/parent phone allowed for children.

### G.5 Guided registration workflow
1. Search existing patient
2. Register new only if no appropriate match
3. Demographics
4. Identification
5. Contact/residence
6. Guardian/NOK where applicable
7. Payer where applicable
8. Select requested service/pathway
9. Determine whether triage is required
10. Create/continue appropriate encounter
11. Route to queue

---

## PART H — Encounter & Service Data Model

Prefer a proper `encounters` table conceptually. If a full rename is riskier than needed, `visits` may be preserved **temporarily as a compatibility layer** with its semantics refactored to represent encounters — but the target model is:

### `encounters` (or `visits` acting as this layer)
```
id, encounter_no, patient_id
encounter_type, patient_type
start_datetime, end_datetime
status                    -- Open, In Progress, Awaiting Result, Awaiting Service,
                             Completed, Cancelled, Admitted, Transferred, Discharged
current_service, current_location
reason, priority
visit_sequence            -- derived, numeric (1st, 2nd, 3rd...)
visit_classification      -- FIRST_VISIT, SECOND_VISIT, REVISIT, FOLLOW_UP, EMERGENCY, ...
parent_encounter_id / related_encounter_id
continuation_of_encounter_id
appointment_id
created_by, completed_by, completion_reason
created_at, updated_at
```

Do not close an encounter simply because one department finished its work — a pending lab result should keep the relevant activity open where applicable.

### `encounter_services` (activities within an encounter)
```
id, encounter_id
service_type              -- Registration, Triage, Consultation, Laboratory, Pharmacy,
                              Procedure, Imaging, MCH, Family Planning, Immunization,
                              Billing, Admission, ...
department_id
service_status
started_at, completed_at
provider_id
referred_from_service, referred_to_service
notes, created_by
```

This prevents an encounter from fragmenting simply because the patient moves between departments.

---

## PART I — Conditional Triage & Service Pathway Engine

Triage is **not** mandatory for every patient — driven by a `triage_required` flag per service/pathway:

```
IF triage_required = true  → route to Triage
IF triage_required = false → bypass Triage
```
Never hard-code `consultation requires triage_completed = true` universally.

### Example pathways
```
GENERAL OPD:      Registration → Triage → Consultation → Lab/Imaging/Procedure if ordered
                   → Pharmacy if required → Billing → Completion

PHARMACY-ONLY:     Lookup/registration → Pharmacy → Dispensing → Billing → Completion

LAB-ONLY:          Lookup/registration → Laboratory → Sample → Testing → Result → Completion

EMERGENCY:         Rapid ID → Emergency triage → Clinical care → Lab/Imaging/Pharmacy
                   as required → Disposition

ADMISSION:         Encounter → Clinical assessment → Admission decision →
                   Bed allocation → Admission → Inpatient care
```
Workflow must be configurable, not hard-coded per pathway.

---

## PART J — Scheduling, Queue & Flow

### J.1 Appointments
Patient lookup/autocomplete instead of raw DB ID entry. Fields: appointment number, patient, type, department/service, provider, date, time, purpose, priority, referral linkage, notes, booked by, status.

Statuses: Scheduled, Confirmed, Arrived, In Service, Completed, Missed, Cancelled, Rescheduled, LTFU.

Support rescheduling, cancellation reason, reminders, recurring appointments, provider/department availability, conflict detection. Prevent double-booking unless an authorized override applies.

**On arrival:** never auto-create a new patient. Locate patient → locate appointment → create/associate the appropriate encounter → update `Scheduled → Arrived` → route by service.

### J.2 Queues
Centralized, based on service/department/priority/arrival/appointment status/triage priority/encounter status. Example queues: Reception, Triage, Consultation, Laboratory, Pharmacy, Procedure, Imaging, Admission, Discharge.

Each queue row shows: queue number, patient no, name, age/sex where appropriate, encounter number, arrival time, waiting time, priority, service, current status.

Priority levels: Emergency, Urgent, High, Normal, Low — reception cannot arbitrarily assign clinical priority unless role permits it.

Queue states: Waiting, Called, In Service, Paused, Referred, Completed, No-show, Cancelled — track every movement.

### J.3 Patient flow audit
Every movement generates a stage/service log entry: from, to, user, timestamp, reason/notes. Never silently change locations. Respect the `location_locked` concept — but note (per this repo's own recent fix) that lock should apply once an encounter is **finalized** (discharged/completed), not after the first department move, since one encounter legitimately spans multiple services.

---

## PART K — Admission, Discharge & Transfer (ADT)

### K.1 Admission
Linked to patient + encounter. Fields: admission number, admitting provider, ward, bed, admission date/time, diagnosis/reason, notes, admission source/type. Creates/associates an inpatient episode without destroying encounter history.

### K.2 Bed management
Ward/bed status: Available, Reserved, Occupied, Cleaning/Turnaround, Maintenance, Blocked. Prevent two admissions occupying the same bed — use transaction/locking for bed assignment.

### K.3 Transfer
Ward↔ward, bed↔bed, department↔department, service↔service, facility↔facility. Fields: transfer number, patient, admission/encounter, from/to location, requested by, approved by, reason, date/time, handover notes, receiving staff, status (Requested, Approved, In Transit, Received, Cancelled). Preserve transfer history — never overwrite the old ward/bed.

### K.4 Discharge
Fields: discharge date/time, diagnosis, condition (Improved, Recovered, Referred, Transferred, LAMA, Deceased — configurable, never auto-defaulted to "Improved"), notes, destination, follow-up instructions/date, discharged by, medications/instructions.

Release the bed, update admission status, update encounter disposition — all transactionally. Preserve complete history.

### K.5 Inpatient relationship
`PATIENT → ENCOUNTER → ADMISSION → BED/WARD → INPATIENT SERVICES`. Nursing notes, medication administration, investigations stay linked to admission/encounter/patient — never spawn unrelated patient records during admission.

---

## PART L — Billing, Pharmacy & Laboratory Integration

Every billable service links to patient + encounter + service/activity + invoice — never just patient ID, to avoid mixing different encounters' finances.

**Pharmacy:** receives consultation prescriptions, ward medication requests, or pharmacy-only requests — each linked to patient/encounter/prescription/dispensing event. Moving to Pharmacy does not force a new encounter.

**Laboratory:** orders linked to patient, encounter, ordering provider, service, test order, specimen, result. A pending result keeps the relevant activity open where applicable — don't close the whole encounter just because the patient physically left the lab.

---

## PART M — Kenya Digital Health & Interoperability Layer

*(This section is the newest addition — it extends, and does not replace, everything above.)*

### M.1 Client Registry integration readiness
Keep `client_registry_id` nullable until national integration exists. Never fake a national ID or locally generate a Client Registry ID unless integration explicitly permits it. Prepare an integration layer for: client lookup, client registration, identity matching, Client Registry ID retrieval, demographic sync, encounter updates.

### M.2 Data quality engine
Automated checks throughout Patient Management:
- **Required-field validation** — block genuinely incomplete records
- **Format validation** — phone, date, identifier, email, age, facility code, service code
- **Logical validation** — DOB not in future; discharge date ≥ admission date; appointment date ≥ booking date; encounter end ≥ start; child age consistent with DOB; pregnancy-related contextual validation
- **Duplicate validation** — probable duplicate patients/encounters
- **Referential integrity** — no orphaned encounters, services, appointments, referrals, admissions, discharges, claims, lab orders, pharmacy transactions

### M.3 Standardized terminology / data dictionary
Centralized, configurable dictionaries (not hard-coded in frontend) for: facilities, departments, services, clinical specialties, encounter types, visit classifications, diagnoses, procedures, lab tests, medicines, units, payment methods, payers, referral types, admission/discharge types, patient statuses, administrative classifications.

Each coded value: `code, display_name, description, status, version, effective_date, retirement_date, source`.

### M.4 Versioned data dictionary
Version the dictionary itself (e.g. `2026.1`) so historical records remain interpretable under the terminology version applicable when they were created, even after standards change.

### M.5 API-first / interoperability architecture
```
TibaMax Frontend → Application/API Layer → Core HMIS / Integration Layer / Reporting Layer → External Systems
```
No critical workflow may depend on direct database access. External integrations go through controlled APIs — never expose the DB directly.

### M.6 Health Information Exchange readiness
Integration layer should support Send / Receive / Validate / Transform / Map / Acknowledge / Retry / Audit for exchanges with national digital-health systems, county systems, referral facilities, labs, pharmacies, insurers/SHA, approved registries. External integration failures must never silently corrupt local records.

### M.7 Integration message log
Per-transaction record: Integration ID, timestamp, source, destination, message type, patient/encounter reference, payload version, status (`PENDING, SENT, RECEIVED, ACKNOWLEDGED, FAILED, RETRYING, REJECTED`), response, retry count, error, processed by/system. Don't expose sensitive payload contents unnecessarily in ordinary UI.

### M.8 Referral & counter-referral
```
Facility A → Referral → Facility B → Treatment → Counter-referral → Facility A
```
Own identifier (e.g. `REF-2026-000145`). Track: referring/receiving facility, referring provider, reason, urgency, clinical summary, destination, date/time, status, acceptance, treatment outcome, counter-referral, related patient/encounter. Never create a new patient just because another facility refers them.

### M.9 Encounter interoperability
External systems must distinguish Patient / Encounter / Service / Order / Result / Referral / Appointment / Admission / Discharge / Claim — never flatten into one generic transaction. A lab result must stay tied to its order and encounter.

### M.10 SHA / payer readiness
Payer abstraction, not a single hard-coded payer:
```
PAYER → SHA / Private Insurance / Corporate / Cash / Other configured payer
```
Coverage info: payer, membership/beneficiary ID, eligibility status, verification status/timestamp, coverage period, authorization where applicable, service eligibility, claim reference/status. Keep clinical and financial/claims records separate but controllably linked.

### M.11 Claim traceability
```
Patient → Encounter → Services → Orders/Results → Charges → Claim
```
Every claim must trace back to the underlying service. Never silently modify clinical service info after a claim is submitted — corrections go through controlled amendment/audit processes.

---

## PART N — RBAC (merged, single source of truth)

| Role | Can | Cannot (without explicit permission) |
|---|---|---|
| **Receptionist** | Search/register patients, update permitted demographics, create appropriate encounters, schedule, manage reception queue | Clinical notes, diagnoses, lab results, medication history, sensitive clinical info |
| **Records Officer** | MPI management, demographic corrections, duplicate resolution, encounter record admin, authorized corrections, audit review | — |
| **Nurse/Triage** | Triage, vitals, priority, queue management within role | — |
| **Doctor/Clinician** | Consultation, diagnosis, treatment, referrals | Front-desk registration (confirmed intentional in this repo) |
| **Pharmacist** | Prescriptions, dispensing, pharmacy transactions | — |
| **Lab Technician** | Orders, specimen processing, results | — |
| **Admissions/ward staff** | Admission, bed management, transfers, nursing records, discharge workflows as permitted | — |
| **Cashier** | Billing, payments | Detailed clinical information |
| **Administrator** | Operational configuration | — |
| **Super Administrator** | Controlled system-level administration | — |

Access is role-based and auditable, not granted merely for being an employee. Do not expose all patient data simply because a user can open a patient record.

---

## PART O — Audit Trail & Privacy (merged)

### O.1 Audit every sensitive action
Who, what, when, where/system, before, after, reason where required. Covers: patient creation/modification, identifier modification, duplicate detection/merge/unmerge, encounter creation/continuation/new-after-existing/cancellation/completion, queue movement, triage priority changes, admission, transfer, discharge, bed changes, appointment changes, unauthorized attempts, clinical record amendment, referral, claims, payer verification, external integration, user access, permission changes.

Audit logs must not be editable through normal application functions.

### O.2 Clinical record amendment
Never silently overwrite historical clinical info:
```
Original Value → Amendment → New Value → Reason → User → Timestamp
```
Original remains recoverable per retention/governance rules.

### O.3 Privacy by design
Show only what the user's role needs. Reception shouldn't automatically see unrestricted clinical notes; cashiers shouldn't automatically see detailed clinical info. Sensitive info must never leak into notifications, URLs, browser logs, application logs, audit displays, or error messages.

### O.4 Deletion policy
Patient deletion stays a controlled soft-delete process. Clinical/financial records retain integrity — never casually, permanently deleted.

---

## PART P — Data Integrity, Performance, API Design

### P.1 Database integrity
Foreign keys, unique constraints, indexes, transactions, row locking where required, check constraints, immutable identifiers, audit records.

**Must be transactional:**
- Admission: create admission + occupy bed + update encounter
- Discharge: update admission + release bed + update encounter
- Transfer: create transfer + update old location + assign new location
- Encounter creation: create encounter + initial service + queue entry (where applicable)

### P.2 Performance
Index: patient_no, identification number, phone, names, DOB, client_registry_id, encounter number, patient_id, appointment date, encounter status, queue status. Server-side filtering and pagination — never load the full patient register into the browser.

### P.3 API design (logically separated, never over-exposing sensitive data)
```
GET  /patients/search
GET  /patients/:id
POST /patients
PUT  /patients/:id
GET  /patients/:id/encounters
POST /encounters
POST /encounters/:id/continue
POST /encounters/:id/services
POST /encounters/:id/complete
POST /encounters/:id/cancel
GET  /queues
POST /queues/:id/call
POST /queues/:id/complete
GET  /appointments
POST /appointments
PUT  /appointments/:id
POST /admissions
POST /transfers
POST /discharges
```

### P.4 Data quality rules — never allow
Future DOB · impossible encounter timestamps · duplicate patient/encounter numbers · duplicate active bed assignment · invalid appointment status · invalid identification type · encounter without patient · admission without required encounter · transfer without source location · discharge without admission · queue entry without encounter/service. Legitimate exceptions require authorized override + audit reason.

### P.5 Offline/downtime readiness (where applicable)
```
Local temporary identifier → Synchronization → MPI matching → Identity resolution → Permanent identifier
```
Conflicts surfaced for controlled resolution — never silently overwritten.

### P.6 Data export/portability
Preserve patient identity, encounter relationships, timestamps, service relationships, identifiers, provenance; use standardized mappings; maintain auditability. Never flatten patient→encounter→service relationships into a destructive flat export when a structured export is required.

---

## PART Q — Security of Integrations

Authentication, authorization, encryption in transit, secure credential management, rate limiting, input/output validation, replay protection where appropriate, audit logging, failure/timeout/retry handling, monitoring. Never place secrets in frontend code or expose DB credentials through APIs.

---

## PART R — UX Design & Dashboard

Maintain existing TibaMax visual language: clean white surfaces, teal primary accents, rounded cards, soft borders/shadows, responsive layout, clear status badges, readable tables, accessible forms, consistent buttons, mobile-friendly. Patient Management should feel like one unified workspace, not disconnected pages.

### Patient Management Dashboard
- **KPI cards:** patients registered today, active encounters, waiting patients, appointments today, admissions today, discharges today
- **Quick actions:** Find Patient, Register Patient, New Encounter, Schedule Appointment, Queue, Admission, Discharge
- **Current queues:** Reception, Triage, Consultation, Laboratory, Pharmacy, Admission
- **Recent patients:** recent registrations/encounters
- **Alerts:** possible duplicate, emergency queue, long-waiting patient, appointment conflicts, pending discharge, bed availability

### Patient record page (`/patients/[id]`)
**Header:** patient number, name, age, sex, phone, key alerts, allergies, blood group where available.
**Quick actions:** Start appropriate encounter, Continue encounter, Schedule appointment, View appointments, Admit, View admissions, View encounter history. Never auto-route every new visit to Triage — routing depends on selected service/pathway.

**Longitudinal history (encounter timeline, not a flat visit list):**
```
02 Aug 2026  10:00  ENC-001  Abdominal pain  → Laboratory → Result pending → Pharmacy
02 Aug 2026  18:00  ENC-002  Unrelated OTC request → Pharmacy-only
10 Aug 2026  09:30  ENC-003  Follow-up → Consultation
```
Show: encounter number, date/time, type, reason, service, status, current location, provider where appropriate, outcome. Don't expose clinical info to unauthorized users.

### Encounter card display
```
┌─────────────────────────────────────────┐
│ ENC-20260805-002                        │
│ Second Visit • Revisit • Follow-up     │
│ Related to: ENC-20260802-001            │
│ Date: 05 Aug 2026   Status: Completed   │
└─────────────────────────────────────────┘
```
Never display only "Visit #2" — that hides the real encounter identifier.

---

## PART S — Reporting (distinct denominators, always)

- **Patient count** = `COUNT(DISTINCT patient_id)`
- **Encounter count** = `COUNT(encounter_id)`
- **Visit sequence** = first/second/third/etc. classification
- **Revisit count** / **Follow-up count** / **Service-activity count** — each separate

`1 patient + 4 services ≠ 4 patients`. `1 encounter + 5 services ≠ 5 encounters`.

Also report: daily registered patients, new vs returning, encounters/day, multi-encounter patients, service utilization, queue waiting times, appointment attendance/misses, admissions/discharges/transfers, bed occupancy, flow bottlenecks.

---

## PART T — Edge-Case Testing (merged checklist)

**Identity/Registration:** no ID, National ID, passport, birth certificate, refugee/asylum ID, child/adult/elderly, future DOB, invalid/missing/shared/guardian phone, duplicate ID/phone, similar names, same name+DOB, long/hyphenated/apostrophe/Unicode names, exact duplicate, probable duplicate, merged patients, attempted unmerge.

**Encounters:** first/second/third visit, revisit, follow-up, continuation within window, new encounter after window, unrelated same-day service, one encounter across multiple departments, cancelled/abandoned/completed/admitted/transferred/discharged encounter, closed encounter reopened under authorized workflow.

**Double-submit / concurrency:** two identical requests → one record. Two users creating the same encounter simultaneously → no unintended duplicate.

**Queue:** emergency vs normal patient, priority change, patient leaves/returns, called twice, department transfer, wrong-department routing.

**Appointments:** double booking, cancellation, reschedule, missed, early/late arrival, missing provider/department, duplicate submission.

**Admission/ADT:** unavailable bed, simultaneous bed booking, transfer, discharge, bed release, discharge after transfer, deceased disposition.

**Referrals:** accepted, rejected, pending, counter-referral, referral without returned info.

**Integration:** successful transaction, timeout, duplicate message, rejected/malformed message, external system unavailable, retry, partial failure.

**Claims:** eligible/ineligible patient, failed verification, duplicate/corrected/cancelled claim.

**Security:** receptionist attempting clinical access, unauthorized demographic edit/encounter deletion/merge/priority change/discharge, expired session, revoked user, duplicate API request, direct API access without permission, role escalation attempt, audit trail verification.

---

## PART U — Acceptance Criteria (merged, deduplicated)

Patient Management is complete only when:

1. Patient search works quickly, existing patients found before new registration.
2. Duplicate patients are actively detected and controlled.
3. Patient IDs are unique, immutable, independent of National ID / Client Registry ID.
4. Identification types are separate from National ID; Client Registry ID is separate and nullable.
5. Age is calculated from DOB, never manually stored as primary.
6. Multiple legitimate encounters per day are supported — no arbitrary visit cap exists anywhere.
7. Double-submit never creates duplicate encounters.
8. Existing encounters can continue; new encounters can be created when legitimately required.
9. The configurable continuation-window policy works and is not hard-coded.
10. Unrelated same-day encounters are supported; one encounter can contain multiple services.
11. Triage is conditional; Pharmacy-only and Laboratory-only can bypass it; General OPD can require it.
12. Queue routing, appointment lookup-based booking, and conflict detection all work.
13. Admission is linked correctly; bed allocation is transaction-safe; transfers/discharges preserve history.
14. Patient history is longitudinal; patient/encounter/service counts are reported separately.
15. RBAC is enforced; important changes are audited; clinical history is never casually deleted.
16. Patient merge is controlled and auditable.
17. Visit sequence is separate from encounter ID; ICD-10 treatment phase is never inferred from visit sequence.
18. Referral/counter-referral relationships are preserved; external integrations are API-based and auditable.
19. Payer/SHA architecture is extensible, not hard-coded; clinical amendments are auditable.
20. Data dictionaries/terminology are versioned; historical records remain interpretable after standards change.
21. Integration failures cannot silently corrupt patient records.
22. Server-side and frontend validation both exist; edge cases are tested.
23. Existing modules continue working; existing data is preserved during migration.
24. No facility selector introduced into the current single-facility workflow; architecture stays multi-facility-ready.
25. No working functionality is removed without a migration/replacement.

---

## PART V — Implementation Method (phased)

1. **Repository analysis** — inspect existing patient/visit/appointment/queue/triage/consultation/lab/pharmacy/admission/discharge/transfer/billing/RBAC/audit/migration structures. Don't duplicate what exists.
2. **Database design** — additive, safe migrations first.
3. **Backend** — MPI APIs, duplicate detection, encounter engine, continuation logic, service routing, queue APIs, appointment improvements, ADT APIs, audit logging, RBAC.
4. **Frontend** — Patient Management dashboard, MPI, registration, patient record, encounter creation, service selection, queue management, scheduling, ADT.
5. **Integration verification** — Registration → Encounter → Service → Queue → Triage if required → Consultation/Lab/Pharmacy/etc. → Billing → Completion; and Encounter → Admission → Inpatient → Transfer → Discharge.
6. **Testing** — unit, API, database, integration, RBAC, edge-case, concurrency, duplicate-submission, migration tests.
7. **Final review** — git diff inspection, migration check, API error check, browser console check, responsive UI check, RBAC check, audit trail check, full patient-flow scenario check, confirm no existing module broke.

---

## PART W — Final Deliverable Checklist (per implementation phase)

1. Files changed
2. New files
3. Database migrations
4. New tables/columns
5. API changes
6. Frontend changes
7. RBAC changes
8. New business rules
9. Edge-case tests
10. Test results
11. Migration considerations
12. Remaining limitations
13. Recommended next development stage

---

*End of merged specification. Original sources: (1) AFYATAB/TIBAMAX Comprehensive Patient Management Implementation Prompt, sections 1–65; (2) Visit Classification addendum, sections 66–77; (3) Kenya Digital Health & Interoperability Architecture Addition, sections 1–28. Where the three overlapped (same-day encounters, duplicate detection, RBAC, audit trail, patient/encounter/service count separation), content was consolidated rather than repeated.*