-- 0001_init.sql
-- Schema inicial do Chilli. Espelha a modelagem aprovada (sem dependências externas).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================================
-- 1. users — jogadores
-- =========================================================================
CREATE TABLE users (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(50)  NOT NULL CHECK (char_length(name) BETWEEN 1 AND 50),
  email         VARCHAR(255) UNIQUE,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- =========================================================================
-- 2. rooms — salas (mesas)
-- =========================================================================
CREATE TABLE rooms (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  code          CHAR(8)      NOT NULL UNIQUE,
  name          VARCHAR(100) NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  description   TEXT         CHECK (description IS NULL OR char_length(description) <= 2000),
  master_id     UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status        VARCHAR(20)  NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active', 'paused', 'closed')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  closed_at     TIMESTAMPTZ
);
CREATE INDEX idx_rooms_code         ON rooms(code);
CREATE INDEX idx_rooms_master_id    ON rooms(master_id);
CREATE INDEX idx_rooms_status_time  ON rooms(status, created_at DESC);

-- =========================================================================
-- 3. room_members — participação (permite histórico por left_at)
-- =========================================================================
CREATE TABLE room_members (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       UUID         NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          VARCHAR(20)  NOT NULL DEFAULT 'player'
                             CHECK (role IN ('master', 'player')),
  joined_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  left_at       TIMESTAMPTZ
);
-- Apenas um registro ativo (left_at IS NULL) por (room, user).
CREATE UNIQUE INDEX uq_room_members_active
  ON room_members(room_id, user_id)
  WHERE left_at IS NULL;
CREATE INDEX idx_room_members_user ON room_members(user_id);
CREATE INDEX idx_room_members_room ON room_members(room_id);

-- =========================================================================
-- 4. messages — chat
-- =========================================================================
CREATE TABLE messages (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       UUID         NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id       UUID              REFERENCES users(id) ON DELETE SET NULL, -- NULL = system
  type          VARCHAR(20)  NOT NULL DEFAULT 'text'
                             CHECK (type IN ('text', 'system')),
  content       TEXT         NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_room_time ON messages(room_id, created_at DESC);

-- =========================================================================
-- 5. dice_rolls — rolagens de dados
-- =========================================================================
CREATE TABLE dice_rolls (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       UUID         NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  expression    VARCHAR(100) NOT NULL CHECK (char_length(expression) BETWEEN 1 AND 100),
  rolls         JSONB        NOT NULL, -- ex.: [15, 8]
  modifier      INTEGER      NOT NULL DEFAULT 0,
  total         INTEGER      NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_dice_rolls_room_time ON dice_rolls(room_id, created_at DESC);

-- =========================================================================
-- 6. characters — fichas (data é JSONB livre por jogador/sala)
-- =========================================================================
CREATE TABLE characters (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       UUID         NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  data          JSONB        NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);
CREATE INDEX idx_characters_room ON characters(room_id);

-- =========================================================================
-- 7. maps — mapas da mesa (suporta múltiplos, um ativo por sala)
-- =========================================================================
CREATE TABLE maps (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       UUID         NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  image_url     TEXT         NOT NULL,
  width         INTEGER      CHECK (width IS NULL OR width > 0),
  height        INTEGER      CHECK (height IS NULL OR height > 0),
  is_active     BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
-- Apenas um mapa ativo por sala.
CREATE UNIQUE INDEX uq_maps_active
  ON maps(room_id)
  WHERE is_active = TRUE;
CREATE INDEX idx_maps_room ON maps(room_id);
