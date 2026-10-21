# e-TUGIS Project Workflow

**Project:** Electronic Tracking of Unserved Warrants by Generating Individualized-code System (e-TUGIS)  
**Project partners:** Cagayan State University - Solana Campus; Solana Police Station (PNP); LGU Solana  
**Purpose:** Describe the operational and system workflow to guide requirements validation, implementation, and acceptance.

## 1. Project team and operational roles

| Person / group | Responsibility in this project |
|---|---|
| Kalvin Karl Nonato | Back-end API; data model, identifiers, business rules, validation, status history, and reporting endpoints |
| Manolita Cabactulan | Front-end; user workflows, data-entry screens, search, alerts, and dashboards |
| Bernadette Dela Cruz | System analyst; process validation, requirements, data definitions, acceptance criteria, and stakeholder coordination |
| Solana Police Station (PNP) | Operational owner; validates source records, jurisdiction, statuses, assignments, and operational access |
| LGU Solana | Project partner; supports only the responsibilities and data access formally agreed with PNP and CSU |
| Cagayan State University - Solana Campus | Academic/project partner; supports analysis, development, review, and documentation |

The PNP must designate authorized data stewards, warrant encoders, field warrant servers, and reviewing supervisors. Their exact names, permissions, and approval authority must be confirmed by the station before implementation.

## 2. Goals and boundaries

### Goals

- Harmonize the old, manually uploaded, and enhanced warrant datasets into one searchable system of record.
- Assign one stable **Person ID** to each verified individual and one **Warrant ID** to each verified warrant/case record, while supporting multiple accused persons on a shared warrant or case.
- Identify possible duplicate people, warrants, and re-issued warrants for authorized review.
- Track wanted-person and warrant statuses, jurisdiction, assignment, and status-update history.
- Provide case/person profiles, operational dashboards, at-large and unserved-warrant reports, and source-specific aging alerts.
- Complement the existing e-warrant system; do not imply replacement or direct integration unless PNP approves and the integration is available.

### In scope from the supplied materials

- Person and warrant master records, search, duplicate checks, status tracking, generated identifiers, summary/reporting, jurisdiction validation, and aging alerts.
- Initial harmonization of the three identified warrant sources: **Old**, **Manual Upload**, and **Enhanced**.
- Recording field and station updates to active records, subject to authorized access and PNP review rules.

### Not established by the supplied materials

- Direct e-warrant, court, LGU, or other agency integrations.
- Public access, public wanted-person search, or LGU access to identifiable warrant/person records.
- Automated legal determinations, automatic warrant service, or automatic case closure.
- Final retention, hosting, backup, incident-response, and data-sharing policies.

These items require written stakeholder and PNP approval before they are treated as requirements.

## 3. Core records and data rules

### Person record

The current process, person master includes a Person ID, full name, aliases/AKA, last known address, person status, and warrant source. The application should also record who created or changed the record and when. A person may be linked to multiple warrants/cases.

### Warrant and case record

Based on the existing process by the PNP, the warrant master includes Warrant ID, Person ID, accused name, criminal case number, offense, issuing court, date issued, date received, warrant status, warrant source, and latest status. Accused name should be displayed from the linked person record rather than maintained as a conflicting duplicate.

It contains a shared Warrant ID for multiple accused persons. The data model must therefore support a warrant/case linked to more than one person; a new accused should not force creation of a duplicate case/warrant.

### Identifiers and duplicate handling

- Generate Person IDs and Warrant IDs in the system; users must not choose or reuse identifiers manually.
- Treat an ID as a record key, not proof of identity, legal validity, or authority to serve a warrant.
- A matching name is only a **possible duplicate**. Do not automatically merge people based on name alone.
- Search likely matches using available identifying information and warrant/court/case details; an authorized PNP reviewer confirms whether records represent the same person or warrant.
- For a confirmed re-issued or duplicate warrant, retain the existing canonical Warrant ID as specified in the flowchart and link the new source document/entry to that record.
- Keep one effective current status for operational views. Preserve prior status changes and source records in an audit/history trail rather than deleting them.

