-- Level Evaluation — schema additions for partial re-tests.
-- Run in Supabase → SQL Editor. Safe to re-run (idempotent).

-- Sections the active link should include (null = all four sections).
alter table employees add column if not exists sections text[];

-- Per-block timer anchors, stamped server-side by the start-section function:
-- { "<block>": "<ISO start>", "<block>_done": "<ISO end>" }
-- Blocks: intermediate, advanced_mcq, advanced_written, listening, speaking.
-- Cleared by create-retest so a re-test gets a fresh clock.
alter table employees add column if not exists section_times jsonb;

-- Attempt history: one row per issued test/re-test.
create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  attempt_no int not null,
  sections text[],          -- null/empty = all sections
  reason text,              -- optional admin note, e.g. "forgot to record speaking"
  token text,               -- the token issued for this attempt
  status text not null default 'pending',
  issued_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists attempts_employee_idx on attempts(employee_id);
