import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Pool } from 'pg';
import { randomCode, ROOM_CODE_ALPHABET } from '../../utils/code.js';
import { generateUniqueRoomCode } from '../../services/code.service.js';
import { ConflictError } from '../../utils/errors.js';

// Mock do repo: o teste controla o retorno de findRoomByCode
vi.mock('../../database/repositories/room.repo.js', () => ({
  findRoomByCode: vi.fn(),
  findRoomById: vi.fn(),
  insertRoom: vi.fn(),
  setRoomStatus: vi.fn(),
  listRoomsByMaster: vi.fn(),
}));

import { findRoomByCode } from '../../database/repositories/room.repo.js';

const mockFindByCode = vi.mocked(findRoomByCode);

describe('code.service', () => {
  describe('randomCode (utils)', () => {
    it('gera código do tamanho pedido', () => {
      expect(randomCode(6)).toHaveLength(6);
      expect(randomCode(8)).toHaveLength(8);
    });

    it('usa apenas caracteres do alfabeto padrão', () => {
      const code = randomCode(100);
      for (const ch of code) {
        expect(ROOM_CODE_ALPHABET).toContain(ch);
      }
    });

    it('exclui caracteres ambíguos (I, O, 0, 1)', () => {
      const ambiguous = ['I', 'O', '0', '1'];
      for (let i = 0; i < 50; i++) {
        const code = randomCode(50);
        for (const ch of ambiguous) {
          expect(code).not.toContain(ch);
        }
      }
    });

    it('rejeita tamanho inválido', () => {
      expect(() => randomCode(0)).toThrow();
      expect(() => randomCode(-1)).toThrow();
    });

    it('rejeita alfabeto pequeno', () => {
      expect(() => randomCode(6, 'A')).toThrow();
    });

    it('10k chamadas não geram duplicatas óbvias (sanity)', () => {
      const seen = new Set<string>();
      for (let i = 0; i < 10_000; i++) {
        seen.add(randomCode(8));
      }
      // Probabilidade de colisão em 10k de 32^8 ≈ 1.1T: baixíssima
      expect(seen.size).toBeGreaterThan(9_900);
    });
  });

  describe('generateUniqueRoomCode', () => {
    beforeEach(() => {
      mockFindByCode.mockReset();
    });

    it('retorna código livre se findRoomByCode devolve null', async () => {
      mockFindByCode.mockResolvedValueOnce(null);
      const code = await generateUniqueRoomCode({} as Pool);
      expect(code).toHaveLength(8);
      for (const ch of code) {
        expect(ROOM_CODE_ALPHABET).toContain(ch);
      }
    });

    it('retry: pula códigos já existentes', async () => {
      mockFindByCode
        .mockResolvedValueOnce({ id: 'x' } as never) // colide uma vez
        .mockResolvedValueOnce(null); // segunda tentativa é livre

      const code = await generateUniqueRoomCode({} as Pool);
      expect(mockFindByCode).toHaveBeenCalledTimes(2);
      expect(code).toHaveLength(8);
    });

    it('lança ConflictError após 5 colisões seguidas', async () => {
      mockFindByCode.mockResolvedValue({ id: 'x' } as never);
      await expect(generateUniqueRoomCode({} as Pool)).rejects.toBeInstanceOf(ConflictError);
    });
  });
});
