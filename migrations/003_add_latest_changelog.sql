-- 添加 latest_changelog 列到 published_skills
-- D1 兼容 SQLite 语法

ALTER TABLE published_skills ADD COLUMN latest_changelog TEXT NOT NULL DEFAULT '';