### Statuses from the current process

Person statuses include **At large**, **Arrested**, **Posted bail**, **Voluntarily surrendered in court**, **Deceased**, and **Acquitted**. Warrant statuses include **Unserved**, **Served**, **Partially served**, **Lifted**, **Archived/Returned**, and **Withdrawn/cancelled/dismissed**.

The authorized PNP owner must approve the status dictionary, allowed transitions, who may apply each status, and the supporting evidence required. A person status and a warrant status are separate: changing one must not silently overwrite the other.

## 4. End-to-end operational workflow

### A. Prepare and harmonize initial data

1. **Authorize the migration.** PNP identifies approved source files, accountable data stewards, permitted users, and the authoritative source for disputed records.
2. **Inventory each source.** Label each record as Old, Manual Upload, or Enhanced; preserve the source reference, date received (if available), and import batch.
3. **Map fields.** Map names, aliases, addresses, person/warrant statuses, case numbers, offense, issuing court, dates, and source to the approved data dictionary. Keep missing values explicit; do not invent values.
4. **Validate format and required fields.** Flag missing or invalid names, source, case identifiers, dates, and statuses for correction. Preserve the raw imported value for traceability.
5. **Find potential person matches.** Search existing persons using name and aliases plus other approved identifying details. Show likely matches to an authorized reviewer.
6. **Resolve person matches.**
   - If a reviewer confirms an existing person, link the new source record to that Person ID and add verified aliases/details without overwriting better data silently.
   - If the records are distinct, create a new person and generate a Person ID.
   - If the evidence is inconclusive, place the record in a review queue; do not merge or create a definitive identity automatically.
7. **Find potential warrant/case matches.** Compare the issuing court, normalized case number, person/accused links, source, and any re-issue information. Flag a shared case and a re-issued warrant as different cases in which an existing Warrant ID may need to be reused.
8. **Resolve warrant matches.**
   - If confirmed new, create the warrant/case record and generate a Warrant ID.
   - If confirmed as an additional accused on the same case, link that person to the existing Warrant ID.
   - If confirmed as a re-issue, retain the canonical Warrant ID, attach the new source details, and set the current status only after PNP review.
   - If uncertain, queue for review and prevent duplicate publication in operational reports.
9. **Validate jurisdiction and assignment.** An authorized PNP user confirms the legally/territorially responsible station using approved rules or authoritative information. Keep unresolved records unassigned and flagged. Any approved exception must record the approver and rationale.
10. **Reconcile and approve the import.** A PNP supervisor/data steward reviews import totals, unresolved items, duplicate decisions, status conflicts, and jurisdiction exceptions before migrated records become operational.

### B. Enter or update a person

1. An authorized user opens person entry and supplies the required name, aliases/AKA if known, last known address if approved, person status, and source/context.
2. The system validates required fields and searches for likely duplicates before saving.
3. If a likely match is found, show the existing profile and comparison details. The user must select an authorized resolution: link to the existing person, confirm a distinct person, or defer for review.
4. For a new, verified person, the system creates a Person ID. For an existing person, it updates only the approved fields and records the change history.
5. The system displays the resulting profile and linked warrants. It must not mark a person as a warrant target solely because a person record exists.

### C. Enter or update a warrant

1. An authorized user selects the verified Person ID (one or more accused may be linked to a shared case/warrant).
2. The user enters the criminal case number and available warrant information: offense, issuing court, issue/received dates, source, initial warrant status, and source reference/document as policy permits.
3. The system checks required fields and searches for a matching case/warrant or re-issue.
4. If no match is confirmed, create the warrant/case and generate its Warrant ID. If an existing case has another accused, link the person to that Warrant ID. If a re-issue is confirmed, reuse the canonical Warrant ID and preserve the prior record and history.
5. The system performs a jurisdiction check. A record that is unverified or out of the station's jurisdiction is held for review rather than silently assigned.
6. An authorized PNP user confirms the current status and assignment. The system records the actor, time, source, and reason/evidence reference for the decision.
7. Save the record and refresh linked person/warrant profiles, search results, dashboard counts, operational reports, and alert eligibility.

