import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  Role,
  TooManyRequestsError,
  UnauthorizedError,
  ValidationError,
  can,
  publicUser
} from './domain.js';

const SALT_BYTES = 16;
const KEY_BYTES = 32;
const TOKEN_BYTES = 32;

export const hashPassword = (password) => {
  const salt = randomBytes(SALT_BYTES).toString('hex');
  return `${salt}:${scryptSync(password, salt, KEY_BYTES).toString('hex')}`;
};

export const verifyPassword = (password, storedHash) => {
  const [salt, key] = storedHash.split(':');
  if (salt === undefined || key === undefined) {
    return false;
  }
  const expected = Buffer.from(key, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

export const createToken = () => randomBytes(TOKEN_BYTES).toString('base64url');

export const hashToken = (token) => createHash('sha256').update(token).digest('hex');

const minutesFromNow = (minutes) => new Date(Date.now() + minutes * 60_000);

export class AuthService {
  #repository;
  #mailer;
  #logger;
  #policy;

  constructor({ repository, mailer, logger, policy }) {
    this.#repository = repository;
    this.#mailer = mailer;
    this.#logger = logger;
    this.#policy = policy;
  }

  async ensureAdmin({ email, password }) {
    if ((await this.#repository.countUsers()) > 0) {
      return;
    }
    await this.#createUser({ email, password, role: Role.ADMIN });
    this.#logger.info('auth.admin_created', { email });
  }

  async register({ email, password }, context) {
    const user = await this.#createUser({ email, password, role: Role.USER });
    this.#logger.info('auth.registered', { userId: user.id, email });
    return this.#openSession(user, context);
  }

  async login({ email, password }, context) {
    const user = await this.#repository.findUserByEmail(email);
    if (user === null) {
      this.#logger.warn('auth.login_failed', { email, reason: 'unknown_email' });
      throw new UnauthorizedError('Неверный адрес электронной почты или пароль');
    }

    const lockedFor = this.#lockSecondsLeft(user);
    if (lockedFor > 0) {
      this.#logger.warn('auth.login_blocked', { userId: user.id, retryAfterSeconds: lockedFor });
      throw new TooManyRequestsError('Слишком много неудачных попыток входа, попробуйте позже', lockedFor);
    }

    if (!verifyPassword(password, user.passwordHash)) {
      await this.#registerFailure(user);
      throw new UnauthorizedError('Неверный адрес электронной почты или пароль');
    }

    if (user.failedAttempts > 0 || user.lockedUntil !== null) {
      await this.#repository.clearLoginFailures(user.id);
    }
    this.#logger.info('auth.login_succeeded', { userId: user.id });
    return this.#openSession(user, context);
  }

  async authenticate(token) {
    const found = await this.#repository.findSessionByTokenHash(hashToken(token), new Date());
    if (found === null) {
      throw new UnauthorizedError('Ключ доступа недействителен или истёк');
    }
    return { user: publicUser(found.user), session: found.session };
  }

  async logout(sessionId) {
    await this.#repository.removeSession(sessionId);
    this.#logger.info('auth.logout', { sessionId });
  }

  async listSessions(actor, currentSessionId) {
    const sessions = await this.#repository.listSessions(actor.id, new Date());
    return sessions.map((session) => ({ ...session, current: session.id === currentSessionId }));
  }

  async revokeSession(actor, sessionId) {
    const session = await this.#repository.findSessionById(sessionId);
    if (session === null) {
      throw new NotFoundError('Подключение не найдено');
    }
    if (session.userId !== actor.id && !can(actor.role, 'manageUsers')) {
      throw new ForbiddenError('Недостаточно прав для завершения чужого подключения');
    }
    await this.#repository.removeSession(sessionId);
    this.#logger.info('auth.session_revoked', { actorId: actor.id, sessionId, userId: session.userId });
  }

  async revokeOtherSessions(actor, currentSessionId) {
    const removed = await this.#repository.removeOtherSessions(actor.id, currentSessionId);
    this.#logger.info('auth.sessions_revoked', { actorId: actor.id, removed });
  }

  async requestPasswordReset(email) {
    const user = await this.#repository.findUserByEmail(email);
    if (user === null) {
      this.#logger.info('auth.reset_requested', { email, known: false });
      return;
    }
    const token = createToken();
    await this.#repository.addPasswordReset({
      id: randomUUID(),
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: minutesFromNow(this.#policy.resetTtlMinutes)
    });
    await this.#mailer.sendPasswordReset(user.email, token);
    this.#logger.info('auth.reset_requested', { userId: user.id, known: true });
  }

  async confirmPasswordReset({ token, password }) {
    const now = new Date();
    const reset = await this.#repository.findPasswordReset(hashToken(token), now);
    if (reset === null) {
      throw new ValidationError('Ссылка восстановления недействительна или истекла', {
        token: 'Ссылка восстановления недействительна или истекла'
      });
    }
    await this.#repository.updatePassword(reset.userId, hashPassword(password));
    await this.#repository.markPasswordResetUsed(reset.id, now);
    await this.#repository.removeUserSessions(reset.userId);
    this.#logger.info('auth.reset_completed', { userId: reset.userId });
  }

  async listUsers() {
    const users = await this.#repository.listUsers();
    return users.map(publicUser);
  }

  async changeRole(actor, userId, role) {
    if (actor.id === userId) {
      throw new ForbiddenError('Нельзя изменить собственную роль');
    }
    const user = await this.#repository.findUserById(userId);
    if (user === null) {
      throw new NotFoundError('Пользователь не найден');
    }
    await this.#repository.updateRole(userId, role);
    this.#logger.info('auth.role_changed', { actorId: actor.id, userId, from: user.role, to: role });
    return publicUser({ ...user, role });
  }

  async #createUser({ email, password, role }) {
    if ((await this.#repository.findUserByEmail(email)) !== null) {
      throw new ConflictError('Пользователь с таким адресом уже зарегистрирован');
    }
    const user = {
      id: randomUUID(),
      email,
      passwordHash: hashPassword(password),
      role,
      createdAt: new Date().toISOString()
    };
    await this.#repository.addUser(user);
    return user;
  }

  async #openSession(user, { userAgent }) {
    const now = new Date();
    await this.#repository.removeExpiredSessions(now);

    const token = createToken();
    const session = {
      id: randomUUID(),
      userId: user.id,
      tokenHash: hashToken(token),
      userAgent: userAgent.slice(0, 255),
      createdAt: now,
      expiresAt: minutesFromNow(this.#policy.sessionTtlMinutes)
    };
    await this.#repository.addSession(session);

    const trimmed = await this.#repository.trimSessions(user.id, this.#policy.maxSessions);
    if (trimmed > 0) {
      this.#logger.info('auth.sessions_trimmed', { userId: user.id, removed: trimmed });
    }

    return {
      token,
      expiresAt: session.expiresAt.toISOString(),
      user: publicUser(user)
    };
  }

  #lockSecondsLeft(user) {
    if (user.lockedUntil === null) {
      return 0;
    }
    return Math.max(0, Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000));
  }

  async #registerFailure(user) {
    const attempts = user.failedAttempts + 1;
    const reached = attempts >= this.#policy.maxFailedAttempts;
    const lockedUntil = reached ? minutesFromNow(this.#policy.lockMinutes) : null;

    await this.#repository.saveLoginFailure(user.id, reached ? 0 : attempts, lockedUntil);

    if (reached) {
      this.#logger.warn('auth.account_locked', { userId: user.id, minutes: this.#policy.lockMinutes });
      throw new TooManyRequestsError(
        'Слишком много неудачных попыток входа, попробуйте позже',
        this.#policy.lockMinutes * 60
      );
    }
    this.#logger.warn('auth.login_failed', { userId: user.id, reason: 'bad_password', attempts });
  }
}
