/**
 * Mocks reutilizáveis para testes.
 */
import { vi } from 'vitest';
import type { ChilliSocket } from '@/types';

export function createMockSocket(): ChilliSocket {
  return {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
  } as unknown as ChilliSocket;
}
