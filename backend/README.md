# e-TUGIS API

API-only Express and TypeScript backend for the e-TUGIS project. The initial database migration targets the MySQL protocol and has been written for the locally installed MariaDB server. No records from the source workbook are imported.

## Data Model

- `persons` and `person_aliases` keep one canonical person profile with separate searchable aliases. New profiles remain `PENDING_REVIEW` until a different ADMIN or SUPERVISOR approves or rejects publication; this is separate from the person's legal/operational status.
- `warrants` is the canonical Warrant ID; `warrant_person_links` supports multiple accused per warrant and multiple warrants per person.
- `warrant_issuances` preserves each physical issue/re-issue, source, issue/received dates, and issuance-level status without replacing the canonical Warrant ID.
- `status_change_requests`, `person_status_events`, and `warrant_status_events` keep proposed changes separate from approved current status. The API must apply a requested status only after supervisor approval.
- `warrant_assignments` records pending and approved manual station assignments. It does not infer jurisdiction.
- `user_station_memberships` scopes field warrant-server reads to approved assignments at stations linked to that account.
- `import_batches` and `import_records` provide a staging/reconciliation boundary. Raw records are not operational until reviewed; real workbook data is not included.
- `person_source_records` preserves a person's provenance across Old, Manual Upload, and Enhanced sources and can link back to an import batch.
- `duplicate_reviews` records human-reviewed candidate matches. Names alone must never trigger an automatic merge.
- `audit_events` records actor/action/entity metadata. Avoid writing credentials, tokens, or unnecessary sensitive payloads to it.
- `source_types` holds the 3/5/7-business-day aging thresholds. Alert calculation remains inactive until PNP supplies the holiday calendar, timezone, alert recipients, and reminder/escalation cadence.
- `sessions` stores server-side login sessions in MariaDB; the browser cookie is HTTP-only, SameSite Strict, and four hours long.

The initial status lookup rows reflect the supplied workflow and must be validated by the PNP owner before operational use. Missing or unapproved current statuses remain `NULL`; they are not inferred.

## Local Setup

1. Using your local MariaDB administrator interface, create the database and separate runtime/migration accounts. Use your own unique passwords in place of the placeholders; do not use the database root account for the API:

	```sql
	CREATE DATABASE IF NOT EXISTS etugis CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
	CREATE USER IF NOT EXISTS 'etugis_app'@'127.0.0.1' IDENTIFIED BY 'replace-with-a-unique-runtime-password';
	CREATE USER IF NOT EXISTS 'etugis_migrator'@'127.0.0.1' IDENTIFIED BY 'replace-with-a-unique-migration-password';
	GRANT SELECT, INSERT, UPDATE, DELETE ON etugis.* TO 'etugis_app'@'127.0.0.1';
	GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON etugis.* TO 'etugis_migrator'@'127.0.0.1';
	```

	The API process uses the runtime account; only `npm run db:migrate` uses the migration account. Run the statements through an administrator interface that already has local database privileges.
2. Copy `.env.example` to `.env` and enter the local database connection values there. Never commit `.env` or share its passwords.
3. Run `npm install`.
4. Run `npm run db:migrate`.
5. Run `npm run dev` and check `http://127.0.0.1:3000/api/v1/health/live` and `/api/v1/health/ready`.

## Current API Surface

- `GET /api/v1/health/live` checks that the process is running.
- `GET /api/v1/health/ready` checks the database connection.
- `GET /api/v1/auth/csrf` creates a CSRF token for the current cookie session.
- `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, and `POST /api/v1/auth/logout` manage local sessions.
- `GET /api/v1/people?q=&page=&pageSize=` searches by generated code, name, or alias.
- `GET /api/v1/people/:personId` returns a profile with aliases and linked canonical warrants.
- `POST /api/v1/people` creates a person with generated Person ID, aliases, and an audit event. Status remains unset until an approved status-change workflow exists.
- `POST /api/v1/people/:personId/review` lets an ADMIN or SUPERVISOR approve/reject publication with a rationale; creators cannot approve their own records.

Person access roles are provisional: ADMIN, DATA_STEWARD, ENCODER, SUPERVISOR, WARRANT_SERVER, and AUDITOR can search; ADMIN, DATA_STEWARD, and ENCODER can create. AUDITOR reads are restricted to approved records. WARRANT_SERVER reads are restricted to approved records linked to approved assignments at that user's station memberships. PNP must review this matrix before any operational deployment. Warrant, duplicate-review, assignment approval, status approval, import, and reporting routes are not exposed yet because their approval and transition policies still need confirmation.

Before creating a person, the API checks normalized exact matches across the submitted name and aliases. Matches return `409 DUPLICATE_REVIEW_REQUIRED`; the caller must not merge automatically. Only ADMIN or DATA_STEWARD can retry with every candidate ID in `confirmedDistinctFrom` and a `resolutionNote` of at least 15 characters. The distinct decision is recorded in `duplicate_reviews` and `audit_events`. This initial check is deliberately conservative and exact-match only; it does not claim fuzzy identity matching.

## Pending PNP Decisions

- Approve the provisional roles and record visibility matrix before using identifiable records operationally.
- Supply allowed person/warrant status transitions, supporting evidence requirements, and which transitions require supervisor approval. No status update endpoint is enabled until this matrix is defined.
- Provide the business-day holiday calendar, timezone, alert recipients, and reminder/escalation cadence. Thresholds are stored but no alert job runs.
- Confirm the jurisdiction evidence/rules and assignment approval criteria. Assignment decisions remain manual and must be approved.
- Resolve conflicting source values through an authorized human data-steward decision; the API does not automatically prefer Old, Manual Upload, or Enhanced.

## First Administrator

After migrations, run `npm run admin:create` from `backend/`. The command only works in an interactive terminal, prompts for a 14-128 character password without echoing it, hashes with Argon2id, and refuses to run if an administrator already exists. There are no default credentials or public registration endpoint.

## Validation

- `npm run typecheck`
- `npm test`
- `npm run build`

The server and credentials must be configured locally before migrations or readiness checks can pass. The API binds to `127.0.0.1` by default.