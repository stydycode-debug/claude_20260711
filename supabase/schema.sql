create table if not exists saju_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  birth_date date not null,
  birth_time time,
  time_unknown boolean not null default false,
  calendar_type text not null default 'solar',
  gender text not null default 'female',
  analysis text not null,
  numbers int[] not null
);
