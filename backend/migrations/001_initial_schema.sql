CREATE TABLE IF NOT EXISTS roles (
  id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  role_code VARCHAR(40) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_code (role_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  role_id SMALLINT UNSIGNED NOT NULL,
  username VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(160) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(128) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  session_data MEDIUMTEXT NOT NULL,
  PRIMARY KEY (session_id),
  KEY ix_sessions_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stations (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  station_code VARCHAR(40) NOT NULL,
  name VARCHAR(160) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_stations_code (station_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_station_memberships (
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  station_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, station_id),
  KEY ix_user_station_memberships_station (station_id),
  CONSTRAINT fk_user_station_memberships_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_user_station_memberships_station FOREIGN KEY (station_id) REFERENCES stations (id),
  CONSTRAINT fk_user_station_memberships_created_by FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS person_statuses (
  status_code VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (status_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS warrant_statuses (
  status_code VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (status_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS issuance_statuses (
  status_code VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (status_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS source_types (
  source_code VARCHAR(40) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  aging_threshold_days SMALLINT UNSIGNED NOT NULL,
  aging_day_basis VARCHAR(24) NOT NULL DEFAULT 'UNCONFIRMED',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (source_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS persons (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  person_code VARCHAR(48) NOT NULL,
  full_name VARCHAR(240) NOT NULL,
  last_known_address TEXT NULL,
  status_code VARCHAR(50) NULL,
  status_review_state VARCHAR(24) NOT NULL DEFAULT 'UNREVIEWED',
  record_review_state VARCHAR(24) NOT NULL DEFAULT 'PENDING_REVIEW',
  record_reviewed_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  record_reviewed_at DATETIME(3) NULL,
  record_review_note TEXT NULL,
  created_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  updated_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_persons_code (person_code),
  KEY ix_persons_name (full_name),
  KEY ix_persons_status (status_code),
  CONSTRAINT fk_persons_status FOREIGN KEY (status_code) REFERENCES person_statuses (status_code),
  CONSTRAINT fk_persons_record_reviewed_by FOREIGN KEY (record_reviewed_by) REFERENCES users (id),
  CONSTRAINT fk_persons_created_by FOREIGN KEY (created_by) REFERENCES users (id),
  CONSTRAINT fk_persons_updated_by FOREIGN KEY (updated_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS person_aliases (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  person_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  alias VARCHAR(240) NOT NULL,
  created_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_person_aliases_alias (alias),
  KEY ix_person_aliases_person (person_id),
  CONSTRAINT fk_person_aliases_person FOREIGN KEY (person_id) REFERENCES persons (id),
  CONSTRAINT fk_person_aliases_created_by FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS warrants (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  warrant_code VARCHAR(48) NOT NULL,
  criminal_case_number VARCHAR(120) NOT NULL,
  offense TEXT NULL,
  issuing_court VARCHAR(200) NOT NULL,
  status_code VARCHAR(50) NULL,
  status_review_state VARCHAR(24) NOT NULL DEFAULT 'UNREVIEWED',
  created_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  updated_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_warrants_code (warrant_code),
  KEY ix_warrants_case_court (criminal_case_number, issuing_court),
  KEY ix_warrants_status (status_code),
  CONSTRAINT fk_warrants_status FOREIGN KEY (status_code) REFERENCES warrant_statuses (status_code),
  CONSTRAINT fk_warrants_created_by FOREIGN KEY (created_by) REFERENCES users (id),
  CONSTRAINT fk_warrants_updated_by FOREIGN KEY (updated_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS warrant_person_links (
  warrant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  person_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  link_role VARCHAR(40) NOT NULL DEFAULT 'ACCUSED',
  created_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (warrant_id, person_id),
  KEY ix_warrant_person_person (person_id),
  CONSTRAINT fk_warrant_person_warrant FOREIGN KEY (warrant_id) REFERENCES warrants (id),
  CONSTRAINT fk_warrant_person_person FOREIGN KEY (person_id) REFERENCES persons (id),
  CONSTRAINT fk_warrant_person_created_by FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS warrant_issuances (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  warrant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  source_code VARCHAR(40) NOT NULL,
  source_label VARCHAR(100) NULL,
  issued_at DATE NULL,
  received_at DATE NULL,
  status_code VARCHAR(50) NULL,
  source_reference VARCHAR(240) NULL,
  reissued_from_issuance_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  review_state VARCHAR(24) NOT NULL DEFAULT 'PENDING_REVIEW',
  created_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_issuances_warrant (warrant_id),
  KEY ix_issuances_source_received (source_code, received_at),
  CONSTRAINT fk_issuances_warrant FOREIGN KEY (warrant_id) REFERENCES warrants (id),
  CONSTRAINT fk_issuances_source FOREIGN KEY (source_code) REFERENCES source_types (source_code),
  CONSTRAINT fk_issuances_status FOREIGN KEY (status_code) REFERENCES issuance_statuses (status_code),
  CONSTRAINT fk_issuances_reissued_from FOREIGN KEY (reissued_from_issuance_id) REFERENCES warrant_issuances (id),
  CONSTRAINT fk_issuances_created_by FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS person_status_events (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  person_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  previous_status_code VARCHAR(50) NULL,
  new_status_code VARCHAR(50) NOT NULL,
  effective_at DATETIME(3) NULL,
  reason TEXT NOT NULL,
  evidence_reference VARCHAR(240) NULL,
  changed_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  approved_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_person_status_events_person (person_id, created_at),
  CONSTRAINT fk_person_status_events_person FOREIGN KEY (person_id) REFERENCES persons (id),
  CONSTRAINT fk_person_status_events_previous FOREIGN KEY (previous_status_code) REFERENCES person_statuses (status_code),
  CONSTRAINT fk_person_status_events_new FOREIGN KEY (new_status_code) REFERENCES person_statuses (status_code),
  CONSTRAINT fk_person_status_events_changed_by FOREIGN KEY (changed_by) REFERENCES users (id),
  CONSTRAINT fk_person_status_events_approved_by FOREIGN KEY (approved_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS warrant_status_events (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  warrant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  previous_status_code VARCHAR(50) NULL,
  new_status_code VARCHAR(50) NOT NULL,
  effective_at DATETIME(3) NULL,
  reason TEXT NOT NULL,
  evidence_reference VARCHAR(240) NULL,
  changed_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  approved_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_warrant_status_events_warrant (warrant_id, created_at),
  CONSTRAINT fk_warrant_status_events_warrant FOREIGN KEY (warrant_id) REFERENCES warrants (id),
  CONSTRAINT fk_warrant_status_events_previous FOREIGN KEY (previous_status_code) REFERENCES warrant_statuses (status_code),
  CONSTRAINT fk_warrant_status_events_new FOREIGN KEY (new_status_code) REFERENCES warrant_statuses (status_code),
  CONSTRAINT fk_warrant_status_events_changed_by FOREIGN KEY (changed_by) REFERENCES users (id),
  CONSTRAINT fk_warrant_status_events_approved_by FOREIGN KEY (approved_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS status_change_requests (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  entity_type VARCHAR(24) NOT NULL,
  entity_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  requested_status_code VARCHAR(50) NOT NULL,
  effective_at DATETIME(3) NULL,
  reason TEXT NOT NULL,
  evidence_reference VARCHAR(240) NULL,
  request_state VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  requested_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  reviewed_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  reviewed_at DATETIME(3) NULL,
  review_note TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_status_requests_queue (request_state, created_at),
  KEY ix_status_requests_entity (entity_type, entity_id),
  CONSTRAINT fk_status_requests_requested_by FOREIGN KEY (requested_by) REFERENCES users (id),
  CONSTRAINT fk_status_requests_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS warrant_assignments (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  warrant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  station_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  assignment_state VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  rationale TEXT NULL,
  requested_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  reviewed_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  reviewed_at DATETIME(3) NULL,
  review_note TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_assignments_warrant_state (warrant_id, assignment_state),
  KEY ix_assignments_station_state (station_id, assignment_state),
  CONSTRAINT fk_assignments_warrant FOREIGN KEY (warrant_id) REFERENCES warrants (id),
  CONSTRAINT fk_assignments_station FOREIGN KEY (station_id) REFERENCES stations (id),
  CONSTRAINT fk_assignments_requested_by FOREIGN KEY (requested_by) REFERENCES users (id),
  CONSTRAINT fk_assignments_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS import_batches (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  source_code VARCHAR(40) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  batch_state VARCHAR(24) NOT NULL DEFAULT 'STAGED',
  created_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  reviewed_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  reviewed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_import_batches_state (batch_state, created_at),
  CONSTRAINT fk_import_batches_source FOREIGN KEY (source_code) REFERENCES source_types (source_code),
  CONSTRAINT fk_import_batches_created_by FOREIGN KEY (created_by) REFERENCES users (id),
  CONSTRAINT fk_import_batches_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS import_records (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  source_row_number INT UNSIGNED NOT NULL,
  raw_record_json LONGTEXT NOT NULL,
  validation_state VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  validation_errors LONGTEXT NULL,
  resolved_person_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  resolved_warrant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  reviewed_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  reviewed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_import_record_row (batch_id, source_row_number),
  CONSTRAINT fk_import_records_batch FOREIGN KEY (batch_id) REFERENCES import_batches (id),
  CONSTRAINT fk_import_records_person FOREIGN KEY (resolved_person_id) REFERENCES persons (id),
  CONSTRAINT fk_import_records_warrant FOREIGN KEY (resolved_warrant_id) REFERENCES warrants (id),
  CONSTRAINT fk_import_records_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS person_source_records (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  person_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  source_code VARCHAR(40) NOT NULL,
  source_reference VARCHAR(240) NULL,
  import_batch_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_person_source_batch (person_id, source_code, import_batch_id),
  KEY ix_person_sources_source (source_code),
  CONSTRAINT fk_person_sources_person FOREIGN KEY (person_id) REFERENCES persons (id),
  CONSTRAINT fk_person_sources_source FOREIGN KEY (source_code) REFERENCES source_types (source_code),
  CONSTRAINT fk_person_sources_batch FOREIGN KEY (import_batch_id) REFERENCES import_batches (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS duplicate_reviews (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  entity_type VARCHAR(24) NOT NULL,
  subject_entity_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  candidate_entity_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  review_state VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  decision_note TEXT NULL,
  reviewed_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  reviewed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_duplicate_review_pair (entity_type, subject_entity_id, candidate_entity_id),
  KEY ix_duplicate_reviews_queue (review_state, created_at),
  CONSTRAINT fk_duplicate_reviews_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  action_code VARCHAR(80) NOT NULL,
  entity_type VARCHAR(40) NOT NULL,
  entity_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  event_details LONGTEXT NULL,
  occurred_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_audit_entity (entity_type, entity_id, occurred_at),
  KEY ix_audit_actor (actor_user_id, occurred_at),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(120) NOT NULL,
  applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO roles (role_code, display_name) VALUES
  ('ADMIN', 'System administrator'),
  ('DATA_STEWARD', 'Data steward'),
  ('ENCODER', 'Warrant encoder'),
  ('SUPERVISOR', 'Reviewing supervisor'),
  ('WARRANT_SERVER', 'Field warrant server'),
  ('AUDITOR', 'Read-only auditor');

INSERT IGNORE INTO person_statuses (status_code, display_name) VALUES
  ('AT_LARGE', 'At large'),
  ('ARRESTED', 'Arrested'),
  ('POSTED_BAIL', 'Posted bail'),
  ('VOLUNTARILY_SURRENDERED', 'Voluntarily surrendered in court'),
  ('DECEASED', 'Deceased'),
  ('ACQUITTED', 'Acquitted');

INSERT IGNORE INTO warrant_statuses (status_code, display_name) VALUES
  ('UNSERVED', 'Unserved'),
  ('SERVED', 'Served'),
  ('PARTIALLY_SERVED', 'Partially served'),
  ('LIFTED', 'Lifted'),
  ('ARCHIVED_RETURNED', 'Archived/Returned'),
  ('WITHDRAWN_CANCELLED_DISMISSED', 'Withdrawn/cancelled/dismissed');

INSERT IGNORE INTO issuance_statuses (status_code, display_name) VALUES
  ('UNSERVED', 'Unserved'),
  ('SERVED', 'Served'),
  ('PARTIALLY_SERVED', 'Partially served'),
  ('LIFTED', 'Lifted'),
  ('ARCHIVED_RETURNED', 'Archived/Returned'),
  ('WITHDRAWN_CANCELLED_DISMISSED', 'Withdrawn/cancelled/dismissed');

INSERT IGNORE INTO source_types (source_code, display_name, aging_threshold_days, aging_day_basis) VALUES
  ('OLD', 'Old', 3, 'BUSINESS_DAYS'),
  ('MANUAL_UPLOAD', 'Manual Upload', 5, 'BUSINESS_DAYS'),
  ('ENHANCED', 'Enhanced', 7, 'BUSINESS_DAYS');