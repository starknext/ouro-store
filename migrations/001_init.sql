-- ouro-store 初始化 schema
-- D1 兼容 SQLite 语法

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  github_id INTEGER UNIQUE NOT NULL,
  login TEXT NOT NULL,
  avatar_url TEXT NOT NULL DEFAULT '',
  name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS published_skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  latest_version TEXT NOT NULL DEFAULT '0.1.0',
  short_description TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  author_id INTEGER NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  functions TEXT NOT NULL DEFAULT '[]',
  dependencies TEXT NOT NULL DEFAULT '{}',
  home_url TEXT NOT NULL DEFAULT '',
  compat_ouro_min TEXT NOT NULL DEFAULT '1.0.0',
  downloads INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS skill_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_id INTEGER NOT NULL,
  version TEXT NOT NULL,
  changelog TEXT NOT NULL DEFAULT '',
  r2_key TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (skill_id) REFERENCES published_skills(id) ON DELETE CASCADE,
  UNIQUE(skill_id, version)
);

CREATE TABLE IF NOT EXISTS skill_ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  score INTEGER NOT NULL CHECK(score >= 1 AND score <= 5),
  comment TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (skill_id) REFERENCES published_skills(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(skill_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_skills_tags ON published_skills(tags);
CREATE INDEX IF NOT EXISTS idx_skills_downloads ON published_skills(downloads DESC);
CREATE INDEX IF NOT EXISTS idx_skills_created ON published_skills(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_versions_skill ON skill_versions(skill_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_skill ON skill_ratings(skill_id);