### D. Search, review, and operational profiling

1. An authorized user searches by name/alias, Person ID, case number, Warrant ID, status, source, court, or assignment, subject to role permissions.
2. The system returns linked person and warrant/case profiles and indicates possible duplicates, missing data, unresolved jurisdiction, and aging alerts.
3. A warrant server or authorized supervisor reviews only the information needed for the assigned operational task and verifies the status through approved PNP procedures before action.
4. Operational reports distinguish **at-large persons** from **unserved warrants**; one person can have multiple warrants and one warrant may involve multiple accused.

### E. Record a field or station status update

1. An authorized user opens the specific person and/or warrant record and submits the observed outcome, applicable status, effective date/time, source/authority, and a concise reason or evidence reference required by PNP policy.
2. The application validates the requested transition and permissions. If the transition is not permitted or supporting details are missing, it must explain what is needed and leave the current status unchanged.
3. A supervisor reviews updates requiring approval under the PNP-approved status policy. Pending review must be visibly distinguished from an approved current status.
4. On approval, set the effective current person/warrant status, retain the prior status in history, record who approved it and when, and refresh reports and alerts.
5. Updates involving court actions, partial service, multiple accused, re-issued warrants, or conflicting reports are routed for PNP verification. No status is inferred from another person's or another warrant's outcome.

### F. Aging alerts and reports

1. On receipt, record the Date Received and source category for every warrant record when available.
2. Calculate age from Date Received and apply the flowchart thresholds:

   | Warrant source | Aging threshold |
   |---|---:|
   | Old | 3 days |
   | Manual Upload | 5 days |
   | Enhanced | 7 days |

3. Alert authorized users when an item reaches its source-specific threshold and remains eligible for follow-up. The source materials do not define calendar versus business days, alert repeat frequency, or escalation; confirm these before implementation.
4. Missing Date Received must be reported as a data-quality issue and must not be treated as zero-age or silently excluded from reconciliation.
5. Provide authorized users with at least:
   - Executive summary of unique persons, at-large persons, physical warrants, and unserved warrants.
   - Person-status and warrant-status breakdowns.
   - At-large wanted-person report.
   - Unserved-warrant report.
   - Aging/overdue report by source.
   - Duplicate-review, jurisdiction-review, missing-data, and import-reconciliation queues.
6. Reports show their generation time, applied filters, and record basis. Access and export must follow PNP-approved permissions and handling rules.

## 5. Exception paths and controls

| Situation | Required system response |
|---|---|
| Possible duplicate person | Flag and request authorized review; never merge solely on name similarity |
| Possible duplicate or re-issued warrant | Hold for review; link to canonical Warrant ID only after confirmation |
| Multiple accused on one case | Permit multiple person links to the same Warrant ID |
| Conflicting person/warrant status | Preserve current approved status; route conflict to PNP review and retain both source claims |
| Unverified jurisdiction | Keep unassigned or pending; do not distribute as an operational assignment |
| Missing/invalid required data | Identify the field and block operational approval where necessary; retain import traceability |
| Unauthorized access or update | Deny the action and record the security event according to approved policy |
| Failed import or partial save | Report the failure and affected batch; do not present an incomplete batch as successfully reconciled |

## 6. Access, privacy, and audit requirements

- PNP owns operational authorization and decides which roles may view, create, update, approve, assign, report, and export records.
- Use least-privilege role access. CSU and LGU participation does not, by itself, grant access to identifiable law-enforcement records.
- Require authenticated users and protect records in transit and at rest using the hosting environment's approved controls.
- Record auditable history for record creation, imports, merges/links, status changes, jurisdiction decisions, assignments, approvals, exports, and access-policy changes.
- Do not hard-delete operational records or prior statuses through ordinary workflows. Corrections must preserve who changed what, when, and why.
- Establish retention, backup, incident response, account deactivation, and data-sharing procedures with PNP before production use.
- Use synthetic or appropriately de-identified data for development, demonstrations, and testing unless PNP has explicitly authorized real data for that purpose.

