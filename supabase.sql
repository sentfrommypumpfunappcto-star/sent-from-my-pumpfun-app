-- Run once in Supabase > SQL Editor. One table for the X leaderboard.
create table if not exists posts (
  id             text primary key,          -- X post id (unique: the same post is never counted twice)
  author_id      text not null,
  username       text,
  name           text,
  avatar         text,
  author_created timestamptz,               -- account age, to skip brand-new (bot) accounts
  created_at     timestamptz not null,
  text           text,
  text_norm      text,                      -- text without case/links/emoji, to ignore copy-paste spam
  likes          int default 0
);
create index if not exists posts_created_at on posts (created_at);
create index if not exists posts_author on posts (author_id);

-- Only the server (service_role key) reads and writes. Nothing is open to the public.
alter table posts enable row level security;

-- Small key/value store. Holds the best pump.fun callouts of the day and of the week for the Feed
-- (key "best-callouts", written by api/callouts.js when the "↻ Best callouts" bookmark is used).
create table if not exists kv (
  key        text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
alter table kv enable row level security;
