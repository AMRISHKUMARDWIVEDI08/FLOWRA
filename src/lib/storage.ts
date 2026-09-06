import type { Payment } from './types';

const KEY = 'flowra-payments-v1';

export function loadPayments(): Payment[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Payment[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePayments(payments: Payment[]) {
  localStorage.setItem(KEY, JSON.stringify(payments));
}
