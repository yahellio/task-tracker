import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { Task, TASK_STATUSES, TaskStatus } from './domain.js';
import { SortOrder, StatusFilter } from './validation.js';

const DATE_OID = 1082;
pg.types.setTypeParser(DATE_OID, (value) => value);

export const connectDatabase = async (connectionString) => {
  const pool = new pg.Pool({ connectionString });
  const schema = await fs.readFile(path.join(path.dirname(fileURLToPath(import.meta.url)), 'schema.sql'), 'utf8');
  await pool.query(schema);
  return pool;
};

const SELECT_TASKS = `
  SELECT
    t.id, t.title, t.description, t.status, t.due_date, t.created_at, t.updated_at,
    COALESCE(
      (SELECT json_agg(json_build_object(
          'id', a.id,
          'originalName', a.original_name,
          'storageKey', a.storage_key,
          'mimeType', a.mime_type,
          'size', a.size,
          'uploadedAt', a.uploaded_at
        ) ORDER BY a.uploaded_at)
       FROM attachments a WHERE a.task_id = t.id),
      '[]'
    ) AS attachments
  FROM tasks t
`;

const ORDER_BY = Object.freeze({
  [SortOrder.DUE_DATE]: 't.due_date ASC NULLS LAST, t.created_at DESC',
  [SortOrder.CREATED_AT]: 't.created_at DESC',
  [SortOrder.TITLE]: 'lower(t.title) ASC, t.created_at DESC'
});

const overdue = (todayParam) => `t.status <> '${TaskStatus.DONE}' AND t.due_date < ${todayParam}`;

const escapeLike = (value) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

const toTask = (row) =>
  new Task({
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    dueDate: row.due_date,
    attachments: row.attachments,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });

export class PgTaskRepository {
  #pool;

  constructor(pool) {
    this.#pool = pool;
  }

  async find(criteria, today) {
    const where = [];
    const params = [];
    const bind = (value) => `$${params.push(value)}`;

    if (criteria.status === StatusFilter.OVERDUE) {
      where.push(overdue(bind(today)));
    } else if (criteria.status !== StatusFilter.ALL) {
      where.push(`t.status = ${bind(criteria.status)}`);
    }
    if (criteria.search !== '') {
      const pattern = bind(`%${escapeLike(criteria.search)}%`);
      where.push(`(t.title ILIKE ${pattern} OR t.description ILIKE ${pattern})`);
    }

    const filter = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const { rows } = await this.#pool.query(`${SELECT_TASKS} ${filter} ORDER BY ${ORDER_BY[criteria.sort]}`, params);
    return rows.map(toTask);
  }

  async findById(id) {
    const { rows } = await this.#pool.query(`${SELECT_TASKS} WHERE t.id = $1`, [id]);
    return rows.length === 0 ? null : toTask(rows[0]);
  }

  async countByStatus(today) {
    const byStatus = TASK_STATUSES.map((status) => `COUNT(*) FILTER (WHERE t.status = '${status}')::int AS "${status}"`);
    const { rows } = await this.#pool.query(
      `SELECT COUNT(*)::int AS "${StatusFilter.ALL}", ${byStatus.join(', ')},
              COUNT(*) FILTER (WHERE ${overdue('$1')})::int AS "${StatusFilter.OVERDUE}"
       FROM tasks t`,
      [today]
    );
    return rows[0];
  }

  async add(task) {
    const state = task.toState();
    await this.#pool.query(
      `INSERT INTO tasks (id, title, description, status, due_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [state.id, state.title, state.description, state.status, state.dueDate, state.createdAt, state.updatedAt]
    );
  }

  async update(task) {
    const state = task.toState();
    const client = await this.#pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'UPDATE tasks SET title = $2, description = $3, status = $4, due_date = $5, updated_at = $6 WHERE id = $1',
        [state.id, state.title, state.description, state.status, state.dueDate, state.updatedAt]
      );
      await client.query('DELETE FROM attachments WHERE task_id = $1 AND NOT (id = ANY($2::uuid[]))', [
        state.id,
        state.attachments.map((attachment) => attachment.id)
      ]);
      for (const attachment of state.attachments) {
        await client.query(
          `INSERT INTO attachments (id, task_id, original_name, storage_key, mime_type, size, uploaded_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING`,
          [
            attachment.id,
            state.id,
            attachment.originalName,
            attachment.storageKey,
            attachment.mimeType,
            attachment.size,
            attachment.uploadedAt
          ]
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async remove(id) {
    await this.#pool.query('DELETE FROM tasks WHERE id = $1', [id]);
  }
}
