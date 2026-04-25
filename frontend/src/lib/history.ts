import type { HistoryItem } from './types';

export function getHistoryErrorMessage(item: Pick<HistoryItem, 'errorMessage'>) {
  return item.errorMessage ?? null;
}
