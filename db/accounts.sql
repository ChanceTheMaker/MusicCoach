CREATE TABLE IF NOT EXISTS coach_users (
 id uuid PRIMARY KEY, username text NOT NULL UNIQUE, display_name text NOT NULL,
 password_hash text NOT NULL, recovery_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS coach_sessions (
 token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES coach_users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS coach_sessions_user_idx ON coach_sessions(user_id);
CREATE TABLE IF NOT EXISTS coach_items (
 user_id uuid NOT NULL REFERENCES coach_users(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('song','exercise','instrument')), item_key text NOT NULL,
 title text NOT NULL, instrument text NOT NULL DEFAULT '', favorite boolean NOT NULL DEFAULT false,
 completed boolean NOT NULL DEFAULT false, progress jsonb NOT NULL DEFAULT '{}',
 updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,kind,item_key)
);
CREATE TABLE IF NOT EXISTS coach_chats (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES coach_users(id) ON DELETE CASCADE,
 title text NOT NULL, favorite boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS coach_messages (
 id bigserial PRIMARY KEY, chat_id uuid NOT NULL REFERENCES coach_chats(id) ON DELETE CASCADE,
 role text NOT NULL CHECK(role IN ('user','assistant')), content text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS coach_chats_user_idx ON coach_chats(user_id,updated_at DESC);
ALTER TABLE library_items ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES coach_users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS library_owner_idx ON library_items(owner_id);

ALTER TABLE coach_items ADD COLUMN IF NOT EXISTS lesson jsonb;

ALTER TABLE coach_users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'learner' CHECK(role IN ('learner','super_admin'));
CREATE TABLE IF NOT EXISTS coach_state (
 user_id uuid PRIMARY KEY REFERENCES coach_users(id) ON DELETE CASCADE,
 state jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coach_rooms (
 id uuid PRIMARY KEY, name text NOT NULL, invite_code text NOT NULL UNIQUE,
 owner_id uuid NOT NULL REFERENCES coach_users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS coach_room_members (
 room_id uuid NOT NULL REFERENCES coach_rooms(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES coach_users(id) ON DELETE CASCADE,
 seen_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(room_id,user_id)
);
CREATE TABLE IF NOT EXISTS coach_room_messages (
 id bigserial PRIMARY KEY, room_id uuid NOT NULL REFERENCES coach_rooms(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES coach_users(id) ON DELETE CASCADE, content text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS coach_room_messages_room_idx ON coach_room_messages(room_id,id);

CREATE TABLE IF NOT EXISTS musician_profiles (
 user_id uuid PRIMARY KEY REFERENCES coach_users(id) ON DELETE CASCADE,
 visible boolean NOT NULL DEFAULT false, skill text NOT NULL DEFAULT 'beginner',
 age_range text NOT NULL DEFAULT '', instruments text[] NOT NULL DEFAULT '{}',
 genres text[] NOT NULL DEFAULT '{}', interests text[] NOT NULL DEFAULT '{}', bio text NOT NULL DEFAULT '',
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS musician_connections (
 sender_id uuid NOT NULL REFERENCES coach_users(id) ON DELETE CASCADE,
 recipient_id uuid NOT NULL REFERENCES coach_users(id) ON DELETE CASCADE,
 status text NOT NULL CHECK(status IN ('pending','accepted')), created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(sender_id,recipient_id), CHECK(sender_id<>recipient_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS musician_connection_pair_idx ON musician_connections(LEAST(sender_id,recipient_id),GREATEST(sender_id,recipient_id));
CREATE TABLE IF NOT EXISTS musician_room_invites (
 id uuid PRIMARY KEY, sender_id uuid NOT NULL REFERENCES coach_users(id) ON DELETE CASCADE,
 recipient_id uuid NOT NULL REFERENCES coach_users(id) ON DELETE CASCADE,
 room_id uuid NOT NULL REFERENCES coach_rooms(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(sender_id,recipient_id,room_id)
);
CREATE TABLE IF NOT EXISTS coach_bands (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES coach_users(id) ON DELETE CASCADE,
 room_id uuid NOT NULL REFERENCES coach_rooms(id) ON DELETE CASCADE, name text NOT NULL,
 description text NOT NULL DEFAULT '', genres text[] NOT NULL DEFAULT '{}', wanted text[] NOT NULL DEFAULT '{}',
 listed boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS coach_band_members (
 band_id uuid NOT NULL REFERENCES coach_bands(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES coach_users(id) ON DELETE CASCADE,
 status text NOT NULL CHECK(status IN ('pending','member')), note text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(band_id,user_id)
);