## 7. Responsibilities across the delivery workflow

| Work item | Primary owner | Partner/reviewer |
|---|---|---|
| Confirm process, data dictionary, status rules, and acceptance criteria | Bernadette Dela Cruz | PNP data steward/supervisor; CSU and LGU representatives as agreed |
| Confirm data authority, access roles, jurisdiction rules, and operational sign-off | Solana Police Station | LGU Solana and CSU Solana Campus as agreed |
| Design API, identifiers, data validation, imports, history, alerts, and reporting logic | Kalvin Karl Nonato | Bernadette Dela Cruz; PNP technical/operational reviewer |
| Design entry, search, profile, dashboard, and alert interfaces | Manolita Cabactulan | Bernadette Dela Cruz; representative PNP users |
| Verify integrated workflows and correct data handling | Kalvin Karl Nonato and Manolita Cabactulan | Bernadette Dela Cruz and designated PNP testers |
| Approve operational readiness and production data use | Solana Police Station | Project partners |

## 8. Acceptance checks

The workflow is ready for stakeholder sign-off when testers can verify that:

- A new verified person receives one unique Person ID; a confirmed existing person is linked without creating a duplicate.
- A possible name match is flagged for review and is not automatically merged.
- A new case/warrant receives a Warrant ID; multiple accused can link to the same Warrant ID.
- A confirmed re-issue can use the canonical Warrant ID while retaining source and status history.
- Person and warrant statuses remain separate, permission-checked, and auditable.
- Unverified jurisdiction and unresolved duplicate decisions do not enter approved operational assignment/reporting as if confirmed.
- Search returns correctly linked records by the approved search keys and respects user permissions.
- Person, warrant, at-large, unserved, and aging counts are reproducible from the underlying records and documented filters.
- The Old, Manual Upload, and Enhanced aging thresholds are applied correctly once day-count and alert behavior are approved.
- Failed imports, missing required fields, and status conflicts are visible to users and cannot be mistaken for successful, approved updates.
- Unauthorized users cannot access or alter restricted records; approved changes and exports are auditable.

## 9. Source-data reconciliation and decisions to confirm

### Reconciliation issue found in the current existing process

The current-system executive summary shows conflicting warrant totals: its top summary reports **880** physical warrants and **133** unserved warrants, while its status breakdown reports **881** total warrants and **114** unserved warrants. The warrant-status breakdown figures sum to 881. These figures should be treated as workbook snapshot values, not authoritative project baselines, until a PNP data steward reconciles the underlying rows, formulas, and filters.

Before migration approval, reconcile the same measures from the source records, define whether counts refer to physical warrant documents, distinct cases/Warrant IDs, or person-warrant links, and record the filters and “as of” time used.

### Decisions needed from stakeholders

- Which source is authoritative when the Old, Manual Upload, and Enhanced records conflict?
- What exact evidence and matching rules are sufficient to confirm the same person, case, or re-issued warrant?
- Which person/warrant statuses and transitions are approved, and which require supervisor or court-document verification?
- How is territorial jurisdiction determined, who approves exceptions, and what stations may receive assignments?
- Are aging periods calendar days or business days? At what time does the threshold trigger, who receives alerts, and how often are reminders/escalations repeated?
- What should happen when Date Received is absent or unreliable?
- Which users from PNP, LGU, and CSU may access identifiable data, and may any role export it?
- What are the hosting, retention, backup, audit-log, and incident-response requirements?
- Is any direct integration with e-warrant or other agency systems approved and technically available?

Where the materials do not specify a rule, this document marks it for stakeholder confirmation instead of presenting an assumption as an approved policy.
