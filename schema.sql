-- ============================================================
-- ST THOUGHTS — SUPABASE DATABASE SCHEMA
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- USERS & PROFILES
-- ============================================================

create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  handle text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  role text check (role in ('idea_person', 'builder', 'investor', 'collaborator')),
  is_pro boolean default false,
  total_votes_received int default 0,
  total_ideas_posted int default 0,
  created_at timestamptz default now()
);

create table profile_interests (
  id uuid default uuid_generate_v4() primary key,
  profile_id uuid references profiles(id) on delete cascade,
  interest text check (interest in ('startups','creative','tech','commerce','film','design')),
  unique (profile_id, interest)
);

-- ============================================================
-- IDEAS
-- ============================================================

create table ideas (
  id uuid default uuid_generate_v4() primary key,
  author_id uuid references profiles(id) on delete cascade,
  title text not null,
  body text not null,
  category text check (category in ('startup','creative','tech','commerce','film','design')),
  is_collab_open boolean default false,
  collab_roles text[], -- e.g. ['developer', 'designer']
  vote_count int default 0,
  fire_count int default 0,
  comment_count int default 0,
  avg_rating numeric(3,2) default 0,
  rating_count int default 0,
  group_id uuid, -- null = public feed
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table idea_votes (
  id uuid default uuid_generate_v4() primary key,
  idea_id uuid references ideas(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  unique (idea_id, user_id)
);

create table idea_fires (
  id uuid default uuid_generate_v4() primary key,
  idea_id uuid references ideas(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  unique (idea_id, user_id)
);

create table idea_ratings (
  id uuid default uuid_generate_v4() primary key,
  idea_id uuid references ideas(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  score int check (score between 1 and 5),
  unique (idea_id, user_id)
);

create table idea_bookmarks (
  id uuid default uuid_generate_v4() primary key,
  idea_id uuid references ideas(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  unique (idea_id, user_id)
);

-- ============================================================
-- COMMENTS
-- ============================================================

create table comments (
  id uuid default uuid_generate_v4() primary key,
  idea_id uuid references ideas(id) on delete cascade,
  author_id uuid references profiles(id) on delete cascade,
  parent_id uuid references comments(id) on delete cascade, -- for replies
  body text not null,
  created_at timestamptz default now()
);

-- ============================================================
-- MARKETPLACE — BUY / SELL / BARTER
-- ============================================================

create table listings (
  id uuid default uuid_generate_v4() primary key,
  idea_id uuid references ideas(id) on delete cascade unique,
  seller_id uuid references profiles(id) on delete cascade,
  listing_type text check (listing_type in ('sale','barter','both')),
  asking_price_cents int, -- null if barter only
  barter_wants text[], -- e.g. ['dev work', 'design', 'equity']
  status text check (status in ('active','under_offer','sold','closed')) default 'active',
  created_at timestamptz default now()
);

create table offers (
  id uuid default uuid_generate_v4() primary key,
  listing_id uuid references listings(id) on delete cascade,
  buyer_id uuid references profiles(id) on delete cascade,
  offer_type text check (offer_type in ('cash','barter')),
  offer_amount_cents int,         -- for cash offers
  barter_description text,        -- for barter offers
  message text,
  status text check (status in ('pending','accepted','declined','withdrawn')) default 'pending',
  created_at timestamptz default now()
);

create table trades (
  id uuid default uuid_generate_v4() primary key,
  offer_id uuid references offers(id) on delete cascade unique,
  buyer_id uuid references profiles(id),
  seller_id uuid references profiles(id),
  agreed_terms text,
  status text check (status in ('agreed','in_progress','completed','disputed')) default 'agreed',
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- COLLAB REQUESTS
-- ============================================================

create table collab_requests (
  id uuid default uuid_generate_v4() primary key,
  idea_id uuid references ideas(id) on delete cascade,
  requester_id uuid references profiles(id) on delete cascade,
  role_offered text,
  message text,
  status text check (status in ('pending','accepted','declined')) default 'pending',
  created_at timestamptz default now(),
  unique (idea_id, requester_id)
);

-- ============================================================
-- PRIVATE GROUPS
-- ============================================================

create table groups (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  color text default '#a78bfa',
  created_by uuid references profiles(id),
  is_invite_only boolean default true,
  member_count int default 1,
  created_at timestamptz default now()
);

create table group_members (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text check (role in ('owner','admin','member')) default 'member',
  joined_at timestamptz default now(),
  unique (group_id, user_id)
);

create table group_invites (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references groups(id) on delete cascade,
  invited_by uuid references profiles(id),
  invited_user_id uuid references profiles(id),
  status text check (status in ('pending','accepted','declined')) default 'pending',
  created_at timestamptz default now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

create table notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade,
  type text check (type in (
    'vote','fire','comment','reply','collab_request',
    'offer_received','offer_accepted','trade_agreed',
    'group_invite','group_activity'
  )),
  actor_id uuid references profiles(id),
  idea_id uuid references ideas(id) on delete cascade,
  offer_id uuid references offers(id) on delete set null,
  group_id uuid references groups(id) on delete set null,
  message text,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index on ideas(author_id);
create index on ideas(group_id);
create index on ideas(created_at desc);
create index on ideas(vote_count desc);
create index on ideas(category);
create index on comments(idea_id);
create index on notifications(user_id, is_read);
create index on offers(listing_id);
create index on collab_requests(idea_id);

-- ============================================================
-- REALTIME — enable for live feed & notifications
-- ============================================================

alter publication supabase_realtime add table ideas;
alter publication supabase_realtime add table idea_votes;
alter publication supabase_realtime add table idea_fires;
alter publication supabase_realtime add table comments;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table offers;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table ideas enable row level security;
alter table comments enable row level security;
alter table listings enable row level security;
alter table offers enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table notifications enable row level security;
alter table collab_requests enable row level security;

-- Profiles: anyone can read, only owner can write
create policy "profiles_read_all" on profiles for select using (true);
create policy "profiles_write_own" on profiles for all using (auth.uid() = id);

-- Ideas: public ideas readable by all; group ideas only by members
create policy "ideas_read_public" on ideas for select
  using (group_id is null or exists (
    select 1 from group_members
    where group_members.group_id = ideas.group_id
    and group_members.user_id = auth.uid()
  ));
create policy "ideas_write_own" on ideas for all using (auth.uid() = author_id);

-- Comments: same visibility as parent idea
create policy "comments_read" on comments for select
  using (exists (
    select 1 from ideas where ideas.id = comments.idea_id
    and (ideas.group_id is null or exists (
      select 1 from group_members
      where group_members.group_id = ideas.group_id
      and group_members.user_id = auth.uid()
    ))
  ));
create policy "comments_write_own" on comments for all using (auth.uid() = author_id);

-- Groups: members only
create policy "groups_read" on groups for select
  using (exists (
    select 1 from group_members
    where group_members.group_id = groups.id
    and group_members.user_id = auth.uid()
  ));

-- Notifications: private to each user
create policy "notifications_own" on notifications for all using (auth.uid() = user_id);

-- Offers: visible to buyer and seller only
create policy "offers_read" on offers for select
  using (auth.uid() = buyer_id or exists (
    select 1 from listings where listings.id = offers.listing_id
    and listings.seller_id = auth.uid()
  ));
create policy "offers_write_own" on offers for all using (auth.uid() = buyer_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-increment vote_count
create or replace function handle_vote_insert()
returns trigger language plpgsql as $$
begin
  update ideas set vote_count = vote_count + 1 where id = new.idea_id;
  return new;
end;$$;

create or replace function handle_vote_delete()
returns trigger language plpgsql as $$
begin
  update ideas set vote_count = greatest(0, vote_count - 1) where id = old.idea_id;
  return old;
end;$$;

create trigger on_vote_insert after insert on idea_votes
  for each row execute function handle_vote_insert();
create trigger on_vote_delete after delete on idea_votes
  for each row execute function handle_vote_delete();

-- Auto-increment fire_count
create or replace function handle_fire_insert()
returns trigger language plpgsql as $$
begin
  update ideas set fire_count = fire_count + 1 where id = new.idea_id;
  return new;
end;$$;

create or replace function handle_fire_delete()
returns trigger language plpgsql as $$
begin
  update ideas set fire_count = greatest(0, fire_count - 1) where id = old.idea_id;
  return old;
end;$$;

create trigger on_fire_insert after insert on idea_fires
  for each row execute function handle_fire_insert();
create trigger on_fire_delete after delete on idea_fires
  for each row execute function handle_fire_delete();

-- Recalculate avg_rating on new rating
create or replace function handle_rating_upsert()
returns trigger language plpgsql as $$
begin
  update ideas set
    avg_rating = (select avg(score) from idea_ratings where idea_id = new.idea_id),
    rating_count = (select count(*) from idea_ratings where idea_id = new.idea_id)
  where id = new.idea_id;
  return new;
end;$$;

create trigger on_rating_upsert after insert or update on idea_ratings
  for each row execute function handle_rating_upsert();

-- Auto-increment comment_count
create or replace function handle_comment_insert()
returns trigger language plpgsql as $$
begin
  update ideas set comment_count = comment_count + 1 where id = new.idea_id;
  return new;
end;$$;

create trigger on_comment_insert after insert on comments
  for each row execute function handle_comment_insert();

-- Auto-create notification on vote
create or replace function notify_on_vote()
returns trigger language plpgsql as $$
declare idea_author uuid;
begin
  select author_id into idea_author from ideas where id = new.idea_id;
  if idea_author != new.user_id then
    insert into notifications (user_id, type, actor_id, idea_id)
    values (idea_author, 'vote', new.user_id, new.idea_id);
  end if;
  return new;
end;$$;

create trigger on_vote_notify after insert on idea_votes
  for each row execute function notify_on_vote();

-- Auto-create notification on comment
create or replace function notify_on_comment()
returns trigger language plpgsql as $$
declare idea_author uuid;
begin
  select author_id into idea_author from ideas where id = new.idea_id;
  if idea_author != new.author_id then
    insert into notifications (user_id, type, actor_id, idea_id)
    values (idea_author, 'comment', new.author_id, new.idea_id);
  end if;
  return new;
end;$$;

create trigger on_comment_notify after insert on comments
  for each row execute function notify_on_comment();

-- Auto-create notification on collab request
create or replace function notify_on_collab()
returns trigger language plpgsql as $$
declare idea_author uuid;
begin
  select author_id into idea_author from ideas where id = new.idea_id;
  insert into notifications (user_id, type, actor_id, idea_id)
  values (idea_author, 'collab_request', new.requester_id, new.idea_id);
  return new;
end;$$;

create trigger on_collab_notify after insert on collab_requests
  for each row execute function notify_on_collab();

-- updated_at on ideas
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;$$;

create trigger ideas_updated_at before update on ideas
  for each row execute function set_updated_at();

-- ============================================================
-- PUSH NOTIFICATIONS — add token column to profiles
-- ============================================================
alter table profiles add column if not exists push_token text;
