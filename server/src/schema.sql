CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY,
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  role            VARCHAR(20) NOT NULL CHECK (role IN ('user', 'manager', 'admin')),
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id         UUID PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  user_agent VARCHAR(255) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);

CREATE TABLE IF NOT EXISTS password_resets (
  id         UUID PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tasks (
  id          UUID PRIMARY KEY,
  owner_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  description VARCHAR(2000) NOT NULL DEFAULT '',
  status      VARCHAR(20) NOT NULL CHECK (status IN ('todo', 'in_progress', 'done')),
  due_date    DATE,
  created_at  TIMESTAMPTZ NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS tasks_owner_id_idx ON tasks (owner_id);

CREATE TABLE IF NOT EXISTS attachments (
  id            UUID PRIMARY KEY,
  task_id       UUID NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  original_name VARCHAR(255) NOT NULL,
  storage_key   VARCHAR(64) NOT NULL UNIQUE,
  mime_type     VARCHAR(255) NOT NULL,
  size          INTEGER NOT NULL,
  uploaded_at   TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS attachments_task_id_idx ON attachments (task_id);
