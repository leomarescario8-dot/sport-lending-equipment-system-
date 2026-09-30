-- Run this in Supabase > SQL Editor
create extension if not exists pgcrypto;

create table if not exists equipment (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  quantity int not null check (quantity >= 0),
  available int not null check (available >= 0),
  condition text not null default 'Good',
  created_at timestamptz not null default now()
);

create table if not exists loans (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references equipment(id) on delete cascade,
  borrower_name text not null,
  student_id text not null,
  borrowed_at timestamptz not null default now(),
  due_date timestamptz not null,
  returned_at timestamptz
);

create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references equipment(id) on delete cascade,
  borrower_name text not null,
  student_id text not null,
  days int not null default 3,
  created_at timestamptz not null default now()
);

create table if not exists action_log (
  id bigserial primary key,
  action text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

-- Sample data
insert into equipment (name, category, quantity, available, condition) values
 ('Basketball', 'Ball', 10, 10, 'Good'),
 ('Volleyball', 'Ball', 8, 8, 'Good'),
 ('Badminton Racket', 'Racket', 6, 6, 'Fair'),
 ('Table Tennis Paddle', 'Racket', 4, 4, 'Good'),
 ('Knee Pads', 'Protective Gear', 5, 5, 'Good'),
 ('Jump Rope', 'Fitness', 12, 12, 'Fair');
