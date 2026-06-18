-- 0002_map_tokens_and_turn.sql
-- Tokens arrastáveis sobre o mapa + sistema de turnos na sala.
--
-- Tokens:
--   - Vivem no `map_tokens`, com FKs em maps/rooms (cascade ao deletar).
--   - Coordenadas em "image-space" (pixels da imagem) — independentes
--     de pan/zoom no cliente. A renderização do canvas aplica a mesma
--     transform do wrapper da imagem.
--   - `controller_user_id` NULL = NPC (apenas mestre pode mover).
--     Não-nulo = token do jogador; mestre e o próprio dono podem mover.
--
-- Turno:
--   - Adicionado à `rooms`: `current_turn_user_id` + `current_turn_started_at`.
--   - Apenas um turno ativo por sala. Sem `turns` separados — a coluna
--     na `rooms` basta (um único turno ativo é o requisito).

-- =========================================================================
-- 8. map_tokens — marcadores arrastáveis sobre o mapa
-- =========================================================================
CREATE TABLE map_tokens (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id             UUID         NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  room_id            UUID         NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  label              VARCHAR(3)   NOT NULL CHECK (char_length(label) BETWEEN 1 AND 3),
  color              VARCHAR(7)   NOT NULL DEFAULT '#e53935'
                                  CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  x                  DOUBLE PRECISION NOT NULL DEFAULT 0,
  y                  DOUBLE PRECISION NOT NULL DEFAULT 0,
  controller_user_id UUID         REFERENCES users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_map_tokens_map  ON map_tokens(map_id);
CREATE INDEX idx_map_tokens_room ON map_tokens(room_id);

-- =========================================================================
-- 9. rooms — colunas de turno
-- =========================================================================
ALTER TABLE rooms
  ADD COLUMN current_turn_user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN current_turn_started_at  TIMESTAMPTZ;
-- Índice útil para a query "quem está com o turno em uma lista de salas".
CREATE INDEX idx_rooms_current_turn ON rooms(current_turn_user_id)
  WHERE current_turn_user_id IS NOT NULL;
