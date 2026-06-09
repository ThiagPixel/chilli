/**
 * Wrapper de Button — centraliza variantes canônicas do app.
 * Mantém a API do MUI Button; só padroniza tamanhos.
 */
import { Button as MuiButton, type ButtonProps as MuiButtonProps } from '@mui/material';

export type ButtonProps = MuiButtonProps;

export function Button(props: ButtonProps) {
  return <MuiButton {...props} />;
}
