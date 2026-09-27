const USER_COLUMNS = 'id, email, password_hash, role, failed_attempts, locked_until, created_at';

const toUser = (row) => ({
  id: row.id,
  email: row.email,
  passwordHash: row.password_hash,
  role: row.role,
  failedAttempts: row.failed_attempts,
  lockedUntil: row.locked_until,
  createdAt: row.created_at.toISOString()
});

const toSession = (row) => ({
  id: row.id,
  userId: row.user_id,
  userAgent: row.user_agent,
  createdAt: row.created_at.toISOString(),
  expiresAt: row.expires_at.toISOString()
});

export class AuthRepository {
  #pool;

  constructor(pool) {
    this.#pool = pool;
  }

  async countUsers() {
    const { rows } = await this.#pool.query('SELECT COUNT(*)::int AS total FROM users');
    return rows[0].total;
  }

  async findUserByEmail(email) {
    const { rows } = await this.#pool.query(`SELECT ${USER_COLUMNS} FROM users WHERE email = $1`, [email]);
    return rows.length === 0 ? null : toUser(rows[0]);
  }

  async findUserById(id) {
    const { rows } = await this.#pool.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id]);
    return rows.length === 0 ? null : toUser(rows[0]);
  }

  async listUsers() {
    const { rows } = await this.#pool.query(`SELECT ${USER_COLUMNS} FROM users ORDER BY created_at`);
    return rows.map(toUser);
  }

  async addUser({ id, email, passwordHash, role, createdAt }) {
    await this.#pool.query(
      'INSERT INTO users (id, email, password_hash, role, created_at) VALUES ($1, $2, $3, $4, $5)',
      [id, email, passwordHash, role, createdAt]
    );
  }

  async updateRole(id, role) {
    await this.#pool.query('UPDATE users SET role = $2 WHERE id = $1', [id, role]);
  }

  async updatePassword(id, passwordHash) {
    await this.#pool.query(
      'UPDATE users SET password_hash = $2, failed_attempts = 0, locked_until = NULL WHERE id = $1',
      [id, passwordHash]
    );
  }

  async saveLoginFailure(id, failedAttempts, lockedUntil) {
    await this.#pool.query('UPDATE users SET failed_attempts = $2, locked_until = $3 WHERE id = $1', [
      id,
      failedAttempts,
      lockedUntil
    ]);
  }

  async clearLoginFailures(id) {
    await this.#pool.query('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = $1', [id]);
  }

  async addSession({ id, userId, tokenHash, userAgent, createdAt, expiresAt }) {
    await this.#pool.query(
      `INSERT INTO sessions (id, user_id, token_hash, user_agent, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, userId, tokenHash, userAgent, createdAt, expiresAt]
    );
  }

  async findSessionByTokenHash(tokenHash, now) {
    const { rows } = await this.#pool.query(
      `SELECT s.id, s.user_id, s.user_agent, s.created_at, s.expires_at,
              u.email, u.password_hash, u.role, u.failed_attempts, u.locked_until, u.created_at AS user_created_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > $2`,
      [tokenHash, now]
    );
    if (rows.length === 0) {
      return null;
    }
    const row = rows[0];
    return {
      session: toSession(row),
      user: toUser({ ...row, id: row.user_id, created_at: row.user_created_at })
    };
  }

  async listSessions(userId, now) {
    const { rows } = await this.#pool.query(
      'SELECT id, user_id, user_agent, created_at, expires_at FROM sessions WHERE user_id = $1 AND expires_at > $2 ORDER BY created_at DESC',
      [userId, now]
    );
    return rows.map(toSession);
  }

  async findSessionById(id) {
    const { rows } = await this.#pool.query(
      'SELECT id, user_id, user_agent, created_at, expires_at FROM sessions WHERE id = $1',
      [id]
    );
    return rows.length === 0 ? null : toSession(rows[0]);
  }

  async removeSession(id) {
    await this.#pool.query('DELETE FROM sessions WHERE id = $1', [id]);
  }

  async removeOtherSessions(userId, keepSessionId) {
    const { rowCount } = await this.#pool.query('DELETE FROM sessions WHERE user_id = $1 AND id <> $2', [
      userId,
      keepSessionId
    ]);
    return rowCount;
  }

  async removeUserSessions(userId) {
    await this.#pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
  }

  async removeExpiredSessions(now) {
    await this.#pool.query('DELETE FROM sessions WHERE expires_at <= $1', [now]);
  }

  async trimSessions(userId, limit) {
    const { rowCount } = await this.#pool.query(
      `DELETE FROM sessions
       WHERE id IN (
         SELECT id FROM sessions WHERE user_id = $1 ORDER BY created_at DESC OFFSET $2
       )`,
      [userId, limit]
    );
    return rowCount;
  }

  async addPasswordReset({ id, userId, tokenHash, expiresAt }) {
    await this.#pool.query(
      'INSERT INTO password_resets (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)',
      [id, userId, tokenHash, expiresAt]
    );
  }

  async findPasswordReset(tokenHash, now) {
    const { rows } = await this.#pool.query(
      'SELECT id, user_id FROM password_resets WHERE token_hash = $1 AND used_at IS NULL AND expires_at > $2',
      [tokenHash, now]
    );
    return rows.length === 0 ? null : { id: rows[0].id, userId: rows[0].user_id };
  }

  async markPasswordResetUsed(id, now) {
    await this.#pool.query('UPDATE password_resets SET used_at = $2 WHERE id = $1', [id, now]);
  }
}
