import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import type { RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { appRoles, requireAuthenticated, requireCsrf, requireRoles } from './auth.js';
import { database } from './database.js';

const createPersonSchema = z.object({
  fullName: z.string().trim().min(2).max(240),
  aliases: z.array(z.string().trim().min(1).max(240)).max(20).default([]),
  lastKnownAddress: z.string().trim().max(4000).nullable().optional(),
  confirmedDistinctFrom: z.array(z.string().uuid()).max(20).optional(),
  resolutionNote: z.string().trim().min(15).max(1000).optional(),
}).strict();

const listQuerySchema = z.object({
  q: z.string().trim().max(160).optional(),
  status: z.string().trim().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
}).strict();

const reviewPersonSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  note: z.string().trim().min(15).max(1000),
}).strict();

export function createPeopleRouter(): Router {
  const router = Router();

  router.get('/', requireAuthenticated, requireRoles(...appRoles.peopleReaders), async (request, response, next) => {
    const parsed = listQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      response.status(400).json({ error: { code: 'INVALID_QUERY', message: 'Search or pagination parameters are invalid' } });
      return;
    }

    const { q, status, page, pageSize } = parsed.data;
    const filters: string[] = [];
    const parameters: Array<string | number> = [];
    if (q) {
      filters.push(`(p.person_code = ? OR p.full_name LIKE ? OR EXISTS (
        SELECT 1 FROM person_aliases pa WHERE pa.person_id = p.id AND pa.alias LIKE ?
      ))`);
      parameters.push(q, `%${q}%`, `%${q}%`);
    }
    if (status) {
      filters.push('p.status_code = ?');
      parameters.push(status);
    }

    if (request.session.user?.role === 'WARRANT_SERVER') {
      filters.push("p.record_review_state = 'APPROVED'");
      filters.push(`EXISTS (
        SELECT 1 FROM warrant_person_links wpl
        INNER JOIN warrant_assignments wa ON wa.warrant_id = wpl.warrant_id
        INNER JOIN user_station_memberships usm ON usm.station_id = wa.station_id
        WHERE wpl.person_id = p.id AND wa.assignment_state = 'APPROVED' AND usm.user_id = ?
      )`);
      parameters.push(request.session.user.id);
    }
    if (request.session.user?.role === 'AUDITOR') {
      filters.push("p.status_review_state = 'APPROVED'");
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const offset = (page - 1) * pageSize;
    try {
      const [rows] = await database.execute(
        `SELECT p.id, p.person_code, p.full_name, p.last_known_address, p.status_code,
                p.status_review_state, p.record_review_state, p.created_at, p.updated_at,
                (SELECT COUNT(*) FROM warrant_person_links wpl WHERE wpl.person_id = p.id) AS warrant_count
         FROM persons p ${whereClause}
         ORDER BY p.full_name, p.id
         LIMIT ? OFFSET ?`,
        [...parameters, pageSize, offset],
      );
      const [counts] = await database.execute<Array<RowDataPacket & { total: number }>>(
        `SELECT COUNT(*) AS total FROM persons p ${whereClause}`,
        parameters,
      );
      response.json({ data: rows, pagination: { page, pageSize, total: Number(counts[0]?.total ?? 0) } });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:personId', requireAuthenticated, requireRoles(...appRoles.peopleReaders), async (request, response, next) => {
    const personId = z.string().uuid().safeParse(request.params.personId);
    if (!personId.success) {
      response.status(400).json({ error: { code: 'INVALID_PERSON_ID', message: 'Person ID must be a UUID' } });
      return;
    }

    const isAssignedReader = request.session.user?.role === 'WARRANT_SERVER';
    const recordScope = isAssignedReader
      ? `AND p.record_review_state = 'APPROVED' AND EXISTS (
          SELECT 1 FROM warrant_person_links wpl
          INNER JOIN warrant_assignments wa ON wa.warrant_id = wpl.warrant_id
          INNER JOIN user_station_memberships usm ON usm.station_id = wa.station_id
          WHERE wpl.person_id = p.id AND wa.assignment_state = 'APPROVED' AND usm.user_id = ?
        )`
      : request.session.user?.role === 'AUDITOR'
        ? "AND p.status_review_state = 'APPROVED'"
        : '';

    try {
      const [people] = await database.execute(
        `SELECT p.id, p.person_code, p.full_name, p.last_known_address, p.status_code,
          p.status_review_state, p.record_review_state, p.created_at, p.updated_at
         FROM persons p WHERE p.id = ? ${recordScope} LIMIT 1`,
         [personId.data, ...(isAssignedReader ? [request.session.user!.id] : [])],
      );
      const person = (people as Array<Record<string, unknown>>)[0];
      if (!person) {
        response.status(404).json({ error: { code: 'PERSON_NOT_FOUND', message: 'Person not found' } });
        return;
      }

      const warrantScope = isAssignedReader
        ? `AND EXISTS (
            SELECT 1 FROM warrant_assignments wa
            INNER JOIN user_station_memberships usm ON usm.station_id = wa.station_id
            WHERE wa.warrant_id = w.id AND wa.assignment_state = 'APPROVED' AND usm.user_id = ?
          )`
        : request.session.user?.role === 'AUDITOR'
          ? "AND w.status_review_state = 'APPROVED'"
          : '';
      const [aliases] = await database.execute(
        'SELECT id, alias, created_at FROM person_aliases WHERE person_id = ? ORDER BY alias',
        [personId.data, ...(isAssignedReader ? [request.session.user!.id] : [])],
      );
      const [warrants] = await database.execute(
        `SELECT w.id, w.warrant_code, w.criminal_case_number, w.issuing_court,
                w.status_code, w.status_review_state
         FROM warrants w
         INNER JOIN warrant_person_links wpl ON wpl.warrant_id = w.id
         WHERE wpl.person_id = ? ${warrantScope}
         ORDER BY w.warrant_code`,
        [personId.data],
      );
      response.json({ data: { ...person, aliases, warrants } });
    } catch (error) {
      next(error);
    }
  });

  router.post('/:personId/review', requireAuthenticated, requireCsrf, requireRoles('ADMIN', 'SUPERVISOR'), async (request, response, next) => {
    const personId = z.string().uuid().safeParse(request.params.personId);
    const decision = reviewPersonSchema.safeParse(request.body);
    if (!personId.success || !decision.success) {
      response.status(400).json({ error: { code: 'INVALID_REVIEW', message: 'Person ID, decision, and review note are required' } });
      return;
    }

    const reviewer = request.session.user!;
    const nextState = decision.data.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const connection = await database.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute(
        `UPDATE persons
         SET record_review_state = ?, record_reviewed_by = ?, record_reviewed_at = CURRENT_TIMESTAMP(3),
             record_review_note = ?, updated_by = ?
         WHERE id = ? AND record_review_state = 'PENDING_REVIEW' AND created_by <> ?`,
        [nextState, reviewer.id, decision.data.note, reviewer.id, personId.data, reviewer.id],
      );
      if ('affectedRows' in result && result.affectedRows !== 1) {
        await connection.rollback();
        response.status(409).json({ error: { code: 'PERSON_REVIEW_CONFLICT', message: 'Person is missing, already reviewed, or cannot be reviewed by its creator' } });
        return;
      }
      await connection.execute(
        `INSERT INTO audit_events (actor_user_id, action_code, entity_type, entity_id, event_details)
         VALUES (?, ?, 'PERSON', ?, ?)`,
        [reviewer.id, `PERSON_${decision.data.decision}_PUBLICATION`, personId.data, JSON.stringify({ note: decision.data.note })],
      );
      await connection.commit();
      response.json({ data: { personId: personId.data, recordReviewState: nextState } });
    } catch (error) {
      await connection.rollback();
      next(error);
    } finally {
      connection.release();
    }
  });

  router.post('/', requireAuthenticated, requireCsrf, requireRoles(...appRoles.peopleWriters), async (request, response, next) => {
    const parsed = createPersonSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: { code: 'INVALID_PERSON', message: 'Person fields are invalid' } });
      return;
    }

    const user = request.session.user!;
    const matchNames = [...new Set([parsed.data.fullName, ...parsed.data.aliases].map((value) => value.toLocaleLowerCase()))];
    const placeholders = matchNames.map(() => '?').join(', ');
    let candidates: Array<RowDataPacket & { id: string; person_code: string; full_name: string }>;
    try {
      const [rows] = await database.execute<Array<RowDataPacket & { id: string; person_code: string; full_name: string }>>(
        `SELECT DISTINCT p.id, p.person_code, p.full_name
         FROM persons p
         LEFT JOIN person_aliases pa ON pa.person_id = p.id
         WHERE LOWER(TRIM(p.full_name)) IN (${placeholders})
            OR LOWER(TRIM(pa.alias)) IN (${placeholders})
         ORDER BY p.full_name, p.id
         LIMIT 21`,
        [...matchNames, ...matchNames],
      );
      candidates = rows;
    } catch (error) {
      next(error);
      return;
    }

    if (candidates.length > 20) {
      response.status(409).json({ error: { code: 'DUPLICATE_REVIEW_REQUIRED', message: 'Too many possible matches; narrow the name or alias values' } });
      return;
    }

    const confirmedIds = [...new Set(parsed.data.confirmedDistinctFrom ?? [])].sort();
    const candidateIds = candidates.map((candidate) => candidate.id).sort();
    if (candidateIds.length > 0 && confirmedIds.length === 0) {
      response.status(409).json({
        error: {
          code: 'DUPLICATE_REVIEW_REQUIRED',
          message: 'Potential person matches require authorized review before a new record can be created',
          candidates: candidates.map(({ id, person_code, full_name }) => ({ id, personCode: person_code, fullName: full_name })),
        },
      });
      return;
    }
    if (candidateIds.length > 0) {
      if (!['ADMIN', 'DATA_STEWARD'].includes(user.role)) {
        response.status(403).json({ error: { code: 'DUPLICATE_REVIEW_FORBIDDEN', message: 'Only an authorized reviewer can confirm distinct identities' } });
        return;
      }
      if (confirmedIds.length !== candidateIds.length || confirmedIds.some((id, index) => id !== candidateIds[index]) || !parsed.data.resolutionNote) {
        response.status(400).json({ error: { code: 'DUPLICATE_DECISION_INCOMPLETE', message: 'Confirm every candidate and provide a review rationale' } });
        return;
      }
    } else if (confirmedIds.length > 0 || parsed.data.resolutionNote) {
      response.status(400).json({ error: { code: 'DUPLICATE_DECISION_INVALID', message: 'No matching candidate exists for the supplied duplicate decision' } });
      return;
    }

    const personId = randomUUID();
    const personCode = `P-${randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase()}`;
    let connection;
    try {
      connection = await database.getConnection();
      await connection.beginTransaction();
      await connection.execute(
        `INSERT INTO persons (id, person_code, full_name, last_known_address, status_code, status_review_state, created_by, updated_by)
         VALUES (?, ?, ?, ?, NULL, 'UNREVIEWED', ?, ?)`,
        [personId, personCode, parsed.data.fullName, parsed.data.lastKnownAddress ?? null, user.id, user.id],
      );
      for (const alias of new Set(parsed.data.aliases)) {
        await connection.execute(
          'INSERT INTO person_aliases (id, person_id, alias, created_by) VALUES (?, ?, ?, ?)',
          [randomUUID(), personId, alias, user.id],
        );
      }
      for (const candidate of candidates) {
        await connection.execute(
          `INSERT INTO duplicate_reviews (
             id, entity_type, subject_entity_id, candidate_entity_id,
             review_state, decision_note, reviewed_by, reviewed_at
           ) VALUES (?, 'PERSON', ?, ?, 'CONFIRMED_DISTINCT', ?, ?, CURRENT_TIMESTAMP(3))`,
          [randomUUID(), personId, candidate.id, parsed.data.resolutionNote ?? null, user.id],
        );
      }
      await connection.execute(
        `INSERT INTO audit_events (actor_user_id, action_code, entity_type, entity_id, event_details)
         VALUES (?, ?, ?, ?, ?)`,
        [
          user.id,
          candidates.length > 0 ? 'PERSON_CREATED_DISTINCT_AFTER_REVIEW' : 'PERSON_CREATED',
          'PERSON',
          personId,
          candidates.length > 0 ? JSON.stringify({ candidateIds, rationale: parsed.data.resolutionNote }) : null,
        ],
      );
      await connection.commit();
      response.status(201).json({
        data: {
          id: personId,
          personCode,
          fullName: parsed.data.fullName,
          aliases: [...new Set(parsed.data.aliases)],
          lastKnownAddress: parsed.data.lastKnownAddress ?? null,
          status: null,
          statusReviewState: 'UNREVIEWED',
          recordReviewState: 'PENDING_REVIEW',
        },
      });
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      next(error);
    } finally {
      connection?.release();
    }
  });

  return router;
}