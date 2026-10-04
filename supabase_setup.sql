-- MG Avenues / Supabase setup
-- Run this entire script once in Supabase SQL Editor.
-- Public visitors can READ plot/project data.
-- Only the Supabase Auth account with email mgavenuesgvm@gmail.com can WRITE plot/project data.
-- Create that Auth user in Authentication -> Users before using Admin Save/Remove.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  status text not null default 'ongoing' check (status in ('ongoing','upcoming','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Stores the full project details edited from Manage Projects.
alter table public.projects add column if not exists details jsonb not null default '{}'::jsonb;

create table if not exists public.plots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  plot_number integer not null,
  sqyds numeric,
  dimensions text not null default '',
  facing text not null default '',
  status text not null default 'available' check (status in ('available','reserved','booked','mortgage')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, plot_number)
);

create index if not exists plots_project_id_idx on public.plots(project_id);
create index if not exists plots_status_idx on public.plots(status);

alter table public.projects enable row level security;
alter table public.plots enable row level security;

grant select on public.projects, public.plots to anon, authenticated;
grant insert, update, delete on public.projects, public.plots to authenticated;

drop policy if exists "Public can read projects" on public.projects;
create policy "Public can read projects" on public.projects
for select to anon, authenticated using (true);

drop policy if exists "Admin can write projects" on public.projects;
create policy "Admin can write projects" on public.projects
for all to authenticated
using ((auth.jwt() ->> 'email') = 'mgavenuesgvm@gmail.com')
with check ((auth.jwt() ->> 'email') = 'mgavenuesgvm@gmail.com');

drop policy if exists "Public can read plots" on public.plots;
create policy "Public can read plots" on public.plots
for select to anon, authenticated using (true);

drop policy if exists "Admin can write plots" on public.plots;
create policy "Admin can write plots" on public.plots
for all to authenticated
using ((auth.jwt() ->> 'email') = 'mgavenuesgvm@gmail.com')
with check ((auth.jwt() ->> 'email') = 'mgavenuesgvm@gmail.com');

insert into public.projects (name, status)
values ('Elite Nandanavanam', 'ongoing')
on conflict (name) do update set status = excluded.status, updated_at = now();

insert into public.plots (project_id, plot_number, sqyds, status)
select p.id, v.plot_number, v.sqyds, v.status
from public.projects p
cross join (values
  (1, 678.26, 'available'),
  (2, 548.8, 'available'),
  (3, 520.53, 'available'),
  (4, 238.45, 'reserved'),
  (5, 227.07, 'reserved'),
  (6, 215.68, 'booked'),
  (7, 200.59, 'booked'),
  (8, 223.53, 'reserved'),
  (9, 1042.19, 'available'),
  (10, 769.36, 'available'),
  (11, 505.76, 'available'),
  (12, 505.76, 'available'),
  (13, 757.32, 'available'),
  (14, 258.75, 'available'),
  (15, 165.07, 'available'),
  (16, 165.07, 'available'),
  (17, 165.07, 'available'),
  (18, 250.07, 'reserved'),
  (19, 225.13, 'available'),
  (20, 165.07, 'available'),
  (21, 267.46, 'available'),
  (22, 243.64, 'available'),
  (23, 183.36, 'available'),
  (24, 250.07, 'available'),
  (25, 277.78, 'reserved'),
  (26, 183.36, 'reserved'),
  (27, 183.36, 'booked'),
  (28, 183.36, 'reserved'),
  (29, 161.12, 'available'),
  (30, 173.45, 'available'),
  (31, 230.18, 'available'),
  (32, 183.36, 'available'),
  (33, 183.36, 'available'),
  (34, 183.36, 'available'),
  (35, 183.36, 'available'),
  (36, 277.78, 'reserved'),
  (37, 183.36, 'available'),
  (38, 183.36, 'available'),
  (39, 167.14, 'available'),
  (40, 167.14, 'available'),
  (41, 183.36, 'available'),
  (42, 183.36, 'available'),
  (43, 277.78, 'reserved'),
  (44, 183.36, 'available'),
  (45, 183.36, 'available'),
  (46, 183.36, 'available'),
  (47, 183.36, 'available'),
  (48, 183.36, 'available'),
  (49, 183.36, 'available'),
  (50, 181.66, 'available'),
  (51, 178.26, 'available'),
  (52, 174.85, 'available'),
  (53, 171.45, 'available'),
  (54, 168.12, 'available'),
  (55, 165.29, 'available'),
  (56, 162.54, 'available'),
  (57, 159.78, 'available'),
  (58, 157.03, 'available'),
  (59, 148.65, 'available'),
  (60, 230.31, 'available'),
  (61, 165.07, 'available'),
  (62, 165.07, 'available'),
  (63, 165.07, 'available'),
  (64, 165.07, 'available'),
  (65, 165.07, 'available'),
  (66, 165.07, 'available'),
  (67, 165.07, 'available'),
  (68, 165.07, 'available'),
  (69, 165.07, 'available'),
  (70, 165.07, 'available'),
  (71, 165.07, 'available'),
  (72, 165.07, 'available'),
  (73, 209.09, 'available'),
  (74, 165.07, 'reserved'),
  (75, 165.07, 'available'),
  (76, 165.07, 'available'),
  (77, 165.07, 'available'),
  (78, 150.14, 'available'),
  (79, 137.28, 'available'),
  (80, 162.51, 'available'),
  (81, 166.78, 'available'),
  (82, 183.36, 'available'),
  (83, 183.36, 'available'),
  (84, 183.36, 'available'),
  (85, 183.36, 'reserved'),
  (86, 277.78, 'available'),
  (87, 183.36, 'available'),
  (88, 183.36, 'available'),
  (89, 183.36, 'available'),
  (90, 183.36, 'available'),
  (91, 183.36, 'available'),
  (92, 183.36, 'available'),
  (93, 183.36, 'available'),
  (94, 183.36, 'available'),
  (95, 183.36, 'available'),
  (96, 183.36, 'available'),
  (97, 163.23, 'available'),
  (98, 122.97, 'available'),
  (99, 186.3, 'available'),
  (100, 165.07, 'available'),
  (101, 165.07, 'available'),
  (102, 165.07, 'available'),
  (103, 165.07, 'available'),
  (104, 165.07, 'available'),
  (105, 165.07, 'available'),
  (106, 165.07, 'available'),
  (107, 250.07, 'available'),
  (108, 165.07, 'available'),
  (109, 165.07, 'available'),
  (110, 165.07, 'available'),
  (111, 165.07, 'available'),
  (112, 165.07, 'available'),
  (113, 145.89, 'available'),
  (114, 171.76, 'available'),
  (115, 183.36, 'available'),
  (116, 183.36, 'available'),
  (117, 183.36, 'available'),
  (118, 183.36, 'available'),
  (119, 183.36, 'available'),
  (120, 277.78, 'available'),
  (121, 183.36, 'available'),
  (122, 183.36, 'available'),
  (123, 183.36, 'available'),
  (124, 183.36, 'available'),
  (125, 183.36, 'available'),
  (126, 382.81, 'available'),
  (127, 226.31, 'available'),
  (128, 165.07, 'available'),
  (129, 165.07, 'available'),
  (130, 250.07, 'available'),
  (131, 220.06, 'available'),
  (132, 220.06, 'available'),
  (133, 220.06, 'available'),
  (134, 220.06, 'available'),
  (135, 220.06, 'available'),
  (136, 226.6, 'available'),
  (137, 203.15, 'available'),
  (138, 212.46, 'available'),
  (139, 236.89, 'available'),
  (140, 261.32, 'available'),
  (141, 285.77, 'available'),
  (142, 310.2, 'available'),
  (143, 183.36, 'available'),
  (144, 310.49, 'available'),
  (145, 215.23, 'available'),
  (146, 127.15, 'available'),
  (147, 183.36, 'available'),
  (148, 183.36, 'available'),
  (149, 183.36, 'available')
) as v(plot_number, sqyds, status)
where p.name = 'Elite Nandanavanam'
on conflict (project_id, plot_number) do update
set sqyds = excluded.sqyds,
    status = excluded.status,
    updated_at = now();

do $$
begin
  alter publication supabase_realtime add table public.plots;
exception when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists plots_updated_at on public.plots;
create trigger plots_updated_at
before update on public.plots
for each row execute function public.set_updated_at();


-- Media Gallery realtime (media_gallery table/policies are managed separately).
do $$
begin
  alter publication supabase_realtime add table public.media_gallery;
exception when duplicate_object then null;
end $$;
