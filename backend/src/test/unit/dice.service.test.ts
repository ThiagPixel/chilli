import { describe, it, expect } from 'vitest';
import { roll, parseExpression } from '../../services/dice.service.js';
import { ValidationError } from '../../utils/errors.js';

describe('dice.service', () => {
  describe('parseExpression', () => {
    it('aceita "d20"', () => {
      const terms = parseExpression('d20');
      expect(terms).toHaveLength(1);
      expect(terms[0]).toMatchObject({ count: 1, sides: 20, modifier: 0 });
    });

    it('aceita "1d20"', () => {
      const terms = parseExpression('1d20');
      expect(terms[0]).toMatchObject({ count: 1, sides: 20, modifier: 0 });
    });

    it('aceita "3d6+2" e extrai modificador', () => {
      const terms = parseExpression('3d6+2');
      expect(terms[0]).toMatchObject({ count: 3, sides: 6, modifier: 2 });
    });

    it('aceita "2d6-1"', () => {
      const terms = parseExpression('2d6-1');
      expect(terms[0]).toMatchObject({ count: 2, sides: 6, modifier: -1 });
    });

    it('suporta múltiplos termos "1d20+2d6+3"', () => {
      // 1d20 (dado puro) + 2d6+3 (dado com modificador)
      const terms = parseExpression('1d20+2d6+3');
      expect(terms).toHaveLength(2);
      expect(terms[0]).toMatchObject({ count: 1, sides: 20, modifier: 0 });
      expect(terms[1]).toMatchObject({ count: 2, sides: 6, modifier: 3 });
    });

    it('rejeita expressão vazia', () => {
      expect(() => parseExpression('')).toThrow(ValidationError);
    });

    it('rejeita tipo de dado não suportado', () => {
      expect(() => parseExpression('1d7')).toThrow(ValidationError);
    });

    it('rejeita quantidade excessiva de dados', () => {
      expect(() => parseExpression('1000d6')).toThrow(ValidationError);
    });

    it('rejeita modificador keep/drop (não está no MVP)', () => {
      expect(() => parseExpression('2d20kh1')).toThrow(ValidationError);
    });

    it('tolera espaços e caixa alta', () => {
      const terms = parseExpression(' 2 D 20 + 5 ');
      expect(terms[0]).toMatchObject({ count: 2, sides: 20, modifier: 5 });
    });
  });

  describe('roll', () => {
    it('resultado de 1d6 está entre 1 e 6', () => {
      for (let i = 0; i < 50; i++) {
        const r = roll('1d6');
        expect(r.total).toBeGreaterThanOrEqual(1);
        expect(r.total).toBeLessThanOrEqual(6);
        expect(r.rolls).toHaveLength(1);
      }
    });

    it('2d6+3 está entre 5 e 15', () => {
      for (let i = 0; i < 50; i++) {
        const r = roll('2d6+3');
        expect(r.total).toBeGreaterThanOrEqual(5);
        expect(r.total).toBeLessThanOrEqual(15);
        expect(r.rolls).toHaveLength(2);
        expect(r.modifier).toBe(3);
      }
    });

    it('múltiplos termos somam rolagens e modificadores', () => {
      for (let i = 0; i < 20; i++) {
        const r = roll('1d20+2d6+3');
        expect(r.rolls).toHaveLength(3);
        expect(r.modifier).toBe(3);
        expect(r.total).toBe(r.rolls.reduce((a, b) => a + b, 0) + 3);
      }
    });

    it('soma modificador ao total', () => {
      const r = roll('1d20+5');
      expect(r.modifier).toBe(5);
      expect(r.total).toBe((r.rolls[0] ?? 0) + 5);
    });

    it('expression original é preservada no resultado', () => {
      const r = roll('1d20+3');
      expect(r.expression).toBe('1d20+3');
    });

    it('lança ValidationError em expressão inválida', () => {
      expect(() => roll('xyz')).toThrow(ValidationError);
    });
  });
});
