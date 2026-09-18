CREATE TABLE IF NOT EXISTS tasks (
  id          UUID PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  description VARCHAR(2000) NOT NULL DEFAULT '',
  status      VARCHAR(20) NOT NULL CHECK (status IN ('todo', 'in_progress', 'done')),
  due_date    DATE,
  created_at  TIMESTAMPTZ NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL
);

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
