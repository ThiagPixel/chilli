/**
 * Smoke test — garante que a árvore de providers renderiza
 * sem explodir. Falha aqui aponta para problema de configuração.
 */
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { HomePage } from '@/pages/Home/HomePage';
import { renderWithProviders } from './utils';

describe('App shell', () => {
  it('renderiza a Home com o branding "Chilli"', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText(/chilli/i)).toBeInTheDocument();
  });
});
