import type { z } from 'zod';

// ── 请求 / 响应类型 ──

export interface User {
  id: number;
  github_id: number;
  login: string;
  avatar_url: string;
  name: string | null;
  created_at: string;
}

export interface PublishedSkill {
  id: number;
  name: string;
  latest_version: string;
  description: string;
  author: { login: string; avatar_url: string };
  tags: string[];
  functions: string[];
  home_url: string;
  compat_ouro_min: string;
  downloads: number;
  rating_avg: number | null;
  rating_count: number;
  created_at: string;
  updated_at: string;
}

export interface SkillVersion {
  id: number;
  version: string;
  changelog: string;
  content_hash: string;
  file_size: number;
  created_at: string;
}

export interface SkillRating {
  score: number;
  comment: string;
  user: { login: string; avatar_url: string };
  created_at: string;
}

// ── DB 行原始类型（D1 返回） ──

export interface DbUser {
  id: number;
  github_id: number;
  login: string;
  avatar_url: string;
  name: string | null;
}

export interface DbPublishedSkill {
  id: number;
  name: string;
  latest_version: string;
  description: string;
  author_id: number;
  tags: string;
  functions: string;
  home_url: string;
  compat_ouro_min: string;
  downloads: number;
  created_at: string;
  updated_at: string;
}

export interface DbSkillVersion {
  id: number;
  skill_id: number;
  version: string;
  changelog: string;
  r2_key: string;
  content_hash: string;
  file_size: number;
  created_at: string;
}

export interface DbSkillRating {
  id: number;
  skill_id: number;
  user_id: number;
  score: number;
  comment: string;
  created_at: string;
}

// ── 请求体 ──

export interface PublishRequest {
  name: string;
  version: string;
  description: string;
  tags: string[];
  functions: string[];
  home_url?: string;
  compat_ouro_min?: string;
  changelog?: string;
  /** base64 编码的 .skill.tar.gz 包 */
  bundle: string;
}

export interface RateRequest {
  score: number;
  comment?: string;
}

// ── Skill 包清单（来自 skill.json） ──

export interface SkillManifest {
  name: string;
  version: string;
  type: string;
  description: string;
  author: string;
  tags: string[];
  functions: string[];
  dependencies: Record<string, string>;
  compat: { 'ouro-min-version'?: string };
}
