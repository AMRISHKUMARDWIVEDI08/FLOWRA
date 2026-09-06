import type { Payment } from './types';

export function summarizePayments(payments: Payment[]) {
  const received = payments.filter((p) => p.status === 'paid' && p.type !== 'payment').reduce((s, p) => s + Number(p.amount || 0), 0);
  const sent = payments.filter((p) => p.status === 'paid' && p.type === 'payment').reduce((s, p) => s + Number(p.amount || 0), 0);
  const pending = payments.filter((p) => ['pending', 'processing'].includes(p.status)).length;
  const exceptions = payments.filter((p) => ['failed', 'exception'].includes(p.status)).length;
  return { received, sent, pending, exceptions, total: payments.length };
}

export function buildPaymentUrl(origin: string, payment: Pick<Payment, 'reference' | 'amount' | 'counterparty' | 'note' | 'wallet'>) {
  const params = new URLSearchParams({ pay: payment.reference, amount: payment.amount, name: payment.counterparty, note: payment.note || '', to: payment.wallet || '' });
  return `${origin}/?${params.toString()}`;
}
