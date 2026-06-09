-- 添加 short_description 和 dependencies 列
-- D1 兼容 SQLite 语法

ALTER TABLE published_skills ADD COLUMN short_description TEXT NOT NULL DEFAULT '';
ALTER TABLE published_skills ADD COLUMN dependencies TEXT NOT NULL DEFAULT '{}';
