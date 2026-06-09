import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
} from '../../utils/errors.js';

describe('utils/errors', () => {
  it('AppError carrega code, message, statusCode e details', () => {
    const e = new AppError('X', 'msg', 418, { foo: 1 });
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(AppError);
    expect(e.code).toBe('X');
    expect(e.message).toBe('msg');
    expect(e.statusCode).toBe(418);
    expect(e.details).toEqual({ foo: 1 });
    expect(e.name).toBe('AppError');
  });

  it('ValidationError → 400 / VALIDATION_ERROR', () => {
    const e = new ValidationError('bad', { field: 'name' });
    expect(e.statusCode).toBe(400);
    expect(e.code).toBe('VALIDATION_ERROR');
    expect(e.details).toEqual({ field: 'name' });
  });

  it('UnauthorizedError → 401 / UNAUTHORIZED', () => {
    const e = new UnauthorizedError();
    expect(e.statusCode).toBe(401);
    expect(e.code).toBe('UNAUTHORIZED');
  });

  it('ForbiddenError → 403 / FORBIDDEN', () => {
    const e = new ForbiddenError();
    expect(e.statusCode).toBe(403);
    expect(e.code).toBe('FORBIDDEN');
  });

  it('NotFoundError → 404 / NOT_FOUND', () => {
    const e = new NotFoundError();
    expect(e.statusCode).toBe(404);
    expect(e.code).toBe('NOT_FOUND');
  });

  it('ConflictError → 409 / CONFLICT', () => {
    const e = new ConflictError('dup');
    expect(e.statusCode).toBe(409);
    expect(e.code).toBe('CONFLICT');
    expect(e.message).toBe('dup');
  });

  it('RateLimitError → 429 / RATE_LIMIT', () => {
    const e = new RateLimitError();
    expect(e.statusCode).toBe(429);
    expect(e.code).toBe('RATE_LIMIT');
  });

  it('subclasses são capturáveis como AppError', () => {
    try {
      throw new NotFoundError('nope');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(NotFoundError);
    }
  });
});
