/**
 * Utilitários de formatação — datas, números, etc.
 * Centralizado para reuso e para i18n futura.
 */

/** "14:32" para hoje, "Ontem" para dia anterior, "12/06" para mais antigos. */
export function formatChatTimestamp(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const sameDay = isSameCalendarDay(date, now);
  if (sameDay) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameCalendarDay(date, yesterday)) return 'Ontem';

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Pluralização simples em PT-BR. */
export function plural(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}
